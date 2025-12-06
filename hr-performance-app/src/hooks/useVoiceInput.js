import { useState, useCallback, useEffect, useRef } from 'react';

// In production (Docker), nginx proxies /transcribe to the whisper container
// In development, we connect directly to localhost:3001
const SPEECH_SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

/**
 * Convert audio blob to WAV format in the browser
 */
async function convertToWav(audioBlob) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Resample to 16kHz mono for Whisper
  const targetSampleRate = 16000;
  const numberOfChannels = 1;
  const length = Math.ceil(audioBuffer.duration * targetSampleRate);

  const offlineContext = new OfflineAudioContext(numberOfChannels, length, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);

  await audioContext.close();
  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * bytesPerSample;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Hook for voice input using local Whisper server
 */
export function useVoiceInput({ language = 'en-US', onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    setIsSupported(supported);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      console.log('MediaRecorder not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      streamRef.current = stream;

      // Find a supported mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      console.log('Using mime type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (audioChunksRef.current.length === 0) {
          console.log('No audio data recorded');
          return;
        }

        setIsProcessing(true);

        try {
          // Create blob from recorded chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Recorded blob size:', audioBlob.size, 'bytes');

          // Convert to WAV in the browser
          console.log('Converting to WAV...');
          const wavBlob = await convertToWav(audioBlob);
          console.log('WAV blob size:', wavBlob.size, 'bytes');

          // Send to server
          const formData = new FormData();
          formData.append('audio', wavBlob, 'recording.wav');
          formData.append('language', languageRef.current);

          console.log('Sending audio to server for transcription...');

          const response = await fetch(`${SPEECH_SERVER_URL}/transcribe`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
          }

          const data = await response.json();

          if (data.text && onResultRef.current) {
            console.log('Transcription result:', data.text);
            onResultRef.current(data.text);
          }
        } catch (error) {
          console.error('Transcription error:', error);
          if (onErrorRef.current) {
            onErrorRef.current(error.message);
          }
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(100);
      setIsListening(true);
      console.log('Started recording...');

    } catch (error) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        if (onErrorRef.current) {
          onErrorRef.current('Microphone access denied. Please allow microphone access.');
        }
      } else if (onErrorRef.current) {
        onErrorRef.current(error.message);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('Stopped recording');
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    isProcessing,
    startListening,
    stopListening,
    toggleListening
  };
}

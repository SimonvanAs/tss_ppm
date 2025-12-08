import { useState, useCallback, useEffect, useRef } from 'react';
import { useWhisperContext } from '../contexts/WhisperContext';

// Server URL configuration
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
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

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
 * Unified Whisper hook with automatic browser/server fallback
 * Uses shared WhisperContext for model loading (single download for all fields)
 */
export function useWhisper({ language = 'en-US', onResult, onError } = {}) {
  // Get shared context
  const whisperContext = useWhisperContext();

  // Recording state (local to each input)
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Refs for callbacks and recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  // Update refs when props change
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // Check basic support on mount
  useEffect(() => {
    const isSecureContext = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    const hasMediaRecorder = !!(navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder);

    setIsSupported(isSecureContext && hasMediaRecorder);
  }, []);

  /**
   * Transcribe using server
   */
  const transcribeWithServer = useCallback(async (wavBlob) => {
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
    return data.text || '';
  }, []);

  /**
   * Transcribe using browser (shared model)
   */
  const transcribeWithBrowser = useCallback(async (wavBlob) => {
    return await whisperContext.transcribe(wavBlob, languageRef.current);
  }, [whisperContext]);

  /**
   * Start recording
   */
  const startListening = useCallback(async () => {
    if (!isSupported || isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      streamRef.current = stream;

      // Find supported mime type
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
          // Create blob and convert to WAV
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const wavBlob = await convertToWav(audioBlob);

          let text = '';

          // Try browser transcription first if that's the active backend
          if (whisperContext.activeBackend === 'browser') {
            try {
              text = await transcribeWithBrowser(wavBlob);
            } catch (browserErr) {
              console.warn('Browser transcription failed, falling back to server:', browserErr);
              text = await transcribeWithServer(wavBlob);
            }
          } else {
            text = await transcribeWithServer(wavBlob);
          }

          if (text && onResultRef.current) {
            console.log('Transcription result:', text);
            onResultRef.current(text);
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
      console.log(`Started recording (backend: ${whisperContext.activeBackend})...`);

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
  }, [isSupported, isListening, whisperContext.activeBackend, transcribeWithBrowser, transcribeWithServer]);

  /**
   * Stop recording
   */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('Stopped recording');
    }
    setIsListening(false);
  }, []);

  /**
   * Toggle recording
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    // Recording state (local)
    isListening,
    isProcessing,
    isSupported,

    // Backend state (from shared context)
    activeBackend: whisperContext.activeBackend,
    isDetectingBackend: whisperContext.isDetectingBackend,

    // Model state (from shared context)
    isModelLoading: whisperContext.isModelLoading,
    modelLoadProgress: whisperContext.modelLoadProgress,
    modelLoadStatus: whisperContext.modelLoadStatus,
    isModelReady: whisperContext.isModelReady,
    modelBackend: whisperContext.modelBackend,

    // Actions
    startListening,
    stopListening,
    toggleListening
  };
}

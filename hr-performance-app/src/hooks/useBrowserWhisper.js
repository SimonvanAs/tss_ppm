import { useState, useCallback, useRef, useEffect } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { isWebGPUAvailable } from '../utils/webgpuDetect';

// Configure transformers.js to use local cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model configuration
const MODEL_ID = 'onnx-community/whisper-base';
const FALLBACK_MODEL_ID = 'onnx-community/whisper-tiny';

/**
 * Hook for browser-based Whisper transcription using Transformers.js
 * Supports WebGPU acceleration with WASM fallback
 */
export function useBrowserWhisper() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [modelLoadStatus, setModelLoadStatus] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [backend, setBackend] = useState(null); // 'webgpu' or 'wasm'

  const transcriber = useRef(null);
  const loadingPromise = useRef(null);

  /**
   * Progress callback for model download
   */
  const progressCallback = useCallback((progress) => {
    if (progress.status === 'initiate') {
      setModelLoadStatus(`Loading ${progress.file || 'model'}...`);
    } else if (progress.status === 'download') {
      setModelLoadStatus(`Downloading ${progress.file || 'model'}...`);
    } else if (progress.status === 'progress') {
      const percent = progress.progress || 0;
      setModelLoadProgress(Math.round(percent));
      setModelLoadStatus(`Downloading: ${Math.round(percent)}%`);
    } else if (progress.status === 'done') {
      setModelLoadStatus('Processing...');
    } else if (progress.status === 'ready') {
      setModelLoadStatus('Ready');
      setModelLoadProgress(100);
    }
  }, []);

  /**
   * Load the Whisper model
   */
  const loadModel = useCallback(async (forceBackend = null) => {
    // If already loading, return the existing promise
    if (loadingPromise.current) {
      return loadingPromise.current;
    }

    // If already loaded with the same or compatible backend, return
    if (transcriber.current && isModelReady) {
      if (!forceBackend || forceBackend === backend) {
        return transcriber.current;
      }
    }

    setIsModelLoading(true);
    setModelLoadProgress(0);
    setError(null);

    loadingPromise.current = (async () => {
      try {
        // Determine backend
        let useBackend = forceBackend;
        if (!useBackend) {
          const hasWebGPU = await isWebGPUAvailable();
          useBackend = hasWebGPU ? 'webgpu' : 'wasm';
        }

        setBackend(useBackend);
        setModelLoadStatus(`Initializing (${useBackend.toUpperCase()})...`);

        // Select model based on backend capability
        // WebGPU can handle base model, WASM might need tiny for speed
        const modelId = useBackend === 'webgpu' ? MODEL_ID : FALLBACK_MODEL_ID;

        console.log(`Loading Whisper model: ${modelId} with ${useBackend} backend`);

        // Create the pipeline
        transcriber.current = await pipeline(
          'automatic-speech-recognition',
          modelId,
          {
            device: useBackend,
            dtype: useBackend === 'webgpu' ? 'fp32' : 'q8', // quantized for WASM
            progress_callback: progressCallback
          }
        );

        setIsModelReady(true);
        setModelLoadStatus('Ready');
        setModelLoadProgress(100);

        console.log('Whisper model loaded successfully');
        return transcriber.current;
      } catch (err) {
        console.error('Failed to load Whisper model:', err);

        // If WebGPU failed, try WASM fallback
        if (forceBackend !== 'wasm') {
          console.log('Falling back to WASM backend...');
          setModelLoadStatus('WebGPU failed, trying WASM...');
          loadingPromise.current = null;
          return loadModel('wasm');
        }

        setError(err.message || 'Failed to load speech recognition model');
        setIsModelReady(false);
        throw err;
      } finally {
        setIsModelLoading(false);
        loadingPromise.current = null;
      }
    })();

    return loadingPromise.current;
  }, [backend, isModelReady, progressCallback]);

  /**
   * Transcribe audio from a Blob
   * @param {Blob} audioBlob - Audio blob to transcribe
   * @param {string} language - Language code (e.g., 'en', 'nl', 'es')
   * @returns {Promise<string>} Transcribed text
   */
  const transcribe = useCallback(async (audioBlob, language = 'en') => {
    setError(null);
    setIsTranscribing(true);

    try {
      // Ensure model is loaded
      if (!transcriber.current) {
        await loadModel();
      }

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Map language codes
      const languageMap = {
        'en': 'english',
        'en-US': 'english',
        'nl': 'dutch',
        'nl-NL': 'dutch',
        'es': 'spanish',
        'es-ES': 'spanish'
      };

      const whisperLanguage = languageMap[language] || 'english';

      console.log(`Transcribing audio (${audioBlob.size} bytes) in ${whisperLanguage}...`);

      // Run transcription
      const result = await transcriber.current(arrayBuffer, {
        language: whisperLanguage,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      });

      console.log('Transcription result:', result);

      return result.text || '';
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.message || 'Transcription failed');
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, [loadModel]);

  /**
   * Preload the model (call this early to avoid delay on first use)
   */
  const preloadModel = useCallback(() => {
    if (!transcriber.current && !loadingPromise.current) {
      loadModel().catch(err => {
        console.warn('Model preload failed:', err);
      });
    }
  }, [loadModel]);

  /**
   * Unload the model to free memory
   */
  const unloadModel = useCallback(() => {
    if (transcriber.current) {
      transcriber.current = null;
      setIsModelReady(false);
      setModelLoadProgress(0);
      setModelLoadStatus('');
      setBackend(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't unload on unmount as the model is cached and shared
      // unloadModel();
    };
  }, []);

  return {
    // Model state
    isModelLoading,
    modelLoadProgress,
    modelLoadStatus,
    isModelReady,
    backend,

    // Transcription state
    isTranscribing,
    error,

    // Actions
    loadModel,
    preloadModel,
    transcribe,
    unloadModel
  };
}

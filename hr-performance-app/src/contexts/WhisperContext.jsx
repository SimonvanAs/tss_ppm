import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { isWebGPUAvailable, getBestWhisperBackend, isMobileDevice } from '../utils/webgpuDetect';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model configuration
// whisper-small (~500MB) offers good quality for WebGPU
// whisper-base (~150MB) as fallback for WASM (faster download, acceptable quality)
const MODEL_ID = 'onnx-community/whisper-small';
const FALLBACK_MODEL_ID = 'onnx-community/whisper-base';

const WhisperContext = createContext(null);

export function WhisperProvider({ children }) {
  // Backend detection state
  const [activeBackend, setActiveBackend] = useState(null); // 'browser' or 'server'
  const [isDetectingBackend, setIsDetectingBackend] = useState(true);

  // Model loading state
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [modelLoadStatus, setModelLoadStatus] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelBackend, setModelBackend] = useState(null); // 'webgpu' or 'wasm'
  const [modelError, setModelError] = useState(null);

  const transcriber = useRef(null);
  const loadingPromise = useRef(null);
  // Track loaded/total bytes per file for weighted progress
  const fileProgress = useRef({});

  /**
   * Progress callback for model download - tracks weighted progress by file size
   */
  const progressCallback = useCallback((progress) => {
    if (progress.status === 'initiate') {
      // Initialize file tracking with size info if available
      if (progress.file) {
        fileProgress.current[progress.file] = { loaded: 0, total: progress.total || 0 };
      }
      setModelLoadStatus(`Loading ${progress.file || 'model'}...`);
    } else if (progress.status === 'download') {
      setModelLoadStatus(`Downloading ${progress.file || 'model'}...`);
    } else if (progress.status === 'progress') {
      // Update this file's progress with byte counts
      if (progress.file) {
        fileProgress.current[progress.file] = {
          loaded: progress.loaded || 0,
          total: progress.total || fileProgress.current[progress.file]?.total || 0
        };
      }
      // Calculate overall progress weighted by file size
      const entries = Object.values(fileProgress.current);
      let totalBytes = 0;
      let loadedBytes = 0;
      for (const entry of entries) {
        totalBytes += entry.total || 0;
        loadedBytes += entry.loaded || 0;
      }
      // Calculate percentage (cap at 95% during download, 100% only when ready)
      const percent = totalBytes > 0
        ? Math.min(95, Math.round((loadedBytes / totalBytes) * 100))
        : 0;
      setModelLoadProgress(percent);
      setModelLoadStatus(`Downloading: ${percent}%`);
    } else if (progress.status === 'done') {
      // Mark file as complete
      if (progress.file && fileProgress.current[progress.file]) {
        const total = fileProgress.current[progress.file].total;
        fileProgress.current[progress.file] = { loaded: total, total };
      }
      setModelLoadStatus('Processing...');
      setModelLoadProgress(96); // Show progress during processing
    } else if (progress.status === 'ready') {
      setModelLoadStatus('Ready');
      setModelLoadProgress(100);
    }
  }, []);

  /**
   * Load the Whisper model (shared across all voice inputs)
   */
  const loadModel = useCallback(async (forceBackend = null) => {
    // If already loading, return the existing promise
    if (loadingPromise.current) {
      return loadingPromise.current;
    }

    // If already loaded, return
    if (transcriber.current && isModelReady) {
      return transcriber.current;
    }

    setIsModelLoading(true);
    setModelLoadProgress(0);
    setModelError(null);
    fileProgress.current = {}; // Reset file tracking

    loadingPromise.current = (async () => {
      try {
        // Determine backend
        let useBackend = forceBackend;
        if (!useBackend) {
          const hasWebGPU = await isWebGPUAvailable();
          useBackend = hasWebGPU ? 'webgpu' : 'wasm';
        }

        setModelBackend(useBackend);
        setModelLoadStatus(`Initializing (${useBackend.toUpperCase()})...`);

        // Select model based on backend capability
        const modelId = useBackend === 'webgpu' ? MODEL_ID : FALLBACK_MODEL_ID;

        console.log(`Loading Whisper model: ${modelId} with ${useBackend} backend`);

        // Create the pipeline
        transcriber.current = await pipeline(
          'automatic-speech-recognition',
          modelId,
          {
            device: useBackend,
            dtype: useBackend === 'webgpu' ? 'fp32' : 'q8',
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

        setModelError(err.message || 'Failed to load speech recognition model');
        setIsModelReady(false);
        throw err;
      } finally {
        setIsModelLoading(false);
        loadingPromise.current = null;
      }
    })();

    return loadingPromise.current;
  }, [isModelReady, progressCallback]);

  /**
   * Transcribe audio
   */
  const transcribe = useCallback(async (audioBlob, language = 'en') => {
    if (!transcriber.current) {
      await loadModel();
    }

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

    // Create a blob URL for the audio - Transformers.js expects URL or blob URL
    const blobUrl = URL.createObjectURL(audioBlob);

    try {
      const result = await transcriber.current(blobUrl, {
        language: whisperLanguage,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      });

      console.log('Transcription result:', result);
      return result.text || '';
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    }
  }, [loadModel]);

  /**
   * Preload the model
   */
  const preloadModel = useCallback(() => {
    if (!transcriber.current && !loadingPromise.current && activeBackend === 'browser') {
      loadModel().catch(err => {
        console.warn('Model preload failed:', err);
      });
    }
  }, [loadModel, activeBackend]);

  // Detect best backend on mount
  useEffect(() => {
    async function detectBackend() {
      setIsDetectingBackend(true);

      try {
        const best = await getBestWhisperBackend();

        if (best === 'server' || isMobileDevice()) {
          setActiveBackend('server');
        } else {
          setActiveBackend('browser');
        }
      } catch (err) {
        console.warn('Backend detection failed, using server:', err);
        setActiveBackend('server');
      }

      setIsDetectingBackend(false);
    }

    detectBackend();
  }, []);

  // Auto-preload when browser backend is selected
  useEffect(() => {
    if (activeBackend === 'browser' && !isModelReady && !isModelLoading) {
      preloadModel();
    }
  }, [activeBackend, isModelReady, isModelLoading, preloadModel]);

  const value = {
    // Backend state
    activeBackend,
    isDetectingBackend,
    setActiveBackend,

    // Model state
    isModelLoading,
    modelLoadProgress,
    modelLoadStatus,
    isModelReady,
    modelBackend,
    modelError,

    // Actions
    loadModel,
    preloadModel,
    transcribe
  };

  return (
    <WhisperContext.Provider value={value}>
      {children}
    </WhisperContext.Provider>
  );
}

export function useWhisperContext() {
  const context = useContext(WhisperContext);
  if (!context) {
    throw new Error('useWhisperContext must be used within a WhisperProvider');
  }
  return context;
}

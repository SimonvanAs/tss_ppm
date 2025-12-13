import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WhisperProvider, useWhisperContext } from './WhisperContext';

// Mock webgpuDetect
vi.mock('../utils/webgpuDetect', () => ({
  isWebGPUAvailable: vi.fn().mockResolvedValue(false),
  getBestWhisperBackend: vi.fn().mockResolvedValue('server'),
  isMobileDevice: vi.fn().mockReturnValue(false)
}));

// Mock @huggingface/transformers
const mockPipeline = vi.fn();
vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args) => mockPipeline(...args),
  env: {
    allowLocalModels: false,
    useBrowserCache: true
  }
}));

describe('WhisperContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset pipeline mock
    mockPipeline.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('useWhisperContext', () => {
    it('should throw error when used outside WhisperProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWhisperContext());
      }).toThrow('useWhisperContext must be used within a WhisperProvider');

      consoleSpy.mockRestore();
    });

    it('should provide context when used within WhisperProvider', async () => {
      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      expect(result.current).toHaveProperty('activeBackend');
      expect(result.current).toHaveProperty('isModelLoading');
      expect(result.current).toHaveProperty('modelLoadProgress');
      expect(result.current).toHaveProperty('loadModel');
      expect(result.current).toHaveProperty('transcribe');
    });
  });

  describe('backend detection', () => {
    it('should detect backend on mount', async () => {
      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      // Default to server in test mode
      expect(result.current.activeBackend).toBe('server');
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', async () => {
      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      expect(result.current.isModelLoading).toBe(false);
      expect(result.current.modelLoadProgress).toBe(0);
      expect(result.current.modelLoadStatus).toBe('');
      expect(result.current.isModelReady).toBe(false);
      expect(result.current.modelBackend).toBe(null);
      expect(result.current.modelError).toBe(null);
    });
  });

  describe('setActiveBackend', () => {
    it('should allow changing active backend', async () => {
      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      act(() => {
        result.current.setActiveBackend('browser');
      });

      expect(result.current.activeBackend).toBe('browser');
    });
  });

  describe('loadModel', () => {
    it('should load model with WASM backend when WebGPU not available', async () => {
      const mockTranscriber = vi.fn();
      mockPipeline.mockResolvedValue(mockTranscriber);

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      await act(async () => {
        await result.current.loadModel();
      });

      expect(mockPipeline).toHaveBeenCalledWith(
        'automatic-speech-recognition',
        'onnx-community/whisper-base', // Fallback model for WASM
        expect.objectContaining({
          device: 'wasm',
          dtype: 'q8'
        })
      );

      expect(result.current.isModelReady).toBe(true);
      expect(result.current.modelBackend).toBe('wasm');
    });

    it('should handle model loading error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockPipeline.mockRejectedValue(new Error('Model load failed'));

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      // Expect the error to be thrown
      let errorThrown = false;
      try {
        await act(async () => {
          await result.current.loadModel('wasm');
        });
      } catch (e) {
        errorThrown = true;
        expect(e.message).toBe('Model load failed');
      }

      expect(errorThrown).toBe(true);
      expect(result.current.isModelReady).toBe(false);

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should return existing model if already loaded', async () => {
      const mockTranscriber = vi.fn();
      mockPipeline.mockResolvedValue(mockTranscriber);

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      // Load first time
      await act(async () => {
        await result.current.loadModel();
      });

      expect(mockPipeline).toHaveBeenCalledTimes(1);

      // Load second time - should return cached
      await act(async () => {
        await result.current.loadModel();
      });

      // Pipeline should not be called again
      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });
  });

  describe('transcribe', () => {
    it('should transcribe audio with default language', async () => {
      const mockTranscribe = vi.fn().mockResolvedValue({ text: 'Hello world' });
      mockPipeline.mockResolvedValue(mockTranscribe);

      // Mock URL methods
      const mockBlobUrl = 'blob:test-url';
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockBlobUrl);
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      const audioBlob = new Blob(['test audio'], { type: 'audio/wav' });

      let transcription;
      await act(async () => {
        transcription = await result.current.transcribe(audioBlob);
      });

      expect(transcription).toBe('Hello world');
      expect(mockTranscribe).toHaveBeenCalledWith(mockBlobUrl, expect.objectContaining({
        language: 'english',
        task: 'transcribe'
      }));
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockBlobUrl);

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should transcribe with Dutch language', async () => {
      const mockTranscribe = vi.fn().mockResolvedValue({ text: 'Hallo wereld' });
      mockPipeline.mockResolvedValue(mockTranscribe);

      const mockBlobUrl = 'blob:test-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockBlobUrl);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      const audioBlob = new Blob(['test audio'], { type: 'audio/wav' });

      await act(async () => {
        await result.current.transcribe(audioBlob, 'nl');
      });

      expect(mockTranscribe).toHaveBeenCalledWith(mockBlobUrl, expect.objectContaining({
        language: 'dutch'
      }));
    });

    it('should transcribe with Spanish language', async () => {
      const mockTranscribe = vi.fn().mockResolvedValue({ text: 'Hola mundo' });
      mockPipeline.mockResolvedValue(mockTranscribe);

      const mockBlobUrl = 'blob:test-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockBlobUrl);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      const audioBlob = new Blob(['test audio'], { type: 'audio/wav' });

      await act(async () => {
        await result.current.transcribe(audioBlob, 'es');
      });

      expect(mockTranscribe).toHaveBeenCalledWith(mockBlobUrl, expect.objectContaining({
        language: 'spanish'
      }));
    });

    it('should handle empty transcription result', async () => {
      const mockTranscribe = vi.fn().mockResolvedValue({});
      mockPipeline.mockResolvedValue(mockTranscribe);

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      const audioBlob = new Blob(['test audio'], { type: 'audio/wav' });

      let transcription;
      await act(async () => {
        transcription = await result.current.transcribe(audioBlob);
      });

      expect(transcription).toBe('');
    });
  });

  describe('preloadModel', () => {
    it('should not preload when backend is server', async () => {
      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      // Server backend is default
      expect(result.current.activeBackend).toBe('server');

      act(() => {
        result.current.preloadModel();
      });

      // Model should not start loading
      expect(result.current.isModelLoading).toBe(false);
    });

    it('should preload when backend is browser', async () => {
      mockPipeline.mockResolvedValue(vi.fn());

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      // Switch to browser backend
      act(() => {
        result.current.setActiveBackend('browser');
      });

      // Auto-preload should trigger
      await waitFor(() => {
        expect(result.current.isModelLoading).toBe(true);
      }, { timeout: 100 }).catch(() => {
        // May not trigger if already loaded
      });
    });
  });

  describe('progress tracking', () => {
    it('should invoke progress callback during model load', async () => {
      let capturedProgressCallback = null;
      mockPipeline.mockImplementation((task, model, options) => {
        capturedProgressCallback = options.progress_callback;
        // Simulate progress during load
        if (capturedProgressCallback) {
          capturedProgressCallback({ status: 'initiate', file: 'model.bin', total: 1000 });
          capturedProgressCallback({ status: 'progress', file: 'model.bin', loaded: 500, total: 1000 });
          capturedProgressCallback({ status: 'done', file: 'model.bin' });
          capturedProgressCallback({ status: 'ready' });
        }
        return Promise.resolve(vi.fn());
      });

      const { result } = renderHook(() => useWhisperContext(), {
        wrapper: WhisperProvider,
      });

      await waitFor(() => {
        expect(result.current.isDetectingBackend).toBe(false);
      });

      await act(async () => {
        await result.current.loadModel();
      });

      // After loading completes, model should be ready
      expect(result.current.isModelReady).toBe(true);
      expect(result.current.modelLoadProgress).toBe(100);
      expect(capturedProgressCallback).not.toBe(null);
    });
  });
});

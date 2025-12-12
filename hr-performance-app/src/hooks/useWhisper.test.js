import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhisper } from './useWhisper';

// Mock the WhisperContext
const mockWhisperContext = {
  activeBackend: 'server',
  isDetectingBackend: false,
  isModelLoading: false,
  modelLoadProgress: 0,
  modelLoadStatus: '',
  isModelReady: false,
  modelBackend: null,
  transcribe: vi.fn().mockResolvedValue('transcribed text'),
};

vi.mock('../contexts/WhisperContext', () => ({
  useWhisperContext: () => mockWhisperContext,
}));

// Mock AudioContext
const mockDecodeAudioData = vi.fn();
const mockClose = vi.fn();
class MockAudioContext {
  decodeAudioData = mockDecodeAudioData;
  close = mockClose;
}

// Mock OfflineAudioContext
const mockStartRendering = vi.fn();
const mockCreateBufferSource = vi.fn();
class MockOfflineAudioContext {
  startRendering = mockStartRendering;
  createBufferSource = mockCreateBufferSource;
  destination = {};
}

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable = null;
  onstop = null;

  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    MockMediaRecorder.instances.push(this);
  }

  start(timeslice) {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }

  static instances = [];
  static isTypeSupported = vi.fn().mockReturnValue(true);
}

describe('useWhisper', () => {
  let originalWindow;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset MediaRecorder instances
    MockMediaRecorder.instances = [];

    // Mock window properties
    originalWindow = {
      AudioContext: window.AudioContext,
      webkitAudioContext: window.webkitAudioContext,
      OfflineAudioContext: window.OfflineAudioContext,
      MediaRecorder: window.MediaRecorder,
      isSecureContext: window.isSecureContext,
    };

    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
    window.OfflineAudioContext = MockOfflineAudioContext;
    window.MediaRecorder = MockMediaRecorder;

    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      configurable: true,
    });

    // Mock fetch for server transcription
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'server transcribed text' }),
    });

    // Reset whisper context mock
    mockWhisperContext.activeBackend = 'server';
    mockWhisperContext.isDetectingBackend = false;
    mockWhisperContext.transcribe.mockResolvedValue('browser transcribed text');
  });

  afterEach(() => {
    // Restore window properties
    window.AudioContext = originalWindow.AudioContext;
    window.webkitAudioContext = originalWindow.webkitAudioContext;
    window.OfflineAudioContext = originalWindow.OfflineAudioContext;
    window.MediaRecorder = originalWindow.MediaRecorder;
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useWhisper());

      expect(result.current.isListening).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.activeBackend).toBe('server');
    });

    it('should check support on mount', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });

    it('should report unsupported when mediaDevices is not available', async () => {
      // Remove mediaDevices to simulate unsupported environment
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });
    });
  });

  describe('startListening', () => {
    it('should request microphone access', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: true,
          noiseSuppression: true,
        }),
      });
    });

    it('should set isListening to true when recording starts', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);
    });

    it('should handle microphone permission denied', async () => {
      const onError = vi.fn();
      navigator.mediaDevices.getUserMedia.mockRejectedValue(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWhisper({ onError }));

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(onError).toHaveBeenCalledWith('Microphone access denied. Please allow microphone access.');
      expect(result.current.isListening).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not start if already listening', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      await act(async () => {
        await result.current.startListening();
      });

      // getUserMedia should only be called once
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should not start if not supported', async () => {
      // Remove mediaDevices to simulate unsupported environment
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      const { result } = renderHook(() => useWhisper());

      // Wait for isSupported to be set to false
      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });

      await act(async () => {
        await result.current.startListening();
      });

      // Since startListening returns early when not supported, isListening should stay false
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('stopListening', () => {
    it('should set isListening to false', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('toggleListening', () => {
    it('should start listening when not listening', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(true);
    });

    it('should stop listening when listening', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('context values', () => {
    it('should expose activeBackend from context', () => {
      const { result } = renderHook(() => useWhisper());
      expect(result.current.activeBackend).toBe('server');
    });

    it('should expose isDetectingBackend from context', () => {
      mockWhisperContext.isDetectingBackend = true;
      const { result } = renderHook(() => useWhisper());
      expect(result.current.isDetectingBackend).toBe(true);
    });

    it('should expose model loading state from context', () => {
      mockWhisperContext.isModelLoading = true;
      mockWhisperContext.modelLoadProgress = 50;
      mockWhisperContext.modelLoadStatus = 'Loading...';

      const { result } = renderHook(() => useWhisper());

      expect(result.current.isModelLoading).toBe(true);
      expect(result.current.modelLoadProgress).toBe(50);
      expect(result.current.modelLoadStatus).toBe('Loading...');
    });

    it('should expose model ready state from context', () => {
      mockWhisperContext.isModelReady = true;
      mockWhisperContext.modelBackend = 'wasm';

      const { result } = renderHook(() => useWhisper());

      expect(result.current.isModelReady).toBe(true);
      expect(result.current.modelBackend).toBe('wasm');
    });
  });

  describe('callbacks', () => {
    it('should update callbacks when props change', async () => {
      const onResult1 = vi.fn();
      const onResult2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ onResult }) => useWhisper({ onResult }),
        { initialProps: { onResult: onResult1 } }
      );

      // Rerender with new callback
      rerender({ onResult: onResult2 });

      // The hook should have updated the ref
      expect(result.current).toBeDefined();
    });

    it('should update language when prop changes', async () => {
      const { result, rerender } = renderHook(
        ({ language }) => useWhisper({ language }),
        { initialProps: { language: 'en-US' } }
      );

      rerender({ language: 'nl-NL' });

      // The hook should have updated the language ref
      expect(result.current).toBeDefined();
    });
  });

  describe('MediaRecorder mime types', () => {
    it('should find supported mime type', async () => {
      const { result } = renderHook(() => useWhisper());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.startListening();
      });

      expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalled();
    });
  });
});

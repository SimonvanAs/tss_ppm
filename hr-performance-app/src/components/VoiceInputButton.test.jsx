import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VoiceInputButton } from './VoiceInputButton';

// Mock useWhisper hook
const mockUseWhisper = {
  isListening: false,
  isSupported: true,
  isProcessing: false,
  startListening: vi.fn(),
  stopListening: vi.fn(),
  activeBackend: 'server',
  isModelLoading: false,
  isModelReady: false,
  modelBackend: null,
};

vi.mock('../hooks/useWhisper', () => ({
  useWhisper: (config) => {
    // Store the callbacks for later use in tests
    mockUseWhisper._config = config;
    return mockUseWhisper;
  },
}));

// Mock LanguageContext
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => {
      const translations = {
        'voice.notSupported': 'Voice input not supported',
        'voice.holdToSpeak': 'Hold to speak',
        'voice.listening': 'Listening...',
        'voice.processing': 'Processing...',
        'voice.loadingModel': 'Loading speech model...',
        'voice.error': 'Voice error',
      };
      return translations[key] || key;
    },
    getVoiceLanguageCode: () => 'en-US',
  }),
}));

describe('VoiceInputButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockUseWhisper.isListening = false;
    mockUseWhisper.isSupported = true;
    mockUseWhisper.isProcessing = false;
    mockUseWhisper.activeBackend = 'server';
    mockUseWhisper.isModelLoading = false;
    mockUseWhisper.isModelReady = false;
    mockUseWhisper.modelBackend = null;
    mockUseWhisper.startListening.mockClear();
    mockUseWhisper.stopListening.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render voice button when supported', () => {
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render not supported indicator when not supported', () => {
      mockUseWhisper.isSupported = false;
      render(<VoiceInputButton />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('🎤')).toBeInTheDocument();
    });

    it('should show listening label when listening', () => {
      mockUseWhisper.isListening = true;
      render(<VoiceInputButton />);

      // Text appears in both visible label and sr-only live region
      const listeningTexts = screen.getAllByText('Listening...');
      expect(listeningTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should show processing label when processing', () => {
      mockUseWhisper.isProcessing = true;
      render(<VoiceInputButton />);

      // Text appears in both visible label and sr-only live region
      const processingTexts = screen.getAllByText('Processing...');
      expect(processingTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should show processing spinner when processing', () => {
      mockUseWhisper.isProcessing = true;
      render(<VoiceInputButton />);

      expect(document.querySelector('.processing-spinner')).toBeInTheDocument();
    });

    it('should show sound wave when listening', () => {
      mockUseWhisper.isListening = true;
      render(<VoiceInputButton />);

      expect(document.querySelector('.sound-wave')).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<VoiceInputButton disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when processing', () => {
      mockUseWhisper.isProcessing = true;
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when model is loading for browser backend', () => {
      mockUseWhisper.activeBackend = 'browser';
      mockUseWhisper.isModelLoading = true;
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not be disabled when model is loading for server backend', () => {
      mockUseWhisper.activeBackend = 'server';
      mockUseWhisper.isModelLoading = true;
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should have listening class when listening', () => {
      mockUseWhisper.isListening = true;
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toHaveClass('listening');
    });

    it('should have processing class when processing', () => {
      mockUseWhisper.isProcessing = true;
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toHaveClass('processing');
    });
  });

  describe('mouse events', () => {
    it('should start listening on mouse down', () => {
      render(<VoiceInputButton />);
      const button = screen.getByRole('button');

      fireEvent.mouseDown(button);

      expect(mockUseWhisper.startListening).toHaveBeenCalled();
    });

    it('should stop listening on mouse up', () => {
      render(<VoiceInputButton />);
      const button = screen.getByRole('button');

      fireEvent.mouseUp(button);

      expect(mockUseWhisper.stopListening).toHaveBeenCalled();
    });

    it('should stop listening on mouse leave when listening', () => {
      mockUseWhisper.isListening = true;
      render(<VoiceInputButton />);
      const button = screen.getByRole('button');

      fireEvent.mouseLeave(button);

      expect(mockUseWhisper.stopListening).toHaveBeenCalled();
    });

    it('should not stop listening on mouse leave when not listening', () => {
      mockUseWhisper.isListening = false;
      render(<VoiceInputButton />);
      const button = screen.getByRole('button');

      fireEvent.mouseLeave(button);

      expect(mockUseWhisper.stopListening).not.toHaveBeenCalled();
    });
  });

  describe('touch events', () => {
    it('should start listening on touch start', () => {
      render(<VoiceInputButton />);
      const button = screen.getByRole('button');

      fireEvent.touchStart(button);

      expect(mockUseWhisper.startListening).toHaveBeenCalled();
    });

    it('should stop listening on touch end', () => {
      render(<VoiceInputButton />);
      const button = screen.getByRole('button');

      fireEvent.touchEnd(button);

      expect(mockUseWhisper.stopListening).toHaveBeenCalled();
    });
  });

  describe('callbacks', () => {
    it('should call onTranscript when result received', () => {
      const onTranscript = vi.fn();
      render(<VoiceInputButton onTranscript={onTranscript} />);

      // Trigger the result callback
      mockUseWhisper._config.onResult('hello world');

      expect(onTranscript).toHaveBeenCalledWith('hello world');
    });

    it('should not throw when onTranscript is not provided', () => {
      render(<VoiceInputButton />);

      // Should not throw
      expect(() => {
        mockUseWhisper._config.onResult('hello world');
      }).not.toThrow();
    });

    it('should show error on error callback', () => {
      render(<VoiceInputButton />);

      // Trigger the error callback within act
      act(() => {
        mockUseWhisper._config.onError('Microphone error');
      });

      expect(document.querySelector('.voice-error-tooltip')).toBeInTheDocument();
    });

    it('should have error class when error is shown', () => {
      render(<VoiceInputButton />);

      // Trigger the error callback within act
      act(() => {
        mockUseWhisper._config.onError('Microphone error');
      });

      expect(screen.getByRole('button')).toHaveClass('has-error');
    });
  });

  describe('backend indicator', () => {
    it('should show backend indicator when browser backend is ready', () => {
      mockUseWhisper.activeBackend = 'browser';
      mockUseWhisper.isModelReady = true;
      mockUseWhisper.modelBackend = 'wasm';
      render(<VoiceInputButton />);

      expect(document.querySelector('.backend-indicator')).toBeInTheDocument();
    });

    it('should not show backend indicator for server backend', () => {
      mockUseWhisper.activeBackend = 'server';
      mockUseWhisper.isModelReady = true;
      render(<VoiceInputButton />);

      expect(document.querySelector('.backend-indicator')).not.toBeInTheDocument();
    });

    it('should not show backend indicator when listening', () => {
      mockUseWhisper.activeBackend = 'browser';
      mockUseWhisper.isModelReady = true;
      mockUseWhisper.isListening = true;
      render(<VoiceInputButton />);

      expect(document.querySelector('.backend-indicator')).not.toBeInTheDocument();
    });

    it('should not show backend indicator when processing', () => {
      mockUseWhisper.activeBackend = 'browser';
      mockUseWhisper.isModelReady = true;
      mockUseWhisper.isProcessing = true;
      render(<VoiceInputButton />);

      expect(document.querySelector('.backend-indicator')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label', () => {
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hold to speak');
    });

    it('should have title for tooltip', () => {
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Hold to speak');
    });

    it('should have loading model title when model is loading', () => {
      mockUseWhisper.activeBackend = 'browser';
      mockUseWhisper.isModelLoading = true;
      render(<VoiceInputButton />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Loading speech model...');
    });
  });
});

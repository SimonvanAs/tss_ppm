import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Mock MediaRecorder
class MockMediaRecorder {
  constructor() {
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
  static isTypeSupported() { return true; }
}
window.MediaRecorder = MockMediaRecorder;

// Mock AudioContext
class MockAudioContext {
  constructor() {
    this.state = 'running';
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };
  }
  decodeAudioData() {
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 1,
      sampleRate: 16000,
      getChannelData: () => new Float32Array(16000),
    });
  }
  close() { return Promise.resolve(); }
}
window.AudioContext = MockAudioContext;

// Mock OfflineAudioContext
class MockOfflineAudioContext {
  constructor() {}
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };
  }
  startRendering() {
    return Promise.resolve({
      numberOfChannels: 1,
      sampleRate: 16000,
      getChannelData: () => new Float32Array(16000),
    });
  }
  get destination() { return {}; }
}
window.OfflineAudioContext = MockOfflineAudioContext;

// Mock fetch
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});

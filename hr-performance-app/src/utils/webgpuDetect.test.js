import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isWebGPUAvailable,
  isMobileDevice,
  getDeviceCapability,
  getBestWhisperBackend,
  getCapabilityInfo
} from './webgpuDetect';

describe('webgpuDetect', () => {
  let originalNavigator;
  let originalWindow;

  beforeEach(() => {
    // Save original values
    originalNavigator = { ...navigator };
    originalWindow = { innerWidth: window.innerWidth };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isWebGPUAvailable', () => {
    it('should return false when navigator.gpu is not available', async () => {
      // navigator.gpu is already undefined in test environment
      const result = await isWebGPUAvailable();
      expect(result).toBe(false);
    });

    it('should return true when WebGPU adapter is available', async () => {
      // Mock navigator.gpu
      Object.defineProperty(navigator, 'gpu', {
        value: {
          requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' })
        },
        configurable: true
      });

      const result = await isWebGPUAvailable();
      expect(result).toBe(true);
    });

    it('should return false when requestAdapter returns null', async () => {
      Object.defineProperty(navigator, 'gpu', {
        value: {
          requestAdapter: vi.fn().mockResolvedValue(null)
        },
        configurable: true
      });

      const result = await isWebGPUAvailable();
      expect(result).toBe(false);
    });

    it('should return false when requestAdapter throws', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(navigator, 'gpu', {
        value: {
          requestAdapter: vi.fn().mockRejectedValue(new Error('Not supported'))
        },
        configurable: true
      });

      const result = await isWebGPUAvailable();
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('isMobileDevice', () => {
    it('should return false for desktop user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });

      const result = isMobileDevice();
      expect(result).toBe(false);
    });

    it('should return true for mobile user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true
      });

      const result = isMobileDevice();
      expect(result).toBe(true);
    });

    it('should return true for Android user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
        configurable: true
      });

      const result = isMobileDevice();
      expect(result).toBe(true);
    });

    it('should return true for small screen with touch', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true
      });

      const result = isMobileDevice();
      expect(result).toBe(true);
    });
  });

  describe('getDeviceCapability', () => {
    it('should return "low" for mobile devices', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        configurable: true
      });

      const result = await getDeviceCapability();
      expect(result).toBe('low');
    });

    it('should return "low" for low memory devices', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2,
        configurable: true
      });

      const result = await getDeviceCapability();
      expect(result).toBe('low');
    });

    it('should return "medium" for medium memory without WebGPU', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 6,
        configurable: true
      });
      // No WebGPU, but enough cores
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 4,
        configurable: true
      });

      const result = await getDeviceCapability();
      expect(result).toBe('medium');
    });

    it('should return "high" for devices with WebGPU', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 16,
        configurable: true
      });
      Object.defineProperty(navigator, 'gpu', {
        value: {
          requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' })
        },
        configurable: true
      });

      const result = await getDeviceCapability();
      expect(result).toBe('high');
    });

    it('should return "low" for few cores without WebGPU', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      // Set deviceMemory to undefined to test hardware concurrency path
      Object.defineProperty(navigator, 'deviceMemory', {
        value: undefined,
        configurable: true
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true
      });
      // Ensure no WebGPU
      Object.defineProperty(navigator, 'gpu', {
        value: undefined,
        configurable: true
      });

      const result = await getDeviceCapability();
      expect(result).toBe('low');
    });
  });

  describe('getBestWhisperBackend', () => {
    it('should return "server" for low capability devices', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        configurable: true
      });

      const result = await getBestWhisperBackend();
      expect(result).toBe('server');
    });

    it('should return "webgpu" for high capability devices with WebGPU', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 16,
        configurable: true
      });
      Object.defineProperty(navigator, 'gpu', {
        value: {
          requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' })
        },
        configurable: true
      });

      const result = await getBestWhisperBackend();
      expect(result).toBe('webgpu');
    });

    it('should return "wasm" for medium capability devices', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 6,
        configurable: true
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 4,
        configurable: true
      });
      // No WebGPU

      const result = await getBestWhisperBackend();
      expect(result).toBe('wasm');
    });
  });

  describe('getCapabilityInfo', () => {
    it('should return comprehensive capability info', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 8,
        configurable: true
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 8,
        configurable: true
      });

      const info = await getCapabilityInfo();

      expect(info).toHaveProperty('capability');
      expect(info).toHaveProperty('recommendedBackend');
      expect(info).toHaveProperty('webgpuAvailable');
      expect(info).toHaveProperty('isMobile');
      expect(info).toHaveProperty('memory');
      expect(info).toHaveProperty('cores');
      expect(info.memory).toBe(8);
      expect(info.cores).toBe(8);
      expect(info.isMobile).toBe(false);
    });

    it('should handle missing memory/cores info', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        configurable: true
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true
      });
      // Set to undefined to simulate missing values
      Object.defineProperty(navigator, 'deviceMemory', {
        value: undefined,
        configurable: true
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: undefined,
        configurable: true
      });

      const info = await getCapabilityInfo();

      expect(info.memory).toBe('unknown');
      expect(info.cores).toBe('unknown');
    });
  });
});

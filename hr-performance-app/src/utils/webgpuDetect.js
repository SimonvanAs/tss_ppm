/**
 * WebGPU and device capability detection utilities
 */

/**
 * Check if WebGPU is available in the browser
 * @returns {Promise<boolean>}
 */
export async function isWebGPUAvailable() {
  if (!navigator.gpu) {
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (e) {
    console.warn('WebGPU check failed:', e);
    return false;
  }
}

/**
 * Check if the device is a mobile device
 * @returns {boolean}
 */
export function isMobileDevice() {
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;

  // Check user agent for mobile indicators
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return mobileUserAgent || (hasTouchScreen && isSmallScreen);
}

/**
 * Estimate device capability for running browser-based ML
 * @returns {Promise<'high' | 'medium' | 'low'>}
 */
export async function getDeviceCapability() {
  // Mobile devices get low capability (use server)
  if (isMobileDevice()) {
    return 'low';
  }

  // Check available memory (if API is available)
  if (navigator.deviceMemory) {
    if (navigator.deviceMemory < 4) {
      return 'low';
    }
    if (navigator.deviceMemory < 8) {
      return 'medium';
    }
  }

  // Check WebGPU availability
  const hasWebGPU = await isWebGPUAvailable();

  if (hasWebGPU) {
    return 'high';
  }

  // WASM fallback - check hardware concurrency
  const cores = navigator.hardwareConcurrency || 2;
  if (cores >= 4) {
    return 'medium';
  }

  return 'low';
}

/**
 * Determine the best Whisper backend for this device
 * @returns {Promise<'webgpu' | 'wasm' | 'server'>}
 */
export async function getBestWhisperBackend() {
  const capability = await getDeviceCapability();

  if (capability === 'low') {
    return 'server';
  }

  const hasWebGPU = await isWebGPUAvailable();

  if (hasWebGPU && capability === 'high') {
    return 'webgpu';
  }

  // Medium capability or no WebGPU - use WASM
  // But if it's too slow, we might still want server
  if (capability === 'medium') {
    return 'wasm';
  }

  return 'server';
}

/**
 * Get a human-readable description of the current capability
 * @returns {Promise<object>}
 */
export async function getCapabilityInfo() {
  const [capability, backend, webgpuAvailable] = await Promise.all([
    getDeviceCapability(),
    getBestWhisperBackend(),
    isWebGPUAvailable()
  ]);

  return {
    capability,
    recommendedBackend: backend,
    webgpuAvailable,
    isMobile: isMobileDevice(),
    memory: navigator.deviceMemory || 'unknown',
    cores: navigator.hardwareConcurrency || 'unknown'
  };
}

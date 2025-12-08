# Browser-Based Whisper Experiment Plan

## Overview

Experiment to run Whisper speech-to-text directly in the browser using Transformers.js, eliminating the need for a server-side Whisper instance.

## Technology Options

### 1. Transformers.js + WebGPU (Recommended)
- **Library**: [@xenova/transformers](https://huggingface.co/docs/transformers.js) or [@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers) (v3+)
- **Reference**: [whisper-web](https://github.com/xenova/whisper-web)
- **Backend**: WebGPU (GPU acceleration) or WASM (fallback)

### 2. whisper.cpp WASM
- **Demo**: https://ggml.ai/whisper.cpp/
- Pure WebAssembly, no WebGPU required
- More compatible but slower

## Model Size Considerations

| Model | Parameters | Size | Accuracy | Browser Suitability |
|-------|------------|------|----------|---------------------|
| tiny | 39M | ~75MB | Lower | Excellent |
| base | 74M | ~150MB | Good | Good |
| small | 244M | ~500MB | Better | Marginal |
| medium | 769M | ~1.5GB | High | Not recommended |
| large | 1.5B | ~3GB | Highest | Not feasible |

**Recommendation**: Start with `whisper-tiny` or `whisper-base` for browser use.

## Performance Expectations

Based on [community benchmarks](https://github.com/huggingface/transformers.js/issues/894):

### WebGPU vs WASM (varies by hardware)
- **Apple Silicon (M2)**: WASM faster (~5s) vs WebGPU (~9s) for base model
- **Intel/Nvidia GPU**: WebGPU faster (~6s) vs WASM (~11s)
- **With Transformers.js v3**: WebGPU improved to ~1.8s vs WASM ~3.4s

### Compared to Server-Side Faster-Whisper
- Server (CPU, small model): ~2-4s for 30s audio
- Browser (tiny model): ~3-10s depending on device
- Browser will be slower but eliminates server dependency

## Browser Requirements

### WebGPU Support (~70% global coverage as of late 2024)
- Chrome 113+ (enabled by default)
- Edge 113+
- Firefox (behind flag: `dom.webgpu.enabled`)
- Safari 18+ (macOS Sequoia, iOS 18)

### Fallback (WASM)
- All modern browsers with SIMD support
- Works on older devices without WebGPU

## Implementation Approach

### Phase 1: Proof of Concept
1. Add Transformers.js dependency
2. Create a simple test component with WebGPU Whisper
3. Test model loading and basic transcription
4. Measure performance vs current server approach

### Phase 2: Integration
1. Create `useBrowserWhisper` hook alongside existing `useVoiceInput`
2. Add WebGPU capability detection
3. Implement model caching (IndexedDB)
4. Add progress indicator for model download (~200MB first load)

### Phase 3: Hybrid Mode
1. Detect WebGPU support and device capability
2. Auto-select: Browser Whisper (capable devices) vs Server Whisper (fallback)
3. User preference toggle in settings

## Code Structure (Proposed)

```
src/
  hooks/
    useVoiceInput.js          # Current server-based implementation
    useBrowserWhisper.js      # New browser-based implementation
    useWhisper.js             # Unified hook that picks the best option
  workers/
    whisperWorker.js          # Web Worker for Transformers.js
  utils/
    webgpuDetect.js           # WebGPU capability detection
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large initial download (~200MB) | Poor first-use UX | Progressive loading indicator, cache in IndexedDB |
| WebGPU not supported | Fallback needed | WASM fallback + server fallback |
| Mobile performance | May be too slow | Server fallback for mobile devices |
| Memory pressure | Browser tab crashes | Use tiny model, unload when not in use |
| Model accuracy | Lower than server | Accept for dictation, offer server option |

## Success Criteria

1. **Works offline**: After first model download, no server needed
2. **Acceptable latency**: <5s for 10s audio clip on modern laptop
3. **Graceful fallback**: Falls back to server if browser can't handle it
4. **No regression**: Current server-based flow still works

## Next Steps

1. [ ] Install Transformers.js v3
2. [ ] Create minimal POC component
3. [ ] Test on various devices (laptop, phone, tablet)
4. [ ] Benchmark against current server implementation
5. [ ] Decide go/no-go based on results

## References

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/index)
- [Transformers.js v3 WebGPU Announcement](https://huggingface.co/blog/transformersjs-v3)
- [whisper-web Demo](https://huggingface.co/spaces/Xenova/whisper-web)
- [WebGPU Browser Support](https://caniuse.com/webgpu)
- [Real-Time Whisper WebGPU Tutorial](https://dev.to/proflead/real-time-audio-to-text-in-your-browser-whisper-webgpu-tutorial-j6d)

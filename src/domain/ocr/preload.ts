/**
 * Eagerly preloads the PaddleOCR service so the model is warm
 * by the time the user uploads an image.
 *
 * Call `preloadOcr()` as early as possible (e.g. on app mount).
 * Call `getPreloadStatus()` to poll readiness.
 * The paddle-worker singleton pattern means the service won't
 * be initialised twice — once warm, `getService()` returns instantly.
 */

let _status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let _error: Error | null = null;
let _promise: Promise<void> | null = null;
const _listeners: Array<(status: typeof _status) => void> = [];

function notify() {
  _listeners.forEach((fn) => fn(_status));
}

/**
 * Kick off model download + ONNX runtime init in the background.
 * Safe to call multiple times — only runs once.
 */
export function preloadOcr(): Promise<void> {
  if (_promise) return _promise;

  _status = 'loading';
  notify();

  _promise = (async () => {
    try {
      // Dynamic import so Vite tree-shakes if unused,
      // but here we intentionally pull it in eagerly.
      const { extractGradesFromFile } = await import(
        '@/domain/ocr/workers/paddle-worker.js'
      );

      // Create a tiny 1×1 transparent PNG to force full model init
      // without processing a real image. This warms up:
      //   - ONNX Runtime (WASM/WebGPU)
      //   - Detection model
      //   - Recognition model
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1, 1);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const file = new File([blob], 'warmup.png', { type: 'image/png' });

      // Run a throwaway recognition — the model is now cached in memory
      try {
        await extractGradesFromFile(file, () => {});
      } catch {
        // The warmup image will produce no text — that's expected.
        // The important thing is the model is loaded.
      }

      _status = 'ready';
      notify();
    } catch (err: any) {
      _error = err;
      _status = 'error';
      notify();
      // Don't rethrow — the app should still be usable; the model
      // will be loaded lazily when the user actually uploads.
    }
  })();

  return _promise;
}

export function getPreloadStatus() {
  return { status: _status, error: _error };
}

export function onPreloadStatusChange(fn: (status: typeof _status) => void) {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

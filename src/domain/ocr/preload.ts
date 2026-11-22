/**
 * Eagerly preloads the PaddleOCR service so the model is warm
 * by the time the user uploads an image.
 *
 * Call `preloadOcr()` as early as possible (e.g. on app mount).
 * Call `getPreloadStatus()` to poll readiness.
 * The paddle-worker singleton shares initialization with uploads.
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
 * Safe to call multiple times. Failed downloads can be retried.
 */
export function preloadOcr(): Promise<void> {
  if (_promise) return _promise;

  _status = 'loading';
  _error = null;
  notify();

  _promise = (async () => {
    try {
      const { initializeOcr } = await import(
        '@/domain/ocr/workers/paddle-worker.js'
      );
      await initializeOcr();

      _status = 'ready';
      notify();
    } catch (err: any) {
      _error = err;
      _status = 'error';
      _promise = null;
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

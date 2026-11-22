import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  recognize: vi.fn(),
  construct: vi.fn(),
}));

vi.mock('ppu-paddle-ocr/web', () => ({
  V5_EN_MOBILE_MODEL: {},
  PaddleOcrService: class {
    constructor() {
      mocks.construct();
    }
    initialize = mocks.initialize;
    recognize = mocks.recognize;
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.initialize.mockReset().mockResolvedValue(undefined);
  mocks.recognize.mockReset().mockResolvedValue({
    text: 'Mathematics 4 O', lines: [], confidence: 0.95,
  });
});

describe('OCR initialization', () => {
  it('holds uploads until the shared model initialization finishes', async () => {
    let finishLoading;
    mocks.initialize.mockImplementation(() => new Promise((resolve) => {
      finishLoading = resolve;
    }));
    const { initializeOcr, extractGradesFromFile } = await import(
      '@/domain/ocr/workers/paddle-worker.js'
    );

    const preload = initializeOcr();
    const upload = extractGradesFromFile(new Blob(['image'], { type: 'image/png' }));
    expect(mocks.construct).toHaveBeenCalledTimes(1);
    expect(mocks.recognize).not.toHaveBeenCalled();

    finishLoading();
    await preload;
    await expect(upload).resolves.toMatchObject({ text: 'Mathematics 4 O' });
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    expect(mocks.recognize).toHaveBeenCalledTimes(1);
  });

  it('allows an upload to retry after a model download fails', async () => {
    mocks.initialize.mockRejectedValueOnce(new Error('Network unavailable'));
    const { initializeOcr, extractGradesFromFile } = await import(
      '@/domain/ocr/workers/paddle-worker.js'
    );

    await expect(initializeOcr()).rejects.toThrow('Network unavailable');
    await expect(extractGradesFromFile(new Blob(['image']))).resolves.toMatchObject({
      text: 'Mathematics 4 O',
    });
    expect(mocks.construct).toHaveBeenCalledTimes(2);
  });

  it('reports preload failures accurately and can recover on retry', async () => {
    mocks.initialize.mockRejectedValueOnce(new Error('Network unavailable'));
    const { preloadOcr, getPreloadStatus, onPreloadStatusChange } = await import(
      '@/domain/ocr/preload'
    );
    const listener = vi.fn();
    const unsubscribe = onPreloadStatusChange(listener);

    await preloadOcr();
    expect(getPreloadStatus()).toMatchObject({ status: 'error' });
    expect(getPreloadStatus().error.message).toBe('Network unavailable');
    await preloadOcr();
    expect(getPreloadStatus()).toEqual({ status: 'ready', error: null });
    expect(listener.mock.calls.map(([status]) => status)).toEqual([
      'loading', 'error', 'loading', 'ready',
    ]);
    unsubscribe();
  });
});

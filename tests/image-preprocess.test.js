import { describe, expect, it } from 'vitest';
import {
  autoContrast,
  binarize,
  getOcrTargetSize,
  otsuThreshold,
  preprocessGrayscale,
} from '../modules/image-preprocess.js';

describe('image-preprocess', () => {
  it('upscales narrow screenshots to improve digit OCR', () => {
    const target = getOcrTargetSize(1532, 653);
    expect(target.width).toBeGreaterThanOrEqual(2800);
    expect(target.scale).toBeGreaterThan(1);
  });

  it('produces enhanced grayscale output', () => {
    const width = 40;
    const height = 20;
    const gray = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        gray[y * width + x] = x < width / 2 ? 40 : 210;
      }
    }

    const processed = preprocessGrayscale(gray, width, height);
    const min = Math.min(...processed);
    const max = Math.max(...processed);

    expect(max - min).toBeGreaterThan(100);
    expect(binarize(gray, 128).every((v) => v === 0 || v === 255)).toBe(true);
  });
});

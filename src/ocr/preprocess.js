/**
 * @module image-preprocess
 * @description Shared grayscale preprocessing for gradesheet OCR.
 * Upscale, contrast stretch, and sharpen improve digit accuracy for Tesseract.
 */

export const MIN_OCR_WIDTH = 3200;

/**
 * @param {Uint8ClampedArray|Uint8Array} rgba - RGBA pixel data.
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function rgbaToGrayscale(rgba, width, height) {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    gray[p] = rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114;
  }
  return gray;
}

/**
 * @param {Uint8Array} gray
 * @returns {Uint8ClampedArray}
 */
export function grayscaleToRgba(gray) {
  const rgba = new Uint8ClampedArray(gray.length * 4);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    rgba[p] = gray[i];
    rgba[p + 1] = gray[i];
    rgba[p + 2] = gray[i];
    rgba[p + 3] = 255;
  }
  return rgba;
}

/**
 * @param {Uint8Array} gray
 * @returns {boolean}
 */
export function shouldInvertGrayscale(gray) {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  return sum / gray.length < 120;
}

/**
 * @param {Uint8Array} gray
 * @returns {Uint8Array}
 */
export function invertGrayscale(gray) {
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = 255 - gray[i];
  return out;
}

/**
 * Stretches contrast using low/high percentiles.
 *
 * @param {Uint8Array} gray
 * @param {number} [lowPct=0.02]
 * @param {number} [highPct=0.98]
 * @returns {Uint8Array}
 */
export function autoContrast(gray, lowPct = 0.02, highPct = 0.98) {
  const sorted = Uint8Array.from(gray).sort();
  const low = sorted[Math.floor(sorted.length * lowPct)] ?? 0;
  const high = sorted[Math.floor(sorted.length * highPct)] ?? 255;
  const range = Math.max(high - low, 1);
  const out = new Uint8Array(gray.length);

  for (let i = 0; i < gray.length; i++) {
    const stretched = ((gray[i] - low) / range) * 255;
    out[i] = Math.min(255, Math.max(0, Math.round(stretched)));
  }

  return out;
}

/**
 * Simple 3x3 box blur.
 *
 * @param {Uint8Array} gray
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function boxBlur3x3(gray, width, height) {
  const out = new Uint8Array(gray.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= height || nx >= width) continue;
          sum += gray[ny * width + nx];
          count++;
        }
      }

      out[y * width + x] = Math.round(sum / count);
    }
  }

  return out;
}

/**
 * Unsharp mask sharpening.
 *
 * @param {Uint8Array} gray
 * @param {number} width
 * @param {number} height
 * @param {number} [amount=1.4]
 * @returns {Uint8Array}
 */
export function unsharpMask(gray, width, height, amount = 1.4) {
  const blurred = boxBlur3x3(gray, width, height);
  const out = new Uint8Array(gray.length);

  for (let i = 0; i < gray.length; i++) {
    const sharpened = gray[i] + amount * (gray[i] - blurred[i]);
    out[i] = Math.min(255, Math.max(0, Math.round(sharpened)));
  }

  return out;
}

/**
 * Otsu's method for automatic thresholding.
 *
 * @param {Uint8Array} gray
 * @returns {number}
 */
export function otsuThreshold(gray) {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let weightB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    weightB += histogram[t];
    if (weightB === 0) continue;

    const weightF = total - weightB;
    if (weightF === 0) break;

    sumB += t * histogram[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * @param {Uint8Array} gray
 * @param {number} threshold
 * @returns {Uint8Array}
 */
export function binarize(gray, threshold) {
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i] >= threshold ? 255 : 0;
  }
  return out;
}

/**
 * Full preprocessing pipeline for OCR.
 *
 * @param {Uint8Array} gray
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function preprocessGrayscale(gray, width, height) {
  let processed = gray;

  if (shouldInvertGrayscale(processed)) {
    processed = invertGrayscale(processed);
  }

  processed = autoContrast(processed);
  processed = unsharpMask(processed, width, height, 1.2);

  // Keep grayscale for Tesseract — harsh binarization destroys 2/3 digits.
  const boosted = new Uint8Array(processed.length);
  for (let i = 0; i < processed.length; i++) {
    boosted[i] = Math.min(255, Math.max(0, Math.round((processed[i] - 128) * 1.35 + 128)));
  }

  return boosted;
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} [minWidth=MIN_OCR_WIDTH]
 * @returns {{width: number, height: number, scale: number}}
 */
export function getOcrTargetSize(width, height, minWidth = MIN_OCR_WIDTH) {
  if (width >= minWidth) {
    return { width, height, scale: 1 };
  }

  const scale = minWidth / width;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}

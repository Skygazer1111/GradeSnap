/**
 * @module ocr
 * @description Local OCR for GradeSnap using Tesseract.js (runs entirely in the browser).
 */

import { createWorker, PSM } from 'tesseract.js';
import {
  getOcrTargetSize,
  grayscaleToRgba,
  preprocessGrayscale,
  rgbaToGrayscale,
} from './preprocess.js';

/**
 * Preprocesses a gradesheet image for OCR.
 *
 * @param {string} base64 - Base64 image data.
 * @param {string} mimeType - Original MIME type.
 * @returns {Promise<string>} Data URL ready for Tesseract.
 */
function preprocessImage(base64, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = getOcrTargetSize(img.width, img.height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const gray = rgbaToGrayscale(imageData.data, width, height);
      const processed = preprocessGrayscale(gray, width, height);
      const output = grayscaleToRgba(processed);

      ctx.putImageData(new ImageData(output, width, height), 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image for OCR preprocessing'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Runs Tesseract OCR on a gradesheet image and returns the raw recognized text.
 *
 * @async
 * @param {string} base64Image - Base64 image data (without data URI prefix).
 * @param {string} mimeType - Image MIME type.
 * @param {function} [onStatus] - Optional status callback for UI updates.
 * @returns {Promise<string>} Raw OCR text.
 */
export async function extractGrades(base64Image, mimeType, onStatus) {
  let imageDataUrl;
  try {
    if (onStatus) onStatus('Enhancing image for OCR…');
    imageDataUrl = await preprocessImage(base64Image, mimeType);
  } catch {
    imageDataUrl = `data:${mimeType};base64,${base64Image}`;
  }

  const worker = await createWorker('eng', 1, {
    logger: (message) => {
      if (!onStatus) return;

      if (message.status === 'loading tesseract core' || message.status === 'initializing tesseract') {
        onStatus('Loading OCR engine…');
      } else if (message.status === 'loading language traineddata') {
        onStatus('Loading language data…');
      } else if (message.status === 'recognizing text') {
        const pct = Math.round((message.progress || 0) * 100);
        onStatus(`Reading gradesheet… ${pct}%`);
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    });

    const { data } = await worker.recognize(imageDataUrl);
    const text = data?.text?.trim();

    if (!text) {
      throw new Error(
        'OCR could not read any text from this image. Try a clearer, well-lit photo of your gradesheet.'
      );
    }

    return text;
  } finally {
    await worker.terminate();
  }
}

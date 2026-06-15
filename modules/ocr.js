/**
 * @module ocr
 * @description Local OCR for GradeSnap using Tesseract.js (runs entirely in the browser).
 */

import { createWorker, PSM } from 'tesseract.js';

/**
 * Preprocesses a gradesheet image for OCR.
 * Handles dark-mode screenshots by inverting, then boosts contrast.
 *
 * @param {string} base64 - Base64 image data.
 * @param {string} mimeType - Original MIME type.
 * @returns {Promise<string>} Data URL ready for Tesseract.
 */
function preprocessImage(base64, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 2400;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Flatten transparency — critical for PNG screenshots with alpha
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;
      let brightnessSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        brightnessSum += gray;
      }

      const avgBrightness = brightnessSum / (data.length / 4);
      const invert = avgBrightness < 120;

      for (let i = 0; i < data.length; i += 4) {
        let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (invert) gray = 255 - gray;

        const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
        const binary = contrast > 145 ? 255 : contrast < 95 ? 0 : contrast;

        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
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
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
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

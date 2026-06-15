/**
 * Shared image preprocessing for OCR in Node tests and tooling.
 */

import sharp from 'sharp';
import {
  getOcrTargetSize,
  preprocessGrayscale,
} from '../../src/ocr/preprocess.js';

/**
 * Prepares a gradesheet image for OCR.
 *
 * @param {string} inputPath - Source image path.
 * @returns {Promise<Buffer>} JPEG buffer for Tesseract.
 */
export async function preprocessGradesheetImage(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  const sourceWidth = metadata.width || 1200;
  const sourceHeight = metadata.height || 800;
  const { width, height } = getOcrTargetSize(sourceWidth, sourceHeight);

  const { data, info } = await sharp(inputPath)
    .flatten({ background: '#000000' })
    .resize({ width, height, kernel: sharp.kernel.lanczos3 })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const processed = preprocessGrayscale(new Uint8Array(data), info.width, info.height);

  return sharp(Buffer.from(processed), {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Runs Tesseract OCR on an image file.
 *
 * @param {string} imagePath
 * @returns {Promise<string>}
 */
export async function runOcrOnImage(imagePath) {
  const { createWorker, PSM } = await import('tesseract.js');
  const imageBuffer = await preprocessGradesheetImage(imagePath);

  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
    });

    const { data } = await worker.recognize(imageBuffer);
    return data?.text?.trim() || '';
  } finally {
    await worker.terminate();
  }
}

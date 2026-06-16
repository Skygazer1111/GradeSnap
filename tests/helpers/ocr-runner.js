/**
 * Shared image OCR runner for Node.js tests using PaddleOCR.
 * Falls back to text-based parsing for tests that don't have
 * bounding-box data.
 */

import { PaddleOcrService } from 'ppu-paddle-ocr';
import sharp from 'sharp';
import {
  getOcrTargetSize,
} from '../../src/ocr/preprocess.js';

let _service = null;

async function getService() {
  if (_service) return _service;
  _service = new PaddleOcrService({
    detection: {
      maxSideLength: 1280,
    },
  });
  await _service.initialize();
  return _service;
}

/**
 * Prepares a gradesheet image for OCR.
 *
 * @param {string} inputPath - Source image path.
 * @returns {Promise<Buffer>} JPEG buffer for PaddleOCR.
 */
export async function preprocessGradesheetImage(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  const sourceWidth = metadata.width || 1200;
  const sourceHeight = metadata.height || 800;
  const { width, height } = getOcrTargetSize(sourceWidth, sourceHeight);

  return sharp(inputPath)
    .resize({ width, height, kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Runs PaddleOCR on an image file.
 *
 * @param {string} imagePath
 * @returns {Promise<string>}
 */
export async function runOcrOnImage(imagePath) {
  const service = await getService();
  const imageBuffer = await preprocessGradesheetImage(imagePath);
  const arrayBuffer = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  );

  const result = await service.recognize(arrayBuffer);
  return result?.text?.trim() || '';
}

/**
 * Runs PaddleOCR and returns structured bounding-box results.
 *
 * @param {string} imagePath
 * @returns {Promise<{ text: string, items: Array<{text: string, box: object, confidence: number}> }>}
 */
export async function runOcrOnImageWithBoxes(imagePath) {
  const service = await getService();
  const imageBuffer = await preprocessGradesheetImage(imagePath);
  const arrayBuffer = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  );

  const result = await service.recognize(arrayBuffer, { flatten: true, strategy: 'per-box' });

  return {
    text: result?.text?.trim() || '',
    items: result.results.map(r => ({
      text: r.text,
      box: r.box,
      confidence: r.confidence,
    })),
  };
}

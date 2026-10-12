/**
 * @module paddle-worker
 * @description PaddleOCR engine for GradeSnap.
 * Uses ppu-paddle-ocr with ONNX Runtime Web (WebGPU → WASM fallback).
 * Runs entirely in the browser — no data leaves the client.
 */

import { PaddleOcrService, V5_EN_MOBILE_MODEL } from 'ppu-paddle-ocr/web';
import { preprocessImageBufferForOcr } from '@/domain/ocr/transforms/preprocess.js';

/** @type {PaddleOcrService | null} */
let _service = null;

/**
 * Lazily initializes the PaddleOCR service (singleton).
 * Models are downloaded on first use and cached in IndexedDB.
 *
 * @param {function} [onStatus] - Optional status callback for UI updates.
 * @returns {Promise<PaddleOcrService>}
 */
async function getService(onStatus) {
  if (_service) return _service;

  if (onStatus) onStatus('Loading AI model…');

  _service = new PaddleOcrService({
    // The v6 tiny default loses grades and rows in the sample gradesheets.
    model: V5_EN_MOBILE_MODEL,
    detection: {
      maxSideLength: 1920,
      minimumAreaThreshold: 50,
    },
    recognition: {
      // Read narrow grade cells separately and retain low-confidence anchors.
      recBatchSize: 1,
      minimumConfidence: 0,
      rotateVerticalCrops: false,
      maxCropSourceSideLength: Infinity,
    },
    processing: {
      engine: 'canvas-native', // No OpenCV dependency needed
    },
  });

  await _service.initialize();

  return _service;
}

/**
 * Converts a File/Blob to an ArrayBuffer for PaddleOCR.
 *
 * @param {File|Blob} file
 * @returns {Promise<ArrayBuffer>}
 */
async function fileToArrayBuffer(file) {
  return file.arrayBuffer();
}

/**
 * Converts base64 + mimeType to an ArrayBuffer.
 *
 * @param {string} base64 - Base64 image data (without data URI prefix).
 * @param {string} mimeType - Image MIME type.
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Runs PaddleOCR on a gradesheet image.
 * Returns both the structured bounding-box results and the raw text.
 *
 * @param {string} base64Image - Base64 image data (without data URI prefix).
 * @param {string} mimeType - Image MIME type.
 * @param {function} [onStatus] - Optional status callback for UI updates.
 * @returns {Promise<{ text: string, items: Array<{text: string, box: {x:number,y:number,width:number,height:number}, confidence: number}> }>}
 */
export async function extractGrades(base64Image, mimeType, onStatus) {
  const service = await getService(onStatus);

  if (onStatus) onStatus('Detecting text regions…');

  const imageBuffer = base64ToArrayBuffer(base64Image, mimeType);
  const preparedBuffer = await preprocessImageBufferForOcr(imageBuffer, mimeType);

  // Keep grouped text line breaks for wrapped mobile subjects.
  const result = await service.recognize(preparedBuffer, {
    strategy: 'per-box',
  });

  if (onStatus) onStatus('Processing results…');

  const items = result.lines.flat().map(r => ({
    text: r.text,
    box: r.box,
    confidence: r.confidence,
  }));

  const text = result.text || '';

  if (!text && items.length === 0) {
    throw new Error(
      'OCR could not read any text from this image. Try a clearer, well-lit photo of your gradesheet.'
    );
  }

  const overallConfidence = result.confidence || 0;

  return { text, items, confidence: overallConfidence };
}

/**
 * Runs PaddleOCR on a File/Blob directly.
 *
 * @param {File|Blob} file
 * @param {function} [onStatus]
 * @returns {Promise<{ text: string, items: Array<{text: string, box: object, confidence: number}>, confidence: number }>}
 */
export async function extractGradesFromFile(file, onStatus) {
  const service = await getService(onStatus);

  if (onStatus) onStatus('Detecting text regions…');

  const imageBuffer = await fileToArrayBuffer(file);
  const mimeType = file.type || 'image/jpeg';
  const preparedBuffer = await preprocessImageBufferForOcr(imageBuffer, mimeType);

  const result = await service.recognize(preparedBuffer, {
    strategy: 'per-box',
  });

  if (onStatus) onStatus('Processing results…');

  const items = result.lines.flat().map(r => ({
    text: r.text,
    box: r.box,
    confidence: r.confidence,
  }));

  const text = result.text || '';

  if (!text && items.length === 0) {
    throw new Error(
      'OCR could not read any text from this image. Try a clearer, well-lit photo of your gradesheet.'
    );
  }

  const overallConfidence = result.confidence || 0;

  return { text, items, confidence: overallConfidence };
}

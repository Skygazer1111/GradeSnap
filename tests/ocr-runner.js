/**
 * Shared image preprocessing for OCR in Node tests and tooling.
 */

import sharp from 'sharp';

/**
 * Prepares a gradesheet image for OCR (resize, flatten alpha, invert dark UI).
 *
 * @param {string} inputPath - Source image path.
 * @returns {Promise<Buffer>} PNG buffer for Tesseract.
 */
export async function preprocessGradesheetImage(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  const width = Math.min(Math.max(metadata.width || 1200, 1200), 2400);

  const { data, info } = await sharp(inputPath)
    .flatten({ background: '#000000' })
    .resize({ width, withoutEnlargement: false })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let brightnessSum = 0;
  for (let i = 0; i < data.length; i++) {
    brightnessSum += data[i];
  }
  const avgBrightness = brightnessSum / data.length;
  const invert = avgBrightness < 120;

  const processed = Buffer.from(data);
  for (let i = 0; i < processed.length; i++) {
    let gray = processed[i];
    if (invert) gray = 255 - gray;
    const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
    processed[i] = contrast > 145 ? 255 : contrast < 95 ? 0 : contrast;
  }

  return sharp(processed, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .png()
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

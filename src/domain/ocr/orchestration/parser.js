/**
 * @module parser
 * @description Parses OCR output from gradesheets into editable subject rows.
 * Supports two input modes:
 *   1. Bounding-box data from PaddleOCR (primary, spatial assembly)
 *   2. Raw text fallback (for backward compat with tests and edge cases)
 */

import { assembleSpatialRows } from '@/domain/ocr/parsing/spatial-assembler.js';
import { assembleRows, shouldMergeMobileText } from '@/domain/ocr/parsing/row-assembler.js';
import { rectifySubjects } from '@/domain/cgpa/rectifier.js';
import { getAvailableGrades, getGradePoints } from '@/domain/cgpa/grade-mapper.js';

export { getAvailableGrades, getGradePoints };

/**
 * Parses bounding-box results from PaddleOCR into subject rows.
 *
 * @param {Array<{text: string, box: {x:number,y:number,width:number,height:number}, confidence: number}>} items
 * @param {string} rawText - The raw concatenated text (for rectifier anchors).
 * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
 */
export function parseBoundingBoxes(items, rawText = '') {
  if (!items || items.length === 0) {
    throw new Error('Cannot parse grades: OCR returned no detected text regions.');
  }

  let parsedRows = assembleSpatialRows(items, '10');

  const spatialLooksTruncated =
    parsedRows.length >= 2 &&
    parsedRows.filter((row) => row.subject.split(/\s+/).length <= 2).length >= Math.ceil(parsedRows.length / 2);

  // Fall back to text-based parsing if spatial assembly found too little,
  // produced truncated mobile-portal subject names, or the OCR text uses
  // wrapped mobile line layout (with or without course codes).
  if (rawText) {
    const textRows = assembleRows(rawText, '10');
    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const mobileWrappedLayout = shouldMergeMobileText(lines);

    const preferText =
      textRows.length > parsedRows.length ||
      spatialLooksTruncated ||
      (mobileWrappedLayout && textRows.length >= Math.max(parsedRows.length, 2));

    if (preferText) {
      parsedRows = textRows;
    }
  }

  // Run through rectifier for credit inference and validation
  const validated = rectifySubjects(parsedRows, rawText, '10');

  if (validated.length === 0) {
    throw new Error(
      'Could not detect subjects in the OCR output. You can still add rows manually, or try a clearer screenshot.'
    );
  }

  return validated;
}

/**
 * Parses raw OCR text into subject rows (backward compat).
 *
 * @param {string} rawText - Raw text from OCR.
 * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
 */
export function parseOcrText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Cannot parse grades: OCR returned empty text.');
  }

  // Use the text-based row assembler
  let parsedRows = assembleRows(rawText, '10');

  const validated = rectifySubjects(parsedRows, rawText, '10');

  if (validated.length === 0) {
    throw new Error(
      'Could not detect subjects in the OCR text. You can still add rows manually, or try a clearer screenshot.'
    );
  }

  return validated;
}

export function parseGradesResponse(rawText) {
  return parseOcrText(rawText);
}

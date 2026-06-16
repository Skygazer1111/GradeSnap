/**
 * @module parser
 * @description Parses OCR text from university gradesheets into editable subject rows using modular pipeline.
 */

import { assembleRows } from './modules/row-assembler.js';
import { rectifySubjects } from '../core/rectifier.js';
import { getAvailableGrades, getGradePoints } from '../core/grade-mapper.js';

export { getAvailableGrades, getGradePoints };

/**
 * Parses OCR text from a gradesheet into subject rows.
 *
 * @param {string} rawText - Raw text from Tesseract OCR.
 * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
 */
export function parseOcrText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Cannot parse grades: OCR returned empty text.');
  }

  // Use the new modular assembler
  let parsedRows = assembleRows(rawText, '10');

  // We can still run the result through rectifier to fix credits if anchors are found,
  // but our new extraction should be much better natively.
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

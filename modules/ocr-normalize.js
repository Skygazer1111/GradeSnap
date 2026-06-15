/**
 * @module ocr-normalize
 * @description Shared OCR text normalization for parser and rectifier.
 */

import { normalizeGradeSymbol } from './grade-mapper.js';

export const COURSE_CODE_PATTERN = '2[1Iil][A-Za-z]{3,4}\\d{3}[A-Za-z)]?';
export const COURSE_CODE_REGEX = new RegExp(COURSE_CODE_PATTERN, 'i');

const GRADE_TOKEN =
  'A\\+|A-|B\\+|B-|C\\+|C-|D\\+|D-|Oo|\\[e\\]|\\[o\\]|\\[eo\\]|\\[lo\\]|\\[0\\]|\\(e\\]|\\(e\\}|O|A|B|C|D|F';

const MONTH_NAMES =
  'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
const MONTH_YEAR_LINE_RE = new RegExp(
  `^\\s*(?:${MONTH_NAMES})\\s*[-–]\\s*\\d{2,4}(?:\\s+\\d{1,2})?\\s*$`,
  'i'
);
const MONTH_YEAR_PREFIX_RE = new RegExp(
  `^\\s*(?:${MONTH_NAMES})\\s*[-–]\\s*\\d{2,4}\\s*`,
  'i'
);

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isGradesheetDateNoise(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (MONTH_YEAR_LINE_RE.test(trimmed)) return true;
  if (MONTH_YEAR_PREFIX_RE.test(trimmed) && trimmed.length < 48) return true;
  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isGradesheetHeaderNoise(text) {
  const upper = (text || '').trim().toUpperCase();
  if (!upper) return false;
  if (/^EE$/.test(upper)) return true;
  if (/^[=+\-\s|—]+$/.test(upper)) return true;
  if (upper.includes('COURSE CODE') && upper.includes('DESCRIPTION')) return true;
  if (isGradesheetDateNoise(text)) return true;
  return false;
}

/**
 * Removes semester date banner text merged into a row by OCR.
 *
 * @param {string} line
 * @returns {string}
 */
export function stripGradesheetDatePrefix(line) {
  return line.replace(MONTH_YEAR_PREFIX_RE, '').trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
export function applyOcrGradeCreditFixes(text) {
  let out = text
    .replace(/(\d{1,2})\s+\[0\]/gi, '$1 O')
    .replace(/(\d{1,2})\s+\[o\]/gi, '$1 O')
    .replace(/\[0\]\s+\[0\]/gi, ' 0 O ')
    .replace(/\[o\]\s+\[o\]/gi, ' 0 O ')
    .replace(/\[o\]\s+\[0\]/gi, ' 0 O ')
    .replace(/\[0\]\s+\[o\]/gi, ' 0 O ')
    .replace(/\[0\]\s+(A\+|A-|B\+|B-|C\+|C-|D\+|D-|Oo|O|A|B|C|D|F)\b/gi, ' 0 $1 ')
    .replace(/\[lo\]/gi, ' O ')
    .replace(/\blo\)/gi, ' O ')
    .replace(/\[eo\]/gi, ' O ')
    .replace(/\[e\]/gi, ' O ')
    .replace(/\(e\]/gi, ' O ')
    .replace(/\(e\}/gi, ' O ')
    .replace(/\blo\]/gi, ' O ')
    .replace(/\boO\b/g, ' O ')
    .replace(/\bOo\b/g, ' O ');

  if (/ANALYTICAL|LOGICAL\s+THINKING/i.test(out)) {
    out = out.replace(
      /\[o\]\s+(A\+|A-|B\+|B-|C\+|C-|D\+|D-|Oo|O|A|B|C|D|F)\b/gi,
      ' 0 $1 '
    );
  }

  return out;
}

/**
 * @param {string} raw
 * @returns {number|null}
 */
export function parseCreditValue(raw) {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim().toLowerCase();
  if (value === '[0]') return 0;
  const num = Number(value);
  return Number.isNaN(num) ? null : Math.round(num);
}

/**
 * Extract the last credit + grade pair from a row fragment (before PASS).
 *
 * @param {string} beforePass
 * @returns {{ credits: number, grade: string }|null}
 */
export function extractCreditGradePair(beforePass) {
  const gradeAtEnd = new RegExp(
    `(\\d{1,2}|\\[0\\])\\s+(${GRADE_TOKEN})\\s*$`,
    'i'
  );
  const tail = beforePass.match(gradeAtEnd);

  if (tail) {
    const credits = parseCreditValue(tail[1]);
    if (credits !== null) {
      return { credits, grade: tail[2] };
    }
  }

  const pairRe = new RegExp(`\\b([234])\\s+(${GRADE_TOKEN})\\b`, 'gi');
  const pairs = [...beforePass.matchAll(pairRe)];
  if (!pairs.length) return null;

  const last = pairs[pairs.length - 1];
  const credits = parseCreditValue(last[1]);
  if (credits === null) return null;

  return { credits, grade: last[2] };
}

/**
 * @param {string} rawText
 * @returns {string}
 */
export function normalizeOcrTextBlock(rawText) {
  return applyOcrGradeCreditFixes(
    rawText.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[|]+/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} rawGrade
 * @returns {string}
 */
export function normalizeOcrGradeToken(rawGrade) {
  return normalizeGradeSymbol(rawGrade);
}

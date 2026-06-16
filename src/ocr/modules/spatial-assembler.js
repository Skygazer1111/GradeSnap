/**
 * @module spatial-assembler
 * @description Assembles PaddleOCR recognition results into structured subject rows
 * using spatial (coordinate-based) logic instead of string parsing.
 *
 * PaddleOCR returns RecognitionResult[] where each item has:
 *   { text: string, box: { x, y, width, height }, confidence: number }
 *
 * This module groups them into rows by Y-coordinate, sorts left-to-right,
 * and assigns columns based on position.
 */

import { matchGrade } from './grade-matcher.js';
import { matchCredit } from './credit-matcher.js';
import { extractSubject } from './subject-extractor.js';

const COURSE_CODE_RE = /^2[1Iil][A-Za-z]{2,5}\d{2,4}[A-Za-z)]*$/i;

const NOISE_RE =
  /^(S\.?\s*NO\.?|SEMESTER|COURSE\s*CODE|COURSE\s*DESCRIPTION|CREDIT|GRADE|RESULT|SUBJECT|CREDITS|CGPA|SGPA|EE)$/i;

const MONTH_LINE_RE =
  /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*[-–]\s*\d{2,4}/i;

/**
 * Get the vertical centre of a box { x, y, width, height }.
 */
function yCenter(box) {
  return box.y + box.height / 2;
}

/** Get the horizontal centre of a box. */
function xCenter(box) {
  return box.x + box.width / 2;
}

/**
 * Groups detected boxes into rows using Y-tolerance clustering.
 *
 * @param {Array<{text: string, box: {x:number,y:number,width:number,height:number}, confidence: number}>} items
 * @param {number} yTolerance - Max vertical pixel distance to consider same row.
 * @returns {Array<Array<{text: string, box: object, confidence: number}>>}
 */
export function groupIntoRows(items, yTolerance = 20) {
  if (!items || items.length === 0) return [];

  // Sort by Y first
  const sorted = [...items].sort((a, b) => yCenter(a.box) - yCenter(b.box));

  const rows = [];
  let currentRow = [sorted[0]];
  let currentY = yCenter(sorted[0].box);

  for (let i = 1; i < sorted.length; i++) {
    const boxY = yCenter(sorted[i].box);
    if (Math.abs(boxY - currentY) <= yTolerance) {
      currentRow.push(sorted[i]);
    } else {
      rows.push(currentRow);
      currentRow = [sorted[i]];
      currentY = boxY;
    }
  }
  rows.push(currentRow);

  // Sort each row left-to-right
  for (const row of rows) {
    row.sort((a, b) => xCenter(a.box) - xCenter(b.box));
  }

  return rows;
}

/**
 * Determines if a token is noise (header, separator, date).
 */
function isNoise(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (NOISE_RE.test(trimmed)) return true;
  if (MONTH_LINE_RE.test(trimmed)) return true;
  if (/^[=+\-\s|—_]+$/.test(trimmed)) return true;
  // Pure numbers that look like serial/semester (1-digit or 2-digit)
  if (/^\d{1,2}$/.test(trimmed)) return true;
  return false;
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parses a single spatial row (array of boxes sorted L→R) into a subject entry.
 *
 * @param {Array<{text: string, box: object, confidence: number}>} row
 * @param {string} scaleId
 * @returns {{ subject: string, credits: number, grade: string, flagged: boolean } | null}
 */
function parseRow(row, scaleId = '10') {
  // Filter out noise tokens
  const meaningful = row.filter(item => !isNoise(item.text));
  if (meaningful.length < 2) return null;

  // Strategy: scan right-to-left for PASS/FAIL, grade, credits.
  // Everything remaining is the subject name.
  let gradeIdx = -1;
  let creditIdx = -1;
  let grade = null;
  let credits = null;

  // Walk from the right side
  for (let i = meaningful.length - 1; i >= 0; i--) {
    const text = meaningful[i].text.trim();

    // Skip PASS/FAIL at the rightmost edge
    if (/^(PASS|FAIL)$/i.test(text)) continue;

    // Try grade
    if (grade === null) {
      const g = matchGrade(text, scaleId);
      if (g) {
        grade = g;
        gradeIdx = i;
        continue;
      }
    }

    // Try credits (must come before grade spatially = left of grade)
    if (grade !== null && credits === null) {
      const c = matchCredit(text);
      if (c !== null) {
        credits = c;
        creditIdx = i;
        break; // Found both, everything to the left is subject
      }
    }
  }

  if (!grade) return null;

  // Build subject from remaining tokens
  const subjectEnd = creditIdx >= 0 ? creditIdx : gradeIdx;
  const subjectTokens = meaningful
    .slice(0, subjectEnd)
    .map(b => b.text.trim())
    .filter(t => !COURSE_CODE_RE.test(t) && !isNoise(t));

  const rawSubject = subjectTokens.join(' ');
  const subject = extractSubject(rawSubject);

  if (subject.length < 4) return null;

  return {
    subject,
    credits: credits !== null ? credits : 0,
    grade,
    flagged: credits === null || credits === 0,
  };
}

/**
 * Assembles PaddleOCR recognition results into parsed subject rows.
 *
 * @param {Array<{text: string, box: {x:number,y:number,width:number,height:number}, confidence: number}>} items
 * @param {string} scaleId
 * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
 */
export function assembleSpatialRows(items, scaleId = '10') {
  const rows = groupIntoRows(items);
  const results = [];
  const seenSubjects = new Set();

  for (const row of rows) {
    const entry = parseRow(row, scaleId);
    if (!entry) continue;

    // Deduplicate
    const key = `${entry.subject.toUpperCase()}|${entry.grade}`;
    if (seenSubjects.has(key)) continue;
    seenSubjects.add(key);

    results.push({
      id: generateId(),
      ...entry,
    });
  }

  return results;
}

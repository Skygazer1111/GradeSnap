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
 * Groups detected boxes into rows using adaptive Y-tolerance clustering.
 *
 * @param {Array<{text: string, box: {x:number,y:number,width:number,height:number}, confidence: number}>} items
 * @returns {Array<Array<{text: string, box: object, confidence: number}>>}
 */
export function groupIntoRows(items) {
  if (!items || items.length === 0) return [];

  // Compute adaptive Y tolerance based on median box height, ignoring tiny noise
  const validHeights = items.map(item => item.box.height).filter(h => h > 5).sort((a, b) => a - b);
  const medianHeight = validHeights.length > 0 ? validHeights[Math.floor(validHeights.length / 2)] : 20;
  // Use 40% of median height, but clamp it between sensible minimums and maximums
  // so we don't break on extreme noise or giant headers. For 1280px downscaled images,
  // medianHeight might be 15px, and adjacent rows might be 8px apart.
  const yTolerance = Math.max(4, Math.min(40, medianHeight * 0.4));

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
  // We do NOT filter out bare digits here because they might be valid Credits
  // that were detected as isolated bounding boxes!
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
  // Filter out noise and flatten words (PaddleOCR sometimes merges "3 O PASS" into one box)
  const words = [];
  for (const item of row) {
    if (isNoise(item.text)) continue;
    
    // Split by spaces to handle merged boxes, giving each word the parent box's confidence
    const tokens = item.text.trim().split(/\s+/);
    for (let token of tokens) {
      const upper = token.toUpperCase();
      
      // Handle missing spaces before PASS/FAIL: e.g. "3OPASS" -> "3O", "PASS"
      if (upper.length > 4 && /(PASS|FAIL)$/.test(upper)) {
        const isFail = upper.endsWith("FAIL");
        const suffixLen = isFail ? 4 : 4;
        const pre = token.slice(0, -suffixLen);
        
        // If the prefix is a merged credit and grade like "3O" or "4[e]"
        const matchMerged = pre.match(/^(\[?[0-4]\]?)([A-Za-z\+0\[\]\(\)\{\}]{1,3})$/i);
        if (matchMerged) {
          words.push({ text: matchMerged[1], confidence: item.confidence });
          words.push({ text: matchMerged[2], confidence: item.confidence });
        } else {
          words.push({ text: pre, confidence: item.confidence });
        }
        words.push({ text: isFail ? "FAIL" : "PASS", confidence: item.confidence });
        continue;
      }

      // Handle merged credit and grade: e.g. "4A+", "3O", "0O", "4[o]", "40"
      const matchMerged = token.match(/^(\[?[0-4]\]?)([A-Za-z\+0\[\]\(\)\{\}]{1,3})$/i);
      if (matchMerged && upper !== "PASS" && upper !== "FAIL") {
        words.push({ text: matchMerged[1], confidence: item.confidence });
        words.push({ text: matchMerged[2], confidence: item.confidence });
        continue;
      }

      words.push({ text: token, confidence: item.confidence });
    }
  }

  if (words.length < 2) return null;

  let gradeIdx = -1;
  let creditIdx = -1;
  let grade = null;
  let credits = null;

  // Walk from the right side
  for (let i = words.length - 1; i >= 0; i--) {
    const text = words[i].text.trim();

    // Skip PASS/FAIL at the rightmost edge
    if (/^(PASS|FAIL)$/i.test(text)) continue;

    // Try grade
    if (grade === null) {
      const g = matchGrade(text, scaleId, words[i].confidence);
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
  const subjectTokens = words
    .slice(0, subjectEnd)
    .map(w => w.text.trim())
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

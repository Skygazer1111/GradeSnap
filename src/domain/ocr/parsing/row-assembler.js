/**
 * @module row-assembler
 * Coordinates the OCR modules to parse text into structured subject rows.
 * This is the text-based fallback when spatial assembly isn't available.
 */

import { extractGradeFromEnd } from './grade-matcher.js';
import { extractCreditFromEnd } from './credit-matcher.js';
import { extractSubject } from './subject-extractor.js';

/**
 * Splits raw OCR text into processable segments.
 */
function segmentText(rawText) {
  if (!rawText) return [];
  const rawLines = rawText.split(/\r?\n/);
  const segments = [];
  for (const line of rawLines) {
    const cleaned = line.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    if (/\b(PASS|FAIL)\b/i.test(cleaned)) {
      const parts = cleaned.split(/\b(PASS|FAIL)\b/i);
      let currentSegment = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.toUpperCase() === 'PASS' || part.toUpperCase() === 'FAIL') {
          currentSegment += ' ' + part;
          segments.push(currentSegment.trim());
          currentSegment = '';
        } else {
          currentSegment += part;
        }
      }
      if (currentSegment.trim().length > 5) {
        segments.push(currentSegment.trim());
      }
    } else {
      segments.push(cleaned);
    }
  }
  return segments;
}

const HEADER_PATTERNS = [
  /^S\.?\s*NO\.?$/i,
  /^SEMESTER$/i,
  /^COURSE\s*CODE$/i,
  /^COURSE\s*DESCRIPTION$/i,
  /^CREDIT$/i,
  /^GRADE$/i,
  /^RESULT$/i,
  /^SUBJECT$/i,
  /^CREDITS$/i,
  /^CGPA$/i,
  /^SGPA$/i,
  /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*[-–]\s*\d{4}/i,
  /^[=+\-\s|]+$/,
  /^EE$/,
];

function isHeaderNoise(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (HEADER_PATTERNS.some(p => p.test(trimmed))) return true;
  const upper = trimmed.toUpperCase();
  if (upper.includes('COURSE DESCRIPTION') && upper.includes('CREDIT')) return true;
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
 * Assembles OCR text into parsed rows.
 * @param {string} text 
 * @param {string} scaleId 
 * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
 */
export function assembleRows(text, scaleId = '10') {
  const segments = segmentText(text);
  const rows = [];
  const seenSubjects = new Set();

  for (let line of segments) {
    if (isHeaderNoise(line)) continue;

    // We strip PASS/FAIL from the end before parsing grade
    let processLine = line.replace(/\s+(PASS|FAIL)\s*$/i, '').trim();
    if (processLine.length < 5) continue;

    const { grade, remaining: afterGrade } = extractGradeFromEnd(processLine, scaleId);
    
    // If no grade found, this might not be a subject line, but we can try to parse it anyway
    // However, usually we need a grade to consider it a row. Let's strictly require a grade for confidence.
    if (!grade) continue;

    const { credit, remaining: afterCredit } = extractCreditFromEnd(afterGrade);
    
    const subject = extractSubject(afterCredit);

    if (subject.length < 4) continue;

    // Deduplication check
    const key = `${subject.toUpperCase()}|${grade}`;
    if (seenSubjects.has(key)) continue;
    seenSubjects.add(key);

    rows.push({
      id: generateId(),
      subject,
      credits: credit !== null ? credit : 0,
      grade,
      flagged: credit === null || credit === 0
    });
  }

  return rows;
}

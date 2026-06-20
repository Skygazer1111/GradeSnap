/**
 * @module row-assembler
 * Coordinates the OCR modules to parse text into structured subject rows.
 * This is the text-based fallback when spatial assembly isn't available.
 */

import { extractGradeFromEnd, matchGrade } from './grade-matcher.js';
import { extractCreditFromEnd, matchCredit } from './credit-matcher.js';
import { extractSubject, COURSE_CODE_PATTERN } from './subject-extractor.js';
import {
  isMobileDataRow,
  isWrappedSubjectContinuation,
  isPortalChromeLine,
  isPortalChromeSubject,
} from './mobile-portal.js';

const COURSE_CODE_RE = new RegExp(COURSE_CODE_PATTERN, 'i');

function isLikelyGradeToken(text) {
  const cleaned = text.trim().replace(/[\[\]\(\)\{\}]/g, '');
  return cleaned.length > 0 && cleaned.length <= 3;
}

function isNumericCreditToken(text) {
  const cleaned = text.trim().replace(/[\[\]\(\)\{\}]/g, '');
  return /^\d+$/.test(cleaned);
}

/**
 * Finds grade and credit tokens anywhere in a mobile-portal row
 * (not only at the end — wrapped lines often place them before PASS).
 */
function extractGradeAndCreditFromTokens(tokens, scaleId = '10') {
  let grade = null;
  let credit = null;
  let gradeIdx = -1;
  let creditIdx = -1;

  // Audit row misread: "ANALYTICAL O O" — first O is credit 0, second is grade O
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    const prev = tokens[tokens.length - 2];
    const lastGrade = matchGrade(last, scaleId);
    const prevGrade = matchGrade(prev, scaleId);
    if (lastGrade && prevGrade && lastGrade === prevGrade) {
      return {
        grade: lastGrade,
        credit: 0,
        gradeIdx: tokens.length - 1,
        creditIdx: tokens.length - 2,
      };
    }
  }

  for (let i = tokens.length - 1; i >= 1; i--) {
    const gradeAfterCredit = matchGrade(tokens[i], scaleId);
    const creditBeforeGrade = matchCredit(tokens[i - 1]);
    if (gradeAfterCredit && creditBeforeGrade !== null) {
      grade = gradeAfterCredit;
      credit = creditBeforeGrade;
      gradeIdx = i;
      creditIdx = i - 1;
      break;
    }

    const creditAfterGrade = matchCredit(tokens[i]);
    const gradeBeforeCredit = matchGrade(tokens[i - 1], scaleId);
    if (creditAfterGrade !== null && gradeBeforeCredit) {
      credit = creditAfterGrade;
      grade = gradeBeforeCredit;
      creditIdx = i;
      gradeIdx = i - 1;
      break;
    }
  }

  if (!grade) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const text = tokens[i];
      if (/^(PASS|FAIL)$/i.test(text)) continue;

      if (grade === null && !isNumericCreditToken(text) && isLikelyGradeToken(text)) {
        const matched = matchGrade(text, scaleId);
        if (matched) {
          grade = matched;
          gradeIdx = i;
        }
      }

      if (credit === null && isNumericCreditToken(text)) {
        const matched = matchCredit(text);
        if (matched !== null) {
          credit = matched;
          creditIdx = i;
        }
      }

      if (grade && credit !== null) break;
    }
  }

  return { grade, credit, gradeIdx, creditIdx };
}

function rebuildMobileRow(tokens, continuation, scaleId = '10') {
  const { grade, credit, gradeIdx, creditIdx } = extractGradeAndCreditFromTokens(tokens, scaleId);
  if (!grade) return null;

  const usedIdx = new Set([gradeIdx, creditIdx].filter((idx) => idx >= 0));
  const subjectTokens = tokens.filter((_, idx) => !usedIdx.has(idx));
  const courseCode = subjectTokens.find((t) => COURSE_CODE_RE.test(t)) ?? '';
  const subjectOnly = subjectTokens.filter((t) => !COURSE_CODE_RE.test(t)).join(' ');
  const subjectPart = extractSubject(subjectOnly);
  const mergedSubject = `${subjectPart} ${continuation}`.replace(/\s+/g, ' ').trim();
  const creditPart = credit !== null ? String(credit) : '';

  if (courseCode) {
    return `${courseCode} ${mergedSubject} ${creditPart} ${grade} PASS`.replace(/\s+/g, ' ').trim();
  }
  return `${mergedSubject} ${creditPart} ${grade} PASS`.replace(/\s+/g, ' ').trim();
}

function appendMobileContinuation(anchorLine, continuation, scaleId = '10') {
  const trimmed = continuation.trim();
  if (!trimmed) return anchorLine;

  const withoutResult = anchorLine.replace(/\s+(PASS|FAIL)\s*$/i, '').trim();
  const rebuilt = rebuildMobileRow(withoutResult.split(/\s+/), trimmed, scaleId);
  if (rebuilt) return rebuilt;

  const { grade, remaining: afterGrade } = extractGradeFromEnd(withoutResult, scaleId);
  if (!grade) return `${anchorLine} ${trimmed}`;

  const { credit, remaining: afterCredit } = extractCreditFromEnd(afterGrade);
  const subjectPart = extractSubject(afterCredit);
  const creditPart = credit !== null ? ` ${credit}` : '';

  return `${subjectPart} ${trimmed}${creditPart} ${grade} PASS`;
}

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
  /sp\.srmist\.edu/i,
  /^program\b/i,
  /^institution\b/i,
  /disclaimer/i,
  /indicative purpose/i,
  /controller of examinations/i,
  /^\d{1,2}:\d{2}\b/,
  /^SRM\b/i,
  /^student\s+portal$/i,
  /^logout$/i,
];

function isHeaderNoise(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isPortalChromeLine(trimmed)) return true;
  if (HEADER_PATTERNS.some(p => p.test(trimmed))) return true;
  const upper = trimmed.toUpperCase();
  if (upper.includes('COURSE DESCRIPTION') && upper.includes('CREDIT')) return true;
  return false;
}

/**
 * Merges mobile-portal OCR lines where descriptions wrap onto the next line.
 */
export function mergeMobileTextLines(lines) {
  const merged = [];
  let buffer = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isHeaderNoise(trimmed)) continue;

    if (isMobileDataRow(trimmed)) {
      if (buffer) merged.push(buffer);
      buffer = trimmed;
      continue;
    }

    if (buffer && isWrappedSubjectContinuation(trimmed)) {
      buffer = appendMobileContinuation(buffer, trimmed);
    }
  }

  if (buffer) merged.push(buffer);
  return merged.length > 0 ? merged : lines;
}

export function shouldMergeMobileText(lines) {
  let anchors = 0;
  let continuations = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isHeaderNoise(trimmed)) continue;
    if (isMobileDataRow(trimmed)) anchors += 1;
    else if (isWrappedSubjectContinuation(trimmed)) continuations += 1;
  }

  return anchors >= 1 && continuations >= 1;
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
  const lines = shouldMergeMobileText(segments) ? mergeMobileTextLines(segments) : segments;
  const rows = [];
  const seenSubjects = new Set();

  for (let line of lines) {
    if (isHeaderNoise(line)) continue;

    // We strip PASS/FAIL from the end before parsing grade
    let processLine = line.replace(/\s+(PASS|FAIL)\s*$/i, '').trim();
    if (processLine.length < 5) continue;

    let grade = null;
    let credit = null;
    let subjectSource = processLine;

    const endGrade = extractGradeFromEnd(processLine, scaleId);
    if (endGrade.grade) {
      grade = endGrade.grade;
      const endCredit = extractCreditFromEnd(endGrade.remaining);
      credit = endCredit.credit;
      subjectSource = endCredit.remaining;
    } else {
      const tokens = processLine.split(/\s+/);
      const extracted = extractGradeAndCreditFromTokens(tokens, scaleId);
      if (extracted.grade) {
        grade = extracted.grade;
        credit = extracted.credit;
        const usedIdx = new Set([extracted.gradeIdx, extracted.creditIdx].filter((idx) => idx >= 0));
        subjectSource = tokens.filter((_, idx) => !usedIdx.has(idx)).join(' ');
      }
    }

    if (!grade) continue;

    const subject = extractSubject(subjectSource);

    if (subject.length < 4 || isPortalChromeSubject(subject)) continue;

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

/**
 * @module parser
 * @description Parses OCR text from university gradesheets into editable subject rows.
 */

import {
  GRADING_SCALES,
  getAvailableGrades,
  getGradePoints,
  normalizeGradeSymbol,
} from './grade-mapper.js';
import {
  applyOcrGradeCreditFixes,
  COURSE_CODE_PATTERN,
  COURSE_CODE_REGEX,
  extractCreditGradePair,
  isGradesheetDateNoise,
  isGradesheetHeaderNoise,
  normalizeOcrTextBlock,
  parseCreditValue,
  stripGradesheetDatePrefix,
} from './ocr-normalize.js';
import { rectifySubjects } from './rectifier.js';

export { GRADING_SCALES, getAvailableGrades, getGradePoints };

const GRADE_TAIL_TOKENS = 'A\\+|A-|B\\+|B-|C\\+|C-|D\\+|D-|Oo|\\[e\\]|\\[o\\]|\\[eo\\]|\\[lo\\]|\\(e\\]|\\(e\\}|O|A|B|C|D|F';
const GRADE_TOKENS = `${GRADE_TAIL_TOKENS}|P|S|E`;

const FULL_ROW_REGEX = new RegExp(
  String.raw`^\s*\d+\s+\d+\s+${COURSE_CODE_PATTERN}\s+(.+?)\s+(\d{1,2}|\[0\])\s+(${GRADE_TOKENS})\s*(?:PASS|FAIL)?\s*$`,
  'i'
);

const COURSE_ROW_REGEX = new RegExp(
  String.raw`${COURSE_CODE_PATTERN}\s+(.+?)\s+(\d{1,2}|\[0\]|0)\s+(${GRADE_TAIL_TOKENS}|Oo|\[0\])\s*(?:PASS|FAIL)?`,
  'gi'
);

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
  /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*[-–]\s*\d{4}$/i,
  /^[=+\-\s]+$/,
  /^EE$/,
];

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

function normalizeGrade(rawGrade) {
  return normalizeGradeSymbol(rawGrade);
}

function parseCredits(rawCredits) {
  return parseCreditValue(rawCredits);
}

function extractCreditGradeTail(beforePass) {
  const pair = extractCreditGradePair(beforePass);
  if (!pair) return null;

  const idx = beforePass.search(
    new RegExp(`\\b${pair.credits === 0 ? '\\[0\\]' : pair.credits}\\s+`, 'i')
  );

  return {
    credits: pair.credits,
    grade: normalizeGrade(pair.grade),
    beforeCredits: idx >= 0 ? beforePass.slice(0, idx).trim() : beforePass,
  };
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const subject = typeof entry.subject === 'string' ? entry.subject.trim() : '';
  if (!subject || isGradesheetDateNoise(subject) || isGradesheetHeaderNoise(subject)) {
    return null;
  }

  let credits = entry.credits;
  let flagged = Boolean(entry.flagged);

  if (credits === null || credits === undefined || credits === '' || Number.isNaN(Number(credits))) {
    credits = 0;
    flagged = true;
  } else {
    credits = Math.round(Number(credits));
    if (credits < 0) {
      credits = 0;
      flagged = true;
    }
  }

  if (credits === 0) flagged = true;

  const grade = normalizeGrade(entry.grade || '');
  if (!grade) return null;

  return {
    id: generateId(),
    subject,
    credits,
    grade,
    flagged,
  };
}

function cleanSubjectName(subject) {
  // Find all letter+space phrases ≥9 chars (case-insensitive to handle OCR noise
  // like "DESiGN AND ANALYSIS oF ALGORITHMS"), then pick the longest one.
  const allPhrases = [...subject.matchAll(/[A-Za-z][A-Za-z\s&]{8,}/g)];
  const best = allPhrases.length > 0
    ? allPhrases.reduce((a, b) => a[0].length >= b[0].length ? a : b)[0]
    : subject;

  return best
    .toUpperCase()
    .replace(/^\d+[\).\s-]+/, '')
    .replace(new RegExp(COURSE_CODE_PATTERN, 'gi'), '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\bPASS\b|\bFAIL\b/gi, '')
    .replace(/[|·•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Strip trailing short tokens that are grade/credit noise (e.g. "... PA O" or "... 3 A+")
    .replace(/(?:\s+(?:PA|OO|O|A\+?|B\+?|C\+?|D\+?|F|U|RA|\d{1,2})(?=\s|$)){1,3}\s*$/i, '')
    .trim();
}

function isHeaderLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (HEADER_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  const upper = trimmed.toUpperCase();
  if (upper.includes('COURSE DESCRIPTION') && upper.includes('CREDIT')) return true;
  return false;
}

function normalizeOcrLine(line) {
  const stripped = stripGradesheetDatePrefix(line);
  if (isGradesheetHeaderNoise(stripped)) return '';
  return applyOcrGradeCreditFixes(stripped).replace(/\s+/g, ' ').trim();
}

/**
 * Parses rows by anchoring on PASS/FAIL, which survives noisy OCR spacing.
 */
function parsePassAnchoredRows(lines) {
  const parsed = [];

  for (const rawLine of lines) {
    const line = normalizeOcrLine(rawLine);
    if (!line) continue;
    if (!/\bPASS\b|\bFAIL\b/i.test(line)) continue;

    const passMatch = line.match(/\b(PASS|FAIL)\b/i);
    if (!passMatch || passMatch.index === undefined) continue;

    const beforePass = line.slice(0, passMatch.index).trim();
    const tail = extractCreditGradeTail(beforePass);
    if (!tail) continue;

    const { credits, grade, beforeCredits } = tail;
    let flagged = false;

    const codeMatch = beforeCredits.match(COURSE_CODE_REGEX);
    let subject = beforeCredits;

    if (codeMatch && codeMatch.index !== undefined) {
      subject = beforeCredits.slice(codeMatch.index + codeMatch[0].length).trim();
    }

    subject = subject
      .replace(/^\d+\s+\d+\s+/, '')
      .replace(/^\d+\s+/, '')
      .replace(/^[a-z]{2,}\s+\d+\s+/i, '');

    subject = cleanSubjectName(subject);

    if (subject.length < 4) {
      const phraseMatch = beforeCredits.match(/[A-Z][A-Z\s&]{6,}/);
      if (phraseMatch) subject = cleanSubjectName(phraseMatch[0]);
    }

    if (subject.length < 4) continue;

    parsed.push({
      subject,
      credits,
      grade,
      flagged,
    });
  }

  return parsed;
}

function parseStructuredRows(lines) {
  const parsed = [];

  for (const rawLine of lines) {
    const line = normalizeOcrLine(rawLine);
    if (isHeaderLine(line)) continue;

    const fullMatch = line.match(FULL_ROW_REGEX);
    if (fullMatch) {
      parsed.push({
        subject: cleanSubjectName(fullMatch[1]),
        credits: parseCredits(fullMatch[2]) ?? 0,
        grade: normalizeGrade(fullMatch[3]),
      });
    }
  }

  return parsed;
}

function parseByCourseCodes(text) {
  const parsed = [];
  COURSE_ROW_REGEX.lastIndex = 0;
  let match;

  while ((match = COURSE_ROW_REGEX.exec(text)) !== null) {
    const subject = cleanSubjectName(match[1]);
    if (subject.length < 3) continue;

    parsed.push({
      subject,
      credits: parseCredits(match[2]) ?? 0,
      grade: normalizeGrade(match[3]),
      flagged: parseCredits(match[2]) === null,
    });
  }

  return parsed;
}

/**
 * Splits OCR text on PASS markers so rows still parse when newlines are lost.
 */
function parseByPassSegments(text) {
  const parsed = [];
  const segments = text.split(/\bPASS\b/i);

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (segment.trim().length < 12) continue;

    const rowLine = `${normalizeOcrLine(segment)} PASS`;
    parsed.push(...parsePassAnchoredRows([rowLine]));
  }

  return parsed;
}

function parseGenericLines(lines) {
  const gradeRegex = new RegExp(`\\b(${GRADE_TOKENS}|Oo)\\b`, 'i');
  const parsed = [];

  for (const line of lines) {
    if (isHeaderLine(line)) continue;

    const gradeMatch = line.match(gradeRegex);
    if (!gradeMatch) continue;

    const grade = normalizeGrade(gradeMatch[1]);
    const beforeGrade = line.slice(0, gradeMatch.index).trim();
    const creditMatch = beforeGrade.match(/(\d{1,2})\s*$/);

    let credits = 0;
    let subject = beforeGrade;

    if (creditMatch) {
      credits = Number(creditMatch[1]);
      subject = beforeGrade.slice(0, creditMatch.index).trim();
    }

    subject = cleanSubjectName(subject);
    if (subject.length < 2) continue;

    parsed.push({ subject, credits, grade });
  }

  return parsed;
}

function dedupeSubjects(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.subject.toUpperCase()}|${entry.credits}|${entry.grade}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreEntry(entry) {
  let score = 0;
  if (entry.subject.length >= 8) score += 2;
  if (entry.credits > 0) score += 5;
  else if (entry.credits === 0 && entry.flagged) score += 1;
  if (entry.grade && entry.grade !== 'P') score += 2;
  if (!entry.flagged) score += 2;
  return score;
}

function pickBestEntries(groups) {
  const bySubject = new Map();

  for (const entry of groups) {
    const key = cleanSubjectName(entry.subject).toUpperCase();
    if (!key || key.length < 4) continue;
    const existing = bySubject.get(key);
    if (!existing) {
      bySubject.set(key, entry);
      continue;
    }

    const existingScore = scoreEntry(existing);
    const newScore = scoreEntry(entry);

    // Prefer the entry from a PASS-anchored strategy (has explicit grade from the source line)
    // over a generic/fallback strategy when scores are close.
    if (newScore > existingScore) {
      bySubject.set(key, entry);
    }
  }

  return [...bySubject.values()];
}

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

  const normalizedText = normalizeOcrTextBlock(rawText);

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const strategies = [
    () => parseStructuredRows(lines),
    () => parsePassAnchoredRows(lines),
    () => parseByPassSegments(normalizedText),
    () => parseByCourseCodes(normalizedText),
  ];

  let rawEntries = [];
  for (const strategy of strategies) {
    rawEntries.push(...strategy());
  }

  rawEntries = dedupeSubjects(rawEntries);
  rawEntries = pickBestEntries(rawEntries);

  if (rawEntries.length < 3) {
    const fallback = parseGenericLines(lines);
    rawEntries = pickBestEntries(dedupeSubjects([...rawEntries, ...fallback]));
  }

  const validated = rectifySubjects(
    rawEntries
      .map((entry) => normalizeEntry(entry))
      .filter(Boolean),
    rawText,
    '10'
  );

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

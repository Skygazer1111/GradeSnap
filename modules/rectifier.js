/**
 * @module rectifier
 * @description Post-OCR rectifier for VIT/SRM-style gradesheet rows.
 * Uses table structure (course code, credit, grade, PASS) to fix parser mistakes.
 */

import { normalizeGradeSymbol, resolveGrade } from './grade-mapper.js';
import {
  COURSE_CODE_REGEX,
  COURSE_CODE_PATTERN,
  applyOcrGradeCreditFixes,
  extractCreditGradePair,
  isGradesheetDateNoise,
  isGradesheetHeaderNoise,
  parseCreditValue,
  stripGradesheetDatePrefix,
} from './ocr-normalize.js';

const VALID_CREDITS = new Set([0, 2, 3, 4]);
const AUDIT_SUBJECT_RE =
  /ANALYTICAL|LOGICAL\s+THINKING|THINKING\s+SKILLS|AUDIT|NON[\s-]?CREDIT/i;

const SUBJECT_NOISE_RE =
  /\b(PASS|FAIL|RESULT|CREDIT|GRADE|SEMESTER)\b|[()[\]{}|·•]+/gi;

const HEADER_SUBJECT_RE =
  /COURSE\s*CODE|COURSE\s*DESCRIPTION|S\.?\s*NO|SEMESTER|CREDIT|GRADE|RESULT|^EE$/i;

/**
 * @typedef {Object} OcrRowAnchor
 * @property {string} courseCode
 * @property {string} subjectHint
 * @property {number|null} credits
 * @property {string} grade
 * @property {string} rawLine
 */

/**
 * @param {string} subject
 * @returns {boolean}
 */
export function isValidSubjectRow(subject) {
  const cleaned = cleanSubjectLabel(subject);
  if (!cleaned || cleaned.length < 6) return false;
  if (isGradesheetDateNoise(cleaned) || isGradesheetHeaderNoise(cleaned)) return false;
  if (HEADER_SUBJECT_RE.test(cleaned)) return false;
  if (!/[A-Z]{3,}/i.test(cleaned)) return false;
  return true;
}

export function isAuditSubject(subject) {
  return AUDIT_SUBJECT_RE.test(subject || '');
}

/**
 * @param {string} subject
 * @returns {string}
 */
export function cleanSubjectLabel(subject) {
  if (!subject) return '';

  let cleaned = subject
    .replace(new RegExp(COURSE_CODE_PATTERN, 'gi'), '')
    .replace(SUBJECT_NOISE_RE, ' ')
    .replace(/^\d+\s+\d+\s+/, '')
    .replace(/^\d+\s+/, '')
    .replace(/^[A-Z]\s+(?=[A-Z])/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Case-insensitive phrase matching, pick the longest
  const allPhrases = [...cleaned.matchAll(/[A-Za-z][A-Za-z\s&]{6,}/g)];
  if (allPhrases.length > 0) {
    cleaned = allPhrases.reduce((a, b) => a[0].length >= b[0].length ? a : b)[0].trim();
  }

  return cleaned
    .toUpperCase()
    .replace(/(?:\s+(?:PA|OO|O|A\+?|B\+?|C\+?|D\+?|F|U|RA|\d{1,2})(?=\s|$)){1,3}\s*$/i, '')
    .trim();
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function subjectSimilarity(a, b) {
  const left = cleanSubjectLabel(a).toUpperCase();
  const right = cleanSubjectLabel(b).toUpperCase();
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.85;

  const leftTokens = new Set(left.split(/\s+/).filter((t) => t.length > 2));
  const rightTokens = right.split(/\s+/).filter((t) => t.length > 2);
  if (!rightTokens.length) return 0;

  let overlap = 0;
  for (const token of rightTokens) {
    if (leftTokens.has(token)) overlap += 1;
  }

  const rawOverlap = overlap / rightTokens.length;

  // Penalize when token counts differ significantly — prevents false matches
  // between subjects sharing common short words (e.g. "DESIGN AND ANALYSIS"
  // vs "DESIGN THINKING AND METHODOLOGY").
  const totalUnique = new Set([...leftTokens, ...rightTokens]).size;
  const unionPenalty = totalUnique > 0 ? overlap / totalUnique : 0;

  // Blend: require both high overlap ratio AND high Jaccard similarity
  return (rawOverlap * 0.5) + (unionPenalty * 0.5);
}

/**
 * Scan raw OCR for authoritative row anchors using known table layout.
 *
 * @param {string} rawOcrText
 * @returns {OcrRowAnchor[]}
 */
export function buildOcrRowAnchors(rawOcrText) {
  if (!rawOcrText) return [];

  const anchors = [];
  const lines = rawOcrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const rawLine of lines) {
    const line = applyOcrGradeCreditFixes(stripGradesheetDatePrefix(rawLine))
      .replace(/\s+/g, ' ')
      .trim();
    if (!line || isGradesheetHeaderNoise(line)) continue;
    if (!/\bPASS\b|\bFAIL\b/i.test(line)) continue;

    const passIdx = line.search(/\b(PASS|FAIL)\b/i);
    if (passIdx < 0) continue;

    const beforePass = line.slice(0, passIdx).trim();
    const codeMatch = beforePass.match(COURSE_CODE_REGEX);
    const pair = extractCreditGradePair(beforePass);
    if (!codeMatch && !pair) continue;

    let grade = pair ? normalizeGradeSymbol(pair.grade) : '';
    // Fallback: extract grade directly when credit parsing failed but course code exists
    if (!grade && codeMatch) {
      const gradeOnly = beforePass.match(/\b(A\+|A-|B\+|B-|C\+|C-|D\+|D-|Oo|O|A|B|C|D|F)\s*$/i);
      if (gradeOnly) grade = normalizeGradeSymbol(gradeOnly[1]);
    }

    let subjectHint = beforePass;
    if (codeMatch?.index !== undefined) {
      subjectHint = beforePass.slice(codeMatch.index + codeMatch[0].length).trim();
    }

    subjectHint = cleanSubjectLabel(subjectHint);
    if (!subjectHint || isGradesheetDateNoise(subjectHint)) continue;

    anchors.push({
      courseCode: codeMatch ? codeMatch[0].toUpperCase() : '',
      subjectHint,
      credits: pair ? pair.credits : null,
      grade,
      rawLine: line,
    });
  }

  return anchors;
}

/**
 * @param {{subject: string, credits: number, grade: string}} entry
 * @param {OcrRowAnchor[]} anchors
 * @returns {OcrRowAnchor|null}
 */
function findBestAnchor(entry, anchors) {
  let best = null;
  let bestScore = 0;

  const subject = entry.subject || '';
  const upperSubject = subject.toUpperCase();

  for (const anchor of anchors) {
    let score = subjectSimilarity(subject, anchor.subjectHint);

    if (anchor.courseCode && upperSubject.includes(anchor.courseCode)) {
      score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      best = anchor;
    }
  }

  return bestScore >= 0.45 ? best : null;
}

/**
 * @param {string} grade
 * @param {string} scaleId
 * @returns {string}
 */
function rectifyGrade(grade, scaleId) {
  let canonical = normalizeGradeSymbol(grade);

  if (canonical === 'P') {
    canonical = 'O';
  }

  if (!resolveGrade(canonical, scaleId).recognized && canonical.length === 1) {
    const ocrRetry = normalizeGradeSymbol(grade.replace(/[^A-Za-z0-9+\[\]()]/g, ''));
    if (resolveGrade(ocrRetry, scaleId).recognized) {
      canonical = ocrRetry;
    }
  }

  return canonical;
}

/**
 * @param {number} credits
 * @param {string} subject
 * @param {OcrRowAnchor|null} anchor
 * @returns {{ credits: number, flagged: boolean, rectified: boolean }}
 */
function rectifyCredits(credits, subject, anchor) {
  const audit = isAuditSubject(subject);
  let value = parseCreditValue(credits);
  let rectified = false;

  if (value === null) value = 0;

  const anchorCredits =
    anchor?.credits !== null && anchor?.credits !== undefined
      ? anchor.credits
      : null;

  if (audit) {
    return { credits: 0, flagged: true, rectified: value !== 0 };
  }

  if (value === 0) {
    if (anchorCredits !== null && anchorCredits > 0) {
      return { credits: anchorCredits, flagged: false, rectified: true };
    }
    return { credits: 0, flagged: true, rectified: false };
  }

  if (!VALID_CREDITS.has(value)) {
    if (anchorCredits !== null && anchorCredits > 0) {
      return { credits: anchorCredits, flagged: false, rectified: true };
    }
    return { credits: 3, flagged: false, rectified: true };
  }

  if (anchorCredits !== null && anchorCredits > 0 && value !== anchorCredits) {
    const likelyOcrConfusion =
      value === 0 ||
      (value === 3 && anchorCredits === 2) ||
      (value === 2 && anchorCredits === 3);

    if (likelyOcrConfusion) {
      return { credits: anchorCredits, flagged: false, rectified: true };
    }
  }

  return { credits: value, flagged: false, rectified: false };
}

/**
 * Rectify a single parsed row using OCR anchors and table rules.
 *
 * @param {Object} entry
 * @param {OcrRowAnchor[]} anchors
 * @param {string} scaleId
 * @returns {Object}
 */
export function rectifySubjectRow(entry, anchors, scaleId = '10') {
  const anchor = findBestAnchor(entry, anchors);
  const subject = cleanSubjectLabel(entry.subject);
  const gradeFromAnchor = anchor?.grade ? rectifyGrade(anchor.grade, scaleId) : '';
  const grade = rectifyGrade(
    resolveGrade(entry.grade, scaleId).recognized ? entry.grade : gradeFromAnchor || entry.grade,
    scaleId
  );

  const creditFix = rectifyCredits(entry.credits, subject, anchor);
  const corrections = [];

  if (subject !== entry.subject) corrections.push('subject');
  if (grade !== normalizeGradeSymbol(entry.grade)) corrections.push('grade');
  if (creditFix.rectified) corrections.push('credits');

  return {
    ...entry,
    subject: subject || entry.subject,
    credits: creditFix.credits,
    grade,
    flagged: creditFix.flagged,
    rectified: corrections.length > 0,
    corrections,
    anchorCourseCode: anchor?.courseCode || null,
  };
}

/**
 * Rectify all parsed subjects and drop empty duplicates.
 *
 * @param {Array<Object>} entries
 * @param {string} [rawOcrText]
 * @param {string} [scaleId='10']
 * @returns {Array<Object>}
 */
export function rectifySubjects(entries, rawOcrText = '', scaleId = '10') {
  if (!Array.isArray(entries) || entries.length === 0) {
    // Even with no parsed entries, try to recover from anchors
    const anchors = buildOcrRowAnchors(rawOcrText);
    return recoverMissingFromAnchors([], anchors, scaleId);
  }

  const anchors = buildOcrRowAnchors(rawOcrText);
  const rectified = entries
    .map((entry) => rectifySubjectRow(entry, anchors, scaleId))
    .filter(
      (entry) =>
        isValidSubjectRow(entry.subject) &&
        resolveGrade(entry.grade, scaleId).recognized
    );

  const bySubject = new Map();
  for (const row of rectified) {
    const key = cleanSubjectLabel(row.subject).toUpperCase();
    const existing = bySubject.get(key);

    if (!existing) {
      bySubject.set(key, row);
      continue;
    }

    const existingScore =
      (existing.credits > 0 ? 2 : 0) + (existing.rectified ? 0 : 1);
    const rowScore = (row.credits > 0 ? 2 : 0) + (row.rectified ? 0 : 1);

    if (rowScore > existingScore) {
      bySubject.set(key, row);
    }
  }

  // Recover subjects that anchors found but the parser missed entirely
  const result = [...bySubject.values()];
  return recoverMissingFromAnchors(result, anchors, scaleId);
}

/**
 * Recover subjects from OCR anchors that were not matched by any parsed entry.
 * This rescues rows that the parser dropped due to noisy text.
 *
 * @param {Array<Object>} existing - Already-rectified entries.
 * @param {OcrRowAnchor[]} anchors - Anchors built from raw OCR text.
 * @param {string} scaleId
 * @returns {Array<Object>}
 */
function recoverMissingFromAnchors(existing, anchors, scaleId) {
  if (!anchors || anchors.length === 0) return existing;

  const existingKeys = new Set(
    existing.map((e) => cleanSubjectLabel(e.subject).toUpperCase())
  );

  for (const anchor of anchors) {
    if (!anchor.subjectHint || !anchor.grade) continue;

    const anchorKey = cleanSubjectLabel(anchor.subjectHint).toUpperCase();
    if (!anchorKey || anchorKey.length < 6) continue;

    // Check if this anchor already matches an existing entry
    let matched = existingKeys.has(anchorKey);
    if (!matched) {
      // Also check via similarity in case of slight name differences
      for (const existingKey of existingKeys) {
        if (subjectSimilarity(anchorKey, existingKey) >= 0.65) {
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    // This anchor has no matching parsed entry — recover it
    const grade = normalizeGradeSymbol(anchor.grade);
    if (!resolveGrade(grade, scaleId).recognized) continue;
    if (!isValidSubjectRow(anchorKey)) continue;

    const credits = anchor.credits !== null && anchor.credits !== undefined
      ? anchor.credits
      : 0;
    const audit = isAuditSubject(anchorKey);

    existing.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `recovered-${Date.now()}-${Math.random()}`,
      subject: anchorKey,
      credits: audit ? 0 : credits,
      grade,
      flagged: audit || credits === 0,
      rectified: true,
      corrections: ['recovered-from-anchor'],
      anchorCourseCode: anchor.courseCode || null,
    });

    existingKeys.add(anchorKey);
  }

  return existing;
}

/**
 * Shared heuristics for SRM mobile-portal screenshots (with or without course codes).
 */

import { COURSE_CODE_PATTERN } from './subject-extractor.js';

const COURSE_CODE_RE = new RegExp(COURSE_CODE_PATTERN, 'i');

const GRADE_TAIL_RE =
  /(?:[Oo0]\]?|[Aa]\+?|[Bb]\+?|[Cc]|[Pp]|[Ff])\s*(?:PASS|FAIL)?\s*$/i;

/** Row anchor: course code present, or a subject fragment followed by credit + grade. */
export function isMobileDataRow(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (COURSE_CODE_RE.test(trimmed)) return true;

  if (/\b[0-4]\s+/.test(trimmed) && GRADE_TAIL_RE.test(trimmed)) return true;

  // Misread zero-credit audit rows: "ANALYTICAL O O" or "ANALYTICAL o 0 PASS"
  if (/\b(?:[Oo]\s+[Oo]|[Oo]\s+0|0\s+[Oo])\b/i.test(trimmed)) return true;

  return false;
}

export function isWrappedSubjectContinuation(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[a-z]/.test(trimmed) || /[:;]/.test(trimmed)) return false;
  if (!/^[A-Z][A-Z\s&-]{0,}$/.test(trimmed)) return false;
  if (/^(SRM|LOGOUT|STUDENT\s+PORTAL)$/i.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 4;
}

export function isPortalChromeLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^SRM\b/i.test(trimmed) && /logout/i.test(trimmed)) return true;
  if (/^student\s+portal$/i.test(trimmed)) return true;
  if (/^(SRM|C|LOGOUT|=|\s*)$/i.test(trimmed)) return true;
  return false;
}

export function isPortalChromeSubject(subject) {
  const upper = (subject || '').toUpperCase().trim();
  if (!upper || upper.length < 4) return true;
  if (/^(SRM|LOGOUT|STUDENT PORTAL)/.test(upper)) return true;
  if (/^(SRM\s+LOGOUT|STUDENT PORTAL)/.test(upper)) return true;
  return false;
}

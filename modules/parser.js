/**
 * @module parser
 * @description Parses OCR text from university gradesheets into editable subject rows.
 */

export const GRADING_SCALES = {
  '10': {
    name: '10-Point (Indian)',
    maxPoints: 10,
    grades: {
      'O': 10,
      'A+': 9,
      'A': 8,
      'B+': 7,
      'B': 6,
      'C': 5,
      'P': 4,
      'F': 0,
      'S': 10,
      'D': 4,
      'E': 0,
    },
  },
  '4': {
    name: '4-Point (US)',
    maxPoints: 4,
    grades: {
      'A+': 4.0,
      'A': 4.0,
      'A-': 3.7,
      'B+': 3.3,
      'B': 3.0,
      'B-': 2.7,
      'C+': 2.3,
      'C': 2.0,
      'C-': 1.7,
      'D+': 1.3,
      'D': 1.0,
      'D-': 0.7,
      'F': 0.0,
    },
  },
};

const GRADE_TOKENS = 'A\\+|A-|B\\+|B-|C\\+|C-|D\\+|D-|O|A|B|C|D|P|S|E|F|\\[e\\]|\\[o\\]|Oo';
const COURSE_CODE_PATTERN = '2[1Iil][A-Za-z]{3,4}\\d{3}[A-Za-z)]?';
const COURSE_CODE_REGEX = new RegExp(COURSE_CODE_PATTERN, 'i');

const FULL_ROW_REGEX = new RegExp(
  String.raw`^\s*\d+\s+\d+\s+${COURSE_CODE_PATTERN}\s+(.+?)\s+(\d{1,2})\s+(${GRADE_TOKENS})\s*(?:PASS|FAIL)?\s*$`,
  'i'
);

const COURSE_ROW_REGEX = new RegExp(
  String.raw`${COURSE_CODE_PATTERN}\s+(.+?)\s+(\d{1,2}|\[o\]|0)\s+(${GRADE_TOKENS}|Oo)\s*(?:PASS|FAIL)?`,
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
  const cleaned = rawGrade.trim().toUpperCase();
  if (cleaned === 'OO' || cleaned === '0O' || cleaned === '[E]' || cleaned === '[O]' || cleaned === '0') {
    return 'O';
  }
  return cleaned;
}

function parseCredits(rawCredits) {
  if (rawCredits === undefined || rawCredits === null) return null;
  const value = String(rawCredits).trim().toLowerCase();
  if (value === '[o]' || value === 'o') return 0;
  const num = Number(value);
  return Number.isNaN(num) ? null : Math.round(num);
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const subject = typeof entry.subject === 'string' ? entry.subject.trim() : '';
  if (!subject) return null;

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
  const upperPhrase = subject.match(/[A-Z][A-Z\s&]{8,}/);
  const base = upperPhrase ? upperPhrase[0] : subject;

  return base
    .replace(/^\d+[\).\s-]+/, '')
    .replace(new RegExp(COURSE_CODE_PATTERN, 'gi'), '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\bPASS\b|\bFAIL\b/gi, '')
    .replace(/[|·•]+/g, ' ')
    .replace(/\s+/g, ' ')
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
  return line
    .replace(/\[o\]/gi, ' 0 ')
    .replace(/\[0\]/gi, ' 0 ')
    .replace(/\[e\]/gi, ' O ')
    .replace(/\boO\b/g, ' O ')
    .replace(/\bOo\b/g, ' O ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses rows by anchoring on PASS/FAIL, which survives noisy OCR spacing.
 */
function parsePassAnchoredRows(lines) {
  const parsed = [];

  for (const rawLine of lines) {
    const line = normalizeOcrLine(rawLine);
    if (!/\bPASS\b|\bFAIL\b/i.test(line)) continue;

    const passMatch = line.match(/\b(PASS|FAIL)\b/i);
    if (!passMatch || passMatch.index === undefined) continue;

    const beforePass = line.slice(0, passMatch.index).trim();
    const gradeMatch = beforePass.match(
      new RegExp(`\\b(${GRADE_TOKENS}|Oo)\\s*$`, 'i')
    );
    if (!gradeMatch || gradeMatch.index === undefined) continue;

    const grade = normalizeGrade(gradeMatch[1]);
    const beforeGrade = beforePass.slice(0, gradeMatch.index).trim();

    const creditMatch = beforeGrade.match(/(\d{1,2}|0)\s*$/);
    let credits = null;
    let beforeCredits = beforeGrade;

    if (creditMatch) {
      credits = parseCredits(creditMatch[1]);
      beforeCredits = beforeGrade.slice(0, creditMatch.index).trim();
    }

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

    let flagged = credits === null;
    const creditGradeMatch = line.match(
      new RegExp(
        `${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+.*?(\\d{1,2})\\s+(${GRADE_TOKENS}|Oo)\\s+PASS`,
        'i'
      )
    );

    if (creditGradeMatch) {
      credits = parseCredits(creditGradeMatch[1]);
      flagged = false;
    }

    parsed.push({
      subject,
      credits: credits ?? 0,
      grade,
      flagged,
    });
  }

  return parsed;
}

function parseStructuredRows(lines) {
  const parsed = [];

  for (const line of lines) {
    if (isHeaderLine(line)) continue;

    const fullMatch = line.match(FULL_ROW_REGEX);
    if (fullMatch) {
      parsed.push({
        subject: cleanSubjectName(fullMatch[1]),
        credits: Number(fullMatch[2]),
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
  if (entry.credits !== null && entry.credits !== undefined) score += 1;
  if (!entry.flagged) score += 1;
  return score;
}

function pickBestEntries(groups) {
  const bySubject = new Map();

  for (const entry of groups) {
    const key = entry.subject.toUpperCase();
    const existing = bySubject.get(key);
    if (!existing || scoreEntry(entry) > scoreEntry(existing)) {
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

  const normalizedText = rawText
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\[o\]/gi, ' 0 ')
    .replace(/\[0\]/gi, ' 0 ')
    .replace(/\[e\]/gi, ' O ')
    .replace(/\boO\b/g, ' O ')
    .replace(/\bOo\b/g, ' O ')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

  const validated = rawEntries
    .map((entry) => normalizeEntry(entry))
    .filter(Boolean);

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

export function getGradePoints(grade, scaleId) {
  const scale = GRADING_SCALES[scaleId];
  if (!scale) return null;

  const normalized = grade.toUpperCase().trim();
  if (normalized in scale.grades) return scale.grades[normalized];

  return null;
}

export function getAvailableGrades(scaleId) {
  const scale = GRADING_SCALES[scaleId];
  if (!scale) return [];
  return Object.keys(scale.grades);
}

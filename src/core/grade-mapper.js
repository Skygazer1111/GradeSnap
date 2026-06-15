/**
 * @module grade-mapper
 * @description Grade normalization and point mapping intermediary.
 * Maps OCR/table grades to canonical symbols and SRM-style grade points
 * before CGPA calculation.
 */

export const GRADING_SCALES = {
  '10': {
    name: 'SRM 10-Point (Indian)',
    maxPoints: 10,
    grades: {
      O: 10,
      'A+': 9,
      A: 8,
      'B+': 7,
      B: 6,
      C: 5,
      U: 0,
      RA: 0,
      F: 0,
    },
  },
  '4': {
    name: '4-Point (US)',
    maxPoints: 4,
    grades: {
      'A+': 4.0,
      A: 4.0,
      'A-': 3.7,
      'B+': 3.3,
      B: 3.0,
      'B-': 2.7,
      'C+': 2.3,
      C: 2.0,
      'C-': 1.7,
      'D+': 1.3,
      D: 1.0,
      'D-': 0.7,
      F: 0.0,
    },
  },
};

const FAIL_GRADES = new Set(['F', 'U', 'RA']);

/** OCR noise and aliases → canonical grade symbols. */
const GRADE_ALIASES = {
  OO: 'O',
  '0O': 'O',
  '[E]': 'O',
  '[O]': 'O',
  '[0]': 'O',
  '[LO]': 'O',
  '[EO]': 'O',
  '[o]': 'O',
  '[LO]': 'O',
  'LO)': 'O',
  '(E]': 'O',
  '(E}': 'O',
  '(e]': 'O',
  '(e}': 'O',
  '(O]': 'O',
  '(O}': 'O',
  '(o]': 'O',
  '(o}': 'O',
  '0': 'O',
  '(0)': 'O',
  'S': 'O',
  '[S]': 'O',
  '[s]': 'O',
  '(S]': 'O',
  '(S}': 'O',
  '(s]': 'O',
  '(s}': 'O',
};

/**
 * Normalizes a raw grade token (including OCR noise) to a canonical symbol.
 *
 * @param {string} rawGrade
 * @returns {string}
 */
export function normalizeGradeSymbol(rawGrade) {
  if (rawGrade === undefined || rawGrade === null) return '';
  const cleaned = String(rawGrade).trim().toUpperCase();
  if (!cleaned) return '';
  return GRADE_ALIASES[cleaned] ?? cleaned;
}

/**
 * Resolves a grade to its canonical symbol and point value on a scale.
 *
 * @param {string} rawGrade
 * @param {string} scaleId
 * @returns {{
 *   canonicalGrade: string,
 *   points: number|null,
 *   recognized: boolean,
 *   isPassing: boolean,
 *   isFail: boolean
 * }}
 */
export function resolveGrade(rawGrade, scaleId) {
  const canonicalGrade = normalizeGradeSymbol(rawGrade);
  const scale = GRADING_SCALES[scaleId];

  if (!scale || !canonicalGrade) {
    return {
      canonicalGrade,
      points: null,
      recognized: false,
      isPassing: false,
      isFail: false,
    };
  }

  const points = Object.prototype.hasOwnProperty.call(scale.grades, canonicalGrade)
    ? scale.grades[canonicalGrade]
    : null;

  const isFail = FAIL_GRADES.has(canonicalGrade);

  return {
    canonicalGrade,
    points,
    recognized: points !== null,
    isPassing: points !== null && points > 0,
    isFail,
  };
}

/**
 * @param {string} rawGrade
 * @param {string} scaleId
 * @returns {number|null}
 */
export function getGradePoints(rawGrade, scaleId) {
  return resolveGrade(rawGrade, scaleId).points;
}

/**
 * @param {string} scaleId
 * @returns {string[]}
 */
export function getAvailableGrades(scaleId) {
  const scale = GRADING_SCALES[scaleId];
  if (!scale) return [];
  return Object.keys(scale.grades);
}

/**
 * Quality points for one subject: credits × grade point.
 *
 * @param {number} credits
 * @param {number} gradePoints
 * @returns {number}
 */
export function computeQualityPoints(credits, gradePoints) {
  return Math.round(credits) * gradePoints;
}

/**
 * Maps one subject row through the grade intermediary for CGPA calculation.
 *
 * @param {{subject: string, credits: number, grade: string, flagged?: boolean}} entry
 * @param {string} scaleId
 */
export function mapSubjectForCalculation(entry, scaleId) {
  const subject = typeof entry.subject === 'string' ? entry.subject.trim() : '';
  const credits = Math.round(Number(entry.credits));
  const resolved = resolveGrade(entry.grade, scaleId);

  let excluded = false;
  let excludedReason = null;

  if (!subject) {
    excluded = true;
    excludedReason = 'empty-subject';
  } else if (Number.isNaN(credits) || credits <= 0) {
    excluded = true;
    excludedReason = 'zero-credits';
  }

  const qualityPoints =
    !excluded && resolved.recognized
      ? computeQualityPoints(credits, resolved.points)
      : 0;

  return {
    subject,
    credits: Number.isNaN(credits) ? 0 : credits,
    grade: resolved.canonicalGrade,
    gradePoints: resolved.points,
    qualityPoints,
    recognized: resolved.recognized,
    isFail: resolved.isFail,
    excluded,
    excludedReason,
  };
}

/**
 * @param {Array<{subject: string, credits: number, grade: string, flagged?: boolean}>} subjects
 * @param {string} scaleId
 */
export function mapSubjectsForCalculation(subjects, scaleId) {
  if (!Array.isArray(subjects)) return [];
  return subjects.map((entry) => mapSubjectForCalculation(entry, scaleId));
}

/**
 * SRM credit-weighted CGPA:
 * CGPA = Σ(grade point × credits) / Σ(credits)
 *
 * @param {number} totalQualityPoints
 * @param {number} totalCredits
 * @returns {number}
 */
export function computeCreditWeightedCgpa(totalQualityPoints, totalCredits) {
  if (totalCredits <= 0) return 0;
  return roundCgpa(totalQualityPoints / totalCredits);
}

/**
 * Round CGPA to 2 decimal places (standard college display).
 *
 * @param {number} value
 * @returns {number}
 */
export function roundCgpa(value) {
  return Math.round(value * 100) / 100;
}

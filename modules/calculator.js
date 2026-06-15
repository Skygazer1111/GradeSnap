/**
 * @module calculator
 * @description CGPA calculation engine for GradeSnap AI CGPA Calculator.
 * Computes CGPA, grade distribution, performance levels, and per-subject breakdowns.
 */

import { getGradePoints, GRADING_SCALES } from './parser.js';

/**
 * Performance level thresholds for each grading scale.
 * @constant {Object.<string, Array<{min: number, level: string}>>}
 */
const PERFORMANCE_THRESHOLDS = {
  '10': [
    { min: 9.0, level: 'distinction' },
    { min: 8.0, level: 'first' },
    { min: 6.5, level: 'second' },
    { min: 5.0, level: 'pass' },
  ],
  '4': [
    { min: 3.7, level: 'distinction' },
    { min: 3.0, level: 'first' },
    { min: 2.0, level: 'second' },
    { min: 1.0, level: 'pass' },
  ],
};

/**
 * Human-readable labels for each performance level.
 * @constant {Object.<string, string>}
 */
const PERFORMANCE_LABELS = {
  distinction: 'Outstanding! 🏆',
  first: 'First Class 🌟',
  second: 'Second Class 👍',
  pass: 'Pass ✅',
  fail: 'Needs Improvement 📚',
};

/**
 * CSS badge class names for each performance level.
 * @constant {Object.<string, string>}
 */
const PERFORMANCE_BADGE_CLASSES = {
  distinction: 'badge-distinction',
  first: 'badge-first',
  second: 'badge-second',
  pass: 'badge-pass',
  fail: 'badge-fail',
};

/**
 * Determines the performance level based on CGPA, scale thresholds, and whether
 * any subject has a failing grade.
 *
 * @param {number} cgpa - The calculated CGPA.
 * @param {string} scaleId - The grading scale identifier ('10' or '4').
 * @param {boolean} hasFail - Whether any subject has an 'F' grade.
 * @returns {string} The performance level string.
 */
function determinePerformanceLevel(cgpa, scaleId, hasFail) {
  // If any subject has grade 'F', override to fail
  if (hasFail) {
    return 'fail';
  }

  const thresholds = PERFORMANCE_THRESHOLDS[scaleId];
  if (!thresholds) {
    return 'fail';
  }

  for (const threshold of thresholds) {
    if (cgpa >= threshold.min) {
      return threshold.level;
    }
  }

  return 'fail';
}

/**
 * Calculates the CGPA and comprehensive result breakdown from a list of subjects.
 *
 * @param {Array<{subject: string, credits: number, grade: string}>} subjects
 *   The array of subject entries. Each must have subject name, credits, and grade.
 * @param {string} scaleId - The grading scale identifier ('10' for Indian, '4' for US).
 * @returns {{
 *   cgpa: number,
 *   totalCredits: number,
 *   totalCreditPoints: number,
 *   subjectsCount: number,
 *   gradeDistribution: Object.<string, number>,
 *   performanceLevel: ('distinction'|'first'|'second'|'pass'|'fail'),
 *   maxPoints: number,
 *   perSubject: Array<{subject: string, credits: number, grade: string, gradePoints: number, creditPoints: number}>
 * }} The complete CGPA result object.
 *
 * @example
 * const subjects = [
 *   { subject: 'Math', credits: 4, grade: 'A+' },
 *   { subject: 'Physics', credits: 3, grade: 'A' },
 * ];
 * const result = calculateCGPA(subjects, '10');
 * // result.cgpa → 8.57
 * // result.performanceLevel → 'first'
 */
export function calculateCGPA(subjects, scaleId) {
  const scale = GRADING_SCALES[scaleId];
  const maxPoints = scale ? scale.maxPoints : 0;

  // Build per-subject breakdown
  const perSubject = subjects.map((entry) => {
    const gradePointValue = getGradePoints(entry.grade, scaleId);
    const resolvedGradePoints = gradePointValue !== null ? gradePointValue : 0;
    const creditPoints = entry.credits * resolvedGradePoints;

    return {
      subject: entry.subject,
      credits: entry.credits,
      grade: entry.grade,
      gradePoints: resolvedGradePoints,
      creditPoints: creditPoints,
    };
  });

  // Aggregate totals
  let totalCredits = 0;
  let totalCreditPoints = 0;

  for (const item of perSubject) {
    totalCredits += item.credits;
    totalCreditPoints += item.creditPoints;
  }

  // Calculate CGPA, guard against division by zero
  const cgpa =
    totalCredits > 0
      ? Math.round((totalCreditPoints / totalCredits) * 100) / 100
      : 0;

  // Compute grade distribution
  const gradeDistribution = {};
  for (const item of perSubject) {
    const grade = item.grade;
    if (grade in gradeDistribution) {
      gradeDistribution[grade] += 1;
    } else {
      gradeDistribution[grade] = 1;
    }
  }

  // Check for any failing grade
  const hasFail = subjects.some(
    (entry) => entry.grade.toUpperCase().trim() === 'F'
  );

  // Determine performance level
  const performanceLevel = determinePerformanceLevel(cgpa, scaleId, hasFail);

  return {
    cgpa,
    totalCredits,
    totalCreditPoints,
    subjectsCount: subjects.length,
    gradeDistribution,
    performanceLevel,
    maxPoints,
    perSubject,
  };
}

/**
 * Returns a human-readable label (with emoji) for a given performance level.
 *
 * @param {string} level - The performance level ('distinction', 'first', 'second', 'pass', 'fail').
 * @returns {string} The human-readable label with emoji.
 *
 * @example
 * getPerformanceLabel('distinction'); // Returns 'Outstanding! 🏆'
 * getPerformanceLabel('fail');        // Returns 'Needs Improvement 📚'
 */
export function getPerformanceLabel(level) {
  return PERFORMANCE_LABELS[level] || PERFORMANCE_LABELS.fail;
}

/**
 * Returns the CSS badge class name for a given performance level.
 *
 * @param {string} level - The performance level ('distinction', 'first', 'second', 'pass', 'fail').
 * @returns {string} The CSS class name for styling the badge.
 *
 * @example
 * getPerformanceBadgeClass('distinction'); // Returns 'badge-distinction'
 * getPerformanceBadgeClass('first');       // Returns 'badge-first'
 */
export function getPerformanceBadgeClass(level) {
  return PERFORMANCE_BADGE_CLASSES[level] || PERFORMANCE_BADGE_CLASSES.fail;
}

/**
 * Returns the result mood for celebration / neutral / disappointment screens.
 *
 * @param {string} level - Performance level from calculateCGPA.
 * @returns {'celebration'|'neutral'|'disappointment'}
 */
export function getResultMood(level) {
  if (['distinction', 'first'].includes(level)) return 'celebration';
  if (level === 'fail') return 'disappointment';
  return 'neutral';
}

/**
 * Returns headline content for the result mood screen.
 *
 * @param {string} level
 * @param {number} cgpa
 * @param {number} maxPoints
 * @returns {{mood: string, emoji: string, title: string, message: string}}
 */
export function getResultMoodContent(level, cgpa, maxPoints) {
  const mood = getResultMood(level);
  const score = cgpa.toFixed(2);

  const content = {
    celebration: {
      emoji: '🎉',
      title: 'Celebration time!',
      message: `Your CGPA is ${score} / ${maxPoints}. Excellent work — you should be proud!`,
    },
    neutral: {
      emoji: '👍',
      title: 'Solid result',
      message: `Your CGPA is ${score} / ${maxPoints}. Good progress — keep building on this.`,
    },
    disappointment: {
      emoji: '📚',
      title: 'Keep going',
      message: `Your CGPA is ${score} / ${maxPoints}. Review your subjects, fix weak spots, and bounce back stronger.`,
    },
  };

  return { mood, ...content[mood] };
}

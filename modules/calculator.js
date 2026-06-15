/**
 * @module calculator
 * @description CGPA calculation engine using SRM credit-weighted formula.
 */

import {
  GRADING_SCALES,
  computeCreditWeightedCgpa,
  mapSubjectsForCalculation,
  resolveGrade,
} from './grade-mapper.js';

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

const PERFORMANCE_LABELS = {
  distinction: 'Outstanding! 🏆',
  first: 'First Class 🌟',
  second: 'Second Class 👍',
  pass: 'Pass ✅',
  fail: 'Needs Improvement 📚',
};

const PERFORMANCE_BADGE_CLASSES = {
  distinction: 'badge-distinction',
  first: 'badge-first',
  second: 'badge-second',
  pass: 'badge-pass',
  fail: 'badge-fail',
};

function determinePerformanceLevel(cgpa, scaleId, hasFail) {
  if (hasFail) return 'fail';

  const thresholds = PERFORMANCE_THRESHOLDS[scaleId];
  if (!thresholds) return 'fail';

  for (const threshold of thresholds) {
    if (cgpa >= threshold.min) return threshold.level;
  }

  return 'fail';
}

/**
 * CGPA = Σ(grade point × credits) / Σ(credits)
 * Zero-credit subjects are excluded from both numerator and denominator.
 *
 * @param {Array<{subject: string, credits: number, grade: string, flagged?: boolean}>} subjects
 * @param {string} scaleId
 */
export function calculateCGPA(subjects, scaleId) {
  const scale = GRADING_SCALES[scaleId];
  const maxPoints = scale ? scale.maxPoints : 0;
  const mapped = mapSubjectsForCalculation(subjects, scaleId);

  const perSubject = mapped.map((item) => ({
    subject: item.subject,
    credits: item.credits,
    grade: item.grade,
    gradePoints: item.recognized ? item.gradePoints : null,
    creditPoints: item.excluded || !item.recognized ? 0 : item.qualityPoints,
    included: !item.excluded && item.recognized,
    recognized: item.recognized,
    excludedReason: item.excluded ? item.excludedReason : null,
  }));

  const included = perSubject.filter((item) => item.included);

  let totalCredits = 0;
  let totalQualityPoints = 0;

  for (const item of included) {
    totalCredits += item.credits;
    totalQualityPoints += item.creditPoints;
  }

  const cgpa = computeCreditWeightedCgpa(totalQualityPoints, totalCredits);

  const gradeDistribution = {};
  for (const item of included) {
    gradeDistribution[item.grade] = (gradeDistribution[item.grade] || 0) + 1;
  }

  const hasFail = mapped.some((item) => !item.excluded && item.isFail);
  const performanceLevel = determinePerformanceLevel(cgpa, scaleId, hasFail);

  return {
    cgpa,
    totalCredits,
    totalCreditPoints: totalQualityPoints,
    totalQualityPoints,
    subjectsCount: subjects.length,
    includedSubjectsCount: included.length,
    excludedSubjectsCount: subjects.length - included.length,
    gradeDistribution,
    performanceLevel,
    maxPoints,
    perSubject,
  };
}

export function getPerformanceLabel(level) {
  return PERFORMANCE_LABELS[level] || PERFORMANCE_LABELS.fail;
}

export function getPerformanceBadgeClass(level) {
  return PERFORMANCE_BADGE_CLASSES[level] || PERFORMANCE_BADGE_CLASSES.fail;
}

export function getResultMood(level) {
  if (['distinction', 'first'].includes(level)) return 'celebration';
  if (level === 'fail') return 'disappointment';
  return 'neutral';
}

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

export { resolveGrade };

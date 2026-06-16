import { describe, expect, it } from 'vitest';
import {
  computeCreditWeightedCgpa,
  computeQualityPoints,
  getGradePoints,
  mapSubjectsForCalculation,
  normalizeGradeSymbol,
  resolveGrade,
  roundCgpa,
} from '@/domain/cgpa/grade-mapper.js';
import { calculateCGPA } from '@/domain/cgpa/calculator.js';
import {
  EXPECTED_CGPA_10_POINT,
  EXPECTED_SAMPLE2_CGPA,
  SAMPLE2_SUBJECTS,
  SAMPLE_SUBJECTS,
  SRM_USER_TOTAL_CREDITS,
  SRM_USER_TOTAL_QUALITY_POINTS,
} from '../../fixtures/sample-results.js';

describe('grade-mapper (SRM)', () => {
  it('maps SRM grade symbols to grade points', () => {
    expect(getGradePoints('O', '10')).toBe(10);
    expect(getGradePoints('A+', '10')).toBe(9);
    expect(getGradePoints('A', '10')).toBe(8);
    expect(getGradePoints('B+', '10')).toBe(7);
    expect(getGradePoints('B', '10')).toBe(6);
    expect(getGradePoints('C', '10')).toBe(5);
    expect(getGradePoints('U', '10')).toBe(0);
    expect(getGradePoints('RA', '10')).toBe(0);
  });

  it('normalizes OCR grade noise before mapping', () => {
    expect(normalizeGradeSymbol('Oo')).toBe('O');
    expect(normalizeGradeSymbol('[e]')).toBe('O');
    expect(normalizeGradeSymbol('(e]')).toBe('O');
    expect(normalizeGradeSymbol('lo)')).toBe('O');
    expect(getGradePoints('(e]', '10')).toBe(10);
    expect(getGradePoints('lo)', '10')).toBe(10);
  });

  it('computes quality points as credits × grade point', () => {
    expect(computeQualityPoints(4, 10)).toBe(40);
    expect(computeQualityPoints(3, 8)).toBe(24);
  });

  it('matches the SRM worked example (CGPA = 120 / 13 = 9.23)', () => {
    const example = [
      { subject: 'Math', credits: 4, grade: 'O' },
      { subject: 'Physics', credits: 4, grade: 'A+' },
      { subject: 'Programming', credits: 3, grade: 'A' },
      { subject: 'English', credits: 2, grade: 'O' },
    ];

    const mapped = mapSubjectsForCalculation(example, '10');
    const totalQuality = mapped.reduce((sum, row) => sum + row.qualityPoints, 0);
    const totalCredits = mapped.reduce((sum, row) => sum + row.credits, 0);

    expect(totalQuality).toBe(120);
    expect(totalCredits).toBe(13);
    expect(computeCreditWeightedCgpa(totalQuality, totalCredits)).toBe(9.23);
    expect(roundCgpa(120 / 13)).toBe(9.23);
  });

  it('marks U and RA as failing grades', () => {
    expect(resolveGrade('U', '10').isFail).toBe(true);
    expect(resolveGrade('RA', '10').isFail).toBe(true);
    expect(resolveGrade('O', '10').isFail).toBe(false);
  });
});

describe('calculateCGPA with SRM formula', () => {
  it('computes sample screenshot CGPA at 9.88', () => {
    const result = calculateCGPA(SAMPLE_SUBJECTS, '10');
    expect(result.cgpa).toBe(EXPECTED_CGPA_10_POINT);
    expect(result.totalQualityPoints).toBe(257);
    expect(result.totalCredits).toBe(26);
  });

  it('computes user May 2026 semester CGPA line by line', () => {
    const result = calculateCGPA(SAMPLE2_SUBJECTS, '10');

    expect(result.totalQualityPoints).toBe(SRM_USER_TOTAL_QUALITY_POINTS);
    expect(result.totalCredits).toBe(SRM_USER_TOTAL_CREDITS);
    expect(result.cgpa).toBe(EXPECTED_SAMPLE2_CGPA);
    expect(result.includedSubjectsCount).toBe(8);
    expect(result.excludedSubjectsCount).toBe(1);
  });

  it('still computes correct CGPA when OCR leaves noisy grade tokens', () => {
    const noisy = SAMPLE2_SUBJECTS.map((row) => ({ ...row }));
    noisy[0].grade = 'Oo';
    noisy[3].grade = '(e]';
    noisy[6].grade = 'oO';

    const result = calculateCGPA(noisy, '10');
    expect(result.cgpa).toBe(EXPECTED_SAMPLE2_CGPA);
  });
});

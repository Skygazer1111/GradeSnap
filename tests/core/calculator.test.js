import { describe, expect, it } from 'vitest';
import { calculateCGPA, getResultMood } from '../../src/core/calculator.js';
import {
  EXPECTED_CGPA_10_POINT,
  EXPECTED_MOOD,
  SAMPLE_SUBJECTS,
  SRM_USER_EXPECTED_CGPA,
  SRM_USER_SUBJECTS,
} from '../fixtures/sample-results.js';

describe('calculateCGPA', () => {
  it('computes the expected CGPA for the sample semester results', () => {
    const result = calculateCGPA(SAMPLE_SUBJECTS, '10');

    expect(result.cgpa).toBe(EXPECTED_CGPA_10_POINT);
    expect(result.totalCredits).toBe(26);
    expect(result.totalQualityPoints).toBe(257);
    expect(result.subjectsCount).toBe(9);
    expect(result.includedSubjectsCount).toBe(8);
    expect(result.performanceLevel).toBe('distinction');
    expect(getResultMood(result.performanceLevel)).toBe(EXPECTED_MOOD);
  });

  it('uses credit-weighted quality points for the user gradesheet', () => {
    const result = calculateCGPA(SRM_USER_SUBJECTS, '10');
    expect(result.cgpa).toBe(SRM_USER_EXPECTED_CGPA);
  });
});

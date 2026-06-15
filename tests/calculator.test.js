import { describe, expect, it } from 'vitest';
import { calculateCGPA, getResultMood } from '../modules/calculator.js';
import {
  EXPECTED_CGPA_10_POINT,
  EXPECTED_MOOD,
  SAMPLE_SUBJECTS,
} from './fixtures/sample-results.js';

describe('calculateCGPA', () => {
  it('computes the expected CGPA for the sample semester results', () => {
    const result = calculateCGPA(SAMPLE_SUBJECTS, '10');

    expect(result.cgpa).toBe(EXPECTED_CGPA_10_POINT);
    expect(result.totalCredits).toBe(26);
    expect(result.subjectsCount).toBe(9);
    expect(result.performanceLevel).toBe('distinction');
    expect(getResultMood(result.performanceLevel)).toBe(EXPECTED_MOOD);
  });

  it('builds a grade distribution chart payload', () => {
    const result = calculateCGPA(SAMPLE_SUBJECTS, '10');

    expect(result.gradeDistribution.O).toBe(8);
    expect(result.gradeDistribution['A+']).toBe(1);
  });
});

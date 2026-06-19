import { describe, expect, it } from 'vitest';
import { computeSemesterCgpa } from '@/domain/cgpa/semester-cgpa';

describe('computeSemesterCgpa', () => {
  it('returns null when no valid SGPA values are provided', () => {
    expect(
      computeSemesterCgpa([
        { id: '1', sgpa: '', credits: '' },
        { id: '2', sgpa: 'abc', credits: '' },
      ]),
    ).toBeNull();
  });

  it('computes equal-weight CGPA from semester SGPAs', () => {
    const result = computeSemesterCgpa([
      { id: '1', sgpa: '9.0', credits: '' },
      { id: '2', sgpa: '8.0', credits: '' },
      { id: '3', sgpa: '10.0', credits: '' },
    ]);

    expect(result?.cgpa).toBe(9);
    expect(result?.semesterCount).toBe(3);
    expect(result?.totalCredits).toBe(3);
  });

  it('computes credit-weighted CGPA when credits are provided', () => {
    const result = computeSemesterCgpa([
      { id: '1', sgpa: '9.0', credits: '26' },
      { id: '2', sgpa: '8.0', credits: '24' },
    ]);

    expect(result?.cgpa).toBe(8.52);
    expect(result?.totalCredits).toBe(50);
    expect(result?.totalQualityPoints).toBe(426);
  });
});

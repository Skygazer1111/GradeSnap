import { describe, expect, it } from 'vitest';
import { computeCgpa } from '@/domain/cgpa/cgpa';

function subject(id, name, credits, grade, points = 0) {
  return { id, name, credits, grade, points };
}

describe('computeCgpa manual entry', () => {
  it('calculates from credits and grades when subject names are blank', () => {
    const result = computeCgpa([
      subject('1', '', 4, 'O'),
      subject('2', '   ', 3, 'A'),
    ]);

    expect(result.cgpa).toBe(9.14);
    expect(result.totalCredits).toBe(7);
    expect(result.weightedPoints).toBe(64);
    expect(result.totalSubjects).toBe(2);
    expect(result.highestGrade).toEqual({ grade: 'O', count: 1 });
    expect(result.lowestGrade).toEqual({ grade: 'A', count: 1 });
  });

  it('includes both named and unnamed subjects in the weighted average', () => {
    const result = computeCgpa([
      subject('1', 'Maths', 4, 'O'),
      subject('2', '', 2, 'B'),
    ]);

    expect(result.cgpa).toBe(8.67);
    expect(result.totalCredits).toBe(6);
    expect(result.weightedPoints).toBe(52);
  });

  it('calculates named subjects with normalized grades', () => {
    const result = computeCgpa([
      subject('1', 'Maths', 4, ' o '),
      subject('2', 'Physics', 4, 'a+'),
      subject('3', 'Programming', 3, 'A'),
      subject('4', 'English', 2, 'O'),
    ]);

    expect(result.cgpa).toBe(9.23);
    expect(result.totalCredits).toBe(13);
    expect(result.weightedPoints).toBe(120);
    expect(result.highestGrade).toEqual({ grade: 'O', count: 2 });
  });

  it('keeps failing subjects in the denominator and excludes zero-credit rows', () => {
    const result = computeCgpa([
      subject('1', '', 3, 'A'),
      subject('2', '', 1, 'F'),
      subject('3', '', 0, 'O'),
      subject('4', '', 0, 'A'),
    ]);

    expect(result.cgpa).toBe(6);
    expect(result.totalCredits).toBe(4);
    expect(result.weightedPoints).toBe(24);
    expect(result.totalSubjects).toBe(2);
    expect(result.highestGrade).toEqual({ grade: 'A', count: 1 });
    expect(result.lowestGrade).toEqual({ grade: 'F', count: 1 });
  });

  it('still returns a legitimate zero for all failing grades', () => {
    const result = computeCgpa([subject('1', '', 3, 'F')]);

    expect(result.cgpa).toBe(0);
    expect(result.totalCredits).toBe(3);
    expect(result.totalSubjects).toBe(1);
  });
});

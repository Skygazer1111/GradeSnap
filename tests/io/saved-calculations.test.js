import { beforeEach, describe, expect, it } from 'vitest';
import {
  SAVED_CALCULATIONS_KEY, loadSavedCalculations, saveCalculation, saveCalculations,
  deleteCalculation, savedSemesterEntries,
} from '@/io/saved-calculations';
import { computeSemesterCgpa } from '@/domain/cgpa/semester-cgpa';

let storage;
const semester = (number, gpa = 9, credits = 20) => ({
  kind: 'semester', semester: number, gpa, credits, qualityPoints: gpa * credits,
});

beforeEach(() => {
  const values = new Map();
  storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
});

describe('saved calculations', () => {
  it('persists semester results and reloads them in semester order', () => {
    saveCalculation(semester(3, 7), storage);
    saveCalculation(semester(1, 9), storage);
    // A fresh storage reader represents a new visit to the same origin.
    const loaded = loadSavedCalculations({ getItem: (key) => storage.getItem(key) });
    expect(loaded.map((row) => row.semester)).toEqual([1, 3]);
    expect(loaded[0]).toMatchObject(semester(1, 9));
    expect(Number.isFinite(Date.parse(loaded[0].savedAt))).toBe(true);
  });

  it('updates a semester without duplicating it or changing other results', () => {
    saveCalculations([semester(1), semester(2, 8)], storage);
    saveCalculation(semester(1, 7.5, 24), storage);
    expect(loadSavedCalculations(storage)).toMatchObject([semester(1, 7.5, 24), semester(2, 8)]);
  });

  it('stores overall CGPA separately and excludes it from weighted semester calculations', () => {
    saveCalculations([
      semester(1, 9, 26), semester(2, 8, 24),
      { ...semester(2, 8.52, 50), kind: 'cumulative' },
    ], storage);
    const entries = savedSemesterEntries(loadSavedCalculations(storage));
    expect(entries.map((row) => row.semester)).toEqual([1, 2]);
    expect(computeSemesterCgpa(entries)).toMatchObject({ cgpa: 8.52, totalCredits: 50, semesterCount: 2 });
  });

  it('preserves original quality points instead of rounding semester GPA twice', () => {
    saveCalculation({ ...semester(1, 8.33, 3), qualityPoints: 25 }, storage);
    const entries = savedSemesterEntries(loadSavedCalculations(storage));
    expect(computeSemesterCgpa(entries).totalQualityPoints).toBe(25);
    expect(computeSemesterCgpa([{ ...entries[0], sgpa: '9', qualityPoints: undefined }]).cgpa).toBe(9);
  });

  it('deletes only the selected kind and semester and preserves unrelated storage', () => {
    storage.setItem('theme', 'dark');
    saveCalculations([semester(1), semester(2), { ...semester(1), kind: 'cumulative' }], storage);
    deleteCalculation('semester', 1, storage);
    expect(loadSavedCalculations(storage).map((row) => `${row.kind}-${row.semester}`)).toEqual(['cumulative-1', 'semester-2']);
    expect(storage.getItem('theme')).toBe('dark');
  });

  it.each([
    { semester: 0 }, { semester: 1.5 }, { semester: -1 },
    { gpa: NaN }, { gpa: 11 }, { credits: 0 }, { credits: Infinity },
    { qualityPoints: NaN }, { qualityPoints: 10000 },
  ])('rejects invalid data without changing saved results: %j', (patch) => {
    saveCalculation(semester(1), storage);
    const previous = storage.getItem(SAVED_CALCULATIONS_KEY);
    expect(() => saveCalculation({ ...semester(2), ...patch }, storage)).toThrow();
    expect(storage.getItem(SAVED_CALCULATIONS_KEY)).toBe(previous);
  });

  it('saves zero GPA and fractional credits', () => {
    saveCalculation(semester(1, 0, 20.5), storage);
    expect(loadSavedCalculations(storage)[0]).toMatchObject({ gpa: 0, credits: 20.5 });
  });

  it('does not partially save a batch with duplicate semesters', () => {
    expect(() => saveCalculations([semester(1), semester(1, 8)], storage)).toThrow();
    expect(loadSavedCalculations(storage)).toEqual([]);
  });

  it('keeps unreadable JSON intact rather than overwriting it', () => {
    storage.setItem(SAVED_CALCULATIONS_KEY, '{bad json');
    expect(() => saveCalculation(semester(1), storage)).toThrow('could not be read');
    expect(storage.getItem(SAVED_CALCULATIONS_KEY)).toBe('{bad json');
  });

  it('ignores invalid records in an otherwise readable list', () => {
    saveCalculation(semester(1), storage);
    const valid = loadSavedCalculations(storage);
    storage.setItem(SAVED_CALCULATIONS_KEY, JSON.stringify([null, {}, ...valid, { ...valid[0], credits: -1 }]));
    expect(loadSavedCalculations(storage)).toEqual(valid);
  });

  it('reports unavailable or full storage rather than pretending to save', () => {
    expect(() => loadSavedCalculations({ getItem() { throw new Error('Unavailable'); } })).toThrow('Unavailable');
    expect(() => saveCalculation(semester(1), { ...storage, setItem() { throw new Error('Full'); } })).toThrow('Full');
  });
});

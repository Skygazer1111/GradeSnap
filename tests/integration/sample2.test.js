import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { parseOcrText, parseBoundingBoxes } from '@/domain/ocr/orchestration/parser.js';
import { calculateCGPA, getResultMood } from '@/domain/cgpa/calculator.js';
import {
  EXPECTED_SAMPLE2_CGPA,
  EXPECTED_SAMPLE2_MOOD,
  SAMPLE2_CLEAN_OCR_TEXT,
  SAMPLE2_NOISY_BROWSER_OCR_TEXT,
  SAMPLE2_SUBJECTS,
} from '../fixtures/sample-results.js';
import { runOcrOnImageWithBoxes } from '../helpers/ocr-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE2_IMAGE = path.join(__dirname, '..', '..', 'sample', 'SampleResults2.jpeg');

function subjectKey(subject) {
  return subject.toUpperCase().trim();
}

describe('SampleResults2.jpeg integration', () => {
  it('parses clean OCR text for the ERP gradesheet', () => {
    const parsed = parseOcrText(SAMPLE2_CLEAN_OCR_TEXT);
    expect(parsed).toHaveLength(9);

    for (const expectedRow of SAMPLE2_SUBJECTS) {
      const match = parsed.find(
        (row) => subjectKey(row.subject) === subjectKey(expectedRow.subject)
      );
      expect(match, `Missing: ${expectedRow.subject}`).toBeTruthy();
      expect(match.grade).toBe(expectedRow.grade);
      expect(match.credits).toBe(expectedRow.credits);
    }

    const result = calculateCGPA(parsed, '10');
    expect(result.cgpa).toBe(EXPECTED_SAMPLE2_CGPA);
    expect(result.totalCredits).toBe(26);
    expect(result.totalQualityPoints).toBe(246);
  });

  it('parses noisy browser OCR text without missing subjects or grade mismatches', () => {
    const parsed = parseOcrText(SAMPLE2_NOISY_BROWSER_OCR_TEXT);
    expect(parsed.length).toBeGreaterThanOrEqual(9);

    for (const expectedRow of SAMPLE2_SUBJECTS) {
      const match = parsed.find(
        (row) => subjectKey(row.subject) === subjectKey(expectedRow.subject)
      );
      expect(
        match,
        `Missing subject: ${expectedRow.subject}`
      ).toBeTruthy();
      expect(match.grade, `Grade mismatch for ${expectedRow.subject}: expected ${expectedRow.grade}, got ${match?.grade}`).toBe(expectedRow.grade);
      expect(match.credits).toBe(expectedRow.credits);
    }

    const result = calculateCGPA(parsed, '10');
    expect(result.cgpa).toBe(EXPECTED_SAMPLE2_CGPA);
  });

  it(
    'reads SampleResults2.jpeg, parses subjects, and calculates CGPA',
    async () => {
      const { text: ocrText, items } = await runOcrOnImageWithBoxes(SAMPLE2_IMAGE);

      expect(ocrText.length).toBeGreaterThan(50);

      // Use spatial assembly (bounding boxes) as the primary path
      const parsed = parseBoundingBoxes(items, ocrText);
      expect(parsed.length).toBeGreaterThanOrEqual(8);

      for (const expectedRow of SAMPLE2_SUBJECTS) {
        const match = parsed.find(
          (row) => subjectKey(row.subject) === subjectKey(expectedRow.subject)
        );

        expect(
          match,
          `Expected OCR pipeline to detect: ${expectedRow.subject}\nOCR text:\n${ocrText}`
        ).toBeTruthy();
        expect(match.grade).toBe(expectedRow.grade);
        expect(match.credits).toBe(expectedRow.credits);
      }

      const result = calculateCGPA(parsed, '10');
      expect(result.cgpa).toBe(EXPECTED_SAMPLE2_CGPA);
      expect(getResultMood(result.performanceLevel)).toBe(EXPECTED_SAMPLE2_MOOD);
    },
    120000
  );
});


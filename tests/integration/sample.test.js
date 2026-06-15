import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { parseOcrText } from '../../src/ocr/parser.js';
import { calculateCGPA, getResultMood } from '../../src/core/calculator.js';
import {
  EXPECTED_CGPA_10_POINT,
  EXPECTED_MOOD,
  SAMPLE_SUBJECTS,
} from '../fixtures/sample-results.js';
import { runOcrOnImage } from '../helpers/ocr-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_IMAGE = path.join(__dirname, '..', '..', 'sample', 'SampleResults.png');

function subjectKey(subject) {
  return subject.toUpperCase().trim();
}

describe('sample image integration', () => {
  it(
    'reads SampleResults.png, parses subjects, and calculates CGPA',
    async () => {
      const ocrText = await runOcrOnImage(SAMPLE_IMAGE);

      expect(ocrText.length).toBeGreaterThan(100);

      const parsed = parseOcrText(ocrText);
      expect(parsed.length).toBeGreaterThanOrEqual(7);

      for (const expectedRow of SAMPLE_SUBJECTS) {
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
      expect(result.cgpa).toBeGreaterThanOrEqual(9.5);
      expect(getResultMood(result.performanceLevel)).toBe(EXPECTED_MOOD);
      expect(result.cgpa).toBeCloseTo(EXPECTED_CGPA_10_POINT, 1);
    },
    120000
  );
});

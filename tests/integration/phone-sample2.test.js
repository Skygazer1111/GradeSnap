import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { parseBoundingBoxes } from '@/domain/ocr/orchestration/parser.js';
import { calculateCGPA, getResultMood } from '@/domain/cgpa/calculator.js';
import {
  EXPECTED_CGPA_10_POINT,
  EXPECTED_MOOD,
  SAMPLE_SUBJECTS,
} from '../fixtures/sample-results.js';
import { runOcrOnImageWithBoxes } from '../helpers/ocr-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHONE_IMAGE = path.join(__dirname, '..', '..', 'sample', 'SamplePhone2.jpeg');

function subjectKey(subject) {
  return subject.toUpperCase().trim();
}

describe('SamplePhone2.jpeg integration', () => {
  it(
    'parses the compact mobile portal layout without course codes',
    async () => {
      const { text: ocrText, items } = await runOcrOnImageWithBoxes(PHONE_IMAGE);

      expect(ocrText.length).toBeGreaterThan(50);
      expect(items.length).toBeGreaterThan(0);

      const parsed = parseBoundingBoxes(items, ocrText);
      expect(parsed.length).toBeGreaterThanOrEqual(9);

      for (const expectedRow of SAMPLE_SUBJECTS) {
        const match = parsed.find(
          (row) => subjectKey(row.subject) === subjectKey(expectedRow.subject),
        );

        expect(
          match,
          `Expected OCR pipeline to detect: ${expectedRow.subject}\nOCR text:\n${ocrText}`,
        ).toBeTruthy();
        expect(match.grade).toBe(expectedRow.grade);
        expect(match.credits).toBe(expectedRow.credits);
      }

      const result = calculateCGPA(parsed, '10');
      expect(result.cgpa).toBe(EXPECTED_CGPA_10_POINT);
      expect(getResultMood(result.performanceLevel)).toBe(EXPECTED_MOOD);
    },
    120000,
  );
});

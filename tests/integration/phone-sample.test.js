import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { parseOcrText, parseBoundingBoxes } from '@/domain/ocr/orchestration/parser.js';
import { calculateCGPA, getResultMood } from '@/domain/cgpa/calculator.js';
import {
  EXPECTED_SAMPLE2_CGPA,
  EXPECTED_SAMPLE2_MOOD,
  SAMPLE2_SUBJECTS,
} from '../fixtures/sample-results.js';
import { runOcrOnImageWithBoxes } from '../helpers/ocr-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHONE_IMAGE = path.join(__dirname, '..', '..', 'sample', 'PhoneSample1.jpeg');

function subjectKey(subject) {
  return subject.toUpperCase().trim();
}

describe('PhoneSample1.jpeg integration', () => {
  it(
    'reads the mobile portal screenshot, parses wrapped subjects, and calculates CGPA',
    async () => {
      const { text: ocrText, items } = await runOcrOnImageWithBoxes(PHONE_IMAGE);

      expect(ocrText.length).toBeGreaterThan(50);

      let parsed;
      try {
        parsed = parseBoundingBoxes(items, ocrText);
      } catch {
        parsed = parseOcrText(ocrText);
      }

      expect(parsed.length).toBeGreaterThanOrEqual(9);

      for (const expectedRow of SAMPLE2_SUBJECTS) {
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
      expect(result.cgpa).toBe(EXPECTED_SAMPLE2_CGPA);
      expect(getResultMood(result.performanceLevel)).toBe(EXPECTED_SAMPLE2_MOOD);
    },
    120000,
  );
});

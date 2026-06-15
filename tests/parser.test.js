import { describe, expect, it } from 'vitest';
import { parseOcrText } from '../modules/parser.js';
import {
  SAMPLE_BROWSER_LIKE_OCR_TEXT,
  SAMPLE_CLEAN_OCR_TEXT,
  SAMPLE_NOISY_OCR_TEXT,
  SAMPLE_PREPROCESSED_OCR_TEXT,
  SAMPLE_SUBJECTS,
} from './fixtures/sample-results.js';

function subjectKey(subject) {
  return subject.toUpperCase().trim();
}

function assertSubjectsMatch(actual, expected, { allowFlaggedCredits = false } = {}) {
  expect(actual).toHaveLength(expected.length);

  for (const expectedRow of expected) {
    const match = actual.find(
      (row) => subjectKey(row.subject) === subjectKey(expectedRow.subject)
    );

    expect(match, `Missing subject: ${expectedRow.subject}`).toBeTruthy();
    expect(match.grade).toBe(expectedRow.grade);

    if (allowFlaggedCredits && match.flagged) {
      expect(match.credits).toBeGreaterThanOrEqual(0);
    } else {
      expect(match.credits).toBe(expectedRow.credits);
      expect(match.flagged).toBe(expectedRow.flagged);
    }
  }
}

describe('parseOcrText', () => {
  it('parses clean sample gradesheet text into 9 subjects', () => {
    const parsed = parseOcrText(SAMPLE_CLEAN_OCR_TEXT);
    assertSubjectsMatch(parsed, SAMPLE_SUBJECTS);
  });

  it('parses noisy OCR text from the sample screenshot', () => {
    const parsed = parseOcrText(SAMPLE_NOISY_OCR_TEXT);
    assertSubjectsMatch(parsed, SAMPLE_SUBJECTS, { allowFlaggedCredits: true });
  });

  it('parses real preprocessed OCR output from SampleResults.png', () => {
    const parsed = parseOcrText(SAMPLE_PREPROCESSED_OCR_TEXT);
    assertSubjectsMatch(parsed, SAMPLE_SUBJECTS);
  });

  it('parses browser-like OCR output without alpha flattening', () => {
    const parsed = parseOcrText(SAMPLE_BROWSER_LIKE_OCR_TEXT);
    assertSubjectsMatch(parsed, SAMPLE_SUBJECTS);
  });

  it('flags zero-credit rows for manual review', () => {
    const parsed = parseOcrText(SAMPLE_CLEAN_OCR_TEXT);
    const zeroCredit = parsed.find((row) =>
      subjectKey(row.subject).includes('ANALYTICAL AND LOGICAL THINKING SKILLS')
    );

    expect(zeroCredit?.credits).toBe(0);
    expect(zeroCredit?.flagged).toBe(true);
  });
});

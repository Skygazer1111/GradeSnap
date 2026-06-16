import { describe, expect, it } from 'vitest';
import { parseOcrText } from '../../src/ocr/parser.js';
import {
  SAMPLE_BROWSER_LIKE_OCR_TEXT,
  SAMPLE_CLEAN_OCR_TEXT,
  SAMPLE_NOISY_OCR_TEXT,
  SAMPLE_PREPROCESSED_OCR_TEXT,
  SAMPLE_SUBJECTS,
} from '../fixtures/sample-results.js';

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

  it('keeps credits attached to the grade column, not course codes', () => {
    const parsed = parseOcrText(
      '4 4 21CSC206T ARTIFICIAL INTELLIGENCE 3 O PASS'
    );

    const ai = parsed.find((row) => row.subject.includes('ARTIFICIAL INTELLIGENCE'));
    expect(ai).toBeTruthy();
    expect(ai.credits).toBe(3);
    expect(ai.grade).toBe('O');
  });

  it('does not treat OCR [o] in the grade column as zero credits', () => {
    const parsed = parseOcrText(
      '1 4 21MAB204T PROBABILITY AND QUEUEING THEORY 4 [o] PASS'
    );
    const row = parsed.find((r) => r.subject.includes('PROBABILITY'));
    expect(row?.credits).toBe(4);
    expect(row?.grade).toBe('O');
    expect(row?.flagged).toBe(false);
  });

  it('keeps audit courses at zero credits when OCR uses [o] for both columns', () => {
    const parsed = parseOcrText(
      '8 4 21PDM301L ANALYTICAL AND LOGICAL THINKING SKILLS [o] [o] PASS'
    );
    const row = parsed.find((r) => r.subject.includes('ANALYTICAL'));
    expect(row?.credits).toBe(0);
    expect(row?.grade).toBe('O');
    expect(row?.flagged).toBe(false);
  });

  it('parses SampleResults.png OCR text with [0] grade tokens as credits intact', () => {
    const parsed = parseOcrText(`EE  ——————
1               4                      2IMAB204T         PROBABILITY AND QUEUEING THEORY                                                     4                                  Oo                PASS
3              4                      21CSC205P          DATABASE MANAGEMENT SYSTEMS                                                        4                                  [0]                PASS
4               4                       21CSC206T          ARTIFICIAL INTELLIGENCE                                                                          3                                    [0]                 PASS
7                4                         21PDH209T           SOCIAL ENGINEERING                                                                                       2                                       [0]                   PASS
8               4                        21PDM301L           ANALYTICAL AND LOGICAL THINKING SKILLS                                                 [0]                                     [0]                  PASS`);

    expect(parsed.find((r) => r.subject.includes('DATABASE'))?.credits).toBe(4);
    expect(parsed.find((r) => r.subject.includes('ARTIFICIAL'))?.credits).toBe(3);
    expect(parsed.find((r) => r.subject.includes('SOCIAL'))?.credits).toBe(2);
    expect(parsed.find((r) => r.subject.includes('ANALYTICAL'))?.credits).toBe(0);
  });

  it('flags zero-credit rows for manual review for non-audit courses', () => {
    const parsed = parseOcrText(
      '1 4 21MAB204T PROBABILITY AND QUEUEING THEORY [0] O PASS'
    );
    const zeroCredit = parsed.find((row) =>
      subjectKey(row.subject).includes('PROBABILITY AND QUEUEING THEORY')
    );

    expect(zeroCredit?.credits).toBe(0);
    expect(zeroCredit?.flagged).toBe(true);
  });
});

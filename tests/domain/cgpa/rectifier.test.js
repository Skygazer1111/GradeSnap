import { describe, expect, it } from 'vitest';
import { parseOcrText } from '@/domain/ocr/orchestration/parser.js';
import {
  buildOcrRowAnchors,
  rectifySubjectRow,
  rectifySubjects,
} from '@/domain/cgpa/rectifier.js';
import { SAMPLE_SUBJECTS } from '../../fixtures/sample-results.js';

const SAMPLE_OCR_SNIPPET = `1 4 21MAB204T PROBABILITY AND QUEUEING THEORY 4 [o] PASS
3 4 21CSC205P DATABASE MANAGEMENT SYSTEMS 4 [0] PASS
7 4 21PDH209T SOCIAL ENGINEERING 2 [0] PASS
8 4 21PDM301L ANALYTICAL AND LOGICAL THINKING SKILLS [o] [o] PASS`;

describe('rectifier', () => {
  it('builds row anchors from OCR using course codes and PASS markers', () => {
    const anchors = buildOcrRowAnchors(SAMPLE_OCR_SNIPPET);

    expect(anchors.length).toBeGreaterThanOrEqual(4);
    expect(anchors.some((a) => a.courseCode.includes('21MAB'))).toBe(true);
    expect(anchors.find((a) => a.subjectHint.includes('SOCIAL'))?.credits).toBe(2);
  });

  it('rectifies zero credits when OCR misread grade [o] as credit column', () => {
    const anchors = buildOcrRowAnchors(SAMPLE_OCR_SNIPPET);
    const fixed = rectifySubjectRow(
      {
        id: '1',
        subject: 'PROBABILITY AND QUEUEING THEORY',
        credits: 0,
        grade: 'Oo',
        flagged: true,
      },
      anchors,
      '10'
    );

    expect(fixed.credits).toBe(4);
    expect(fixed.grade).toBe('O');
    expect(fixed.flagged).toBe(false);
    expect(fixed.rectified).toBe(true);
  });

  it('keeps audit courses at zero credits', () => {
    const anchors = buildOcrRowAnchors(SAMPLE_OCR_SNIPPET);
    const fixed = rectifySubjectRow(
      {
        id: '8',
        subject: 'ANALYTICAL AND LOGICAL THINKING SKILLS',
        credits: 3,
        grade: 'O',
        flagged: false,
      },
      anchors,
      '10'
    );

    expect(fixed.credits).toBe(0);
    expect(fixed.flagged).toBe(false);
    expect(fixed.rectified).toBe(true);
  });

  it('maps PASS-bleed P grade to O on rectification', () => {
    const fixed = rectifySubjectRow(
      {
        id: 'x',
        subject: 'ERP SOLUTION FOR DIGITAL ENTERPRISES',
        credits: 3,
        grade: 'P',
        flagged: false,
      },
      [],
      '10'
    );

    expect(fixed.grade).toBe('O');
  });

  it('rectifies a full parsed batch against raw OCR', () => {
    const noisy = [
      {
        id: 'a',
        subject: 'P PROBABILITY AND QUEUEING THEORY',
        credits: 0,
        grade: 'Oo',
        flagged: true,
      },
      {
        id: 'b',
        subject: 'SOCIAL ENGINEERING',
        credits: 3,
        grade: 'A+',
        flagged: false,
      },
    ];

    const rectified = rectifySubjects(noisy, SAMPLE_OCR_SNIPPET, '10');

    expect(rectified.find((r) => r.subject.includes('PROBABILITY'))?.credits).toBe(4);
    expect(rectified.find((r) => r.subject.includes('SOCIAL'))?.credits).toBe(2);
  });

  it('parseOcrText runs rectifier as final pipeline stage', () => {
    const parsed = parseOcrText(SAMPLE_OCR_SNIPPET);

    expect(parsed.find((r) => r.subject.includes('PROBABILITY'))?.credits).toBe(4);
    expect(parsed.find((r) => r.subject.includes('SOCIAL'))?.credits).toBe(2);
    expect(parsed.find((r) => r.subject.includes('ANALYTICAL'))?.credits).toBe(0);
  });

  it('rectifies SampleResults-style OCR to match expected subjects', () => {
    const ocr = `3 4 21CSC205P DATABASE MANAGEMENT SYSTEMS 4 [0] PASS
4 4 21CSC206T ARTIFICIAL INTELLIGENCE 3 [0] PASS
7 4 21PDH209T SOCIAL ENGINEERING 2 [0] PASS`;

    const parsed = parseOcrText(ocr);
    expect(parsed.find((r) => r.subject.includes('DATABASE'))?.credits).toBe(4);
    expect(parsed.find((r) => r.subject.includes('ARTIFICIAL'))?.credits).toBe(3);
    expect(parsed.find((r) => r.subject.includes('SOCIAL'))?.credits).toBe(2);
  });

  it('rejects May - 2026 date banner false positives', () => {
    const ocr = `May - 2026
1 4 21MAB204T PROBABILITY AND QUEUEING THEORY 4 O PASS
May - 2026 1 4 21MAB204T PROBABILITY AND QUEUEING THEORY 4 O PASS
2 4 21CSC204J DESIGN AND ANALYSIS OF ALGORITHMS 4 O PASS
3 4 21CSC205P DATABASE MANAGEMENT SYSTEMS 4 O PASS
4 4 21CSC206T ARTIFICIAL INTELLIGENCE 3 O PASS`;

    const parsed = parseOcrText(ocr);

    expect(parsed.some((row) => /MAY/i.test(row.subject))).toBe(false);
    expect(parsed.some((row) => row.subject.includes('PROBABILITY'))).toBe(true);
    expect(parsed.length).toBeLessThanOrEqual(4);
  });
});

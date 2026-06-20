import { describe, expect, it } from 'vitest';
import {
  mergeWrappedRows,
  assembleSpatialRows,
} from '@/domain/ocr/parsing/spatial-assembler.js';
import { mergeMobileTextLines } from '@/domain/ocr/parsing/row-assembler.js';
import { parseOcrText, parseBoundingBoxes } from '@/domain/ocr/orchestration/parser.js';
import { SAMPLE2_SUBJECTS } from '../../fixtures/sample-results.js';

const PHONE_MOBILE_OCR_TEXT = `COURSE CODE DESCRIPTION CREDIT GRADE RESULT
May - 2026
21MAB204T PROBABILITY 4 O PASS
AND QUEUEING
THEORY
21CSC204J DESIGN AND 4 A+ PASS
ANALYSIS OF
ALGORITHMS
21CSC205P DATABASE 4 A+ PASS
MANAGEMENT
SYSTEMS
21CSC206T ARTIFICIAL 3 O PASS
INTELLIGENCE
21IPE312P ERP SOLUTION 3 A+ PASS
FOR DIGITAL
ENTERPRISES
21DCS201P DESIGN 3 O PASS
THINKING AND
METHODOLOGY
21PDH209T SOCIAL 2 o PASS
ENGINEERING
21PDM301L ANALYTICAL o 0 PASS
AND LOGICAL
THINKING
SKILLS
21HCSF007 FINANCIAL 3 A+ PASS
TECHNOLOGIES
FOUNDATIONS`;

function item(text, y) {
  return { text, box: { x: 10, y, width: 100, height: 12 }, confidence: 0.9 };
}

describe('mobile portal parsing', () => {
  it('merges wrapped description lines into one spatial row', () => {
    const rows = [
      [item('21HCSF007', 0), item('FINANCIAL', 0), item('3', 0), item('A+', 0), item('PASS', 0)],
      [item('TECHNOLOGIES', 20)],
      [item('FOUNDATIONS', 40)],
    ];

    const merged = mergeWrappedRows(rows);
    expect(merged).toHaveLength(1);
    expect(merged[0].map((box) => box.text)).toEqual([
      '21HCSF007',
      'FINANCIAL',
      '3',
      'A+',
      'PASS',
      'TECHNOLOGIES',
      'FOUNDATIONS',
    ]);
  });

  it('parses wrapped mobile portal OCR text into full subjects', () => {
    const parsed = parseOcrText(PHONE_MOBILE_OCR_TEXT);
    expect(parsed).toHaveLength(9);

    for (const expected of SAMPLE2_SUBJECTS) {
      const match = parsed.find(
        (row) => row.subject.toUpperCase() === expected.subject.toUpperCase(),
      );
      expect(match, `Missing ${expected.subject}`).toBeTruthy();
      expect(match.grade).toBe(expected.grade);
      expect(match.credits).toBe(expected.credits);
    }
  });

  it('merges wrapped mobile text lines before parsing', () => {
    const lines = PHONE_MOBILE_OCR_TEXT.split('\n');
    const merged = mergeMobileTextLines(lines);
    expect(merged.some((line) => line.includes('FINANCIAL TECHNOLOGIES FOUNDATIONS'))).toBe(true);
    expect(merged.some((line) => line.includes('PROBABILITY AND QUEUEING THEORY'))).toBe(true);
  });

  it('assembles spatial rows with wrapped mobile layout', () => {
    const items = [
      item('21HCSF007', 300),
      item('FINANCIAL', 300),
      item('3', 300),
      item('A+', 300),
      item('PASS', 300),
      item('TECHNOLOGIES', 320),
      item('FOUNDATIONS', 340),
    ];

    const parsed = assembleSpatialRows(items);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].subject).toBe('FINANCIAL TECHNOLOGIES FOUNDATIONS');
    expect(parsed[0].credits).toBe(3);
    expect(parsed[0].grade).toBe('A+');
  });

  it('parses compact mobile portal text without course codes', () => {
    const text = `Student Portal
PROBABILITY 4 O
AND QUEUEING
THEORY
ANALYTICAL O O
AND LOGICAL
THINKING
SKILLS
FINANCIAL 3 O
TECHNOLOGIES
FOUNDATIONS`;

    const parsed = parseOcrText(text);
    expect(parsed.find((r) => r.subject.includes('PROBABILITY AND QUEUEING'))).toBeTruthy();
    expect(parsed.find((r) => r.subject.includes('ANALYTICAL AND LOGICAL THINKING SKILLS'))).toMatchObject({
      credits: 0,
      grade: 'O',
    });
    expect(parsed.find((r) => r.subject.includes('FINANCIAL TECHNOLOGIES FOUNDATIONS'))).toMatchObject({
      credits: 3,
      grade: 'O',
    });
  });
});

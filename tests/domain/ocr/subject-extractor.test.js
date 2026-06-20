import { describe, expect, it } from 'vitest';
import { extractSubject, stripEmbeddedGradeTokens } from '@/domain/ocr/parsing/subject-extractor.js';

describe('extractSubject', () => {
  it('joins wrapped mobile subject fragments', () => {
    expect(extractSubject('FINANCIAL TECHNOLOGIES FOUNDATIONS')).toBe(
      'FINANCIAL TECHNOLOGIES FOUNDATIONS',
    );
  });

  it('still prefers the real subject phrase over isolated OCR noise', () => {
    expect(extractSubject('palzlesizeloy) FINANCIAL TECHNOLOGIES FOUNDATIONS')).toBe(
      'FINANCIAL TECHNOLOGIES FOUNDATIONS',
    );
  });

  it('removes stray grade tokens from subject names', () => {
    expect(stripEmbeddedGradeTokens('ANALYTICAL O AND LOGICAL THINKING SKILLS')).toBe(
      'ANALYTICAL AND LOGICAL THINKING SKILLS',
    );
    expect(extractSubject('ANALYTICAL O AND LOGICAL THINKING SKILLS')).toBe(
      'ANALYTICAL AND LOGICAL THINKING SKILLS',
    );
  });
});

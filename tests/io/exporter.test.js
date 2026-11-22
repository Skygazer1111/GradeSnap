import { afterEach, expect, it, vi } from 'vitest';
import { generateShareLink, parseShareLink } from '@/io/exporter.js';

afterEach(() => vi.unstubAllGlobals());

it('round-trips subjects with Unicode names through a share URL', () => {
  vi.stubGlobal('window', { location: { href: 'https://gradesnap.example/#old' } });
  const subjects = [{ subject: 'Maths — गणित', credits: 4, grade: 'A+' }];
  const url = generateShareLink(subjects, '10');
  expect(url).toMatch(/^https:\/\/gradesnap\.example\/#share=/);
  expect(parseShareLink(url)).toMatchObject({ scaleId: '10', subjects });
});

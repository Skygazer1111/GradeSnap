/**
 * @module subject-extractor
 * Cleans and extracts subject names using natural language heuristics.
 */

export const COURSE_CODE_PATTERN = '2[1Iil][A-Za-z]{2,5}[0-9OoIl]{2,4}[A-Za-z)]*';
const COURSE_CODE_REGEX = new RegExp(COURSE_CODE_PATTERN, 'gi');

const GRADE_TOKEN_RE = /^(O|A\+|A|B\+|B|C|P|F|U|RA)$/i;

/** Removes stray grade tokens OCR leaves inside subject names (e.g. "ANALYTICAL O AND ..."). */
export function stripEmbeddedGradeTokens(text) {
  return text
    .split(/\s+/)
    .filter((token) => {
      const cleaned = token.replace(/[\[\]\(\)\{\}]/g, '');
      return !GRADE_TOKEN_RE.test(cleaned);
    })
    .join(' ');
}

/**
 * Extracts the subject name from a raw text string by removing course codes,
 * noise words, and picking the most likely phrase.
 * 
 * @param {string} text 
 * @returns {string} The cleaned subject name
 */
export function extractSubject(text) {
  if (!text) return '';

  // First remove course codes, PASS/FAIL, and OCR noise tokens with stray brackets
  let withoutCodes = text
    .replace(COURSE_CODE_REGEX, '')
    .replace(/\bPASS\b|\bFAIL\b/gi, '')
    .replace(/\b[A-Za-z]*[)\]}>]+\s*/g, '');

  withoutCodes = stripEmbeddedGradeTokens(withoutCodes);

  // Find all letter+space phrases >= 6 chars BEFORE removing brackets,
  // so that OCR noise like "palzlesizeloy)" doesn't get merged with the real subject.
  const allPhrases = [...withoutCodes.matchAll(/[A-Za-z][A-Za-z\s&]{5,}/g)];
  
  let bestPhrase = withoutCodes;
  if (allPhrases.length > 1) {
    const parts = allPhrases.map((m) => m[0].trim());
    const cleanParts = parts.filter(
      (p) => /^[A-Za-z][A-Za-z\s&-]*$/.test(p) && p.length >= 3 && !/[)\]}>]/.test(p),
    );
    if (cleanParts.length > 1) {
      bestPhrase = cleanParts.join(' ');
    } else if (cleanParts.length === 1) {
      bestPhrase = cleanParts[0];
    } else {
      bestPhrase = parts.reduce((a, b) => (a.length >= b.length ? a : b));
    }
  } else if (allPhrases.length === 1) {
    bestPhrase = allPhrases[0][0];
  }

  return bestPhrase
    .toUpperCase()
    .replace(/^\d+[\).\s-]+/, '')
    .replace(/^\d+\s+/, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[|·•_\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

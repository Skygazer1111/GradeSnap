/**
 * @module subject-extractor
 * Cleans and extracts subject names using natural language heuristics.
 */

export const COURSE_CODE_PATTERN = '2[1Iil][A-Za-z]{2,5}\\d{2,4}[A-Za-z)]*';
const COURSE_CODE_REGEX = new RegExp(COURSE_CODE_PATTERN, 'gi');

/**
 * Extracts the subject name from a raw text string by removing course codes,
 * noise words, and picking the most likely phrase.
 * 
 * @param {string} text 
 * @returns {string} The cleaned subject name
 */
export function extractSubject(text) {
  if (!text) return '';

  // First remove course codes and PASS/FAIL
  let withoutCodes = text
    .replace(COURSE_CODE_REGEX, '')
    .replace(/\bPASS\b|\bFAIL\b/gi, '');

  // Find all letter+space phrases >= 6 chars BEFORE removing brackets,
  // so that OCR noise like "palzlesizeloy)" doesn't get merged with the real subject.
  const allPhrases = [...withoutCodes.matchAll(/[A-Za-z][A-Za-z\s&]{5,}/g)];
  
  let bestPhrase = withoutCodes;
  if (allPhrases.length > 0) {
    bestPhrase = allPhrases.reduce((a, b) => a[0].length >= b[0].length ? a : b)[0];
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

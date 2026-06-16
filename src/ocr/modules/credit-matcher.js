/**
 * @module credit-matcher
 * Intelligently extracts single-digit credits (0-4) from OCR text.
 */

const VALID_CREDITS = new Set([0, 2, 3, 4]);

/**
 * Parses a raw token to see if it's a valid credit.
 * @param {string} token 
 * @returns {number|null}
 */
export function matchCredit(token) {
  if (!token) return null;
  const val = token.trim().toLowerCase();

  // Clean token of common bracket noise
  let cleaned = val.replace(/[\[\]\(\)\{\}]/g, '');
  if (cleaned === 'o' || cleaned === 'O' || cleaned === '©') return 0;
  
  const num = Number(cleaned);
  if (Number.isNaN(num)) return null;
  
  const rounded = Math.round(num);
  if (VALID_CREDITS.has(rounded)) return rounded;
  
  // Accept 1 as a fallback even if not strictly in VALID_CREDITS set,
  // some electives might be 1 credit.
  if (rounded >= 0 && rounded <= 5) return rounded;

  return null;
}

/**
 * Extracts a credit value from the end of a string.
 * @param {string} text 
 * @returns {{ credit: number|null, remaining: string }}
 */
export function extractCreditFromEnd(text) {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length === 0) return { credit: null, remaining: text };

  const lastToken = tokens[tokens.length - 1];
  const creditMatch = matchCredit(lastToken);

  if (creditMatch !== null) {
    return {
      credit: creditMatch,
      remaining: tokens.slice(0, -1).join(' ')
    };
  }

  // Sometimes credits and grades are merged like "3A+" or "4O"
  // This is handled in RowAssembler by splitting, but we can do a quick check here
  const matchMerged = lastToken.match(/^([0-4])([A-Z\+]+)$/i);
  if (matchMerged) {
    const cred = matchCredit(matchMerged[1]);
    if (cred !== null) {
      // Re-attach the grade part to the end for the grade matcher to pick up
      const remainingTokens = tokens.slice(0, -1);
      remainingTokens.push(matchMerged[2]);
      return {
        credit: cred,
        remaining: remainingTokens.join(' ')
      };
    }
  }

  return { credit: null, remaining: text };
}

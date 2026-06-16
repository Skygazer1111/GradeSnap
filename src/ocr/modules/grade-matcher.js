import { getAvailableGrades } from '../../core/grade-mapper.js';

// Common OCR mistakes that are completely different characters but visually similar
const EXACT_ALIASES = {
  '0O': 'O', 'OO': 'O', '0': 'O', 'S': 'O',
  'P': 'O', // PASS often just means O in some old parsers, or we just map it.
};

/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Cleans a token by removing common OCR noise around grades.
 */
function cleanToken(token) {
  return token
    .toUpperCase()
    .replace(/©/g, 'O') // OCR sometimes reads [o] as ©
    .replace(/[\[\]\(\)\{\}]/g, '') // Remove brackets like [o], (e]
    .replace(/[^A-Z0-9\+\-]/g, '') // Keep only letters, numbers, +, -
    .trim();
}

/**
 * Attempts to match a raw OCR token to a valid grade using fuzzy logic.
 *
 * @param {string} token - The raw text token
 * @param {string} scaleId - The grading scale to validate against (default '10')
 * @returns {string|null} - The matched canonical grade, or null if no match.
 */
export function matchGrade(token, scaleId = '10') {
  if (!token) return null;

  const validGrades = getAvailableGrades(scaleId);
  const rawClean = token.toUpperCase().trim();
  
  if (EXACT_ALIASES[rawClean]) return EXACT_ALIASES[rawClean];

  const cleaned = cleanToken(token);
  if (!cleaned) return null;

  if (EXACT_ALIASES[cleaned]) return EXACT_ALIASES[cleaned];

  // 1. Exact match after cleaning
  if (validGrades.includes(cleaned)) {
    return cleaned;
  }

  // 2. Fuzzy match
  let bestMatch = null;
  let minDistance = Infinity;

  for (const grade of validGrades) {
    const dist = levenshtein(cleaned, grade);
    
    // We allow a distance of 1 for most grades (e.g., 'A=' -> 'A+', '8' -> 'B')
    // We don't want to accidentally turn 'C' into 'O' if distance is too high
    const maxAllowedDist = grade.length === 1 ? 1 : 2; 

    if (dist < minDistance && dist <= maxAllowedDist) {
      minDistance = dist;
      bestMatch = grade;
    }
  }

  // Handle specific edge cases where fuzzy might fail
  if (!bestMatch) {
    if (cleaned === 'E' || cleaned === 'E0' || cleaned === 'EO') return 'O';
    if (cleaned.includes('+') && !cleaned.includes('A') && !cleaned.includes('B') && !cleaned.includes('C')) {
      // e.g. "4+" or "Q+"
      if (cleaned.startsWith('4') || cleaned.startsWith('A')) return 'A+';
      if (cleaned.startsWith('8') || cleaned.startsWith('B')) return 'B+';
    }
  }

  return bestMatch;
}

/**
 * Extracts a grade from the end of a string if present.
 */
export function extractGradeFromEnd(text, scaleId = '10') {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length === 0) return { grade: null, remaining: text };

  // Check the last token
  const lastToken = tokens[tokens.length - 1];
  const gradeMatch = matchGrade(lastToken, scaleId);

  if (gradeMatch) {
    return {
      grade: gradeMatch,
      remaining: tokens.slice(0, -1).join(' ')
    };
  }

  // Sometimes grades are split like "A +"
  if (tokens.length >= 2) {
    const combined = tokens[tokens.length - 2] + tokens[tokens.length - 1];
    const combinedMatch = matchGrade(combined, scaleId);
    if (combinedMatch) {
      return {
        grade: combinedMatch,
        remaining: tokens.slice(0, -2).join(' ')
      };
    }
  }

  return { grade: null, remaining: text };
}

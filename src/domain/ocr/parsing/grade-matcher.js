import { getAvailableGrades } from '@/domain/cgpa/grade-mapper.js';

// Common OCR mistakes that are completely different characters but visually similar
const EXACT_ALIASES = {
  '0O': 'O', 'OO': 'O', 'S': 'O',
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
 * @param {number} confidence - OCR confidence (0 to 1). High confidence disables fuzzy correction.
 * @returns {string|null} - The matched canonical grade, or null if no match.
 */
export function matchGrade(token, scaleId = '10', confidence = 1.0) {
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
    // If OCR is highly confident (>= 0.7), we trust it and disable fuzzy correction
    // to prevent false positives (like a high-confidence "8" turning into a "B").
    const maxAllowedDist = (confidence >= 0.7) ? 0 : (grade.length === 1 ? 1 : 2); 

    if (dist < minDistance && dist <= maxAllowedDist) {
      minDistance = dist;
      bestMatch = grade;
    }
  }

  // Handle specific edge cases where fuzzy might fail
  if (!bestMatch) {
    // We can still allow safe alias conversions even at high confidence
    if (cleaned === 'E' || cleaned === 'E0' || cleaned === 'EO') return 'O';
    
    // If low confidence, do more aggressive heuristics
    if (confidence < 0.7 && cleaned.includes('+') && !cleaned.includes('A') && !cleaned.includes('B') && !cleaned.includes('C')) {
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

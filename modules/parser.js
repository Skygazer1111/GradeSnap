/**
 * @module parser
 * @description Grade response parser and grading scale definitions for GradeSnap AI CGPA Calculator.
 * Handles parsing raw AI text into validated grade objects, and provides grading scale constants.
 */

/**
 * Grading scale definitions with grade-to-point mappings.
 * @constant {Object.<string, {name: string, maxPoints: number, grades: Object.<string, number>}>}
 */
export const GRADING_SCALES = {
  '10': {
    name: '10-Point (Indian)',
    maxPoints: 10,
    grades: {
      'O': 10,
      'A+': 9,
      'A': 8,
      'B+': 7,
      'B': 6,
      'C': 5,
      'P': 4,
      'F': 0,
      'S': 10,
      'D': 4,
      'E': 0,
    },
  },
  '4': {
    name: '4-Point (US)',
    maxPoints: 4,
    grades: {
      'A+': 4.0,
      'A': 4.0,
      'A-': 3.7,
      'B+': 3.3,
      'B': 3.0,
      'B-': 2.7,
      'C+': 2.3,
      'C': 2.0,
      'C-': 1.7,
      'D+': 1.3,
      'D': 1.0,
      'D-': 0.7,
      'F': 0.0,
    },
  },
};

/**
 * Generates a unique ID string. Uses crypto.randomUUID() if available,
 * otherwise falls back to a Math.random-based approach.
 *
 * @returns {string} A unique identifier string.
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: generate a UUID-v4-like string from Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parses raw text (typically from the Gemini API) into a validated array of grade entries.
 *
 * The function handles:
 * - Extracting JSON from text that may contain surrounding prose or markdown fences.
 * - Validating and normalizing each subject entry.
 * - Flagging entries with missing or zero credits.
 * - Assigning unique IDs to each entry.
 *
 * @param {string} rawText - The raw text response from the AI, expected to contain a JSON array.
 * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
 *   The validated and normalized array of grade entries.
 * @throws {Error} If no valid JSON array can be extracted or parsed from the input text.
 *
 * @example
 * const grades = parseGradesResponse('[{"subject": "Math", "credits": 3, "grade": "A+"}]');
 * // Returns: [{ id: '...', subject: 'Math', credits: 3, grade: 'A+', flagged: false }]
 *
 * @example
 * // Handles markdown-wrapped responses
 * const grades = parseGradesResponse('```json\n[{"subject": "Physics", "credits": 0, "grade": "B"}]\n```');
 * // Returns: [{ id: '...', subject: 'Physics', credits: 0, grade: 'B', flagged: true }]
 */
export function parseGradesResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error(
      'Cannot parse grades: received empty or non-string input. The AI may not have returned valid data.'
    );
  }

  let cleanedText = rawText.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const codeFenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/;
  const codeFenceMatch = cleanedText.match(codeFenceRegex);
  if (codeFenceMatch) {
    cleanedText = codeFenceMatch[1].trim();
  }

  // Find the JSON array by locating the outermost [ ... ]
  const firstBracket = cleanedText.indexOf('[');
  const lastBracket = cleanedText.lastIndexOf(']');

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    throw new Error(
      'Could not find a JSON array in the AI response. The response may not contain valid grade data. ' +
      `Received: "${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}"`
    );
  }

  const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(
      `Failed to parse extracted JSON: ${err.message}. ` +
      `Extracted string: "${jsonString.substring(0, 300)}${jsonString.length > 300 ? '...' : ''}"`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      'Parsed data is not an array. Expected a JSON array of subject objects, ' +
      `but got ${typeof parsed}.`
    );
  }

  if (parsed.length === 0) {
    throw new Error(
      'The AI returned an empty array. No subjects were detected in the gradesheet image. ' +
      'Please try with a clearer image.'
    );
  }

  // Validate and normalize each entry
  const validated = parsed
    .map((entry) => {
      // Skip entirely null/undefined entries
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      // Subject validation
      const subject =
        typeof entry.subject === 'string' ? entry.subject.trim() : '';
      if (subject.length === 0) {
        return null; // Filter out entries with empty subjects
      }

      // Credits validation
      let credits = entry.credits;
      let flagged = false;

      if (
        credits === null ||
        credits === undefined ||
        credits === '' ||
        isNaN(Number(credits))
      ) {
        credits = 0;
        flagged = true;
      } else {
        credits = Number(credits);
        if (credits < 0) {
          credits = 0;
          flagged = true;
        }
        // Round to integer if fractional
        credits = Math.round(credits);
      }

      // Flag zero credits for review
      if (credits === 0) {
        flagged = true;
      }

      // Grade validation
      let grade = typeof entry.grade === 'string' ? entry.grade.trim().toUpperCase() : '';
      if (grade.length === 0) {
        return null; // Filter out entries with no grade
      }

      return {
        id: generateId(),
        subject,
        credits,
        grade,
        flagged,
      };
    })
    .filter((entry) => entry !== null);

  if (validated.length === 0) {
    throw new Error(
      'All entries were filtered out during validation. None of the extracted subjects had valid data. ' +
      'Please check the gradesheet image quality and try again.'
    );
  }

  return validated;
}

/**
 * Looks up the grade points for a given letter grade within a specific grading scale.
 *
 * @param {string} grade - The letter grade to look up (e.g., 'A+', 'O', 'B-').
 * @param {string} scaleId - The grading scale identifier ('10' or '4').
 * @returns {number|null} The numeric grade points, or null if the grade or scale is unknown.
 *
 * @example
 * getGradePoints('A+', '10'); // Returns 9
 * getGradePoints('A+', '4');  // Returns 4.0
 * getGradePoints('Z', '10');  // Returns null
 */
export function getGradePoints(grade, scaleId) {
  const scale = GRADING_SCALES[scaleId];
  if (!scale) return null;

  const normalized = grade.toUpperCase().trim();
  if (normalized in scale.grades) return scale.grades[normalized];

  return null; // unknown grade
}

/**
 * Returns the list of available grade letters for a given grading scale.
 *
 * @param {string} scaleId - The grading scale identifier ('10' or '4').
 * @returns {string[]} An array of grade letter strings, or an empty array if the scale is unknown.
 *
 * @example
 * getAvailableGrades('10'); // Returns ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'S', 'D', 'E']
 * getAvailableGrades('4');  // Returns ['A+', 'A', 'A-', 'B+', 'B', 'B-', ...]
 * getAvailableGrades('99'); // Returns []
 */
export function getAvailableGrades(scaleId) {
  const scale = GRADING_SCALES[scaleId];
  if (!scale) return [];
  return Object.keys(scale.grades);
}

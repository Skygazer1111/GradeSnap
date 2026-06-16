/**
 * @module line-segmenter
 * Splits raw OCR text into processable segments (lines or chunks separated by PASS/FAIL).
 */

/**
 * Splits text into lines and also segments merged rows using PASS/FAIL markers.
 * @param {string} rawText 
 * @returns {string[]}
 */
export function segmentText(rawText) {
  if (!rawText) return [];

  const rawLines = rawText.split(/\r?\n/);
  const segments = [];

  for (const line of rawLines) {
    const cleaned = line.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    // If the line has PASS/FAIL, it might contain multiple merged rows.
    // Try splitting it if it looks abnormally long or has multiple markers.
    if (/\b(PASS|FAIL)\b/i.test(cleaned)) {
      const parts = cleaned.split(/\b(PASS|FAIL)\b/i);
      let currentSegment = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.toUpperCase() === 'PASS' || part.toUpperCase() === 'FAIL') {
          currentSegment += ' ' + part;
          segments.push(currentSegment.trim());
          currentSegment = '';
        } else {
          currentSegment += part;
        }
      }
      
      if (currentSegment.trim().length > 5) {
        segments.push(currentSegment.trim());
      }
    } else {
      segments.push(cleaned);
    }
  }

  return segments;
}

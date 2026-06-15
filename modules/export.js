/**
 * @module export
 * @description Export utilities for GradeSnap — clipboard copy, PNG export,
 * shareable URL generation, and share link parsing.
 */

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Generate a unique row ID (mirrors table.js helper).
 * @returns {string} A unique identifier string like 'row_a1b2c3d4e'
 */
function generateId() {
  return 'row_' + Math.random().toString(36).substr(2, 9);
}

// ─── Clipboard Copy ────────────────────────────────────────────────────────────

/**
 * Copy the CGPA result and subject breakdown to the clipboard as formatted text.
 *
 * @param {Object} result - The calculator result object.
 * @param {number} result.cgpa - The calculated CGPA value.
 * @param {number} result.maxPoints - Maximum possible grade points on the scale.
 * @param {string} result.performanceLabel - Performance level label (e.g. "Distinction").
 * @param {number} result.totalCredits - Sum of all subject credits.
 * @param {number} result.totalCreditPoints - Sum of (credits × gradePoints) across all subjects.
 * @param {number} result.subjectsCount - Number of subjects.
 * @param {Array<{subject: string, credits: number, grade: string, gradePoints: number}>} subjects - Subject data array.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
export async function copyToClipboard(result, subjects) {
  try {
    const subjectLines = subjects
      .map(s => {
        const pts = s.gradePoints !== null && s.gradePoints !== undefined ? s.gradePoints : '—';
        return `  ${s.subject} — Grade: ${s.grade}, Credits: ${s.credits}, Points: ${pts}`;
      })
      .join('\n');

    const text = [
      `📊 CGPA Result — GradeSnap`,
      `━━━━━━━━━━━━━━━━━━━`,
      `CGPA: ${result.cgpa} / ${result.maxPoints}`,
      `Performance: ${result.performanceLabel}`,
      `Total Credits: ${result.totalCredits}`,
      `Total Grade Points: ${result.totalCreditPoints}`,
      `Subjects: ${result.subjectsCount}`,
      `━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Subject Breakdown:`,
      subjectLines,
      ``,
      `Calculated with GradeSnap ✨`
    ].join('\n');

    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('[GradeSnap] Clipboard copy failed:', err);
    return false;
  }
}

// ─── PNG Export ─────────────────────────────────────────────────────────────────

/**
 * Dynamically load the html2canvas library from CDN if not already present.
 * @returns {Promise<Function>} Resolves with the html2canvas function.
 * @private
 */
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) {
      resolve(window.html2canvas);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      if (window.html2canvas) {
        resolve(window.html2canvas);
      } else {
        reject(new Error('html2canvas loaded but not available on window'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load html2canvas from CDN'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Export a DOM element as a high-resolution PNG and trigger a download.
 *
 * @param {string} elementId - The id of the DOM element to capture.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
export async function exportAsPNG(elementId) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[GradeSnap] Element #${elementId} not found for PNG export.`);
      return false;
    }

    const html2canvas = await loadHtml2Canvas();

    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a1a',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: false
    });

    // Convert canvas to blob and trigger download
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('[GradeSnap] Canvas toBlob returned null.');
          resolve(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'gradesnap-cgpa.png';
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);

        resolve(true);
      }, 'image/png');
    });
  } catch (err) {
    console.error('[GradeSnap] PNG export failed:', err);
    return false;
  }
}

// ─── Share Link ────────────────────────────────────────────────────────────────

/**
 * Generate a shareable URL that encodes subject data and grading scale in the hash.
 *
 * @param {Array<{subject: string, credits: number, grade: string}>} subjects - Subject data.
 * @param {string} scaleId - The grading scale identifier.
 * @returns {string} Full URL with encoded share data in the hash fragment.
 */
export function generateShareLink(subjects, scaleId) {
  const compactData = {
    s: scaleId,
    d: subjects.map(s => [s.subject, s.credits, s.grade])
  };

  const json = JSON.stringify(compactData);
  const encoded = btoa(unescape(encodeURIComponent(json)));

  // Build the base URL (strip any existing hash)
  const baseUrl = window.location.href.split('#')[0];
  return `${baseUrl}#share=${encoded}`;
}

/**
 * Parse a share link URL and reconstruct the subjects array and scale.
 *
 * @param {string} url - The URL string to parse.
 * @returns {{ scaleId: string, subjects: Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}> } | null}
 *   Parsed data or null if the URL has no valid share data.
 */
export function parseShareLink(url) {
  try {
    if (!url || typeof url !== 'string') return null;

    const hashIndex = url.indexOf('#share=');
    if (hashIndex === -1) return null;

    const encoded = url.substring(hashIndex + '#share='.length);
    if (!encoded) return null;

    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json);

    if (!data || !data.s || !Array.isArray(data.d)) return null;

    const subjects = data.d.map(([subject, credits, grade]) => ({
      id: generateId(),
      subject: subject || '',
      credits: typeof credits === 'number' ? credits : parseFloat(credits) || 0,
      grade: grade || '',
      flagged: false
    }));

    return {
      scaleId: data.s,
      subjects
    };
  } catch (err) {
    console.error('[GradeSnap] Failed to parse share link:', err);
    return null;
  }
}

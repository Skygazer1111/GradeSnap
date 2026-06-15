/**
 * @module ocr
 * @description OCR module for GradeSnap AI CGPA Calculator.
 * Uses Google Gemini 2.5 Flash to extract grade data from gradesheet images.
 * Free API — get a key at https://aistudio.google.com/apikey
 */

const EXTRACTION_PROMPT = `You are a gradesheet data extractor. Analyze this gradesheet image and extract all subjects with their credits and grades.

Return ONLY a valid JSON array with objects in this exact format:
[
  {"subject": "Subject Name", "credits": 3, "grade": "A+"}
]

Rules:
- Extract ALL subjects visible in the gradesheet
- Credits should be numeric (integer)
- Grade should be the letter grade exactly as shown (O, A+, A, B+, B, C, P, F, etc.)
- If credits are not visible, use 0 and I will flag for review
- Do NOT include any text outside the JSON array
- Do NOT wrap in markdown code blocks`;

/** Models to try in order (newer / higher quota first). */
const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const RETRY_DELAYS_MS = [8000, 16000, 32000];
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Resizes and compresses an image iteratively until it fits within the target
 * payload size. Gradesheets are text-heavy, so smaller images still OCR well.
 *
 * @param {string} base64 - The base64-encoded image data.
 * @param {string} mimeType - Original MIME type.
 * @param {number} [maxDim=1200] - Starting maximum width or height in pixels.
 * @param {number} [quality=0.7] - Starting JPEG compression quality (0-1).
 * @param {number} [targetBytes=1_200_000] - Max base64 string length (~900 KB file).
 * @returns {Promise<{base64: string, mimeType: string}>} Compressed image data.
 */
function resizeImage(base64, mimeType, maxDim = 1200, quality = 0.7, targetBytes = 1_200_000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const attempt = (dim, q) => {
        let { width, height } = img;

        if (width > dim || height > dim) {
          if (width > height) {
            height = Math.round((height * dim) / width);
            width = dim;
          } else {
            width = Math.round((width * dim) / height);
            height = dim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', q);
        const resizedBase64 = dataUrl.split(',')[1];

        if (resizedBase64.length > targetBytes && (q > 0.3 || dim > 512)) {
          const nextQ = Math.max(q - 0.15, 0.25);
          const nextDim = q <= 0.35 ? Math.max(dim - 256, 512) : dim;
          return attempt(nextDim, nextQ);
        }

        resolve({ base64: resizedBase64, mimeType: 'image/jpeg' });
      };

      attempt(maxDim, quality);
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response, attemptIndex) {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return RETRY_DELAYS_MS[Math.min(attemptIndex, RETRY_DELAYS_MS.length - 1)];
}

function formatRateLimitMessage(errorBody) {
  const lower = (errorBody || '').toLowerCase();
  if (lower.includes('per day') || lower.includes('daily') || lower.includes('rpd')) {
    return (
      'Daily API limit reached for your Gemini key. Wait until tomorrow, create a new key at aistudio.google.com/apikey, or use Demo Data for now.'
    );
  }
  return (
    'Gemini rate limit hit. The app will auto-retry; if this persists, wait 1–2 minutes before trying again.'
  );
}

/**
 * Sends one generateContent request to Gemini.
 *
 * @param {string} model - Gemini model id.
 * @param {object} imageData - Compressed image payload.
 * @param {string} apiKey - Gemini API key.
 * @returns {Promise<Response>}
 */
async function callGemini(model, imageData, apiKey) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: EXTRACTION_PROMPT },
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Request timed out. Please check your internet connection and try again.'
      );
    }
    throw new Error(
      `Network error: ${err.message}. Please check your internet connection.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parses a successful Gemini response into raw text.
 *
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function parseGeminiResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Failed to parse API response: ${err.message}`);
  }

  if (
    !data.candidates ||
    !Array.isArray(data.candidates) ||
    data.candidates.length === 0
  ) {
    throw new Error(
      'API returned no results. The model may not have been able to process the image. Please try with a clearer image.'
    );
  }

  const candidate = data.candidates[0];

  if (candidate.finishReason === 'SAFETY') {
    throw new Error(
      'Response was blocked by safety filters. Please ensure the image is a valid gradesheet.'
    );
  }

  const text = candidate.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('');

  if (!text || text.trim().length === 0) {
    throw new Error(
      'API returned an empty response. The model could not extract data from this image. Try a clearer photo.'
    );
  }

  return text;
}

/**
 * Extracts grade data from a gradesheet image using Google Gemini 2.5 Flash.
 * Automatically resizes large images and retries on rate limits.
 *
 * @async
 * @param {string} base64Image - The base64-encoded image data (without data URI prefix).
 * @param {string} mimeType - The MIME type of the image (e.g., 'image/png', 'image/jpeg').
 * @param {string} apiKey - The Google Gemini API key (free at aistudio.google.com/apikey).
 * @param {function} [onStatus] - Optional status callback for UI updates.
 * @returns {Promise<string>} The raw text response containing extracted grade JSON.
 * @throws {Error} If the API request fails, times out, or the response is malformed.
 */
export async function extractGrades(base64Image, mimeType, apiKey, onStatus) {
  let imageData;
  try {
    imageData = await resizeImage(base64Image, mimeType);
  } catch (err) {
    console.warn('Image resize failed, using original:', err);
    imageData = { base64: base64Image, mimeType };
  }

  let lastRateLimitMessage = formatRateLimitMessage('');

  for (const model of VISION_MODELS) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (onStatus) {
        const retryLabel = attempt > 0 ? ` (retry ${attempt})` : '';
        onStatus(`Analyzing gradesheet with ${model}${retryLabel}…`);
      }

      const response = await callGemini(model, imageData, apiKey);

      if (response.ok) {
        return parseGeminiResponse(response);
      }

      let errorBody = '';
      try {
        const errorJson = await response.json();
        errorBody = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        errorBody = await response.text().catch(() => 'Unable to read error response');
      }

      if (response.status === 429) {
        lastRateLimitMessage = formatRateLimitMessage(errorBody);
        if (attempt < RETRY_DELAYS_MS.length) {
          const waitMs = getRetryDelayMs(response, attempt);
          if (onStatus) {
            onStatus(`Rate limited — waiting ${Math.round(waitMs / 1000)}s before retry…`);
          }
          await sleep(waitMs);
          continue;
        }
        break;
      }

      if (response.status === 400 || response.status === 403) {
        throw new Error(
          'Invalid API key. Please check your Gemini API key at aistudio.google.com/apikey'
        );
      }

      if (response.status === 404 || /not found|deprecated|shut down/i.test(errorBody)) {
        console.warn(`Model ${model} unavailable, trying next model.`, errorBody);
        break;
      }

      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }
  }

  throw new Error(lastRateLimitMessage);
}

/**
 * Returns mock gradesheet data for demo/testing purposes.
 *
 * @returns {Array<{subject: string, credits: number, grade: string}>} An array of mock subject data.
 */
export function getDemoData() {
  return [
    { subject: 'Mathematics III', credits: 4, grade: 'A+' },
    { subject: 'Data Structures', credits: 4, grade: 'O' },
    { subject: 'Digital Electronics', credits: 3, grade: 'A' },
    { subject: 'Computer Organization', credits: 3, grade: 'B+' },
    { subject: 'Discrete Mathematics', credits: 3, grade: 'A' },
    { subject: 'Environmental Studies', credits: 2, grade: 'B' },
    { subject: 'Data Structures Lab', credits: 2, grade: 'O' },
    { subject: 'Digital Electronics Lab', credits: 1, grade: 'A+' },
  ];
}

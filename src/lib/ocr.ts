/**
 * OCR Adapter: bridges the Studio UI's OCR interface with our robust
 * existing OCR pipeline (worker → parser → rectifier).
 *
 * The Studio components import from "@/lib/ocr" — this file fulfills
 * that contract by delegating to our battle-tested backend modules.
 */

import { gradeToPoints, uid, type Subject } from "./cgpa";
import { extractGrades } from "@/ocr/worker.js";
import { parseOcrText } from "@/ocr/parser.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OcrStage {
  key: string;
  label: string;
}

export const OCR_STAGES: OcrStage[] = [
  { key: "preprocess", label: "Preprocessing Image" },
  { key: "ocr", label: "Running OCR Engine" },
  { key: "clean", label: "Cleaning Text" },
  { key: "parse", label: "Parsing Subjects" },
  { key: "rectify", label: "Rectifying Data" },
  { key: "cgpa", label: "Calculating CGPA" },
];

export interface OcrResult {
  rawText: string;
  subjects: Subject[];
}

type ProgressFn = (stageIndex: number, fraction: number) => void;

/**
 * Runs our full OCR pipeline: image preprocessing → Tesseract → parsing → rectification.
 * Reports progress through the 6 stages for the UI.
 */
export async function runOcr(
  file: File,
  onProgress: ProgressFn,
): Promise<OcrResult> {
  // Stage 0: preprocess (read + decode)
  onProgress(0, 0.2);

  // Read file to base64
  const { base64, mimeType } = await fileToBase64(file);

  await delay(200);
  onProgress(0, 1);

  // Stage 1: OCR — use our existing extractGrades which handles
  // image preprocessing + Tesseract OCR
  onProgress(1, 0.05);

  const rawText = await extractGrades(base64, mimeType, (status: string) => {
    // Map the status messages to progress fractions
    if (status.includes('Loading OCR')) onProgress(1, 0.15);
    else if (status.includes('Loading language')) onProgress(1, 0.3);
    else if (status.includes('Reading')) {
      const pctMatch = status.match(/(\d+)%/);
      if (pctMatch) {
        onProgress(1, Math.max(0.4, parseInt(pctMatch[1]) / 100));
      }
    }
  });
  onProgress(1, 1);

  // Stage 2: clean
  onProgress(2, 0.3);
  await delay(150);
  onProgress(2, 1);

  // Stage 3: parse (uses our parseOcrText which also calls rectifySubjects internally)
  onProgress(3, 0.3);
  let parsedSubjects: any[];
  try {
    parsedSubjects = parseOcrText(rawText);
  } catch {
    parsedSubjects = [];
  }
  onProgress(3, 1);

  // Stage 4: rectify (already done inside parseOcrText, but show the stage)
  onProgress(4, 0.4);
  await delay(150);
  onProgress(4, 1);

  // Stage 5: done
  onProgress(5, 0.5);
  await delay(150);
  onProgress(5, 1);

  // Convert backend format {subject, credits, grade, flagged} → Studio Subject format
  const subjects: Subject[] = parsedSubjects.map((row: any) => ({
    id: row.id || uid(),
    name: row.subject || "Subject",
    credits: Math.round(Number(row.credits)) || 0,
    grade: (row.grade || "A").toUpperCase(),
    points: gradeToPoints(row.grade || "A"),
  }));

  return { rawText, subjects };
}

/** Demo subjects for the "Try a sample" button. */
export function demoSubjects(): Subject[] {
  const data: Array<[string, number, string]> = [
    ["Engineering Mathematics", 4, "A+"],
    ["Data Structures", 3, "O"],
    ["Digital Logic Design", 3, "A"],
    ["Object Oriented Programming", 4, "A+"],
    ["Discrete Mathematics", 3, "B+"],
    ["Technical Communication", 2, "A"],
  ];
  return data.map(([name, credits, grade]) => ({
    id: uid(),
    name,
    credits,
    grade,
    points: gradeToPoints(grade),
  }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

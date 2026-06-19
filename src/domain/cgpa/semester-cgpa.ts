import { computeCreditWeightedCgpa } from "@/domain/cgpa/grade-mapper.js";
import { classify, type Classification } from "@/domain/cgpa/cgpa";

export interface SemesterEntry {
  id: string;
  sgpa: string;
  credits: string;
}

export interface SemesterCgpaResult {
  cgpa: number;
  semesterCount: number;
  totalCredits: number;
  totalQualityPoints: number;
  classification: Classification;
}

function parseSgpa(value: string): number | null {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0 || n > 10) return null;
  return n;
}

function parseCredits(value: string): number {
  if (!value.trim()) return 1;
  const n = parseFloat(value);
  if (Number.isNaN(n) || n <= 0) return 1;
  return n;
}

/**
 * CGPA from semester SGPAs.
 * Each semester is weighted by its credits (defaults to 1 when credits are blank).
 */
export function computeSemesterCgpa(entries: SemesterEntry[]): SemesterCgpaResult | null {
  const valid = entries
    .map((entry) => ({
      entry,
      sgpa: parseSgpa(entry.sgpa),
      credits: parseCredits(entry.credits),
    }))
    .filter((row): row is { entry: SemesterEntry; sgpa: number; credits: number } => row.sgpa !== null);

  if (valid.length === 0) return null;

  let totalQualityPoints = 0;
  let totalCredits = 0;

  for (const row of valid) {
    totalQualityPoints += row.sgpa * row.credits;
    totalCredits += row.credits;
  }

  const cgpa = computeCreditWeightedCgpa(totalQualityPoints, totalCredits);

  return {
    cgpa,
    semesterCount: valid.length,
    totalCredits,
    totalQualityPoints,
    classification: classify(cgpa),
  };
}

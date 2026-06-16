/**
 * Adapter: translates the existing backend's API into the interface
 * expected by the GradeSnap Studio UI components.
 *
 * The Studio components import from "@/lib/cgpa" — this file fulfills
 * that contract by delegating to our battle-tested backend modules.
 */

import { calculateCGPA } from '@/core/calculator.js';
import {
  GRADING_SCALES,
  getGradePoints,
  normalizeGradeSymbol,
} from '@/core/grade-mapper.js';

// ─── Types matching Studio UI expectations ──────────────────────────────────

export interface Subject {
  id: string;
  name: string;
  credits: number;
  grade: string;
  points: number;
  flagged?: boolean;
}

export type GradeKey =
  | "O"
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "P"
  | "F";

export interface Classification {
  label: string;
  tier: "outstanding" | "excellent" | "great" | "growing" | "support";
  min: number;
  message: string;
}

export interface CgpaSummary {
  cgpa: number;
  totalCredits: number;
  totalSubjects: number;
  weightedPoints: number;
  classification: Classification;
  highestGrade: { grade: string; count: number };
  lowestGrade: { grade: string; count: number };
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Standard 10-point grade scale (common in Indian universities). */
export const GRADE_POINTS: Record<string, number> =
  GRADING_SCALES['10'].grades;

export const GRADE_OPTIONS = Object.keys(GRADING_SCALES['10'].grades);

// ─── Functions ──────────────────────────────────────────────────────────────

export function gradeToPoints(grade: string): number {
  const canonical = normalizeGradeSymbol(grade);
  const pts = getGradePoints(canonical, '10');
  if (pts !== null && pts !== undefined) return pts;
  // Fallback: try parse as number
  const num = parseFloat(grade);
  if (!Number.isNaN(num) && num >= 0 && num <= 10) return num;
  return 0;
}

export function classify(cgpa: number): Classification {
  if (cgpa >= 9.0)
    return {
      label: "Outstanding",
      tier: "outstanding",
      min: 9,
      message: "Exceptional performance. You're in the top tier.",
    };
  if (cgpa >= 8.0)
    return {
      label: "Excellent",
      tier: "excellent",
      min: 8,
      message: "Excellent and consistent results across the board.",
    };
  if (cgpa >= 7.0)
    return {
      label: "Great Work",
      tier: "great",
      min: 7,
      message: "Strong, reliable academic standing. Keep it up.",
    };
  if (cgpa >= 6.0)
    return {
      label: "Keep Growing",
      tier: "growing",
      min: 6,
      message: "Solid foundation with clear room to climb higher.",
    };
  return {
    label: "Building Momentum",
    tier: "support",
    min: 0,
    message: "Every grade is a step. Focus on a few subjects to lift your average.",
  };
}

/**
 * Compute CGPA using our robust backend calculator.
 * Converts from Studio Subject[] → backend format → CgpaSummary.
 */
export function computeCgpa(subjects: Subject[]): CgpaSummary {
  // Convert Studio format → backend format
  const backendSubjects = subjects.map((s) => ({
    id: s.id,
    subject: s.name,
    credits: s.credits,
    grade: normalizeGradeSymbol(s.grade),
    flagged: false,
  }));

  // Use our battle-tested calculator
  const result = calculateCGPA(backendSubjects, '10');

  // Convert backend result → Studio CgpaSummary
  const classification = classify(result.cgpa);

  // Compute highest/lowest grade
  const counts = new Map<string, number>();
  for (const s of subjects) {
    const g = s.grade.trim().toUpperCase() || "—";
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }

  let highest = { grade: "—", count: 0, pts: -1 };
  let lowest = { grade: "—", count: 0, pts: 99 };
  for (const s of subjects) {
    if (s.credits <= 0) continue;
    const g = s.grade.trim().toUpperCase() || "—";
    if (s.points > highest.pts) highest = { grade: g, count: counts.get(g) ?? 1, pts: s.points };
    if (s.points < lowest.pts) lowest = { grade: g, count: counts.get(g) ?? 1, pts: s.points };
  }

  return {
    cgpa: result.cgpa,
    totalCredits: result.totalCredits,
    totalSubjects: result.subjectsCount,
    weightedPoints: result.totalQualityPoints,
    classification,
    highestGrade: { grade: highest.grade, count: highest.count },
    lowestGrade: { grade: lowest.grade, count: lowest.count },
  };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

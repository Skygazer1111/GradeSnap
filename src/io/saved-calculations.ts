import type { SemesterEntry } from '@/domain/cgpa/semester-cgpa';

export const SAVED_CALCULATIONS_KEY = 'gradesnap.calculations.v1';
export const SAVED_CALCULATIONS_EVENT = 'gradesnap:calculations-changed';

export interface SavedCalculation {
  kind: 'semester' | 'cumulative';
  semester: number;
  gpa: number;
  credits: number;
  qualityPoints: number;
  savedAt: string;
}

export type CalculationInput = Omit<SavedCalculation, 'savedAt'>;

function validCalculation(value: unknown): value is CalculationInput {
  if (!value || typeof value !== 'object') return false;
  const row = value as CalculationInput;
  return (row.kind === 'semester' || row.kind === 'cumulative')
    && Number.isSafeInteger(row.semester) && row.semester > 0
    && Number.isFinite(row.gpa) && row.gpa >= 0 && row.gpa <= 10
    && Number.isFinite(row.credits) && row.credits > 0
    && Number.isFinite(row.qualityPoints) && row.qualityPoints >= 0
    && Math.abs(row.qualityPoints / row.credits - row.gpa) < 0.0051;
}

export function loadSavedCalculations(storage: Pick<Storage, 'getItem'> = window.localStorage): SavedCalculation[] {
  const raw = storage.getItem(SAVED_CALCULATIONS_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved results could not be read. Your existing data has been kept.');
  }
  if (!Array.isArray(parsed)) throw new Error('Saved results have an unsupported format.');
  return parsed.filter((row): row is SavedCalculation => validCalculation(row) && 'savedAt' in row
    && typeof row.savedAt === 'string' && Number.isFinite(Date.parse(row.savedAt)))
    .filter((row, index, rows) => rows.findIndex((other) => other.kind === row.kind && other.semester === row.semester) === index)
    .sort((a, b) => a.semester - b.semester || a.kind.localeCompare(b.kind));
}

export function saveCalculation(input: CalculationInput, storage: Storage = window.localStorage): void {
  saveCalculations([input], storage);
}

export function saveCalculations(inputs: CalculationInput[], storage: Storage = window.localStorage): void {
  if (!inputs.length || !inputs.every(validCalculation)) throw new Error('Enter a valid semester number and GPA.');
  const keys = inputs.map((input) => `${input.kind}-${input.semester}`);
  if (new Set(keys).size !== keys.length) throw new Error('Semester numbers must be unique.');
  const records = loadSavedCalculations(storage).filter((row) => !keys.includes(`${row.kind}-${row.semester}`));
  const savedAt = new Date().toISOString();
  records.push(...inputs.map((input) => ({ ...input, savedAt })));
  storage.setItem(SAVED_CALCULATIONS_KEY, JSON.stringify(records));
}

export function deleteCalculation(kind: SavedCalculation['kind'], semester: number, storage: Storage = window.localStorage): void {
  const records = loadSavedCalculations(storage).filter((row) => row.kind !== kind || row.semester !== semester);
  storage.setItem(SAVED_CALCULATIONS_KEY, JSON.stringify(records));
}

export function savedSemesterEntries(records: SavedCalculation[]): SemesterEntry[] {
  return records.filter((row) => row.kind === 'semester').sort((a, b) => a.semester - b.semester)
    .map((row) => ({
      id: `saved-semester-${row.semester}`,
      semester: row.semester,
      sgpa: row.gpa.toFixed(2),
      credits: String(row.credits),
      qualityPoints: row.qualityPoints,
    }));
}

import { useId, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSavedCalculations } from '@/hooks/use-saved-calculations';
import type { SavedCalculation } from '@/io/saved-calculations';

interface SaveCalculationProps {
  gpa: number;
  credits: number;
  qualityPoints: number;
  cumulative?: boolean;
  defaultSemester?: number;
}

export function SaveCalculation({ gpa, credits, qualityPoints, cumulative = false, defaultSemester }: SaveCalculationProps) {
  const { records, error, save } = useSavedCalculations();
  const [kind, setKind] = useState<SavedCalculation['kind']>(cumulative ? 'cumulative' : 'semester');
  const [semester, setSemester] = useState(() => String(defaultSemester ??
    (Math.max(0, ...records.filter((row) => row.kind === 'semester').map((row) => row.semester)) + 1)));
  const id = useId();
  const existing = records.find((row) => row.semester === Number(semester) && row.kind === kind);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      save({ kind, semester: Number(semester), gpa, credits, qualityPoints });
      toast.success(`${kind === 'semester' ? 'Semester GPA' : 'Overall CGPA'} saved on this browser`);
    } catch {
      toast.error('Could not save. Check that browser storage is available and the semester number is valid.');
    }
  };

  return (
    <form onSubmit={handleSave} className="glass-strong rounded-3xl p-5 sm:p-6" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="flex items-center gap-2 font-display text-lg font-semibold">
        <Save className="h-5 w-5 text-primary" /> Save this result
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep it in this browser and revisit it from Saved calculations.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        {!cumulative && (
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            Result type
            <select value={kind} onChange={(event) => setKind(event.target.value as SavedCalculation['kind'])}
              className="rounded-xl border border-input bg-background px-3 py-2.5">
              <option value="semester">Semester GPA (SGPA)</option>
              <option value="cumulative">Overall CGPA</option>
            </select>
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          {kind === 'semester' ? 'Semester number' : 'Through semester'}
          <input type="number" min={1} step={1} required inputMode="numeric" value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="min-w-0 rounded-xl border border-input bg-background/60 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
        </label>
        <button type="submit" disabled={Boolean(error)}
          className="rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: 'var(--gradient-text)' }}>
          {existing ? 'Update saved result' : 'Save locally'}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {error || (existing ? `This replaces the saved ${kind === 'semester' ? 'GPA for' : 'CGPA through'} semester ${semester} (${existing.gpa.toFixed(2)}).` :
          kind === 'semester' ? 'Saved semester GPAs can be used to calculate your overall CGPA.' : 'Saved as an overall result; it will not count as an individual semester.')}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Only on this device and browser. Clearing site data removes saved results.</p>
    </form>
  );
}

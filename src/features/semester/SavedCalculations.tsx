import { Calculator, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSavedCalculations } from '@/hooks/use-saved-calculations';
import type { SavedCalculation } from '@/io/saved-calculations';

export function SavedCalculations({ onUseSemesters }: { onUseSemesters: () => void }) {
  const { records, error, remove } = useSavedCalculations();
  const semesterCount = records.filter((row) => row.kind === 'semester').length;
  const handleRemove = (record: SavedCalculation) => {
    try {
      remove(record);
      toast.success('Saved result deleted');
    } catch {
      toast.error('Could not delete this saved result. Browser storage may be unavailable.');
    }
  };
  return (
    <section className="glass-strong w-full max-w-3xl rounded-[2rem] p-5 sm:p-6" aria-labelledby="saved-calculations-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="saved-calculations-title" className="flex items-center gap-2 font-display text-xl font-semibold">
          <History className="h-5 w-5 text-primary" /> Saved calculations
        </h2>
        {semesterCount > 0 && (
          <button type="button" onClick={onUseSemesters} className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground">
            <Calculator className="h-4 w-4" /> Use saved semesters
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Your semester GPAs and overall CGPA results, saved only in this browser.</p>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : records.length === 0 ? (
        <p className="mt-5 rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">No saved results yet. Calculate your GPA, then choose Save locally and enter a semester number.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {records.map((row) => (
            <li key={`${row.kind}-${row.semester}`} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{row.kind === 'semester' ? `Semester ${row.semester}` : `Overall through semester ${row.semester}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.credits} credits · Saved {new Date(row.savedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-gradient">{row.gpa.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{row.kind === 'semester' ? 'SGPA' : 'CGPA'} / 10</p>
              </div>
              <button type="button" onClick={() => handleRemove(row)}
                aria-label={`Delete ${row.kind === 'semester' ? 'GPA for' : 'CGPA through'} semester ${row.semester}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

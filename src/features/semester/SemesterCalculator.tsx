import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calculator,
  GraduationCap,
  Layers,
  Save,
} from "lucide-react";
import { uid } from "@/domain/cgpa/cgpa";
import {
  computeSemesterCgpa,
  type SemesterEntry,
  type SemesterCgpaResult,
} from "@/domain/cgpa/semester-cgpa";
import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSavedCalculations } from "@/hooks/use-saved-calculations";
import { savedSemesterEntries } from "@/io/saved-calculations";
import { SaveCalculation } from "@/features/results/SaveCalculation";

interface SemesterCalculatorProps {
  onBack: () => void;
}

function emptySemester(semester: number): SemesterEntry {
  return { id: uid(), semester, sgpa: "", credits: "" };
}

export function SemesterCalculator({ onBack }: SemesterCalculatorProps) {
  const { records, error: storageError, saveMany } = useSavedCalculations();
  const [semesters, setSemesters] = useState<SemesterEntry[]>(() => {
    const saved = savedSemesterEntries(records);
    return saved.length ? saved : [emptySemester(1), emptySemester(2)];
  });
  const [result, setResult] = useState<SemesterCgpaResult | null>(null);

  const filledCount = useMemo(
    () => semesters.filter((s) => s.sgpa.trim() !== "").length,
    [semesters],
  );

  const update = (id: string, patch: Partial<SemesterEntry>) => {
    setSemesters((rows) => rows.map((row) => (row.id === id ? {
      ...row, ...patch,
      qualityPoints: patch.sgpa !== undefined || patch.credits !== undefined ? undefined : row.qualityPoints,
    } : row)));
    setResult(null);
  };

  const addSemester = () => {
    setSemesters((rows) => [...rows, emptySemester(Math.max(0, ...rows.map((row) => row.semester || 0)) + 1)]);
    setResult(null);
  };

  const removeSemester = (id: string) => {
    setSemesters((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.id !== id)));
    setResult(null);
  };

  const handleCalculate = () => {
    const filled = semesters.filter((row) => row.sgpa.trim() !== "");
    if (filled.some((row) => !Number.isSafeInteger(row.semester) || row.semester < 1)
      || new Set(filled.map((row) => row.semester)).size !== filled.length) {
      toast.error("Use a unique positive semester number for each row");
      return;
    }
    if (filled.some((row) => !Number.isFinite(Number(row.sgpa)) || Number(row.sgpa) < 0 || Number(row.sgpa) > 10
      || (row.credits.trim() !== "" && (!Number.isFinite(Number(row.credits)) || Number(row.credits) <= 0)))) {
      toast.error("Enter SGPAs from 0 to 10 and positive credits");
      return;
    }
    const computed = computeSemesterCgpa(semesters);
    if (!computed) {
      toast.error("Enter at least one valid SGPA between 0 and 10");
      return;
    }
    setResult(computed);
    toast.success("CGPA calculated!");
  };

  const loadSaved = () => {
    setSemesters(savedSemesterEntries(records));
    setResult(null);
    toast.success("Loaded saved semester GPAs");
  };

  const saveSemesters = () => {
    try {
      saveMany(semesters.filter((row) => row.sgpa.trim() !== "").map((row) => {
        const credits = row.credits.trim() === "" ? 1 : Number(row.credits);
        return { kind: 'semester', semester: row.semester, gpa: Number(row.sgpa), credits,
          qualityPoints: row.qualityPoints ?? Number(row.sgpa) * credits };
      }));
      toast.success("Semester GPAs saved on this browser");
    } catch {
      toast.error("Could not save semester GPAs. Check browser storage is available.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-10"
    >
      <div className="mb-6 mt-4 flex items-center gap-3 sm:mb-8 sm:mt-6">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Semester-wise CGPA</h2>
          <p className="text-sm text-muted-foreground">
            Enter your SGPA for each completed semester to get your current CGPA
          </p>
        </div>
      </div>

      {records.some((row) => row.kind === 'semester') && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>Your saved semester GPAs are available below. You can edit them before calculating.</p>
          <button type="button" onClick={loadSaved} className="rounded-xl bg-secondary px-4 py-2 font-medium text-secondary-foreground">Reload saved semesters</button>
        </div>
      )}
      {storageError && <p role="alert" className="mb-4 text-sm text-destructive">{storageError}</p>}

      <div className="glass-strong overflow-hidden rounded-[2rem]">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            <span>
              {filledCount} of {semesters.length} semester{semesters.length === 1 ? "" : "s"} filled
            </span>
          </div>
        </div>

        <div className="divide-y divide-border">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:px-5">
            <span>Semester</span>
            <span>SGPA</span>
            <span>Credits (optional)</span>
            <span className="sr-only">Remove</span>
          </div>

          <AnimatePresence initial={false}>
            {semesters.map((row, index) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5"
              >
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <span className="sm:sr-only">Semester</span>
                    <input type="number" min={1} step={1} inputMode="numeric" value={row.semester || ''}
                      aria-label={`Semester number for row ${index + 1}`}
                      onChange={(event) => update(row.id, { semester: Number(event.target.value) })}
                      className="w-20 rounded-xl border border-input bg-background/60 px-3 py-2.5 outline-none focus:border-primary" />
                  </label>
                </div>

                <label className="flex flex-col gap-1 sm:contents">
                  <span className="text-xs text-muted-foreground sm:hidden">SGPA</span>
                  <input
                    aria-label={`SGPA for semester ${row.semester}`}
                    type="number"
                    min={0}
                    max={10}
                    step={0.01}
                    inputMode="decimal"
                    placeholder="e.g. 9.25"
                    value={row.sgpa}
                    onChange={(e) => update(row.id, { sgpa: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </label>

                <label className="flex flex-col gap-1 sm:contents">
                  <span className="text-xs text-muted-foreground sm:hidden">Credits (optional)</span>
                  <input
                    aria-label={`Credits for semester ${row.semester}`}
                    type="number"
                    min={1}
                    step="any"
                    inputMode="decimal"
                    placeholder="Default: 1"
                    value={row.credits}
                    onChange={(e) => update(row.id, { credits: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeSemester(row.id)}
                  disabled={semesters.length <= 1}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition-colors",
                    semesters.length <= 1
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20",
                  )}
                  aria-label={`Remove semester ${row.semester}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <button
            type="button"
            onClick={addSemester}
            className="inline-flex items-center justify-center gap-2 rounded-xl glass-inset px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add semester
          </button>

          <button
            type="button"
            onClick={handleCalculate}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--gradient-text)" }}
          >
            <Calculator className="h-4 w-4" />
            Calculate CGPA
          </button>
        </div>
      </div>

      {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong mt-6 overflow-hidden rounded-[2rem] p-6 sm:p-8"
          >
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              <div className="flex flex-col items-center sm:items-start">
                <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  {result.classification.label}
                </span>

                <div className="mt-4 flex items-end gap-2">
                  <CountUp
                    value={result.cgpa}
                    decimals={2}
                    className="font-display text-6xl font-bold leading-none text-gradient sm:text-7xl"
                  />
                  <span className="pb-1 text-lg font-medium text-muted-foreground">/ 10</span>
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">Current CGPA</p>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  {result.classification.message}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 sm:ml-auto sm:w-auto">
                <StatCard label="Semesters" value={String(result.semesterCount)} />
                <StatCard label="Total credits" value={String(result.totalCredits)} />
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <button type="button" onClick={saveSemesters} disabled={Boolean(storageError)}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-50">
                <Save className="h-4 w-4" /> Save semester GPAs locally
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Saves each filled semester separately and updates matching semester numbers. Blank credits use a weight of 1.</p>
            </div>
            <div className="mt-5">
              <SaveCalculation key={`${result.cgpa}-${result.totalCredits}`} cumulative gpa={result.cgpa}
                credits={result.totalCredits} qualityPoints={result.totalQualityPoints}
                defaultSemester={Math.max(...semesters.filter((row) => row.sgpa.trim() !== '').map((row) => row.semester))} />
            </div>
          </motion.div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

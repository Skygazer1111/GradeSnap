import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Layers,
  ListChecks,
} from "lucide-react";
import {
  GRADE_OPTIONS,
  gradeToPoints,
  uid,
  type Subject,
} from "@/lib/cgpa";
import { cn } from "@/lib/utils";

interface DataReviewProps {
  subjects: Subject[];
  setSubjects: (s: Subject[]) => void;
  onCalculate: () => void;
  onBack: () => void;
}

type SortKey = "name" | "credits" | "grade";

export function DataReview({ subjects, setSubjects, onCalculate, onBack }: DataReviewProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const totals = useMemo(() => {
    const valid = subjects.filter((s) => s.credits > 0);
    return {
      subjects: subjects.length,
      credits: valid.reduce((a, s) => a + s.credits, 0),
    };
  }, [subjects]);

  const visible = useMemo(() => {
    const filtered = subjects.filter((s) =>
      s.name.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      let cmp;
      if (sort.key === "name") cmp = a.name.localeCompare(b.name);
      else if (sort.key === "credits") cmp = a.credits - b.credits;
      else cmp = a.points - b.points;
      return cmp * sort.dir;
    });
  }, [subjects, query, sort]);

  const update = (id: string, patch: Partial<Subject>) => {
    setSubjects(
      subjects.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (patch.grade !== undefined) next.points = gradeToPoints(patch.grade);
        return next;
      }),
    );
  };

  const remove = (id: string) => setSubjects(subjects.filter((s) => s.id !== id));

  const add = () =>
    setSubjects([
      ...subjects,
      { id: uid(), name: "New Subject", credits: 3, grade: "A", points: gradeToPoints("A") },
    ]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0"
    >
      <div className="glass-strong flex flex-1 flex-col overflow-hidden rounded-[2rem]">
        {/* header */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBack}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors hover:bg-muted"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold">Review extracted data</h3>
              <p className="truncate text-xs text-muted-foreground">
                Fix anything that looks off, then reveal your score
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subjects"
              className="glass-inset w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-shadow focus:glow-ring sm:w-56"
            />
          </div>
        </div>

        {/* quick counters (neutral — no CGPA spoiler) */}
        <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:px-5">
          <Counter icon={ListChecks} label="Subjects" value={totals.subjects} />
          <Counter icon={Layers} label="Total credits" value={totals.credits} />
        </div>

        {/* column header */}
        <div className="sticky top-0 z-10 grid grid-cols-[2rem_1fr_4.5rem_5rem_2.5rem] items-center gap-2 border-y border-border bg-card/50 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur sm:px-5">
          <span className="text-center">#</span>
          <SortButton label="Subject" active={sort.key === "name"} onClick={() => toggleSort("name")} />
          <SortButton label="Credits" active={sort.key === "credits"} onClick={() => toggleSort("credits")} center />
          <SortButton label="Grade" active={sort.key === "grade"} onClick={() => toggleSort("grade")} center />
          <span />
        </div>

        {/* rows */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 sm:px-3 min-h-0">
          <AnimatePresence initial={false}>
            {visible.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, height: 0, scale: 0.96 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="group grid grid-cols-[2rem_1fr_4.5rem_5rem_2.5rem] items-center gap-2 rounded-xl border border-transparent px-2 py-1 transition-colors hover:border-border hover:bg-secondary/40"
              >
                <span className="text-center text-xs font-medium tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <input
                  value={s.name}
                  onChange={(e) => update(s.id, { name: e.target.value })}
                  className="w-full rounded-lg bg-transparent px-2 py-2 text-sm font-medium outline-none transition-colors focus:bg-secondary"
                />
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={s.credits}
                    onChange={(e) => update(s.id, { credits: Number(e.target.value), flagged: false })}
                    className={cn(
                      "w-full rounded-lg px-2 py-2 text-center text-sm tabular-nums outline-none transition-colors focus:bg-secondary",
                      s.flagged
                        ? "bg-warning/10 text-warning ring-1 ring-warning/40"
                        : "bg-transparent"
                    )}
                    title={s.flagged ? "Credits may be missing or inferred. Please verify." : undefined}
                  />
                </div>
                <div
                  className="relative rounded-lg"
                  style={{ background: gradeTint(s.points) }}
                >
                  <select
                    value={GRADE_OPTIONS.includes(s.grade.toUpperCase()) ? s.grade.toUpperCase() : s.grade}
                    onChange={(e) => update(s.id, { grade: e.target.value })}
                    className="w-full cursor-pointer appearance-none rounded-lg bg-transparent px-2 py-2 text-center text-sm font-bold outline-none"
                    style={{ color: gradeColor(s.points) }}
                  >
                    {(GRADE_OPTIONS.includes(s.grade.toUpperCase())
                      ? GRADE_OPTIONS
                      : [s.grade, ...GRADE_OPTIONS]
                    ).map((g) => (
                      <option key={g} value={g} className="bg-popover text-popover-foreground">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  aria-label="Delete subject"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-60 transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <BookOpen className="h-6 w-6" />
              No subjects {query ? "match your search" : "yet"}.
            </div>
          )}
        </div>

        {/* add row */}
        <div className="px-3 pb-2 pt-1 sm:px-4">
          <button
            onClick={add}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add subject
          </button>
        </div>

        {/* reveal footer */}
        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-xs text-muted-foreground">
            Your CGPA stays hidden until you reveal it.
          </p>
          <button
            onClick={onCalculate}
            disabled={totals.credits === 0}
            className="group flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-display font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gradient-text)" }}
          >
            <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" /> Reveal my CGPA
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Soft tint behind a grade pill, derived from grade points (semantic tokens). */
function gradeTint(points: number): string {
  return `color-mix(in oklab, ${gradeColor(points)} 16%, transparent)`;
}

function gradeColor(points: number): string {
  if (points >= 9) return "var(--success)";
  if (points >= 7) return "var(--primary)";
  if (points >= 5) return "var(--warning)";
  return "var(--destructive)";
}

function SortButton({
  label,
  active,
  onClick,
  center,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  center?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 transition-colors hover:text-foreground",
        center ? "justify-center" : "text-left",
        active && "text-primary",
      )}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

function Counter({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl glass-inset px-3 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="font-display text-lg font-bold leading-none tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

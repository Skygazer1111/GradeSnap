import { useMemo, useState, useRef, forwardRef } from "react";
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
} from "@/domain/cgpa/cgpa";
import { cn } from "@/lib/utils";
import { Popover } from "@/components/ui/popover";

interface DataReviewProps {
  subjects: Subject[];
  setSubjects: (s: Subject[]) => void;
  onCalculate: () => void;
  onBack: () => void;
}

type SortKey = "name" | "credits" | "grade";

export function DataReview({ subjects, setSubjects, onCalculate, onBack }: DataReviewProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey | null; dir: 1 | -1 }>({ key: null, dir: 1 });
  const [focusId, setFocusId] = useState<string | null>(null);

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
    if (sort.key === null) return filtered;

    return [...filtered].sort((a, b) => {
      let cmp;
      if (sort.key === "name") {
        const aEmpty = !a.name.trim();
        const bEmpty = !b.name.trim();
        if (aEmpty && !bEmpty) return 1;
        if (!aEmpty && bEmpty) return -1;
        cmp = a.name.localeCompare(b.name);
      } else if (sort.key === "credits") cmp = a.credits - b.credits;
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

  const add = () => {
    const id = uid();
    setSubjects([
      ...subjects,
      { id, name: "", credits: 3, grade: "A", points: gradeToPoints("A") },
    ]);
    setFocusId(id);
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 },
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-1 flex-col"
    >
      <div className="glass-strong flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem]">
        {/* header */}
        <div className="shrink-0 flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-5">
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

        {/* quick counters */}
        <div className="shrink-0 grid grid-cols-2 gap-3 px-4 py-3 sm:px-5">
          <Counter icon={ListChecks} label="Subjects" value={totals.subjects} />
          <Counter icon={Layers} label="Total credits" value={totals.credits} />
        </div>

        {/* column header — desktop table only */}
        <div className="sticky top-0 z-10 hidden shrink-0 grid-cols-[2rem_1fr_4.5rem_5rem_2.5rem] items-center gap-2 border-y border-border bg-card/50 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur sm:grid sm:px-5">
          <span className="text-center">#</span>
          <SortButton label="Subject" active={sort.key === "name"} onClick={() => toggleSort("name")} />
          <SortButton label="Credits" active={sort.key === "credits"} onClick={() => toggleSort("credits")} center />
          <SortButton label="Grade" active={sort.key === "grade"} onClick={() => toggleSort("grade")} center />
          <span />
        </div>

        {/* rows + add subject (scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
          <AnimatePresence initial={false}>
            {visible.map((s, i) => (
              <DataReviewRow
                key={s.id}
                s={s}
                i={i}
                update={update}
                remove={remove}
                autoFocusName={s.id === focusId}
                onNameFocused={() => setFocusId(null)}
              />
            ))}
          </AnimatePresence>

          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <BookOpen className="h-6 w-6" />
              No subjects {query ? "match your search" : "yet"}.
            </div>
          )}

          <div className="mt-2 px-1 pb-1">
            <button
              type="button"
              onClick={add}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Add subject
            </button>
          </div>
        </div>

        {/* reveal footer */}
        <div className="shrink-0 flex flex-col gap-3 border-t border-border bg-card/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Your CGPA stays hidden until you reveal it.
          </p>
          <button
            type="button"
            onClick={onCalculate}
            disabled={totals.credits === 0}
            className="group flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 font-display font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
  icon: typeof import("lucide-react").Layers;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl glass-inset px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="font-display text-sm font-semibold tracking-wide text-muted-foreground">
        {label} : <span className="font-bold text-foreground">{value}</span>
      </div>
    </div>
  );
}

const DataReviewRow = forwardRef<HTMLDivElement, {
  s: Subject;
  i: number;
  update: (id: string, patch: Partial<Subject>) => void;
  remove: (id: string) => void;
  autoFocusName?: boolean;
  onNameFocused?: () => void;
}>(function DataReviewRow({ s, i, update, remove, autoFocusName, onNameFocused }, ref) {
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="mb-1.5 last:mb-0"
    >
      {/* Mobile card */}
      <div className="space-y-1.5 rounded-lg border border-border/50 bg-secondary/20 p-2 sm:hidden">
        <div className="flex items-center gap-1.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-[0.65rem] font-bold text-muted-foreground">
            {i + 1}
          </span>
          <input
            value={s.name}
            onChange={(e) => update(s.id, { name: e.target.value })}
            placeholder="Subject name"
            autoFocus={autoFocusName}
            onFocus={autoFocusName ? onNameFocused : undefined}
            className="min-w-0 flex-1 rounded-md bg-background/50 px-2 py-1.5 text-xs font-medium outline-none transition-colors placeholder:text-muted-foreground/60 focus:bg-background"
          />
          <button
            type="button"
            onClick={() => remove(s.id)}
            aria-label="Delete subject"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-destructive transition-colors hover:bg-destructive/15 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pl-7">
          <CreditsPicker s={s} update={update} compact />
          <GradePicker s={s} update={update} compact />
        </div>
      </div>

      {/* Desktop table row */}
      <div className="group hidden grid-cols-[2rem_1fr_4.5rem_5rem_2.5rem] items-center gap-2 rounded-xl border border-transparent px-2 py-1 transition-colors hover:border-border hover:bg-secondary/40 sm:grid">
        <span className="text-center text-xs font-medium tabular-nums text-muted-foreground">
          {i + 1}
        </span>
        <input
          value={s.name}
          onChange={(e) => update(s.id, { name: e.target.value })}
          placeholder="Subject name"
          autoFocus={autoFocusName}
          onFocus={autoFocusName ? onNameFocused : undefined}
          className="w-full rounded-lg bg-transparent px-2 py-2 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground/60 focus:bg-secondary"
        />
        <CreditsPicker s={s} update={update} />
        <GradePicker s={s} update={update} />
        <button
          type="button"
          onClick={() => remove(s.id)}
          aria-label="Delete subject"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-60 transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100 active:scale-75"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
});

function CreditsPicker({
  s,
  update,
  compact,
}: {
  s: Subject;
  update: (id: string, patch: Partial<Subject>) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={cn("relative", compact && "w-full")}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(true)}
        title={s.flagged ? "Credits may be missing or inferred. Please verify." : undefined}
        className={cn(
          "w-full rounded-md px-1.5 py-1.5 text-center text-xs tabular-nums outline-none transition-colors hover:bg-secondary active:scale-95 sm:rounded-lg sm:px-2 sm:py-2 sm:text-sm",
          compact && "bg-background/50",
          s.flagged
            ? "bg-warning/10 text-warning ring-1 ring-warning/40 hover:bg-warning/20"
            : "bg-transparent",
          open && "bg-secondary",
        )}
      >
        {compact ? `Cr: ${s.credits}` : s.credits}
      </button>
      <Popover
        isOpen={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="center"
        modal={compact}
        title={compact ? "Select credits" : undefined}
        className={compact ? undefined : "w-48 p-2"}
      >
        <div className={cn("grid grid-cols-4 gap-2", compact ? "p-4" : "")}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 10, 12].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                update(s.id, { credits: c, flagged: false });
                setOpen(false);
              }}
              className={cn(
                "rounded-lg py-2 text-sm font-medium tabular-nums transition-colors hover:bg-secondary active:scale-95",
                s.credits === c && "bg-primary/20 text-primary hover:bg-primary/30",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function GradePicker({
  s,
  update,
  compact,
}: {
  s: Subject;
  update: (id: string, patch: Partial<Subject>) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={cn("relative", compact && "w-full")}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-md px-1.5 py-1.5 text-center text-xs font-bold outline-none transition-transform hover:brightness-110 active:scale-95 sm:rounded-lg sm:px-2 sm:py-2 sm:text-sm",
          open && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background",
        )}
        style={{ background: gradeTint(s.points), color: gradeColor(s.points) }}
      >
        {compact ? s.grade.toUpperCase() : s.grade.toUpperCase()}
      </button>
      <Popover
        isOpen={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="center"
        modal={compact}
        title={compact ? "Select grade" : undefined}
        className={compact ? undefined : "w-48 p-2"}
      >
        <div className={cn("grid grid-cols-4 gap-2", compact ? "p-4" : "")}>
          {GRADE_OPTIONS.map((g) => {
            const pts = gradeToPoints(g);
            const isSelected = s.grade.toUpperCase() === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  update(s.id, { grade: g });
                  setOpen(false);
                }}
                className={cn(
                  "rounded-lg py-2 text-center text-sm font-bold transition-all hover:scale-[1.05] active:scale-95",
                  isSelected ? "ring-2 ring-primary/50" : "hover:bg-secondary",
                )}
                style={
                  isSelected
                    ? {
                        background: gradeTint(pts),
                        color: gradeColor(pts),
                      }
                    : {
                        color: "var(--foreground)",
                      }
                }
              >
                {g}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

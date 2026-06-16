import { useRef } from "react";
import { motion } from "motion/react";
import { Sparkles, Trophy, Star } from "lucide-react";
import type { CgpaSummary } from "@/domain/cgpa/cgpa";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreMeter } from "./ScoreMeter";
import { Celebration } from "./Celebration";
import { InsightCards } from "./InsightCards";
import { ExportBar } from "./ExportBar";

interface CgpaResultProps {
  summary: CgpaSummary;
  onReset: () => void;
}

export function CgpaResult({ summary, onReset }: CgpaResultProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const { classification: cls } = summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
    >
      {/* hero result card (captured for PNG export) */}
      <div ref={captureRef} className="glass-strong relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <Celebration tier={cls.tier} />

        <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
              {cls.tier === "outstanding" ? (
                <Trophy className="h-3.5 w-3.5 text-warning" />
              ) : cls.tier === "support" ? (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Star className="h-3.5 w-3.5 text-primary" />
              )}
              {cls.label}
            </span>

            <div className="mt-4 flex items-end gap-2">
              <CountUp
                value={summary.cgpa}
                decimals={2}
                className="font-display text-7xl font-bold leading-none text-gradient sm:text-8xl"
              />
              <span className="pb-2 text-xl font-medium text-muted-foreground sm:text-2xl">/ 10</span>
            </div>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Cumulative GPA</p>

            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{cls.message}</p>

            <div className="mt-5 flex gap-3">
              <MiniStat label="Subjects" value={summary.totalSubjects} />
              <MiniStat label="Credits" value={summary.totalCredits} />
              <MiniStat label="Quality pts" value={Math.round(summary.weightedPoints)} />
            </div>
          </div>

          <div className="relative grid shrink-0 place-items-center">
            <ScoreMeter value={summary.cgpa} />
            <div className="absolute flex flex-col items-center">
              <CountUp
                value={summary.cgpa}
                decimals={1}
                className="font-display text-4xl font-bold text-gradient"
              />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">out of 10</span>
            </div>
          </div>
        </div>
      </div>

      <InsightCards summary={summary} />

      <ExportBar summary={summary} captureRef={captureRef} onReset={onReset} />
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-inset rounded-xl px-3 py-2 text-center">
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

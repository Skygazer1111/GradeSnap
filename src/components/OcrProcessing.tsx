import { motion } from "motion/react";
import { Check, Loader2, ScanLine } from "lucide-react";
import { OCR_STAGES } from "@/lib/ocr";
import { cn } from "@/lib/utils";

interface OcrProcessingProps {
  activeStage: number;
  fraction: number;
}

export function OcrProcessing({ activeStage, fraction }: OcrProcessingProps) {
  const overall =
    ((activeStage + Math.min(1, Math.max(0, fraction))) / OCR_STAGES.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] p-7 sm:p-10"
    >
      <div className="flex items-center gap-4">
        <div className="animate-spin-slow relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl glow-ring">
          <ScanLine className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold sm:text-xl">
            Analyzing your gradesheet
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            Running an in-browser AI pipeline — nothing is uploaded.
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="font-display text-2xl font-bold text-gradient">
            {Math.round(overall)}%
          </div>
        </div>
      </div>

      {/* overall bar */}
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--gradient-text)" }}
          animate={{ width: `${overall}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      <ul className="mt-7 space-y-2.5">
        {OCR_STAGES.map((stage, i) => {
          const done = i < activeStage;
          const active = i === activeStage;
          return (
            <motion.li
              key={stage.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active && "glass-inset",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
                  done && "border-transparent bg-success text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/70",
                )}
              >
                {stage.label}
              </span>
              {active && (
                <span className="ml-auto text-xs font-medium text-primary">
                  {Math.round(fraction * 100)}%
                </span>
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

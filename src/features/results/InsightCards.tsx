import { motion } from "motion/react";
import { Layers, Award, Target, GraduationCap } from "lucide-react";
import { classify, type CgpaSummary } from "@/domain/cgpa/cgpa";

interface InsightCardsProps {
  summary: CgpaSummary;
}

export function InsightCards({ summary }: InsightCardsProps) {
  const scaleProgress = Math.min(100, Math.round((summary.cgpa / 10) * 100));

  // Distance to the next standing tier (purely derived, no storage needed).
  const thresholds = [6, 7, 8, 9, 10];
  const next = thresholds.find((t) => t > summary.cgpa + 1e-9);
  const nextCard =
    next === undefined
      ? { value: "Top tier", sub: "Maxed out the scale" }
      : {
          value: `+${(next - summary.cgpa).toFixed(2)}`,
          sub: `to ${classify(next).label}`,
        };

  const cards = [
    {
      icon: Layers,
      label: "Total Credits",
      value: String(summary.totalCredits),
      sub: `${summary.totalSubjects} subjects`,
    },
    {
      icon: Award,
      label: "Quality Points",
      value: String(Math.round(summary.weightedPoints)),
      sub: "credits × grade points",
    },
    {
      icon: Target,
      label: "Next Milestone",
      value: nextCard.value,
      sub: nextCard.sub,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08 }}
          className="glass hover-lift rounded-2xl p-4 sm:p-5"
        >
          <c.icon className="h-5 w-5 text-primary" />
          <div className="mt-3 font-display text-2xl font-bold leading-none tabular-nums">{c.value}</div>
          <div className="mt-1 text-sm font-medium">{c.label}</div>
          <div className="text-xs text-muted-foreground">{c.sub}</div>
        </motion.div>
      ))}

      {/* scale progress card spans full width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass col-span-1 rounded-2xl p-5 sm:col-span-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-medium">Score Progress</span>
          </div>
          <span className="font-display text-lg font-bold text-gradient">{scaleProgress}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-text)" }}
            initial={{ width: 0 }}
            animate={{ width: `${scaleProgress}%` }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

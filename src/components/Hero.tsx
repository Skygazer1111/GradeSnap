import { motion } from "motion/react";
import { ShieldCheck, Cpu, Lock } from "lucide-react";

export function Hero() {
  return (
    <div className="mx-auto max-w-3xl text-center">

      <motion.h1
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 font-display text-5xl font-bold tracking-tight sm:text-7xl"
      >
        <span className="text-gradient">GradeSnap</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-3 font-display text-lg font-medium text-foreground/90 sm:text-2xl"
      >
        Smart CGPA Calculator
      </motion.p>


      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.26 }}
        className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-success" /> Zero uploads
        </span>
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" /> In-browser OCR
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Fully private
        </span>
      </motion.div>
    </div>
  );
}

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/features/upload/Hero";
import { UploadCard } from "@/features/upload/UploadCard";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { OcrProcessing } from "@/features/upload/OcrProcessing";
import { DataReview } from "@/features/review/DataReview";
import { CgpaResult } from "@/features/results/CgpaResult";
import { TeamPage } from "@/features/about/TeamPage";
import { computeCgpa, type Subject, type CgpaSummary } from "@/domain/cgpa/cgpa";
import { runOcr, demoSubjects } from "@/domain/ocr/orchestration/ocr";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export function App() {
  const [stage, setStage] = useState<"idle" | "processing" | "review" | "result" | "team">("idle");
  const [ocrStage, setOcrStage] = useState(0);
  const [ocrFraction, setOcrFraction] = useState(0);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [summary, setSummary] = useState<CgpaSummary | null>(null);

  const abortRef = useRef(false);

  const handleFile = useCallback(async (file: File) => {
    setStage("processing");
    setOcrStage(0);
    setOcrFraction(0);
    abortRef.current = false;

    try {
      const result = await runOcr(file, (idx, frac) => {
        if (abortRef.current) throw new Error("aborted");
        setOcrStage(idx);
        setOcrFraction(frac);
      });
      setSubjects(result.subjects);
      setStage("review");
      if (result.subjects.length > 0) {
        toast.success(`Extracted ${result.subjects.length} subjects`);
      } else {
        toast.error("Couldn't find any subjects. Try taking a clearer photo.");
      }
    } catch (err: any) {
      if (err.message === "aborted") return;
      toast.error("Analysis failed. Please try a different image.");
      setStage("idle");
    }
  }, []);

  const handleDemo = useCallback(() => {
    setSubjects(demoSubjects());
    setStage("review");
    toast.success("Loaded demo gradesheet");
  }, []);

  const handleCalculate = useCallback(() => {
    const valid = subjects.filter((s) => s.credits > 0);
    if (valid.length === 0) {
      toast.error("Add at least one valid subject to calculate CGPA");
      return;
    }
    const res = computeCgpa(valid);
    setSummary(res);
    setStage("result");
    toast.success("CGPA Calculated!");
  }, [subjects]);

  const reset = useCallback(() => {
    setStage("idle");
    setSubjects([]);
    setSummary(null);
  }, []);

  const handleManualEntry = useCallback(() => {
    setSubjects([]); // Start with empty so they can add via the review screen
    setStage("review");
  }, []);

  const openTeamPage = useCallback(() => {
    setStage("team");
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col px-4 pb-6 sm:px-6",
        stage === "review" ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"
      )}
    >
      <AnimatedBackground />
      <div className="shrink-0">
        <Header />
      </div>

      <main className="mx-auto mt-6 flex w-full max-w-6xl flex-1 flex-col sm:mt-10 min-h-0">
        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 pb-10"
            >
              <Hero />
              <UploadCard onFile={handleFile} onDemo={handleDemo} />
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleManualEntry}
                  className="group flex items-center justify-center gap-2 rounded-xl glass-inset px-6 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground hover:shadow-sm sm:w-72"
                >
                  Or enter your grades manually
                </button>
                <button
                  type="button"
                  onClick={openTeamPage}
                  className="group flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/60 px-6 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground hover:shadow-sm sm:w-72"
                >
                  <Users className="h-4 w-4 text-primary" />
                  Our team
                </button>
              </div>
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <OcrProcessing activeStage={ocrStage} fraction={ocrFraction} />
            </motion.div>
          )}

          {stage === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col min-h-0 pb-4"
            >
              <DataReview
                subjects={subjects}
                setSubjects={setSubjects}
                onCalculate={handleCalculate}
                onBack={reset}
              />
            </motion.div>
          )}

          {stage === "result" && summary && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pb-10"
            >
              <CgpaResult summary={summary} onReset={reset} />
            </motion.div>
          )}

          {stage === "team" && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-1"
            >
              <TeamPage onBack={reset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

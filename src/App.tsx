import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { UploadCard } from "@/components/UploadCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { OcrProcessing } from "@/components/OcrProcessing";
import { DataReview } from "@/components/DataReview";
import { CgpaResult } from "@/components/CgpaResult";
import { computeCgpa, type Subject, type CgpaSummary } from "@/lib/cgpa";
import { runOcr, demoSubjects } from "@/lib/ocr";
import { toast } from "sonner";

export function App() {
  const [stage, setStage] = useState<"idle" | "processing" | "review" | "result">("idle");
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

  return (
    <div className="relative min-h-screen px-4 pb-20 sm:px-6">
      <AnimatedBackground />
      <Header />

      <main className="mx-auto mt-12 max-w-6xl sm:mt-20">
        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-12"
            >
              <Hero />
              <UploadCard onFile={handleFile} onDemo={handleDemo} />
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
            >
              <CgpaResult summary={summary} onReset={reset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

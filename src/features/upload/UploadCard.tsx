import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UploadCloud, ImageIcon, FileCheck2, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  onFile: (file: File) => void;
  onDemo: () => void;
}

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/bmp"];

export function UploadCard({ onFile, onDemo }: UploadCardProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPT.includes(file.type)) return;
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
      // small delay so the success pulse is visible
      setTimeout(() => onFile(file), 650);
    },
    [onFile],
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        animate={{ scale: dragging ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={cn(
          "glass-strong hover-lift group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12",
          dragging && "glow-ring",
        )}
      >
        {/* shimmer sweep on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="shimmer absolute inset-0" />
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="animate-pulse-glow relative h-40 w-40 overflow-hidden rounded-2xl border border-border">
                <img src={preview} alt="Gradesheet preview" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileCheck2 className="h-4 w-4 text-success" />
                <span className="max-w-[14rem] truncate">{fileName}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex flex-col items-center gap-5"
            >
              <motion.div
                animate={{ y: dragging ? -6 : 0 }}
                className="relative grid h-20 w-20 place-items-center rounded-3xl"
                style={{ background: "var(--gradient-text)" }}
              >
                <UploadCloud className="h-9 w-9 text-primary-foreground" strokeWidth={1.8} />
              </motion.div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-semibold sm:text-2xl">
                  {dragging ? "Drop to analyze" : "Drop your gradesheet here"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  or <span className="font-semibold text-primary">browse files</span> from your device
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> PNG · JPG · WEBP · BMP
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> Processed locally
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <button
          onClick={onDemo}
          className="flex items-center gap-1.5 font-medium text-primary transition-opacity hover:opacity-80"
        >
          <Sparkles className="h-3.5 w-3.5" /> Try a sample
        </button>
      </div>
    </div>
  );
}

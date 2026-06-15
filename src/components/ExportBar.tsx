import { useState, type RefObject } from "react";
import { Copy, Download, Share2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { CgpaSummary } from "@/lib/cgpa";
import { cn } from "@/lib/utils";

interface ExportBarProps {
  summary: CgpaSummary;
  captureRef: RefObject<HTMLElement | null>;
  onReset: () => void;
}

export function ExportBar({ summary, captureRef, onReset }: ExportBarProps) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const summaryText = `GradeSnap — CGPA ${summary.cgpa.toFixed(2)}/10 (${summary.classification.label}) across ${summary.totalSubjects} subjects and ${summary.totalCredits} credits. Calculated privately in-browser.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast.success("Result copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const exportPng = async () => {
    if (!captureRef.current) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim(),
      });
      const link = document.createElement("a");
      link.download = `gradesnap-cgpa-${summary.cgpa.toFixed(2)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My GradeSnap CGPA", text: summaryText });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <ExportButton onClick={copy} primary>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy Result"}
      </ExportButton>
      <ExportButton onClick={exportPng}>
        <Download className={cn("h-4 w-4", busy && "animate-bounce")} />
        {busy ? "Exporting…" : "Export PNG"}
      </ExportButton>
      <ExportButton onClick={share}>
        <Share2 className="h-4 w-4" />
        Share
      </ExportButton>
      <ExportButton onClick={onReset}>
        <RotateCcw className="h-4 w-4" />
        New
      </ExportButton>
    </div>
  );
}

function ExportButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.04] active:scale-95",
        primary
          ? "text-primary-foreground"
          : "glass text-foreground hover:glow-ring",
      )}
      style={primary ? { background: "var(--gradient-text)" } : undefined}
    >
      {children}
    </button>
  );
}

import { ArrowLeft } from "lucide-react";

interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col pb-10">
      <div className="mb-6 mt-4 sm:mb-8 sm:mt-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to calculator
        </button>
      </div>

      <section className="relative w-full rounded-3xl border border-border/40 bg-gradient-to-b from-zinc-950/80 via-zinc-950/60 to-black/80 px-6 py-10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_10%_-10%,rgba(56,189,248,0.24),transparent_55%),radial-gradient(circle_at_90%_110%,rgba(236,72,153,0.26),transparent_55%)] opacity-80" />
        <div className="relative space-y-6 text-muted-foreground">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl mb-6">
            Privacy Policy
          </h2>
          <p>
            This Privacy Policy describes how your information is collected, used, and shared when you use our CGPA Calculator.
          </p>
          <h3 className="text-xl font-medium text-foreground mt-4">Information We Collect</h3>
          <p>
            When you upload a gradesheet, the image is processed locally in your browser to extract your grades. We do not upload your images or extracted academic data to a server or OCR provider.
          </p>
          <h3 className="text-xl font-medium text-foreground mt-4">How We Use Your Information</h3>
          <p>
            The extracted data is used to compute your GPA or CGPA in your browser. If you choose Save locally, we store the result, semester number, credits, quality points, and save date in this browser's local storage so you can revisit it and calculate your overall CGPA. Saved results remain after refreshing or closing the app. You can delete them from Saved calculations; clearing site data also removes them. They do not sync across browsers or devices. Unsaved calculations and uploaded images are not retained.
          </p>
          <h3 className="text-xl font-medium text-foreground mt-4">Changes</h3>
          <p>
            We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons.
          </p>
        </div>
      </section>
    </div>
  );
}

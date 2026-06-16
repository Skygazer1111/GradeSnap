import { ArrowLeft } from "lucide-react";

interface TermsPageProps {
  onBack: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
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
            Terms of Service
          </h2>
          <p>
            Welcome to our CGPA Calculator. By using our service, you agree to these terms.
          </p>
          <h3 className="text-xl font-medium text-foreground mt-4">1. Acceptance of Terms</h3>
          <p>
            By accessing and using this application, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
          <h3 className="text-xl font-medium text-foreground mt-4">2. Description of Service</h3>
          <p>
            We provide a tool to extract and calculate your CGPA from gradesheets. The accuracy of the extracted data depends on the image quality, and users are responsible for verifying the extracted grades before calculating the final CGPA.
          </p>
          <h3 className="text-xl font-medium text-foreground mt-4">3. Privacy</h3>
          <p>
            Your privacy is important to us. We process your gradesheets locally on your device or via secure OCR APIs, and we do not store your personal academic data persistently without your explicit consent.
          </p>
        </div>
      </section>
    </div>
  );
}

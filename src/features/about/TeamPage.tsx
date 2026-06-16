import { ArrowLeft, Github, Linkedin } from "lucide-react";

interface TeamPageProps {
  onBack: () => void;
}

interface TeamMemberProps {
  name: string;
  role: string;
  githubUrl: string;
  linkedinUrl: string;
  imageUrl: string;
}

function TeamMemberCard({ name, role, githubUrl, linkedinUrl, imageUrl }: TeamMemberProps) {
  return (
    <div className="group relative flex flex-col items-center rounded-3xl bg-black/30 p-[2px] shadow-[0_18px_45px_rgba(0,0,0,0.6)]">
      <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_0_0,#4f46e5,transparent_55%),radial-gradient(circle_at_100%_100%,#ec4899,transparent_55%)] opacity-60 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex h-72 w-52 flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4">
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-700/60 via-zinc-800/70 to-zinc-900/80">
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />

          <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          </div>

          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 translate-y-2">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/85 text-zinc-100 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-zinc-800"
              aria-label={`${name} GitHub`}
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-sky-500"
              aria-label={`${name} LinkedIn`}
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-4 space-y-1 text-left">
          <p className="font-display text-lg font-semibold text-foreground/95">{name}</p>
          <p className="text-sm font-medium text-muted-foreground/80">{role}</p>
        </div>
      </div>
    </div>
  );
}

export function TeamPage({ onBack }: TeamPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col pb-10">
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
        <div className="relative space-y-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Our Team
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10">
            <TeamMemberCard
              name="Priyan"
              role="Developer"
              githubUrl="https://github.com/Skygazer1111"
              linkedinUrl="https://www.linkedin.com/in/priyan-rajarajan-b8128b2a2"
              imageUrl="/images/priyan.png"
            />
            <TeamMemberCard
              name="Dhanush"
              role="Developer"
              githubUrl="https://github.com/Cosmos-0118"
              linkedinUrl="https://www.linkedin.com/in/dhanushs-dev/"
              imageUrl="/images/dhanush.jpeg"
            />
          </div>
        </div>
      </section>
    </div>
  );
}


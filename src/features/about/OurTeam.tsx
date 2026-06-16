import { Github, Linkedin } from "lucide-react";

interface TeamMemberProps {
  name: string;
  role: string;
  githubUrl: string;
  linkedinUrl: string;
}

function TeamMemberCard({ name, role, githubUrl, linkedinUrl }: TeamMemberProps) {
  return (
    <div className="group relative flex flex-col items-center rounded-3xl bg-black/30 p-[2px] shadow-[0_18px_45px_rgba(0,0,0,0.6)]">
      <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_0_0,#4f46e5,transparent_55%),radial-gradient(circle_at_100%_100%,#ec4899,transparent_55%)] opacity-60 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex h-64 w-48 flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4">
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-700/60 via-zinc-800/70 to-zinc-900/80">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground/80">
            Photo placeholder
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="shimmer absolute inset-0" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 via-black/70 to-transparent opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/90 text-zinc-100 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-sky-500"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-4 space-y-1 text-left">
          <p className="font-display text-sm font-semibold text-foreground/95">{name}</p>
          <p className="text-xs font-medium text-muted-foreground/80">{role}</p>
        </div>
      </div>
    </div>
  );
}

export function OurTeamSection() {
  return (
    <section
      id="our-team"
      className="relative mt-16 w-full rounded-3xl border border-border/40 bg-gradient-to-b from-zinc-950/80 via-zinc-950/60 to-black/80 px-6 py-10 sm:px-10 sm:py-12"
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_10%_-10%,rgba(56,189,248,0.24),transparent_55%),radial-gradient(circle_at_90%_110%,rgba(236,72,153,0.26),transparent_55%)] opacity-80" />
      <div className="relative space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-primary/80">
            DEVELOPERS
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            The student builders who made it real
          </h2>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">
            Meet the core team behind GradeSnap. Hover over a card to find their GitHub and
            LinkedIn profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <TeamMemberCard
            name="Priyan"
            role="Developer"
            githubUrl="https://github.com/Skygazer1111"
            linkedinUrl="https://www.linkedin.com/in/priyan-rajarajan-b8128b2a2 "
          />
          <TeamMemberCard
            name="Dhanush"
            role="Developer"
            githubUrl="https://github.com/Cosmos-0118"
            linkedinUrl="https://www.linkedin.com/in/dhanushs-dev/"
          />
        </div>
      </div>
    </section>
  );
}


import { motion } from "motion/react";
import { Check } from "lucide-react";
import { THEMES, useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="glass flex items-center gap-1 rounded-full p-1.5">
      {THEMES.map((t) => {
        const active = theme === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            aria-label={`${t.label} theme`}
            aria-pressed={active}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-pill"
                className="absolute inset-0 rounded-full bg-secondary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className="relative z-10 h-4 w-4 shrink-0 rounded-full border border-border"
              style={{
                background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`,
              }}
            />

            <span className="relative z-10 hidden sm:inline">{t.label}</span>
            {active && <Check className="relative z-10 hidden h-3.5 w-3.5 sm:inline" />}
          </button>
        );
      })}
    </div>
  );
}

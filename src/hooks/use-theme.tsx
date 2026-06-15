import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "crimson";

// eslint-disable-next-line react-refresh/only-export-components
export const THEMES: { key: Theme; label: string; swatch: string[] }[] = [
  { key: "light", label: "Aurora", swatch: ["#7c5cff", "#4aa8ff", "#e9ecff"] },
  { key: "dark", label: "Neon", swatch: ["#22d3ee", "#a855f7", "#0f1626"] },
  { key: "crimson", label: "Crimson", swatch: ["#ff2d55", "#b00020", "#050505"] },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

const STORAGE_KEY = "gradesnap-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" &&
      localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const initial: Theme =
      stored && ["light", "dark", "crimson"].includes(stored) ? stored : "dark";
    // eslint-disable-next-line
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}

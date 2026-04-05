"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppTheme = "light" | "dark";

const STORAGE_KEY = "baps-theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDomTheme(t: AppTheme) {
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const initial: AppTheme = raw === "dark" ? "dark" : "light";
      setThemeState(initial);
      applyDomTheme(initial);
    } catch {
      applyDomTheme("light");
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    applyDomTheme(t);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, mounted }),
    [theme, setTheme, mounted]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}

export { STORAGE_KEY as THEME_STORAGE_KEY };

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/config/storage-keys";

const ThemeContext = createContext(null);
const STORAGE_KEY = STORAGE_KEYS.theme;

function resolveThemePreference(preference) {
  if (preference === "dark" || preference === "light") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialPreference() {
  if (typeof window === "undefined") return "light";
  migrateStorageKey(LEGACY_STORAGE_KEYS.theme, STORAGE_KEY);
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialPreference);
  const resolvedTheme = resolveThemePreference(theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [resolvedTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme: () => setTheme((current) => (resolveThemePreference(current) === "dark" ? "light" : "dark")),
    }),
    [resolvedTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

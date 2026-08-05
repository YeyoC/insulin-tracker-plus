import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "insulina:theme";
const THEME_EVENT = "insulina:theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : systemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function useTheme() {
  const [theme, setCurrentTheme] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => {
      const next = getTheme();
      applyTheme(next);
      setCurrentTheme(next);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (!window.localStorage.getItem(THEME_KEY)) sync();
    };

    sync();
    window.addEventListener(THEME_EVENT, sync);
    media.addEventListener("change", syncSystemTheme);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      media.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
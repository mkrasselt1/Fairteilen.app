"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>("light");
  const label = theme === "dark" ? t("Helles Design") : t("Dunkles Design");

  useEffect(() => {
    const stored = (localStorage.getItem("fairteilen-theme") as Theme | null) ?? null;
    const initial: Theme =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("fairteilen-theme", next);
    } catch {
      /* Speicher nicht verfügbar – dann gilt die Einstellung nur für diese Sitzung. */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

/** Verhindert Aufblitzen des hellen Designs beim ersten Rendern. */
export const themeScript = `
try {
  var t = localStorage.getItem('fairteilen-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

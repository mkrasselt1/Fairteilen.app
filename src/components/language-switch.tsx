"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n";
import { useLocale } from "@/components/i18n";

/**
 * Umschalter zwischen Deutsch und Englisch. Ein einfacher Verweis, damit er
 * auch ohne JavaScript funktioniert; die Wahl landet in einem Cookie und gilt
 * ab dann vor der Browsersprache.
 */
function Switch({ className }: { className: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const back = search ? `${pathname}?${search}` : pathname;

  return (
    <div className={`inline-flex items-center gap-1 text-xs ${className}`} aria-label="Sprache / Language">
      {LOCALES.map((locale) => (
        <Link
          key={locale}
          href={`/api/sprache/${locale}?zurueck=${encodeURIComponent(back)}`}
          prefetch={false}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={`rounded-md px-2 py-1 font-medium transition ${
            locale === current
              ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {locale === "de" ? "DE" : "EN"}
          <span className="sr-only"> – {LOCALE_NAMES[locale]}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * useSearchParams verlangt eine Suspense-Grenze, sonst fällt beim Bauen die
 * ganze Seite in die dynamische Auslieferung.
 */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <Switch className={className} />
    </Suspense>
  );
}

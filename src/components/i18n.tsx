"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, INTL_LOCALES, translator, type Locale, type Translate } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Gibt die vom Server ermittelte Sprache an alle Client-Komponenten weiter. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}

/** Für Intl in Client-Komponenten – Datum, Uhrzeit, Beträge. */
export function useIntlLocale(): string {
  return INTL_LOCALES[useLocale()];
}

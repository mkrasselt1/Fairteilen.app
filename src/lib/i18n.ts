/**
 * Zweisprachige Oberfläche – Deutsch und Englisch.
 *
 * Schlüssel ist der deutsche Originaltext: `t("Ausgaben")` liefert auf Deutsch
 * genau diesen Text zurück und auf Englisch die Übersetzung aus dem Wörterbuch.
 * Fehlt ein Eintrag, bleibt der deutsche Text stehen – die Seite bricht also
 * nie ab, sie ist an dieser Stelle nur noch nicht übersetzt.
 */
import { EN } from "./i18n-en.ts";

export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";

/** Name des Cookies mit der bewusst gewählten Sprache. */
export const LOCALE_COOKIE = "fairteilen_sprache";

export const LOCALE_NAMES: Record<Locale, string> = { de: "Deutsch", en: "English" };

/** Für Intl – Datum, Uhrzeit und Beträge. */
export const INTL_LOCALES: Record<Locale, string> = { de: "de-DE", en: "en-GB" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Wertet den Accept-Language-Kopf des Browsers aus, samt Gewichtung:
 * „en-US,en;q=0.9,de;q=0.8“ ergibt Englisch.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const wishes = header
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => /^\s*q=([\d.]+)\s*$/.exec(parameter))
        .find(Boolean);
      return { tag: tag.trim().toLowerCase(), quality: quality ? Number(quality[1]) : 1 };
    })
    .filter((wish) => wish.tag && Number.isFinite(wish.quality) && wish.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const wish of wishes) {
    if (wish.tag === "*") return DEFAULT_LOCALE;
    const base = wish.tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

/** Bewusste Wahl schlägt Browsersprache, Browsersprache schlägt Standard. */
export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

export type Translate = (text: string, values?: Record<string, string | number>) => string;

/** Ersetzt {platzhalter} – auch außerhalb der Übersetzung nutzbar. */
export function fill(text: string, values?: Record<string, string | number>): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const CACHE = new Map<Locale, Translate>();

/** Übersetzungsfunktion für eine Sprache – pro Sprache nur einmal gebaut. */
export function translator(locale: Locale): Translate {
  const cached = CACHE.get(locale);
  if (cached) return cached;

  const translate: Translate =
    locale === "de"
      ? (text, values) => fill(text, values)
      : (text, values) => fill(EN[text] ?? text, values);

  CACHE.set(locale, translate);
  return translate;
}

/** Übersetzt die Sprache selbst, ohne den Umweg über das Wörterbuch. */
export const t = translator;

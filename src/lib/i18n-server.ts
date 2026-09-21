/**
 * Sprache der aktuellen Anfrage – nur für Server-Komponenten.
 *
 * Reihenfolge: bewusst gewählte Sprache (Cookie) vor Browsersprache
 * (Accept-Language) vor Deutsch.
 */
import "server-only";
import { cookies, headers } from "next/headers";
import { INTL_LOCALES, LOCALE_COOKIE, pickLocale, translator, type Locale, type Translate } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language"));
}

export async function getT(): Promise<Translate> {
  return translator(await getLocale());
}

/** Sprache und Übersetzung zusammen – spart den doppelten Aufruf. */
export async function getI18n(): Promise<{ locale: Locale; t: Translate; intlLocale: string }> {
  const locale = await getLocale();
  return { locale, t: translator(locale), intlLocale: INTL_LOCALES[locale] };
}

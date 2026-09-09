/**
 * Beträge werden durchgängig als ganzzahlige Cent-Werte gespeichert und
 * gerechnet. So entstehen keine Rundungsfehler durch Gleitkommazahlen.
 */

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
};

export const CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  { code: "CHF", symbol: "CHF", name: "Schweizer Franken", decimals: 2 },
  { code: "USD", symbol: "$", name: "US-Dollar", decimals: 2 },
  { code: "GBP", symbol: "£", name: "Britisches Pfund", decimals: 2 },
  { code: "PLN", symbol: "zł", name: "Złoty", decimals: 2 },
  { code: "CZK", symbol: "Kč", name: "Tschechische Krone", decimals: 2 },
  { code: "DKK", symbol: "kr", name: "Dänische Krone", decimals: 2 },
  { code: "SEK", symbol: "kr", name: "Schwedische Krone", decimals: 2 },
  { code: "NOK", symbol: "kr", name: "Norwegische Krone", decimals: 2 },
  { code: "HUF", symbol: "Ft", name: "Forint", decimals: 2 },
  { code: "TRY", symbol: "₺", name: "Türkische Lira", decimals: 2 },
  { code: "CAD", symbol: "CA$", name: "Kanadischer Dollar", decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australischer Dollar", decimals: 2 },
  { code: "JPY", symbol: "¥", name: "Yen", decimals: 0 },
  { code: "INR", symbol: "₹", name: "Indische Rupie", decimals: 2 },
  { code: "BRL", symbol: "R$", name: "Brasilianischer Real", decimals: 2 },
  { code: "ZAR", symbol: "R", name: "Rand", decimals: 2 },
  { code: "MXN", symbol: "MX$", name: "Mexikanischer Peso", decimals: 2 },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function currencyOf(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code);
}

/** "12,50" / "12.50" / "1.234,56" / "1,234.56" -> 1250 bzw. 123456 */
export function parseAmountToCents(input: string, currency = "EUR"): number | null {
  if (input == null) return null;
  let raw = String(input).trim().replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  if (!raw) return null;

  const negative = raw.startsWith("-");
  if (negative) raw = raw.slice(1);

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let decimalSep = "";
  if (lastComma >= 0 && lastDot >= 0) decimalSep = lastComma > lastDot ? "," : ".";
  else if (lastComma >= 0) decimalSep = raw.length - lastComma - 1 <= 2 ? "," : "";
  else if (lastDot >= 0) decimalSep = raw.length - lastDot - 1 <= 2 ? "." : "";

  let integerPart = raw;
  let fractionPart = "";
  if (decimalSep) {
    const idx = raw.lastIndexOf(decimalSep);
    integerPart = raw.slice(0, idx);
    fractionPart = raw.slice(idx + 1);
  }
  integerPart = integerPart.replace(/[.,]/g, "");
  fractionPart = fractionPart.replace(/[.,]/g, "");
  if (integerPart === "" && fractionPart === "") return null;

  const decimals = currencyOf(currency).decimals;
  const scale = 10 ** decimals;
  const fraction = decimals === 0 ? 0 : Number(`0.${fractionPart || "0"}`);
  const value = Number(integerPart || "0") * scale + Math.round(fraction * scale);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

export function centsToDecimalString(cents: number, currency = "EUR"): string {
  const decimals = currencyOf(currency).decimals;
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  if (decimals === 0) return `${sign}${abs}`;
  const scale = 10 ** decimals;
  return `${sign}${Math.floor(abs / scale)}.${String(abs % scale).padStart(decimals, "0")}`;
}

export function formatMoney(cents: number, currency = "EUR", locale = "de-DE"): string {
  const { decimals } = currencyOf(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(cents / 10 ** decimals);
  } catch {
    return `${centsToDecimalString(cents, currency)} ${currency}`;
  }
}

/** Betrag ohne Vorzeichen – für Sätze wie "du schuldest X". */
export function formatMoneyAbs(cents: number, currency = "EUR", locale = "de-DE"): string {
  return formatMoney(Math.abs(cents), currency, locale);
}

/**
 * Zahlungsangaben, damit beim Begleichen klar ist, wohin das Geld soll.
 * Bewusst ohne Anbindung an einen Zahlungsdienst – es werden nur die Angaben
 * gespeichert und angezeigt, überwiesen wird in der eigenen Banking-App.
 */

/** Länge der IBAN je Land – für verständliche Fehlermeldungen. */
const IBAN_LENGTHS: Record<string, number> = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20,
  ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26,
  IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MT: 31, NL: 18, NO: 15, PL: 28,
  PT: 25, RO: 24, SE: 24, SI: 19, SK: 24,
};

export function normalizeIban(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/** IBAN im Vierergruppen-Format, wie man sie auf Rechnungen sieht. */
export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Prüft die IBAN nach ISO 13616: Aufbau, Länge des Landes und Prüfziffer
 * (Modulo 97). Gibt null zurück, wenn alles stimmt, sonst den Grund.
 */
export function validateIban(value: string): string | null {
  const iban = normalizeIban(value);
  if (iban.length === 0) return null;

  // Aufbau ohne Mindestlänge prüfen, damit eine zu kurze IBAN auch als solche
  // gemeldet wird und nicht als falscher Aufbau.
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]*$/.test(iban)) {
    return "Die IBAN besteht aus zwei Buchstaben für das Land, zwei Ziffern und danach Zahlen oder Buchstaben.";
  }
  if (iban.length < 15 || iban.length > 34) return "Die IBAN hat eine ungültige Länge.";

  const country = iban.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && iban.length !== expected) {
    return `Eine IBAN aus ${country} hat ${expected} Zeichen, diese hat ${iban.length}.`;
  }

  // Die ersten vier Zeichen ans Ende, Buchstaben durch Zahlen ersetzen,
  // der Rest der Division durch 97 muss 1 sein.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const character of rearranged) {
    const digits = /[0-9]/.test(character) ? character : String(character.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  if (remainder !== 1) return "Die Prüfziffer der IBAN stimmt nicht – bitte noch einmal vergleichen.";

  return null;
}

/** Wero läuft über Handynummer oder E-Mail-Adresse. */
export function validateWeroContact(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
  const isPhone = /^\+?[0-9][0-9\s/().-]{5,24}$/.test(trimmed);
  if (!isEmail && !isPhone) {
    return "Für Wero bitte eine Handynummer oder E-Mail-Adresse angeben.";
  }
  return null;
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!/^\+?[0-9][0-9\s/().-]{5,24}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : digits;
}

export type PaymentDetails = {
  iban: string | null;
  weroContact: string | null;
  paypalEmail: string | null;
  paymentNote: string | null;
};

export function hasPaymentDetails(details: PaymentDetails): boolean {
  return Boolean(details.iban || details.weroContact || details.paypalEmail || details.paymentNote);
}

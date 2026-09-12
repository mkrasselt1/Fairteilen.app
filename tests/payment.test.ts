/** Zahlungsangaben: IBAN-Prüfung und Wero-Kontakt. */
import test from "node:test";
import assert from "node:assert/strict";
import { formatIban, normalizeIban, validateIban, validateWeroContact, hasPaymentDetails } from "../src/lib/payment.ts";

test("gültige IBANs werden angenommen", () => {
  for (const iban of [
    "DE89 3704 0044 0532 0130 00",
    "DE89370400440532013000",
    "AT61 1904 3002 3457 3201",
    "CH93 0076 2011 6238 5295 7",
    "NL91ABNA0417164300",
    "FR14 2004 1010 0505 0001 3M02 606",
  ]) {
    assert.equal(validateIban(iban), null, iban);
  }
});

test("falsche Prüfziffer wird erkannt", () => {
  // Letzte Ziffer verändert – Aufbau und Länge stimmen, die Prüfziffer nicht.
  assert.match(validateIban("DE89370400440532013001") ?? "", /Prüfziffer/);
});

test("falsche Länge wird mit Landesangabe gemeldet", () => {
  const problem = validateIban("DE8937040044053201300") ?? "";
  assert.match(problem, /DE/);
  assert.match(problem, /22/);
});

test("Unfug wird abgelehnt", () => {
  assert.match(validateIban("1234567890123456") ?? "", /zwei Buchstaben/);
  assert.match(validateIban("DEAB370400440532013000") ?? "", /zwei Buchstaben/);
  // Zu kurz ist zu kurz – und wird auch so benannt, nicht als falscher Aufbau.
  assert.match(validateIban("DE89") ?? "", /Länge/);
  assert.match(validateIban("DE8937") ?? "", /Länge/);
});

test("leere Angabe ist erlaubt", () => {
  assert.equal(validateIban(""), null);
  assert.equal(validateIban("   "), null);
  assert.equal(validateWeroContact(""), null);
});

test("IBAN wird einheitlich dargestellt", () => {
  assert.equal(normalizeIban("de89 3704-0044 0532 0130 00"), "DE89370400440532013000");
  assert.equal(formatIban("DE89370400440532013000"), "DE89 3704 0044 0532 0130 00");
});

test("Wero nimmt Handynummer oder E-Mail", () => {
  assert.equal(validateWeroContact("+49 170 1234567"), null);
  assert.equal(validateWeroContact("0170 1234567"), null);
  assert.equal(validateWeroContact("anna@example.com"), null);
  assert.match(validateWeroContact("Anna") ?? "", /Handynummer/);
  assert.match(validateWeroContact("123") ?? "", /Handynummer/);
});

test("Vorhandensein von Angaben wird erkannt", () => {
  const leer = { iban: null, weroContact: null, paypalEmail: null, paymentNote: null };
  assert.equal(hasPaymentDetails(leer), false);
  assert.equal(hasPaymentDetails({ ...leer, iban: "DE89..." }), true);
  assert.equal(hasPaymentDetails({ ...leer, paymentNote: "lieber bar" }), true);
});

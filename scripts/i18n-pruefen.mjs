#!/usr/bin/env node
/**
 * Sammelt alle Texte, die über t("…") laufen, und vergleicht sie mit dem
 * englischen Wörterbuch.
 *
 *   npm run i18n            – Bericht
 *   npm run i18n -- --liste – fehlende Schlüssel als JSON-Vorlage
 *
 * Geprüft wird außerdem, ob in der Übersetzung dieselben {Platzhalter}
 * vorkommen wie im Original.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";

function allFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...allFiles(full));
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/** t("…") und t('…') – auch mehrzeilig, mit maskierten Anführungszeichen. */
const CALL = /\bt\(\s*("(?:[^"\\]|\\.)*")\s*[,)]/gs;

const keys = new Map();
for (const file of allFiles(ROOT)) {
  if (file.endsWith("i18n-en.ts")) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(CALL)) {
    // \' ist in JavaScript erlaubt, in JSON nicht.
    const text = JSON.parse(match[1].replace(/\\'/g, "'"));
    if (!keys.has(text)) keys.set(text, file);
  }
}

/**
 * Texte, die nicht als t("…") im Quelltext stehen, sondern als Tabelle und
 * über t(eintrag.label) laufen – Kategorien, Währungen, Startseite …
 */
const [{ CATEGORIES, GROUP_TYPES }, { CURRENCIES }, texte] = await Promise.all([
  import("../src/lib/categories.ts"),
  import("../src/lib/money.ts"),
  import("../src/lib/texte.ts"),
]);

const indirect = [
  ...CATEGORIES.flatMap((c) => [c.label, c.group]),
  ...GROUP_TYPES.map((g) => g.label),
  ...CURRENCIES.map((c) => c.name),
  ...texte.SPLIT_TABS.flatMap((tab) => [tab.label, tab.hint]),
  ...Object.values(texte.SPLIT_LABELS),
  ...texte.RECURRENCE_OPTIONS.map((option) => option.label),
  ...texte.NAV_LINKS.map((link) => link.label),
  ...texte.LANDING_FEATURES.flatMap((f) => [f.title, f.text]),
  ...texte.LANDING_STEPS.flatMap((s) => [s.title, s.text]),
  ...texte.LANDING_FAQ.flatMap((f) => [f.q, f.a]),
  ...texte.AUTH_BULLETS,
];
for (const text of indirect) if (!keys.has(text)) keys.set(text, "Tabelle");

/** Fehlermeldungen aus den Bibliotheken – sie werden erst beim Anzeigen übersetzt. */
const ERROR_CALL = /\bnew (?:SplitError|UploadError|ActorError|AccountError)\(\s*("(?:[^"\\]|\\.)*")/gs;
for (const file of allFiles(ROOT)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(ERROR_CALL)) {
    const text = JSON.parse(match[1]);
    if (!keys.has(text)) keys.set(text, file);
  }
}
for (const text of [
  "Die IBAN besteht aus zwei Buchstaben für das Land, zwei Ziffern und danach Zahlen oder Buchstaben.",
  "Die IBAN hat eine ungültige Länge.",
  "Die Prüfziffer der IBAN stimmt nicht – bitte noch einmal vergleichen.",
  "Für Wero bitte eine Handynummer oder E-Mail-Adresse angeben.",
  "Aufteilung nicht möglich.",
]) {
  if (!keys.has(text)) keys.set(text, "src/lib/payment.ts");
}

const { EN } = await import("../src/lib/i18n-en.ts");

const missing = [...keys.keys()].filter((key) => !(key in EN)).sort();
const placeholders = (text) => (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");
const broken = [...keys.keys()].filter(
  (key) => key in EN && placeholders(key) !== placeholders(EN[key]),
);
const unused = Object.keys(EN).filter((key) => !keys.has(key)).sort();

if (process.argv.includes("--liste")) {
  console.log(JSON.stringify(Object.fromEntries(missing.map((key) => [key, ""])), null, 2));
} else {
  console.log(`Texte in der Oberfläche   ${keys.size}`);
  console.log(`Davon übersetzt           ${keys.size - missing.length}`);
  if (missing.length > 0) {
    console.log(`\nOhne Übersetzung (${missing.length}):`);
    for (const key of missing) console.log(`  • ${key}  [${keys.get(key)}]`);
  }
  if (broken.length > 0) {
    console.log(`\nPlatzhalter stimmen nicht (${broken.length}):`);
    for (const key of broken) console.log(`  • ${key}\n    → ${EN[key]}`);
  }
  if (unused.length > 0) {
    console.log(`\nIm Wörterbuch, aber nirgends benutzt (${unused.length}):`);
    for (const key of unused) console.log(`  • ${key}`);
  }
  if (missing.length === 0 && broken.length === 0) console.log("\n✓ Vollständig.");
}

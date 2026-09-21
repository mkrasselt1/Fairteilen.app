import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromAcceptLanguage,
  pickLocale,
  translator,
} from "../src/lib/i18n.ts";
import { EN } from "../src/lib/i18n-en.ts";

test("erkennt die Sprache des Browsers", () => {
  assert.equal(localeFromAcceptLanguage("de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(localeFromAcceptLanguage("en-US,en;q=0.9"), "en");
  assert.equal(localeFromAcceptLanguage("en-GB"), "en");
  assert.equal(localeFromAcceptLanguage("de"), "de");
});

test("achtet auf die Gewichtung, nicht auf die Reihenfolge", () => {
  assert.equal(localeFromAcceptLanguage("de;q=0.2,en;q=0.9"), "en");
  assert.equal(localeFromAcceptLanguage("en;q=0.3,de;q=0.7"), "de");
});

test("überspringt Sprachen, die es nicht gibt", () => {
  assert.equal(localeFromAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.5"), "en");
  assert.equal(localeFromAcceptLanguage("fr,es"), null);
  assert.equal(localeFromAcceptLanguage(""), null);
  assert.equal(localeFromAcceptLanguage(null), null);
});

test("die bewusste Wahl schlägt die Browsersprache", () => {
  assert.equal(pickLocale("en", "de-DE,de;q=0.9"), "en");
  assert.equal(pickLocale("de", "en-US"), "de");
  assert.equal(pickLocale(undefined, "en-US"), "en");
  assert.equal(pickLocale("klingonisch", "en-US"), "en");
  assert.equal(pickLocale(undefined, null), DEFAULT_LOCALE);
});

test("isLocale nimmt nur die beiden Sprachen an", () => {
  assert.ok(isLocale("de"));
  assert.ok(isLocale("en"));
  assert.ok(!isLocale("de-DE"));
  assert.ok(!isLocale(undefined));
});

test("Deutsch gibt den Originaltext zurück", () => {
  const t = translator("de");
  assert.equal(t("Ausgabe hinzufügen"), "Ausgabe hinzufügen");
  assert.equal(t("{anzahl} Einträge", { anzahl: 3 }), "3 Einträge");
});

test("Englisch übersetzt und setzt Werte ein", () => {
  const t = translator("en");
  assert.equal(t("Ausgabe hinzufügen"), "Add expense");
  assert.equal(t("{anzahl} Einträge", { anzahl: 3 }), "3 entries");
});

test("fehlt eine Übersetzung, bleibt der deutsche Text stehen", () => {
  const t = translator("en");
  assert.equal(t("Diesen Satz gibt es im Wörterbuch nicht."), "Diesen Satz gibt es im Wörterbuch nicht.");
});

test("unbekannte Platzhalter bleiben unangetastet", () => {
  const t = translator("de");
  assert.equal(t("Hallo {wer}", { anderes: 1 }), "Hallo {wer}");
});

test("jede Übersetzung trägt dieselben Platzhalter wie das Original", () => {
  const platzhalter = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");
  const abweichend = Object.entries(EN).filter(([de, en]) => platzhalter(de) !== platzhalter(en));
  assert.deepEqual(abweichend, []);
});

test("keine Übersetzung ist leer geblieben", () => {
  const leer = Object.entries(EN).filter(([, en]) => en.trim() === "");
  assert.deepEqual(leer, []);
});

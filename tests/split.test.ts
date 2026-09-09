/**
 * Rechenkern-Tests: `node --test --experimental-strip-types tests/split.test.ts`
 */
import test from "node:test";
import assert from "node:assert/strict";
import { computeShares, distributeByWeights, splitEqually, validatePayments, SplitError } from "../src/lib/split.ts";
import { netBalances, pairwiseDebts, simplifyDebts } from "../src/lib/balances.ts";
import { parseAmountToCents, formatMoney, centsToDecimalString } from "../src/lib/money.ts";

test("Restcents gehen nicht verloren", () => {
  assert.deepEqual(splitEqually(1000, 3), [334, 333, 333]);
  assert.equal(splitEqually(1000, 3).reduce((a, b) => a + b, 0), 1000);
  assert.deepEqual(splitEqually(1, 3), [1, 0, 0]);
  assert.equal(splitEqually(9999, 7).reduce((a, b) => a + b, 0), 9999);
});

test("gewichtete Verteilung nach größten Resten", () => {
  assert.deepEqual(distributeByWeights(1000, [1, 1, 1]), [334, 333, 333]);
  assert.deepEqual(distributeByWeights(100, [3, 1]), [75, 25]);
  assert.equal(distributeByWeights(1234, [5, 3, 2]).reduce((a, b) => a + b, 0), 1234);
});

test("gleiche Aufteilung", () => {
  const shares = computeShares(1000, "equal", [{ userId: "a" }, { userId: "b" }, { userId: "c" }]);
  assert.deepEqual(shares.map((s) => s.oweCents), [334, 333, 333]);
});

test("exakte Beträge müssen zum Gesamtbetrag passen", () => {
  const ok = computeShares(1000, "exact", [
    { userId: "a", value: 600 },
    { userId: "b", value: 400 },
  ]);
  assert.deepEqual(ok.map((s) => s.oweCents), [600, 400]);
  assert.throws(
    () => computeShares(1000, "exact", [{ userId: "a", value: 600 }, { userId: "b", value: 300 }]),
    SplitError,
  );
});

test("Prozentaufteilung", () => {
  const shares = computeShares(10000, "percent", [
    { userId: "a", value: 3333 },
    { userId: "b", value: 3333 },
    { userId: "c", value: 3334 },
  ]);
  assert.equal(shares.reduce((a, s) => a + s.oweCents, 0), 10000);
  assert.throws(() => computeShares(1000, "percent", [{ userId: "a", value: 5000 }]), SplitError);
});

test("Anteile", () => {
  const shares = computeShares(900, "shares", [
    { userId: "paar", value: 2 },
    { userId: "single", value: 1 },
  ]);
  assert.deepEqual(shares.map((s) => s.oweCents), [600, 300]);
});

test("Zu- und Abschläge", () => {
  // 30,00 € gesamt, 5,00 € Zuschlag für a: Rest 25,00 € wird halbiert.
  const shares = computeShares(3000, "adjustment", [
    { userId: "a", value: 500 },
    { userId: "b", value: 0 },
  ]);
  assert.deepEqual(shares.map((s) => s.oweCents), [1750, 1250]);

  // Auch mit Restcents bleibt die Summe exakt.
  const uneven = computeShares(3000, "adjustment", [
    { userId: "a", value: 500 },
    { userId: "b", value: 0 },
    { userId: "c", value: 0 },
  ]);
  assert.equal(uneven.reduce((a, s) => a + s.oweCents, 0), 3000);
  assert.ok(Math.abs(uneven[0].oweCents - uneven[1].oweCents - 500) <= 1);
});

test("mehrere Zahlende", () => {
  assert.equal(validatePayments(1000, [{ userId: "a", paidCents: 600 }, { userId: "b", paidCents: 400 }]).length, 2);
  assert.throws(() => validatePayments(1000, [{ userId: "a", paidCents: 600 }]), SplitError);
});

test("Salden pro Währung", () => {
  const balances = netBalances([
    { userId: "a", paidCents: 1000, oweCents: 500, currency: "EUR" },
    { userId: "b", paidCents: 0, oweCents: 500, currency: "EUR" },
    { userId: "a", paidCents: 0, oweCents: 200, currency: "CHF" },
    { userId: "b", paidCents: 200, oweCents: 0, currency: "CHF" },
  ]);
  assert.equal(balances.get("EUR")!.get("a"), 500);
  assert.equal(balances.get("EUR")!.get("b"), -500);
  assert.equal(balances.get("CHF")!.get("a"), -200);
});

test("Schuldenvereinfachung minimiert Überweisungen", () => {
  const debts = simplifyDebts(new Map([["a", 1000], ["b", -400], ["c", -600]]), "EUR");
  assert.equal(debts.length, 2);
  assert.equal(debts.reduce((sum, d) => sum + d.amountCents, 0), 1000);
  assert.ok(debts.every((d) => d.toUserId === "a"));

  // Ringschuld: a→b→c→a in gleicher Höhe hebt sich vollständig auf.
  assert.deepEqual(simplifyDebts(new Map([["a", 0], ["b", 0], ["c", 0]]), "EUR"), []);
});

test("paarweise Schulden ohne Vereinfachung", () => {
  const debts = pairwiseDebts([
    {
      currency: "EUR",
      shares: [
        { userId: "a", paidCents: 3000, oweCents: 1000 },
        { userId: "b", paidCents: 0, oweCents: 1000 },
        { userId: "c", paidCents: 0, oweCents: 1000 },
      ],
    },
  ]);
  assert.equal(debts.length, 2);
  assert.ok(debts.every((d) => d.toUserId === "a" && d.amountCents === 1000));
});

test("Zahlung gleicht Saldo aus", () => {
  const debts = pairwiseDebts([
    {
      currency: "EUR",
      shares: [
        { userId: "a", paidCents: 2000, oweCents: 1000 },
        { userId: "b", paidCents: 0, oweCents: 1000 },
      ],
    },
    {
      // b überweist a 10 €
      currency: "EUR",
      shares: [
        { userId: "b", paidCents: 1000, oweCents: 0 },
        { userId: "a", paidCents: 0, oweCents: 1000 },
      ],
    },
  ]);
  assert.deepEqual(debts, []);
});

test("Beträge robust einlesen", () => {
  assert.equal(parseAmountToCents("12,50"), 1250);
  assert.equal(parseAmountToCents("12.50"), 1250);
  assert.equal(parseAmountToCents("1.234,56"), 123456);
  assert.equal(parseAmountToCents("1,234.56"), 123456);
  assert.equal(parseAmountToCents("1 234,56"), 123456);
  assert.equal(parseAmountToCents("€ 9"), 900);
  assert.equal(parseAmountToCents(""), null);
  assert.equal(parseAmountToCents("abc"), null);
  assert.equal(parseAmountToCents("1000", "JPY"), 1000);
});

test("Beträge formatieren", () => {
  assert.equal(centsToDecimalString(123456), "1234.56");
  assert.ok(formatMoney(123456, "EUR").includes("1.234,56"));
});

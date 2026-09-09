/** Rückmeldung und Umrechnung der Aufteilungs-Oberfläche. */
import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSplit, convertSplitValues, formatSplitValue, percentTotalBps } from "../src/lib/split-ui.ts";
import { computeShares, type SplitType } from "../src/lib/split.ts";

const IDS = ["a", "b", "c"];

test("gleiche Aufteilung ist immer vollständig", () => {
  const analysis = analyzeSplit(10001, "equal", IDS.map((userId) => ({ userId, value: 0 })));
  assert.equal(analysis.state, "ok");
  assert.equal(analysis.remainingCents, 0);
  assert.equal(analysis.allocatedCents, 10001);
});

test("Prozentangaben zeigen zu wenig, genau und zu viel", () => {
  const of = (values: number[]) =>
    analyzeSplit(30000, "percent", IDS.map((userId, i) => ({ userId, value: values[i] })));

  assert.equal(of([5000, 4000, 0]).state, "under");
  assert.equal(of([5000, 4000, 0]).remainingCents, 3000);
  assert.equal(of([5000, 3000, 2000]).state, "ok");
  assert.equal(of([7000, 5000, 0]).state, "over");
  assert.equal(of([7000, 5000, 0]).remainingCents, -6000);
  assert.equal(percentTotalBps([{ userId: "a", value: 7000 }, { userId: "b", value: 5000 }]), 12000);
});

test("exakte Beträge melden den offenen Rest", () => {
  const analysis = analyzeSplit(10000, "exact", [
    { userId: "a", value: 6000 },
    { userId: "b", value: 2500 },
  ]);
  assert.equal(analysis.state, "under");
  assert.equal(analysis.remainingCents, 1500);
  assert.ok(Math.abs(analysis.progress - 0.85) < 1e-9);
});

test("Anteile und Zuschläge gehen immer auf", () => {
  const shares = analyzeSplit(10000, "shares", [
    { userId: "a", value: 2 },
    { userId: "b", value: 1 },
  ]);
  assert.equal(shares.state, "ok");
  assert.deepEqual([...shares.perUser.values()], [6667, 3333]);

  const adjustment = analyzeSplit(10000, "adjustment", [
    { userId: "a", value: 1000 },
    { userId: "b", value: 0 },
  ]);
  assert.equal(adjustment.state, "ok");
});

test("leere Eingaben führen nicht zu Fehlern", () => {
  assert.equal(analyzeSplit(0, "percent", [{ userId: "a", value: 5000 }]).state, "empty");
  assert.equal(analyzeSplit(1000, "equal", []).state, "empty");
  assert.equal(analyzeSplit(1000, "shares", [{ userId: "a", value: 0 }]).state, "empty");
});

/** Umrechnen und erneut rechnen muss dieselben Cent-Beträge ergeben. */
function roundTrip(target: SplitType, amountCents: number, cents: number[]) {
  const perUser = new Map(IDS.slice(0, cents.length).map((id, i) => [id, cents[i]]));
  const order = IDS.slice(0, cents.length);
  const converted = convertSplitValues(target, amountCents, perUser, order);
  const shares = computeShares(
    amountCents,
    target,
    order.map((id) => ({ userId: id, value: converted.get(id) ?? 0 })),
  );
  return shares.map((s) => s.oweCents);
}

test("Wechsel zu Beträgen und Zuschlägen erhält die Verteilung exakt", () => {
  assert.deepEqual(roundTrip("exact", 30000, [15000, 9000, 6000]), [15000, 9000, 6000]);
  assert.deepEqual(roundTrip("adjustment", 30000, [15000, 9000, 6000]), [15000, 9000, 6000]);
  // Auch mit Restcents
  assert.deepEqual(roundTrip("adjustment", 10001, [3334, 3333, 3334]), [3334, 3333, 3334]);
});

test("Wechsel zu Prozent ergibt immer genau 100 %", () => {
  for (const cents of [[15000, 9000, 6000], [3334, 3333, 3333], [1, 1, 9998]]) {
    const perUser = new Map(IDS.map((id, i) => [id, cents[i]]));
    const converted = convertSplitValues("percent", cents.reduce((a, b) => a + b, 0), perUser, IDS);
    assert.equal([...converted.values()].reduce((a, b) => a + b, 0), 10000);
  }
  assert.deepEqual(roundTrip("percent", 30000, [15000, 9000, 6000]), [15000, 9000, 6000]);
});

test("Wechsel zu Anteilen bildet das Verhältnis ab", () => {
  const perUser = new Map([["a", 6667], ["b", 3333]]);
  const converted = convertSplitValues("shares", 10000, perUser, ["a", "b"]);
  assert.deepEqual([...converted.values()], [2, 1]);

  // Krumme Verhältnisse werden exakt abgebildet statt grob gerundet.
  assert.deepEqual(
    [...convertSplitValues("shares", 30000, new Map([["a", 21000], ["b", 9000]]), ["a", "b"]).values()],
    [7, 3],
  );
  assert.deepEqual(
    [...convertSplitValues("shares", 10000, new Map([["a", 6000], ["b", 4000]]), ["a", "b"]).values()],
    [3, 2],
  );
  // 70 : 50 stammt aus einer noch nicht stimmigen Prozenteingabe – auch hier bleibt das Verhältnis.
  assert.deepEqual(
    [...convertSplitValues("shares", 30000, new Map([["a", 21000], ["b", 15000]]), ["a", "b"]).values()],
    [7, 5],
  );
  // Anteilige Umrechnung reproduziert die Beträge exakt.
  assert.deepEqual(roundTrip("shares", 30000, [21000, 9000]), [21000, 9000]);

  // Gleiche Beträge ergeben je einen Anteil
  const equal = convertSplitValues("shares", 9999, new Map([["a", 3333], ["b", 3333], ["c", 3333]]), IDS);
  assert.deepEqual([...equal.values()], [1, 1, 1]);

  // Nicht beteiligte Personen bekommen keinen Anteil
  const none = convertSplitValues("shares", 10000, new Map([["a", 10000], ["b", 0]]), ["a", "b"]);
  assert.equal(none.get("b"), 0);
});

test("Wechsel zu „gleich“ verwirft die Einzelwerte", () => {
  const converted = convertSplitValues("equal", 10000, new Map([["a", 7000], ["b", 3000]]), ["a", "b"]);
  assert.equal(converted.size, 0);
});

test("Werte werden für die Eingabefelder deutsch formatiert", () => {
  assert.equal(formatSplitValue("exact", 1234), "12,34");
  assert.equal(formatSplitValue("percent", 3333), "33,33");
  assert.equal(formatSplitValue("percent", 5000), "50");
  assert.equal(formatSplitValue("shares", 3), "3");
  assert.equal(formatSplitValue("adjustment", -500), "-5,00");
});

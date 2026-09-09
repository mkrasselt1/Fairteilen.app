/**
 * Aufteilungslogik. Alle Berechnungen laufen auf ganzzahligen Cent-Werten und
 * verteilen Restcents nach dem Verfahren der größten Reste, damit die Summe der
 * Anteile immer exakt dem Gesamtbetrag entspricht.
 */

export const SPLIT_TYPES = ["equal", "exact", "percent", "shares", "adjustment"] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export type SplitParticipant = {
  userId: string;
  /**
   * Bedeutung je nach Aufteilungsart:
   *  equal      – ignoriert
   *  exact      – Cent-Betrag der Person
   *  percent    – Prozent in Basispunkten (100 % = 10000)
   *  shares     – Anzahl Anteile
   *  adjustment – Zuschlag/Abzug in Cent
   */
  value?: number;
};

export type SplitResult = { userId: string; oweCents: number };

export class SplitError extends Error {}

/** Verteilt `total` proportional zu `weights` und vergibt Restcents nach größtem Rest. */
export function distributeByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new SplitError("Die Summe der Anteile muss größer als 0 sein.");

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);

  const exact = weights.map((w) => (abs * w) / sum);
  const base = exact.map((v) => Math.floor(v));
  let rest = abs - base.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; rest > 0; k++, rest--) base[order[k % order.length].i] += 1;
  return base.map((v) => v * sign);
}

/** Gleichmäßige Aufteilung; Restcents gehen an die ersten Teilnehmenden. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) throw new SplitError("Es muss mindestens eine Person beteiligt sein.");
  return distributeByWeights(total, new Array(count).fill(1));
}

export function computeShares(
  amountCents: number,
  splitType: SplitType,
  participants: SplitParticipant[],
): SplitResult[] {
  if (participants.length === 0) throw new SplitError("Es muss mindestens eine Person beteiligt sein.");
  const ids = participants.map((p) => p.userId);
  if (new Set(ids).size !== ids.length) throw new SplitError("Eine Person wurde doppelt ausgewählt.");

  switch (splitType) {
    case "equal": {
      const parts = splitEqually(amountCents, participants.length);
      return participants.map((p, i) => ({ userId: p.userId, oweCents: parts[i] }));
    }
    case "exact": {
      const values = participants.map((p) => Math.round(p.value ?? 0));
      const sum = values.reduce((a, b) => a + b, 0);
      if (sum !== amountCents) {
        throw new SplitError(
          `Die Einzelbeträge ergeben zusammen nicht den Gesamtbetrag (Differenz: ${((amountCents - sum) / 100).toFixed(2)}).`,
        );
      }
      return participants.map((p, i) => ({ userId: p.userId, oweCents: values[i] }));
    }
    case "percent": {
      const bps = participants.map((p) => Math.round(p.value ?? 0));
      if (bps.some((v) => v < 0)) throw new SplitError("Prozentwerte dürfen nicht negativ sein.");
      const sum = bps.reduce((a, b) => a + b, 0);
      if (sum !== 10000) {
        throw new SplitError(`Die Prozentwerte müssen zusammen 100 % ergeben (aktuell ${(sum / 100).toFixed(2)} %).`);
      }
      const parts = distributeByWeights(amountCents, bps);
      return participants.map((p, i) => ({ userId: p.userId, oweCents: parts[i] }));
    }
    case "shares": {
      const shares = participants.map((p) => Math.round(p.value ?? 0));
      if (shares.some((v) => v < 0)) throw new SplitError("Anteile dürfen nicht negativ sein.");
      if (shares.reduce((a, b) => a + b, 0) <= 0) throw new SplitError("Es muss mindestens ein Anteil vergeben werden.");
      const parts = distributeByWeights(amountCents, shares);
      return participants.map((p, i) => ({ userId: p.userId, oweCents: parts[i] }));
    }
    case "adjustment": {
      const adjustments = participants.map((p) => Math.round(p.value ?? 0));
      const adjustmentSum = adjustments.reduce((a, b) => a + b, 0);
      const rest = amountCents - adjustmentSum;
      const equalParts = splitEqually(rest, participants.length);
      return participants.map((p, i) => ({ userId: p.userId, oweCents: equalParts[i] + adjustments[i] }));
    }
    default:
      throw new SplitError("Unbekannte Aufteilungsart.");
  }
}

/** Zahlungen prüfen: mehrere Zahlende sind erlaubt, die Summe muss stimmen. */
export function validatePayments(amountCents: number, payments: { userId: string; paidCents: number }[]) {
  const active = payments.filter((p) => p.paidCents !== 0);
  if (active.length === 0) throw new SplitError("Es muss angegeben werden, wer bezahlt hat.");
  const sum = active.reduce((a, b) => a + b.paidCents, 0);
  if (sum !== amountCents) {
    throw new SplitError(
      `Die bezahlten Beträge ergeben zusammen nicht den Gesamtbetrag (Differenz: ${((amountCents - sum) / 100).toFixed(2)}).`,
    );
  }
  return active;
}

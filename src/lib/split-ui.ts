/**
 * Hilfen für die Aufteilungs-Oberfläche: fehlertolerante Auswertung für die
 * grafische Rückmeldung und Umrechnung der Werte beim Wechsel der Aufteilungsart.
 *
 * Bewusst frei von Framework- und Datenbankbezügen – so nutzen der angemeldete
 * Modus und der Gastrechner dieselbe Logik.
 */
import { computeShares, type SplitType } from "./split.ts";

export type ValuedParticipant = { userId: string; value: number };

export type SplitAnalysis = {
  /** Cent je Person – auch dann gefüllt, wenn die Eingabe noch nicht aufgeht. */
  perUser: Map<string, number>;
  allocatedCents: number;
  /** Positiv: es fehlt noch etwas. Negativ: es ist zu viel verteilt. */
  remainingCents: number;
  state: "ok" | "under" | "over" | "empty";
  /** Fortschritt 0…1 (kann über 1 liegen, wenn zu viel verteilt wurde). */
  progress: number;
};

const empty: SplitAnalysis = {
  perUser: new Map(),
  allocatedCents: 0,
  remainingCents: 0,
  state: "empty",
  progress: 0,
};

/**
 * Wertet die aktuelle Eingabe aus, ohne je einen Fehler zu werfen – die
 * Oberfläche soll auch bei halb ausgefüllten Feldern etwas anzeigen können.
 */
export function analyzeSplit(
  amountCents: number,
  splitType: SplitType,
  participants: ValuedParticipant[],
): SplitAnalysis {
  if (amountCents <= 0 || participants.length === 0) return empty;

  const perUser = new Map<string, number>();

  if (splitType === "exact") {
    for (const p of participants) perUser.set(p.userId, Math.round(p.value || 0));
  } else if (splitType === "percent") {
    // Nicht normalisieren: Nur so wird sichtbar, dass 90 % eben nicht 100 % sind.
    for (const p of participants) {
      perUser.set(p.userId, Math.round((amountCents * (p.value || 0)) / 10000));
    }
  } else {
    // equal, shares und adjustment ergeben immer genau den Gesamtbetrag.
    try {
      for (const share of computeShares(amountCents, splitType, participants)) {
        perUser.set(share.userId, share.oweCents);
      }
    } catch {
      return { ...empty, state: "empty" };
    }
  }

  const allocatedCents = [...perUser.values()].reduce((a, b) => a + b, 0);
  const remainingCents = amountCents - allocatedCents;

  return {
    perUser,
    allocatedCents,
    remainingCents,
    state: remainingCents === 0 ? "ok" : remainingCents > 0 ? "under" : "over",
    progress: allocatedCents / amountCents,
  };
}

/** Prozentsumme in Basispunkten – für die Anzeige „97,5 % von 100 %“. */
export function percentTotalBps(participants: ValuedParticipant[]): number {
  return participants.reduce((sum, p) => sum + (p.value || 0), 0);
}

/**
 * Rechnet die bisherige Aufteilung in die Werte der neuen Aufteilungsart um,
 * damit beim Wechsel der Modi nichts verloren geht.
 * Rückgabe in der Einheit der Zielart (Cent, Basispunkte oder Anteile).
 */
export function convertSplitValues(
  target: SplitType,
  amountCents: number,
  currentPerUser: Map<string, number>,
  order: string[],
): Map<string, number> {
  const result = new Map<string, number>();
  const cents = order.map((id) => currentPerUser.get(id) ?? 0);
  const total = cents.reduce((a, b) => a + b, 0);
  if (order.length === 0 || total <= 0) return result;

  switch (target) {
    case "equal":
      return result;

    case "exact": {
      order.forEach((id, i) => result.set(id, cents[i]));
      return result;
    }

    case "percent": {
      const bps = cents.map((c) => Math.round((c * 10000) / total));
      // Rundungsdifferenz auf den größten Anteil legen, damit es exakt 100 % sind.
      const diff = 10000 - bps.reduce((a, b) => a + b, 0);
      if (diff !== 0) {
        let largest = 0;
        for (let i = 1; i < bps.length; i++) if (bps[i] > bps[largest]) largest = i;
        bps[largest] += diff;
      }
      order.forEach((id, i) => result.set(id, bps[i]));
      return result;
    }

    case "shares": {
      const positive = cents.filter((c) => c > 0);
      const smallest = positive.length > 0 ? Math.min(...positive) : 0;
      if (smallest <= 0) {
        order.forEach((id) => result.set(id, 1));
        return result;
      }

      const ratios = cents.map((c) => c / smallest);
      // Kleinsten Faktor suchen, mit dem sich das Verhältnis ganzzahlig abbilden
      // lässt: aus 70 : 30 wird so 7 : 3 statt gerundet 2 : 1.
      for (let factor = 1; factor <= 12; factor++) {
        const scaled = ratios.map((r) => r * factor);
        const fits = scaled.every((v, i) => {
          if (cents[i] === 0) return true;
          return Math.abs(v - Math.round(v)) <= 0.02 && Math.round(v) >= 1 && Math.round(v) <= 99;
        });
        if (fits) {
          order.forEach((id, i) => result.set(id, cents[i] === 0 ? 0 : Math.round(scaled[i])));
          return result;
        }
      }

      // Kein sauberes Verhältnis – dann auf ganze Anteile runden.
      order.forEach((id, i) => {
        result.set(id, cents[i] === 0 ? 0 : Math.min(99, Math.max(1, Math.round(ratios[i]))));
      });
      return result;
    }

    case "adjustment": {
      // owe = gleicher Anteil + Zuschlag, deshalb ist der Zuschlag genau die
      // Abweichung vom gleichmäßig geteilten Betrag.
      const base = Math.floor(amountCents / order.length);
      order.forEach((id, i) => result.set(id, cents[i] - base));
      return result;
    }

    default:
      return result;
  }
}

/** Wandelt einen Wert der Zielart in den Text des Eingabefeldes. */
export function formatSplitValue(target: SplitType, value: number): string {
  if (target === "percent") {
    const percent = value / 100;
    return (Number.isInteger(percent) ? String(percent) : percent.toFixed(2)).replace(".", ",");
  }
  if (target === "shares") return String(value);
  return (value / 100).toFixed(2).replace(".", ",");
}

/**
 * Gastmodus: alles läuft im Browser, ohne Konto und ohne Server.
 * Der Zustand liegt im localStorage – dieselbe Rechenlogik wie im angemeldeten Modus.
 */
import { computeShares, SplitError, type SplitType } from "./split";
import { netBalances, simplifyDebts, type Debt } from "./balances";

export const GUEST_STORAGE_KEY = "fairteilen-rechner-v1";

export type GuestPerson = { id: string; name: string };

export type GuestExpense = {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  payerId: string;
  splitType: SplitType;
  /** Beteiligte Personen; `value` je nach Aufteilungsart (Cent, Basispunkte oder Anteile). */
  participants: { personId: string; value: number }[];
};

export type GuestState = {
  title: string;
  currency: string;
  people: GuestPerson[];
  expenses: GuestExpense[];
};

export function emptyGuestState(): GuestState {
  return {
    title: "Meine Abrechnung",
    currency: "EUR",
    people: [
      { id: newId(), name: "Ich" },
      { id: newId(), name: "Person 2" },
    ],
    expenses: [],
  };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function loadGuestState(): GuestState {
  if (typeof window === "undefined") return emptyGuestState();
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return emptyGuestState();
    const parsed = JSON.parse(raw) as GuestState;
    if (!Array.isArray(parsed.people) || !Array.isArray(parsed.expenses)) return emptyGuestState();
    return parsed;
  } catch {
    return emptyGuestState();
  }
}

export function saveGuestState(state: GuestState): void {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Privater Modus o. Ä. – dann gilt der Zustand nur für diese Sitzung. */
  }
}

export type GuestResult = {
  balances: { personId: string; amountCents: number }[];
  debts: Debt[];
  totalCents: number;
  perExpense: Map<string, { personId: string; oweCents: number }[]>;
  errors: { expenseId: string; message: string }[];
};

export function computeGuestResult(state: GuestState): GuestResult {
  const rows: { userId: string; paidCents: number; oweCents: number; currency: string }[] = [];
  const perExpense = new Map<string, { personId: string; oweCents: number }[]>();
  const errors: { expenseId: string; message: string }[] = [];
  let totalCents = 0;

  for (const expense of state.expenses) {
    if (expense.amountCents <= 0 || expense.participants.length === 0) continue;
    try {
      const shares = computeShares(
        expense.amountCents,
        expense.splitType,
        expense.participants.map((p) => ({ userId: p.personId, value: p.value })),
      );
      totalCents += expense.amountCents;
      perExpense.set(expense.id, shares.map((s) => ({ personId: s.userId, oweCents: s.oweCents })));
      rows.push({ userId: expense.payerId, paidCents: expense.amountCents, oweCents: 0, currency: state.currency });
      for (const share of shares) {
        rows.push({ userId: share.userId, paidCents: 0, oweCents: share.oweCents, currency: state.currency });
      }
    } catch (error) {
      errors.push({
        expenseId: expense.id,
        message: error instanceof SplitError ? error.message : "Aufteilung nicht möglich.",
      });
    }
  }

  const byCurrency = netBalances(rows);
  const balancesMap = byCurrency.get(state.currency) ?? new Map<string, number>();
  const balances = state.people.map((person) => ({
    personId: person.id,
    amountCents: balancesMap.get(person.id) ?? 0,
  }));

  return { balances, debts: simplifyDebts(balancesMap, state.currency), totalCents, perExpense, errors };
}

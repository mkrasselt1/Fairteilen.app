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

/** Standardtexte der leeren Abrechnung – übersetzbar von außen. */
export type GuestLabels = { title: string; me: string; second: string };

const DEFAULT_LABELS: GuestLabels = { title: "Meine Abrechnung", me: "Ich", second: "Person 2" };

export function emptyGuestState(labels: GuestLabels = DEFAULT_LABELS): GuestState {
  return {
    title: labels.title,
    currency: "EUR",
    people: [
      { id: newId(), name: labels.me },
      { id: newId(), name: labels.second },
    ],
    expenses: [],
  };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function loadGuestState(labels?: GuestLabels): GuestState {
  if (typeof window === "undefined") return emptyGuestState(labels);
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return emptyGuestState(labels);
    const parsed = JSON.parse(raw) as GuestState;
    if (!Array.isArray(parsed.people) || !Array.isArray(parsed.expenses)) return emptyGuestState(labels);
    return parsed;
  } catch {
    return emptyGuestState(labels);
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
  errors: { expenseId: string; template: string; params: Record<string, string | number> }[];
};

export function computeGuestResult(state: GuestState): GuestResult {
  const rows: { userId: string; paidCents: number; oweCents: number; currency: string }[] = [];
  const perExpense = new Map<string, { personId: string; oweCents: number }[]>();
  const errors: { expenseId: string; template: string; params: Record<string, string | number> }[] = [];
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
      errors.push(
        error instanceof SplitError
          ? { expenseId: expense.id, template: error.template, params: error.params }
          : { expenseId: expense.id, template: "Aufteilung nicht möglich.", params: {} },
      );
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

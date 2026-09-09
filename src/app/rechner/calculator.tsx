"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_GROUPS, categoryOf } from "@/lib/categories";
import { CURRENCIES, formatMoney, parseAmountToCents } from "@/lib/money";
import { toDateInputValue } from "@/lib/format";
import { SPLIT_TYPES, type SplitType } from "@/lib/split";
import {
  computeGuestResult,
  emptyGuestState,
  loadGuestState,
  newId,
  saveGuestState,
  type GuestExpense,
  type GuestState,
} from "@/lib/guest";

const SPLIT_LABELS: Record<SplitType, string> = {
  equal: "Gleich",
  exact: "Beträge",
  percent: "Prozent",
  shares: "Anteile",
  adjustment: "Zu-/Abschlag",
};

type Draft = {
  id: string | null;
  description: string;
  amount: string;
  date: string;
  category: string;
  payerId: string;
  splitType: SplitType;
  selected: Set<string>;
  values: Record<string, string>;
};

function emptyDraft(state: GuestState): Draft {
  return {
    id: null,
    description: "",
    amount: "",
    date: toDateInputValue(new Date()),
    category: "general",
    payerId: state.people[0]?.id ?? "",
    splitType: "equal",
    selected: new Set(state.people.map((p) => p.id)),
    values: {},
  };
}

function parseValue(splitType: SplitType, raw: string, currency: string): number {
  const text = raw.trim();
  if (!text) return splitType === "shares" ? 1 : 0;
  if (splitType === "percent") return Math.round(Number(text.replace(",", ".")) * 100) || 0;
  if (splitType === "shares") return Math.round(Number(text.replace(",", "."))) || 0;
  return parseAmountToCents(text, currency) ?? 0;
}

export function GuestCalculator() {
  const [state, setState] = useState<GuestState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadGuestState();
    setState(loaded);
    setDraft(emptyDraft(loaded));
  }, []);

  useEffect(() => {
    if (state) saveGuestState(state);
  }, [state]);

  const result = useMemo(() => (state ? computeGuestResult(state) : null), [state]);

  if (!state || !draft || !result) {
    return <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">Wird geladen …</div>;
  }

  const nameOf = (id: string) => state.people.find((p) => p.id === id)?.name ?? "?";

  function update(patch: Partial<GuestState>) {
    setState((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function addPerson() {
    const person = { id: newId(), name: `Person ${state!.people.length + 1}` };
    update({ people: [...state!.people, person] });
    setDraft({ ...draft!, selected: new Set([...draft!.selected, person.id]) });
  }

  function removePerson(id: string) {
    if (state!.people.length <= 2) {
      setError("Es braucht mindestens zwei Personen.");
      return;
    }
    if (state!.expenses.some((e) => e.payerId === id || e.participants.some((p) => p.personId === id))) {
      setError("Diese Person kommt noch in einer Ausgabe vor. Bitte die Ausgabe zuerst anpassen.");
      return;
    }
    setError(null);
    update({ people: state!.people.filter((p) => p.id !== id) });
    const selected = new Set(draft!.selected);
    selected.delete(id);
    setDraft({ ...draft!, selected });
  }

  function submitDraft(event: React.FormEvent) {
    event.preventDefault();
    const amountCents = parseAmountToCents(draft!.amount, state!.currency);
    if (!draft!.description.trim()) return setError("Bitte gib eine Beschreibung an.");
    if (!amountCents || amountCents <= 0) return setError("Bitte gib einen Betrag größer 0 an.");
    if (draft!.selected.size === 0) return setError("Bitte wähle mindestens eine beteiligte Person.");

    const expense: GuestExpense = {
      id: draft!.id ?? newId(),
      description: draft!.description.trim(),
      amountCents,
      date: draft!.date,
      category: draft!.category,
      payerId: draft!.payerId,
      splitType: draft!.splitType,
      participants: [...draft!.selected].map((personId) => ({
        personId,
        value: parseValue(draft!.splitType, draft!.values[personId] ?? "", state!.currency),
      })),
    };

    const expenses = draft!.id
      ? state!.expenses.map((e) => (e.id === draft!.id ? expense : e))
      : [expense, ...state!.expenses];

    setError(null);
    update({ expenses });
    setDraft(emptyDraft(state!));
  }

  function editExpense(expense: GuestExpense) {
    setDraft({
      id: expense.id,
      description: expense.description,
      amount: (expense.amountCents / 100).toFixed(2).replace(".", ","),
      date: expense.date,
      category: expense.category,
      payerId: expense.payerId,
      splitType: expense.splitType,
      selected: new Set(expense.participants.map((p) => p.personId)),
      values: Object.fromEntries(
        expense.participants.map((p) => [
          p.personId,
          expense.splitType === "percent"
            ? String(p.value / 100)
            : expense.splitType === "shares"
              ? String(p.value)
              : (p.value / 100).toFixed(2),
        ]),
      ),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportCsv() {
    const rows = [["Datum", "Beschreibung", "Kategorie", "Betrag", "Währung", "Bezahlt von", "Aufteilung", "Beteiligte"]];
    for (const expense of state!.expenses) {
      rows.push([
        expense.date,
        expense.description,
        categoryOf(expense.category).label,
        (expense.amountCents / 100).toFixed(2),
        state!.currency,
        nameOf(expense.payerId),
        SPLIT_LABELS[expense.splitType],
        expense.participants.map((p) => nameOf(p.personId)).join(" | "),
      ]);
    }
    rows.push([]);
    rows.push(["Ausgleich"]);
    for (const debt of result!.debts) {
      rows.push([
        "",
        `${nameOf(debt.fromUserId)} zahlt an ${nameOf(debt.toUserId)}`,
        "",
        (debt.amountCents / 100).toFixed(2),
        debt.currency,
      ]);
    }

    const csv =
      "﻿" +
      rows.map((row) => row.map((cell) => (/[";\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state!.title.replace(/[^\p{L}\d]+/gu, "-").toLowerCase() || "abrechnung"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareSummary() {
    const lines = [
      `${state!.title} – Gesamtausgaben ${formatMoney(result!.totalCents, state!.currency)}`,
      "",
      ...result!.debts.map(
        (debt) =>
          `${nameOf(debt.fromUserId)} → ${nameOf(debt.toUserId)}: ${formatMoney(debt.amountCents, debt.currency)}`,
      ),
    ];
    if (result!.debts.length === 0) lines.push("Alles ausgeglichen 🎉");
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ title: state!.title, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Ergebnis kopieren:", text);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="label" htmlFor="title">
              Titel
            </label>
            <input
              id="title"
              value={state.title}
              onChange={(e) => update({ title: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="guest-currency">
              Währung
            </label>
            <select
              id="guest-currency"
              value={state.currency}
              onChange={(e) => update({ currency: e.target.value })}
              className="input sm:w-32"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="label">Personen</span>
          <ul className="space-y-2">
            {state.people.map((person, index) => (
              <li key={person.id} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm text-slate-400">{index + 1}</span>
                <input
                  value={person.name}
                  onChange={(e) =>
                    update({
                      people: state.people.map((p) => (p.id === person.id ? { ...p, name: e.target.value } : p)),
                    })
                  }
                  className="input flex-1"
                  aria-label={`Name von Person ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removePerson(person.id)}
                  className="btn-ghost !px-2 !py-1 text-sm"
                  aria-label={`${person.name} entfernen`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addPerson} className="btn-secondary mt-3">
            + Person hinzufügen
          </button>
        </div>
      </section>

      <form onSubmit={submitDraft} className="card space-y-4 p-5">
        <h2 className="font-semibold">{draft.id ? "Ausgabe bearbeiten" : "Ausgabe hinzufügen"}</h2>

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div>
            <label className="label" htmlFor="guest-description">
              Wofür?
            </label>
            <input
              id="guest-description"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="input"
              placeholder="z. B. Tanken"
            />
          </div>
          <div>
            <label className="label" htmlFor="guest-amount">
              Betrag
            </label>
            <input
              id="guest-amount"
              inputMode="decimal"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              className="input font-semibold"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="guest-payer">
              Bezahlt von
            </label>
            <select
              id="guest-payer"
              value={draft.payerId}
              onChange={(e) => setDraft({ ...draft, payerId: e.target.value })}
              className="input"
            >
              {state.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="guest-date">
              Datum
            </label>
            <input
              id="guest-date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="guest-category">
              Kategorie
            </label>
            <select
              id="guest-category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="input"
            >
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {CATEGORIES.filter((c) => c.group === group).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="label">Aufteilung</span>
          <div className="flex flex-wrap gap-1.5">
            {SPLIT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDraft({ ...draft, splitType: type, values: {} })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  draft.splitType === type
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {SPLIT_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {state.people.map((person) => {
            const checked = draft.selected.has(person.id);
            return (
              <li key={person.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const selected = new Set(draft.selected);
                    if (checked) selected.delete(person.id);
                    else selected.add(person.id);
                    setDraft({ ...draft, selected });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  aria-label={`${person.name} beteiligen`}
                />
                <span className="flex-1 truncate text-sm">{person.name}</span>
                {checked && draft.splitType !== "equal" && (
                  <input
                    inputMode="decimal"
                    value={draft.values[person.id] ?? ""}
                    onChange={(e) => setDraft({ ...draft, values: { ...draft.values, [person.id]: e.target.value } })}
                    className="input w-28 text-right"
                    placeholder={draft.splitType === "shares" ? "1" : "0"}
                    aria-label={`Wert für ${person.name}`}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {error && <p className="negative text-sm">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            {draft.id ? "Änderungen übernehmen" : "Ausgabe hinzufügen"}
          </button>
          {draft.id && (
            <button type="button" onClick={() => setDraft(emptyDraft(state))} className="btn-secondary">
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="font-semibold">Ausgaben</h2>
          <span className="hint">Gesamt {formatMoney(result.totalCents, state.currency)}</span>
        </div>
        {state.expenses.length === 0 ? (
          <p className="px-4 pb-5 text-sm text-slate-500 dark:text-slate-400">
            Noch keine Ausgaben erfasst.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {state.expenses.map((expense) => {
              const failure = result.errors.find((e) => e.expenseId === expense.id);
              return (
                <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl" aria-hidden>
                    {categoryOf(expense.category).icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{expense.description}</span>
                    <span className="hint block truncate">
                      {nameOf(expense.payerId)} · {SPLIT_LABELS[expense.splitType]} ·{" "}
                      {expense.participants.length} beteiligt
                    </span>
                    {failure && <span className="negative block text-xs">{failure.message}</span>}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(expense.amountCents, state.currency)}
                  </span>
                  <button type="button" onClick={() => editExpense(expense)} className="btn-ghost !px-2 !py-1 text-xs">
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ expenses: state.expenses.filter((e) => e.id !== expense.id) })}
                    className="btn-ghost !px-2 !py-1 text-xs"
                    aria-label="Ausgabe löschen"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Ergebnis</h2>

        <ul className="space-y-2">
          {result.balances.map((balance) => (
            <li key={balance.personId} className="flex items-center gap-3 text-sm">
              <span className="flex-1 truncate">{nameOf(balance.personId)}</span>
              <span
                className={`font-semibold tabular-nums ${
                  balance.amountCents > 0 ? "positive" : balance.amountCents < 0 ? "negative" : "text-slate-500"
                }`}
              >
                {balance.amountCents === 0
                  ? "ausgeglichen"
                  : `${balance.amountCents > 0 ? "+" : "−"}${formatMoney(
                      Math.abs(balance.amountCents),
                      state.currency,
                    )}`}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            So wird ausgeglichen
          </h3>
          {result.debts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Alles ausgeglichen 🎉</p>
          ) : (
            <ul className="space-y-2">
              {result.debts.map((debt, index) => (
                <li key={index} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60">
                  <strong>{nameOf(debt.fromUserId)}</strong> zahlt <strong>{nameOf(debt.toUserId)}</strong>{" "}
                  <span className="font-semibold">{formatMoney(debt.amountCents, debt.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={shareSummary} className="btn-secondary">
            Ergebnis teilen
          </button>
          <button type="button" onClick={exportCsv} className="btn-secondary">
            CSV herunterladen
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Alle Eingaben in diesem Browser löschen?")) return;
              const fresh = emptyGuestState();
              setState(fresh);
              setDraft(emptyDraft(fresh));
              setError(null);
            }}
            className="btn-ghost"
          >
            Zurücksetzen
          </button>
        </div>
      </section>
    </div>
  );
}

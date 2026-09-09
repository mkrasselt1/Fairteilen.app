"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { saveExpenseAction } from "@/actions/expenses";
import { FormAlert, SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/ui";
import { CATEGORIES, CATEGORY_GROUPS } from "@/lib/categories";
import { CURRENCIES, formatMoney, parseAmountToCents } from "@/lib/money";
import { computeShares, SplitError, type SplitType } from "@/lib/split";
import { toDateInputValue } from "@/lib/format";

export type PersonOption = { id: string; name: string; email: string; avatarColor: string };

export type ExpenseFormGroup = {
  id: string;
  name: string;
  currency: string;
  members: PersonOption[];
};

export type ExpenseFormInitial = {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  date: string;
  category: string;
  notes: string | null;
  splitType: SplitType;
  groupId: string | null;
  recurrence: string | null;
  recurrenceUntil: string | null;
  shares: { userId: string; paidCents: number; oweCents: number }[];
};

const SPLIT_TABS: { id: SplitType; label: string; hint: string }[] = [
  { id: "equal", label: "Gleich", hint: "Der Betrag wird gleichmäßig auf alle Ausgewählten verteilt." },
  { id: "exact", label: "Beträge", hint: "Gib für jede Person den genauen Betrag an. Die Summe muss stimmen." },
  { id: "percent", label: "Prozent", hint: "Verteile den Betrag prozentual – zusammen müssen es 100 % sein." },
  { id: "shares", label: "Anteile", hint: "Zum Beispiel 2 Anteile für ein Paar und 1 Anteil pro Einzelperson." },
  {
    id: "adjustment",
    label: "Zu-/Abschlag",
    hint: "Zuerst werden individuelle Zuschläge abgezogen, der Rest wird gleichmäßig geteilt.",
  },
];

const RECURRENCE_OPTIONS = [
  { id: "none", label: "Einmalig" },
  { id: "daily", label: "Täglich" },
  { id: "weekly", label: "Wöchentlich" },
  { id: "monthly", label: "Monatlich" },
  { id: "yearly", label: "Jährlich" },
];

function parseValueFor(splitType: SplitType, raw: string, currency: string): number {
  const text = raw.trim();
  if (!text) return splitType === "shares" ? 1 : 0;
  if (splitType === "percent") return Math.round(Number(text.replace(",", ".")) * 100) || 0;
  if (splitType === "shares") return Math.round(Number(text.replace(",", "."))) || 0;
  return parseAmountToCents(text, currency) ?? 0;
}

export function ExpenseForm({
  currentUser,
  groups,
  friends,
  initial,
  defaultGroupId,
  defaultFriendId,
  defaultCurrency = "EUR",
}: {
  currentUser: PersonOption;
  groups: ExpenseFormGroup[];
  friends: PersonOption[];
  initial?: ExpenseFormInitial;
  defaultGroupId?: string;
  defaultFriendId?: string;
  defaultCurrency?: string;
}) {
  const [state, formAction] = useActionState(saveExpenseAction, null);

  const [groupId, setGroupId] = useState<string>(initial?.groupId ?? defaultGroupId ?? "");
  const [currency, setCurrency] = useState<string>(
    initial?.currency ?? groups.find((g) => g.id === defaultGroupId)?.currency ?? defaultCurrency,
  );
  const [amountText, setAmountText] = useState<string>(
    initial ? (initial.amountCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? "equal");
  const [payerMode, setPayerMode] = useState<"single" | "multiple">(
    initial && initial.shares.filter((s) => s.paidCents > 0).length > 1 ? "multiple" : "single",
  );
  const [paidBy, setPaidBy] = useState<string>(
    initial?.shares.find((s) => s.paidCents > 0)?.userId ?? currentUser.id,
  );
  const [recurrence, setRecurrence] = useState<string>(initial?.recurrence ?? "none");

  const people: PersonOption[] = useMemo(() => {
    const group = groups.find((g) => g.id === groupId);
    if (group) return group.members;
    const base = [currentUser, ...friends.filter((f) => f.id !== currentUser.id)];
    return base;
  }, [groupId, groups, friends, currentUser]);

  const initialSelected = useMemo(() => {
    if (initial) return new Set(initial.shares.filter((s) => s.oweCents !== 0 || s.paidCents !== 0).map((s) => s.userId));
    if (defaultFriendId) return new Set([currentUser.id, defaultFriendId]);
    return new Set(people.map((p) => p.id));
  }, [initial, defaultFriendId, currentUser.id, people]);

  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    if (initial) {
      for (const share of initial.shares) {
        if (initial.splitType === "exact") start[share.userId] = (share.oweCents / 100).toFixed(2);
      }
    }
    return start;
  });
  const [paidValues, setPaidValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    if (initial) {
      for (const share of initial.shares) {
        if (share.paidCents > 0) start[share.userId] = (share.paidCents / 100).toFixed(2);
      }
    }
    return start;
  });

  const amountCents = parseAmountToCents(amountText, currency) ?? 0;
  const participants = people.filter((p) => selected.has(p.id));

  const preview = useMemo(() => {
    if (amountCents <= 0 || participants.length === 0) return null;
    try {
      const shares = computeShares(
        amountCents,
        splitType,
        participants.map((p) => ({ userId: p.id, value: parseValueFor(splitType, values[p.id] ?? "", currency) })),
      );
      return { shares, error: null as string | null };
    } catch (error) {
      return { shares: [], error: error instanceof SplitError ? error.message : "Aufteilung nicht möglich." };
    }
  }, [amountCents, participants, splitType, values, currency]);

  const paidSum = payerMode === "multiple"
    ? people.reduce((acc, p) => acc + (parseAmountToCents(paidValues[p.id] ?? "", currency) ?? 0), 0)
    : amountCents;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeTab = SPLIT_TABS.find((t) => t.id === splitType)!;

  return (
    <form action={formAction} className="space-y-6">
      {initial && <input type="hidden" name="expenseId" value={initial.id} />}
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="splitType" value={splitType} />
      <input type="hidden" name="payerMode" value={payerMode} />
      {participants.map((p) => (
        <input key={p.id} type="hidden" name="participant" value={p.id} />
      ))}

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="description">
            Wofür?
          </label>
          <input
            id="description"
            name="description"
            required
            maxLength={120}
            defaultValue={initial?.description ?? ""}
            className="input"
            placeholder="z. B. Einkauf, Miete, Kinotickets"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="label" htmlFor="amount">
              Betrag
            </label>
            <input
              id="amount"
              name="amount"
              required
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="input text-lg font-semibold"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="label" htmlFor="currency">
              Währung
            </label>
            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input sm:w-32"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="groupId-select">
              Gruppe
            </label>
            <select
              id="groupId-select"
              value={groupId}
              onChange={(e) => {
                const next = e.target.value;
                setGroupId(next);
                const group = groups.find((g) => g.id === next);
                if (group) {
                  setCurrency(group.currency);
                  setSelected(new Set(group.members.map((m) => m.id)));
                } else {
                  setSelected(new Set([currentUser.id]));
                }
                setValues({});
              }}
              className="input"
            >
              <option value="">Ohne Gruppe (nur zwischen Personen)</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date">
              Datum
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={initial?.date ?? toDateInputValue(new Date())}
              className="input"
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Bezahlt von</h2>
          <button
            type="button"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            onClick={() => setPayerMode(payerMode === "single" ? "multiple" : "single")}
          >
            {payerMode === "single" ? "Mehrere Zahlende" : "Nur eine Person"}
          </button>
        </div>

        {payerMode === "single" ? (
          <select name="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="input">
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.id === currentUser.id ? "Du" : person.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            {people.map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <Avatar user={person} size={30} />
                <span className="flex-1 truncate text-sm">
                  {person.id === currentUser.id ? "Du" : person.name}
                </span>
                <input
                  name={`paid:${person.id}`}
                  inputMode="decimal"
                  value={paidValues[person.id] ?? ""}
                  onChange={(e) => setPaidValues({ ...paidValues, [person.id]: e.target.value })}
                  className="input w-32 text-right"
                  placeholder="0,00"
                />
              </div>
            ))}
            <p className={`text-sm ${paidSum === amountCents ? "hint" : "negative"}`}>
              Summe: {formatMoney(paidSum, currency)} von {formatMoney(amountCents, currency)}
              {paidSum !== amountCents && ` – es fehlen ${formatMoney(amountCents - paidSum, currency)}`}
            </p>
          </div>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Aufteilen</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SPLIT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSplitType(tab.id);
                  setValues({});
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  splitType === tab.id
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="hint mt-2">{activeTab.hint}</p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {people.map((person) => {
            const isSelected = selected.has(person.id);
            const share = preview?.shares.find((s) => s.userId === person.id);
            return (
              <div key={person.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(person.id)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  aria-label={`${person.name} beteiligen`}
                />
                <Avatar user={person} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {person.id === currentUser.id ? "Du" : person.name}
                  </span>
                  {isSelected && share && (
                    <span className="hint block">{formatMoney(share.oweCents, currency)}</span>
                  )}
                </span>
                {isSelected && splitType !== "equal" && (
                  <span className="flex items-center gap-1">
                    <input
                      name={`value:${person.id}`}
                      inputMode="decimal"
                      value={values[person.id] ?? ""}
                      onChange={(e) => setValues({ ...values, [person.id]: e.target.value })}
                      className="input w-28 text-right"
                      placeholder={splitType === "shares" ? "1" : "0"}
                    />
                    <span className="w-4 text-sm text-slate-500">
                      {splitType === "percent" ? "%" : splitType === "shares" ? "×" : ""}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {preview?.error && <p className="negative text-sm">{preview.error}</p>}
        {preview && !preview.error && (
          <p className="hint">
            {participants.length} {participants.length === 1 ? "Person" : "Personen"} beteiligt · Summe{" "}
            {formatMoney(preview.shares.reduce((a, s) => a + s.oweCents, 0), currency)}
          </p>
        )}
        {groupId === "" && friends.length === 0 && (
          <p className="hint">
            Du hast noch keine Kontakte.{" "}
            <Link href="/freunde" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Jetzt jemanden hinzufügen
            </Link>
          </p>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">
              Kategorie
            </label>
            <select id="category" name="category" defaultValue={initial?.category ?? "general"} className="input">
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
          <div>
            <label className="label" htmlFor="recurrence">
              Wiederholung
            </label>
            <select
              id="recurrence"
              name="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="input"
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {recurrence !== "none" && (
          <div>
            <label className="label" htmlFor="recurrenceUntil">
              Wiederholen bis (optional)
            </label>
            <input
              id="recurrenceUntil"
              name="recurrenceUntil"
              type="date"
              defaultValue={initial?.recurrenceUntil ?? ""}
              className="input sm:w-56"
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="notes">
            Notiz (optional)
          </label>
          <textarea id="notes" name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="input" />
        </div>
      </section>

      <FormAlert state={state} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton className="btn-primary">{initial ? "Änderungen speichern" : "Ausgabe speichern"}</SubmitButton>
        <Link href={groupId ? `/gruppen/${groupId}` : "/"} className="btn-secondary">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}

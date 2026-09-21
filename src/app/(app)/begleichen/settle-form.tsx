"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { settleUpAction } from "@/actions/expenses";
import { FormAlert, SubmitButton } from "@/components/forms";
import { CURRENCIES } from "@/lib/money";
import { toDateInputValue } from "@/lib/format";
import type { ExpenseFormGroup, PersonOption } from "@/components/expense-form";
import { PaymentDetailsCard } from "@/components/payment-details";
import type { PaymentDetails } from "@/lib/payment";

type PayablePerson = PersonOption & Partial<PaymentDetails>;

export function SettleForm({
  currentUser,
  groups,
  friends,
  defaults,
  returnTo,
  lockGroup = false,
}: {
  currentUser: PersonOption;
  groups: ExpenseFormGroup[];
  friends: PayablePerson[];
  defaults: { groupId: string; fromUserId: string; toUserId: string; amount: string; currency: string };
  returnTo?: string;
  lockGroup?: boolean;
}) {
  const [state, formAction] = useActionState(settleUpAction, null);
  const [groupId, setGroupId] = useState(defaults.groupId);
  const [currency, setCurrency] = useState(
    groups.find((g) => g.id === defaults.groupId)?.currency ?? defaults.currency,
  );

  const people = useMemo<PayablePerson[]>(() => {
    const group = groups.find((g) => g.id === groupId);
    if (group) return group.members;
    return [currentUser, ...friends.filter((f) => f.id !== currentUser.id)];
  }, [groupId, groups, friends, currentUser]);

  const [fromUserId, setFromUserId] = useState(defaults.fromUserId || currentUser.id);
  const [toUserId, setToUserId] = useState(defaults.toUserId);
  const recipient = people.find((person) => person.id === toUserId);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <div className={lockGroup ? "hidden" : ""}>
        <label className="label" htmlFor="groupId">
          Gruppe
        </label>
        <select
          id="groupId"
          name="groupId"
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            const group = groups.find((g) => g.id === e.target.value);
            if (group) setCurrency(group.currency);
          }}
          className="input"
        >
          <option value="">Ohne Gruppe</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fromUserId">
            Wer zahlt?
          </label>
          <select
            id="fromUserId"
            name="fromUserId"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value)}
            className="input"
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.id === currentUser.id ? "Du" : person.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="toUserId">
            An wen?
          </label>
          <select
            id="toUserId"
            name="toUserId"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="input"
            required
          >
            <option value="">Bitte auswählen …</option>
            {people
              .filter((person) => person.id !== fromUserId)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.id === currentUser.id ? "Du" : person.name}
                </option>
              ))}
          </select>
        </div>
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
            defaultValue={defaults.amount}
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

      <div>
        <label className="label" htmlFor="date">
          Datum
        </label>
        <input id="date" name="date" type="date" defaultValue={toDateInputValue(new Date())} className="input" />
      </div>

      {recipient && fromUserId === currentUser.id && (
        <PaymentDetailsCard
          name={recipient.name}
          details={{
            iban: recipient.iban ?? null,
            weroContact: recipient.weroContact ?? null,
            paypalEmail: recipient.paypalEmail ?? null,
            paymentNote: recipient.paymentNote ?? null,
          }}
        />
      )}

      <div>
        <label className="label" htmlFor="notes">
          Notiz (optional)
        </label>
        <input id="notes" name="notes" className="input" placeholder="z. B. per Überweisung" />
      </div>

      <FormAlert state={state} />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary">Zahlung speichern</SubmitButton>
        <Link href={returnTo ?? (groupId ? `/gruppen/${groupId}` : "/uebersicht")} className="btn-secondary">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}

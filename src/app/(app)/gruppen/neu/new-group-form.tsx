"use client";

import { useActionState, useState } from "react";
import { createGroupAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";
import { GROUP_TYPES } from "@/lib/categories";
import { CURRENCIES } from "@/lib/money";

export function NewGroupForm({ defaultCurrency }: { defaultCurrency: string }) {
  const [state, formAction] = useActionState(createGroupAction, null);
  const [type, setType] = useState("home");

  return (
    <form action={formAction} className="card space-y-5 p-5">
      <div>
        <label className="label" htmlFor="name">
          Name der Gruppe
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          className="input"
          placeholder="z. B. WG Hauptstraße"
          autoFocus
        />
      </div>

      <div>
        <span className="label">Art</span>
        <input type="hidden" name="type" value={type} />
        <div className="flex flex-wrap gap-2">
          {GROUP_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setType(option.id)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                type === option.id
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              <span aria-hidden>{option.icon}</span> {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="currency">
          Währung der Gruppe
        </label>
        <select id="currency" name="currency" defaultValue={defaultCurrency} className="input sm:w-56">
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} – {currency.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="memberEmails">
          Mitglieder einladen (optional)
        </label>
        <textarea
          id="memberEmails"
          name="memberEmails"
          rows={2}
          className="input"
          placeholder="alex@example.com, jamie@example.com"
        />
        <p className="hint mt-1">
          Personen mit Konto werden direkt hinzugefügt. Für alle anderen bekommst du danach einen Einladungslink.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="simplifyDebts"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          <span className="font-medium">Schulden vereinfachen</span>
          <span className="hint block">
            Fasst Zahlungen so zusammen, dass möglichst wenige Überweisungen nötig sind.
          </span>
        </span>
      </label>

      <FormAlert state={state} />
      <SubmitButton className="btn-primary">Gruppe erstellen</SubmitButton>
    </form>
  );
}

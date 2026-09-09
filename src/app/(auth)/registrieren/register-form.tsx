"use client";

import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { FormAlert, SubmitButton } from "@/components/forms";
import { CURRENCIES } from "@/lib/money";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(registerAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" autoComplete="name" required className="input" placeholder="Alex Muster" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-Mail-Adresse
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input"
        />
        <p className="hint mt-1">Mindestens 8 Zeichen.</p>
      </div>
      <div>
        <label className="label" htmlFor="currency">
          Standardwährung
        </label>
        <select id="currency" name="currency" defaultValue="EUR" className="input">
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} – {currency.name}
            </option>
          ))}
        </select>
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Konto wird erstellt …">
        Konto erstellen
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/actions/auth";
import { FormAlert, SubmitButton } from "@/components/forms";
import { CURRENCIES } from "@/lib/money";

export function ProfileForm({ user }: { user: { name: string; email: string; currency: string } }) {
  const [state, formAction] = useActionState(updateProfileAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" defaultValue={user.name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-Mail-Adresse
        </label>
        <input id="email" name="email" type="email" defaultValue={user.email} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="currency">
          Standardwährung
        </label>
        <select id="currency" name="currency" defaultValue={user.currency} className="input sm:w-56">
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} – {currency.name}
            </option>
          ))}
        </select>
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary">Speichern</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">
          Aktuelles Passwort
        </label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="next">
            Neues Passwort
          </label>
          <input
            id="next"
            name="next"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="repeat">
            Wiederholen
          </label>
          <input
            id="repeat"
            name="repeat"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
          />
        </div>
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-secondary">Passwort ändern</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccountAction, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Konto wirklich unwiderruflich löschen?")) event.preventDefault();
      }}
      className="space-y-3"
    >
      <input
        name="password"
        type="password"
        required
        className="input sm:w-64"
        placeholder="Passwort zur Bestätigung"
        autoComplete="current-password"
      />
      <FormAlert state={state} />
      <SubmitButton className="btn-danger" pendingLabel="Wird gelöscht …">
        Konto endgültig löschen
      </SubmitButton>
    </form>
  );
}

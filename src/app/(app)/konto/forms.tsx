"use client";

import { useActionState, useEffect, useState } from "react";
import {
  changePasswordAction,
  deleteAccountAction,
  unlinkOAuthAction,
  updateProfileAction,
} from "@/actions/auth";
import { FormAlert, SubmitButton } from "@/components/forms";
import { ConfirmDialog } from "@/components/modal";
import { CURRENCIES } from "@/lib/money";

export function ProfileForm({ user }: { user: { name: string; email: string; currency: string } }) {
  const [state, formAction] = useActionState(updateProfileAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" defaultValue={user.name} required maxLength={80} className="input" />
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

export function ChangePasswordForm({ hasPassword = true }: { hasPassword?: boolean }) {
  const [state, formAction] = useActionState(changePasswordAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">
          Aktuelles Passwort {!hasPassword && <span className="hint">(nicht nötig)</span>}
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required={hasPassword}
          disabled={!hasPassword}
          className="input"
        />
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
      <SubmitButton className="btn-secondary">{hasPassword ? "Passwort ändern" : "Passwort setzen"}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ hasPassword = true }: { hasPassword?: boolean }) {
  const [state, formAction] = useActionState(deleteAccountAction, null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state) setOpen(false);
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      {hasPassword && (
        <input
          name="password"
          type="password"
          required
          className="input sm:w-64"
          placeholder="Passwort zur Bestätigung"
          autoComplete="current-password"
        />
      )}
      <FormAlert state={state} />
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Konto endgültig löschen
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Konto endgültig löschen?"
        description="Alle deine Daten werden unwiderruflich entfernt: Profil, Gruppenmitgliedschaften, Ausgaben und Belege. Das lässt sich nicht rückgängig machen."
        confirm={
          <SubmitButton className="btn-danger" pendingLabel="Wird gelöscht …">
            Ja, Konto löschen
          </SubmitButton>
        }
      />
    </form>
  );
}

export function UnlinkForm({ provider, label }: { provider: string; label: string }) {
  const [state, formAction] = useActionState(unlinkOAuthAction, null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state) setOpen(false);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="provider" value={provider} />
      <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setOpen(true)}>
        Trennen
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Verknüpfung mit ${label} entfernen?`}
        description={`Du kannst dich danach nicht mehr über ${label} anmelden. Ein gesetztes Passwort oder ein anderer verknüpfter Anbieter bleibt davon unberührt.`}
        confirm={
          <SubmitButton className="btn-danger" pendingLabel="…">
            Verknüpfung entfernen
          </SubmitButton>
        }
      />

      {state?.error && <span className="negative text-xs">{state.error}</span>}
    </form>
  );
}

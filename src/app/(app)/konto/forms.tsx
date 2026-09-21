"use client";

import { useActionState, useEffect, useState } from "react";
import {
  changePasswordAction,
  deleteAccountAction,
  unlinkOAuthAction,
  updatePaymentDetailsAction,
  updateProfileAction,
} from "@/actions/auth";
import { formatIban, type PaymentDetails } from "@/lib/payment";
import { FormAlert, SubmitButton } from "@/components/forms";
import { ConfirmDialog } from "@/components/modal";
import { CURRENCIES } from "@/lib/money";
import { useT } from "@/components/i18n";

export function ProfileForm({ user }: { user: { name: string; email: string; currency: string } }) {
  const t = useT();
  const [state, formAction] = useActionState(updateProfileAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          {t("Name")}
        </label>
        <input id="name" name="name" defaultValue={user.name} required maxLength={80} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          {t("E-Mail-Adresse")}
        </label>
        <input id="email" name="email" type="email" defaultValue={user.email} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="currency">
          {t("Standardwährung")}
        </label>
        <select id="currency" name="currency" defaultValue={user.currency} className="input sm:w-56">
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} – {t(currency.name)}
            </option>
          ))}
        </select>
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary">{t("Speichern")}</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm({ hasPassword = true }: { hasPassword?: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(changePasswordAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">
          {t("Aktuelles Passwort")} {!hasPassword && <span className="hint">{t("(nicht nötig)")}</span>}
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
            {t("Neues Passwort")}
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
            {t("Wiederholen")}
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
      <SubmitButton className="btn-secondary">
        {hasPassword ? t("Passwort ändern") : t("Passwort setzen")}
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ hasPassword = true }: { hasPassword?: boolean }) {
  const t = useT();
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
          placeholder={t("Passwort zur Bestätigung")}
          autoComplete="current-password"
        />
      )}
      <FormAlert state={state} />
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        {t("Konto endgültig löschen")}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("Konto endgültig löschen?")}
        description={t(
          "Alle deine Daten werden unwiderruflich entfernt: Profil, Gruppenmitgliedschaften, Ausgaben und Belege. Das lässt sich nicht rückgängig machen.",
        )}
        confirm={
          <SubmitButton className="btn-danger" pendingLabel={t("Wird gelöscht …")}>
            {t("Ja, Konto löschen")}
          </SubmitButton>
        }
      />
    </form>
  );
}

export function UnlinkForm({ provider, label }: { provider: string; label: string }) {
  const t = useT();
  const [state, formAction] = useActionState(unlinkOAuthAction, null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state) setOpen(false);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="provider" value={provider} />
      <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setOpen(true)}>
        {t("Trennen")}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("Verknüpfung mit {anbieter} entfernen?", { anbieter: label })}
        description={t(
          "Du kannst dich danach nicht mehr über {anbieter} anmelden. Ein gesetztes Passwort oder ein anderer verknüpfter Anbieter bleibt davon unberührt.",
          { anbieter: label },
        )}
        confirm={
          <SubmitButton className="btn-danger" pendingLabel="…">
            {t("Verknüpfung entfernen")}
          </SubmitButton>
        }
      />

      {state?.error && <span className="negative text-xs">{state.error}</span>}
    </form>
  );
}

export function PaymentDetailsForm({ details }: { details: PaymentDetails }) {
  const t = useT();
  const [state, formAction] = useActionState(updatePaymentDetailsAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="weroContact">
          {t("Wero")}
        </label>
        <input
          id="weroContact"
          name="weroContact"
          defaultValue={details.weroContact ?? ""}
          className="input"
          placeholder={t("+49 170 1234567 oder name@example.com")}
          autoComplete="tel"
        />
        <p className="hint mt-1">
          {t("Handynummer oder E-Mail-Adresse, mit der du Wero in deiner Banking-App nutzt.")}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="iban">
          IBAN
        </label>
        <input
          id="iban"
          name="iban"
          defaultValue={details.iban ? formatIban(details.iban) : ""}
          className="input font-mono"
          placeholder="DE89 3704 0044 0532 0130 00"
          spellCheck={false}
        />
      </div>
      <div>
        <label className="label" htmlFor="paypalEmail">
          {t("PayPal-Adresse")} <span className="hint">{t("(optional)")}</span>
        </label>
        <input
          id="paypalEmail"
          name="paypalEmail"
          type="email"
          defaultValue={details.paypalEmail ?? ""}
          className="input"
          placeholder="name@example.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="paymentNote">
          {t("Hinweis")} <span className="hint">{t("(optional)")}</span>
        </label>
        <textarea
          id="paymentNote"
          name="paymentNote"
          rows={2}
          maxLength={500}
          defaultValue={details.paymentNote ?? ""}
          className="input"
          placeholder={t("z. B. „bar ist mir am liebsten“")}
        />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary">{t("Speichern")}</SubmitButton>
    </form>
  );
}

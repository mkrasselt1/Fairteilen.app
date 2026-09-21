"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { FormAlert, SubmitButton } from "@/components/forms";
import { useT } from "@/components/i18n";

export function LoginForm({ next }: { next: string }) {
  const t = useT();
  const [state, formAction] = useActionState(loginAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">
          {t("E-Mail-Adresse")}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          {t("Passwort")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary w-full" pendingLabel={t("Anmelden …")}>
        {t("Anmelden")}
      </SubmitButton>
    </form>
  );
}

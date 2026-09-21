"use client";

import { useActionState } from "react";
import { createSharedBoardAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";
import { CURRENCIES } from "@/lib/money";

export function NewBoardForm({ defaultCurrency, ownName }: { defaultCurrency: string; ownName: string }) {
  const [state, formAction] = useActionState(createSharedBoardAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Worum geht es?
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          className="input"
          placeholder="z. B. Wochenende in Prag"
          autoFocus
        />
      </div>

      {ownName ? (
        <input type="hidden" name="ownName" value={ownName} />
      ) : (
        <div>
          <label className="label" htmlFor="ownName">
            Wie heißt du?
          </label>
          <input id="ownName" name="ownName" required maxLength={80} className="input" placeholder="Dein Name" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="others">
          Wer ist noch dabei? <span className="hint">(kannst du später ergänzen)</span>
        </label>
        <textarea
          id="others"
          name="others"
          rows={3}
          className="input"
          placeholder={"Ein Name pro Zeile\nJamie\nRobin"}
        />
      </div>

      <div>
        <label className="label" htmlFor="currency">
          Währung
        </label>
        <select id="currency" name="currency" defaultValue={defaultCurrency} className="input sm:w-56">
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} – {currency.name}
            </option>
          ))}
        </select>
      </div>

      <FormAlert state={state} />
      <SubmitButton className="btn-primary w-full !py-3 !text-base" pendingLabel="Wird angelegt …">
        Abrechnung anlegen
      </SubmitButton>
    </form>
  );
}

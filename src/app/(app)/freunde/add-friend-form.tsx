"use client";

import { useActionState } from "react";
import { addFriendAction } from "@/actions/friends";
import { FormAlert, SubmitButton } from "@/components/forms";
import { useT } from "@/components/i18n";

export function AddFriendForm() {
  const t = useT();
  const [state, formAction] = useActionState(addFriendAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <label className="label" htmlFor="friend-email">
        {t("Kontakt hinzufügen")}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="friend-email"
          name="email"
          type="email"
          required
          className="input flex-1 min-w-[14rem]"
          placeholder="name@example.com"
        />
        <SubmitButton className="btn-primary" pendingLabel="…">
          {t("Hinzufügen")}
        </SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { addFriendAction } from "@/actions/friends";
import { FormAlert, SubmitButton } from "@/components/forms";

export function AddFriendForm() {
  const [state, formAction] = useActionState(addFriendAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <label className="label" htmlFor="friend-email">
        Kontakt hinzufügen
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
          Hinzufügen
        </SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}

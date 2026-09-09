"use client";

import { useActionState } from "react";
import { joinGroupAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";

export function JoinForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(joinGroupAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Beitreten …">
        Gruppe beitreten
      </SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}

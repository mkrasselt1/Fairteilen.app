"use client";

import { useActionState, useEffect, useRef } from "react";
import { addGuestAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";

export function AddPersonForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(addGuestAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          maxLength={80}
          className="input flex-1 min-w-[12rem]"
          placeholder="Noch jemanden hinzufügen"
          aria-label="Name der Person"
        />
        <SubmitButton className="btn-secondary" pendingLabel="…">
          Hinzufügen
        </SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}

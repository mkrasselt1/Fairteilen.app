"use client";

import { useActionState, useEffect, useRef } from "react";
import { addGuestAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";
import { useT } from "@/components/i18n";

export function AddPersonForm({ groupId }: { groupId: string }) {
  const t = useT();
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
          placeholder={t("Noch jemanden hinzufügen")}
          aria-label={t("Name der Person")}
        />
        <SubmitButton className="btn-secondary" pendingLabel="…">
          {t("Hinzufügen")}
        </SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCommentAction } from "@/actions/expenses";
import { FormAlert, SubmitButton } from "@/components/forms";

export function CommentBox({ expenseId }: { expenseId: string }) {
  const [state, formAction] = useActionState(addCommentAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success !== undefined && !state?.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <textarea name="body" rows={2} className="input" placeholder="Kommentar schreiben …" required />
      {state?.error && <FormAlert state={state} />}
      <SubmitButton className="btn-secondary" pendingLabel="Wird gesendet …">
        Kommentieren
      </SubmitButton>
    </form>
  );
}

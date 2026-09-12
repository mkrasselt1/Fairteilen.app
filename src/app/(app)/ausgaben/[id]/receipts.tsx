"use client";

import { useActionState, useEffect, useState } from "react";
import { addAttachmentAction, deleteAttachmentAction } from "@/actions/expenses";
import { FormAlert, SubmitButton } from "@/components/forms";
import { ReceiptPicker } from "@/components/receipt-picker";

export function AddReceiptForm({ expenseId }: { expenseId: string }) {
  const [state, formAction] = useActionState(addAttachmentAction, null);
  // Nach dem Hochladen die Auswahl leeren, damit nichts versehentlich doppelt landet.
  const [pickerKey, setPickerKey] = useState(0);
  useEffect(() => {
    if (state?.success) setPickerKey((key) => key + 1);
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="expenseId" value={expenseId} />
      <ReceiptPicker key={pickerKey} label="" hint="Kassenbon abfotografieren oder Rechnung als PDF anhängen." />
      <FormAlert state={state} />
      <SubmitButton className="btn-secondary" pendingLabel="Wird hochgeladen …">
        Belege hochladen
      </SubmitButton>
    </form>
  );
}

export function DeleteReceiptButton({ attachmentId, name }: { attachmentId: string; name: string }) {
  const [state, formAction] = useActionState(deleteAttachmentAction, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`„${name}“ wirklich löschen?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <SubmitButton
        className="rounded-full bg-slate-900/70 px-2 py-0.5 text-xs text-white backdrop-blur hover:bg-slate-900"
        pendingLabel="…"
      >
        Löschen
      </SubmitButton>
      {state?.error && <p className="negative text-xs">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { addAttachmentAction, deleteAttachmentAction } from "@/actions/expenses";
import { FormAlert, SubmitButton } from "@/components/forms";
import { ReceiptPicker } from "@/components/receipt-picker";
import { ConfirmDialog } from "@/components/modal";
import { useT } from "@/components/i18n";

export function AddReceiptForm({ expenseId }: { expenseId: string }) {
  const t = useT();
  const [state, formAction] = useActionState(addAttachmentAction, null);
  // Nach dem Hochladen die Auswahl leeren, damit nichts versehentlich doppelt landet.
  const [pickerKey, setPickerKey] = useState(0);
  useEffect(() => {
    if (state?.success) setPickerKey((key) => key + 1);
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="expenseId" value={expenseId} />
      <ReceiptPicker
        key={pickerKey}
        label=""
        hint={t("Kassenbon abfotografieren oder Rechnung als PDF anhängen.")}
      />
      <FormAlert state={state} />
      <SubmitButton className="btn-secondary" pendingLabel={t("Wird hochgeladen …")}>
        {t("Belege hochladen")}
      </SubmitButton>
    </form>
  );
}

export function DeleteReceiptButton({ attachmentId, name }: { attachmentId: string; name: string }) {
  const t = useT();
  const [state, formAction] = useActionState(deleteAttachmentAction, null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state) setOpen(false);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-slate-900/70 px-2 py-0.5 text-xs text-white backdrop-blur hover:bg-slate-900"
      >
        {t("Löschen")}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("Beleg löschen?")}
        description={t("„{name}“ wird dauerhaft entfernt.", { name })}
        confirm={
          <SubmitButton className="btn-danger" pendingLabel="…">
            {t("Beleg löschen")}
          </SubmitButton>
        }
      />

      {state?.error && <p className="negative text-xs">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";
import { ConfirmDialog, Modal } from "@/components/modal";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel = "Wird gespeichert …",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role="status"
      className={`rounded-xl px-3.5 py-2.5 text-sm ${
        state.error
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

/** Kleines Formular mit Rückfrage im Modal – z. B. Löschen. */
export function ConfirmForm({
  action,
  confirm,
  title = "Bist du sicher?",
  hidden,
  className = "btn-danger",
  children,
  pendingLabel = "Einen Moment …",
  confirmLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  confirm: string;
  title?: string;
  hidden?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
  pendingLabel?: string;
  confirmLabel?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [open, setOpen] = useState(false);

  // Antwortet die Aktion (statt weiterzuleiten), Modal schließen – die
  // Rückmeldung steht darunter im Formular.
  useEffect(() => {
    if (state) setOpen(false);
  }, [state]);

  return (
    <form action={formAction} className="space-y-2">
      {Object.entries(hidden ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={confirm}
        confirm={
          <SubmitButton className={className} pendingLabel={pendingLabel}>
            {confirmLabel ?? children}
          </SubmitButton>
        }
      />

      <FormAlert state={state} />
    </form>
  );
}

export function CopyButton({ value, label = "Link kopieren" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Ohne Zwischenablage-Berechtigung den Text zum Markieren anbieten.
            setFallbackOpen(true);
          }
        }}
      >
        {copied ? "Kopiert ✓" : label}
      </button>

      <Modal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        title="Zum Kopieren markieren"
        description="Dein Browser erlaubt das automatische Kopieren nicht."
      >
        <input
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          autoFocus
          className="input font-mono text-xs"
        />
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={() => setFallbackOpen(false)}>
            Schließen
          </button>
        </div>
      </Modal>
    </>
  );
}

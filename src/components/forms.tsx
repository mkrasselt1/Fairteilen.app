"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";
import { ConfirmDialog, Modal } from "@/components/modal";
import { useT } from "@/components/i18n";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? t("Wird gespeichert …")) : children}
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
  title,
  hidden,
  className = "btn-danger",
  children,
  pendingLabel,
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
  const t = useT();
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
        title={title ?? t("Bist du sicher?")}
        description={confirm}
        confirm={
          <SubmitButton className={className} pendingLabel={pendingLabel ?? t("Einen Moment …")}>
            {confirmLabel ?? children}
          </SubmitButton>
        }
      />

      <FormAlert state={state} />
    </form>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useT();
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
        {copied ? t("Kopiert ✓") : (label ?? t("Link kopieren"))}
      </button>

      <Modal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        title={t("Zum Kopieren markieren")}
        description={t("Dein Browser erlaubt das automatische Kopieren nicht.")}
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
            {t("Schließen")}
          </button>
        </div>
      </Modal>
    </>
  );
}

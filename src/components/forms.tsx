"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";

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

/** Kleines Formular mit Bestätigungsabfrage – z. B. Löschen. */
export function ConfirmForm({
  action,
  confirm,
  hidden,
  className = "btn-danger",
  children,
  pendingLabel = "Einen Moment …",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  confirm: string;
  hidden?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className="space-y-2"
    >
      {Object.entries(hidden ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <SubmitButton className={className} pendingLabel={pendingLabel}>
        {children}
      </SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}

export function CopyButton({ value, label = "Link kopieren" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          window.prompt("Link kopieren:", value);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Kopiert ✓" : label}
    </button>
  );
}

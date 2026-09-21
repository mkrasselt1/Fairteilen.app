"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/i18n";

/**
 * Modal auf Basis des <dialog>-Elements: bringt Fokusfalle, Escape und
 * Hintergrundsperre von sich aus mit. Ersetzt die Browserdialoge
 * (confirm/alert/prompt), die sich nicht gestalten und schlecht prüfen lassen.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  labelledBy = "modal-title",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        // Klick auf den Hintergrund schließt – Klicks im Inhalt nicht.
        if (event.target === ref.current) onClose();
      }}
      // !m-auto ist nötig: Liegt der Dialog in einem Container mit space-y-*,
      // setzt Tailwind dort ein margin-top und verschiebt ihn aus der Mitte.
      className="!m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="p-5">
        <h2 id={labelledBy} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</div>}
        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}

/**
 * Rückfrage vor einer Aktion. Der bestätigende Knopf wird von außen gestellt –
 * so kann er ein echter Absende-Knopf eines Formulars sein.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirm,
  cancelLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirm: React.ReactNode;
  cancelLabel?: string;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          {cancelLabel ?? t("Abbrechen")}
        </button>
        {confirm}
      </div>
    </Modal>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getExpenseDetail } from "@/lib/data";
import { categoryOf } from "@/lib/categories";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/ui";
import { ConfirmForm } from "@/components/forms";
import { deleteExpenseAction, restoreExpenseAction } from "@/actions/expenses";
import { CommentBox } from "./comment-box";
import { AddReceiptForm, DeleteReceiptButton } from "./receipts";
import { formatBytes } from "@/lib/uploads";

export const metadata: Metadata = { title: "Ausgabe" };
export const dynamic = "force-dynamic";

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const expense = await getExpenseDetail(id, user.id);
  if (!expense) notFound();

  const category = categoryOf(expense.category);
  const payers = expense.shares.filter((s) => s.paidCents > 0);
  const debtors = expense.shares.filter((s) => s.oweCents !== 0);

  // Was dieser einzelne Eintrag für dich bedeutet.
  const mine = expense.shares.find((s) => s.userId === user.id);
  const net = (mine?.paidCents ?? 0) - (mine?.oweCents ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href={expense.group ? `/gruppen/${expense.group.id}` : "/uebersicht"} className="hover:underline">
          ← {expense.group ? expense.group.name : "Übersicht"}
        </Link>
      </div>

      {expense.deletedAt && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Diese Ausgabe wurde gelöscht und zählt nicht mehr zu den Salden.
        </div>
      )}

      <section className="card p-5">
        <div className="flex items-start gap-4">
          <span className="text-4xl" aria-hidden>
            {category.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{expense.description}</h1>
            <p className="mt-1 text-3xl font-bold">{formatMoney(expense.amountCents, expense.currency)}</p>
            <p className="hint mt-2">
              {formatDate(expense.date)} · {category.label}
              {expense.recurrence ? ` · wiederholt sich ${
                { daily: "täglich", weekly: "wöchentlich", monthly: "monatlich", yearly: "jährlich" }[
                  expense.recurrence as "daily" | "weekly" | "monthly" | "yearly"
                ]
              }` : ""}
            </p>
            <p className="hint mt-1">
              Erfasst von {expense.createdBy.id === user.id ? "dir" : expense.createdBy.name} am{" "}
              {formatDateTime(expense.createdAt)}
            </p>
          </div>
        </div>

        <div
          className={`mt-4 rounded-xl px-4 py-3 ${
            net > 0
              ? "bg-emerald-50 dark:bg-emerald-950/40"
              : net < 0
                ? "bg-rose-50 dark:bg-rose-950/40"
                : "bg-slate-50 dark:bg-slate-800/60"
          }`}
        >
          {net === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {mine ? "Bei diesem Eintrag bist du ausgeglichen." : "An diesem Eintrag bist du nicht beteiligt."}
            </p>
          ) : (
            <p className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {net > 0 ? "Bei diesem Eintrag bekommst du " : "Bei diesem Eintrag schuldest du "}
              </span>
              <span className={`text-lg font-bold ${net > 0 ? "positive" : "negative"}`}>
                {formatMoney(Math.abs(net), expense.currency)}
              </span>
            </p>
          )}
        </div>

        {expense.notes && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
            {expense.notes}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Bezahlt
            </h2>
            <ul className="space-y-2">
              {payers.map((share) => (
                <li key={share.id} className="flex items-center gap-3">
                  <Avatar user={share.user} size={30} />
                  <span className="flex-1 text-sm">{share.userId === user.id ? "Du" : share.user.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(share.paidCents, expense.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {expense.isPayment ? "Erhalten" : "Anteile"}
            </h2>
            <ul className="space-y-2">
              {debtors.map((share) => (
                <li key={share.id} className="flex items-center gap-3">
                  <Avatar user={share.user} size={30} />
                  <span className="flex-1 text-sm">{share.userId === user.id ? "Du" : share.user.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(share.oweCents, expense.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {!expense.deletedAt && !expense.isPayment && (
            <Link href={`/ausgaben/${expense.id}/bearbeiten`} className="btn-secondary">
              Bearbeiten
            </Link>
          )}
          {!expense.deletedAt ? (
            <ConfirmForm
              action={deleteExpenseAction}
              hidden={{ expenseId: expense.id }}
              confirm="Diese Ausgabe wirklich löschen?"
              className="btn-danger"
            >
              Löschen
            </ConfirmForm>
          ) : (
            <ConfirmForm
              action={restoreExpenseAction}
              hidden={{ expenseId: expense.id }}
              confirm="Ausgabe wiederherstellen?"
              className="btn-secondary"
            >
              Wiederherstellen
            </ConfirmForm>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Belege</h2>
        <p className="hint mb-4">
          Nur Beteiligte dieser Ausgabe können die Belege sehen.
        </p>

        {expense.attachments.length > 0 && (
          <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {expense.attachments.map((attachment) => (
              <li key={attachment.id} className="group relative">
                <a
                  href={`/api/belege/${attachment.id}`}
                  target="_blank"
                  rel="noopener"
                  className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  title={`${attachment.originalName} öffnen`}
                >
                  {attachment.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/belege/${attachment.id}`}
                      alt={attachment.originalName}
                      className="h-36 w-full object-cover transition group-hover:opacity-90"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-36 w-full flex-col items-center justify-center gap-1 text-4xl" aria-hidden>
                      📄<span className="text-xs text-slate-500">PDF</span>
                    </span>
                  )}
                </a>
                <div className="absolute right-2 top-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                  <DeleteReceiptButton attachmentId={attachment.id} name={attachment.originalName} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={attachment.originalName}>
                  {attachment.originalName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatBytes(attachment.sizeBytes)} ·{" "}
                  {attachment.uploadedById === user.id ? "von dir" : `von ${attachment.uploadedBy.name}`} ·{" "}
                  <a href={`/api/belege/${attachment.id}?download`} className="hover:underline">
                    herunterladen
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}

        {!expense.deletedAt && <AddReceiptForm expenseId={expense.id} />}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Kommentare</h2>
        <ul className="space-y-4">
          {expense.comments.length === 0 && (
            <li className="hint">Noch keine Kommentare. Stell hier Rückfragen zur Ausgabe.</li>
          )}
          {expense.comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar user={comment.user} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">
                    {comment.userId === user.id ? "Du" : comment.user.name}
                  </span>{" "}
                  <span className="hint">{formatDateTime(comment.createdAt)}</span>
                </p>
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <CommentBox expenseId={expense.id} />
        </div>
      </section>
    </div>
  );
}

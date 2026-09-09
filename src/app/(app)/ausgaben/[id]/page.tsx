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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href={expense.group ? `/gruppen/${expense.group.id}` : "/"} className="hover:underline">
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

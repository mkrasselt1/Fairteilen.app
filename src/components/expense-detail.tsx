import Link from "next/link";
import { categoryOf } from "@/lib/categories";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { formatBytes } from "@/lib/uploads";
import { Avatar } from "@/components/ui";
import { ConfirmForm } from "@/components/forms";
import { deleteExpenseAction, restoreExpenseAction } from "@/actions/expenses";
import { getI18n } from "@/lib/i18n-server";
import type { getExpenseDetail } from "@/lib/data";

type Expense = NonNullable<Awaited<ReturnType<typeof getExpenseDetail>>>;

/**
 * Ansicht einer einzelnen Ausgabe – gleich für angemeldete Gruppen und für
 * geteilte Abrechnungen; nur die Ziele der Verweise unterscheiden sich.
 */
export async function ExpenseDetail({
  expense,
  viewerId,
  basePath,
  returnTo,
  addReceiptForm,
  deleteReceiptButton,
  commentBox,
}: {
  expense: Expense;
  viewerId: string;
  /** Wohin „Bearbeiten“ zeigt, z. B. /ausgaben oder /gemeinsam/<token>/ausgabe */
  basePath: string;
  /** Wohin es nach dem Löschen zurückgeht. */
  returnTo?: string;
  addReceiptForm: React.ReactNode;
  deleteReceiptButton: (attachment: { id: string; originalName: string }) => React.ReactNode;
  commentBox: React.ReactNode;
}) {
  const { t, intlLocale } = await getI18n();
  const category = categoryOf(expense.category);
  const payers = expense.shares.filter((share) => share.paidCents > 0);
  const debtors = expense.shares.filter((share) => share.oweCents !== 0);

  const mine = expense.shares.find((share) => share.userId === viewerId);
  const net = (mine?.paidCents ?? 0) - (mine?.oweCents ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {expense.deletedAt && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {t("Diese Ausgabe wurde gelöscht und zählt nicht mehr zu den Salden.")}
        </div>
      )}

      <section className="card p-5">
        <div className="flex items-start gap-4">
          <span className="text-4xl" aria-hidden>
            {category.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{expense.description}</h1>
            <p className="mt-1 text-3xl font-bold">
              {formatMoney(expense.amountCents, expense.currency, intlLocale)}
            </p>
            <p className="hint mt-2">
              {formatDate(expense.date, intlLocale)} · {t(category.label)}
              {expense.recurrence
                ? ` · ${t("wiederholt sich {rhythmus}", {
                    rhythmus: t(
                      {
                        daily: "täglich",
                        weekly: "wöchentlich",
                        monthly: "monatlich",
                        yearly: "jährlich",
                      }[expense.recurrence as "daily" | "weekly" | "monthly" | "yearly"],
                    ),
                  })}`
                : ""}
            </p>
            <p className="hint mt-1">
              {t("Erfasst von {name} am {zeitpunkt}", {
                name: expense.createdBy.id === viewerId ? t("dir") : expense.createdBy.name,
                zeitpunkt: formatDateTime(expense.createdAt, intlLocale),
              })}
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
              {mine
                ? t("Bei diesem Eintrag bist du ausgeglichen.")
                : t("An diesem Eintrag bist du nicht beteiligt.")}
            </p>
          ) : (
            <p className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {net > 0 ? `${t("Bei diesem Eintrag bekommst du")} ` : `${t("Bei diesem Eintrag schuldest du")} `}
              </span>
              <span className={`text-lg font-bold ${net > 0 ? "positive" : "negative"}`}>
                {formatMoney(Math.abs(net), expense.currency, intlLocale)}
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
              {t("Bezahlt")}
            </h2>
            <ul className="space-y-2">
              {payers.map((share) => (
                <li key={share.id} className="flex items-center gap-3">
                  <Avatar user={share.user} size={30} />
                  <span className="flex-1 text-sm">{share.userId === viewerId ? t("Du") : share.user.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(share.paidCents, expense.currency, intlLocale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {expense.isPayment ? t("Erhalten") : t("Anteile")}
            </h2>
            <ul className="space-y-2">
              {debtors.map((share) => (
                <li key={share.id} className="flex items-center gap-3">
                  <Avatar user={share.user} size={30} />
                  <span className="flex-1 text-sm">{share.userId === viewerId ? t("Du") : share.user.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(share.oweCents, expense.currency, intlLocale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {!expense.deletedAt && !expense.isPayment && (
            <Link href={`${basePath}/${expense.id}/bearbeiten`} className="btn-secondary">
              {t("Bearbeiten")}
            </Link>
          )}
          {!expense.deletedAt ? (
            <ConfirmForm
              action={deleteExpenseAction}
              hidden={returnTo ? { expenseId: expense.id, returnTo } : { expenseId: expense.id }}
              confirm={t("Diese Ausgabe wirklich löschen?")}
              className="btn-danger"
            >
              {t("Löschen")}
            </ConfirmForm>
          ) : (
            <ConfirmForm
              action={restoreExpenseAction}
              hidden={returnTo ? { expenseId: expense.id, returnTo } : { expenseId: expense.id }}
              confirm={t("Ausgabe wiederherstellen?")}
              className="btn-secondary"
            >
              {t("Wiederherstellen")}
            </ConfirmForm>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">{t("Belege")}</h2>
        <p className="hint mb-4">{t("Nur Beteiligte dieser Ausgabe können die Belege sehen.")}</p>

        {expense.attachments.length > 0 && (
          <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {expense.attachments.map((attachment) => (
              <li key={attachment.id} className="group relative">
                <a
                  href={`/api/belege/${attachment.id}`}
                  target="_blank"
                  rel="noopener"
                  className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  title={t("{name} öffnen", { name: attachment.originalName })}
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
                  {deleteReceiptButton(attachment)}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={attachment.originalName}>
                  {attachment.originalName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatBytes(attachment.sizeBytes)} ·{" "}
                  {attachment.uploadedById === viewerId
                    ? t("von dir")
                    : t("von {name}", { name: attachment.uploadedBy.name })}{" "}
                  ·{" "}
                  <a href={`/api/belege/${attachment.id}?download`} className="hover:underline">
                    {t("herunterladen")}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}

        {!expense.deletedAt && addReceiptForm}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("Kommentare")}</h2>
        <ul className="space-y-4">
          {expense.comments.length === 0 && (
            <li className="hint">{t("Noch keine Kommentare. Stell hier Rückfragen zur Ausgabe.")}</li>
          )}
          {expense.comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar user={comment.user} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">
                    {comment.userId === viewerId ? t("Du") : comment.user.name}
                  </span>{" "}
                  <span className="hint">{formatDateTime(comment.createdAt, intlLocale)}</span>
                </p>
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">{commentBox}</div>
      </section>
    </div>
  );
}

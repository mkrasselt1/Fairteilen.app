import Link from "next/link";
import { categoryOf } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getI18n } from "@/lib/i18n-server";

type ListExpense = {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  date: Date;
  category: string;
  isPayment: boolean;
  group?: { id: string; name: string } | null;
  shares: { userId: string; paidCents: number; oweCents: number; user: { name: string } }[];
  _count?: { comments: number; attachments: number };
};

function monthLabel(date: Date, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(date);
}

export async function ExpenseList({
  expenses,
  currentUserId,
  showGroup = false,
  basePath = "/ausgaben",
}: {
  expenses: ListExpense[];
  currentUserId: string;
  showGroup?: boolean;
  /** Im Link-Modus zeigen die Einträge auf die geteilte Abrechnung. */
  basePath?: string;
}) {
  const { t, intlLocale } = await getI18n();

  const months: { label: string; items: ListExpense[] }[] = [];
  for (const expense of expenses) {
    const label = monthLabel(expense.date, intlLocale);
    const last = months[months.length - 1];
    if (last && last.label === label) last.items.push(expense);
    else months.push({ label, items: [expense] });
  }

  return (
    <div>
      {months.map((month) => (
        <section key={month.label}>
          <h3 className="bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            {month.label}
          </h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {month.items.map((expense) => {
              const mine = expense.shares.find((s) => s.userId === currentUserId);
              const net = (mine?.paidCents ?? 0) - (mine?.oweCents ?? 0);
              const payers = expense.shares.filter((s) => s.paidCents > 0);
              // Der ganze Satz bleibt eine Einheit, damit die Wortstellung
              // je Sprache stimmen kann („Du hast 12 € bezahlt“ / „You paid 12“).
              const betrag = formatMoney(expense.amountCents, expense.currency, intlLocale);
              const satz =
                payers.length === 0
                  ? expense.isPayment
                    ? t("niemand hat {betrag} überwiesen", { betrag })
                    : t("niemand hat {betrag} bezahlt", { betrag })
                  : payers.length === 1
                    ? payers[0].userId === currentUserId
                      ? expense.isPayment
                        ? t("Du hast {betrag} überwiesen", { betrag })
                        : t("Du hast {betrag} bezahlt", { betrag })
                      : expense.isPayment
                        ? t("{name} hat {betrag} überwiesen", { name: payers[0].user.name, betrag })
                        : t("{name} hat {betrag} bezahlt", { name: payers[0].user.name, betrag })
                    : expense.isPayment
                      ? t("{anzahl} Personen haben {betrag} überwiesen", { anzahl: payers.length, betrag })
                      : t("{anzahl} Personen haben {betrag} bezahlt", { anzahl: payers.length, betrag });

              return (
                <li key={expense.id}>
                  <Link
                    href={`${basePath}/${expense.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="w-10 shrink-0 text-center">
                      <span className="block text-[11px] font-medium uppercase text-slate-400">
                        {formatDateShort(expense.date, intlLocale).split(" ")[1]}
                      </span>
                      <span className="block text-base font-semibold leading-tight">{expense.date.getDate()}</span>
                    </span>
                    <span className="text-2xl" aria-hidden>
                      {categoryOf(expense.category).icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{expense.description}</span>
                      <span className="hint block truncate">
                        {satz}
                        {showGroup && expense.group ? ` · ${expense.group.name}` : ""}
                        {expense._count && expense._count.comments > 0 ? ` · 💬 ${expense._count.comments}` : ""}
                        {expense._count && expense._count.attachments > 0 ? ` · 📎 ${expense._count.attachments}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {net === 0 ? (
                        <span className="hint">{t("nicht beteiligt")}</span>
                      ) : (
                        <>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {net > 0 ? t("du bekommst") : t("du schuldest")}
                          </span>
                          <span className={`block font-semibold tabular-nums ${net > 0 ? "positive" : "negative"}`}>
                            {formatMoney(Math.abs(net), expense.currency, intlLocale)}
                          </span>
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

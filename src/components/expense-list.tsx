import Link from "next/link";
import { categoryOf } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import { formatMoney } from "@/lib/money";

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

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}

export function ExpenseList({
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
  const months: { label: string; items: ListExpense[] }[] = [];
  for (const expense of expenses) {
    const label = monthLabel(expense.date);
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
              const payerLabel =
                payers.length === 0
                  ? "niemand"
                  : payers.length === 1
                    ? payers[0].userId === currentUserId
                      ? "Du hast"
                      : `${payers[0].user.name} hat`
                    : `${payers.length} Personen haben`;

              return (
                <li key={expense.id}>
                  <Link
                    href={`${basePath}/${expense.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="w-10 shrink-0 text-center">
                      <span className="block text-[11px] font-medium uppercase text-slate-400">
                        {formatDateShort(expense.date).split(" ")[1]}
                      </span>
                      <span className="block text-base font-semibold leading-tight">{expense.date.getDate()}</span>
                    </span>
                    <span className="text-2xl" aria-hidden>
                      {categoryOf(expense.category).icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{expense.description}</span>
                      <span className="hint block truncate">
                        {payerLabel} {formatMoney(expense.amountCents, expense.currency)}{" "}
                        {expense.isPayment ? "überwiesen" : "bezahlt"}
                        {showGroup && expense.group ? ` · ${expense.group.name}` : ""}
                        {expense._count && expense._count.comments > 0 ? ` · 💬 ${expense._count.comments}` : ""}
                        {expense._count && expense._count.attachments > 0 ? ` · 📎 ${expense._count.attachments}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {net === 0 ? (
                        <span className="hint">nicht beteiligt</span>
                      ) : (
                        <>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            {net > 0 ? "du bekommst" : "du schuldest"}
                          </span>
                          <span className={`block font-semibold tabular-nums ${net > 0 ? "positive" : "negative"}`}>
                            {formatMoney(Math.abs(net), expense.currency)}
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

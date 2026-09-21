import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getExpenseDetail } from "@/lib/data";
import { ExpenseForm } from "@/components/expense-form";
import { toDateInputValue } from "@/lib/format";
import type { SplitType } from "@/lib/split";
import { getExpenseFormOptions } from "../../options";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Ausgabe bearbeiten") };
}
export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const expense = await getExpenseDetail(id, user.id);
  if (!expense || expense.deletedAt) notFound();

  const { groups, friends } = await getExpenseFormOptions(user.id);
  const t = await getT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("Ausgabe bearbeiten")}</h1>
      <ExpenseForm
        currentUser={user}
        groups={groups}
        friends={friends}
        defaultCurrency={user.currency}
        initial={{
          id: expense.id,
          description: expense.description,
          amountCents: expense.amountCents,
          currency: expense.currency,
          date: toDateInputValue(expense.date),
          category: expense.category,
          notes: expense.notes,
          splitType: expense.splitType as SplitType,
          groupId: expense.groupId,
          recurrence: expense.recurrence,
          recurrenceUntil: expense.recurrenceUntil ? toDateInputValue(expense.recurrenceUntil) : null,
          shares: expense.shares.map((s) => ({
            userId: s.userId,
            paidCents: s.paidCents,
            oweCents: s.oweCents,
          })),
        }}
      />
    </div>
  );
}

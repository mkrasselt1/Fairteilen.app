import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBoard } from "../../../board";
import { getExpenseDetail } from "@/lib/data";
import { ExpenseForm } from "@/components/expense-form";
import { toDateInputValue } from "@/lib/format";
import type { SplitType } from "@/lib/split";

export const dynamic = "force-dynamic";

export default async function EditSharedExpensePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const { group, actor, detail } = await requireBoard(token);

  const expense = await getExpenseDetail(id, actor.userId);
  if (!expense || expense.groupId !== group.id || expense.deletedAt) notFound();

  const me = detail.group.members.find((member) => member.userId === actor.userId)!.user;

  return (
    <div className="space-y-5">
      <Link
        href={`/gemeinsam/${token}/ausgabe/${expense.id}`}
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Zurück zur Ausgabe
      </Link>
      <h1 className="text-2xl font-bold">Ausgabe bearbeiten</h1>
      <ExpenseForm
        currentUser={me}
        groups={[
          {
            id: group.id,
            name: group.name,
            currency: group.currency,
            members: detail.group.members.map((member) => member.user),
          },
        ]}
        friends={[]}
        defaultCurrency={group.currency}
        returnTo={`/gemeinsam/${token}`}
        lockGroup
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
          shares: expense.shares.map((share) => ({
            userId: share.userId,
            paidCents: share.paidCents,
            oweCents: share.oweCents,
          })),
        }}
      />
    </div>
  );
}

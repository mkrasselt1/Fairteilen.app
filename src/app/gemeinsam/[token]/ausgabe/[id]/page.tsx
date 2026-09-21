import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBoard } from "../../board";
import { getExpenseDetail } from "@/lib/data";
import { ExpenseDetail } from "@/components/expense-detail";
import { CommentBox } from "@/app/(app)/ausgaben/[id]/comment-box";
import { AddReceiptForm, DeleteReceiptButton } from "@/app/(app)/ausgaben/[id]/receipts";

export const dynamic = "force-dynamic";

export default async function SharedExpensePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const { group, actor } = await requireBoard(token);

  const expense = await getExpenseDetail(id, actor.userId);
  if (!expense || expense.groupId !== group.id) notFound();

  return (
    <div className="space-y-5">
      <Link href={`/gemeinsam/${token}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← {group.name}
      </Link>
      <ExpenseDetail
        expense={expense}
        viewerId={actor.userId}
        basePath={`/gemeinsam/${token}/ausgabe`}
        returnTo={`/gemeinsam/${token}`}
        addReceiptForm={<AddReceiptForm expenseId={expense.id} />}
        deleteReceiptButton={(attachment) => (
          <DeleteReceiptButton attachmentId={attachment.id} name={attachment.originalName} />
        )}
        commentBox={<CommentBox expenseId={expense.id} />}
      />
    </div>
  );
}

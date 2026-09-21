import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getExpenseDetail } from "@/lib/data";
import { ExpenseDetail } from "@/components/expense-detail";
import { CommentBox } from "./comment-box";
import { AddReceiptForm, DeleteReceiptButton } from "./receipts";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Ausgabe") };
}
export const dynamic = "force-dynamic";

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const expense = await getExpenseDetail(id, user.id);
  if (!expense) notFound();

  return (
    <ExpenseDetail
      expense={expense}
      viewerId={user.id}
      basePath="/ausgaben"
      addReceiptForm={<AddReceiptForm expenseId={expense.id} />}
      deleteReceiptButton={(attachment) => (
        <DeleteReceiptButton attachmentId={attachment.id} name={attachment.originalName} />
      )}
      commentBox={<CommentBox expenseId={expense.id} />}
    />
  );
}

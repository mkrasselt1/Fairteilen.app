import Link from "next/link";
import { requireBoard } from "../../board";
import { ExpenseForm } from "@/components/expense-form";

export const dynamic = "force-dynamic";

export default async function NewSharedExpensePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, actor, detail } = await requireBoard(token);
  const me = detail.group.members.find((member) => member.userId === actor.userId)!.user;

  return (
    <div className="space-y-5">
      <Link href={`/gemeinsam/${token}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← {group.name}
      </Link>
      <h1 className="text-2xl font-bold">Ausgabe hinzufügen</h1>
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
        defaultGroupId={group.id}
        defaultCurrency={group.currency}
        returnTo={`/gemeinsam/${token}`}
        lockGroup
      />
    </div>
  );
}

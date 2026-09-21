import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ExpenseForm } from "@/components/expense-form";
import { getExpenseFormOptions } from "../options";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Neue Ausgabe") };
}
export const dynamic = "force-dynamic";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ gruppe?: string; freund?: string }>;
}) {
  const user = await requireUser();
  const { gruppe, freund } = await searchParams;
  const { groups, friends } = await getExpenseFormOptions(user.id);
  const t = await getT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("Ausgabe hinzufügen")}</h1>
      <ExpenseForm
        currentUser={user}
        groups={groups}
        friends={friends}
        defaultGroupId={gruppe}
        defaultFriendId={freund}
        defaultCurrency={user.currency}
      />
    </div>
  );
}

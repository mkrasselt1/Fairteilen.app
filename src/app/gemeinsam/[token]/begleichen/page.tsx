import Link from "next/link";
import { requireBoard } from "../board";
import { SettleForm } from "@/app/(app)/begleichen/settle-form";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function SharedSettlePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ von?: string; an?: string; betrag?: string; waehrung?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const { group, actor, detail } = await requireBoard(token);

  const members = detail.group.members.map((member) => member.user);
  const me = members.find((member) => member.id === actor.userId)!;
  const t = await getT();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href={`/gemeinsam/${token}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← {group.name}
      </Link>
      <h1 className="text-2xl font-bold">{t("Zahlung erfassen")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("Trage hier ein, wenn jemand einen offenen Betrag tatsächlich bezahlt hat.")}
      </p>
      <SettleForm
        currentUser={me}
        groups={[{ id: group.id, name: group.name, currency: group.currency, members }]}
        friends={members}
        returnTo={`/gemeinsam/${token}`}
        lockGroup
        defaults={{
          groupId: group.id,
          fromUserId: query.von ?? actor.userId,
          toUserId: query.an ?? "",
          amount: query.betrag ?? "",
          currency: query.waehrung ?? group.currency,
        }}
      />
    </div>
  );
}

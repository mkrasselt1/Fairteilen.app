import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettleForm } from "./settle-form";

export const metadata: Metadata = { title: "Begleichen" };
export const dynamic = "force-dynamic";

const userSelect = { id: true, name: true, email: true, avatarColor: true } as const;

export default async function SettlePage({
  searchParams,
}: {
  searchParams: Promise<{ gruppe?: string; von?: string; an?: string; betrag?: string; waehrung?: string; person?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;

  const [memberships, friendships] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: { include: { members: { include: { user: { select: userSelect } } } } },
      },
    }),
    prisma.friendship.findMany({ where: { userId: user.id }, include: { friend: { select: userSelect } } }),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Zahlung erfassen</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Trage hier ein, wenn jemand einen offenen Betrag tatsächlich überwiesen oder bar bezahlt hat.
      </p>
      <SettleForm
        currentUser={user}
        groups={memberships.map((m) => ({
          id: m.group.id,
          name: m.group.name,
          currency: m.group.currency,
          members: m.group.members.map((member) => member.user),
        }))}
        friends={friendships.map((f) => f.friend).sort((a, b) => a.name.localeCompare(b.name))}
        defaults={{
          groupId: query.gruppe ?? "",
          fromUserId: query.von ?? user.id,
          toUserId: query.an ?? query.person ?? "",
          amount: query.betrag ?? "",
          currency: query.waehrung ?? user.currency,
        }}
      />
    </div>
  );
}

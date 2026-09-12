import "server-only";
import { prisma } from "@/lib/db";
import type { ExpenseFormGroup, PersonOption } from "@/components/expense-form";

const userSelect = { id: true, name: true, email: true, avatarColor: true, isGuest: true } as const;

export async function getExpenseFormOptions(userId: string): Promise<{
  groups: ExpenseFormGroup[];
  friends: PersonOption[];
}> {
  const [memberships, friendships] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: { members: { include: { user: { select: userSelect } }, orderBy: { joinedAt: "asc" } } },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.friendship.findMany({ where: { userId }, include: { friend: { select: userSelect } } }),
  ]);

  return {
    // Archivierte Gruppen bleiben auswählbar, stehen aber am Ende und sind gekennzeichnet.
    groups: memberships
      .map((m) => ({
        id: m.group.id,
        name: m.group.archivedAt ? `${m.group.name} (archiviert)` : m.group.name,
        currency: m.group.currency,
        archived: m.group.archivedAt !== null,
        members: m.group.members.map((member) => member.user),
      }))
      .sort((a, b) => Number(a.archived) - Number(b.archived)),
    friends: friendships
      .map((f) => f.friend)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

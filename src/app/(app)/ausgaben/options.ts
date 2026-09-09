import "server-only";
import { prisma } from "@/lib/db";
import type { ExpenseFormGroup, PersonOption } from "@/components/expense-form";

const userSelect = { id: true, name: true, email: true, avatarColor: true } as const;

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
    groups: memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      currency: m.group.currency,
      members: m.group.members.map((member) => member.user),
    })),
    friends: friendships
      .map((f) => f.friend)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

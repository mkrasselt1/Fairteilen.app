import "server-only";
import { prisma } from "./db";
import { netBalances, pairwiseDebts, simplifyDebts, type Debt } from "./balances";

export type PersonBalance = { currency: string; amountCents: number };

export type UserRef = { id: string; name: string; email: string; avatarColor: string };

const userSelect = { id: true, name: true, email: true, avatarColor: true } as const;

/** Alle aktiven Ausgaben, an denen die Person beteiligt ist (gezahlt oder Anteil). */
async function expensesInvolvingUser(userId: string) {
  return prisma.expense.findMany({
    where: { deletedAt: null, shares: { some: { userId } } },
    select: {
      id: true,
      currency: true,
      groupId: true,
      shares: { select: { userId: true, paidCents: true, oweCents: true } },
    },
  });
}

/** Netto-Salden gegenüber jeder anderen Person, pro Währung. */
export async function getBalancesWithPeople(userId: string) {
  const expenses = await expensesInvolvingUser(userId);
  const debts = pairwiseDebts(expenses);
  const perPerson = new Map<string, Map<string, number>>(); // otherUserId -> currency -> cents (positiv = bekommt Geld)

  for (const debt of debts) {
    let other: string;
    let amount: number;
    if (debt.fromUserId === userId) {
      other = debt.toUserId;
      amount = -debt.amountCents;
    } else if (debt.toUserId === userId) {
      other = debt.fromUserId;
      amount = debt.amountCents;
    } else {
      continue;
    }
    let byCurrency = perPerson.get(other);
    if (!byCurrency) perPerson.set(other, (byCurrency = new Map()));
    byCurrency.set(debt.currency, (byCurrency.get(debt.currency) ?? 0) + amount);
  }

  for (const [other, byCurrency] of perPerson) {
    for (const [currency, value] of byCurrency) if (value === 0) byCurrency.delete(currency);
    if (byCurrency.size === 0) perPerson.delete(other);
  }
  return perPerson;
}

export type OverallSummary = {
  totals: PersonBalance[];
  owedToYou: PersonBalance[];
  youOwe: PersonBalance[];
};

export async function getOverallSummary(userId: string): Promise<OverallSummary> {
  const perPerson = await getBalancesWithPeople(userId);
  const totals = new Map<string, number>();
  const positive = new Map<string, number>();
  const negative = new Map<string, number>();

  for (const byCurrency of perPerson.values()) {
    for (const [currency, value] of byCurrency) {
      totals.set(currency, (totals.get(currency) ?? 0) + value);
      if (value > 0) positive.set(currency, (positive.get(currency) ?? 0) + value);
      else negative.set(currency, (negative.get(currency) ?? 0) - value);
    }
  }

  const toList = (map: Map<string, number>): PersonBalance[] =>
    [...map.entries()]
      .filter(([, v]) => v !== 0)
      .map(([currency, amountCents]) => ({ currency, amountCents }))
      .sort((a, b) => Math.abs(b.amountCents) - Math.abs(a.amountCents));

  return { totals: toList(totals), owedToYou: toList(positive), youOwe: toList(negative) };
}

/** Freundes-/Kontaktliste inklusive Salden. */
export async function getFriendsWithBalances(userId: string) {
  const [friendships, balances] = await Promise.all([
    prisma.friendship.findMany({ where: { userId }, include: { friend: { select: userSelect } } }),
    getBalancesWithPeople(userId),
  ]);

  const people = new Map<string, UserRef>();
  for (const f of friendships) people.set(f.friendId, f.friend);

  // Personen aus gemeinsamen Ausgaben ergänzen, auch ohne ausdrückliche Freundschaft.
  const missing = [...balances.keys()].filter((id) => !people.has(id));
  if (missing.length > 0) {
    const users = await prisma.user.findMany({ where: { id: { in: missing } }, select: userSelect });
    for (const u of users) people.set(u.id, u);
  }

  return [...people.values()]
    .map((person) => ({
      user: person,
      balances: [...(balances.get(person.id) ?? new Map()).entries()].map(([currency, amountCents]) => ({
        currency,
        amountCents,
      })),
    }))
    .sort((a, b) => {
      const sum = (x: typeof a) => x.balances.reduce((acc, v) => acc + Math.abs(v.amountCents), 0);
      return sum(b) - sum(a) || a.user.name.localeCompare(b.user.name);
    });
}

export async function getUserGroups(userId: string, options: { archived?: boolean } = {}) {
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId,
      group: options.archived === undefined ? {} : options.archived ? { NOT: { archivedAt: null } } : { archivedAt: null },
    },
    include: {
      group: {
        include: {
          members: { include: { user: { select: userSelect } } },
          _count: { select: { expenses: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const groupIds = memberships.map((m) => m.groupId);
  const shares = await prisma.expenseShare.findMany({
    where: { expense: { deletedAt: null, groupId: { in: groupIds } } },
    select: { userId: true, paidCents: true, oweCents: true, expense: { select: { groupId: true, currency: true } } },
  });

  const perGroup = new Map<string, Map<string, number>>(); // groupId -> currency -> eigener Saldo
  for (const share of shares) {
    if (share.userId !== userId) continue;
    const groupId = share.expense.groupId!;
    let byCurrency = perGroup.get(groupId);
    if (!byCurrency) perGroup.set(groupId, (byCurrency = new Map()));
    const currency = share.expense.currency;
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + share.paidCents - share.oweCents);
  }

  return memberships.map((m) => ({
    ...m.group,
    balances: [...(perGroup.get(m.groupId) ?? new Map()).entries()]
      .filter(([, v]) => v !== 0)
      .map(([currency, amountCents]) => ({ currency, amountCents })),
  }));
}

export type GroupDetail = NonNullable<Awaited<ReturnType<typeof getGroupDetail>>>;

export async function getGroupDetail(groupId: string, userId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId } } },
    include: {
      members: { include: { user: { select: userSelect } }, orderBy: { joinedAt: "asc" } },
      createdBy: { select: userSelect },
    },
  });
  if (!group) return null;

  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: {
      shares: { include: { user: { select: userSelect } } },
      createdBy: { select: userSelect },
      _count: { select: { comments: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const rows = expenses.flatMap((e) =>
    e.shares.map((s) => ({ userId: s.userId, paidCents: s.paidCents, oweCents: s.oweCents, currency: e.currency })),
  );
  const balancesByCurrency = netBalances(rows);

  const debts: Debt[] = [];
  if (group.simplifyDebts) {
    for (const [currency, balances] of balancesByCurrency) debts.push(...simplifyDebts(balances, currency));
  } else {
    debts.push(...pairwiseDebts(expenses.map((e) => ({ currency: e.currency, shares: e.shares }))));
  }

  const memberBalances = group.members.map((member) => ({
    user: member.user,
    role: member.role,
    balances: [...balancesByCurrency.entries()]
      .map(([currency, balances]) => ({ currency, amountCents: balances.get(member.userId) ?? 0 }))
      .filter((b) => b.amountCents !== 0),
  }));

  return { group, expenses, debts, memberBalances, balancesByCurrency };
}

export async function getFriendDetail(userId: string, friendId: string) {
  const friend = await prisma.user.findUnique({ where: { id: friendId }, select: userSelect });
  if (!friend) return null;

  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      AND: [{ shares: { some: { userId } } }, { shares: { some: { userId: friendId } } }],
    },
    include: {
      shares: { include: { user: { select: userSelect } } },
      group: { select: { id: true, name: true } },
      createdBy: { select: userSelect },
      _count: { select: { comments: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const debts = pairwiseDebts(expenses.map((e) => ({ currency: e.currency, shares: e.shares })));
  const balances = debts
    .filter(
      (d) =>
        (d.fromUserId === userId && d.toUserId === friendId) ||
        (d.fromUserId === friendId && d.toUserId === userId),
    )
    .map((d) => ({
      currency: d.currency,
      amountCents: d.toUserId === userId ? d.amountCents : -d.amountCents,
    }));

  return { friend, expenses, balances };
}

export async function getActivity(userId: string, take = 60) {
  const memberships = await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } });
  const groupIds = memberships.map((m) => m.groupId);

  return prisma.activity.findMany({
    where: {
      OR: [
        { groupId: { in: groupIds } },
        { actorId: userId },
        { expense: { shares: { some: { userId } } } },
      ],
    },
    include: {
      actor: { select: userSelect },
      group: { select: { id: true, name: true } },
      expense: { select: { id: true, description: true, amountCents: true, currency: true, deletedAt: true, groupId: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getExpenseDetail(expenseId: string, userId: string) {
  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      OR: [{ shares: { some: { userId } } }, { group: { members: { some: { userId } } } }, { createdById: userId }],
    },
    include: {
      shares: { include: { user: { select: userSelect } } },
      group: { select: { id: true, name: true, currency: true, members: { include: { user: { select: userSelect } } } } },
      createdBy: { select: userSelect },
      comments: { include: { user: { select: userSelect } }, orderBy: { createdAt: "asc" } },
    },
  });
  return expense;
}

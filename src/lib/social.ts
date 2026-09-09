import "server-only";
import { prisma } from "./db";

/** Legt beidseitige Verbindungen zwischen allen übergebenen Personen an (idempotent). */
export async function ensureFriendships(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds)];
  const pairs: { userId: string; friendId: string }[] = [];
  for (const a of unique) for (const b of unique) if (a !== b) pairs.push({ userId: a, friendId: b });
  if (pairs.length === 0) return;

  // `skipDuplicates` unterstützt SQLite nicht – deshalb vorhandene Paare vorher ermitteln.
  const existing = await prisma.friendship.findMany({
    where: { userId: { in: unique }, friendId: { in: unique } },
    select: { userId: true, friendId: true },
  });
  const known = new Set(existing.map((f) => `${f.userId}|${f.friendId}`));
  const missing = pairs.filter((p) => !known.has(`${p.userId}|${p.friendId}`));
  if (missing.length === 0) return;

  try {
    await prisma.friendship.createMany({ data: missing });
  } catch {
    // Parallele Anfrage war schneller – die Verbindung existiert dann bereits.
  }
}

export async function logActivity(input: {
  type: string;
  actorId: string;
  groupId?: string | null;
  expenseId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.activity.create({
    data: {
      type: input.type,
      actorId: input.actorId,
      groupId: input.groupId ?? null,
      expenseId: input.expenseId ?? null,
      payload: JSON.stringify(input.payload ?? {}),
    },
  });
}

export function parsePayload(payload: string): Record<string, unknown> {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

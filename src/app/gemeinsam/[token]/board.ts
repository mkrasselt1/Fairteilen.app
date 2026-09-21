import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getGroupActor, type Actor } from "@/lib/actor";
import { getGroupDetail, type GroupDetail } from "@/lib/data";

/**
 * Lädt eine über einen Link geteilte Abrechnung. Wer noch nicht festgelegt hat,
 * als wer er mitarbeitet, bekommt `actor: null` – dann zeigt die Seite die
 * Auswahl an, statt abzuweisen.
 */
export async function loadBoard(token: string): Promise<{
  group: { id: string; name: string; currency: string; publicToken: string };
  members: { id: string; name: string; isGuest: boolean; avatarColor: string }[];
  actor: Actor | null;
  detail: GroupDetail | null;
}> {
  const group = await prisma.group.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      name: true,
      currency: true,
      publicToken: true,
      members: {
        orderBy: { joinedAt: "asc" },
        select: { user: { select: { id: true, name: true, isGuest: true, avatarColor: true } } },
      },
    },
  });
  if (!group?.publicToken) notFound();

  const actor = await getGroupActor(group.id);
  const detail = actor ? await getGroupDetail(group.id, actor.userId) : null;

  return {
    group: { id: group.id, name: group.name, currency: group.currency, publicToken: group.publicToken },
    members: group.members.map((member) => member.user),
    actor,
    detail,
  };
}

/** Wie `loadBoard`, aber für Unterseiten: ohne festgelegte Person geht es nicht weiter. */
export async function requireBoard(token: string) {
  const board = await loadBoard(token);
  if (!board.actor || !board.detail) notFound();
  return { ...board, actor: board.actor, detail: board.detail };
}

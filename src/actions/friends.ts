"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureFriendships } from "@/lib/social";
import type { ActionState } from "@/lib/action-state";
import { getT } from "@/lib/i18n-server";

export async function addFriendAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: t("Bitte gib eine E-Mail-Adresse an.") };
  if (email === user.email) return { error: t("Das bist du selbst.") };

  const friend = await prisma.user.findUnique({ where: { email } });
  if (!friend) {
    return { error: t("Es gibt noch kein Konto mit dieser E-Mail-Adresse. Lade die Person über einen Gruppenlink ein.") };
  }

  await ensureFriendships([user.id, friend.id]);
  revalidatePath("/uebersicht");
  return { success: t("{name} ist jetzt in deiner Kontaktliste.", { name: friend.name }) };
}

export async function removeFriendAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const friendId = String(formData.get("friendId") ?? "");

  const shares = await prisma.expenseShare.findMany({
    where: {
      userId: user.id,
      expense: { deletedAt: null, shares: { some: { userId: friendId } } },
    },
    select: { paidCents: true, oweCents: true },
  });
  const balance = shares.reduce((acc, s) => acc + s.paidCents - s.oweCents, 0);
  if (balance !== 0) return { error: t("Es bestehen noch offene Beträge mit dieser Person.") };

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId: user.id, friendId },
        { userId: friendId, friendId: user.id },
      ],
    },
  });
  revalidatePath("/uebersicht");
  return { success: t("Kontakt entfernt.") };
}

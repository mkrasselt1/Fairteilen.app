"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSupportedCurrency } from "@/lib/money";
import { GROUP_TYPES } from "@/lib/categories";
import { ensureFriendships, logActivity } from "@/lib/social";
import { newInviteToken } from "@/lib/tokens";
import type { ActionState } from "@/lib/action-state";

export async function createGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? user.currency);
  const simplifyDebts = formData.get("simplifyDebts") !== null;
  const memberEmails = String(formData.get("memberEmails") ?? "")
    .split(/[,\n;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (name.length < 2) return { error: "Bitte gib der Gruppe einen Namen." };
  if (name.length > 80) return { error: "Der Gruppenname darf höchstens 80 Zeichen lang sein." };
  if (!GROUP_TYPES.some((t) => t.id === type)) return { error: "Unbekannter Gruppentyp." };
  if (!isSupportedCurrency(currency)) return { error: "Unbekannte Währung." };

  const invited = memberEmails.length
    ? await prisma.user.findMany({ where: { email: { in: memberEmails } }, select: { id: true } })
    : [];

  const group = await prisma.group.create({
    data: {
      name,
      type,
      currency,
      simplifyDebts,
      inviteToken: newInviteToken(),
      createdById: user.id,
      members: {
        create: [
          { userId: user.id, role: "owner" },
          ...invited.filter((u) => u.id !== user.id).map((u) => ({ userId: u.id })),
        ],
      },
    },
  });

  await ensureFriendships([user.id, ...invited.map((u) => u.id)]);
  await logActivity({ type: "group_created", actorId: user.id, groupId: group.id, payload: { name } });

  revalidatePath("/");
  redirect(`/gruppen/${group.id}`);
}

export async function updateGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? "EUR");
  const simplifyDebts = formData.get("simplifyDebts") !== null;

  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership) return { error: "Du bist kein Mitglied dieser Gruppe." };
  if (name.length < 2) return { error: "Bitte gib der Gruppe einen Namen." };
  if (name.length > 80) return { error: "Der Gruppenname darf höchstens 80 Zeichen lang sein." };
  if (!isSupportedCurrency(currency)) return { error: "Unbekannte Währung." };

  await prisma.group.update({ where: { id: groupId }, data: { name, type, currency, simplifyDebts } });
  revalidatePath(`/gruppen/${groupId}`);
  return { success: "Gruppe gespeichert." };
}

export async function regenerateInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership) return { error: "Du bist kein Mitglied dieser Gruppe." };

  await prisma.group.update({ where: { id: groupId }, data: { inviteToken: newInviteToken() } });
  revalidatePath(`/gruppen/${groupId}/einstellungen`);
  return { success: "Neuer Einladungslink erstellt. Der alte Link funktioniert nicht mehr." };
}

export async function addMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership) return { error: "Du bist kein Mitglied dieser Gruppe." };

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    return { error: "Es gibt noch kein Konto mit dieser E-Mail-Adresse. Nutze stattdessen den Einladungslink." };
  }

  const already = await prisma.groupMember.findFirst({ where: { groupId, userId: invitee.id } });
  if (already) return { error: "Diese Person ist bereits Mitglied." };

  await prisma.groupMember.create({ data: { groupId, userId: invitee.id } });
  await ensureFriendships([user.id, invitee.id]);
  await logActivity({
    type: "member_joined",
    actorId: invitee.id,
    groupId,
    payload: { name: invitee.name, invitedBy: user.name },
  });

  revalidatePath(`/gruppen/${groupId}`);
  return { success: `${invitee.name} wurde hinzugefügt.` };
}

export async function joinGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const group = await prisma.group.findUnique({ where: { inviteToken: token }, include: { members: true } });
  if (!group) return { error: "Dieser Einladungslink ist ungültig." };

  if (!group.members.some((m) => m.userId === user.id)) {
    await prisma.groupMember.create({ data: { groupId: group.id, userId: user.id } });
    await ensureFriendships([user.id, ...group.members.map((m) => m.userId)]);
    await logActivity({ type: "member_joined", actorId: user.id, groupId: group.id, payload: { name: user.name } });
  }

  revalidatePath("/");
  redirect(`/gruppen/${group.id}`);
}

export async function leaveGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const targetUserId = String(formData.get("userId") ?? user.id);

  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership) return { error: "Du bist kein Mitglied dieser Gruppe." };
  if (targetUserId !== user.id && membership.role !== "owner") {
    return { error: "Nur die Gruppenverwaltung kann andere Mitglieder entfernen." };
  }

  const shares = await prisma.expenseShare.findMany({
    where: { userId: targetUserId, expense: { groupId, deletedAt: null } },
    select: { paidCents: true, oweCents: true },
  });
  const balance = shares.reduce((acc, s) => acc + s.paidCents - s.oweCents, 0);
  if (balance !== 0) {
    return { error: "Der Saldo in dieser Gruppe ist noch nicht ausgeglichen." };
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } });
  await prisma.groupMember.deleteMany({ where: { groupId, userId: targetUserId } });
  await logActivity({ type: "member_left", actorId: user.id, groupId, payload: { name: target?.name ?? "" } });

  if (targetUserId === user.id) {
    revalidatePath("/");
    redirect("/");
  }
  revalidatePath(`/gruppen/${groupId}`);
  return { success: `${target?.name ?? "Mitglied"} wurde entfernt.` };
}

export async function deleteGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership || membership.role !== "owner") {
    return { error: "Nur die Person, die die Gruppe erstellt hat, kann sie löschen." };
  }

  await prisma.group.delete({ where: { id: groupId } });
  revalidatePath("/");
  redirect("/");
}

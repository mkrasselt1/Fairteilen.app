"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import {
  ActorError,
  forgetLinkIdentity,
  rememberLinkIdentity,
  requireGroupActor,
  type Actor,
} from "@/lib/actor";
import { isSupportedCurrency } from "@/lib/money";
import { GROUP_TYPES } from "@/lib/categories";
import { ensureFriendships, logActivity } from "@/lib/social";
import { newInviteToken } from "@/lib/tokens";
import { colorForId } from "@/lib/format";
import { deleteUpload } from "@/lib/uploads";
import type { ActionState } from "@/lib/action-state";
import { getT } from "@/lib/i18n-server";

export async function createGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? user.currency);
  const simplifyDebts = formData.get("simplifyDebts") !== null;
  const memberEmails = String(formData.get("memberEmails") ?? "")
    .split(/[,\n;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (name.length < 2) return { error: t("Bitte gib der Gruppe einen Namen.") };
  if (name.length > 80) return { error: t("Der Gruppenname darf höchstens 80 Zeichen lang sein.") };
  if (!GROUP_TYPES.some((t) => t.id === type)) return { error: t("Unbekannter Gruppentyp.") };
  if (!isSupportedCurrency(currency)) return { error: t("Unbekannte Währung.") };

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

  revalidatePath("/uebersicht");
  redirect(`/gruppen/${group.id}`);
}

export async function updateGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  let user: Actor;
  try {
    user = await requireGroupActor(String(formData.get("groupId") ?? ""));
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "other");
  const currency = String(formData.get("currency") ?? "EUR");
  const simplifyDebts = formData.get("simplifyDebts") !== null;

  if (name.length < 2) return { error: t("Bitte gib der Gruppe einen Namen.") };
  if (name.length > 80) return { error: t("Der Gruppenname darf höchstens 80 Zeichen lang sein.") };
  if (!isSupportedCurrency(currency)) return { error: t("Unbekannte Währung.") };

  await prisma.group.update({ where: { id: groupId }, data: { name, type, currency, simplifyDebts } });
  revalidatePath(`/gruppen/${groupId}`);
  return { success: t("Gruppe gespeichert.") };
}

export async function regenerateInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership) return { error: t("Du bist kein Mitglied dieser Gruppe.") };

  await prisma.group.update({ where: { id: groupId }, data: { inviteToken: newInviteToken() } });
  revalidatePath(`/gruppen/${groupId}/einstellungen`);
  return { success: t("Neuer Einladungslink erstellt. Der alte Link funktioniert nicht mehr.") };
}

export async function addMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  let user: Actor;
  try {
    user = await requireGroupActor(String(formData.get("groupId") ?? ""));
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }
  const groupId = String(formData.get("groupId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    return { error: t("Es gibt noch kein Konto mit dieser E-Mail-Adresse. Nutze stattdessen den Einladungslink.") };
  }

  const already = await prisma.groupMember.findFirst({ where: { groupId, userId: invitee.id } });
  if (already) return { error: t("Diese Person ist bereits Mitglied.") };

  await prisma.groupMember.create({ data: { groupId, userId: invitee.id } });
  await ensureFriendships([user.userId, invitee.id]);
  await logActivity({
    type: "member_joined",
    actorId: invitee.id,
    groupId,
    payload: { name: invitee.name, invitedBy: user.name },
  });

  revalidatePath(`/gruppen/${groupId}`);
  return { success: t("{name} wurde hinzugefügt.", { name: invitee.name }) };
}

export async function joinGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const group = await prisma.group.findUnique({ where: { inviteToken: token }, include: { members: true } });
  if (!group) return { error: t("Dieser Einladungslink ist ungültig.") };

  if (!group.members.some((m) => m.userId === user.id)) {
    await prisma.groupMember.create({ data: { groupId: group.id, userId: user.id } });
    await ensureFriendships([user.id, ...group.members.map((m) => m.userId)]);
    await logActivity({ type: "member_joined", actorId: user.id, groupId: group.id, payload: { name: user.name } });
  }

  revalidatePath("/uebersicht");
  redirect(`/gruppen/${group.id}`);
}

export async function leaveGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const groupId = String(formData.get("groupId") ?? "");
  let user: Actor;
  try {
    user = await requireGroupActor(groupId);
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  const targetUserId = String(formData.get("userId") ?? user.userId);
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.userId } });

  // In einer geteilten Gruppe ohne Konten gibt es keine Verwaltung – dort darf
  // jede mitarbeitende Person aufräumen.
  if (!user.viaLink && targetUserId !== user.userId && membership?.role !== "owner") {
    return { error: t("Nur die Gruppenverwaltung kann andere Mitglieder entfernen.") };
  }

  const shares = await prisma.expenseShare.findMany({
    where: { userId: targetUserId, expense: { groupId, deletedAt: null } },
    select: { paidCents: true, oweCents: true },
  });
  const balance = shares.reduce((acc, s) => acc + s.paidCents - s.oweCents, 0);
  if (balance !== 0) {
    return { error: t("Der Saldo in dieser Gruppe ist noch nicht ausgeglichen.") };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, isGuest: true },
  });
  await prisma.groupMember.deleteMany({ where: { groupId, userId: targetUserId } });
  await logActivity({ type: "member_left", actorId: user.userId, groupId, payload: { name: target?.name ?? "" } });

  // Ein Gast existiert nur innerhalb seiner Gruppen – ohne Gruppe hat er keinen Zweck mehr.
  if (target?.isGuest) {
    const remaining = await prisma.groupMember.count({ where: { userId: targetUserId } });
    if (remaining === 0) await prisma.user.delete({ where: { id: targetUserId } }).catch(() => undefined);
  }

  if (targetUserId === user.userId) {
    revalidatePath("/uebersicht");
    redirect("/");
  }
  revalidatePath(`/gruppen/${groupId}`);
  return { success: t("{name} wurde entfernt.", { name: target?.name ?? t("Mitglied") }) };
}

export async function setGroupArchivedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  let user: Actor;
  try {
    user = await requireGroupActor(String(formData.get("groupId") ?? ""));
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }
  const groupId = String(formData.get("groupId") ?? "");
  const archived = String(formData.get("archived") ?? "") === "true";

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { archivedAt: archived ? new Date() : null },
    select: { name: true },
  });
  await logActivity({
    type: archived ? "group_archived" : "group_restored",
    actorId: user.userId,
    groupId,
    payload: { name: group.name },
  });

  revalidatePath("/uebersicht");
  revalidatePath("/gruppen");
  revalidatePath(`/gruppen/${groupId}`);
  return {
    success: archived
      ? "Gruppe archiviert. Sie zählt weiter zu deinen Salden, erscheint aber nur noch im Archiv."
      : "Gruppe wieder aktiv.",
  };
}

export async function deleteGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
  if (!membership || membership.role !== "owner") {
    return { error: t("Nur die Person, die die Gruppe erstellt hat, kann sie löschen.") };
  }

  // Die Datenbank räumt die Datensätze per Kaskade ab – die Dateien nicht.
  const attachments = await prisma.attachment.findMany({
    where: { expense: { groupId } },
    select: { storedName: true },
  });
  await prisma.group.delete({ where: { id: groupId } });
  for (const attachment of attachments) await deleteUpload(attachment.storedName);

  revalidatePath("/uebersicht");
  redirect("/uebersicht");
}

export async function addGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  let user: Actor;
  try {
    user = await requireGroupActor(String(formData.get("groupId") ?? ""));
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) return { error: t("Bitte gib einen Namen an.") };
  if (name.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };

  const existing = await prisma.groupMember.findFirst({
    where: { groupId, user: { name, isGuest: true } },
  });
  if (existing) return { error: t("„{name}“ ist in dieser Gruppe schon eingetragen.", { name }) };

  const guest = await prisma.user.create({
    data: { name, email: null, passwordHash: null, isGuest: true, avatarColor: colorForId(name + groupId) },
  });
  await prisma.groupMember.create({ data: { groupId, userId: guest.id } });
  await logActivity({ type: "guest_added", actorId: user.userId, groupId, payload: { name } });

  revalidatePath(`/gruppen/${groupId}`);
  return { success: t("{name} ist jetzt als Person ohne Konto dabei.", { name }) };
}

/**
 * Ein echtes Konto übernimmt einen Gast: Alle Anteile, Kommentare, Belege und
 * Einträge des Gastes gehen auf das Konto über, danach verschwindet der Gast.
 */
export async function claimGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const guestId = String(formData.get("guestId") ?? "");

  const group = await prisma.group.findUnique({ where: { inviteToken: token }, include: { members: true } });
  if (!group) return { error: t("Dieser Einladungslink ist ungültig.") };

  const guest = await prisma.user.findFirst({
    where: { id: guestId, isGuest: true, memberships: { some: { groupId: group.id } } },
  });
  if (!guest) return { error: t("Diese Person ist in der Gruppe nicht (mehr) eingetragen.") };

  const ownShares = await prisma.expenseShare.findMany({
    where: { userId: user.id, expense: { shares: { some: { userId: guest.id } } } },
    select: { id: true, expenseId: true, paidCents: true, oweCents: true },
  });
  const ownByExpense = new Map(ownShares.map((share) => [share.expenseId, share]));
  const guestShares = await prisma.expenseShare.findMany({ where: { userId: guest.id } });

  await prisma.$transaction(async (tx) => {
    for (const share of guestShares) {
      const own = ownByExpense.get(share.expenseId);
      if (own) {
        // Beide waren an derselben Ausgabe beteiligt – Beträge zusammenlegen.
        await tx.expenseShare.update({
          where: { id: own.id },
          data: { paidCents: own.paidCents + share.paidCents, oweCents: own.oweCents + share.oweCents },
        });
        await tx.expenseShare.delete({ where: { id: share.id } });
      } else {
        await tx.expenseShare.update({ where: { id: share.id }, data: { userId: user.id } });
      }
    }

    await tx.comment.updateMany({ where: { userId: guest.id }, data: { userId: user.id } });
    await tx.attachment.updateMany({ where: { uploadedById: guest.id }, data: { uploadedById: user.id } });
    await tx.activity.updateMany({ where: { actorId: guest.id }, data: { actorId: user.id } });
    await tx.expense.updateMany({ where: { createdById: guest.id }, data: { createdById: user.id } });

    // Mitgliedschaften des Gastes übernehmen, ohne Doppelungen zu erzeugen.
    const guestGroups = await tx.groupMember.findMany({ where: { userId: guest.id }, select: { groupId: true } });
    for (const membership of guestGroups) {
      const already = await tx.groupMember.findFirst({ where: { groupId: membership.groupId, userId: user.id } });
      if (!already) await tx.groupMember.create({ data: { groupId: membership.groupId, userId: user.id } });
    }
    await tx.user.delete({ where: { id: guest.id } });
  });

  await ensureFriendships([user.id, ...group.members.map((m) => m.userId)]);
  await logActivity({
    type: "guest_claimed",
    actorId: user.id,
    groupId: group.id,
    payload: { name: user.name, guestName: guest.name },
  });

  revalidatePath("/uebersicht");
  redirect(`/gruppen/${group.id}`);
}

/**
 * Abrechnung abschließen und offene Beträge in eine neue Gruppe übertragen.
 *
 * In der alten Gruppe wird eine Buchung angelegt, die alle Salden auf null
 * bringt; in der neuen dieselbe Buchung spiegelbildlich. Dadurch bleibt jede
 * Abrechnung für sich nachvollziehbar, und niemand verliert einen Anspruch.
 */
export async function carryOverGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const archiveOld = formData.get("archiveOld") !== null;

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId: user.id } } },
    include: { members: { select: { userId: true, role: true } } },
  });
  if (!group) return { error: t("Du bist kein Mitglied dieser Gruppe.") };
  if (name.length < 2) return { error: t("Bitte gib der neuen Gruppe einen Namen.") };
  if (name.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };

  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    select: { currency: true, shares: { select: { userId: true, paidCents: true, oweCents: true } } },
  });

  // Saldo je Währung und Person.
  const perCurrency = new Map<string, Map<string, number>>();
  for (const expense of expenses) {
    let balances = perCurrency.get(expense.currency);
    if (!balances) perCurrency.set(expense.currency, (balances = new Map()));
    for (const share of expense.shares) {
      balances.set(share.userId, (balances.get(share.userId) ?? 0) + share.paidCents - share.oweCents);
    }
  }
  for (const [currency, balances] of perCurrency) {
    for (const [userId, value] of balances) if (value === 0) balances.delete(userId);
    if (balances.size === 0) perCurrency.delete(currency);
  }

  const created = await prisma.group.create({
    data: {
      name,
      type: group.type,
      currency: group.currency,
      simplifyDebts: group.simplifyDebts,
      inviteToken: newInviteToken(),
      createdById: user.id,
      members: {
        create: group.members.map((member) => ({
          userId: member.userId,
          role: member.userId === user.id ? "owner" : member.role,
        })),
      },
    },
  });

  for (const [currency, balances] of perCurrency) {
    const total = [...balances.values()].filter((value) => value > 0).reduce((a, b) => a + b, 0);
    if (total === 0) continue;

    // Alte Gruppe glattstellen: Wer im Minus steht, zahlt ein; wer im Plus steht, bekommt.
    await prisma.expense.create({
      data: {
        groupId,
        description: t("Übertrag nach „{name}“", { name }),
        amountCents: total,
        currency,
        category: "carryover",
        splitType: "exact",
        createdById: user.id,
        shares: {
          create: [...balances.entries()].map(([userId, value]) => ({
            userId,
            paidCents: value < 0 ? -value : 0,
            oweCents: value > 0 ? value : 0,
          })),
        },
      },
    });

    // Neue Gruppe: derselbe Stand, nur spiegelbildlich.
    await prisma.expense.create({
      data: {
        groupId: created.id,
        description: t("Übertrag aus „{name}“", { name: group.name }),
        amountCents: total,
        currency,
        category: "carryover",
        splitType: "exact",
        createdById: user.id,
        shares: {
          create: [...balances.entries()].map(([userId, value]) => ({
            userId,
            paidCents: value > 0 ? value : 0,
            oweCents: value < 0 ? -value : 0,
          })),
        },
      },
    });
  }

  if (archiveOld) {
    await prisma.group.update({ where: { id: groupId }, data: { archivedAt: new Date() } });
  }

  await logActivity({
    type: "group_carried_over",
    actorId: user.id,
    groupId,
    payload: { name: group.name, target: name, currencies: perCurrency.size },
  });
  await logActivity({
    type: "group_created",
    actorId: user.id,
    groupId: created.id,
    payload: { name },
  });

  revalidatePath("/uebersicht");
  revalidatePath("/gruppen");
  redirect(`/gruppen/${created.id}`);
}

/** Erzeugt einen Freigabe-Code für den gemeinsamen Link. */
function newPublicToken(): string {
  return newInviteToken();
}

/**
 * Gemeinsame Abrechnung ohne Konto anlegen. Wer sie erstellt, wird als Person
 * ohne Konto eingetragen und über ein Cookie wiedererkannt.
 */
export async function createSharedBoardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const groupName = String(formData.get("name") ?? "").trim();
  const ownName = String(formData.get("ownName") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR");
  const others = String(formData.get("others") ?? "")
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (groupName.length < 2) return { error: t("Bitte gib der Abrechnung einen Namen.") };
  if (groupName.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };
  if (ownName.length < 2) return { error: t("Bitte gib deinen Namen an.") };
  if (ownName.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };
  if (!isSupportedCurrency(currency)) return { error: t("Unbekannte Währung.") };

  const account = await getCurrentUser();
  const publicToken = newPublicToken();

  // Angemeldete Personen bleiben sie selbst, alle anderen werden zu Gästen.
  const me = account
    ? { id: account.id, isGuest: false }
    : await prisma.user.create({
        data: {
          name: ownName,
          email: null,
          passwordHash: null,
          isGuest: true,
          avatarColor: colorForId(ownName + publicToken),
        },
        select: { id: true, isGuest: true },
      });

  const group = await prisma.group.create({
    data: {
      name: groupName,
      type: "other",
      currency,
      simplifyDebts: true,
      inviteToken: newInviteToken(),
      publicToken,
      createdById: me.id,
      members: { create: [{ userId: me.id, role: account ? "owner" : "member" }] },
    },
  });

  for (const name of new Set(others.filter((name) => name !== ownName))) {
    const guest = await prisma.user.create({
      data: {
        name,
        email: null,
        passwordHash: null,
        isGuest: true,
        avatarColor: colorForId(name + group.id),
      },
    });
    await prisma.groupMember.create({ data: { groupId: group.id, userId: guest.id } });
  }

  if (!account) await rememberLinkIdentity(group.id, me.id);
  await logActivity({ type: "group_created", actorId: me.id, groupId: group.id, payload: { name: groupName } });

  redirect(`/gemeinsam/${publicToken}`);
}

/** Beim Öffnen eines geteilten Links festlegen, wer man ist. */
export async function joinSharedBoardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const token = String(formData.get("token") ?? "");
  const existingId = String(formData.get("personId") ?? "").trim();
  const newName = String(formData.get("name") ?? "").trim();

  const group = await prisma.group.findUnique({
    where: { publicToken: token },
    include: { members: { include: { user: { select: { id: true, name: true, isGuest: true } } } } },
  });
  if (!group) return { error: t("Dieser Link ist nicht (mehr) gültig.") };

  const account = await getCurrentUser();

  // Angemeldete Personen treten als sie selbst bei.
  if (account) {
    if (!group.members.some((member) => member.userId === account.id)) {
      await prisma.groupMember.create({ data: { groupId: group.id, userId: account.id } });
      await logActivity({
        type: "member_joined",
        actorId: account.id,
        groupId: group.id,
        payload: { name: account.name },
      });
    }
    redirect(`/gemeinsam/${token}`);
  }

  if (existingId) {
    const member = group.members.find((entry) => entry.userId === existingId);
    if (!member) return { error: t("Diese Person gehört nicht zu dieser Abrechnung.") };
    await rememberLinkIdentity(group.id, member.userId);
    redirect(`/gemeinsam/${token}`);
  }

  if (newName.length < 2) return { error: t("Bitte gib deinen Namen an.") };
  if (newName.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };
  if (group.members.some((member) => member.user.name === newName)) {
    return { error: t("„{name}“ ist hier schon eingetragen – bitte oben auswählen.", { name: newName }) };
  }

  const person = await prisma.user.create({
    data: {
      name: newName,
      email: null,
      passwordHash: null,
      isGuest: true,
      avatarColor: colorForId(newName + group.id),
    },
  });
  await prisma.groupMember.create({ data: { groupId: group.id, userId: person.id } });
  await rememberLinkIdentity(group.id, person.id);
  await logActivity({ type: "member_joined", actorId: person.id, groupId: group.id, payload: { name: newName } });

  redirect(`/gemeinsam/${token}`);
}

/** Den gemeinsamen Link für eine bestehende Gruppe ein- oder ausschalten. */
export async function setPublicSharingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const groupId = String(formData.get("groupId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";

  try {
    await requireGroupActor(groupId);
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { publicToken: enabled ? newPublicToken() : null },
  });

  revalidatePath(`/gruppen/${groupId}/einstellungen`);
  return {
    success: enabled
      ? "Der gemeinsame Link ist aktiv. Alle, die ihn haben, können mitarbeiten."
      : "Der gemeinsame Link wurde abgeschaltet.",
  };
}

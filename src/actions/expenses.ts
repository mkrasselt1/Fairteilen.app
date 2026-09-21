"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ActorError, requireExpenseActor, requireGroupActor, type Actor } from "@/lib/actor";
import { isSupportedCurrency, parseAmountToCents } from "@/lib/money";
import { CATEGORIES } from "@/lib/categories";
import { computeShares, SPLIT_TYPES, SplitError, validatePayments, type SplitType } from "@/lib/split";
import { ensureFriendships, logActivity } from "@/lib/social";
import { deleteUpload, prepareUpload, writeUpload, UploadError } from "@/lib/uploads";
import type { ActionState } from "@/lib/action-state";
import { getT } from "@/lib/i18n-server";
import type { Translate } from "@/lib/i18n";

const RECURRENCES = ["none", "daily", "weekly", "monthly", "yearly"] as const;

/** Nur Pfade innerhalb der Anwendung sind als Rücksprungziel zulässig. */
function safeReturnTo(formData: FormData): string | null {
  const value = String(formData.get("returnTo") ?? "").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

async function accountActor(): Promise<Actor> {
  const account = await getCurrentUser();
  if (!account) throw new ActorError("Dafür musst du angemeldet sein.");
  return { userId: account.id, name: account.name, viaLink: false, account };
}

/**
 * Wer das Formular abschickt: ein angemeldetes Konto oder jemand, der über den
 * geteilten Link an dieser Gruppe mitarbeitet.
 */
async function actorForForm(formData: FormData): Promise<Actor> {
  const expenseId = String(formData.get("expenseId") ?? "").trim();
  if (expenseId) return (await requireExpenseActor(expenseId)).actor;

  const groupId = String(formData.get("groupId") ?? "").trim();
  if (groupId) return requireGroupActor(groupId);
  return accountActor();
}
type Recurrence = (typeof RECURRENCES)[number];

type ParsedForm = {
  expenseId: string | null;
  groupId: string | null;
  description: string;
  amountCents: number;
  currency: string;
  date: Date;
  category: string;
  notes: string | null;
  splitType: SplitType;
  recurrence: Recurrence;
  recurrenceUntil: Date | null;
  payments: { userId: string; paidCents: number }[];
  participants: { userId: string; value?: number }[];
};

function parseDate(value: string): Date {
  const parsed = value ? new Date(`${value}T12:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseExpenseForm(formData: FormData): ParsedForm {
  const currency = String(formData.get("currency") ?? "EUR");
  if (!isSupportedCurrency(currency)) throw new SplitError("Unbekannte Währung.");

  const description = String(formData.get("description") ?? "").trim();
  if (description.length < 1) throw new SplitError("Bitte gib eine Beschreibung an.");
  if (description.length > 120) throw new SplitError("Die Beschreibung darf höchstens 120 Zeichen lang sein.");

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""), currency);
  if (amountCents === null || amountCents <= 0) throw new SplitError("Bitte gib einen gültigen Betrag größer 0 an.");

  const splitType = String(formData.get("splitType") ?? "equal") as SplitType;
  if (!SPLIT_TYPES.includes(splitType)) throw new SplitError("Unbekannte Aufteilungsart.");

  const category = String(formData.get("category") ?? "general");
  if (!CATEGORIES.some((c) => c.id === category)) throw new SplitError("Unbekannte Kategorie.");

  const recurrence = String(formData.get("recurrence") ?? "none") as Recurrence;
  if (!RECURRENCES.includes(recurrence)) throw new SplitError("Unbekannte Wiederholung.");
  const recurrenceUntilRaw = String(formData.get("recurrenceUntil") ?? "");

  const selected = formData.getAll("participant").map(String).filter(Boolean);
  if (selected.length === 0) throw new SplitError("Bitte wähle mindestens eine beteiligte Person aus.");

  const participants = selected.map((userId) => {
    const raw = String(formData.get(`value:${userId}`) ?? "").trim();
    let value: number | undefined;
    if (splitType === "exact" || splitType === "adjustment") {
      value = raw ? (parseAmountToCents(raw, currency) ?? 0) : 0;
    } else if (splitType === "percent") {
      value = raw ? Math.round(Number(raw.replace(",", ".")) * 100) : 0;
    } else if (splitType === "shares") {
      value = raw ? Math.round(Number(raw.replace(",", "."))) : 1;
    }
    return { userId, value };
  });

  const payments: { userId: string; paidCents: number }[] = [];
  if (String(formData.get("payerMode") ?? "single") === "multiple") {
    for (const [key, raw] of formData.entries()) {
      if (!key.startsWith("paid:")) continue;
      const userId = key.slice(5);
      const cents = parseAmountToCents(String(raw), currency);
      if (cents) payments.push({ userId, paidCents: cents });
    }
  } else {
    const payer = String(formData.get("paidBy") ?? "");
    if (!payer) throw new SplitError("Bitte gib an, wer bezahlt hat.");
    payments.push({ userId: payer, paidCents: amountCents });
  }

  const groupIdRaw = String(formData.get("groupId") ?? "").trim();

  return {
    expenseId: String(formData.get("expenseId") ?? "") || null,
    groupId: groupIdRaw || null,
    description,
    amountCents,
    currency,
    date: parseDate(String(formData.get("date") ?? "")),
    category,
    notes: String(formData.get("notes") ?? "").trim() || null,
    splitType,
    recurrence,
    recurrenceUntil: recurrenceUntilRaw ? parseDate(recurrenceUntilRaw) : null,
    payments,
    participants,
  };
}

/** Prüft, ob alle Beteiligten für die aktuelle Person zulässig sind. */
async function assertAccess(userId: string, groupId: string | null, involved: string[]) {
  if (groupId) {
    const group = await prisma.group.findFirst({
      where: { id: groupId, members: { some: { userId } } },
      include: { members: { select: { userId: true } } },
    });
    if (!group) throw new SplitError("Du bist kein Mitglied dieser Gruppe.");
    const memberIds = new Set(group.members.map((m) => m.userId));
    for (const id of involved) {
      if (!memberIds.has(id)) throw new SplitError("Eine beteiligte Person gehört nicht zur Gruppe.");
    }
    return;
  }

  // Ausgabe ohne Gruppe: nur mit der eigenen Person und bekannten Kontakten.
  const others = involved.filter((id) => id !== userId);
  if (others.length > 0) {
    const known = await prisma.user.count({
      where: {
        id: { in: others },
        OR: [
          { friendshipsTo: { some: { userId } } },
          { memberships: { some: { group: { members: { some: { userId } } } } } },
        ],
      },
    });
    if (known !== new Set(others).size) throw new SplitError("Eine beteiligte Person ist nicht in deiner Kontaktliste.");
  }
  if (!involved.includes(userId)) throw new SplitError("Bei Ausgaben ohne Gruppe musst du selbst beteiligt sein.");
}

function nextDate(date: Date, recurrence: Recurrence): Date | null {
  const next = new Date(date);
  switch (recurrence) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return null;
  }
}

export async function saveExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  let user: Actor;
  try {
    user = await actorForForm(formData);
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  let parsed: ParsedForm;
  let shares: { userId: string; paidCents: number; oweCents: number }[];
  let preparedAttachments: Awaited<ReturnType<typeof prepareAttachments>> = [];

  try {
    // Belege zuerst prüfen: Eine unbrauchbare Datei soll die Ausgabe gar nicht
    // erst anlegen, statt später kommentarlos zu fehlen.
    preparedAttachments = await prepareAttachments(attachmentsFromForm(formData), t);
    parsed = parseExpenseForm(formData);
    const payments = validatePayments(parsed.amountCents, parsed.payments);
    const owed = computeShares(parsed.amountCents, parsed.splitType, parsed.participants);

    const byUser = new Map<string, { userId: string; paidCents: number; oweCents: number }>();
    for (const p of payments) byUser.set(p.userId, { userId: p.userId, paidCents: p.paidCents, oweCents: 0 });
    for (const o of owed) {
      const entry = byUser.get(o.userId) ?? { userId: o.userId, paidCents: 0, oweCents: 0 };
      entry.oweCents = o.oweCents;
      byUser.set(o.userId, entry);
    }
    shares = [...byUser.values()];

    await assertAccess(user.userId, parsed.groupId, shares.map((s) => s.userId));
  } catch (error) {
    if (error instanceof SplitError || error instanceof UploadError)
      return { error: t(error.template, error.params) };
    throw error;
  }

  const data = {
    groupId: parsed.groupId,
    description: parsed.description,
    amountCents: parsed.amountCents,
    currency: parsed.currency,
    date: parsed.date,
    category: parsed.category,
    notes: parsed.notes,
    splitType: parsed.splitType,
    recurrence: parsed.recurrence === "none" ? null : parsed.recurrence,
    recurrenceUntil: parsed.recurrenceUntil,
    nextOccurrence: parsed.recurrence === "none" ? null : nextDate(parsed.date, parsed.recurrence),
  };

  let expenseId = parsed.expenseId;
  if (expenseId) {
    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        deletedAt: null,
        OR: [{ shares: { some: { userId: user.userId } } }, { group: { members: { some: { userId: user.userId } } } }],
      },
    });
    if (!existing) return { error: t("Diese Ausgabe kann nicht bearbeitet werden.") };

    await prisma.$transaction([
      prisma.expense.update({ where: { id: expenseId }, data }),
      prisma.expenseShare.deleteMany({ where: { expenseId } }),
      prisma.expenseShare.createMany({ data: shares.map((s) => ({ ...s, expenseId: expenseId! })) }),
    ]);
    await logActivity({
      type: "expense_updated",
      actorId: user.userId,
      groupId: parsed.groupId,
      expenseId,
      payload: { description: parsed.description, amountCents: parsed.amountCents, currency: parsed.currency },
    });
  } else {
    const created = await prisma.expense.create({
      data: { ...data, createdById: user.userId, shares: { create: shares } },
    });
    expenseId = created.id;
    await logActivity({
      type: "expense_added",
      actorId: user.userId,
      groupId: parsed.groupId,
      expenseId,
      payload: { description: parsed.description, amountCents: parsed.amountCents, currency: parsed.currency },
    });
  }

  await ensureFriendships(shares.map((s) => s.userId));

  // Beim Anlegen und Bearbeiten mitgeschickte Belege übernehmen.
  if (preparedAttachments.length > 0) await writeAttachments(expenseId, user.userId, preparedAttachments);

  revalidatePath("/uebersicht");
  revalidatePath("/aktivitaet");
  const back = safeReturnTo(formData);
  if (back) {
    revalidatePath(back);
    redirect(back);
  }
  if (parsed.groupId) revalidatePath(`/gruppen/${parsed.groupId}`);
  redirect(parsed.groupId ? `/gruppen/${parsed.groupId}` : `/ausgaben/${expenseId}`);
}

export async function deleteExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const expenseId = String(formData.get("expenseId") ?? "");
  let user: Actor;
  try {
    user = (await requireExpenseActor(expenseId)).actor;
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  const expense = await prisma.expense.findFirst({ where: { id: expenseId, deletedAt: null } });
  if (!expense) return { error: t("Diese Ausgabe kann nicht gelöscht werden.") };

  await prisma.expense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } });
  await logActivity({
    type: expense.isPayment ? "payment_deleted" : "expense_deleted",
    actorId: user.userId,
    groupId: expense.groupId,
    expenseId,
    payload: { description: expense.description, amountCents: expense.amountCents, currency: expense.currency },
  });

  revalidatePath("/uebersicht");
  revalidatePath("/aktivitaet");
  const back = safeReturnTo(formData);
  if (back) {
    revalidatePath(back);
    redirect(back);
  }
  if (expense.groupId) {
    revalidatePath(`/gruppen/${expense.groupId}`);
    redirect(`/gruppen/${expense.groupId}`);
  }
  redirect("/uebersicht");
}

export async function restoreExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const expenseId = String(formData.get("expenseId") ?? "");
  try {
    await requireExpenseActor(expenseId);
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  const expense = await prisma.expense.findFirst({ where: { id: expenseId, NOT: { deletedAt: null } } });
  if (!expense) return { error: t("Diese Ausgabe kann nicht wiederhergestellt werden.") };

  await prisma.expense.update({ where: { id: expenseId }, data: { deletedAt: null } });
  revalidatePath("/uebersicht");
  if (expense.groupId) revalidatePath(`/gruppen/${expense.groupId}`);
  return { success: t("Ausgabe wiederhergestellt.") };
}

/** Zahlung erfassen ("Begleichen"). */
export async function settleUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  let user: Actor;
  try {
    user = await actorForForm(formData);
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  const fromUserId = String(formData.get("fromUserId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  const account = user.account;
  const currency = String(formData.get("currency") ?? account?.currency ?? "EUR");
  const groupId = String(formData.get("groupId") ?? "").trim() || null;
  const date = parseDate(String(formData.get("date") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""), currency);

  if (!fromUserId || !toUserId || fromUserId === toUserId) return { error: t("Bitte wähle zwei verschiedene Personen.") };
  if (amountCents === null || amountCents <= 0) return { error: t("Bitte gib einen gültigen Betrag größer 0 an.") };
  if (!isSupportedCurrency(currency)) return { error: t("Unbekannte Währung.") };
  if (fromUserId !== user.userId && toUserId !== user.userId && !groupId) {
    return { error: t("Zahlungen ohne Gruppe kannst du nur für dich selbst erfassen.") };
  }

  try {
    await assertAccess(user.userId, groupId, [fromUserId, toUserId]);
  } catch (error) {
    if (error instanceof SplitError) return { error: t(error.template, error.params) };
    throw error;
  }

  const [from, to] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: fromUserId }, select: { name: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: toUserId }, select: { name: true } }),
  ]);

  const expense = await prisma.expense.create({
    data: {
      groupId,
      description: t("{von} hat {an} bezahlt", { von: from.name, an: to.name }),
      amountCents,
      currency,
      date,
      category: "payment",
      notes,
      splitType: "exact",
      isPayment: true,
      createdById: user.userId,
      shares: {
        create: [
          { userId: fromUserId, paidCents: amountCents, oweCents: 0 },
          { userId: toUserId, paidCents: 0, oweCents: amountCents },
        ],
      },
    },
  });

  await logActivity({
    type: "payment_added",
    actorId: user.userId,
    groupId,
    expenseId: expense.id,
    payload: { from: from.name, to: to.name, amountCents, currency },
  });

  revalidatePath("/uebersicht");
  revalidatePath("/aktivitaet");
  const back = safeReturnTo(formData);
  if (back) {
    revalidatePath(back);
    redirect(back);
  }
  if (groupId) {
    revalidatePath(`/gruppen/${groupId}`);
    redirect(`/gruppen/${groupId}`);
  }
  redirect(`/freunde/${fromUserId === user.userId ? toUserId : fromUserId}`);
}

export async function addCommentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const expenseId = String(formData.get("expenseId") ?? "");
  let user: Actor;
  try {
    user = (await requireExpenseActor(expenseId)).actor;
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: t("Bitte gib einen Kommentar ein.") };
  if (body.length > 4000) return { error: t("Der Kommentar darf höchstens 4000 Zeichen lang sein.") };

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) return { error: t("Diese Ausgabe wurde nicht gefunden.") };

  await prisma.comment.create({ data: { expenseId, userId: user.userId, body } });
  await logActivity({
    type: "comment_added",
    actorId: user.userId,
    groupId: expense.groupId,
    expenseId,
    payload: { description: expense.description, body: body.slice(0, 140) },
  });

  revalidatePath(`/ausgaben/${expenseId}`);
  revalidatePath("/gemeinsam", "layout");
  return { success: "" };
}

/**
 * Fällige wiederkehrende Ausgaben anlegen. Wird beim Laden der Übersicht
 * aufgerufen – so braucht die Instanz keinen zusätzlichen Hintergrunddienst.
 */
export async function materializeRecurringExpenses(userId: string): Promise<number> {
  const due = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      nextOccurrence: { lte: new Date() },
      NOT: { recurrence: null },
      shares: { some: { userId } },
    },
    include: { shares: true },
    take: 50,
  });

  let created = 0;
  for (const template of due) {
    let occurrence = template.nextOccurrence!;
    const recurrence = template.recurrence as Recurrence;
    let guard = 0;

    while (occurrence <= new Date() && guard++ < 60) {
      if (template.recurrenceUntil && occurrence > template.recurrenceUntil) break;
      const copy = await prisma.expense.create({
        data: {
          groupId: template.groupId,
          description: template.description,
          amountCents: template.amountCents,
          currency: template.currency,
          date: occurrence,
          category: template.category,
          notes: template.notes,
          splitType: template.splitType,
          createdById: template.createdById,
          recurringFromId: template.id,
          shares: {
            create: template.shares.map((s) => ({
              userId: s.userId,
              paidCents: s.paidCents,
              oweCents: s.oweCents,
            })),
          },
        },
      });
      created++;
      await logActivity({
        type: "expense_added",
        actorId: template.createdById,
        groupId: template.groupId,
        expenseId: copy.id,
        payload: {
          description: template.description,
          amountCents: template.amountCents,
          currency: template.currency,
          recurring: true,
        },
      });
      const next = nextDate(occurrence, recurrence);
      if (!next) break;
      occurrence = next;
    }

    const finished = template.recurrenceUntil && occurrence > template.recurrenceUntil;
    await prisma.expense.update({
      where: { id: template.id },
      data: { nextOccurrence: finished ? null : occurrence },
    });
  }
  return created;
}


/**
 * Alle Belege eines Formulars zuerst prüfen und erst dann schreiben: Schlägt eine
 * Datei fehl, wird keine gespeichert. So kann nichts halb ankommen und nichts
 * beim erneuten Versuch doppelt landen.
 */
async function prepareAttachments(files: File[], t: Translate) {
  const usable = files.filter((file) => file && file.size > 0);
  const prepared = [];
  for (const file of usable) {
    try {
      prepared.push(await prepareUpload(file));
    } catch (error) {
      throw new UploadError(
        error instanceof UploadError
          ? `${file.name}: ${t(error.template, error.params)}`
          : t("{datei}: konnte nicht gelesen werden.", { datei: file.name }),
      );
    }
  }
  return prepared;
}

async function writeAttachments(
  expenseId: string,
  userId: string,
  prepared: Awaited<ReturnType<typeof prepareAttachments>>,
): Promise<void> {
  for (const item of prepared) {
    const stored = await writeUpload(item);
    await prisma.attachment.create({ data: { ...stored, expenseId, uploadedById: userId } });
  }
}

function attachmentsFromForm(formData: FormData): File[] {
  return formData.getAll("beleg").filter((entry): entry is File => entry instanceof File);
}

export async function addAttachmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const expenseId = String(formData.get("expenseId") ?? "");
  let user: Actor;
  try {
    user = (await requireExpenseActor(expenseId)).actor;
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  const files = attachmentsFromForm(formData);
  if (files.length === 0 || files.every((file) => file.size === 0)) {
    return { error: t("Bitte wähle mindestens eine Datei aus.") };
  }

  let prepared;
  try {
    prepared = await prepareAttachments(files, t);
  } catch (error) {
    if (error instanceof UploadError) {
      return { error: `${t(error.template, error.params)} ${t("Es wurde nichts hochgeladen.")}` };
    }
    throw error;
  }

  await writeAttachments(expenseId, user.userId, prepared);
  revalidatePath(`/ausgaben/${expenseId}`);
  revalidatePath("/gemeinsam", "layout");
  return {
    success:
      prepared.length === 1
        ? t("Beleg hinzugefügt.")
        : t("{anzahl} Belege hinzugefügt.", { anzahl: prepared.length }),
  };
}

export async function deleteAttachmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const attachmentId = String(formData.get("attachmentId") ?? "");
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return { error: t("Dieser Beleg wurde nicht gefunden.") };

  try {
    await requireExpenseActor(attachment.expenseId);
  } catch (error) {
    if (error instanceof ActorError) return { error: t(error.message) };
    throw error;
  }

  await prisma.attachment.delete({ where: { id: attachment.id } });
  await deleteUpload(attachment.storedName);

  revalidatePath(`/ausgaben/${attachment.expenseId}`);
  revalidatePath("/gemeinsam", "layout");
  return { success: t("Beleg gelöscht.") };
}

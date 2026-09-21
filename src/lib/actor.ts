import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";
import { getCurrentUser, type SessionUser } from "./auth";

/**
 * Wer gerade handelt – entweder ein angemeldetes Konto oder jemand, der über
 * einen geteilten Link arbeitet. Link-Identitäten gelten immer nur für genau
 * die Gruppe, zu der der Link gehört.
 */

export const LINK_COOKIE = "fairteilen_mitmachen";
const MAX_ENTRIES = 25;
const COOKIE_DAYS = 365;

type LinkEntry = { g: string; u: string };

function secret(): string {
  return process.env.AUTH_SECRET || "fairteilen-entwicklungs-geheimnis-bitte-aendern";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(entries: LinkEntry[]): string {
  const payload = Buffer.from(JSON.stringify(entries.slice(-MAX_ENTRIES))).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): LinkEntry[] {
  if (!raw) return [];
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return [];

  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return [];
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is LinkEntry => typeof entry?.g === "string" && typeof entry?.u === "string");
  } catch {
    return [];
  }
}

/** Merkt sich, als wen jemand in einer Gruppe mitarbeitet. */
export async function rememberLinkIdentity(groupId: string, userId: string): Promise<void> {
  const store = await cookies();
  const entries = decode(store.get(LINK_COOKIE)?.value).filter((entry) => entry.g !== groupId);
  entries.push({ g: groupId, u: userId });

  store.set(LINK_COOKIE, encode(entries), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_DAYS * 24 * 60 * 60,
  });
}

export async function forgetLinkIdentity(groupId: string): Promise<void> {
  const store = await cookies();
  const entries = decode(store.get(LINK_COOKIE)?.value).filter((entry) => entry.g !== groupId);
  if (entries.length === 0) store.delete(LINK_COOKIE);
  else store.set(LINK_COOKIE, encode(entries), { httpOnly: true, sameSite: "lax", path: "/" });
}

export const getLinkIdentity = cache(async (groupId: string): Promise<string | null> => {
  const store = await cookies();
  const entry = decode(store.get(LINK_COOKIE)?.value).find((item) => item.g === groupId);
  if (!entry) return null;

  // Die Person muss noch Mitglied sein – sonst gilt der Eintrag nicht mehr.
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: entry.u } });
  return membership ? entry.u : null;
});

export type Actor = {
  userId: string;
  name: string;
  /** Angemeldetes Konto oder Mitarbeit über den Link. */
  viaLink: boolean;
  account: SessionUser | null;
};

/**
 * Wer in dieser Gruppe handeln darf. Angemeldete Mitglieder zuerst, sonst die
 * Identität aus dem geteilten Link – aber nur, wenn die Gruppe den Link
 * überhaupt freigegeben hat.
 */
export async function getGroupActor(groupId: string): Promise<Actor | null> {
  const account = await getCurrentUser();
  if (account) {
    const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: account.id } });
    if (membership) return { userId: account.id, name: account.name, viaLink: false, account };
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { publicToken: true } });
  if (!group?.publicToken) return null;

  const linkUserId = await getLinkIdentity(groupId);
  if (!linkUserId) return null;

  const person = await prisma.user.findUnique({ where: { id: linkUserId }, select: { name: true } });
  if (!person) return null;

  return { userId: linkUserId, name: person.name, viaLink: true, account };
}

/** Wie `getGroupActor`, aber für Aktionen: ohne Berechtigung gibt es einen Fehler. */
export class ActorError extends Error {}

export async function requireGroupActor(groupId: string): Promise<Actor> {
  const actor = await getGroupActor(groupId);
  if (!actor) throw new ActorError("Du darfst in dieser Gruppe nichts ändern.");
  return actor;
}

/** Zugriff auf eine Ausgabe – über Konto oder über den Link ihrer Gruppe. */
export async function requireExpenseActor(expenseId: string): Promise<{ actor: Actor; groupId: string | null }> {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId }, select: { groupId: true } });
  if (!expense) throw new ActorError("Diese Ausgabe wurde nicht gefunden.");

  if (expense.groupId) {
    return { actor: await requireGroupActor(expense.groupId), groupId: expense.groupId };
  }

  // Ausgaben ohne Gruppe gibt es nur mit Konto.
  const account = await getCurrentUser();
  if (!account) throw new ActorError("Dafür musst du angemeldet sein.");
  return {
    actor: { userId: account.id, name: account.name, viaLink: false, account },
    groupId: null,
  };
}

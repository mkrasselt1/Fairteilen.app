import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "node:crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "fairteilen_session";
const SESSION_DAYS = 60;

/** Passwort-Hash: scrypt aus der Node-Standardbibliothek (keine nativen Abhängigkeiten). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  try {
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(hash, "base64");
    const derived = crypto.scryptSync(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function sign(token: string): string {
  const secret = process.env.AUTH_SECRET || "fairteilen-entwicklungs-geheimnis-bitte-aendern";
  return crypto.createHmac("sha256", secret).update(token).digest("base64url");
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const [token] = raw.split(".");
    await prisma.session.deleteMany({ where: { token } }).catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  currency: string;
  locale: string;
  avatarColor: string;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const [token, signature] = raw.split(".");
  if (!token || !signature) return null;

  const expected = sign(token);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.user.isGuest) return null;

  // Gäste haben keine Sitzung, deshalb ist hier immer eine Adresse hinterlegt.
  const { id, email, name, currency, locale, avatarColor } = session.user;
  return { id, email: email ?? "", name, currency, locale, avatarColor };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden");
  return user;
}

export function registrationOpen(): boolean {
  return process.env.ALLOW_REGISTRATION !== "false";
}

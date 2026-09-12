import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const LIFETIME_MINUTES = 10;

/**
 * Gibt eine Einmal-Nonce für die native Anmeldung aus. Die App verwendet sie
 * beim Aufruf des Anbieters; der Server erkennt daran später, dass das
 * ID-Token zu genau diesem Anmeldeversuch gehört.
 */
export async function POST() {
  const value = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + LIFETIME_MINUTES * 60 * 1000);
  await prisma.loginNonce.create({ data: { value, expiresAt } });

  // Abgelaufene Einträge gelegentlich mitentsorgen, damit die Tabelle klein bleibt.
  if (Math.random() < 0.1) {
    await prisma.loginNonce.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
  }

  return Response.json(
    { nonce: value, expiresAt: expiresAt.toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isOAuthProvider, providerConfig, verifyIdToken } from "@/lib/oauth";
import { AccountError, resolveUserFromClaims } from "@/lib/oauth-account";

export const dynamic = "force-dynamic";

/**
 * Anmeldung aus der App: Das native Anmelde-Plugin liefert ein ID-Token, das
 * hier genauso geprüft wird wie im Browserweg – Signatur gegen die Schlüssel des
 * Anbieters, Aussteller, Empfänger, Laufzeit und die zuvor ausgegebene Nonce.
 *
 * Nötig, weil Google die Anmeldung in eingebetteten Browsern ablehnt; siehe
 * docs/apps.md.
 */
export async function POST(request: Request) {
  let payload: { provider?: string; idToken?: string; nonce?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { provider, idToken, nonce } = payload;
  if (!provider || !isOAuthProvider(provider)) {
    return Response.json({ error: "Unbekannter Anbieter." }, { status: 400 });
  }
  if (!idToken || !nonce) {
    return Response.json({ error: "idToken und nonce werden benötigt." }, { status: 400 });
  }

  const config = providerConfig(provider);
  if (!config) {
    return Response.json({ error: `Die Anmeldung über ${provider} ist nicht eingerichtet.` }, { status: 501 });
  }

  // Nonce einlösen – jede nur ein einziges Mal.
  const stored = await prisma.loginNonce.findUnique({ where: { value: nonce } });
  if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
    return Response.json({ error: "Der Anmeldeversuch ist abgelaufen. Bitte erneut versuchen." }, { status: 400 });
  }
  const claimed = await prisma.loginNonce.updateMany({
    where: { id: stored.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return Response.json({ error: "Dieser Anmeldeversuch wurde bereits verwendet." }, { status: 400 });
  }

  let userId: string;
  try {
    const claims = await verifyIdToken(config, idToken, nonce);
    userId = await resolveUserFromClaims(provider, claims);
  } catch (error) {
    if (error instanceof AccountError) return Response.json({ error: error.message }, { status: 409 });
    console.error("Native Anmeldung fehlgeschlagen:", error);
    return Response.json({ error: "Die Anmeldung konnte nicht abgeschlossen werden." }, { status: 401 });
  }

  await createSession(userId);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}

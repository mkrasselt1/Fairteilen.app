import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, registrationOpen } from "@/lib/auth";
import { colorForId } from "@/lib/format";
import {
  exchangeCode,
  isEmailVerified,
  isOAuthProvider,
  providerConfig,
  redirectUri,
  verifyIdToken,
  type IdTokenClaims,
  type OAuthProvider,
} from "@/lib/oauth";
import { baseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

function fail(base: string, message: string): Response {
  return Response.redirect(`${base}/anmelden?fehler=${encodeURIComponent(message)}`, 302);
}

function displayName(claims: IdTokenClaims, appleUser: { name?: { firstName?: string; lastName?: string } } | null) {
  const fromApple = [appleUser?.name?.firstName, appleUser?.name?.lastName].filter(Boolean).join(" ").trim();
  if (fromApple) return fromApple;
  if (claims.name?.trim()) return claims.name.trim();
  const fromParts = [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (claims.email) return claims.email.split("@")[0];
  return "Neues Konto";
}

async function handle(request: Request, provider: OAuthProvider): Promise<Response> {
  const base = await baseUrl();
  const config = providerConfig(provider);
  if (!config) return fail(base, "Dieser Anmeldeweg ist nicht eingerichtet.");

  let code: string | null;
  let state: string | null;
  let appleUser: { name?: { firstName?: string; lastName?: string } } | null = null;

  if (request.method === "POST") {
    const form = await request.formData();
    code = form.get("code") ? String(form.get("code")) : null;
    state = form.get("state") ? String(form.get("state")) : null;
    const rawUser = form.get("user");
    if (rawUser) {
      try {
        appleUser = JSON.parse(String(rawUser));
      } catch {
        appleUser = null;
      }
    }
    if (form.get("error")) return fail(base, "Die Anmeldung wurde abgebrochen.");
  } else {
    const url = new URL(request.url);
    code = url.searchParams.get("code");
    state = url.searchParams.get("state");
    if (url.searchParams.get("error")) return fail(base, "Die Anmeldung wurde abgebrochen.");
  }

  const store = await cookies();
  const storedState = store.get("fairteilen_oauth_state")?.value;
  const nonce = store.get("fairteilen_oauth_nonce")?.value;
  const next = store.get("fairteilen_oauth_next")?.value ?? "/uebersicht";
  for (const name of ["fairteilen_oauth_state", "fairteilen_oauth_nonce", "fairteilen_oauth_next"]) {
    store.delete(name);
  }

  if (!code || !state || !storedState || !nonce) return fail(base, "Die Anmeldung ist abgelaufen. Bitte erneut versuchen.");
  if (storedState !== `${provider}:${state}`) return fail(base, "Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen.");

  let claims: IdTokenClaims;
  try {
    const tokens = await exchangeCode(config, code, redirectUri(provider, base));
    if (!tokens.id_token) throw new Error("Der Anbieter hat kein ID-Token geliefert.");
    claims = await verifyIdToken(config, tokens.id_token, nonce);
  } catch (error) {
    console.error("OAuth-Anmeldung fehlgeschlagen:", error);
    return fail(base, "Die Anmeldung konnte nicht abgeschlossen werden.");
  }

  const email = claims.email?.toLowerCase() ?? null;
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: claims.sub } },
  });

  let userId: string;
  if (existingAccount) {
    userId = existingAccount.userId;
    if (email && email !== existingAccount.email) {
      await prisma.oAuthAccount.update({ where: { id: existingAccount.id }, data: { email } });
    }
  } else {
    // Bestehendes Konto nur bei bestätigter Adresse automatisch verknüpfen.
    const linkable = email && isEmailVerified(claims) ? await prisma.user.findUnique({ where: { email } }) : null;

    if (linkable) {
      userId = linkable.id;
    } else {
      if (!registrationOpen()) return fail(base, "Die Registrierung ist auf dieser Instanz deaktiviert.");
      // Apple liefert die E-Mail nur bei der ersten Freigabe – zur Not eine
      // Platzhalteradresse, die im Konto geändert werden kann.
      const fallbackEmail = `${provider}-${claims.sub.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "")}@konto.fairteilen.local`;
      const finalEmail = email ?? fallbackEmail;
      const taken = await prisma.user.findUnique({ where: { email: finalEmail } });
      if (taken) {
        return fail(
          base,
          "Für diese E-Mail-Adresse gibt es bereits ein Konto mit Passwort. Melde dich damit an und verknüpfe danach in den Kontoeinstellungen.",
        );
      }
      const created = await prisma.user.create({
        data: {
          email: finalEmail,
          name: displayName(claims, appleUser),
          passwordHash: null,
          avatarColor: colorForId(finalEmail),
        },
      });
      userId = created.id;
    }

    await prisma.oAuthAccount.create({
      data: { userId, provider, providerAccountId: claims.sub, email },
    });
  }

  await createSession(userId);
  return Response.redirect(`${base}${next.startsWith("/") ? next : "/"}`, 302);
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new Response("Unbekannter Anbieter", { status: 404 });
  return handle(request, provider);
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new Response("Unbekannter Anbieter", { status: 404 });
  return handle(request, provider);
}

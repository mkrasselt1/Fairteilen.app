import { cookies } from "next/headers";
import { createSession } from "@/lib/auth";
import {
  exchangeCode,
  isOAuthProvider,
  providerConfig,
  redirectUri,
  verifyIdToken,
  type IdTokenClaims,
  type OAuthProvider,
} from "@/lib/oauth";
import { AccountError, resolveUserFromClaims } from "@/lib/oauth-account";
import { baseUrl } from "@/lib/url";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

function fail(base: string, message: string): Response {
  return Response.redirect(`${base}/anmelden?fehler=${encodeURIComponent(message)}`, 302);
}

async function handle(request: Request, provider: OAuthProvider): Promise<Response> {
  const base = await baseUrl();
  const config = providerConfig(provider);
  if (!config) return fail(base, (await getT())("Dieser Anmeldeweg ist nicht eingerichtet."));

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

  if (!code || !state || !storedState || !nonce) return fail(base, (await getT())("Die Anmeldung ist abgelaufen. Bitte erneut versuchen."));
  if (storedState !== `${provider}:${state}`) return fail(base, (await getT())("Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen."));

  let claims: IdTokenClaims;
  try {
    const tokens = await exchangeCode(config, code, redirectUri(provider, base));
    if (!tokens.id_token) throw new Error("Der Anbieter hat kein ID-Token geliefert.");
    claims = await verifyIdToken(config, tokens.id_token, nonce);
  } catch (error) {
    console.error("OAuth-Anmeldung fehlgeschlagen:", error);
    return fail(base, (await getT())("Die Anmeldung konnte nicht abgeschlossen werden."));
  }

  let userId: string;
  try {
    userId = await resolveUserFromClaims(provider, claims, appleUser?.name ?? null);
  } catch (error) {
    if (error instanceof AccountError) return fail(base, (await getT())(error.message));
    throw error;
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

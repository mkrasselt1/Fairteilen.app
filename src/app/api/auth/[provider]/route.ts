import { cookies } from "next/headers";
import crypto from "node:crypto";
import { authorizeUrl, isOAuthProvider, providerConfig, redirectUri } from "@/lib/oauth";
import { baseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

/** Startet die Anmeldung bei Google bzw. Apple. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new Response("Unbekannter Anbieter", { status: 404 });

  const config = providerConfig(provider);
  if (!config) {
    return new Response(`Die Anmeldung über ${provider} ist auf dieser Instanz nicht eingerichtet.`, { status: 501 });
  }

  const url = new URL(request.url);
  const nextParam = url.searchParams.get("next") ?? "/uebersicht";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  const state = crypto.randomBytes(24).toString("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");

  const store = await cookies();
  // Apple antwortet per `form_post` von einer fremden Domain – dabei werden
  // Lax-Cookies nicht mitgesendet, deshalb dort SameSite=None.
  const options = {
    httpOnly: true,
    secure: provider === "apple" || process.env.NODE_ENV === "production",
    sameSite: (provider === "apple" ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: 600,
  };
  store.set("fairteilen_oauth_state", `${provider}:${state}`, options);
  store.set("fairteilen_oauth_nonce", nonce, options);
  store.set("fairteilen_oauth_next", next, options);

  const callback = redirectUri(provider, await baseUrl());
  return Response.redirect(authorizeUrl(config, { redirectUri: callback, state, nonce }), 302);
}

import "server-only";
import crypto from "node:crypto";

/**
 * Anmeldung über Google und Apple – direkt gegen OpenID Connect,
 * ohne zusätzliche Abhängigkeiten.
 *
 * Benötigte Umgebungsvariablen:
 *   Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   Apple:  APPLE_CLIENT_ID (Services-ID), APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8)
 *   Beide:  APP_URL (öffentliche Basis-URL der Instanz)
 */

export const OAUTH_PROVIDERS = ["google", "apple"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export type ProviderConfig = {
  id: OAuthProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuers: string[];
  scope: string;
  clientId: string;
  /**
   * Weitere gültige Empfänger für Token aus nativen Apps. iOS und Android
   * bekommen bei Google eigene Kennungen, bei Apple ist es die Bundle-ID.
   */
  nativeAudiences: string[];
  /** Apple verlangt bei angefordertem Namen/E-Mail `form_post`. */
  responseMode?: "form_post";
};

function nativeAudiencesFrom(...values: (string | undefined)[]): string[] {
  return values.flatMap((value) => (value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : []));
}

export function googleConfig(): ProviderConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return null;
  return {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    scope: "openid email profile",
    clientId,
    nativeAudiences: nativeAudiencesFrom(process.env.GOOGLE_CLIENT_ID_IOS, process.env.GOOGLE_CLIENT_ID_ANDROID),
  };
}

export function appleConfig(): ProviderConfig | null {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
    return null;
  }
  return {
    id: "apple",
    label: "Apple",
    authorizeUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    jwksUrl: "https://appleid.apple.com/auth/keys",
    issuers: ["https://appleid.apple.com"],
    scope: "name email",
    clientId,
    nativeAudiences: nativeAudiencesFrom(process.env.APPLE_NATIVE_CLIENT_ID),
    responseMode: "form_post",
  };
}

export function providerConfig(provider: OAuthProvider): ProviderConfig | null {
  return provider === "google" ? googleConfig() : appleConfig();
}

/** Welche Anbieter auf dieser Instanz eingerichtet sind. */
export function configuredProviders(): { id: OAuthProvider; label: string }[] {
  return [googleConfig(), appleConfig()]
    .filter((config): config is ProviderConfig => config !== null)
    .map((config) => ({ id: config.id, label: config.label }));
}

export function redirectUri(provider: OAuthProvider, base: string): string {
  return `${base.replace(/\/$/, "")}/api/auth/${provider}/callback`;
}

export function authorizeUrl(
  config: ProviderConfig,
  options: { redirectUri: string; state: string; nonce: string },
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: config.scope,
    state: options.state,
    nonce: options.nonce,
  });
  if (config.responseMode) params.set("response_mode", config.responseMode);
  if (config.id === "google") {
    params.set("access_type", "online");
    params.set("prompt", "select_account");
  }
  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Apple erwartet als `client_secret` ein selbst signiertes ES256-Token,
 * das höchstens sechs Monate gültig sein darf.
 */
export function appleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 60,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.sign("sha256", Buffer.from(data), {
    key: crypto.createPrivateKey(privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${data}.${signature.toString("base64url")}`;
}

export type IdTokenClaims = {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export async function exchangeCode(
  config: ProviderConfig,
  code: string,
  callbackUrl: string,
): Promise<{ id_token?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
    client_id: config.clientId,
    client_secret: config.id === "apple" ? appleClientSecret() : process.env.GOOGLE_CLIENT_SECRET!,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Token-Austausch mit ${config.label} fehlgeschlagen (${response.status}).`);
  }
  return (await response.json()) as { id_token?: string };
}

type Jwk = { kid: string; kty: string; alg?: string; use?: string; n?: string; e?: string };
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

async function fetchJwks(url: string): Promise<Jwk[]> {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < 60 * 60 * 1000) return cached.keys;

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Signaturschlüssel konnten nicht geladen werden (${response.status}).`);
  const { keys } = (await response.json()) as { keys: Jwk[] };
  jwksCache.set(url, { keys, fetchedAt: Date.now() });
  return keys;
}

/** Prüft Signatur, Aussteller, Empfänger, Laufzeit und Nonce des ID-Tokens. */
export async function verifyIdToken(
  config: ProviderConfig,
  idToken: string,
  expectedNonce: string,
): Promise<IdTokenClaims> {
  const [headerPart, payloadPart, signaturePart] = idToken.split(".");
  if (!headerPart || !payloadPart || !signaturePart) throw new Error("Ungültiges ID-Token.");

  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString()) as { kid?: string; alg?: string };
  if (header.alg !== "RS256") throw new Error(`Nicht unterstützter Signaturalgorithmus: ${header.alg}`);

  const keys = await fetchJwks(config.jwksUrl);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Passender Signaturschlüssel nicht gefunden.");

  const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: "jwk" });
  const valid = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerPart}.${payloadPart}`),
    publicKey,
    Buffer.from(signaturePart, "base64url"),
  );
  if (!valid) throw new Error("Signatur des ID-Tokens ist ungültig.");

  const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as IdTokenClaims;
  if (!config.issuers.includes(claims.iss)) throw new Error("Unerwarteter Aussteller des ID-Tokens.");

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const accepted = [config.clientId, ...config.nativeAudiences];
  if (!audiences.some((audience) => accepted.includes(audience))) {
    throw new Error("ID-Token gehört zu einer anderen Anwendung.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) throw new Error("Das ID-Token ist abgelaufen.");
  if (claims.iat > now + 300) throw new Error("Das ID-Token liegt in der Zukunft.");

  // Beim nativen Verfahren von Apple steht im Token der SHA-256-Wert der Nonce,
  // bei Google die Nonce selbst. Beide Formen sind zulässig.
  const hashedNonce = crypto.createHash("sha256").update(expectedNonce).digest("hex");
  if (!claims.nonce || (claims.nonce !== expectedNonce && claims.nonce !== hashedNonce)) {
    throw new Error("Nonce stimmt nicht überein.");
  }

  return claims;
}

export function isEmailVerified(claims: IdTokenClaims): boolean {
  return claims.email_verified === true || claims.email_verified === "true";
}

/**
 * OAuth-Kern: ID-Token-Prüfung und Apple-Client-Secret.
 * Läuft mit `--conditions=react-server`, damit `server-only` importierbar ist.
 */
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  appleClientSecret,
  authorizeUrl,
  isOAuthProvider,
  verifyIdToken,
  type ProviderConfig,
} from "../src/lib/oauth.ts";

const CONFIG: ProviderConfig = {
  id: "google",
  label: "Google",
  authorizeUrl: "https://example.test/authorize",
  tokenUrl: "https://example.test/token",
  jwksUrl: "https://example.test/jwks",
  issuers: ["https://issuer.test"],
  scope: "openid email profile",
  clientId: "client-123",
  nativeAudiences: ["ios-client-456", "android-client-789"],
};

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };

function signIdToken(payload: Record<string, unknown>, kid = "test-key"): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode({ alg: "RS256", kid, typ: "JWT" })}.${encode(payload)}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(data), privateKey);
  return `${data}.${signature.toString("base64url")}`;
}

function withJwks<T>(run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ keys: [jwk] }), {
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

function claims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://issuer.test",
    aud: "client-123",
    sub: "user-1",
    iat: now,
    exp: now + 600,
    nonce: "nonce-abc",
    email: "person@example.test",
    email_verified: true,
    ...overrides,
  };
}

test("gültiges ID-Token wird akzeptiert", async () => {
  await withJwks(async () => {
    const verified = await verifyIdToken(CONFIG, signIdToken(claims()), "nonce-abc");
    assert.equal(verified.sub, "user-1");
    assert.equal(verified.email, "person@example.test");
  });
});

test("manipuliertes Token wird abgelehnt", async () => {
  await withJwks(async () => {
    const token = signIdToken(claims());
    const [header, payload, signature] = token.split(".");
    const tampered = Buffer.from(JSON.stringify(claims({ sub: "angreifer" }))).toString("base64url");
    await assert.rejects(
      () => verifyIdToken(CONFIG, `${header}.${tampered}.${signature}`, "nonce-abc"),
      /Signatur/,
    );
    assert.ok(payload.length > 0);
  });
});

test("falsche Nonce, falscher Aussteller, falscher Empfänger und Ablauf werden erkannt", async () => {
  await withJwks(async () => {
    await assert.rejects(() => verifyIdToken(CONFIG, signIdToken(claims()), "andere-nonce"), /Nonce/);
    await assert.rejects(
      () => verifyIdToken(CONFIG, signIdToken(claims({ iss: "https://boese.test" })), "nonce-abc"),
      /Aussteller/,
    );
    await assert.rejects(
      () => verifyIdToken(CONFIG, signIdToken(claims({ aud: "andere-app" })), "nonce-abc"),
      /anderen Anwendung/,
    );
    await assert.rejects(
      () => verifyIdToken(CONFIG, signIdToken(claims({ exp: Math.floor(Date.now() / 1000) - 10 })), "nonce-abc"),
      /abgelaufen/,
    );
    await assert.rejects(
      () => verifyIdToken(CONFIG, signIdToken(claims(), "unbekannt"), "nonce-abc"),
      /Signaturschlüssel/,
    );
  });
});

test("Token aus der nativen App werden anerkannt", async () => {
  await withJwks(async () => {
    for (const audience of ["ios-client-456", "android-client-789"]) {
      const verified = await verifyIdToken(CONFIG, signIdToken(claims({ aud: audience })), "nonce-abc");
      assert.equal(verified.sub, "user-1");
    }
    // Eine fremde Kennung bleibt abgelehnt.
    await assert.rejects(
      () => verifyIdToken(CONFIG, signIdToken(claims({ aud: "fremde-app" })), "nonce-abc"),
      /anderen Anwendung/,
    );
  });
});

test("Apple schickt die Nonce als SHA-256-Wert", async () => {
  await withJwks(async () => {
    const hashed = crypto.createHash("sha256").update("nonce-abc").digest("hex");
    const verified = await verifyIdToken(CONFIG, signIdToken(claims({ nonce: hashed })), "nonce-abc");
    assert.equal(verified.sub, "user-1");

    // Ein fremder Hashwert passt weiterhin nicht.
    const wrong = crypto.createHash("sha256").update("andere-nonce").digest("hex");
    await assert.rejects(
      () => verifyIdToken(CONFIG, signIdToken(claims({ nonce: wrong })), "nonce-abc"),
      /Nonce/,
    );
  });
});

test("Autorisierungs-URL enthält alle Pflichtparameter", () => {
  const url = new URL(
    authorizeUrl(CONFIG, {
      redirectUri: "https://app.test/api/auth/google/callback",
      state: "state-1",
      nonce: "nonce-1",
    }),
  );
  assert.equal(url.searchParams.get("client_id"), "client-123");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.equal(url.searchParams.get("nonce"), "nonce-1");
  assert.equal(url.searchParams.get("redirect_uri"), "https://app.test/api/auth/google/callback");
});

test("Apple-Client-Secret ist ein gültig signiertes ES256-Token", () => {
  const { publicKey: ecPublic, privateKey: ecPrivate } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  process.env.APPLE_TEAM_ID = "TEAM123";
  process.env.APPLE_KEY_ID = "KEY123";
  process.env.APPLE_CLIENT_ID = "app.fairteilen.web";
  process.env.APPLE_PRIVATE_KEY = ecPrivate.export({ type: "pkcs8", format: "pem" }).toString();

  const secret = appleClientSecret();
  const [header, payload, signature] = secret.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), {
    alg: "ES256",
    kid: "KEY123",
    typ: "JWT",
  });
  const body = JSON.parse(Buffer.from(payload, "base64url").toString());
  assert.equal(body.iss, "TEAM123");
  assert.equal(body.sub, "app.fairteilen.web");
  assert.equal(body.aud, "https://appleid.apple.com");
  assert.ok(
    crypto.verify("sha256", Buffer.from(`${header}.${payload}`), { key: ecPublic, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url")),
  );
});

test("nur bekannte Anbieter werden akzeptiert", () => {
  assert.ok(isOAuthProvider("google"));
  assert.ok(isOAuthProvider("apple"));
  assert.ok(!isOAuthProvider("facebook"));
});

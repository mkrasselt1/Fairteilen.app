import crypto from "node:crypto";

/** Zufälliger, URL-sicherer Einladungscode. */
export function newInviteToken(): string {
  return crypto.randomBytes(12).toString("base64url");
}

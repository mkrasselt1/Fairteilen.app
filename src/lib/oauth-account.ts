import "server-only";
import { prisma } from "./db";
import { registrationOpen } from "./auth";
import { colorForId } from "./format";
import { isEmailVerified, type IdTokenClaims, type OAuthProvider } from "./oauth";

/**
 * Ordnet ein geprüftes ID-Token einem Konto zu – gemeinsam genutzt vom
 * Anmeldeweg über den Browser und dem für die native App.
 */
export class AccountError extends Error {}

export function displayNameFromClaims(
  claims: IdTokenClaims,
  fallbackName?: { firstName?: string; lastName?: string } | null,
): string {
  const fromApp = [fallbackName?.firstName, fallbackName?.lastName].filter(Boolean).join(" ").trim();
  if (fromApp) return fromApp;
  if (claims.name?.trim()) return claims.name.trim();
  const fromParts = [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (claims.email) return claims.email.split("@")[0];
  return "Neues Konto";
}

export async function resolveUserFromClaims(
  provider: OAuthProvider,
  claims: IdTokenClaims,
  nameHint?: { firstName?: string; lastName?: string } | null,
): Promise<string> {
  const email = claims.email?.toLowerCase() ?? null;

  const existing = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: claims.sub } },
  });
  if (existing) {
    if (email && email !== existing.email) {
      await prisma.oAuthAccount.update({ where: { id: existing.id }, data: { email } });
    }
    return existing.userId;
  }

  // Ein bestehendes Konto nur bei bestätigter Adresse automatisch verknüpfen.
  const linkable =
    email && isEmailVerified(claims)
      ? await prisma.user.findFirst({ where: { email, isGuest: false } })
      : null;

  let userId: string;
  if (linkable) {
    userId = linkable.id;
  } else {
    if (!registrationOpen()) throw new AccountError("Die Registrierung ist auf dieser Instanz deaktiviert.");

    // Apple liefert die Adresse nur bei der ersten Freigabe – notfalls eine
    // Platzhalteradresse, die sich im Konto ändern lässt.
    const fallbackEmail = `${provider}-${claims.sub.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "")}@konto.fairteilen.local`;
    const finalEmail = email ?? fallbackEmail;

    if (await prisma.user.findFirst({ where: { email: finalEmail } })) {
      throw new AccountError(
        "Für diese E-Mail-Adresse gibt es bereits ein Konto mit Passwort. Melde dich damit an und verknüpfe danach in den Kontoeinstellungen.",
      );
    }

    const created = await prisma.user.create({
      data: {
        email: finalEmail,
        name: displayNameFromClaims(claims, nameHint),
        passwordHash: null,
        avatarColor: colorForId(finalEmail),
      },
    });
    userId = created.id;
  }

  await prisma.oAuthAccount.create({ data: { userId, provider, providerAccountId: claims.sub, email } });
  return userId;
}

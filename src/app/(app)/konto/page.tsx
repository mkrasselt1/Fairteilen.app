import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui";
import { OAuthButtons } from "@/components/oauth-buttons";
import { configuredProviders } from "@/lib/oauth";
import { ChangePasswordForm, DeleteAccountForm, PaymentDetailsForm, ProfileForm, UnlinkForm } from "./forms";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Konto") };
}
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const [groupCount, expenseCount, account] = await Promise.all([
    prisma.groupMember.count({ where: { userId: user.id } }),
    prisma.expenseShare.count({ where: { userId: user.id, expense: { deletedAt: null } } }),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        passwordHash: true,
        iban: true,
        weroContact: true,
        paypalEmail: true,
        paymentNote: true,
        oauthAccounts: { select: { id: true, provider: true, email: true } },
      },
    }),
  ]);

  const hasPassword = account.passwordHash !== null;
  const linked = new Set(account.oauthAccounts.map((a) => a.provider));
  const available = configuredProviders();
  const providerLabel = (id: string) => (id === "apple" ? "Apple" : "Google");
  const t = await getT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar user={user} size={56} />
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="hint">
            {user.email} ·{" "}
            {groupCount === 1
              ? t("{anzahl} Gruppe", { anzahl: groupCount })
              : t("{anzahl} Gruppen", { anzahl: groupCount })}{" "}
            ·{" "}
            {expenseCount === 1
              ? t("{anzahl} Eintrag", { anzahl: expenseCount })
              : t("{anzahl} Einträge", { anzahl: expenseCount })}
          </p>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">{t("Profil")}</h2>
        <ProfileForm user={user} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">{t("Zahlungsangaben")}</h2>
        <p className="hint mb-4">
          {t(
            "Damit andere wissen, wohin sie überweisen sollen. Die Angaben sehen nur Personen, mit denen du etwas teilst – und sie werden ausschließlich angezeigt, es läuft keine Zahlung über Fairteilen.",
          )}
        </p>
        <PaymentDetailsForm
          details={{
            iban: account.iban,
            weroContact: account.weroContact,
            paypalEmail: account.paypalEmail,
            paymentNote: account.paymentNote,
          }}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">{hasPassword ? t("Passwort ändern") : t("Passwort setzen")}</h2>
        {!hasPassword && (
          <p className="hint mb-4">
            {t(
              "Dein Konto nutzt bisher nur die Anmeldung über einen externen Anbieter. Mit einem Passwort kannst du dich zusätzlich direkt anmelden – lass das Feld „Aktuelles Passwort“ dafür einfach leer.",
            )}
          </p>
        )}
        <ChangePasswordForm hasPassword={hasPassword} />
      </section>

      {available.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">{t("Anmeldung über Google & Apple")}</h2>
          <p className="hint mb-4">{t("Verknüpfte Konten können sich ohne Passwort anmelden.")}</p>

          {account.oauthAccounts.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100 dark:divide-slate-800">
              {account.oauthAccounts.map((oauth) => (
                <li key={oauth.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{providerLabel(oauth.provider)}</span>
                    {oauth.email && <span className="hint block truncate">{oauth.email}</span>}
                  </span>
                  <UnlinkForm provider={oauth.provider} label={providerLabel(oauth.provider)} />
                </li>
              ))}
            </ul>
          )}

          {available.some((provider) => !linked.has(provider.id)) && (
            <OAuthButtons next="/konto" intent="link" />
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">{t("Daten")}</h2>
        <p className="hint mb-3">{t("Du kannst jederzeit alle deine Ausgaben als CSV-Datei herunterladen.")}</p>
        <Link href="/export" className="btn-secondary">
          {t("Zum Export")}
        </Link>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold text-rose-600 dark:text-rose-400">{t("Konto löschen")}</h2>
        <p className="hint mb-3">
          {t(
            "Das Konto kann nur gelöscht werden, wenn alle Salden ausgeglichen sind. Alle Daten werden dabei unwiderruflich entfernt.",
          )}
        </p>
        <DeleteAccountForm hasPassword={hasPassword} />
      </section>
    </div>
  );
}

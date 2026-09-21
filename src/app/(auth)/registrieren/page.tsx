import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, registrationOpen } from "@/lib/auth";
import { OAuthButtons } from "@/components/oauth-buttons";
import { RegisterForm } from "./register-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Registrieren") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/uebersicht");
  const { next } = await searchParams;
  const t = await getT();

  if (!registrationOpen()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("Registrierung geschlossen")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("Auf dieser Instanz können nur eingeladene Personen ein Konto anlegen.")}
        </p>
        <Link href="/anmelden" className="btn-secondary">
          {t("Zur Anmeldung")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Konto erstellen")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("Kostenlos und in einer Minute eingerichtet.")}
        </p>
      </div>
      <RegisterForm next={next ?? "/uebersicht"} />
      <OAuthButtons next={next ?? "/uebersicht"} />
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {t("Schon ein Konto?")}{" "}
        <Link href="/anmelden" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          {t("Anmelden")}
        </Link>
      </p>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {t("Oder")}{" "}
        <Link href="/rechner" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          {t("ohne Konto weiterrechnen")}
        </Link>
        .
      </p>
    </div>
  );
}

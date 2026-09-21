import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, registrationOpen } from "@/lib/auth";
import { OAuthButtons } from "@/components/oauth-buttons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fehler?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/uebersicht");
  const { next, fehler } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="lg:hidden">
        <p className="flex items-center gap-2 text-xl font-bold text-brand-600 dark:text-brand-400">
          <span aria-hidden>🤝</span> Fairteilen
        </p>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Willkommen zurück</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Melde dich an, um deine Gruppen und Salden zu sehen.
        </p>
      </div>
      {fehler && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {fehler}
        </p>
      )}
      <LoginForm next={next ?? "/uebersicht"} />
      <OAuthButtons next={next ?? "/uebersicht"} />
      {registrationOpen() && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Kostenlos registrieren
          </Link>
        </p>
      )}

      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
        <p className="text-sm font-medium">Du brauchst gar kein Konto</p>
        <p className="hint mt-1">
          Gemeinsam abrechnen geht über einen Link, allein nachrechnen direkt im Browser.
        </p>
        <div className="mt-3 grid gap-2">
          <Link href="/gemeinsam/start" className="btn-secondary w-full">
            Gemeinsame Abrechnung anlegen
          </Link>
          <Link href="/rechner" className="btn-ghost w-full">
            Allein ausrechnen
          </Link>
        </div>
      </div>
    </div>
  );
}

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
  if (user) redirect("/");
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
      <LoginForm next={next ?? "/"} />
      <OAuthButtons next={next ?? "/"} />
      {registrationOpen() && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Kostenlos registrieren
          </Link>
        </p>
      )}

      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
        <p className="text-sm font-medium">Nur schnell etwas ausrechnen?</p>
        <p className="hint mt-1">
          Der Rechner funktioniert ganz ohne Konto – alle Daten bleiben in deinem Browser.
        </p>
        <Link href="/rechner" className="btn-secondary mt-3 w-full">
          Ohne Anmeldung aufteilen
        </Link>
      </div>
    </div>
  );
}

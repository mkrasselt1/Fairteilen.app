import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, registrationOpen } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  if (!registrationOpen()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Registrierung geschlossen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Auf dieser Instanz können nur eingeladene Personen ein Konto anlegen.
        </p>
        <Link href="/anmelden" className="btn-secondary">
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Konto erstellen</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kostenlos und in einer Minute eingerichtet.
        </p>
      </div>
      <RegisterForm next={next ?? "/"} />
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Schon ein Konto?{" "}
        <Link href="/anmelden" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Anmelden
        </Link>
      </p>
    </div>
  );
}

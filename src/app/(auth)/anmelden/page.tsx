import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, registrationOpen } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

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
      <LoginForm next={next ?? "/"} />
      {registrationOpen() && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Kostenlos registrieren
          </Link>
        </p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { GuestCalculator } from "./calculator";

export const metadata: Metadata = {
  title: "Rechner ohne Anmeldung",
  description:
    "Gemeinsame Ausgaben sofort aufteilen – ohne Konto, ohne Anmeldung. Alle Daten bleiben in deinem Browser.",
};

export default async function CalculatorPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={user ? "/" : "/rechner"} className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
            <span aria-hidden className="text-xl">🤝</span> Fairteilen
          </Link>
          <span className="chip hidden sm:inline-flex">ohne Anmeldung</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <Link href="/" className="btn-secondary !px-3 !py-1.5">
                Zu meinen Gruppen
              </Link>
            ) : (
              <Link href="/anmelden" className="btn-secondary !px-3 !py-1.5">
                Anmelden
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Schnell-Abrechnung</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Personen und Ausgaben eintragen – Fairteilen rechnet aus, wer wem wie viel schuldet. Es wird kein Konto
            benötigt und nichts an einen Server gesendet: Alle Daten bleiben ausschließlich in diesem Browser.
          </p>
        </div>

        <GuestCalculator />

        {!user && (
          <section className="card p-5">
            <h2 className="font-semibold">Mehr Möglichkeiten mit einem Konto</h2>
            <p className="hint mt-1">
              Mit einem kostenlosen Konto könnt ihr dauerhaft gemeinsam abrechnen: mehrere Gruppen, Einladungslinks,
              Zahlungen erfassen, Kommentare, wiederkehrende Ausgaben und ein Verlauf für alle Beteiligten.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/registrieren" className="btn-primary">
                Kostenloses Konto erstellen
              </Link>
              <Link href="/anmelden" className="btn-secondary">
                Anmelden
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

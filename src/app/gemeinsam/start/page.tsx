import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { NewBoardForm } from "./new-board-form";

export const metadata: Metadata = {
  title: "Gemeinsame Abrechnung starten",
  description:
    "Ausgaben zu mehreren abrechnen – ohne Konto. Link teilen, alle tragen ein, Fairteilen rechnet aus, wer wem was schuldet.",
  alternates: { canonical: "/gemeinsam/start" },
};

export const dynamic = "force-dynamic";

export default async function StartBoardPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
            <span aria-hidden className="text-xl">🤝</span> Fairteilen
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <Link href="/uebersicht" className="btn-secondary !px-3 !py-1.5">
                Meine Gruppen
              </Link>
            ) : (
              <Link href="/anmelden" className="btn-ghost !px-3 !py-1.5">
                Anmelden
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Gemeinsam abrechnen</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Du bekommst einen Link. Alle, die ihn haben, tragen ihre Ausgaben ein und sehen sofort, wer
            wem was schuldet. {user ? "Die Abrechnung erscheint zusätzlich in deinen Gruppen." : "Ein Konto braucht dafür niemand."}
          </p>
        </div>

        <div className="card p-5">
          <NewBoardForm defaultCurrency={user?.currency ?? "EUR"} ownName={user?.name ?? ""} />
        </div>

        <p className="hint">
          Wer den Link hat, kann mitlesen und mitschreiben – teile ihn also nur mit den Beteiligten.
        </p>
      </main>
    </div>
  );
}

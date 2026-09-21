import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { GuestCalculator } from "./calculator";
import { LanguageSwitch } from "@/components/language-switch";
import { getI18n, getT } from "@/lib/i18n-server";

const KEYWORDS: Record<string, string[]> = {
  de: ["Rechnung teilen", "Kosten aufteilen Rechner", "Ausgaben aufteilen ohne Anmeldung", "wer schuldet wem"],
  en: ["split the bill", "expense split calculator", "split expenses without sign-up", "who owes whom"],
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t("Rechner ohne Anmeldung"),
    description: t(
      "Gemeinsame Ausgaben sofort aufteilen – ohne Konto, ohne Anmeldung. Rechnung durch mehrere Personen teilen, Salden sehen und wissen, wer wem wie viel schuldet. Alle Daten bleiben in deinem Browser.",
    ),
    alternates: { canonical: "/rechner" },
    keywords: KEYWORDS[locale],
  };
}

export default async function CalculatorPage() {
  const user = await getCurrentUser();
  const t = await getT();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={user ? "/uebersicht" : "/"} className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
            <span aria-hidden className="text-xl">🤝</span> Fairteilen
          </Link>
          <span className="chip hidden sm:inline-flex">{t("ohne Anmeldung")}</span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle />
            {user ? (
              <Link href="/uebersicht" className="btn-secondary !px-3 !py-1.5">
                {t("Zu meinen Gruppen")}
              </Link>
            ) : (
              <Link href="/anmelden" className="btn-secondary !px-3 !py-1.5">
                {t("Anmelden")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">{t("Schnell-Abrechnung")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "Personen und Ausgaben eintragen – Fairteilen rechnet aus, wer wem wie viel schuldet. Es wird kein Konto benötigt und nichts an einen Server gesendet: Alle Daten bleiben ausschließlich in diesem Browser.",
            )}
          </p>
        </div>

        <GuestCalculator />

        {!user && (
          <section className="card p-5">
            <h2 className="font-semibold">{t("Sollen die anderen mitmachen?")}</h2>
            <p className="hint mt-1">
              {t(
                "Diese Seite rechnet nur für dich – die Eingaben bleiben auf diesem Gerät. Wenn alle Beteiligten selbst eintragen sollen, leg eine gemeinsame Abrechnung an und teile den Link. Auch dafür braucht niemand ein Konto.",
              )}
            </p>
            <div className="mt-3">
              <Link href="/gemeinsam/start" className="btn-primary">
                {t("Gemeinsame Abrechnung anlegen")}
              </Link>
            </div>
            <p className="hint mt-4">
              {t("Wer regelmäßig abrechnet, kann sich ein")}{" "}
              <Link href="/registrieren" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                {t("Konto anlegen")}
              </Link>
              . {t("Für alles oben ist das nicht nötig.")}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

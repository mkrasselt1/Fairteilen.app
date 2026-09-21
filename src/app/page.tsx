import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitch } from "@/components/language-switch";
import { getI18n } from "@/lib/i18n-server";
import {
  LANDING_FAQ as FAQ,
  LANDING_FEATURES as FEATURES,
  LANDING_STEPS as STEPS,
} from "@/lib/texte";

const TITLE = "Fairteilen – Ausgaben fair teilen, kostenlos und ohne Konto";
const DESCRIPTION =
  "Gemeinsame Ausgaben teilen für WG, Reise, Paar und Projekt: Wer hat was bezahlt, wer schuldet wem wie viel? Kostenlos, werbefrei, quelloffen – und der Rechner läuft sogar ganz ohne Anmeldung.";

const KEYWORDS: Record<string, string[]> = {
  de: [
    "Ausgaben teilen",
    "Kosten teilen",
    "WG-Kasse",
    "Urlaubskasse",
    "Reisekosten abrechnen",
    "Rechnung aufteilen",
    "wer schuldet wem",
    "Gruppenausgaben",
    "Haushaltskasse",
    "Kostenteiler",
  ],
  en: [
    "split expenses",
    "share costs",
    "flatshare expenses",
    "holiday expenses",
    "split the bill",
    "who owes whom",
    "group expenses",
    "shared household budget",
    "expense splitter",
    "open source expense sharing",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t(TITLE),
    description: t(DESCRIPTION),
    alternates: { canonical: "/" },
    keywords: KEYWORDS[locale],
  };
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/uebersicht");

  const { locale, t } = await getI18n();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Fairteilen",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description: t(DESCRIPTION),
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      license: "https://opensource.org/licenses/MIT",
      inLanguage: locale,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: t(item.q),
        acceptedAnswer: { "@type": "Answer", text: t(item.a) },
      })),
    },
  ];

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
            <span aria-hidden className="text-xl">🤝</span> Fairteilen
          </span>
          <nav className="ml-auto flex items-center gap-1">
            <Link href="/rechner" className="btn-ghost !px-3 !py-1.5">
              {t("Rechner")}
            </Link>
            <LanguageSwitch />
            <ThemeToggle />
            <Link
              href="/anmelden"
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t("Anmelden")}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {t("Gemeinsame Ausgaben,")}
            <br />
            <span className="text-brand-600 dark:text-brand-400">{t("fair geteilt.")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            {t(
              "Wer hat was bezahlt, wer schuldet wem wie viel? Fairteilen rechnet es für WG, Reise, Paar oder Projekt aus – kostenlos, ohne Werbung und ohne Abo.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/gemeinsam/start" className="btn-primary !px-6 !py-3 !text-base">
              {t("Gemeinsam abrechnen")}
            </Link>
            <Link href="/rechner" className="btn-secondary !px-6 !py-3 !text-base">
              {t("Allein ausrechnen")}
            </Link>
          </div>
          <p className="hint mt-4">{t("Ohne Konto, ohne E-Mail-Adresse, ohne Kosten.")}</p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
            <Link
              href="/gemeinsam/start"
              className="card p-5 transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
            >
              <p className="text-2xl" aria-hidden>
                🔗
              </p>
              <h2 className="mt-2 font-semibold">{t("Zu mehreren, per Link")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t(
                  "Abrechnung anlegen, Link in die Gruppe schicken. Alle tragen ein, alle sehen den Stand. Niemand muss sich anmelden.",
                )}
              </p>
            </Link>
            <Link
              href="/rechner"
              className="card p-5 transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
            >
              <p className="text-2xl" aria-hidden>
                🧮
              </p>
              <h2 className="mt-2 font-semibold">{t("Allein, im Browser")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t(
                  "Schnell nachrechnen, wer wem was schuldet. Die Daten bleiben auf deinem Gerät und gehen nirgendwo hin.",
                )}
              </p>
            </Link>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold">{t("Was Fairteilen kann")}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title}>
                  <div className="text-2xl" aria-hidden>
                    {feature.icon}
                  </div>
                  <h3 className="mt-2 font-semibold">{t(feature.title)}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(feature.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold">{t("In vier Schritten abgerechnet")}</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-2 font-semibold">{t(step.title)}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(step.text)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-bold">{t("Häufige Fragen")}</h2>
            <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
              {FAQ.map((item) => (
                <details key={item.q} className="py-4">
                  <summary className="cursor-pointer font-medium">{t(item.q)}</summary>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t(item.a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold">{t("Gleich ausprobieren")}</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            {t("Eine Abrechnung ist in zwanzig Sekunden angelegt – der Link geht danach einfach in die Gruppe.")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/gemeinsam/start" className="btn-primary !px-6 !py-3 !text-base">
              {t("Abrechnung anlegen")}
            </Link>
          </div>
          <p className="hint mx-auto mt-6 max-w-xl">
            {t("Wer regelmäßig mit denselben Leuten abrechnet, kann sich ein")}{" "}
            <Link href="/registrieren" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              {t("kostenloses Konto")}
            </Link>{" "}
            {t("anlegen: Dann liegen alle Abrechnungen an einem Ort, auf jedem Gerät. Nötig ist es für nichts davon.")}
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500 dark:text-slate-400">
          <p>
            <span aria-hidden>🤝</span> {t("Fairteilen – freie Software unter MIT-Lizenz")}
          </p>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/rechner" className="hover:underline">
              {t("Rechner")}
            </Link>
            <Link href="/anmelden" className="hover:underline">
              {t("Anmelden")}
            </Link>
            <Link href="/registrieren" className="hover:underline">
              {t("Registrieren")}
            </Link>
            <a
              href="https://github.com/mkrasselt1/Fairteilen.app"
              className="hover:underline"
              rel="noopener"
            >
              {t("Quelltext")}
            </a>
            <LanguageSwitch />
          </nav>
        </div>
      </footer>
    </div>
  );
}

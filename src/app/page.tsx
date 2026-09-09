import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Fairteilen – Ausgaben fair teilen, kostenlos und ohne Konto",
  description:
    "Gemeinsame Ausgaben teilen für WG, Reise, Paar und Projekt: Wer hat was bezahlt, wer schuldet wem wie viel? Kostenlos, werbefrei, quelloffen – und der Rechner läuft sogar ganz ohne Anmeldung.",
  alternates: { canonical: "/" },
  keywords: [
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
};

const FEATURES = [
  {
    icon: "👥",
    title: "Gruppen für alles",
    text: "WG, Reise, Paar, Veranstaltung oder Projekt. Andere kommen per Einladungslink dazu und sehen sofort denselben Stand.",
  },
  {
    icon: "🧮",
    title: "Fünf Arten zu teilen",
    text: "Gleichmäßig, nach exakten Beträgen, prozentual, nach Anteilen oder mit Zu- und Abschlägen. Mit Schiebereglern und Live-Rückmeldung.",
  },
  {
    icon: "💸",
    title: "Wenige Überweisungen",
    text: "Fairteilen fasst alle Schulden zusammen, sodass am Ende möglichst wenige Zahlungen nötig sind.",
  },
  {
    icon: "🌍",
    title: "Beliebige Währungen",
    text: "18 Währungen, getrennt geführt. Auch mehrere Zahlende pro Ausgabe sind kein Problem.",
  },
  {
    icon: "🔁",
    title: "Wiederkehrende Kosten",
    text: "Miete, Strom oder Abos werden automatisch immer wieder eingetragen – täglich bis jährlich.",
  },
  {
    icon: "📦",
    title: "Archiv statt Chaos",
    text: "Abgeschlossene Abrechnungen wandern ins Archiv und bleiben trotzdem vollständig nachvollziehbar.",
  },
];

const STEPS = [
  { title: "Gruppe anlegen", text: "Gib der Abrechnung einen Namen – etwa „Skiurlaub“ oder „WG Hauptstraße“." },
  { title: "Andere einladen", text: "Einladungslink teilen. Wer draufklickt, ist in Sekunden dabei." },
  { title: "Ausgaben eintragen", text: "Wer hat bezahlt, wer war beteiligt? Der Rest passiert automatisch." },
  { title: "Begleichen", text: "Am Ende sagt Fairteilen genau, wer wem wie viel überweisen muss." },
];

const FAQ = [
  {
    q: "Kostet Fairteilen etwas?",
    a: "Nein. Fairteilen ist kostenlos, werbefrei und ohne Begrenzung nutzbar. Der Quelltext steht unter der MIT-Lizenz frei zur Verfügung, jede und jeder darf die App auch selbst betreiben.",
  },
  {
    q: "Brauche ich ein Konto?",
    a: "Nur wenn du dauerhaft mit anderen abrechnen möchtest. Für eine schnelle Aufteilung genügt der Rechner: Er läuft vollständig im Browser, ohne Anmeldung und ohne dass Daten an einen Server gehen.",
  },
  {
    q: "Können mehrere Personen gemeinsam abrechnen?",
    a: "Ja. In einer Gruppe sehen alle Mitglieder dieselben Ausgaben und Salden, können Einträge anlegen, bearbeiten und kommentieren. Ein Verlauf zeigt, wer was geändert hat.",
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: "Es werden nur Name, E-Mail-Adresse und die eingetragenen Ausgaben gespeichert. Kein Tracking, keine Werbung, keine Weitergabe an Dritte. Wer möchte, betreibt Fairteilen auf dem eigenen Server.",
  },
  {
    q: "Wie werden Restcents behandelt?",
    a: "Es wird ausschließlich mit ganzen Cent gerechnet. Bleibt bei einer Teilung ein Cent übrig, wird er nachvollziehbar zugeteilt – die Summe der Anteile ergibt immer exakt den Gesamtbetrag.",
  },
  {
    q: "Kann ich in mehreren Währungen abrechnen?",
    a: "Ja. Salden werden je Währung getrennt geführt und nicht automatisch umgerechnet, damit schwankende Wechselkurse alte Abrechnungen nicht verändern.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/uebersicht");

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Fairteilen",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description: metadata.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      license: "https://opensource.org/licenses/MIT",
      inLanguage: "de",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
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
              Rechner
            </Link>
            <ThemeToggle />
            <Link href="/anmelden" className="btn-secondary !px-3 !py-1.5">
              Anmelden
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Gemeinsame Ausgaben,
            <br />
            <span className="text-brand-600 dark:text-brand-400">fair geteilt.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Wer hat was bezahlt, wer schuldet wem wie viel? Fairteilen rechnet es für WG, Reise, Paar oder Projekt
            aus – kostenlos, ohne Werbung und ohne Abo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/rechner" className="btn-primary !px-6 !py-3 !text-base">
              Ohne Anmeldung ausrechnen
            </Link>
            <Link href="/registrieren" className="btn-secondary !px-6 !py-3 !text-base">
              Kostenloses Konto erstellen
            </Link>
          </div>
          <p className="hint mt-4">Keine Kreditkarte, keine Testphase, keine Begrenzung.</p>
        </section>

        <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold">Was Fairteilen kann</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title}>
                  <div className="text-2xl" aria-hidden>
                    {feature.icon}
                  </div>
                  <h3 className="mt-2 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold">In vier Schritten abgerechnet</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-bold">Häufige Fragen</h2>
            <div className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
              {FAQ.map((item) => (
                <details key={item.q} className="py-4">
                  <summary className="cursor-pointer font-medium">{item.q}</summary>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold">Gleich ausprobieren</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Der Rechner braucht kein Konto – und wenn ihr dauerhaft gemeinsam abrechnen wollt, ist die Anmeldung in
            einer Minute erledigt.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/rechner" className="btn-primary !px-6 !py-3 !text-base">
              Zum Rechner
            </Link>
            <Link href="/registrieren" className="btn-secondary !px-6 !py-3 !text-base">
              Konto erstellen
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500 dark:text-slate-400">
          <p>
            <span aria-hidden>🤝</span> Fairteilen – freie Software unter MIT-Lizenz
          </p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/rechner" className="hover:underline">
              Rechner
            </Link>
            <Link href="/anmelden" className="hover:underline">
              Anmelden
            </Link>
            <Link href="/registrieren" className="hover:underline">
              Registrieren
            </Link>
            <a
              href="https://github.com/mkrasselt1/Fairteilen.app"
              className="hover:underline"
              rel="noopener"
            >
              Quelltext
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

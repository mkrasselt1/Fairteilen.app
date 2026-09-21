import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-brand-600 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span aria-hidden className="text-2xl">🤝</span> Fairteilen
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Gemeinsame Ausgaben,
            <br />
            fair geteilt.
          </h1>
          <p className="text-brand-50">
            Ein Konto ist freiwillig – es bündelt nur alle Abrechnungen an einem Ort und auf jedem
            Gerät. Gemeinsam abrechnen geht auch ganz ohne.
          </p>
          <ul className="space-y-3 text-brand-50">
            {[
              "Gruppen für WG, Reise, Paar oder Projekt",
              "Gleich, exakt, prozentual, nach Anteilen oder mit Zu- und Abschlägen aufteilen",
              "Mehrere Zahlende pro Ausgabe und beliebige Währungen",
              "Schulden automatisch vereinfachen und mit einem Klick begleichen",
              "Wiederkehrende Ausgaben, Kommentare, Aktivitätsverlauf, CSV-Export",
              "Kostenlos, quelloffen und selbst hostbar – keine Werbung, kein Abo",
              "Gemeinsam abrechnen über einen Link – ganz ohne Konto",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-100">
          Freie Software unter MIT-Lizenz. Deine Daten bleiben auf deiner Instanz.
        </p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </div>
  );
}

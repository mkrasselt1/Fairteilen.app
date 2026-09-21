import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/lib/i18n-server";
import { AUTH_BULLETS } from "@/lib/texte";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-brand-600 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span aria-hidden className="text-2xl">🤝</span> Fairteilen
        </Link>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            {t("Gemeinsame Ausgaben,")}
            <br />
            {t("fair geteilt.")}
          </h1>
          <p className="text-brand-50">
            {t(
              "Ein Konto ist freiwillig – es bündelt nur alle Abrechnungen an einem Ort und auf jedem Gerät. Gemeinsam abrechnen geht auch ganz ohne.",
            )}
          </p>
          <ul className="space-y-3 text-brand-50">
            {AUTH_BULLETS.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden>✓</span>
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-100">
          {t("Freie Software unter MIT-Lizenz. Deine Daten bleiben auf deiner Instanz.")}
        </p>
      </section>
      <section className="flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-full max-w-sm">{children}</div>
        <LanguageSwitch />
      </section>
    </div>
  );
}

import Link from "next/link";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const t = await getT();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden>
        🤷
      </p>
      <h1 className="text-2xl font-bold">{t("Seite nicht gefunden")}</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t("Diese Seite gibt es nicht – oder du hast keinen Zugriff darauf.")}
      </p>
      <Link href="/" className="btn-primary">
        {t("Zur Startseite")}
      </Link>
    </div>
  );
}

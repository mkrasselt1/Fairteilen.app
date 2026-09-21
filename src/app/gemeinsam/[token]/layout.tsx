import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/lib/i18n-server";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
            <span aria-hidden className="text-xl">🤝</span> Fairteilen
          </Link>
          <span className="chip hidden sm:inline-flex">{t("geteilte Abrechnung")}</span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

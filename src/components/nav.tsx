"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./ui";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/actions/auth";
import { useT } from "@/components/i18n";
import { LanguageSwitch } from "@/components/language-switch";
import { NAV_LINKS as LINKS } from "@/lib/texte";

function isActive(pathname: string, href: string): boolean {
  return href === "/uebersicht" ? pathname === "/uebersicht" : pathname.startsWith(href);
}

export function TopBar({ user }: { user: { id: string; name: string; email: string; avatarColor: string } }) {
  const t = useT();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/uebersicht" className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400">
          <span aria-hidden className="text-xl">🤝</span>
          <span>Fairteilen</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive(pathname, link.href)
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/ausgaben/neu" className="btn-primary hidden !px-3 !py-1.5 sm:inline-flex">
            {t("+ Ausgabe")}
          </Link>
          <ThemeToggle />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("Kontomenü")}
            >
              <Avatar user={user} size={32} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <Link
                    href="/konto"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {t("Konto & Einstellungen")}
                  </Link>
                  <Link
                    href="/export"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {t("Daten exportieren")}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-slate-100 dark:text-rose-400 dark:hover:bg-slate-800"
                    >
                      {t("Abmelden")}
                    </button>
                  </form>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("Sprache")}</span>
                    <LanguageSwitch />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive(pathname, link.href)
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <span aria-hidden className="text-lg">
              {link.icon}
            </span>
            {t(link.label)}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function FloatingAddButton() {
  const t = useT();
  const pathname = usePathname();
  // Im Ausgabenformular selbst wäre der Knopf überflüssig und würde auf schmalen
  // Bildschirmen die Eingabefelder überdecken.
  if (pathname.startsWith("/ausgaben/neu") || pathname.endsWith("/bearbeiten") || pathname.startsWith("/begleichen")) {
    return null;
  }

  return (
    <Link
      href="/ausgaben/neu"
      className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-3xl font-light text-white shadow-lg transition hover:bg-brand-600 sm:hidden"
      aria-label={t("Ausgabe hinzufügen")}
    >
      +
    </Link>
  );
}

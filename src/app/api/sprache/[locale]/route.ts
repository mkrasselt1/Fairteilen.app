import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Sprache bewusst festlegen: /api/sprache/en?zurueck=/uebersicht
 *
 * Bewusst ein einfacher Verweis, damit die Umschaltung auch ohne JavaScript
 * funktioniert. Das Ziel wird auf einen Pfad der eigenen Anwendung begrenzt,
 * damit der Verweis nicht zum Weiterleiten auf fremde Adressen taugt.
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Unbekannte Sprache", { status: 404 });

  const wanted = new URL(request.url).searchParams.get("zurueck") ?? "/";
  const target = /^\/(?!\/)/.test(wanted) ? wanted : "/";

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return new Response(null, { status: 303, headers: { Location: target } });
}

import type { MetadataRoute } from "next";
import { getI18n } from "@/lib/i18n-server";

/**
 * Das Web-App-Manifest wird in der Sprache der Anfrage ausgeliefert – wer die
 * App auf Englisch installiert, bekommt auch einen englischen Namen auf dem
 * Startbildschirm.
 */
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale, t } = await getI18n();

  return {
    name: t("Fairteilen – Ausgaben fair teilen"),
    short_name: "Fairteilen",
    description: t("Gemeinsame Ausgaben erfassen, Salden berechnen und Schulden einfach ausgleichen."),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2f9e6f",
    lang: locale,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

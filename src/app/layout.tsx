import type { Metadata, Viewport } from "next";
import { themeScript } from "@/components/theme-toggle";
import { LocaleProvider } from "@/components/i18n";
import { getI18n } from "@/lib/i18n-server";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const title = t("Fairteilen – Ausgaben fair teilen");
  const description = t(
    "Gemeinsame Ausgaben teilen für WG, Reise, Paar und Projekt: Wer hat was bezahlt, wer schuldet wem wie viel? Kostenlos, werbefrei und quelloffen – der Rechner läuft sogar ganz ohne Anmeldung.",
  );

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: "%s · Fairteilen" },
    description,
    applicationName: "Fairteilen",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Fairteilen", statusBarStyle: "default" },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon.svg" }],
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "de_DE",
      siteName: "Fairteilen",
      title,
      description,
      url: "/",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getI18n()).locale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}

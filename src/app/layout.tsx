import type { Metadata, Viewport } from "next";
import { themeScript } from "@/components/theme-toggle";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const description =
  "Gemeinsame Ausgaben teilen für WG, Reise, Paar und Projekt: Wer hat was bezahlt, wer schuldet wem wie viel? Kostenlos, werbefrei und quelloffen – der Rechner läuft sogar ganz ohne Anmeldung.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Fairteilen – Ausgaben fair teilen", template: "%s · Fairteilen" },
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
    locale: "de_DE",
    siteName: "Fairteilen",
    title: "Fairteilen – Ausgaben fair teilen",
    description,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Fairteilen – Ausgaben fair teilen" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fairteilen – Ausgaben fair teilen",
    description,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

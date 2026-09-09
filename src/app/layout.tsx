import type { Metadata, Viewport } from "next";
import { themeScript } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fairteilen – Ausgaben fair teilen", template: "%s · Fairteilen" },
  description:
    "Fairteilen ist eine freie, quelloffene App, um gemeinsame Ausgaben in Gruppen zu erfassen, Salden zu berechnen und Schulden einfach auszugleichen.",
  applicationName: "Fairteilen",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Fairteilen", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
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

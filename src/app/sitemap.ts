import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Zur Laufzeit erzeugen, damit APP_URL auch dann greift, wenn beim Bauen
// noch keine öffentliche Adresse bekannt war.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/rechner`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/registrieren`, lastModified, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/anmelden`, lastModified, changeFrequency: "yearly", priority: 0.4 },
  ];
}

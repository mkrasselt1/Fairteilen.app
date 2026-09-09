import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Zur Laufzeit erzeugen, damit APP_URL auch dann greift, wenn beim Bauen
// noch keine öffentliche Adresse bekannt war.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/rechner", "/anmelden", "/registrieren"],
        // Persönliche Bereiche gehören nicht in den Index.
        disallow: ["/uebersicht", "/gruppen", "/freunde", "/ausgaben", "/konto", "/aktivitaet", "/begleichen", "/export", "/beitreten", "/api"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

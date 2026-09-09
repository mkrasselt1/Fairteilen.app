/**
 * Öffentliche Adresse der Instanz – für Sitemap, robots.txt und die
 * absoluten Links in den Vorschaubildern sozialer Netzwerke.
 */
export function siteUrl(): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

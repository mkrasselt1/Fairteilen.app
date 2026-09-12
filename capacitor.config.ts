import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Einstellungen für die App-Hüllen von iOS und Android (Capacitor).
 *
 * Fairteilen wird auf dem Server gerendert. Die App zeigt deshalb die laufende
 * Instanz an, statt eine Kopie der Oberfläche mitzuliefern – so sind App und
 * Web immer auf demselben Stand und Aktualisierungen brauchen kein App-Update.
 *
 * Vor dem Bauen die eigene Adresse setzen:
 *   APP_URL=https://fairteilen.app npm run app:sync
 *
 * Anleitung: docs/apps.md
 */
const serverUrl = process.env.APP_URL ?? "https://fairteilen.app";

const config: CapacitorConfig = {
  appId: "app.fairteilen",
  appName: "Fairteilen",
  // Wird nur angezeigt, wenn der Server nicht erreichbar ist.
  webDir: "native/www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    // Nur die eigene Instanz darf in der App geöffnet werden; alles andere
    // landet im Systembrowser.
    allowNavigation: [new URL(serverUrl).host],
  },
  ios: {
    contentInset: "always",
  },
  android: {
    // Belege lassen sich sonst nicht aus der Kamera übernehmen.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
  },
};

export default config;

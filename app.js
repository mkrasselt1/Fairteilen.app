/**
 * Startdatei für Hosting-Umgebungen mit Phusion Passenger (z. B. Plesk).
 *
 * Die Umgebungsvariablen dürfen wahlweise in Plesk unter „Benutzerdefinierte
 * Umgebungsvariablen“ oder in einer Datei .env im Anwendungsstamm stehen.
 * Ist beides vorhanden, gewinnt der Wert aus Plesk.
 *
 * Plesk-Einstellungen:
 *   Anwendungsstamm      /httpdocs
 *   Dokumentenstamm      /httpdocs/public
 *   Anwendungsstartdatei app.js
 *   Anwendungsmodus      production
 *
 * Vor dem ersten Start einmalig ausführen (Reiter „Node.js-Befehle ausführen“):
 *   npm install --production=false
 *   npm run db:push
 *   npm run build
 *
 * Bei einer eigenen VM oder Docker wird diese Datei nicht gebraucht –
 * dort genügt `npm start`.
 */
const { createServer } = require("node:http");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const next = require("next");

/**
 * Werte aus einer .env-Datei im Anwendungsstamm übernehmen.
 * Bereits gesetzte Variablen bleiben unangetastet – in Plesk hinterlegte
 * Umgebungsvariablen haben also immer Vorrang vor der Datei.
 */
function loadEnvFile(file) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return; // Keine .env vorhanden – dann zählen nur echte Umgebungsvariablen.
  }
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, ".env"));

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error("Fehler bei der Anfrage:", error);
        res.statusCode = 500;
        res.end("Interner Serverfehler");
      });
    }).listen(port, () => {
      console.log(`Fairteilen läuft auf Port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Start fehlgeschlagen:", error);
    process.exit(1);
  });

/**
 * Startdatei für Hosting-Umgebungen mit Phusion Passenger (z. B. Plesk).
 *
 * Plesk-Einstellungen:
 *   Anwendungsstamm      /httpdocs
 *   Dokumentenstamm      /httpdocs/public
 *   Anwendungsstartdatei app.js
 *   Anwendungsmodus      production
 *
 * Vor dem ersten Start einmalig ausführen (Reiter „Node.js-Befehle ausführen“):
 *   npm install --production=false
 *   npx prisma db push
 *   npm run build
 *
 * Bei einer eigenen VM oder Docker wird diese Datei nicht gebraucht –
 * dort genügt `npm start`.
 */
const { createServer } = require("node:http");
const next = require("next");

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

# Fairteilen auf Plesk betreiben

Plesk startet Node.js-Anwendungen über Phusion Passenger. Dafür liegt im Projekt die
Startdatei [`app.js`](../app.js) bereit.

## 1. Dateien auf den Server bringen

Über Git (Plesk → *Git*) oder per SFTP nach `/httpdocs`. Nach jedem Update gilt:
`npm install` → `npm run build` → *App neu starten*.

## 2. Einstellungen unter „Node.js“

| Feld | Wert |
|---|---|
| **Node.js-Version** | 20 oder 22 (mindestens 18.18) |
| **Package Manager** | npm |
| **Anwendungsstamm** | `/httpdocs` |
| **Dokumentenstamm** | `/httpdocs/public` |
| **Anwendungsmodus** | `production` |
| **Anwendungsstartdatei** | `app.js` |

> Der Dokumentenstamm muss auf `public` zeigen, nicht auf `/httpdocs`. Sonst würde Passenger
> Dateien wie `package.json`, `.env` oder die Datenbank direkt ausliefern. Alle übrigen Pfade
> beantwortet die Anwendung selbst.

## 3. Umgebungsvariablen

Unter *Benutzerdefinierte Umgebungsvariablen* → **[angeben]**:

| Name | Wert |
|---|---|
| `DATABASE_URL` | `file:/var/www/vhosts/fairteilen.app/private/fairteilen.db` |
| `AUTH_SECRET` | langer Zufallswert, z. B. aus `openssl rand -base64 48` |
| `APP_URL` | `https://fairteilen.app` |
| `NODE_ENV` | `production` |

Das Verzeichnis `private/` liegt bewusst **außerhalb** von `httpdocs`, damit die
Datenbankdatei nicht über das Web erreichbar ist. Einmalig anlegen (Plesk → *Dateien* oder SSH):

```bash
mkdir -p /var/www/vhosts/fairteilen.app/private
```

Wer lieber PostgreSQL nutzt (in Plesk unter *Datenbanken* anlegbar):

```bash
npm run use:postgres
# DATABASE_URL=postgresql://benutzer:passwort@localhost:5432/fairteilen
npx prisma db push
```

Optional für die Anmeldung mit Google bzw. Apple – dieselben Variablen wie in
[`.env.example`](../.env.example): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`.

## 4. Einmalig aufbauen

Reiter **Node.js-Befehle ausführen** (oder per SSH in `/httpdocs`), in dieser Reihenfolge:

```bash
npm install --production=false
npx prisma db push
npm run build
```

`--production=false` ist nötig, weil der Anwendungsmodus `production` sonst die
Entwicklungsabhängigkeiten überspringt – und ohne TypeScript und Tailwind schlägt der Build fehl.

Danach **App neu starten**.

## 5. HTTPS

Unter *SSL/TLS-Zertifikate* ein Let's-Encrypt-Zertifikat ausstellen und „Dauerhafte
Weiterleitung von HTTP zu HTTPS“ aktivieren. Das ist Pflicht, sobald die Anmeldung mit
Apple genutzt wird, und sorgt dafür, dass die Sitzungs-Cookies als `Secure` gesetzt werden.

## Häufige Fehler

| Meldung | Ursache |
|---|---|
| *Die Datei app.js ist nicht vorhanden* | Der Code liegt noch nicht in `/httpdocs` oder der Anwendungsstamm zeigt woanders hin |
| `Could not find a production build` | `npm run build` wurde noch nicht ausgeführt |
| `Cannot find module 'typescript'` | `npm install` lief ohne `--production=false` |
| `PrismaClientInitializationError` | `DATABASE_URL` fehlt, oder `npx prisma db push` wurde nicht ausgeführt |
| Seite lädt ohne Gestaltung | Der Dokumentenstamm zeigt auf ein falsches Verzeichnis |

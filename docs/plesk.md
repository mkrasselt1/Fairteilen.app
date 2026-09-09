# Fairteilen auf Plesk betreiben

Plesk startet Node.js-Anwendungen über Phusion Passenger. Dafür liegt im Projekt die
Startdatei [`app.js`](../app.js) bereit. Als Datenbank wird die in Plesk ohnehin vorhandene
**MySQL- bzw. MariaDB**-Instanz genutzt.

---

## 1. Datenbank anlegen

Plesk → **Datenbanken** → *Datenbank hinzufügen*:

| Feld | Wert |
|---|---|
| Datenbankname | `fairteilen` |
| Zugehöriges Abonnement | Fairteilen.app |
| Datenbankbenutzer | z. B. `fairteilen` mit eigenem Passwort |

Die Zeichenkodierung sollte **utf8mb4** sein, damit Umlaute und Emoji sicher gespeichert
werden. Falls Plesk etwas anderes vorgibt, im Reiter *phpMyAdmin* bzw. per SSH nachziehen:

```sql
ALTER DATABASE fairteilen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 2. Dateien auf den Server bringen

Über Plesk → *Git* (Branch `claude/splitwise-clone-a3w70z` bzw. später `main`) oder per SFTP
nach `/httpdocs`. Nach jedem Update gilt: `npm install` → `npm run build` → *App neu starten*.

---

## 3. Einstellungen unter „Node.js“

| Feld | Wert |
|---|---|
| **Node.js-Version** | 20 oder 22 (mindestens 18.18) |
| **Package Manager** | npm |
| **Anwendungsstamm** | `/httpdocs` |
| **Dokumentenstamm** | `/httpdocs/public` |
| **Anwendungsmodus** | `production` |
| **Anwendungsstartdatei** | `app.js` |

> Der Dokumentenstamm muss auf `public` zeigen, nicht auf `/httpdocs`. Sonst würde Passenger
> Dateien wie `package.json` oder `.env` direkt ausliefern. Alle übrigen Pfade beantwortet die
> Anwendung selbst.

---

## 4. Umgebungsvariablen

Es gibt zwei Wege – **einer davon genügt**. Sind Werte an beiden Stellen hinterlegt, gewinnt der
aus Plesk.

Diese Werte werden gebraucht:

| Name | Wert |
|---|---|
| `DATABASE_URL` | `mysql://fairteilen:PASSWORT@localhost:3306/fairteilen` |
| `AUTH_SECRET` | langer Zufallswert, z. B. aus `openssl rand -base64 48` |
| `APP_URL` | `https://fairteilen.app` |
| `NODE_ENV` | `production` |

### Weg A: Datei `.env` im Anwendungsstamm — empfohlen

Eine Datei `/httpdocs/.env` anlegen (Plesk → *Dateien*, oder per SSH `nano /httpdocs/.env`):

```
DATABASE_URL="mysql://fairteilen:PASSWORT@localhost:3306/fairteilen"
AUTH_SECRET="hier-den-zufallswert-einsetzen"
APP_URL="https://fairteilen.app"
NODE_ENV="production"
```

Vorteile: Die Werte stehen auch den Befehlen aus dem Reiter *Node.js-Befehle ausführen* zur
Verfügung – `npx prisma db push` braucht `DATABASE_URL`. Außerdem lassen sich lange Werte wie der
Apple-Schlüssel bequem einfügen. Da der Dokumentenstamm auf `public` zeigt, ist die Datei nicht
über das Web abrufbar.

### Weg B: Plesk-Oberfläche

*Websites & Domains* → **Node.js** → ganz unten **Benutzerdefinierte Umgebungsvariablen** →
**[angeben]** → je Zeile Name und Wert eintragen → *OK* → **App neu starten**.

Zu beachten: Zeilenumbrüche sind in diesem Dialog nicht möglich. Für `APPLE_PRIVATE_KEY` deshalb
die Umbrüche als `\n` schreiben (die Anwendung setzt sie beim Start zurück) – oder gleich Weg A
nutzen. Ob Plesk diese Variablen auch an den Reiter *Node.js-Befehle ausführen* weitergibt,
unterscheidet sich je nach Version; für `npx prisma db push` ist Weg A daher verlässlicher.

### Hinweise zu den Werten

Enthält das Datenbankpasswort Sonderzeichen wie `@`, `:`, `/` oder `#`, müssen diese in der URL
prozentkodiert werden (`@` → `%40`, `#` → `%23`). Am einfachsten ist ein Passwort aus
Buchstaben und Ziffern.

`AUTH_SECRET` muss dauerhaft gleich bleiben – ändert er sich, werden alle Anmeldungen ungültig.

Optional für die Anmeldung mit Google bzw. Apple – dieselben Variablen wie in
[`.env.example`](../.env.example): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`.

---

## 5. Einmalig aufbauen

Reiter **Node.js-Befehle ausführen** (oder per SSH in `/httpdocs`), in dieser Reihenfolge:

```bash
npm install --production=false
npx prisma db push
npm run build
```

`--production=false` ist nötig, weil der Anwendungsmodus `production` sonst die
Entwicklungsabhängigkeiten überspringt – und ohne TypeScript und Tailwind schlägt der Build fehl.

Danach **App neu starten**.

---

## 6. HTTPS

Unter *SSL/TLS-Zertifikate* ein Let's-Encrypt-Zertifikat ausstellen und „Dauerhafte
Weiterleitung von HTTP zu HTTPS“ aktivieren. Das ist Pflicht, sobald die Anmeldung mit
Apple genutzt wird, und sorgt dafür, dass die Sitzungs-Cookies als `Secure` gesetzt werden.

---

## Fehlersuche

### „We're sorry, but something went wrong.“ (Passenger)

Diese Seite bedeutet: Passenger konnte die Anwendung nicht starten. Die eigentliche Ursache
steht immer im Log – **zuerst dort nachsehen**:

- Plesk → *Websites & Domains* → **Logs** → `error_log`
- oder per SSH: `tail -50 /var/www/vhosts/fairteilen.app/logs/error_log`
- die auf der Fehlerseite angezeigte *Error ID* hilft beim Suchen im Log

Die häufigsten Ursachen, in dieser Reihenfolge:

| Meldung im Log | Ursache | Lösung |
|---|---|---|
| `Cannot find module '/httpdocs/app.js'` | Die Startdatei fehlt – der Code auf dem Server ist älter als das Repository | Aktuellen Stand ziehen (`app.js` liegt im Projektstamm) |
| `Could not find a production build in the '.next' directory` | `npm run build` wurde nie ausgeführt | Build ausführen, dann App neu starten |
| `Cannot find module 'next'` | `npm install` fehlt oder lief im falschen Verzeichnis | `npm install --production=false` im Anwendungsstamm |
| `Cannot find module 'typescript'` / `tailwindcss` | `npm install` lief ohne `--production=false` | erneut mit dem Schalter ausführen |
| `@prisma/client did not initialize yet` | `prisma generate` fehlt | `npm install` erneut (läuft dort automatisch mit) oder `npx prisma generate` |
| `Table 'fairteilen.User' doesn't exist` | Die Tabellen wurden nicht angelegt | `npx prisma db push` |
| `Access denied for user` / `Unknown database` | `DATABASE_URL` stimmt nicht | Zugangsdaten prüfen, Sonderzeichen prozentkodieren |
| `Environment variable not found: DATABASE_URL` | Die Variable ist weder in `.env` noch in Plesk hinterlegt | siehe Abschnitt 4 |
| `Error validating datasource db: the URL must start with mysql://` | Es ist noch ein anderer Provider gesetzt | `npm run use:mysql`, dann `npx prisma db push` |
| `The engine-mode of the Prisma Client` / Fehler beim Start | Node-Version zu alt | Node 20 oder 22 wählen und neu starten |

Zum Prüfen ohne Weboberfläche lässt sich die Anwendung auch direkt starten – dann erscheint der
Fehler unmittelbar im Terminal:

```bash
cd /var/www/vhosts/fairteilen.app/httpdocs
node app.js
```

### Seite lädt, aber ohne Gestaltung
Der Dokumentenstamm zeigt auf ein falsches Verzeichnis – er muss `/httpdocs/public` sein.

### Anmeldung schlägt fehl, obwohl das Passwort stimmt
`AUTH_SECRET` fehlt oder ändert sich bei jedem Start. Einen festen Wert setzen; alle bestehenden
Sitzungen werden dadurch einmalig ungültig.

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

Über Plesk → *Git* oder per SFTP nach `/httpdocs`.

> **Den richtigen Branch eintragen.** In Plesk unter *Git* steht der verfolgte Branch. Zeigt er auf
> einen Branch, den es auf GitHub nicht mehr gibt, holt Plesk stillschweigend nichts mehr – die
> Seite bleibt dann auf einem alten Stand stehen, ohne dass ein Fehler erscheint. Aktuell ist
> `claude/fairteilen-app` (später `main`).

Nach jedem Update gilt: **NPM install** → Skript **`setup`** → **App neu starten**. Ohne den
Neustart liefert Passenger weiter den alten Build aus.

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
| `UPLOAD_DIR` | `/var/www/vhosts/fairteilen.app/private/belege` |
| `NODE_ENV` | `production` |

### Weg A: Datei `.env` im Anwendungsstamm — empfohlen

Eine Datei `/httpdocs/.env` anlegen (Plesk → *Dateien*, oder per SSH `nano /httpdocs/.env`):

```
DATABASE_URL="mysql://fairteilen:PASSWORT@localhost:3306/fairteilen"
AUTH_SECRET="hier-den-zufallswert-einsetzen"
APP_URL="https://fairteilen.app"
UPLOAD_DIR="/var/www/vhosts/fairteilen.app/private/belege"
NODE_ENV="production"
```

Vorteile: Die Werte stehen auch den npm-Skripten zur Verfügung, die über die Plesk-Oberfläche
gestartet werden – `setup` bzw. `db:push` brauchen `DATABASE_URL`. Außerdem lassen sich lange
Werte wie der Apple-Schlüssel bequem einfügen. Da der Dokumentenstamm auf `public` zeigt, ist
die Datei nicht über das Web abrufbar.

### Weg B: Plesk-Oberfläche

*Websites & Domains* → **Node.js** → ganz unten **Benutzerdefinierte Umgebungsvariablen** →
**[angeben]** → je Zeile Name und Wert eintragen → *OK* → **App neu starten**.

Zu beachten: Zeilenumbrüche sind in diesem Dialog nicht möglich. Für `APPLE_PRIVATE_KEY` deshalb
die Umbrüche als `\n` schreiben (die Anwendung setzt sie beim Start zurück) – oder gleich Weg A
nutzen. Ob Plesk diese Variablen auch an die über die Oberfläche gestarteten npm-Skripte
weitergibt, unterscheidet sich je nach Version; für `setup` und `db:push` ist Weg A deshalb der
verlässlichere Weg.

### Belege

Hochgeladene Belege sind Dateien, keine Datenbankinhalte. `UPLOAD_DIR` sollte deshalb **außerhalb
von `httpdocs`** liegen – sonst kann eine neue Bereitstellung sie mit wegräumen, und ohne den
Umweg über die Anwendung wären sie unter Umständen direkt abrufbar. Verzeichnis einmalig anlegen:

```bash
mkdir -p /var/www/vhosts/fairteilen.app/private/belege
```

Für Sicherungen gilt: Datenbank **und** dieses Verzeichnis zusammen sichern – einzeln ergeben sie
kein vollständiges Bild.

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

### Wenn Plesk über Git bereitstellt

Unter *Git* → **Zusätzliche Bereitstellungsaktionen** genau **eine** Zeile eintragen:

```sh
sh ./scripts/plesk-deploy.sh
```

> **Wichtig:** Plesk führt die Zeilen dieses Feldes unabhängig voneinander aus. Ein `export PATH=…`
> oder `cd …` in einer Zeile wirkt deshalb **nicht** auf die nächste – daran scheitern die üblichen
> mehrzeiligen Anleitungen. `plesk-deploy.sh` erledigt alles in einem Aufruf: Es wechselt selbst ins
> Projektverzeichnis, sucht ein Node, das zur C-Bibliothek des Servers passt und mindestens
> Version 18 hat, und führt damit `npm install` und `npm run setup` aus. Node-Installationen, die
> eine zu neue C-Bibliothek verlangen, überspringt es mit einem Hinweis, statt daran zu scheitern.

Danach in Plesk noch **App neu starten**.

### Ohne Git – zwei Klicks auf der Node.js-Seite

1. **NPM install** (das Paket-Symbol neben *App neu starten*)
2. **NPM-Skript ausführen** (das ▷-Symbol) → Skript **`setup`** auswählen
3. **App neu starten**

`setup` erledigt in einem Durchgang: Prisma-Client erzeugen, Tabellen anlegen und die
Anwendung bauen.

Wer lieber einzeln vorgeht, findet dieselben Schritte als eigene Skripte:

| Skript | Entspricht |
|---|---|
| `db:generate` | Prisma-Client erzeugen |
| `db:push` | Tabellen in der Datenbank anlegen bzw. abgleichen |
| `build` | Anwendung bauen |
| `db:seed` | Beispieldaten einspielen (optional) |

> Alle nötigen Befehle sind bewusst als npm-Skripte hinterlegt, damit sie über die
> Plesk-Oberfläche laufen. `npx` wird nirgends gebraucht.

### Warum kein `--production=false` nötig ist

Der Anwendungsmodus `production` würde `npm install` normalerweise dazu bringen, die
Entwicklungsabhängigkeiten wegzulassen – ohne TypeScript, Tailwind und die Prisma-CLI schlägt
der Build dann fehl. Die Datei [`.npmrc`](../.npmrc) im Projekt setzt deshalb `include=dev`,
sodass der Knopf *NPM install* in Plesk ohne Zusatzangaben das Richtige tut.

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
| `Cannot find module 'next'` | `npm install` fehlt oder lief im falschen Verzeichnis | *NPM install* im Anwendungsstamm ausführen |
| `Cannot find module 'typescript'` / `tailwindcss` | Die Entwicklungsabhängigkeiten fehlen | Prüfen, ob `.npmrc` mit `include=dev` auf dem Server liegt, dann *NPM install* wiederholen |
| `@prisma/client did not initialize yet` | `prisma generate` fehlt | Skript `db:generate` ausführen |
| `Table 'fairteilen.User' doesn't exist` | Die Tabellen wurden nicht angelegt | Skript `db:push` ausführen |
| „Die Datenbank konnte nicht automatisch angeglichen werden“ | Eine neue eindeutige Spalte kam hinzu | Einmalig Skript `db:push:force` ausführen, danach `setup` |
| `Access denied for user` / `Unknown database` | `DATABASE_URL` stimmt nicht | Zugangsdaten prüfen, Sonderzeichen prozentkodieren |
| `Environment variable not found: DATABASE_URL` | Die Variable ist weder in `.env` noch in Plesk hinterlegt | siehe Abschnitt 4 |
| `Error validating datasource db: the URL must start with mysql://` | Es ist noch ein anderer Provider gesetzt | `npm run use:mysql`, dann `npm run db:push` |
| `The engine-mode of the Prisma Client` / Fehler beim Start | Node-Version zu alt | Node 20 oder 22 wählen und neu starten |

Zum Prüfen ohne Weboberfläche lässt sich die Anwendung auch direkt starten – dann erscheint der
Fehler unmittelbar im Terminal:

```bash
cd /var/www/vhosts/fairteilen.app/httpdocs
node app.js
```

### `GLIBC_2.38 not found` bei den Bereitstellungsaktionen

Vollständig lautet die Meldung etwa:

```
-: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found (required by -)
```

**Die Ursache liegt nicht in Fairteilen.** Die höchste C-Bibliothek, die das Projekt und alle seine
Abhängigkeiten verlangen, ist `GLIBC_2.28` (aus dem Jahr 2018) – nachprüfbar mit den unten
genannten Werkzeugen. Wer `GLIBC_2.36` oder `2.38` fordert, ist ein anderes Programm in der Shell,
in der Plesk die Bereitstellungsaktionen ausführt – meist ein Node aus einer Fremdinstallation
(nvm, ein manuell entpacktes Archiv, ein Paket aus einem neueren Distributionszweig). Plesk kürzt
den Programmnamen in der Anzeige leider auf `-`.

#### Zuerst: unabhängig von den Projektdateien nachsehen

Liegt auf dem Server noch ein älterer Stand, sind die Prüfskripte des Projekts dort gar nicht
vorhanden. Diese Zeile braucht keine Datei aus dem Repository – als **einzige** Zeile in
*Zusätzliche Bereitstellungsaktionen* eintragen und das Ergebnis im selben Fenster ablesen:

```sh
{ echo "--- Ort ---"; pwd; git log --oneline -1 2>&1 | head -1; echo "--- System ---"; (getconf GNU_LIBC_VERSION 2>/dev/null || ldd --version 2>/dev/null | head -1); echo "--- PATH ---"; echo "$PATH" | tr ':' '\n'; echo "--- node/npm im Suchpfad ---"; echo "$PATH" | tr ':' '\n' | while read d; do for n in node npm; do [ -x "$d/$n" ] && echo "$d/$n braucht $(grep -ao 'GLIBC_[0-9][0-9.]*' "$d/$n" 2>/dev/null | sort -u -t_ -k2 -V | tail -1) und meldet $("$d/$n" --version 2>&1 | head -1)"; done; done; echo "--- Plesk-Node ---"; ls -d /opt/plesk/node/*/bin/node 2>/dev/null || echo "keins"; } 2>&1
```

Sie zeigt auf einen Blick:

- **welcher Stand** auf dem Server liegt (die Commit-Zeile – stimmt der Branch?),
- **welche glibc** das System hat,
- **jedes** gefundene `node` und `npm` mit der C-Bibliothek, die es verlangt.

Der Eintrag mit einer höheren Zahl als die Systemversion ist die Ursache.

#### Ursache finden, wenn der Code aktuell ist

Das Projekt bringt zwei Werkzeuge dafür mit:

```bash
sh scripts/pruefe-umgebung.sh   # reine Shell, funktioniert auch ohne lauffähiges Node
npm run doctor                  # ausführlicher, braucht ein startendes Node
```

`scripts/pruefe-umgebung.sh` lässt sich direkt als *Zusätzliche Bereitstellungsaktion* eintragen –
dann steht das Ergebnis im selben Fenster, in dem sonst der Fehler erscheint. Es zeigt die
Systemversion, den Suchpfad der Shell und für jedes gefundene `node`, `npm` und `npx`, welche
C-Bibliothek es braucht. Der Eintrag mit einer höheren Zahl als die Systemversion ganz oben ist
die Ursache.

#### Beheben

**Weg 0 – meistens schon die Lösung: alles in eine Zeile.**
Plesk führt die Zeilen der Bereitstellungsaktionen unabhängig voneinander aus. Ein `export PATH=…`
in Zeile 1 wirkt deshalb nicht auf Zeile 3 – die Fehlermeldung bleibt dann unverändert, obwohl der
Pfad scheinbar gesetzt wurde. Stattdessen genau eine Zeile eintragen:

```sh
sh ./scripts/plesk-deploy.sh
```

Das Skript setzt PATH innerhalb desselben Aufrufs und wählt selbst ein Node, das zur
C-Bibliothek des Servers passt.

**Weg 1 – empfohlen, wenn es einfach laufen soll: keine Bereitstellungsaktionen verwenden.**
Das Feld *Zusätzliche Bereitstellungsaktionen* leer lassen. Git bringt dann nur die Dateien auf den
Server; gebaut wird über die Node.js-Seite mit **NPM install** und dem Skript **`setup`**
(Abschnitt 5). Diese Knöpfe benutzen immer die in Plesk ausgewählte Node-Version und umgehen die
fremde Installation vollständig.

**Weg 2 – von Hand, alles in einer Zeile.**
Erst mit `sh scripts/pruefe-umgebung.sh` herausfinden, welche Node-Versionen tauglich sind, dann
genau diese mit vollem Pfad ansprechen. Der Pfad unten ist ein Beispiel und muss zur Ausgabe des
Prüfskripts passen – entscheidend ist, dass alles **ein** Befehl bleibt:

```sh
cd /var/www/vhosts/fairteilen.app/httpdocs && export PATH=/opt/plesk/node/22/bin:$PATH && node -v && npm install && npm run setup
```

### Die Startseite leitet noch zur Anmeldung

Dann läuft ein alter Stand. Der Reihe nach prüfen:

1. **Branch.** Plesk → *Git*: Verfolgt die Bereitstellung wirklich `claude/fairteilen-app`?
   Ein gelöschter Branch führt dazu, dass gar nichts mehr ankommt.
2. **Gebaut?** Nach dem Holen muss Skript **`setup`** laufen – ohne neuen Build liefert Next
   weiterhin die alten Seiten aus.
3. **Neu gestartet?** Zum Schluss **App neu starten**.

Zum Gegenprüfen: `git log --oneline -1` im Anwendungsstamm zeigt, welcher Stand tatsächlich
auf dem Server liegt.

### Seite lädt, aber ohne Gestaltung
Der Dokumentenstamm zeigt auf ein falsches Verzeichnis – er muss `/httpdocs/public` sein.

### Anmeldung schlägt fehl, obwohl das Passwort stimmt
`AUTH_SECRET` fehlt oder ändert sich bei jedem Start. Einen festen Wert setzen; alle bestehenden
Sitzungen werden dadurch einmalig ungültig.

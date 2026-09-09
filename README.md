# 🤝 Fairteilen.app

**Freie, quelloffene App zum Teilen gemeinsamer Ausgaben.** Für WG, Reise, Paar oder Projekt –
ohne Werbung, ohne Abo, ohne Limits und selbst hostbar. Wer nur schnell etwas ausrechnen will,
braucht nicht einmal ein Konto.

---

## Funktionsumfang

### Öffentlich
- Startseite `/` mit Funktionsüberblick, Ablauf und häufigen Fragen
- Rechner `/rechner`, siehe unten
- Vorbereitet für Suchmaschinen: Titel und Beschreibungen je Seite, strukturierte Daten,
  Vorschaubild, `robots.txt` und `sitemap.xml`; persönliche Bereiche stehen auf `noindex`.
  Wie es weitergeht, steht in [docs/sichtbarkeit.md](docs/sichtbarkeit.md)

### Ohne Anmeldung (`/rechner`)
- Personen und Ausgaben eintragen, Ergebnis sofort sehen
- Alle fünf Aufteilungsarten mit Schiebereglern und grafischer Rückmeldung
- Salden und minimaler Ausgleichsplan
- Ergebnis teilen (Web Share / Zwischenablage) und CSV-Download
- **Es wird nichts an den Server gesendet** – der Stand liegt allein im `localStorage` des Browsers

### Mit Konto
| Bereich | Details |
|---|---|
| **Gruppen** | Reise, WG, Paar, Veranstaltung, Projekt; Einladungslink, Mitgliederverwaltung, Gruppenwährung |
| **Ausgaben** | Beschreibung, Betrag, Datum, 26 Kategorien, Notizen, Kommentare |
| **Zahlende** | eine oder mehrere Personen pro Ausgabe |
| **Aufteilung** | gleich · exakte Beträge · Prozent · Anteile · Zu-/Abschläge |
| **Rückmeldung** | Balken über alle Beteiligten, Schieberegler je Person, Meldung „es fehlen noch …“ bzw. „… zu viel“; beim Wechsel der Aufteilungsart wird die bisherige Verteilung umgerechnet |
| **Salden** | pro Person, pro Gruppe und insgesamt – getrennt nach Währung |
| **Ausgleich** | optionale Schuldenvereinfachung (minimale Anzahl Überweisungen) |
| **Zahlungen** | „Begleichen“ erfasst echte Überweisungen und verrechnet sie |
| **Wiederkehrend** | täglich, wöchentlich, monatlich, jährlich – mit optionalem Enddatum |
| **Verlauf** | Aktivitätsfeed über alle Gruppen |
| **Export** | CSV je Gruppe oder für alles |
| **Konto** | Profil, Währung, Passwort, Google-/Apple-Verknüpfung, Löschung |
| **Oberfläche** | Deutsch, responsiv, helles und dunkles Design, als PWA installierbar |

### Anmeldung
- E-Mail und Passwort (scrypt-Hash, signiertes Sitzungs-Cookie in der Datenbank)
- Optional **Google** und **Apple** über OpenID Connect – direkt implementiert, ohne Fremd-Bibliothek,
  inklusive Prüfung von Signatur, Aussteller, Empfänger, Laufzeit, `state` und `nonce`
- Beides lässt sich mischen: ein über Google angelegtes Konto kann später ein Passwort setzen

---

## Schnellstart

```bash
git clone https://github.com/mkrasselt1/Fairteilen.app.git
cd Fairteilen.app
npm install
cp .env.example .env          # AUTH_SECRET setzen: openssl rand -base64 48
```

Datenbank anlegen (MySQL oder MariaDB) und in `DATABASE_URL` eintragen:

```sql
CREATE DATABASE fairteilen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fairteilen'@'localhost' IDENTIFIED BY 'passwort';
GRANT ALL PRIVILEGES ON fairteilen.* TO 'fairteilen'@'localhost';
```

```bash
npm run db:push               # legt die Tabellen an
npm run db:seed               # optional: Beispieldaten
npm run dev                   # http://localhost:3000
```

Ohne Datenbankserver arbeiten? `npm run use:sqlite`, `DATABASE_URL="file:./dev.db"`,
`npm run db:push` – dann läuft alles aus einer Datei.

Die Beispieldaten legen drei Konten an – Passwort jeweils `fairteilen`:
`alex@example.com`, `jamie@example.com`, `robin@example.com`.

---

## Betrieb

### Docker

```bash
echo "AUTH_SECRET=$(openssl rand -base64 48)" > .env
echo "APP_URL=https://fairteilen.example"    >> .env
docker compose up -d --build
```

Das Compose-Setup startet MariaDB gleich mit; die Daten liegen im Volume `fairteilen-db`.

### Andere Datenbank

Das Schema lässt sich mit einem Befehl umstellen – dabei werden auch die Datentypen der
langen Textfelder passend gesetzt:

```bash
npm run use:mysql       # MySQL / MariaDB (Standard)
npm run use:postgres    # PostgreSQL
npm run use:sqlite      # SQLite, ohne Datenbankserver
npm run db:push      # danach jeweils einmal ausführen
```

### Plesk / Phusion Passenger
Die Startdatei `app.js` liegt bei. Sie liest beim Start eine `.env` aus dem Anwendungsstamm,
wobei echte Umgebungsvariablen Vorrang behalten – die Werte können also wahlweise in der Datei
oder in der Plesk-Oberfläche stehen. Vollständige Anleitung: [docs/plesk.md](docs/plesk.md).

### Vercel, Railway, Fly.io & Co.
Ein normales Next.js-Projekt: Repository verbinden, `DATABASE_URL` (Postgres), `AUTH_SECRET` und
`APP_URL` setzen, fertig. `npm run build` erzeugt den Prisma-Client automatisch mit.

---

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `DATABASE_URL` | ja | `mysql://benutzer:passwort@host:3306/fairteilen` (bzw. `postgresql://…` / `file:./dev.db`) |
| `AUTH_SECRET` | ja | Signiert die Sitzungs-Cookies, mindestens 32 Zeichen |
| `APP_URL` | empfohlen | Öffentliche Basis-URL – für Einladungs- und OAuth-Links |
| `ALLOW_REGISTRATION` | nein | `false` schließt die Registrierung (Beitritt nur per Einladungslink) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | nein | aktiviert „Mit Google anmelden“ |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | nein | aktiviert „Mit Apple anmelden“ |

Sind die Werte eines Anbieters nicht gesetzt, erscheint dessen Knopf gar nicht erst.

### Google einrichten
1. Google Cloud Console → *APIs & Dienste* → *Anmeldedaten* → **OAuth-Client-ID** (Webanwendung)
2. Autorisierter Redirect-URI: `https://DEINE-DOMAIN/api/auth/google/callback`
3. `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET` setzen

### Apple einrichten
1. Apple Developer → **Services ID** anlegen (das ist `APPLE_CLIENT_ID`)
2. *Sign in with Apple* aktivieren, Return-URL `https://DEINE-DOMAIN/api/auth/apple/callback`
   (Apple erlaubt ausschließlich HTTPS und keine `localhost`-Adressen)
3. Unter *Keys* einen **Sign-in-with-Apple-Schlüssel** erzeugen, die `.p8`-Datei herunterladen
4. `APPLE_TEAM_ID`, `APPLE_KEY_ID` und den Dateiinhalt als `APPLE_PRIVATE_KEY` setzen
   (Zeilenumbrüche dürfen als `\n` geschrieben werden)

---

## Wie gerechnet wird

- **Ganzzahlige Cent.** Es werden nirgends Gleitkommazahlen für Geld verwendet.
- **Restcents nach größten Resten.** 10,00 € auf drei Personen ergibt 3,34 / 3,33 / 3,33 –
  die Summe der Anteile entspricht immer exakt dem Gesamtbetrag.
- **Je Ausgabe und Person** werden zwei Werte gespeichert: `paidCents` (tatsächlich bezahlt) und
  `oweCents` (rechnerischer Anteil). Der Saldo ist die Differenz.
- **Die Datenbank speichert nur ganze Zahlen** (`Int`), keine Dezimaltypen – das Runden passiert
  ausschließlich an einer Stelle im Rechenkern.
- **Währungen werden nicht umgerechnet.** Salden entstehen je Währung getrennt, damit keine
  schwankenden Wechselkurse in alte Abrechnungen geraten.
- **Zahlungen** sind intern gewöhnliche Einträge mit `isPayment` – dadurch tauchen sie im Verlauf
  auf und verrechnen sich automatisch.
- **Schuldenvereinfachung** ist ein gieriges Verfahren (größte Gläubigerin trifft größten Schuldner)
  und erzeugt höchstens `n − 1` Überweisungen.

Der Rechenkern liegt in `src/lib/split.ts` und `src/lib/balances.ts` und ist frei von Framework- und
Datenbankabhängigkeiten – deshalb nutzen ihn der Server und der Gastmodus im Browser gemeinsam.

---

## Entwicklung

```bash
npm run dev         # Entwicklungsserver
npm run setup       # Prisma-Client, Tabellen und Build in einem Schritt
npm test            # Tests für Rechenkern, Beträge und OAuth-Prüfung
npm run typecheck   # TypeScript ohne Ausgabe prüfen
npm run build       # Produktions-Build
npm run db:studio   # Prisma Studio
```

Zusätzlich gibt es einen durchgängigen Browsertest (Registrierung, Gruppe, Einladungslink,
Ausgaben mit gleicher und prozentualer Aufteilung, Salden, Gastmodus). Er braucht Playwright,
das bewusst keine feste Abhängigkeit ist:

```bash
npm install --no-save playwright && npx playwright install chromium
npm run build && npm start     # in einem zweiten Terminal
npm run test:e2e
```

### Projektstruktur

```
src/
  app/
    page.tsx        Öffentliche Startseite
    (app)/          Seiten mit Anmeldung: Übersicht, Gruppen, Freunde, Ausgaben, Konto …
    (auth)/         Anmelden und Registrieren
    rechner/        Gastmodus ohne Konto
    beitreten/      Einladungslinks
    api/            OAuth-Endpunkte und CSV-Export
  actions/          Server Actions (Formularverarbeitung)
  components/       Wiederverwendete Oberfläche
  lib/              Rechenkern, Datenzugriff, Anmeldung, OAuth, Formatierung
prisma/             Datenmodell und Beispieldaten
tests/              Tests (node:test) und Browsertest
```

---

## Datenschutz

- Es werden nur die Daten gespeichert, die eingegeben werden: Name, E-Mail-Adresse und die Ausgaben.
- Keine Analyse-Dienste, keine Werbung, keine Weitergabe an Dritte, keine externen Schriftarten.
- Der Gastmodus kommt vollständig ohne Server aus.
- Selbst gehostet bleiben alle Daten auf der eigenen Instanz.

---

## Lizenz

[MIT](LICENSE) – Nutzung, Veränderung und Weitergabe sind ausdrücklich erwünscht.

Fairteilen ist ein eigenständiges Projekt und gehört zu keinem anderen Anbieter.

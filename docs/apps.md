# Fairteilen als App für iOS und Android

Fairteilen ist eine Webanwendung und lässt sich auf drei Wegen aufs Telefon bringen. Der erste
kostet nichts und braucht keinen Entwicklerzugang – die anderen beiden führen in die App-Stores.

| Weg | Aufwand | Kosten | In den Stores |
|---|---|---|---|
| **1. Als PWA installieren** | keiner, funktioniert bereits | – | nein |
| **2. Capacitor-Hülle** | ein Nachmittag | 99 €/Jahr (Apple), 25 € einmalig (Google) | ja, iOS und Android |
| **3. Android per TWA** | ein bis zwei Stunden | 25 € einmalig | nur Android |

---

## Weg 1: Ohne alles – als PWA installieren

Das ist bereits eingerichtet ([`public/manifest.webmanifest`](../public/manifest.webmanifest)).

- **Android/Chrome:** Menü → *App installieren*
- **iOS/Safari:** Teilen → *Zum Home-Bildschirm*

Danach startet Fairteilen im eigenen Fenster ohne Browserleiste, mit eigenem Symbol. Für die
meisten Gruppen reicht das völlig – und Aktualisierungen kommen sofort an, ohne Store.

---

## Weg 2: Echte Apps mit Capacitor

Die Hülle zeigt die laufende Instanz an, statt eine Kopie der Oberfläche mitzuliefern. Damit sind
App und Web immer auf demselben Stand, und Änderungen brauchen kein App-Update.

Mitgeliefert sind bereits:

| Datei | Zweck |
|---|---|
| [`capacitor.config.ts`](../capacitor.config.ts) | Kennung, Name, Serveradresse, Startbildschirm |
| [`native/www/index.html`](../native/www/index.html) | wird angezeigt, wenn der Server nicht erreichbar ist |
| `native/assets/icon.png` | App-Symbol, 1024 × 1024 |
| `native/assets/splash.png` | Startbildschirm, 2732 × 2732 |

### Voraussetzungen

- **iOS:** ein Mac mit Xcode und ein Apple-Entwicklerkonto (99 €/Jahr)
- **Android:** Android Studio und ein Google-Play-Entwicklerkonto (25 € einmalig)

### Einrichten

Capacitor gehört bewusst **nicht** zu den Abhängigkeiten des Servers – sonst müsste jede Instanz
Pakete mitinstallieren, die sie nie braucht. Einmalig auf dem Entwicklungsrechner:

```bash
npm install -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android @capacitor/assets
```

Dann die Projekte anlegen – `APP_URL` muss auf die eigene Instanz zeigen:

```bash
export APP_URL=https://fairteilen.app
npx cap add ios
npx cap add android
npx capacitor-assets generate --assetPath native/assets
npm run app:sync
```

### Bauen und veröffentlichen

```bash
npm run app:ios       # öffnet Xcode
npm run app:android   # öffnet Android Studio
```

In Xcode bzw. Android Studio wie gewohnt signieren und hochladen. Bei jeder Änderung an
`capacitor.config.ts` danach wieder `npm run app:sync`.

### Anmeldung in der App – hier ist Vorsicht nötig

| Weg | In der App-Hülle |
|---|---|
| E-Mail und Passwort | funktioniert unverändert |
| **Mit Apple anmelden** | funktioniert nur, wenn `appleid.apple.com` in `allowNavigation` steht |
| **Mit Google anmelden** | **funktioniert nicht** – siehe unten |

Zwei voneinander unabhängige Gründe:

1. `capacitor.config.ts` erlaubt bewusst nur die eigene Adresse. Alles andere öffnet der
   Systembrowser – der Anmeldevorgang liefe dort zu Ende, und das Sitzungs-Cookie landete im
   Browser statt in der App. Die App bliebe abgemeldet.
2. Nimmt man `accounts.google.com` in `allowNavigation` auf, lehnt **Google** die Anmeldung ab:
   Eingebettete Browser sind seit 2021 gesperrt (`disallowed_useragent`). Das lässt sich von
   unserer Seite nicht umgehen.

Apple ist an dieser Stelle großzügiger, prüft die App aber lieber mit der nativen Schaltfläche.

**Damit Google und Apple auch in der App funktionieren**, braucht es native Anmeldung statt des
Umwegs über den Browser:

1. Plugin einbinden, etwa `@capacitor/google-auth` bzw. `@capacitor-community/apple-sign-in`.
   Dabei entstehen **eigene Client-IDs** für iOS und Android – die Web-Client-ID gilt dort nicht.
2. Das Plugin liefert ein ID-Token. Dieses muss an den Server gehen, der es prüft und daraus eine
   Sitzung erzeugt. Die Prüfung selbst ist bereits vorhanden (`verifyIdToken` in
   [`src/lib/oauth.ts`](../src/lib/oauth.ts) mit Signatur, Aussteller, Empfänger, Laufzeit und
   Nonce) – es fehlen nur zwei Dinge:
   - ein Endpunkt, der ein solches Token entgegennimmt,
   - die zusätzlichen Client-IDs als gültige Empfänger (`aud`), denn die native Kennung
     unterscheidet sich von der Web-Kennung.

Solange das nicht eingebaut ist: In der App die Anbieter-Schaltflächen ausblenden und auf
E-Mail und Passwort setzen. Wer sich im Web über Google angemeldet hat, kann sich unter
*Konto* → *Passwort setzen* eines vergeben und sich damit auch in der App anmelden.

### Wichtig für die Store-Prüfung

- **Apple lehnt reine Webseiten-Hüllen ab** (Richtlinie 4.2, „minimal functionality“). Die
  Kamera-Aufnahme für Belege und der Betrieb im Vollbild sprechen dafür; hilfreich ist zusätzlich
  ein natives Plugin, etwa `@capacitor/camera` oder `@capacitor/share`.
- **Konto löschen muss in der App erreichbar sein** (Apple-Richtlinie 5.1.1(v)) – das ist unter
  *Konto* → *Konto löschen* gegeben.
- **Datenschutzangaben:** Fairteilen erhebt Name, E-Mail-Adresse, Ausgaben und Belege; kein
  Tracking, keine Weitergabe. Entsprechend in App Store Connect und der Play Console eintragen.
- Beide Stores verlangen eine erreichbare **Datenschutzerklärung** unter einer eigenen Adresse.

### Einladungslinks in der App öffnen

Damit `https://fairteilen.app/beitreten/…` die App startet statt den Browser, braucht es

- iOS: *Associated Domains* im Xcode-Projekt und die Datei
  `https://fairteilen.app/.well-known/apple-app-site-association`
- Android: *App Links* und `https://fairteilen.app/.well-known/assetlinks.json`

Beide Dateien enthalten die Kennung des eigenen Entwicklerkontos und den Fingerabdruck des
Signaturschlüssels – deshalb liegen sie nicht im Projekt. Die Stores beschreiben das Format.

---

## Weg 3: Android ohne Capacitor (TWA)

Für Android genügt auch eine *Trusted Web Activity*: Sie zeigt die Seite ohne Browserleiste und
gilt Google als App. Mit [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):

```bash
npx @bubblewrap/cli init --manifest=https://fairteilen.app/manifest.webmanifest
npx @bubblewrap/cli build
```

Das Ergebnis lässt sich direkt in der Play Console hochladen. Für iOS gibt es kein Gegenstück –
dort führt nur Weg 1 oder 2.

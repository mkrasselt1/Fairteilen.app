# Fairteilen bekannt machen

Was in der App bereits eingebaut ist – und was du selbst tun musst.

## Schon erledigt (technisch)

| Baustein | Wo |
|---|---|
| Öffentliche Startseite mit echtem Inhalt (Funktionen, Ablauf, FAQ) | `/` |
| Zweite indexierbare Seite mit eigenem Nutzen | `/rechner` |
| Seitentitel und Beschreibungen je Seite | `src/app/**/page.tsx` |
| Strukturierte Daten: `SoftwareApplication` und `FAQPage` | `src/app/page.tsx` |
| Vorschaubild für Messenger und soziale Netzwerke | `public/og.png`, Metadaten in `src/app/layout.tsx` |
| `robots.txt` und `sitemap.xml`, zur Laufzeit erzeugt | `src/app/robots.ts`, `src/app/sitemap.ts` |
| Persönliche Bereiche auf `noindex` | `src/app/(app)/layout.tsx` |
| Installierbar als App (PWA), schnelle Auslieferung | `public/manifest.webmanifest` |

Wichtig: `APP_URL` muss gesetzt sein, sonst stehen in Sitemap und Vorschaubild falsche Adressen.

## Was du tun musst

### 1. Bei den Suchmaschinen anmelden
- [Google Search Console](https://search.google.com/search-console) – Domain bestätigen, `https://fairteilen.app/sitemap.xml` einreichen
- [Bing Webmaster Tools](https://www.bing.com/webmasters) – dasselbe, erreicht zusätzlich DuckDuckGo und Ecosia

Danach dauert es erfahrungsgemäß ein bis vier Wochen, bis die ersten Seiten im Index stehen.

### 2. Inhalte, nach denen tatsächlich gesucht wird
Eine Startseite allein rankt selten. Was wirklich zieht, sind Seiten zu konkreten Fragen, etwa:

- „WG-Kosten gerecht aufteilen – so geht's“
- „Urlaubskasse abrechnen: Wer schuldet wem wie viel?“
- „Rechnung im Restaurant aufteilen, wenn nicht alle gleich viel bestellt haben“
- „Miete nach Zimmergröße aufteilen“ (passt genau zur Aufteilung nach Anteilen)

Jeder Artikel beantwortet eine Frage vollständig und verlinkt am Ende auf `/rechner`. Drei bis fünf
gute Seiten bringen mehr als zwanzig dünne.

### 3. Dort auftauchen, wo Leute suchen
- **GitHub**: Repository öffentlich schalten, Beschreibung und Themen (`expense-sharing`, `selfhosted`,
  `nextjs`) setzen. Das bringt Rückverweise und Fachpublikum.
- **Verzeichnisse für freie Software**: [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted),
  [AlternativeTo](https://alternativeto.net), [Product Hunt](https://producthunt.com),
  [libhunt](https://libhunt.com). Diese Einträge sind meist die ersten stabilen Rückverweise.
- **Foren und Communities**: r/selfhosted, r/de, Hacker News („Show HN“), das Fediverse. Ehrlich
  auftreten – ein eigenes Projekt vorstellen ist willkommen, verdeckte Werbung nicht.
- **Direkt im Umfeld**: WG-Gruppen, Vereine, Reisegruppen. Ein geteilter Einladungslink bringt
  jedes Mal mehrere neue Konten – das ist der wirksamste Kanal, den diese App hat.

### 4. Messen statt raten
Die Search Console zeigt nach ein paar Wochen, wonach Leute suchen, bevor sie klicken. Diese
Begriffe sind die Vorlage für die nächsten Inhalte. Für Besucherzahlen genügt eine datensparsame
Lösung wie Plausible oder GoatCounter – klassisches Tracking würde dem Versprechen der App
widersprechen.

### 5. Geduld und Erwartung
Für allgemeine Begriffe stehen etablierte Anbieter mit jahrelanger Historie vorn. Realistisch
erreichbar sind Nischenfragen und der Markenname. Ein Konto zu haben lohnt sich für Nutzende erst
mit anderen zusammen – deshalb ist jede Einladung wertvoller als jeder Klick aus der Suche.

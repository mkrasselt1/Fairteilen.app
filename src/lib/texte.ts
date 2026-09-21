/**
 * Textbausteine der Oberfläche, die als Tabelle vorliegen: Aufteilungsarten,
 * Wiederholungen, Navigation und die Inhalte der Startseite.
 *
 * Sie stehen hier und nicht in den Komponenten, damit `npm run i18n` sie findet
 * und ihre Übersetzung prüfen kann – aufgerufen werden sie über t(eintrag.label).
 */
import type { SplitType } from "./split.ts";

export const SPLIT_TABS: { id: SplitType; label: string; hint: string }[] = [
  { id: "equal", label: "Gleich", hint: "Der Betrag wird gleichmäßig auf alle Ausgewählten verteilt." },
  { id: "exact", label: "Beträge", hint: "Gib für jede Person den genauen Betrag an. Die Summe muss stimmen." },
  { id: "percent", label: "Prozent", hint: "Verteile den Betrag prozentual – zusammen müssen es 100 % sein." },
  { id: "shares", label: "Anteile", hint: "Zum Beispiel 2 Anteile für ein Paar und 1 Anteil pro Einzelperson." },
  {
    id: "adjustment",
    label: "Zu-/Abschlag",
    hint: "Zuerst werden individuelle Zuschläge abgezogen, der Rest wird gleichmäßig geteilt.",
  },
];

/** Kurzform derselben Bezeichnungen – für Listen und den CSV-Export. */
export const SPLIT_LABELS: Record<SplitType, string> = {
  equal: "Gleich",
  exact: "Beträge",
  percent: "Prozent",
  shares: "Anteile",
  adjustment: "Zu-/Abschlag",
};

export const RECURRENCE_OPTIONS = [
  { id: "none", label: "Einmalig" },
  { id: "daily", label: "Täglich" },
  { id: "weekly", label: "Wöchentlich" },
  { id: "monthly", label: "Monatlich" },
  { id: "yearly", label: "Jährlich" },
];

export const NAV_LINKS = [
  { href: "/uebersicht", label: "Übersicht", icon: "🏠" },
  { href: "/gruppen", label: "Gruppen", icon: "👥" },
  { href: "/freunde", label: "Freunde", icon: "🧑‍🤝‍🧑" },
  { href: "/aktivitaet", label: "Aktivität", icon: "🔔" },
  { href: "/konto", label: "Konto", icon: "⚙️" },
];

export const LANDING_FEATURES = [
  {
    icon: "🔗",
    title: "Kein Konto nötig",
    text: "Abrechnung anlegen, Link teilen, loslegen. Wer den Link hat, trägt ein und sieht den Stand – ohne Registrierung.",
  },
  {
    icon: "👥",
    title: "Gruppen für alles",
    text: "WG, Reise, Paar, Veranstaltung oder Projekt. Alle sehen sofort denselben Stand.",
  },
  {
    icon: "🧮",
    title: "Fünf Arten zu teilen",
    text: "Gleichmäßig, nach exakten Beträgen, prozentual, nach Anteilen oder mit Zu- und Abschlägen. Mit Schiebereglern und Live-Rückmeldung.",
  },
  {
    icon: "💸",
    title: "Wenige Überweisungen",
    text: "Fairteilen fasst alle Schulden zusammen, sodass am Ende möglichst wenige Zahlungen nötig sind.",
  },
  {
    icon: "🌍",
    title: "Beliebige Währungen",
    text: "18 Währungen, getrennt geführt. Auch mehrere Zahlende pro Ausgabe sind kein Problem.",
  },
  {
    icon: "🔁",
    title: "Wiederkehrende Kosten",
    text: "Miete, Strom oder Abos werden automatisch immer wieder eingetragen – täglich bis jährlich.",
  },
  {
    icon: "📦",
    title: "Archiv statt Chaos",
    text: "Abgeschlossene Abrechnungen wandern ins Archiv und bleiben trotzdem vollständig nachvollziehbar.",
  },
];

export const LANDING_STEPS = [
  { title: "Abrechnung anlegen", text: "Name eingeben, Beteiligte eintragen – fertig. Ohne Anmeldung." },
  { title: "Link teilen", text: "Der Link geht in die Gruppe. Wer draufklickt, sagt nur, wer er ist." },
  { title: "Ausgaben eintragen", text: "Wer hat bezahlt, wer war beteiligt? Der Rest passiert automatisch." },
  { title: "Begleichen", text: "Am Ende sagt Fairteilen genau, wer wem wie viel überweisen muss." },
];

export const LANDING_FAQ = [
  {
    q: "Kostet Fairteilen etwas?",
    a: "Nein. Fairteilen ist kostenlos, werbefrei und ohne Begrenzung nutzbar. Der Quelltext steht unter der MIT-Lizenz frei zur Verfügung, jede und jeder darf die App auch selbst betreiben.",
  },
  {
    q: "Brauche ich ein Konto?",
    a: "Nein. Eine gemeinsame Abrechnung entsteht über einen Link – alle Beteiligten tragen ein, ohne sich anzumelden. Für eine schnelle Rechnung allein genügt der Rechner, der vollständig im Browser läuft. Ein Konto lohnt sich erst, wenn du regelmäßig mit denselben Leuten abrechnest und alles an einem Ort haben möchtest.",
  },
  {
    q: "Können mehrere Personen gemeinsam abrechnen?",
    a: "Ja, und dafür braucht niemand ein Konto. Wer den Link hat, sieht dieselben Ausgaben und Salden, kann Einträge anlegen, bearbeiten und kommentieren. Ein Verlauf zeigt, wer was geändert hat.",
  },
  {
    q: "Was passiert, wenn jemand den Link weitergibt?",
    a: "Wer den Link hat, kann mitlesen und mitschreiben – teile ihn deshalb nur mit den Beteiligten. Der Code ist zufällig und lang genug, dass er nicht erraten werden kann; erraten oder über Suchmaschinen gefunden wird eine Abrechnung nicht.",
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: "Es werden nur Name, E-Mail-Adresse und die eingetragenen Ausgaben gespeichert. Kein Tracking, keine Werbung, keine Weitergabe an Dritte. Wer möchte, betreibt Fairteilen auf dem eigenen Server.",
  },
  {
    q: "Wie werden Restcents behandelt?",
    a: "Es wird ausschließlich mit ganzen Cent gerechnet. Bleibt bei einer Teilung ein Cent übrig, wird er nachvollziehbar zugeteilt – die Summe der Anteile ergibt immer exakt den Gesamtbetrag.",
  },
  {
    q: "Kann ich in mehreren Währungen abrechnen?",
    a: "Ja. Salden werden je Währung getrennt geführt und nicht automatisch umgerechnet, damit schwankende Wechselkurse alte Abrechnungen nicht verändern.",
  },
];

/** Punkte neben dem Anmeldeformular. */
export const AUTH_BULLETS = [
  "Gruppen für WG, Reise, Paar oder Projekt",
  "Gleich, exakt, prozentual, nach Anteilen oder mit Zu- und Abschlägen aufteilen",
  "Mehrere Zahlende pro Ausgabe und beliebige Währungen",
  "Schulden automatisch vereinfachen und mit einem Klick begleichen",
  "Wiederkehrende Ausgaben, Kommentare, Aktivitätsverlauf, CSV-Export",
  "Kostenlos, quelloffen und selbst hostbar – keine Werbung, kein Abo",
  "Gemeinsam abrechnen über einen Link – ganz ohne Konto",
];

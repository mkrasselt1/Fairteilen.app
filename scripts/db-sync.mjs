#!/usr/bin/env node
/**
 * Bringt die Datenbank auf den Stand des Schemas.
 *
 * `prisma db push` bricht ab, sobald es irgendeine Warnung gibt – auch bei
 * völlig harmlosen Änderungen wie einer neuen eindeutigen Spalte. Auf einem
 * Hosting sieht man davon oft nur eine abgeschnittene Fehlermeldung. Dieses
 * Skript führt den sicheren Weg aus und erklärt im Fehlerfall verständlich,
 * was zu tun ist – ohne eigenmächtig Daten zu verwerfen.
 */
import { spawnSync } from "node:child_process";

const push = (extra = []) =>
  spawnSync("prisma", ["db", "push", ...extra], { encoding: "utf8", shell: true });

const result = push();
process.stdout.write(result.stdout ?? "");

if (result.status === 0) process.exit(0);

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

// Häufigster Stolperstein auf gehosteten Umgebungen: Die Datenbankadresse ist
// nirgends hinterlegt. Prisma meldet das nur als Schema-Validierungsfehler.
if (/Environment variable not found: DATABASE_URL/i.test(output)) {
  console.log("");
  console.log("Die Datenbankadresse fehlt: DATABASE_URL ist nicht gesetzt.");
  console.log("");
  console.log("Lege im Anwendungsstamm eine Datei .env an – neben package.json:");
  console.log("");
  console.log('    DATABASE_URL="mysql://benutzer:passwort@localhost:3306/fairteilen"');
  console.log('    AUTH_SECRET="langer-zufallswert"');
  console.log('    APP_URL="https://deine-domain"');
  console.log("");
  console.log("Umgebungsvariablen, die nur in der Oberfläche des Hostings stehen, erreichen");
  console.log("diesen Befehl je nach Version nicht – die Datei tut es immer.");
  console.log("Enthält das Passwort @ : / oder #, müssen diese Zeichen kodiert werden");
  console.log("(@ wird zu %40, # zu %23).");
  console.log("");
  process.exit(1);
}

if (!output.includes("data loss")) {
  // Ein anderer Fehler – unverändert weiterreichen.
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}

const warnings = output
  .split("\n")
  .filter((line) => line.trim().startsWith("•"))
  .map((line) => line.trim());

// Eine neue eindeutige Spalte ist unbedenklich, das Entfernen von Spalten oder
// Tabellen dagegen nicht.
const harmless = warnings.length > 0 && warnings.every((line) => /unique constraint.*will be added/i.test(line));

console.log("");
console.log("Die Datenbank konnte nicht automatisch angeglichen werden.");
console.log("Prisma meldet:");
for (const line of warnings) console.log(`  ${line}`);
console.log("");

if (harmless) {
  console.log("Das betrifft ausschließlich neue eindeutige Spalten. Vorhandene Zeilen haben dort");
  console.log("keinen Wert, es geht also nichts verloren. Einmalig ausführen:");
  console.log("");
  console.log("    npm run db:push:force");
  console.log("");
} else {
  console.log("Achtung: Dabei würden Spalten oder Tabellen entfernt. Erst eine Sicherung anlegen,");
  console.log("die Meldungen oben prüfen und nur dann fortfahren:");
  console.log("");
  console.log("    npm run db:push:force");
  console.log("");
}

process.exit(1);

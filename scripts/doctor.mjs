#!/usr/bin/env node
/**
 * Prüft, ob die Umgebung zur Anwendung passt – gedacht für Hostings wie Plesk,
 * bei denen Fehlermeldungen im Deployment-Fenster abgeschnitten werden.
 *
 *   npm run doctor
 *
 * Meldet unter anderem, welche native Datei eine neuere C-Bibliothek verlangt,
 * als der Server bereitstellt („GLIBC_2.38 not found“).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/** Signal, um die Schreibprobe absichtlich zurückzurollen. */
class Rueckrollen extends Error {}

/** Werte aus .env übernehmen, ohne gesetzte Variablen zu überschreiben (wie app.js). */
function loadEnvFile(file) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env");

const NATIVE_SUFFIXES = [".node", ".so"];
const problems = [];
const notes = [];

function versionTuple(value) {
  return value.split(".").map(Number);
}

function isNewer(a, b) {
  const [aMajor, aMinor = 0] = versionTuple(a);
  const [bMajor, bMinor = 0] = versionTuple(b);
  return aMajor > bMajor || (aMajor === bMajor && aMinor > bMinor);
}

/** Liest die geforderten GLIBC-Versionen direkt aus der Binärdatei. */
function requiredGlibc(file) {
  let buffer;
  try {
    buffer = readFileSync(file);
  } catch {
    return null;
  }
  let highest = null;
  for (const match of buffer.toString("latin1").matchAll(/GLIBC_(\d+\.\d+)/g)) {
    const version = match[1];
    if (!highest || isNewer(version, highest)) highest = version;
  }
  return highest;
}

function walk(dir, found = [], depth = 0) {
  if (depth > 6) return found;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, found, depth + 1);
    } else if (NATIVE_SUFFIXES.some((suffix) => entry.name.includes(suffix))) {
      found.push(path);
    }
  }
  return found;
}

console.log("Fairteilen – Umgebungsprüfung\n");

// 1. Node und Betriebssystem
const header = process.report.getReport().header;
const glibc = header.glibcVersionRuntime;
console.log(`Node.js            ${process.version}  (${process.execPath})`);
console.log(`Plattform          ${process.platform} ${process.arch}`);
console.log(`C-Bibliothek       ${glibc ? `glibc ${glibc}` : "nicht ermittelbar (musl?)"}`);

const [major] = versionTuple(process.versions.node);
if (major < 18) problems.push(`Node ${process.version} ist zu alt. Nötig ist mindestens Node 18.18, empfohlen 20 oder 22.`);

// 2. Abhängigkeiten vorhanden?
if (!existsSync("node_modules")) {
  problems.push("node_modules fehlt – bitte zuerst `npm install` ausführen.");
} else {
  for (const pkg of ["next", "react", "@prisma/client", "typescript", "tailwindcss", "prisma"]) {
    if (!existsSync(join("node_modules", pkg))) {
      problems.push(`Paket „${pkg}“ fehlt. Läuft npm install im Produktionsmodus ohne .npmrc (include=dev)?`);
    }
  }
}

// 3. Native Dateien gegen die vorhandene glibc prüfen
if (glibc && existsSync("node_modules")) {
  const binaries = walk("node_modules");
  const tooNew = [];
  for (const file of binaries) {
    const required = requiredGlibc(file);
    if (required && isNewer(required, glibc)) tooNew.push({ file, required });
  }
  console.log(`Native Dateien     ${binaries.length} geprüft`);
  if (tooNew.length > 0) {
    problems.push(
      `Diese Dateien verlangen eine neuere C-Bibliothek als die vorhandene (glibc ${glibc}):\n` +
        tooNew
          .sort((a, b) => (isNewer(a.required, b.required) ? -1 : 1))
          .slice(0, 10)
          .map((entry) => `    GLIBC_${entry.required} → ${entry.file}`)
          .join("\n") +
        (tooNew.length > 10 ? `\n    … und ${tooNew.length - 10} weitere` : "") +
        "\n  Meist hilft: passendes Paket für dieses System installieren " +
        "(npm install neu ausführen) oder eine ältere Version des betroffenen Pakets verwenden.",
    );
  }
}

// 3b. Node- und npm-Programme im Suchpfad – häufigste Ursache für „GLIBC ... not found“
if (glibc) {
  const seen = new Set();
  const candidates = [];
  for (const dir of (process.env.PATH ?? "").split(":")) {
    for (const name of ["node", "npm"]) {
      const path = join(dir, name);
      if (seen.has(path) || !existsSync(path)) continue;
      seen.add(path);
      const required = requiredGlibc(path);
      if (required) candidates.push({ path, required, tooNew: isNewer(required, glibc) });
    }
  }
  const broken = candidates.filter((entry) => entry.tooNew);
  if (broken.length > 0) {
    problems.push(
      "Im Suchpfad liegen Node-Programme, die diese C-Bibliothek nicht unterstützen:\n" +
        broken.map((entry) => `    GLIBC_${entry.required} → ${entry.path}`).join("\n") +
        "\n  Diese Programme dürfen nicht verwendet werden – in den Bereitstellungsaktionen" +
        "\n  eine passende Node-Version mit absolutem Pfad ansprechen.",
    );
  } else if (candidates.length > 0) {
    console.log(`Node im Suchpfad   ${candidates.length} Programm(e), alle mit dieser glibc lauffähig`);
  }
}

// 4. Build vorhanden?
if (!existsSync(".next")) notes.push("Es gibt noch keinen Build – `npm run build` bzw. `npm run setup` ausführen.");

// 5. Umgebungsvariablen
if (!process.env.DATABASE_URL) problems.push("DATABASE_URL ist nicht gesetzt (weder als Umgebungsvariable noch in .env).");
else console.log(`DATABASE_URL       ${process.env.DATABASE_URL.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@")}`);

if (!process.env.AUTH_SECRET) problems.push("AUTH_SECRET ist nicht gesetzt – Sitzungen wären nach jedem Neustart ungültig.");
else if (process.env.AUTH_SECRET.length < 32) problems.push("AUTH_SECRET ist kürzer als 32 Zeichen.");

if (!process.env.APP_URL) notes.push("APP_URL ist nicht gesetzt – Einladungslinks und die Sitemap raten dann die Adresse.");

// 6. Schema und Datenbank passen zusammen?
if (existsSync("prisma/schema.prisma")) {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const provider = schema.match(/datasource\s+db\s*\{[^}]*?provider\s*=\s*"([^"]+)"/s)?.[1];
  const url = process.env.DATABASE_URL ?? "";
  const expected = { mysql: ["mysql:"], postgresql: ["postgres:", "postgresql:"], sqlite: ["file:"] }[provider ?? ""];
  console.log(`Datenbank-Provider ${provider}`);

  if (url && expected) {
    const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
    if (!scheme) {
      // Häufigster Tippfehler: Die Adresse beginnt direkt mit dem Benutzernamen.
      problems.push(
        "DATABASE_URL fehlt die Angabe der Datenbankart am Anfang.\n" +
          `    Erwartet wird ein Wert der Form:\n` +
          `      ${expected[0]}//BENUTZER:PASSWORT@HOST:PORT/DATENBANK\n` +
          `    Beginnt er direkt mit dem Benutzernamen, fehlt „${expected[0]}//“ davor.`,
      );
    } else if (!expected.some((prefix) => url.startsWith(prefix))) {
      problems.push(
        `Das Schema ist auf „${provider}“ eingestellt, DATABASE_URL beginnt aber mit „${scheme}:“.\n` +
          `    Passenden Umschalter ausführen: npm run use:mysql | use:postgres | use:sqlite`,
      );
    } else if (provider !== "sqlite") {
      try {
        const parsed = new URL(url);
        if (!parsed.hostname) problems.push("In DATABASE_URL fehlt der Rechnername (host).");
        if (!parsed.pathname.replace(/^\//, "")) problems.push("In DATABASE_URL fehlt der Name der Datenbank.");
        if (!parsed.username) problems.push("In DATABASE_URL fehlt der Benutzername.");
      } catch {
        problems.push(
          "DATABASE_URL lässt sich nicht lesen. Enthält das Passwort # / oder ?, müssen diese\n" +
            "    Zeichen kodiert werden: # zu %23, / zu %2F, ? zu %3F.",
        );
      }
    }
  }
}

// 7. Tatsächlich verbinden – der eigentliche Test
if (process.env.DATABASE_URL && existsSync(join("node_modules", "@prisma", "client"))) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({ log: [] });
    try {
      await prisma.$queryRaw`SELECT 1`;
      let bestand = null;
      try {
        const [konten, gruppen, eintraege] = await Promise.all([
          prisma.user.count(),
          prisma.group.count(),
          prisma.expense.count(),
        ]);
        bestand = `${konten} Konten, ${gruppen} Gruppen, ${eintraege} Einträge`;
      } catch {
        problems.push(
          "Die Verbindung steht, aber die Tabellen fehlen noch.\n" +
            "    Einmalig ausführen: npm run db:push",
        );
      }

      if (bestand) {
        // Schreibrecht ohne Spuren prüfen: ein Eintrag wird angelegt und die
        // Transaktion danach absichtlich zurückgerollt – es bleibt nichts zurück.
        let schreibt = false;
        let schreibfehler = null;
        try {
          await prisma.$transaction(async (tx) => {
            await tx.loginNonce.create({
              data: { value: `doctor-${randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) },
            });
            throw new Rueckrollen();
          });
        } catch (error) {
          if (error instanceof Rueckrollen) schreibt = true;
          else schreibfehler = error;
        }

        console.log(
          `Verbindung         steht – ${schreibt ? "lesen und schreiben" : "nur lesen"} (${bestand})`,
        );

        if (!schreibfehler) {
          // nichts zu melden
        } else if (/command denied|denied to user|INSERT command/i.test(String(schreibfehler?.message ?? schreibfehler))) {
          problems.push(
            "Der Datenbankbenutzer darf lesen, aber nicht schreiben.\n" +
              "    In Plesk unter Datenbanken dem Benutzer alle Rechte auf diese Datenbank geben.",
          );
        } else {
          const text = String(schreibfehler?.message ?? schreibfehler)
            .split("\n")
            .map((line) => line.trim())
            .find((line) => line && !/invocation|^at /.test(line));
          problems.push(`Die Schreibprobe ist fehlgeschlagen.\n    ${(text ?? "unbekannter Fehler").slice(0, 160)}`);
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    // Prisma liefert hier keinen Fehlercode mit, deshalb am Text unterscheiden.
    const text = String(error?.message ?? error);
    const erklaerung = /Authentication failed/i.test(text)
      ? "Benutzername oder Passwort stimmen nicht."
      : /denied access on the database/i.test(text)
        ? "Die Datenbank gibt es nicht, oder der Benutzer hat darauf keine Rechte."
        : /Can't reach database server/i.test(text)
          ? "Der Datenbankserver ist unter dieser Adresse nicht erreichbar. Läuft er? Stimmen Rechnername und Port?"
          : /invalid port number|database string is invalid/i.test(text)
            ? "Die Adresse ist fehlerhaft. Enthält das Passwort # / oder ?, müssen sie kodiert werden."
            : (text
                .split("\n")
                .map((line) => line.trim())
                .find((line) => line && !/invocation|^at /.test(line)) ?? "unbekannter Fehler"
              ).slice(0, 160);

    problems.push(`Die Datenbank ist nicht erreichbar.\n    ${erklaerung}`);
  }
}

console.log("");
if (notes.length > 0) {
  for (const note of notes) console.log(`  Hinweis: ${note}`);
  console.log("");
}
if (problems.length === 0) {
  console.log("✓ Keine Probleme gefunden.");
} else {
  console.log(`${problems.length} Punkt(e) zu klären:\n`);
  for (const problem of problems) console.log(`  • ${problem}`);
  process.exitCode = 1;
}

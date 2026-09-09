#!/usr/bin/env node
/**
 * Stellt das Prisma-Schema auf eine Datenbank um.
 *
 *   npm run use:mysql      MySQL oder MariaDB (Standard des Projekts)
 *   npm run use:postgres   PostgreSQL
 *   npm run use:sqlite     SQLite – für lokale Entwicklung ohne Datenbankserver
 *
 * Neben dem Provider wird auch der Datentyp langer Textfelder angepasst:
 * MySQL legt `String` sonst als VARCHAR(191) an, was für Notizen, Kommentare
 * und Verlaufsdaten zu kurz ist.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SCHEMA = "prisma/schema.prisma";

const TARGETS = {
  mysql: { provider: "mysql", label: "MySQL / MariaDB", example: "mysql://benutzer:passwort@localhost:3306/fairteilen" },
  postgres: { provider: "postgresql", label: "PostgreSQL", example: "postgresql://benutzer:passwort@localhost:5432/fairteilen?sslmode=require" },
  sqlite: { provider: "sqlite", label: "SQLite", example: "file:./dev.db" },
};

/** Felder, die auf MySQL mehr als VARCHAR(191) brauchen. */
const LONG_TEXT_FIELDS = [
  ["Expense", "notes"],
  ["Comment", "body"],
  ["Activity", "payload"],
];

const target = TARGETS[process.argv[2]];
if (!target) {
  console.error(`Aufruf: node scripts/use-database.mjs <${Object.keys(TARGETS).join("|")}>`);
  process.exit(1);
}

let schema = readFileSync(SCHEMA, "utf8");

schema = schema.replace(/(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]+(")/s, `$1${target.provider}$2`);

for (const [model, field] of LONG_TEXT_FIELDS) {
  const block = new RegExp(`(model\\s+${model}\\s*\\{)([\\s\\S]*?)(^\\})`, "m");
  schema = schema.replace(block, (_all, head, body, tail) => {
    const line = new RegExp(`^(\\s*${field}\\s+String\\??)([^\\n]*)$`, "m");
    return (
      head +
      body.replace(line, (_l, declaration, rest) => {
        const cleaned = rest.replace(/\s*@db\.Text/g, "").trimEnd();
        return target.provider === "mysql"
          ? `${declaration}${cleaned} @db.Text`
          : `${declaration}${cleaned}`;
      }) +
      tail
    );
  });
}

writeFileSync(SCHEMA, schema);

console.log(`✓ ${SCHEMA} nutzt jetzt ${target.label}.

Nächste Schritte:
  1. DATABASE_URL in .env setzen, z. B.
       DATABASE_URL="${target.example}"
  2. npm run db:push
  3. npm run build && npm start
`);

#!/usr/bin/env node
/**
 * Stellt das Prisma-Schema auf PostgreSQL um.
 * Aufruf: npm run use:postgres  (danach: npx prisma db push)
 */
import { readFileSync, writeFileSync } from "node:fs";

const path = "prisma/schema.prisma";
const schema = readFileSync(path, "utf8");

if (schema.includes('provider = "postgresql"')) {
  console.log("Das Schema nutzt bereits PostgreSQL.");
  process.exit(0);
}

writeFileSync(path, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
console.log(`✓ ${path} nutzt jetzt PostgreSQL.

Nächste Schritte:
  1. DATABASE_URL in .env auf deine Postgres-Instanz setzen
  2. npx prisma db push
  3. npm run build && npm start
`);

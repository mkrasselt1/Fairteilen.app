/**
 * Beispieldaten zum Ausprobieren: `npm run db:seed`
 * Alle Demo-Konten nutzen das Passwort "fairteilen".
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;
}

const PEOPLE = [
  { email: "alex@example.com", name: "Alex Muster", avatarColor: "#2f9e6f" },
  { email: "jamie@example.com", name: "Jamie Klein", avatarColor: "#3b82f6" },
  { email: "robin@example.com", name: "Robin Sommer", avatarColor: "#8b5cf6" },
];

async function main() {
  const passwordHash = hashPassword("fairteilen");
  const users = [];
  for (const person of PEOPLE) {
    users.push(
      await prisma.user.upsert({
        where: { email: person.email },
        update: {},
        create: { ...person, passwordHash, currency: "EUR" },
      }),
    );
  }
  const [alex, jamie, robin] = users;

  for (const a of users) {
    for (const b of users) {
      if (a.id === b.id) continue;
      await prisma.friendship
        .create({ data: { userId: a.id, friendId: b.id } })
        .catch(() => undefined);
    }
  }

  const existing = await prisma.group.findFirst({ where: { name: "WG Hauptstraße" } });
  if (existing) {
    console.log("Beispieldaten sind bereits vorhanden.");
    return;
  }

  const group = await prisma.group.create({
    data: {
      name: "WG Hauptstraße",
      type: "home",
      currency: "EUR",
      simplifyDebts: true,
      inviteToken: crypto.randomBytes(12).toString("base64url"),
      createdById: alex.id,
      members: {
        create: [
          { userId: alex.id, role: "owner" },
          { userId: jamie.id },
          { userId: robin.id },
        ],
      },
    },
  });

  const expenses = [
    { description: "Wocheneinkauf", amountCents: 8745, category: "groceries", payer: alex, days: 2 },
    { description: "Internet", amountCents: 4500, category: "internet", payer: jamie, days: 8 },
    { description: "Putzmittel", amountCents: 1990, category: "household", payer: robin, days: 12 },
    { description: "Miete Februar", amountCents: 132000, category: "rent", payer: alex, days: 20 },
  ];

  for (const item of expenses) {
    const per = Math.floor(item.amountCents / 3);
    const rest = item.amountCents - per * 3;
    await prisma.expense.create({
      data: {
        groupId: group.id,
        description: item.description,
        amountCents: item.amountCents,
        currency: "EUR",
        category: item.category,
        date: new Date(Date.now() - item.days * 86400000),
        createdById: item.payer.id,
        shares: {
          create: users.map((user, index) => ({
            userId: user.id,
            paidCents: user.id === item.payer.id ? item.amountCents : 0,
            oweCents: per + (index === 0 ? rest : 0),
          })),
        },
      },
    });
  }

  await prisma.expense.create({
    data: {
      description: "Konzertkarten",
      amountCents: 7000,
      currency: "EUR",
      category: "entertainment",
      date: new Date(Date.now() - 5 * 86400000),
      createdById: alex.id,
      shares: {
        create: [
          { userId: alex.id, paidCents: 7000, oweCents: 3500 },
          { userId: jamie.id, paidCents: 0, oweCents: 3500 },
        ],
      },
    },
  });

  console.log(`✓ Beispieldaten angelegt.

Anmeldedaten:
  alex@example.com  / fairteilen
  jamie@example.com / fairteilen
  robin@example.com / fairteilen
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

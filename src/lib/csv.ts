import "server-only";
import { centsToDecimalString } from "./money";

function escapeCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  // Semikolon als Trennzeichen und BOM, damit Excel die Datei direkt korrekt öffnet.
  return "﻿" + rows.map((row) => row.map(escapeCell).join(";")).join("\r\n");
}

type ExportExpense = {
  date: Date;
  description: string;
  category: string;
  amountCents: number;
  currency: string;
  isPayment: boolean;
  notes: string | null;
  group?: { name: string } | null;
  shares: { paidCents: number; oweCents: number; user: { name: string; email: string | null } }[];
};

export function expensesToCsv(expenses: ExportExpense[]): string {
  const rows: string[][] = [
    ["Datum", "Gruppe", "Beschreibung", "Kategorie", "Typ", "Betrag", "Währung", "Person", "Bezahlt", "Anteil", "Notiz"],
  ];

  for (const expense of expenses) {
    for (const share of expense.shares) {
      rows.push([
        expense.date.toISOString().slice(0, 10),
        expense.group?.name ?? "",
        expense.description,
        expense.category,
        expense.isPayment ? "Zahlung" : "Ausgabe",
        centsToDecimalString(expense.amountCents, expense.currency),
        expense.currency,
        share.user.name,
        centsToDecimalString(share.paidCents, expense.currency),
        centsToDecimalString(share.oweCents, expense.currency),
        expense.notes ?? "",
      ]);
    }
  }
  return toCsv(rows);
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

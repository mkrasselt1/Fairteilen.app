/**
 * Salden und Schuldenvereinfachung.
 *
 * Jede Ausgabe liefert pro Person `paidCents` (gezahlt) und `oweCents` (Anteil).
 * Der Saldo einer Person ist paid - owe: positiv = bekommt Geld, negativ = schuldet.
 * Salden werden pro Währung getrennt geführt (wie bei Splitwise; es wird nicht
 * automatisch umgerechnet).
 */

export type ShareRow = {
  userId: string;
  paidCents: number;
  oweCents: number;
  currency: string;
};

export type Debt = { fromUserId: string; toUserId: string; amountCents: number; currency: string };

/** Nettosaldo je Person und Währung. */
export function netBalances(rows: ShareRow[]): Map<string, Map<string, number>> {
  const byCurrency = new Map<string, Map<string, number>>();
  for (const row of rows) {
    let users = byCurrency.get(row.currency);
    if (!users) byCurrency.set(row.currency, (users = new Map()));
    users.set(row.userId, (users.get(row.userId) ?? 0) + row.paidCents - row.oweCents);
  }
  for (const users of byCurrency.values()) {
    for (const [userId, value] of users) if (value === 0) users.delete(userId);
  }
  return byCurrency;
}

/**
 * Vereinfachte Schulden: minimale Anzahl Überweisungen, die alle Salden ausgleicht.
 * Gieriges Verfahren – größte Gläubigerin trifft größten Schuldner.
 */
export function simplifyDebts(balances: Map<string, number>, currency: string): Debt[] {
  const creditors = [...balances.entries()].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }));
  const debtors = [...balances.entries()].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }));
  creditors.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  debtors.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    if (amount > 0) {
      debts.push({ fromUserId: debtors[i].id, toUserId: creditors[j].id, amountCents: amount, currency });
    }
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return debts;
}

/**
 * Schulden ohne Vereinfachung: paarweise aus den einzelnen Ausgaben abgeleitet.
 * Für jede Ausgabe schuldet jede Person mit Anteil den Zahlenden anteilig.
 */
export function pairwiseDebts(
  expenses: { currency: string; shares: { userId: string; paidCents: number; oweCents: number }[] }[],
): Debt[] {
  const pairs = new Map<string, number>(); // "currency|from|to" -> cents
  const add = (currency: string, from: string, to: string, cents: number) => {
    if (from === to || cents === 0) return;
    const [a, b, amount] = from < to ? [from, to, cents] : [to, from, -cents];
    const key = `${currency}|${a}|${b}`;
    pairs.set(key, (pairs.get(key) ?? 0) + amount);
  };

  for (const expense of expenses) {
    const payers = expense.shares.filter((s) => s.paidCents !== 0);
    const totalPaid = payers.reduce((a, b) => a + b.paidCents, 0);
    if (totalPaid === 0) continue;
    for (const share of expense.shares) {
      if (share.oweCents === 0) continue;
      // Anteil der Schuld auf die Zahlenden im Verhältnis ihrer Zahlung verteilen.
      let assigned = 0;
      payers.forEach((payer, index) => {
        const part =
          index === payers.length - 1
            ? share.oweCents - assigned
            : Math.round((share.oweCents * payer.paidCents) / totalPaid);
        assigned += part;
        add(expense.currency, share.userId, payer.userId, part);
      });
    }
  }

  const debts: Debt[] = [];
  for (const [key, value] of pairs) {
    if (value === 0) continue;
    const [currency, a, b] = key.split("|");
    debts.push(
      value > 0
        ? { fromUserId: a, toUserId: b, amountCents: value, currency }
        : { fromUserId: b, toUserId: a, amountCents: -value, currency },
    );
  }
  return debts.sort((x, y) => y.amountCents - x.amountCents);
}

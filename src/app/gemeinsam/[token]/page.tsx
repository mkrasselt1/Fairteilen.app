import type { Metadata } from "next";
import Link from "next/link";
import { loadBoard } from "./board";
import { baseUrl } from "@/lib/url";
import { formatMoney } from "@/lib/money";
import { Avatar, AvatarStack, EmptyState } from "@/components/ui";
import { ExpenseList } from "@/components/expense-list";
import { CopyButton } from "@/components/forms";
import { WhoAreYouForm } from "./join-form";
import { AddPersonForm } from "./add-person-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const board = await loadBoard(token).catch(() => null);
  return {
    title: board ? board.group.name : "Gemeinsame Abrechnung",
    robots: { index: false, follow: false },
  };
}

export default async function BoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, members, actor, detail } = await loadBoard(token);

  // Noch nicht festgelegt, als wer man mitarbeitet.
  if (!actor || !detail) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <p className="text-4xl" aria-hidden>
            🤝
          </p>
          <h1 className="mt-2 text-xl font-bold">{group.name}</h1>
          <p className="hint mt-1">Gemeinsame Abrechnung – jede Person mit diesem Link kann mitmachen.</p>
        </div>
        <div className="card p-5">
          <WhoAreYouForm token={token} members={members} loggedInName={null} />
        </div>
      </div>
    );
  }

  const shareUrl = `${await baseUrl()}/gemeinsam/${token}`;
  const { expenses, debts, memberBalances } = detail;
  const byId = new Map(memberBalances.map((entry) => [entry.user.id, entry.user]));
  const myBalances = memberBalances.find((entry) => entry.user.id === actor.userId)?.balances ?? [];

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{group.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <AvatarStack users={memberBalances.map((entry) => entry.user)} size={24} />
              <span className="hint">
                {members.length} {members.length === 1 ? "Person" : "Personen"} · du bist {actor.name}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/gemeinsam/${token}/ausgabe/neu`} className="btn-primary">
              Ausgabe hinzufügen
            </Link>
            <Link href={`/gemeinsam/${token}/begleichen`} className="btn-secondary">
              Begleichen
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {myBalances.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Für dich ist alles ausgeglichen 🎉</p>
          ) : (
            <p className="text-sm">
              Dein Stand:{" "}
              {myBalances.map((balance) => (
                <span
                  key={balance.currency}
                  className={`font-semibold ${balance.amountCents > 0 ? "positive" : "negative"}`}
                >
                  {balance.amountCents > 0 ? "du bekommst " : "du schuldest "}
                  {formatMoney(Math.abs(balance.amountCents), balance.currency)}{" "}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">So wird ausgeglichen</h2>
        {debts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Niemand schuldet gerade etwas.</p>
        ) : (
          <ul className="space-y-2">
            {debts.map((debt, index) => {
              const from = byId.get(debt.fromUserId);
              const to = byId.get(debt.toUserId);
              if (!from || !to) return null;
              const involvesMe = debt.fromUserId === actor.userId || debt.toUserId === actor.userId;
              return (
                <li
                  key={`${debt.fromUserId}-${debt.toUserId}-${index}`}
                  className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 ${
                    involvesMe ? "bg-slate-50 dark:bg-slate-800/60" : ""
                  }`}
                >
                  <Avatar user={from} size={28} />
                  <span className="flex-1 text-sm">
                    <strong>{debt.fromUserId === actor.userId ? "Du" : from.name}</strong>{" "}
                    {debt.fromUserId === actor.userId ? "zahlst" : "zahlt"}{" "}
                    <strong>{debt.toUserId === actor.userId ? "dir" : to.name}</strong>{" "}
                    <span className="font-semibold">{formatMoney(debt.amountCents, debt.currency)}</span>
                  </span>
                  <Link
                    href={`/gemeinsam/${token}/begleichen?${new URLSearchParams({
                      von: debt.fromUserId,
                      an: debt.toUserId,
                      betrag: (debt.amountCents / 100).toFixed(2),
                      waehrung: debt.currency,
                    })}`}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    Begleichen
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
            Stand je Person
          </summary>
          <ul className="mt-3 space-y-2">
            {memberBalances.map((entry) => (
              <li key={entry.user.id} className="flex items-center gap-3">
                <Avatar user={entry.user} size={28} />
                <span className="flex-1 text-sm">
                  {entry.user.id === actor.userId ? "Du" : entry.user.name}
                </span>
                <span className="text-sm">
                  {entry.balances.length === 0 ? (
                    <span className="hint">ausgeglichen</span>
                  ) : (
                    entry.balances.map((balance) => (
                      <span
                        key={balance.currency}
                        className={`ml-2 font-semibold tabular-nums ${
                          balance.amountCents > 0 ? "positive" : "negative"
                        }`}
                      >
                        {balance.amountCents > 0 ? "+" : "−"}
                        {formatMoney(Math.abs(balance.amountCents), balance.currency)}
                      </span>
                    ))
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <AddPersonForm groupId={group.id} />
          </div>
        </details>
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-4 py-3 font-semibold">Ausgaben</h2>
        {expenses.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Noch nichts erfasst"
            description="Trage die erste gemeinsame Ausgabe ein – wer wem was schuldet, rechnet sich von selbst aus."
            action={{ href: `/gemeinsam/${token}/ausgabe/neu`, label: "Ausgabe hinzufügen" }}
          />
        ) : (
          <ExpenseList expenses={expenses} currentUserId={actor.userId} basePath={`/gemeinsam/${token}/ausgabe`} />
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Link zum Mitmachen</h2>
        <p className="hint mb-3">
          Alle mit diesem Link können Ausgaben eintragen und den Stand sehen. Teile ihn nur mit den
          Beteiligten.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={shareUrl} className="input flex-1 min-w-[14rem] font-mono text-xs" />
          <CopyButton value={shareUrl} />
        </div>
        {actor.viaLink && (
          <p className="hint mt-4">
            Dein Browser merkt sich, dass du {actor.name} bist. Auf einem anderen Gerät wählst du das
            beim Öffnen des Links einfach erneut.{" "}
            <Link href="/registrieren" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Mit einem Konto
            </Link>{" "}
            hättest du alle Abrechnungen an einem Ort – nötig ist es nicht.
          </p>
        )}
      </section>
    </div>
  );
}

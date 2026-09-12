import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGroupDetail } from "@/lib/data";
import { groupTypeOf } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { Avatar, AvatarStack, EmptyState } from "@/components/ui";
import { ExpenseList } from "@/components/expense-list";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const user = await requireUser();
  const { id } = await params;
  const detail = await getGroupDetail(id, user.id);
  return { title: detail?.group.name ?? "Gruppe" };
}

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const detail = await getGroupDetail(id, user.id);
  if (!detail) notFound();

  const { group, expenses, debts, memberBalances } = detail;
  const byId = new Map(group.members.map((m) => [m.userId, m.user]));
  const myBalances = memberBalances.find((m) => m.user.id === user.id)?.balances ?? [];
  const myDebts = debts.filter((d) => d.fromUserId === user.id || d.toUserId === user.id);
  const otherDebts = debts.filter((d) => d.fromUserId !== user.id && d.toUserId !== user.id);

  return (
    <div className="space-y-6">
      {group.archivedAt && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Diese Gruppe ist archiviert. Sie lässt sich weiter nutzen und zählt zu deinen Salden – in der Gruppenliste
          steht sie im Archiv.{" "}
          <Link href={`/gruppen/${group.id}/einstellungen`} className="font-semibold underline">
            In den Einstellungen wieder aktivieren
          </Link>
        </p>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              {groupTypeOf(group.type).icon}
            </span>
            <div>
              <h1 className="text-xl font-bold">{group.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <AvatarStack users={group.members.map((m) => m.user)} size={24} />
                <span className="hint">
                  {group.members.length} {group.members.length === 1 ? "Mitglied" : "Mitglieder"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ausgaben/neu?gruppe=${group.id}`} className="btn-primary">
              Ausgabe hinzufügen
            </Link>
            <Link href={`/begleichen?gruppe=${group.id}`} className="btn-secondary">
              Begleichen
            </Link>
            <Link href={`/gruppen/${group.id}/einstellungen`} className="btn-ghost" aria-label="Gruppeneinstellungen">
              ⚙️
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {myBalances.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">In dieser Gruppe ist alles ausgeglichen 🎉</p>
          ) : (
            <p className="text-sm">
              Dein Saldo:{" "}
              {myBalances.map((b) => (
                <span key={b.currency} className={`font-semibold ${b.amountCents > 0 ? "positive" : "negative"}`}>
                  {b.amountCents > 0 ? "+" : "−"}
                  {formatMoney(Math.abs(b.amountCents), b.currency)}{" "}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Salden</h2>
          <span className="chip">{group.simplifyDebts ? "vereinfacht" : "einzeln"}</span>
        </div>

        {debts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Niemand schuldet gerade etwas.</p>
        ) : (
          <ul className="space-y-2">
            {[...myDebts, ...otherDebts].map((debt, index) => {
              const from = byId.get(debt.fromUserId);
              const to = byId.get(debt.toUserId);
              if (!from || !to) return null;
              const involvesMe = debt.fromUserId === user.id || debt.toUserId === user.id;
              return (
                <li
                  key={`${debt.fromUserId}-${debt.toUserId}-${debt.currency}-${index}`}
                  className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 ${
                    involvesMe ? "bg-slate-50 dark:bg-slate-800/60" : ""
                  }`}
                >
                  <Avatar user={from} size={28} />
                  <span className="flex-1 text-sm">
                    <strong>{debt.fromUserId === user.id ? "Du" : from.name}</strong>{" "}
                    {debt.fromUserId === user.id ? "schuldest" : "schuldet"}{" "}
                    <strong>{debt.toUserId === user.id ? "dir" : to.name}</strong>{" "}
                    <span className="font-semibold">{formatMoney(debt.amountCents, debt.currency)}</span>
                  </span>
                  {involvesMe && (
                    <Link
                      href={`/begleichen?gruppe=${group.id}&von=${debt.fromUserId}&an=${debt.toUserId}&betrag=${(
                        debt.amountCents / 100
                      ).toFixed(2)}&waehrung=${debt.currency}`}
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                    >
                      Begleichen
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
            Salden je Mitglied anzeigen
          </summary>
          <ul className="mt-3 space-y-2">
            {memberBalances.map((member) => (
              <li key={member.user.id} className="flex items-center gap-3">
                <Avatar user={member.user} size={28} />
                <span className="flex-1 text-sm">
                  {member.user.id === user.id ? "Du" : member.user.name}
                  {member.user.isGuest && <span className="hint"> · ohne Konto</span>}
                </span>
                <span className="text-sm">
                  {member.balances.length === 0 ? (
                    <span className="hint">ausgeglichen</span>
                  ) : (
                    member.balances.map((b) => (
                      <span
                        key={b.currency}
                        className={`ml-2 font-semibold tabular-nums ${b.amountCents > 0 ? "positive" : "negative"}`}
                      >
                        {b.amountCents > 0 ? "+" : "−"}
                        {formatMoney(Math.abs(b.amountCents), b.currency)}
                      </span>
                    ))
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="font-semibold">Ausgaben</h2>
          <Link
            href={`/api/export/gruppe/${group.id}`}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            CSV-Export
          </Link>
        </div>
        {expenses.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Noch keine Ausgaben"
            description="Trage die erste gemeinsame Ausgabe ein – die Salden berechnen sich automatisch."
            action={{ href: `/ausgaben/neu?gruppe=${group.id}`, label: "Ausgabe hinzufügen" }}
          />
        ) : (
          <ExpenseList expenses={expenses} currentUserId={user.id} />
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFriendDetail } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { Avatar, EmptyState } from "@/components/ui";
import { ExpenseList } from "@/components/expense-list";
import { ConfirmForm } from "@/components/forms";
import { removeFriendAction } from "@/actions/friends";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const user = await requireUser();
  const { id } = await params;
  const detail = await getFriendDetail(user.id, id);
  return { title: detail?.friend.name ?? "Kontakt" };
}

export default async function FriendPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (id === user.id) notFound();

  const detail = await getFriendDetail(user.id, id);
  if (!detail) notFound();
  const { friend, expenses, balances } = detail;

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar user={friend} size={48} />
            <div>
              <h1 className="text-xl font-bold">{friend.name}</h1>
              <p className="hint">{friend.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ausgaben/neu?freund=${friend.id}`} className="btn-primary">
              Ausgabe hinzufügen
            </Link>
            <Link href={`/begleichen?person=${friend.id}`} className="btn-secondary">
              Begleichen
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          {balances.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">Ihr seid quitt 🎉</p>
          ) : (
            balances.map((balance) => (
              <p key={balance.currency}>
                {balance.amountCents > 0 ? (
                  <>
                    <strong>{friend.name}</strong> schuldet dir{" "}
                    <span className="positive font-semibold">
                      {formatMoney(balance.amountCents, balance.currency)}
                    </span>
                  </>
                ) : (
                  <>
                    Du schuldest <strong>{friend.name}</strong>{" "}
                    <span className="negative font-semibold">
                      {formatMoney(-balance.amountCents, balance.currency)}
                    </span>
                  </>
                )}
              </p>
            ))
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-4 py-3 font-semibold">Gemeinsame Ausgaben</h2>
        {expenses.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Noch nichts geteilt"
            description="Sobald ihr eine Ausgabe gemeinsam erfasst, erscheint sie hier."
            action={{ href: `/ausgaben/neu?freund=${friend.id}`, label: "Ausgabe hinzufügen" }}
          />
        ) : (
          <ExpenseList expenses={expenses} currentUserId={user.id} showGroup />
        )}
      </section>

      <section className="card p-5">
        <ConfirmForm
          action={removeFriendAction}
          hidden={{ friendId: friend.id }}
          confirm={`${friend.name} aus der Kontaktliste entfernen?`}
          className="btn-secondary"
        >
          Kontakt entfernen
        </ConfirmForm>
      </section>
    </div>
  );
}

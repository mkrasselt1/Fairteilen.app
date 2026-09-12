import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSettlementOverview } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { Avatar, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Ausgleich" };
export const dynamic = "force-dynamic";

export default async function SettlementPage() {
  const user = await requireUser();
  const entries = await getSettlementOverview(user.id);

  const youOwe = entries.filter((entry) => entry.totals.some((total) => total.amountCents < 0));
  const owedToYou = entries.filter((entry) => entry.totals.every((total) => total.amountCents > 0));
  const transfers = entries.reduce((count, entry) => count + entry.totals.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ausgleich</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Alle offenen Beträge über sämtliche Gruppen hinweg, je Person zusammengefasst. Wer in
          mehreren Gruppen mit dir abrechnet, taucht hier nur einmal auf.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎉"
            title="Alles ausgeglichen"
            description="Es sind keine offenen Beträge vorhanden – weder in deinen Gruppen noch außerhalb."
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {transfers === 1 ? "Eine Zahlung bringt" : `${transfers} Zahlungen bringen`} alles ins Reine.
          </p>

          {[
            { title: "Du zahlst", list: youOwe, empty: null },
            { title: "Du bekommst", list: owedToYou, empty: null },
          ].map((section) =>
            section.list.length === 0 ? null : (
              <section key={section.title}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {section.title}
                </h2>
                <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                  {section.list.map((entry) => (
                    <div key={entry.person.id} className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Avatar user={entry.person} size={38} />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/freunde/${entry.person.id}`}
                            className="block truncate font-semibold hover:underline"
                          >
                            {entry.person.name}
                          </Link>
                          <span className="hint block truncate">
                            {entry.person.isGuest ? "ohne Konto" : entry.person.email}
                          </span>
                        </div>
                        <div className="text-right">
                          {entry.totals.map((total) => (
                            <p key={total.currency}>
                              <span
                                className={`text-lg font-bold ${total.amountCents > 0 ? "positive" : "negative"}`}
                              >
                                {formatMoney(Math.abs(total.amountCents), total.currency)}
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {entry.totals.map((total) => (
                          <Link
                            key={total.currency}
                            href={`/begleichen?${new URLSearchParams({
                              von: total.amountCents < 0 ? user.id : entry.person.id,
                              an: total.amountCents < 0 ? entry.person.id : user.id,
                              betrag: (Math.abs(total.amountCents) / 100).toFixed(2),
                              waehrung: total.currency,
                            })}`}
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                          >
                            {formatMoney(Math.abs(total.amountCents), total.currency)} begleichen
                          </Link>
                        ))}
                      </div>

                      {entry.sources.length > 1 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-slate-500 dark:text-slate-400">
                            Woraus setzt sich das zusammen?
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {entry.sources.map((source, index) => (
                              <li key={index} className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate text-slate-500 dark:text-slate-400">
                                  {source.groupId ? (
                                    <Link href={`/gruppen/${source.groupId}`} className="hover:underline">
                                      {source.groupName}
                                    </Link>
                                  ) : (
                                    source.groupName
                                  )}
                                </span>
                                <span
                                  className={`shrink-0 tabular-nums ${
                                    source.amountCents > 0 ? "positive" : "negative"
                                  }`}
                                >
                                  {source.amountCents > 0 ? "+" : "−"}
                                  {formatMoney(Math.abs(source.amountCents), source.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ),
          )}

          <p className="hint">
            Innerhalb einer Gruppe werden Schulden weiterhin zusammengefasst. Über Gruppen hinweg
            wird bewusst nicht über Dritte umgeleitet – eine Überweisung an jemanden, mit dem du nie
            etwas geteilt hast, wäre schwer nachvollziehbar.
          </p>
        </>
      )}
    </div>
  );
}

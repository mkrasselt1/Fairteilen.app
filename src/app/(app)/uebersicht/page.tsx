import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getFriendsWithBalances, getOverallSummary, getUserGroups } from "@/lib/data";
import { materializeRecurringExpenses } from "@/actions/expenses";
import { formatMoney } from "@/lib/money";
import { groupTypeOf } from "@/lib/categories";
import { Avatar, AvatarStack, BalancePills, EmptyState, SectionTitle } from "@/components/ui";
import { getI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getI18n()).t("Übersicht") };
}

export default async function OverviewPage() {
  const user = await requireUser();
  await materializeRecurringExpenses(user.id);

  const [summary, groups, friends] = await Promise.all([
    getOverallSummary(user.id),
    getUserGroups(user.id, { archived: false }),
    getFriendsWithBalances(user.id),
  ]);

  const { t, intlLocale } = await getI18n();
  const settled = summary.totals.length === 0;

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("Gesamtsaldo")}</p>
            {settled ? (
              <p className="mt-1 text-2xl font-bold">{t("Alles ausgeglichen 🎉")}</p>
            ) : (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {summary.totals.map((total) => (
                  <span
                    key={total.currency}
                    className={`text-2xl font-bold ${total.amountCents > 0 ? "positive" : "negative"}`}
                  >
                    {total.amountCents > 0 ? "+" : "−"}
                    {formatMoney(Math.abs(total.amountCents), total.currency, intlLocale)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/ausgaben/neu" className="btn-primary">
              {t("Ausgabe hinzufügen")}
            </Link>
            <Link href="/ausgleich" className="btn-secondary">
              {t("Ausgleich")}
            </Link>
          </div>
        </div>

        {!settled && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {t("Du bekommst")}
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                {summary.owedToYou.length === 0
                  ? "–"
                  : summary.owedToYou.map((b) => formatMoney(b.amountCents, b.currency, intlLocale)).join(" · ")}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 px-4 py-3 dark:bg-rose-950/40">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-400">
                {t("Du schuldest")}
              </p>
              <p className="mt-1 text-lg font-semibold text-rose-700 dark:text-rose-300">
                {summary.youOwe.length === 0
                  ? "–"
                  : summary.youOwe.map((b) => formatMoney(b.amountCents, b.currency, intlLocale)).join(" · ")}
              </p>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/gruppen/neu" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              {t("+ Neue Gruppe")}
            </Link>
          }
        >
          {t("Gruppen")}
        </SectionTitle>
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {groups.length === 0 ? (
            <EmptyState
              icon="👥"
              title={t("Noch keine Gruppe")}
              description={t(
                "Lege eine Gruppe für deine WG, Reise oder dein Projekt an und lade andere per Link ein.",
              )}
              action={{ href: "/gruppen/neu", label: t("Gruppe erstellen") }}
            />
          ) : (
            groups.map((group) => (
              <Link
                key={group.id}
                href={`/gruppen/${group.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="text-2xl" aria-hidden>
                  {groupTypeOf(group.type).icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{group.name}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <AvatarStack users={group.members.map((m) => m.user)} />
                    <span className="hint">
                      {group.members.length === 1
                        ? t("{anzahl} Mitglied", { anzahl: group.members.length })
                        : t("{anzahl} Mitglieder", { anzahl: group.members.length })}{" "}
                      ·{" "}
                      {group._count.expenses === 1
                        ? t("{anzahl} Eintrag", { anzahl: group._count.expenses })
                        : t("{anzahl} Einträge", { anzahl: group._count.expenses })}
                    </span>
                  </span>
                </span>
                <BalancePills balances={group.balances} />
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/freunde" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              {t("Alle anzeigen")}
            </Link>
          }
        >
          {t("Freunde")}
        </SectionTitle>
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {friends.length === 0 ? (
            <EmptyState
              icon="🧑‍🤝‍🧑"
              title={t("Noch keine Kontakte")}
              description={t(
                "Füge Freundinnen und Freunde über ihre E-Mail-Adresse hinzu oder lade sie in eine Gruppe ein.",
              )}
              action={{ href: "/freunde", label: t("Kontakt hinzufügen") }}
            />
          ) : (
            friends.slice(0, 8).map((entry) => (
              <Link
                key={entry.user.id}
                href={`/freunde/${entry.user.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <Avatar user={entry.user} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{entry.user.name}</span>
                  <span className="hint block truncate">{entry.user.email}</span>
                </span>
                <BalancePills balances={entry.balances} />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

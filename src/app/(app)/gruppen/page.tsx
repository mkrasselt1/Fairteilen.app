import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/data";
import { groupTypeOf } from "@/lib/categories";
import { AvatarStack, BalancePills, EmptyState, SectionTitle } from "@/components/ui";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Gruppen") };
}
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await requireUser();
  const [groups, archived] = await Promise.all([
    getUserGroups(user.id, { archived: false }),
    getUserGroups(user.id, { archived: true }),
  ]);
  const t = await getT();

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <Link href="/gruppen/neu" className="btn-primary !px-3 !py-1.5">
            {t("+ Neue Gruppe")}
          </Link>
        }
      >
        {t("Deine Gruppen")}
      </SectionTitle>

      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {groups.length === 0 ? (
          <EmptyState
            icon="👥"
            title={t("Noch keine Gruppe")}
            description={t("Gruppen bündeln alle Ausgaben einer WG, Reise oder Veranstaltung an einem Ort.")}
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
                  <span className="hint">{t("{anzahl} Einträge", { anzahl: group._count.expenses })}</span>
                </span>
              </span>
              <BalancePills balances={group.balances} />
            </Link>
          ))
        )}
      </div>

      {archived.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t("Archiv ({anzahl})", { anzahl: archived.length })}
          </summary>
          <p className="hint mt-2">
            {t(
              "Archivierte Gruppen bleiben vollständig erhalten und zählen weiter zu deinen Salden – sie stehen nur nicht mehr in der Liste oben.",
            )}
          </p>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {archived.map((group) => (
              <Link
                key={group.id}
                href={`/gruppen/${group.id}`}
                className="flex items-center gap-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="text-2xl opacity-60" aria-hidden>
                  {groupTypeOf(group.type).icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-600 dark:text-slate-300">{group.name}</span>
                  <span className="hint">
                    {t("{anzahl} Einträge", { anzahl: group._count.expenses })} · {t("archiviert")}
                  </span>
                </span>
                <BalancePills balances={group.balances} />
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

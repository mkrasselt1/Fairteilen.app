import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getFriendsWithBalances } from "@/lib/data";
import { Avatar, BalancePills, EmptyState, SectionTitle } from "@/components/ui";
import { AddFriendForm } from "./add-friend-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Freunde") };
}
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const user = await requireUser();
  const friends = await getFriendsWithBalances(user.id);
  const t = await getT();

  return (
    <div className="space-y-6">
      <SectionTitle>{t("Freunde & Kontakte")}</SectionTitle>

      <section className="card p-5">
        <AddFriendForm />
      </section>

      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {friends.length === 0 ? (
          <EmptyState
            icon="🧑‍🤝‍🧑"
            title={t("Noch keine Kontakte")}
            description={t(
              "Füge Personen über ihre E-Mail-Adresse hinzu – oder lade sie mit einem Gruppenlink ein.",
            )}
          />
        ) : (
          friends.map((entry) => (
            <Link
              key={entry.user.id}
              href={`/freunde/${entry.user.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <Avatar user={entry.user} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{entry.user.name}</span>
                <span className="hint block truncate">
                  {entry.user.isGuest ? t("ohne Konto") : entry.user.email}
                </span>
              </span>
              <BalancePills balances={entry.balances} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

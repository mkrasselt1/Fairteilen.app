import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActivity } from "@/lib/data";
import { parsePayload } from "@/lib/social";
import { relativeTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { Avatar, EmptyState } from "@/components/ui";
import { getI18n } from "@/lib/i18n-server";
import type { Translate } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("Aktivität") };
}
export const dynamic = "force-dynamic";

function describe(
  type: string,
  actor: string,
  payload: Record<string, unknown>,
  t: Translate,
  intlLocale: string,
): { icon: string; text: string } {
  const betrag =
    typeof payload.amountCents === "number" && typeof payload.currency === "string"
      ? formatMoney(payload.amountCents, payload.currency, intlLocale)
      : "";
  const titel = typeof payload.description === "string" ? payload.description : "";
  const name = String(payload.name ?? "");

  switch (type) {
    case "expense_added":
      return {
        icon: payload.recurring ? "🔁" : "🧾",
        text: t("{actor} hat „{titel}“ über {betrag} hinzugefügt.", { actor, titel, betrag }),
      };
    case "expense_updated":
      return { icon: "✏️", text: t("{actor} hat „{titel}“ bearbeitet ({betrag}).", { actor, titel, betrag }) };
    case "expense_deleted":
      return { icon: "🗑️", text: t("{actor} hat „{titel}“ gelöscht.", { actor, titel }) };
    case "payment_added":
      return {
        icon: "💸",
        text: t("{actor} hat notiert: {von} → {an}, {betrag}.", {
          actor,
          von: String(payload.from ?? ""),
          an: String(payload.to ?? ""),
          betrag,
        }),
      };
    case "payment_deleted":
      return { icon: "↩️", text: t("{actor} hat eine Zahlung gelöscht.", { actor }) };
    case "group_created":
      return { icon: "👥", text: t("{actor} hat die Gruppe „{name}“ erstellt.", { actor, name }) };
    case "guest_added":
      return { icon: "🪑", text: t("{actor} hat „{name}“ ohne Konto hinzugefügt.", { actor, name }) };
    case "guest_claimed":
      return {
        icon: "🤝",
        text: t("{actor} hat den Platz von „{name}“ übernommen.", {
          actor,
          name: String(payload.guestName ?? ""),
        }),
      };
    case "group_carried_over":
      return {
        icon: "↪️",
        text: t("{actor} hat „{name}“ in „{ziel}“ fortgesetzt.", {
          actor,
          name,
          ziel: String(payload.target ?? ""),
        }),
      };
    case "group_archived":
      return { icon: "📦", text: t("{actor} hat „{name}“ archiviert.", { actor, name }) };
    case "group_restored":
      return { icon: "📂", text: t("{actor} hat „{name}“ aus dem Archiv geholt.", { actor, name }) };
    case "member_joined":
      return { icon: "🙋", text: t("{actor} ist der Gruppe beigetreten.", { actor: name || actor }) };
    case "member_left":
      return { icon: "👋", text: t("{actor} hat die Gruppe verlassen.", { actor: name || actor }) };
    case "comment_added":
      return {
        icon: "💬",
        text: t("{actor} hat „{titel}“ kommentiert: {text}", {
          actor,
          titel,
          text: String(payload.body ?? ""),
        }),
      };
    default:
      return { icon: "•", text: t("{actor} hat etwas geändert.", { actor }) };
  }
}

export default async function ActivityPage() {
  const user = await requireUser();
  const activities = await getActivity(user.id);
  const { t, intlLocale } = await getI18n();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("Aktivität")}</h1>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {activities.length === 0 ? (
          <EmptyState
            icon="🔔"
            title={t("Noch nichts passiert")}
            description={t("Sobald du oder andere Ausgaben erfassen, siehst du hier den Verlauf.")}
          />
        ) : (
          activities.map((activity) => {
            const payload = parsePayload(activity.payload);
            const actorName = activity.actorId === user.id ? t("Du") : activity.actor.name;
            const { icon, text } = describe(activity.type, actorName, payload, t, intlLocale);
            const href = activity.expenseId
              ? `/ausgaben/${activity.expenseId}`
              : activity.groupId
                ? `/gruppen/${activity.groupId}`
                : "/uebersicht";
            return (
              <Link
                key={activity.id}
                href={href}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="relative">
                  <Avatar user={activity.actor} size={34} />
                  <span className="absolute -bottom-1 -right-1 text-sm" aria-hidden>
                    {icon}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{text}</span>
                  <span className="hint block">
                    {activity.group ? `${activity.group.name} · ` : ""}
                    {relativeTime(activity.createdAt, intlLocale)}
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActivity } from "@/lib/data";
import { parsePayload } from "@/lib/social";
import { relativeTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { Avatar, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Aktivität" };
export const dynamic = "force-dynamic";

function describe(
  type: string,
  actor: string,
  payload: Record<string, unknown>,
): { icon: string; text: string } {
  const amount =
    typeof payload.amountCents === "number" && typeof payload.currency === "string"
      ? formatMoney(payload.amountCents, payload.currency)
      : "";
  const description = typeof payload.description === "string" ? payload.description : "";

  switch (type) {
    case "expense_added":
      return {
        icon: payload.recurring ? "🔁" : "🧾",
        text: `${actor} hat „${description}“ über ${amount} hinzugefügt.`,
      };
    case "expense_updated":
      return { icon: "✏️", text: `${actor} hat „${description}“ bearbeitet (${amount}).` };
    case "expense_deleted":
      return { icon: "🗑️", text: `${actor} hat „${description}“ gelöscht.` };
    case "payment_added":
      return { icon: "💸", text: `${actor} hat notiert: ${payload.from} → ${payload.to}, ${amount}.` };
    case "payment_deleted":
      return { icon: "↩️", text: `${actor} hat eine Zahlung gelöscht.` };
    case "group_created":
      return { icon: "👥", text: `${actor} hat die Gruppe „${payload.name}“ erstellt.` };
    case "guest_added":
      return { icon: "🪑", text: `${actor} hat „${payload.name}“ ohne Konto hinzugefügt.` };
    case "guest_claimed":
      return { icon: "🤝", text: `${actor} hat den Platz von „${payload.guestName}“ übernommen.` };
    case "group_archived":
      return { icon: "📦", text: `${actor} hat „${payload.name}“ archiviert.` };
    case "group_restored":
      return { icon: "📂", text: `${actor} hat „${payload.name}“ aus dem Archiv geholt.` };
    case "member_joined":
      return { icon: "🙋", text: `${payload.name ?? actor} ist der Gruppe beigetreten.` };
    case "member_left":
      return { icon: "👋", text: `${payload.name ?? actor} hat die Gruppe verlassen.` };
    case "comment_added":
      return { icon: "💬", text: `${actor} hat „${description}“ kommentiert: ${payload.body}` };
    default:
      return { icon: "•", text: `${actor} hat etwas geändert.` };
  }
}

export default async function ActivityPage() {
  const user = await requireUser();
  const activities = await getActivity(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Aktivität</h1>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {activities.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Noch nichts passiert"
            description="Sobald du oder andere Ausgaben erfassen, siehst du hier den Verlauf."
          />
        ) : (
          activities.map((activity) => {
            const payload = parsePayload(activity.payload);
            const actorName = activity.actorId === user.id ? "Du" : activity.actor.name;
            const { icon, text } = describe(activity.type, actorName, payload);
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
                    {relativeTime(activity.createdAt)}
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

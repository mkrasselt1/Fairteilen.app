import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/ui";
import { CopyButton, ConfirmForm } from "@/components/forms";
import { deleteGroupAction, leaveGroupAction } from "@/actions/groups";
import {
  GroupSettingsForm,
  AddMemberForm,
  AddGuestForm,
  RegenerateInviteForm,
  ArchiveForm,
  CarryOverForm,
  PublicSharingForm,
} from "./forms";

export const metadata: Metadata = { title: "Gruppeneinstellungen" };
export const dynamic = "force-dynamic";

export default async function GroupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, members: { some: { userId: user.id } } },
    include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
  });
  if (!group) notFound();

  const shares = await prisma.expenseShare.findMany({
    where: { expense: { groupId: group.id, deletedAt: null } },
    select: { userId: true, paidCents: true, oweCents: true, expense: { select: { currency: true } } },
  });
  const balanceOf = (userId: string) => {
    const perCurrency = new Map<string, number>();
    for (const share of shares) {
      if (share.userId !== userId) continue;
      const currency = share.expense.currency;
      perCurrency.set(currency, (perCurrency.get(currency) ?? 0) + share.paidCents - share.oweCents);
    }
    return [...perCurrency.entries()].filter(([, v]) => v !== 0);
  };

  const isOwner = group.members.find((m) => m.userId === user.id)?.role === "owner";
  const inviteUrl = `${await baseUrl()}/beitreten/${group.inviteToken}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/gruppen/${group.id}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Zurück zur Gruppe
      </Link>
      <h1 className="text-2xl font-bold">Einstellungen · {group.name}</h1>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Allgemein</h2>
        <GroupSettingsForm
          group={{
            id: group.id,
            name: group.name,
            type: group.type,
            currency: group.currency,
            simplifyDebts: group.simplifyDebts,
          }}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">Einladungslink</h2>
        <p className="hint mb-3">
          Alle mit diesem Link können der Gruppe beitreten. Teile ihn nur mit Personen, die dazugehören sollen.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={inviteUrl} className="input flex-1 min-w-[16rem] font-mono text-xs" />
          <CopyButton value={inviteUrl} />
        </div>
        <div className="mt-3">
          <RegenerateInviteForm groupId={group.id} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Mitglieder</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {group.members.map((member) => {
            const balances = balanceOf(member.userId);
            return (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar user={member.user} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {member.userId === user.id ? "Du" : member.user.name}
                    {member.role === "owner" && <span className="chip ml-2">Verwaltung</span>}
                  </span>
                  <span className="hint block truncate">
                    {member.user.isGuest ? "ohne Konto" : member.user.email}
                  </span>
                </span>
                <span className="text-right text-sm">
                  {balances.length === 0 ? (
                    <span className="hint">ausgeglichen</span>
                  ) : (
                    balances.map(([currency, value]) => (
                      <span
                        key={currency}
                        className={`block font-semibold tabular-nums ${value > 0 ? "positive" : "negative"}`}
                      >
                        {value > 0 ? "+" : "−"}
                        {formatMoney(Math.abs(value), currency)}
                      </span>
                    ))
                  )}
                </span>
                {isOwner && member.userId !== user.id && (
                  <ConfirmForm
                    action={leaveGroupAction}
                    hidden={{ groupId: group.id, userId: member.userId }}
                    confirm={`${member.user.name} wirklich aus der Gruppe entfernen?`}
                    className="btn-ghost !px-2 !py-1 text-xs"
                    pendingLabel="…"
                  >
                    Entfernen
                  </ConfirmForm>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-5">
          <AddMemberForm groupId={group.id} />
          <AddGuestForm groupId={group.id} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Ohne Konto mitarbeiten lassen</h2>
        <p className="hint mb-3">
          {group.publicToken
            ? "Alle mit diesem Link können Ausgaben eintragen und den Stand sehen, ohne sich anzumelden."
            : "Wenn nicht alle ein Konto anlegen möchten: Mit einem gemeinsamen Link kann jede Person mitarbeiten, die ihn hat."}
        </p>
        {group.publicToken && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={`${await baseUrl()}/gemeinsam/${group.publicToken}`}
              className="input flex-1 min-w-[16rem] font-mono text-xs"
            />
            <CopyButton value={`${await baseUrl()}/gemeinsam/${group.publicToken}`} />
          </div>
        )}
        <PublicSharingForm groupId={group.id} enabled={group.publicToken !== null} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Fortsetzen</h2>
        <p className="hint mb-4">
          Für dieselben Leute weitermachen, ohne alles Alte mitzuschleppen: Die offenen Beträge
          werden hier glattgestellt und erscheinen in der neuen Gruppe als Übertrag. Niemand verliert
          dadurch einen Anspruch, und beide Abrechnungen bleiben für sich nachvollziehbar.
        </p>
        <CarryOverForm groupId={group.id} groupName={group.name} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Archiv</h2>
        <p className="hint mb-3">
          {group.archivedAt
            ? "Diese Gruppe liegt im Archiv. Sie ist weiterhin nutzbar und zählt zu den Salden."
            : "Abgeschlossene Abrechnungen kannst du archivieren: Sie verschwinden aus der Gruppenliste, bleiben aber vollständig erhalten und zählen weiter zu den Salden."}
        </p>
        <ArchiveForm groupId={group.id} archived={group.archivedAt !== null} />
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-rose-600 dark:text-rose-400">Gefahrenzone</h2>
        <ConfirmForm
          action={leaveGroupAction}
          hidden={{ groupId: group.id, userId: user.id }}
          confirm="Möchtest du die Gruppe wirklich verlassen?"
          className="btn-secondary"
        >
          Gruppe verlassen
        </ConfirmForm>
        {isOwner && (
          <ConfirmForm
            action={deleteGroupAction}
            hidden={{ groupId: group.id }}
            confirm="Die Gruppe und alle darin erfassten Ausgaben werden endgültig gelöscht. Fortfahren?"
            className="btn-danger"
          >
            Gruppe endgültig löschen
          </ConfirmForm>
        )}
      </section>
    </div>
  );
}

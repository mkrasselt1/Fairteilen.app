import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui";
import { ChangePasswordForm, DeleteAccountForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Konto" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const [groupCount, expenseCount] = await Promise.all([
    prisma.groupMember.count({ where: { userId: user.id } }),
    prisma.expenseShare.count({ where: { userId: user.id, expense: { deletedAt: null } } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar user={user} size={56} />
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="hint">
            {user.email} · {groupCount} Gruppen · {expenseCount} Einträge
          </p>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Profil</h2>
        <ProfileForm user={user} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Passwort ändern</h2>
        <ChangePasswordForm />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">Daten</h2>
        <p className="hint mb-3">
          Du kannst jederzeit alle deine Ausgaben als CSV-Datei herunterladen.
        </p>
        <Link href="/export" className="btn-secondary">
          Zum Export
        </Link>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold text-rose-600 dark:text-rose-400">Konto löschen</h2>
        <p className="hint mb-3">
          Das Konto kann nur gelöscht werden, wenn alle Salden ausgeglichen sind. Alle Daten werden dabei
          unwiderruflich entfernt.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}

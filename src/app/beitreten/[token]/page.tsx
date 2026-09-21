import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupTypeOf } from "@/lib/categories";
import { AvatarStack } from "@/components/ui";
import { JoinForm } from "./join-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Gruppe beitreten"), robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const group = await prisma.group.findUnique({
    where: { inviteToken: token },
    include: { members: { include: { user: true } }, createdBy: true },
  });
  if (!group) notFound();

  const user = await getCurrentUser();
  const alreadyMember = user ? group.members.some((m) => m.userId === user.id) : false;
  const next = encodeURIComponent(`/beitreten/${token}`);
  const t = await getT();

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="card w-full max-w-md space-y-5 p-6 text-center">
        <p className="flex items-center justify-center gap-2 font-bold text-brand-600 dark:text-brand-400">
          <span aria-hidden>🤝</span> Fairteilen
        </p>
        <div className="space-y-2">
          <div className="text-4xl" aria-hidden>
            {groupTypeOf(group.type).icon}
          </div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("{name} lädt dich in diese Gruppe ein.", { name: group.createdBy.name })}
          </p>
        </div>

        <div className="flex justify-center">
          <AvatarStack users={group.members.map((m) => m.user)} size={32} max={8} />
        </div>

        {alreadyMember ? (
          <Link href={`/gruppen/${group.id}`} className="btn-primary w-full">
            {t("Zur Gruppe")}
          </Link>
        ) : user ? (
          <JoinForm
            token={token}
            guests={group.members
              .filter((member) => member.user.isGuest)
              .map((member) => ({ id: member.user.id, name: member.user.name }))}
          />
        ) : (
          <div className="space-y-2">
            <Link href={`/registrieren?next=${next}`} className="btn-primary w-full">
              {t("Konto erstellen und beitreten")}
            </Link>
            <Link href={`/anmelden?next=${next}`} className="btn-secondary w-full">
              {t("Ich habe schon ein Konto")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { NewGroupForm } from "./new-group-form";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Neue Gruppe") };
}

export default async function NewGroupPage() {
  const user = await requireUser();
  const t = await getT();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{t("Neue Gruppe")}</h1>
      <NewGroupForm defaultCurrency={user.currency} />
    </div>
  );
}

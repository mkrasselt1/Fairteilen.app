import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { NewGroupForm } from "./new-group-form";

export const metadata: Metadata = { title: "Neue Gruppe" };

export default async function NewGroupPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Neue Gruppe</h1>
      <NewGroupForm defaultCurrency={user.currency} />
    </div>
  );
}

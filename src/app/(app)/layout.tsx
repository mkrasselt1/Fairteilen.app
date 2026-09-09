import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { BottomNav, FloatingAddButton, TopBar } from "@/components/nav";

// Angemeldete Bereiche enthalten persönliche Daten und gehören nicht in Suchmaschinen.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <TopBar user={user} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-12">{children}</main>
      <FloatingAddButton />
      <BottomNav />
    </div>
  );
}

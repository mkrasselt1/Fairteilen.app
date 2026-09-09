import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/data";

export const metadata: Metadata = { title: "Export" };
export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const user = await requireUser();
  const groups = await getUserGroups(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Daten exportieren</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Alle Exporte sind CSV-Dateien mit Semikolon als Trennzeichen – sie lassen sich direkt in Excel,
        LibreOffice oder Google Tabellen öffnen.
      </p>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold">Alles</h2>
        <p className="hint mb-3">Jede Ausgabe, an der du beteiligt bist – mit allen Anteilen.</p>
        <a href="/api/export/alle" className="btn-primary">
          Gesamt-Export herunterladen
        </a>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Einzelne Gruppen</h2>
        {groups.length === 0 ? (
          <p className="hint">Du bist noch in keiner Gruppe.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate text-sm font-medium">{group.name}</span>
                <a
                  href={`/api/export/gruppe/${group.id}`}
                  className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  CSV
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

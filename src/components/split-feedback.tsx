import { formatMoney } from "@/lib/money";
import { colorForId } from "@/lib/format";
import type { SplitAnalysis } from "@/lib/split-ui";
import type { SplitType } from "@/lib/split";

function formatPercent(bps: number): string {
  const percent = bps / 100;
  return `${(Number.isInteger(percent) ? String(percent) : percent.toFixed(2)).replace(".", ",")} %`;
}

/**
 * Balken über alle Beteiligten plus Statuszeile: zeigt auf einen Blick, ob der
 * Betrag vollständig, noch nicht ganz oder zu viel verteilt ist.
 */
export function SplitAllocationBar({
  analysis,
  order,
  amountCents,
  currency,
  splitType,
  percentBps,
  totalShares,
}: {
  analysis: SplitAnalysis;
  order: { id: string; name: string; avatarColor?: string | null }[];
  amountCents: number;
  currency: string;
  splitType: SplitType;
  percentBps: number;
  totalShares: number;
}) {
  if (analysis.state === "empty") {
    return (
      <p className="hint" role="status">
        Betrag eingeben und Personen auswählen – die Aufteilung erscheint dann hier.
      </p>
    );
  }

  // Maßstab so wählen, dass auch eine Überverteilung sichtbar bleibt.
  const scale = Math.max(amountCents, analysis.allocatedCents) || 1;
  const over = analysis.state === "over";

  const status =
    analysis.state === "ok"
      ? { tone: "positive", text: "Genau aufgeteilt" }
      : analysis.state === "under"
        ? {
            tone: "text-amber-600 dark:text-amber-400",
            text:
              splitType === "percent"
                ? `Es fehlen noch ${formatPercent(10000 - percentBps)}`
                : `Es fehlen noch ${formatMoney(analysis.remainingCents, currency)}`,
          }
        : {
            tone: "negative",
            text:
              splitType === "percent"
                ? `${formatPercent(percentBps - 10000)} zu viel`
                : `${formatMoney(-analysis.remainingCents, currency)} zu viel`,
          };

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div
        className={`relative flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${
          over ? "ring-2 ring-rose-400" : ""
        }`}
      >
        {order.map((person) => {
          const cents = analysis.perUser.get(person.id) ?? 0;
          if (cents <= 0) return null;
          return (
            <span
              key={person.id}
              className="h-full"
              style={{
                width: `${(cents / scale) * 100}%`,
                backgroundColor: person.avatarColor || colorForId(person.id),
              }}
              title={`${person.name}: ${formatMoney(cents, currency)}`}
            />
          );
        })}
        {over && (
          // Markierung, wo der Gesamtbetrag erreicht wäre.
          <span
            className="absolute top-0 h-full w-0.5 bg-slate-900 dark:bg-white"
            style={{ left: `${(amountCents / scale) * 100}%` }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className={`font-medium ${status.tone}`}>
          {analysis.state === "ok" && <span aria-hidden>✓ </span>}
          {status.text}
        </span>
        <span className="hint tabular-nums">
          {splitType === "percent"
            ? `${formatPercent(percentBps)} von 100 %`
            : splitType === "shares"
              ? `${totalShares} ${totalShares === 1 ? "Anteil" : "Anteile"} · ${formatMoney(amountCents, currency)}`
              : `${formatMoney(analysis.allocatedCents, currency)} von ${formatMoney(amountCents, currency)}`}
        </span>
      </div>
    </div>
  );
}

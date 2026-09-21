"use client";

import { formatMoney } from "@/lib/money";
import { colorForId } from "@/lib/format";
import type { SplitAnalysis } from "@/lib/split-ui";
import type { SplitType } from "@/lib/split";
import { useIntlLocale, useT } from "@/components/i18n";

function formatPercent(bps: number, intlLocale: string): string {
  const percent = bps / 100;
  return `${new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: Number.isInteger(percent) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(percent)} %`;
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
  const t = useT();
  const intlLocale = useIntlLocale();

  if (analysis.state === "empty") {
    return (
      <p className="hint" role="status">
        {t("Betrag eingeben und Personen auswählen – die Aufteilung erscheint dann hier.")}
      </p>
    );
  }

  // Maßstab so wählen, dass auch eine Überverteilung sichtbar bleibt.
  const scale = Math.max(amountCents, analysis.allocatedCents) || 1;
  const over = analysis.state === "over";

  const status =
    analysis.state === "ok"
      ? { tone: "positive", text: t("Genau aufgeteilt") }
      : analysis.state === "under"
        ? {
            tone: "text-amber-600 dark:text-amber-400",
            text: t("Es fehlen noch {rest}", {
              rest:
                splitType === "percent"
                  ? formatPercent(10000 - percentBps, intlLocale)
                  : formatMoney(analysis.remainingCents, currency, intlLocale),
            }),
          }
        : {
            tone: "negative",
            text: t("{zuviel} zu viel", {
              zuviel:
                splitType === "percent"
                  ? formatPercent(percentBps - 10000, intlLocale)
                  : formatMoney(-analysis.remainingCents, currency, intlLocale),
            }),
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
              title={`${person.name}: ${formatMoney(cents, currency, intlLocale)}`}
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
            ? t("{prozent} von 100 %", { prozent: formatPercent(percentBps, intlLocale) })
            : splitType === "shares"
              ? `${
                  totalShares === 1
                    ? t("{anzahl} Anteil", { anzahl: totalShares })
                    : t("{anzahl} Anteile", { anzahl: totalShares })
                } · ${formatMoney(amountCents, currency, intlLocale)}`
              : t("{verteilt} von {gesamt}", {
                  verteilt: formatMoney(analysis.allocatedCents, currency, intlLocale),
                  gesamt: formatMoney(amountCents, currency, intlLocale),
                })}
        </span>
      </div>
    </div>
  );
}

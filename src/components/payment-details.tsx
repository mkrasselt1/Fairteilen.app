"use client";

import { useState } from "react";
import { formatIban, type PaymentDetails } from "@/lib/payment";

function CopyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-all font-mono text-sm">{value}</span>
      {hint && <span className="hint w-full sm:w-auto">{hint}</span>}
      <button
        type="button"
        className="btn-ghost !px-2 !py-1 text-xs"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* Ohne Zwischenablage bleibt der Wert zum Markieren stehen. */
          }
        }}
      >
        {copied ? "Kopiert ✓" : "Kopieren"}
      </button>
    </div>
  );
}

/** Zeigt, wohin überwiesen werden kann – ohne Anbindung an einen Zahlungsdienst. */
export function PaymentDetailsCard({ name, details }: { name: string; details: PaymentDetails }) {
  const empty = !details.iban && !details.weroContact && !details.paypalEmail && !details.paymentNote;

  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <p className="text-sm font-medium">So erreichst du {name}</p>
      {empty ? (
        <p className="hint mt-1">
          {name} hat noch keine Zahlungsangaben hinterlegt. Fragt am besten direkt nach.
        </p>
      ) : (
        <div className="mt-1 divide-y divide-slate-200 dark:divide-slate-700">
          {details.weroContact && (
            <CopyRow label="Wero" value={details.weroContact} hint="in der Banking-App" />
          )}
          {details.iban && <CopyRow label="IBAN" value={formatIban(details.iban)} />}
          {details.paypalEmail && <CopyRow label="PayPal" value={details.paypalEmail} />}
          {details.paymentNote && (
            <p className="whitespace-pre-wrap py-2 text-sm text-slate-600 dark:text-slate-300">
              {details.paymentNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

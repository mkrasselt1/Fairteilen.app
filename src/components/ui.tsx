"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { colorForId, initialsOf } from "@/lib/format";
import { useIntlLocale, useT } from "@/components/i18n";

export function Avatar({
  user,
  size = 40,
}: {
  user: { id: string; name: string; avatarColor?: string | null };
  size?: number;
}) {
  const color = user.avatarColor || colorForId(user.id);
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.max(11, size * 0.38) }}
      title={user.name}
      aria-hidden
    >
      {initialsOf(user.name)}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 5,
  size = 26,
}: {
  users: { id: string; name: string; avatarColor?: string | null }[];
  max?: number;
  size?: number;
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((user) => (
        <span key={user.id} className="-ml-2 rounded-full ring-2 ring-white first:ml-0 dark:ring-slate-900">
          <Avatar user={user} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="-ml-2 inline-flex items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700 ring-2 ring-white dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-900"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

export function Money({
  cents,
  currency,
  signed = false,
  className = "",
}: {
  cents: number;
  currency: string;
  signed?: boolean;
  className?: string;
}) {
  const intlLocale = useIntlLocale();
  const tone = !signed ? "" : cents > 0 ? "positive" : cents < 0 ? "negative" : "";
  return (
    <span className={`tabular-nums ${tone} ${className}`}>
      {formatMoney(signed ? Math.abs(cents) : cents, currency, intlLocale)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-1">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

export function BalancePills({
  balances,
  emptyLabel,
}: {
  balances: { currency: string; amountCents: number }[];
  emptyLabel?: string;
}) {
  const t = useT();
  const intlLocale = useIntlLocale();

  if (balances.length === 0) {
    return (
      <span className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel ?? t("ausgeglichen")}</span>
    );
  }
  return (
    <span className="flex flex-col items-end gap-0.5">
      {balances.map((b) => (
        <span key={b.currency} className="flex flex-col items-end">
          <span className={`text-sm font-semibold ${b.amountCents > 0 ? "positive" : "negative"}`}>
            {formatMoney(Math.abs(b.amountCents), b.currency, intlLocale)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {b.amountCents > 0 ? t("bekommst du") : t("schuldest du")}
          </span>
        </span>
      ))}
    </span>
  );
}

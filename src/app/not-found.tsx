import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden>
        🤷
      </p>
      <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Diese Seite gibt es nicht – oder du hast keinen Zugriff darauf.
      </p>
      <Link href="/" className="btn-primary">
        Zur Übersicht
      </Link>
    </div>
  );
}

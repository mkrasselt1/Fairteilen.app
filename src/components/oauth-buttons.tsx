import { configuredProviders } from "@/lib/oauth";
import { getT } from "@/lib/i18n-server";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.3-10.2 7.3-17.7z"
      />
      <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden focusable="false">
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.5 0 2 .8 3.3.8 1.4 0 2.2-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.6-1-2.6-4zM14 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" />
    </svg>
  );
}

/** Anmeldeknöpfe – erscheinen nur, wenn der jeweilige Anbieter eingerichtet ist. */
export async function OAuthButtons({
  next = "/uebersicht",
  intent = "login",
}: {
  next?: string;
  intent?: "login" | "link";
}) {
  const t = await getT();
  const providers = configuredProviders();
  if (providers.length === 0) return null;

  const query = `?next=${encodeURIComponent(next)}`;

  return (
    <div className="space-y-3">
      {intent === "login" && (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs uppercase tracking-wide text-slate-400">{t("oder")}</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
      )}
      <div className="grid gap-2">
        {providers.map((provider) =>
          provider.id === "google" ? (
            <a key={provider.id} href={`/api/auth/google${query}`} className="btn-secondary w-full">
              <GoogleMark />
              {intent === "link" ? t("Google-Konto verknüpfen") : t("Mit Google anmelden")}
            </a>
          ) : (
            <a
              key={provider.id}
              href={`/api/auth/apple${query}`}
              className="btn w-full bg-black text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
            >
              <AppleMark />
              {intent === "link" ? t("Apple-Konto verknüpfen") : t("Mit Apple anmelden")}
            </a>
          ),
        )}
      </div>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { joinSharedBoardAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/ui";
import { useT } from "@/components/i18n";

/** Beim ersten Öffnen eines geteilten Links: Wer bist du? */
export function WhoAreYouForm({
  token,
  members,
  loggedInName,
}: {
  token: string;
  members: { id: string; name: string; avatarColor: string }[];
  loggedInName: string | null;
}) {
  const t = useT();
  const [state, formAction] = useActionState(joinSharedBoardAction, null);
  const [choice, setChoice] = useState<string>("");

  if (loggedInName) {
    return (
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("Du bist als {name} angemeldet und trittst mit diesem Konto bei.", { name: loggedInName })}
        </p>
        <SubmitButton className="btn-primary w-full" pendingLabel={t("Einen Moment …")}>
          {t("Mitmachen")}
        </SubmitButton>
        <FormAlert state={state} />
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {members.length > 0 && (
        <div>
          <span className="label">{t("Bist du schon dabei?")}</span>
          <ul className="space-y-1.5">
            {members.map((member) => (
              <li key={member.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    choice === member.id
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="personId"
                    value={member.id}
                    checked={choice === member.id}
                    onChange={() => setChoice(member.id)}
                    className="h-4 w-4 border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <Avatar user={member} size={30} />
                  <span className="text-sm font-medium">{t("Ich bin {name}", { name: member.name })}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="label" htmlFor="own-name">
          {members.length > 0 ? t("… oder neu dazukommen") : t("Wie heißt du?")}
        </label>
        <input
          id="own-name"
          name="name"
          maxLength={80}
          className="input"
          placeholder={t("Dein Name")}
          onChange={() => setChoice("")}
          onFocus={() => setChoice("")}
        />
        <p className="hint mt-1">
          {t(
            "Nur dieser Name wird gespeichert. Ein Konto brauchst du nicht – dein Browser merkt sich, wer du hier bist.",
          )}
        </p>
      </div>

      <FormAlert state={state} />
      <SubmitButton className="btn-primary w-full" pendingLabel={t("Einen Moment …")}>
        {t("Los geht's")}
      </SubmitButton>
    </form>
  );
}

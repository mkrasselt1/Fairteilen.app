"use client";

import { useActionState, useState } from "react";
import { claimGuestAction, joinGroupAction } from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";

export function JoinForm({
  token,
  guests,
}: {
  token: string;
  guests: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(joinGroupAction, null);
  const [claimState, claimAction] = useActionState(claimGuestAction, null);
  const [claimId, setClaimId] = useState<string>("");

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <SubmitButton className="btn-primary w-full" pendingLabel="Beitreten …">
          Als neue Person beitreten
        </SubmitButton>
        <FormAlert state={state} />
      </form>

      {guests.length > 0 && (
        <form action={claimAction} className="space-y-2 rounded-xl border border-dashed border-slate-300 p-4 text-left dark:border-slate-700">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm font-medium">Bist du schon eingetragen?</p>
          <p className="hint">
            Jemand hat dich ohne Konto in die Gruppe aufgenommen. Übernimm deinen Platz – alle
            bisherigen Ausgaben und Salden gehen auf dein Konto über.
          </p>
          <select
            name="guestId"
            value={claimId}
            onChange={(event) => setClaimId(event.target.value)}
            className="input"
            required
          >
            <option value="">Bitte auswählen …</option>
            {guests.map((guest) => (
              <option key={guest.id} value={guest.id}>
                Ich bin {guest.name}
              </option>
            ))}
          </select>
          <SubmitButton className="btn-secondary w-full" pendingLabel="Wird übernommen …">
            Platz übernehmen
          </SubmitButton>
          <FormAlert state={claimState} />
        </form>
      )}
    </div>
  );
}

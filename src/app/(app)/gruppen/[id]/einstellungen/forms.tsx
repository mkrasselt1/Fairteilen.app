"use client";

import { useActionState } from "react";
import {
  addGuestAction,
  carryOverGroupAction,
  addMemberAction,
  regenerateInviteAction,
  setGroupArchivedAction,
  setPublicSharingAction,
  updateGroupAction,
} from "@/actions/groups";
import { FormAlert, SubmitButton } from "@/components/forms";
import { GROUP_TYPES } from "@/lib/categories";
import { CURRENCIES } from "@/lib/money";

export function GroupSettingsForm({
  group,
}: {
  group: { id: string; name: string; type: string; currency: string; simplifyDebts: boolean };
}) {
  const [state, formAction] = useActionState(updateGroupAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={group.id} />
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" defaultValue={group.name} required maxLength={80} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">
            Art
          </label>
          <select id="type" name="type" defaultValue={group.type} className="input">
            {GROUP_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="currency">
            Währung
          </label>
          <select id="currency" name="currency" defaultValue={group.currency} className="input">
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} – {currency.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="simplifyDebts"
          defaultChecked={group.simplifyDebts}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          <span className="font-medium">Schulden vereinfachen</span>
          <span className="hint block">Reduziert die nötigen Überweisungen auf ein Minimum.</span>
        </span>
      </label>
      <FormAlert state={state} />
      <SubmitButton className="btn-primary">Speichern</SubmitButton>
    </form>
  );
}

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(addMemberAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="label" htmlFor="member-email">
        Person mit Konto hinzufügen
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="member-email"
          name="email"
          type="email"
          required
          className="input flex-1 min-w-[14rem]"
          placeholder="name@example.com"
        />
        <SubmitButton className="btn-secondary" pendingLabel="…">
          Hinzufügen
        </SubmitButton>
      </div>
      <FormAlert state={state} />
    </form>
  );
}

export function RegenerateInviteForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(regenerateInviteAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <SubmitButton className="btn-ghost !px-0 text-sm" pendingLabel="…">
        Neuen Link erzeugen
      </SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}

export function ArchiveForm({ groupId, archived }: { groupId: string; archived: boolean }) {
  const [state, formAction] = useActionState(setGroupArchivedAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="archived" value={archived ? "false" : "true"} />
      <SubmitButton className="btn-secondary" pendingLabel="…">
        {archived ? "Aus dem Archiv holen" : "Gruppe archivieren"}
      </SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}

export function AddGuestForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(addGuestAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="label" htmlFor="guest-name">
        Person ohne Konto hinzufügen
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="guest-name"
          name="name"
          required
          maxLength={80}
          className="input flex-1 min-w-[14rem]"
          placeholder="z. B. Oma Gertrud"
        />
        <SubmitButton className="btn-secondary" pendingLabel="…">
          Hinzufügen
        </SubmitButton>
      </div>
      <p className="hint">
        Für alle, die kein Konto anlegen möchten. Sie zählen bei Ausgaben und Salden ganz normal mit
        und können später von einem echten Konto übernommen werden.
      </p>
      <FormAlert state={state} />
    </form>
  );
}

export function CarryOverForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [state, formAction] = useActionState(carryOverGroupAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <div>
        <label className="label" htmlFor="carry-name">
          Name der neuen Gruppe
        </label>
        <input
          id="carry-name"
          name="name"
          required
          maxLength={80}
          className="input"
          defaultValue={`${groupName} (Fortsetzung)`}
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="archiveOld"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />
        <span>
          <span className="font-medium">Diese Gruppe danach archivieren</span>
          <span className="hint block">Sie bleibt vollständig erhalten, steht aber nicht mehr in der Liste.</span>
        </span>
      </label>
      <FormAlert state={state} />
      <SubmitButton className="btn-secondary" pendingLabel="Wird übertragen …">
        Fortsetzung anlegen
      </SubmitButton>
    </form>
  );
}

export function PublicSharingForm({ groupId, enabled }: { groupId: string; enabled: boolean }) {
  const [state, formAction] = useActionState(setPublicSharingAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <SubmitButton className={enabled ? "btn-secondary" : "btn-primary"} pendingLabel="…">
        {enabled ? "Gemeinsamen Link abschalten" : "Gemeinsamen Link erstellen"}
      </SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}

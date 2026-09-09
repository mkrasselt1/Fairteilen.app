"use client";

import { useActionState } from "react";
import { addMemberAction, regenerateInviteAction, updateGroupAction } from "@/actions/groups";
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  registrationOpen,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { isSupportedCurrency } from "@/lib/money";
import { colorForId } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";
import { getT } from "@/lib/i18n-server";
import { deleteUpload } from "@/lib/uploads";
import { normalizeIban, validateIban, validateWeroContact } from "@/lib/payment";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  if (!registrationOpen()) {
    return { error: t("Die Registrierung ist auf dieser Instanz deaktiviert.") };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const currency = String(formData.get("currency") ?? "EUR");
  const next = String(formData.get("next") ?? "/uebersicht");

  if (name.length < 2) return { error: t("Bitte gib deinen Namen an.") };
  if (name.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };
  if (email.length > 180) return { error: t("Die E-Mail-Adresse ist zu lang.") };
  if (!EMAIL_RE.test(email)) return { error: t("Bitte gib eine gültige E-Mail-Adresse an.") };
  if (password.length < 8) return { error: t("Das Passwort muss mindestens 8 Zeichen lang sein.") };
  if (!isSupportedCurrency(currency)) return { error: t("Unbekannte Währung.") };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: t("Für diese E-Mail-Adresse gibt es bereits ein Konto.") };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(password), currency, avatarColor: colorForId(email) },
  });

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/uebersicht");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/uebersicht");

  const user = await prisma.user.findUnique({ where: { email }, include: { oauthAccounts: true } });
  if (user && !user.passwordHash && user.oauthAccounts.length > 0) {
    const providers = [...new Set(user.oauthAccounts.map((a) => (a.provider === "apple" ? "Apple" : "Google")))];
    return {
      error: t(
        "Dieses Konto ist mit {anbieter} verknüpft. Melde dich darüber an – ein Passwort kannst du danach in den Kontoeinstellungen setzen.",
        { anbieter: providers.join(` ${t("und")} `) },
      ),
    };
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: t("E-Mail-Adresse oder Passwort ist falsch.") };
  }

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/uebersicht");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/anmelden");
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const currency = String(formData.get("currency") ?? user.currency);

  if (name.length < 2) return { error: t("Bitte gib deinen Namen an.") };
  if (name.length > 80) return { error: t("Der Name darf höchstens 80 Zeichen lang sein.") };
  if (email.length > 180) return { error: t("Die E-Mail-Adresse ist zu lang.") };
  if (!EMAIL_RE.test(email)) return { error: t("Bitte gib eine gültige E-Mail-Adresse an.") };
  if (!isSupportedCurrency(currency)) return { error: t("Unbekannte Währung.") };

  const conflict = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
  if (conflict) return { error: t("Diese E-Mail-Adresse wird bereits verwendet.") };

  await prisma.user.update({ where: { id: user.id }, data: { name, email, currency } });
  revalidatePath("/", "layout");
  return { success: t("Profil gespeichert.") };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const sessionUser = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (next.length < 8) return { error: t("Das neue Passwort muss mindestens 8 Zeichen lang sein.") };
  if (next !== repeat) return { error: t("Die beiden neuen Passwörter stimmen nicht überein.") };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  // Konten aus Google-/Apple-Anmeldung haben noch kein Passwort und können eines setzen.
  if (user.passwordHash && !verifyPassword(current, user.passwordHash)) {
    return { error: t("Das aktuelle Passwort ist falsch.") };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  return { success: t("Passwort geändert.") };
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const sessionUser = await requireUser();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  if (user.passwordHash && !verifyPassword(password, user.passwordHash)) {
    return { error: t("Das Passwort ist falsch.") };
  }

  const shares = await prisma.expenseShare.findMany({
    where: { userId: user.id, expense: { deletedAt: null } },
    select: { paidCents: true, oweCents: true },
  });
  const open = shares.reduce((acc, s) => acc + s.paidCents - s.oweCents, 0);
  if (open !== 0) {
    return { error: t("Es bestehen noch offene Salden. Bitte gleiche zuerst alle Beträge aus.") };
  }

  const attachments = await prisma.attachment.findMany({
    where: { uploadedById: user.id },
    select: { storedName: true },
  });
  await prisma.user.delete({ where: { id: user.id } });
  for (const attachment of attachments) await deleteUpload(attachment.storedName);

  await destroySession();
  redirect("/anmelden");
}

export async function unlinkOAuthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const sessionUser = await requireUser();
  const provider = String(formData.get("provider") ?? "");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: { oauthAccounts: true },
  });

  const remaining = user.oauthAccounts.filter((account) => account.provider !== provider);
  if (!user.passwordHash && remaining.length === 0) {
    return { error: t("Setze zuerst ein Passwort – sonst könntest du dich nicht mehr anmelden.") };
  }

  await prisma.oAuthAccount.deleteMany({ where: { userId: user.id, provider } });
  revalidatePath("/konto");
  return { success: t("Verknüpfung entfernt.") };
}

export async function updatePaymentDetailsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT();
  const user = await requireUser();
  const iban = normalizeIban(String(formData.get("iban") ?? ""));
  const weroContact = String(formData.get("weroContact") ?? "").trim();
  const paypalEmail = String(formData.get("paypalEmail") ?? "").trim().toLowerCase();
  const paymentNote = String(formData.get("paymentNote") ?? "").trim();

  const ibanProblem = validateIban(iban);
  if (ibanProblem) return { error: t(ibanProblem) };

  const weroProblem = validateWeroContact(weroContact);
  if (weroProblem) return { error: t(weroProblem) };

  if (paypalEmail && !EMAIL_RE.test(paypalEmail)) {
    return { error: t("Bitte gib für PayPal eine gültige E-Mail-Adresse an.") };
  }
  if (paymentNote.length > 500) return { error: t("Der Hinweis darf höchstens 500 Zeichen lang sein.") };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      iban: iban || null,
      weroContact: weroContact || null,
      paypalEmail: paypalEmail || null,
      paymentNote: paymentNote || null,
    },
  });

  revalidatePath("/konto");
  return { success: t("Zahlungsangaben gespeichert.") };
}

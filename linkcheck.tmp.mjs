import { chromium } from "playwright";
const B = "http://localhost:3000";
const ok = [], fail = [];
const check = (n, c, x = "") => { (c ? ok : fail).push(n); console.log(`${c ? "✓" : "✗"} ${n}${c ? "" : " — " + x}`); };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
// Anna: legt die Abrechnung an, ganz ohne Konto
const anna = await browser.newPage({ viewport: { width: 900, height: 1200 } });
anna.on("pageerror", (e) => console.log("[pageerror anna]", e.message));

await anna.goto(`${B}/gemeinsam/start`);
await anna.fill("#name", "Wochenende in Prag");
await anna.fill("#ownName", "Anna");
await anna.fill("#others", "Ben\nClara");
await anna.getByRole("button", { name: "Abrechnung anlegen" }).click();
await anna.waitForURL(/\/gemeinsam\/(?!start)[^/]+$/, { timeout: 20000 });
const boardUrl = anna.url();
check("Abrechnung ohne Konto angelegt", /\/gemeinsam\//.test(boardUrl), boardUrl);

const board = (await anna.innerText("body")).replace(/\s+/g, " ");
check("Alle drei Personen sind dabei", board.includes("3 Personen") && board.includes("du bist Anna"), board.slice(0, 260));
check("Kein Anmeldezwang sichtbar", !board.includes("Anmelden"), board.slice(0, 200));

// Ausgabe eintragen
await anna.getByRole("link", { name: "Ausgabe hinzufügen" }).first().click();
await anna.waitForURL(/\/ausgabe\/neu$/, { timeout: 15000 });
check("Gruppenauswahl ist ausgeblendet", !(await anna.locator("#groupId-select").isVisible().catch(() => false)));
await anna.fill("#description", "Hotel");
await anna.fill("#amount", "300");
await anna.getByRole("button", { name: "Ausgabe speichern" }).click();
await anna.getByText("Hotel").first().waitFor({ timeout: 20000 });
const nachAusgabe = (await anna.innerText("body")).replace(/\s+/g, " ");
check("Zurück auf der gemeinsamen Seite", new URL(anna.url()).pathname === new URL(boardUrl).pathname, anna.url());
check("Ausgleich errechnet (2 × 100,00 €)", (nachAusgabe.match(/100,00/g) ?? []).length >= 2, nachAusgabe.slice(0, 400));

// Ben öffnet denselben Link in einem anderen Browser
const ctxBen = await browser.newContext();
const ben = await ctxBen.newPage();
ben.on("pageerror", (e) => console.log("[pageerror ben]", e.message));
await ben.goto(boardUrl);
await ben.waitForTimeout(400);
check("Fremder Browser fragt nach der Person", (await ben.innerText("body")).includes("Bist du schon dabei"), "");
await ben.locator('input[name="personId"]').nth(1).check();
await ben.getByRole("button", { name: "Los geht's" }).click();
// Die Weiterleitung führt auf dieselbe Adresse – deshalb auf den Inhalt warten.
await ben.getByText("du bist Ben").waitFor({ timeout: 20000 });
const benBoard = (await ben.innerText("body")).replace(/\s+/g, " ");
check("Ben arbeitet als Ben mit", benBoard.includes("du bist Ben"), benBoard.slice(0, 250));
check("Ben sieht Annas Ausgabe", benBoard.includes("Hotel"), benBoard.slice(0, 300));
check("Ben sieht seine Schuld", /Du zahlst|du schuldest/i.test(benBoard), benBoard.slice(0, 400));

// Ben trägt selbst etwas ein
await ben.goto(boardUrl + "/ausgabe/neu");
await ben.fill("#description", "Abendessen");
await ben.fill("#amount", "60");
await ben.getByRole("button", { name: "Ausgabe speichern" }).click();
await ben.getByText("Abendessen").first().waitFor({ timeout: 20000 });
check("Ben kann eintragen", (await ben.innerText("body")).includes("Abendessen"), "");

// Anna sieht es
await anna.reload();
await anna.waitForTimeout(400);
check("Anna sieht Bens Eintrag", (await anna.innerText("body")).includes("Abendessen"), "");

// Kommentieren über den Link
await ben.getByRole("link", { name: /Hotel/ }).first().click();
await ben.waitForURL(/\/ausgabe\//, { timeout: 15000 });
await ben.fill('textarea[name="body"]', "War das mit Frühstück?");
await ben.getByRole("button", { name: "Kommentieren" }).click();
await ben.waitForTimeout(1500);
check("Kommentar ohne Konto möglich", (await ben.innerText("body")).includes("War das mit Frühstück"), "");

// Fremde ohne Link kommen nicht rein
const ctxFremd = await browser.newContext();
const fremd = await ctxFremd.newPage();
const res = await fremd.goto(boardUrl.replace(/\/gemeinsam\/.*/, "/gemeinsam/voellig-erfunden"));
check("Falscher Link führt ins Leere", res.status() === 404, String(res.status()));

await anna.screenshot({ path: "/tmp/claude-0/-home-user-Fairteilen-app/8ff550ef-bcb1-50c5-99a2-8f72259e8585/scratchpad/board.png" });
await browser.close();
console.log(`\n${ok.length} bestanden, ${fail.length} fehlgeschlagen`);
process.exit(fail.length ? 1 : 0);

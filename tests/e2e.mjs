/**
 * Durchgängiger Test im echten Browser gegen eine laufende Instanz.
 *
 *   npm install --no-save playwright
 *   npm run build && npm start        # in einem zweiten Terminal
 *   npm run test:e2e                  # optional: BASE_URL=... setzen
 *
 * Der Test legt echte Konten und Gruppen an – bitte nur gegen eine
 * Testinstanz laufen lassen, nicht gegen Produktivdaten.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const stamp = Date.now();
const ok = [];
const fail = [];
function check(name, cond, extra = "") {
  (cond ? ok : fail).push(name + (cond ? "" : ` — ${extra}`));
  console.log(`${cond ? "✓" : "✗"} ${name}${cond ? "" : " — " + extra}`);
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
// Alle deutschen Prüfungen laufen bewusst in einem deutschen Browser – die
// Oberfläche richtet sich sonst nach der Sprache des Browsers.
const ctxMain = await browser.newContext({ locale: "de-DE" });
const page = await ctxMain.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
// Die App darf keine Browserdialoge mehr verwenden – Rückfragen laufen über Modale.
let nativeDialog = null;
page.on("dialog", async (d) => { nativeDialog = d.message(); await d.dismiss(); });

// 1. Gastmodus
await page.goto(`${BASE}/rechner`);
await page.getByLabel("Name von Person 1").fill("Anna");
await page.getByLabel("Name von Person 2").fill("Ben");
await page.locator("#guest-description").fill("Pizza");
await page.locator("#guest-amount").fill("30,01");
await page.getByRole("button", { name: "Ausgabe hinzufügen" }).click();
await page.waitForTimeout(300);
const guestText = await page.locator("section", { hasText: "So wird ausgeglichen" }).first().innerText();
check("Gastmodus rechnet Ausgleich", /Ben.*zahlt.*Anna.*15,0[01]/s.test(guestText), guestText.slice(0, 200));

// 1b. Öffentliche Startseite muss ohne Anmeldung erreichbar und indexierbar sein
const landing = await page.goto(`${BASE}/`);
check("Startseite ohne Anmeldung erreichbar", landing.status() === 200, String(landing.status()));
const landingHtml = await page.content();
check("Startseite trägt strukturierte Daten", landingHtml.includes("SoftwareApplication") && landingHtml.includes("FAQPage"));
check("Startseite ist nicht auf noindex", !/name="robots"[^>]*noindex/.test(landingHtml));

// 1c. Gemeinsame Abrechnung ohne Konto
const ctxLink = await browser.newContext({ locale: "de-DE" });
const gast = await ctxLink.newPage();
await gast.goto(`${BASE}/gemeinsam/start`);
await gast.fill("#name", "Linkprobe");
await gast.fill("#ownName", "Gastgeberin");
await gast.fill("#others", "Mitreisender");
await gast.getByRole("button", { name: "Abrechnung anlegen" }).click();
await gast.waitForURL(/\/gemeinsam\/(?!start)[^/]+$/, { timeout: 20000 });
const boardUrl = gast.url();
check("Abrechnung ohne Konto angelegt", /\/gemeinsam\//.test(boardUrl), boardUrl);

await gast.goto(`${boardUrl}/ausgabe/neu`);
await gast.fill("#description", "Benzin");
await gast.fill("#amount", "80");
await gast.getByRole("button", { name: "Ausgabe speichern" }).click();
await gast.getByText("Benzin").first().waitFor({ timeout: 20000 });
check("Eintrag ohne Konto möglich", (await gast.innerText("body")).includes("40,00"), "");

const ctxZweit = await browser.newContext({ locale: "de-DE" });
const zweit = await ctxZweit.newPage();
await zweit.goto(boardUrl);
await zweit.locator('input[name="personId"]').nth(1).check();
await zweit.getByRole("button", { name: "Los geht's" }).click();
await zweit.getByText("du bist Mitreisender").waitFor({ timeout: 20000 });
check("Zweite Person übernimmt ihren Platz", (await zweit.innerText("body")).includes("Benzin"), "");

// 2. Registrierung
await page.goto(`${BASE}/registrieren`);
await page.fill("#name", "Testerin Eins");
await page.fill("#email", `test${stamp}@example.com`);
await page.fill("#password", "supergeheim1");
await page.getByRole("button", { name: "Konto erstellen" }).click();
await page.waitForURL(`${BASE}/uebersicht`, { timeout: 15000 });
check("Registrierung führt zur Übersicht", page.url() === `${BASE}/uebersicht`);

// 3. Gruppe anlegen
await page.goto(`${BASE}/gruppen/neu`);
await page.fill("#name", "Testreise");
await page.getByRole("button", { name: "Gruppe erstellen" }).click();
await page.waitForURL(/\/gruppen\/[a-z0-9]{15,}$/, { timeout: 15000 });
const groupUrl = page.url();
check("Gruppe angelegt", /\/gruppen\//.test(groupUrl));

// 4. Zweites Konto erstellen und über Einladungslink beitreten
await page.goto(`${groupUrl}/einstellungen`);
const invite = await page.locator('section input[readonly]').first().inputValue();
check("Einladungslink vorhanden", invite.includes("/beitreten/"), invite);

const ctx2 = await browser.newContext({ locale: "de-DE" });
const page2 = await ctx2.newPage();
await page2.goto(`${BASE}/registrieren`);
await page2.fill("#name", "Testerin Zwei");
await page2.fill("#email", `zwei${stamp}@example.com`);
await page2.fill("#password", "supergeheim2");
await page2.getByRole("button", { name: "Konto erstellen" }).click();
await page2.waitForURL(`${BASE}/uebersicht`, { timeout: 15000 });
await page2.goto(BASE + new URL(invite).pathname);
await page2.getByRole("button", { name: "Als neue Person beitreten" }).click();
await page2.waitForURL(/\/gruppen\//, { timeout: 15000 });
check("Beitritt über Einladungslink", page2.url().includes("/gruppen/"));

// 5. Ausgabe erfassen (gleich geteilt, ungerader Betrag)
await page.goto(`${BASE}/ausgaben/neu?gruppe=${groupUrl.split("/").pop()}`);
await page.fill("#description", "Hotel");
await page.fill("#amount", "100,01");
await page.getByRole("button", { name: "Ausgabe speichern" }).click();
await page.waitForURL(/\/gruppen\//, { timeout: 15000 });
const groupText = await page.innerText("body");
check("Ausgabe erscheint in der Gruppe", groupText.includes("Hotel"), groupText.slice(0, 200));
check("Saldo korrekt berechnet (50,00 €)", /schuldet\s+dir\s*50,0[01]\s*€|50,00\s*€/.test(groupText.replace(/\s+/g, " ")), groupText.replace(/\s+/g," ").slice(0, 400));

// 6. Prozentaufteilung
await page.goto(`${BASE}/ausgaben/neu?gruppe=${groupUrl.split("/").pop()}`);
await page.fill("#description", "Mietwagen");
await page.fill("#amount", "300");
await page.getByRole("button", { name: "Prozent", exact: true }).click();
const valueInputs = page.locator('input[name^="value:"]');
await valueInputs.nth(0).fill("70");
await valueInputs.nth(1).fill("30");
await page.getByRole("button", { name: "Ausgabe speichern" }).click();
await page.waitForURL(/\/gruppen\//, { timeout: 15000 });
const after = (await page.innerText("body")).replace(/\s+/g, " ");
check("Prozentaufteilung gespeichert", after.includes("Mietwagen"), after.slice(0, 200));
check("Salden nach zwei Ausgaben (140,00 €)", after.includes("140,00"), after.slice(0, 500));

// 7. Falsche Prozentsumme wird abgelehnt
await page.goto(`${BASE}/ausgaben/neu?gruppe=${groupUrl.split("/").pop()}`);
await page.fill("#description", "Fehlerhaft");
await page.fill("#amount", "50");
await page.getByRole("button", { name: "Prozent", exact: true }).click();
const v2 = page.locator('input[name^="value:"]');
await v2.nth(0).fill("70");
await v2.nth(1).fill("10");
await page.getByRole("button", { name: "Ausgabe speichern" }).click();
await page.waitForTimeout(1500);
const errText = (await page.innerText("body")).replace(/\s+/g, " ");
check("Ungültige Prozentsumme wird abgelehnt", errText.includes("100 %"), errText.slice(0, 300));

// 8. Begleichen
await page.goto(`${BASE}${new URL(groupUrl).pathname}`);
await page.getByRole("link", { name: "Begleichen" }).first().click();
await page.waitForURL(/\/begleichen/, { timeout: 15000 });
const settleBody = await page.innerText("body");
check("Begleichen-Seite erreichbar", settleBody.includes("Zahlung erfassen"));

// 9. Aktivität
await page.goto(`${BASE}/aktivitaet`);
const activity = await page.innerText("body");
check("Aktivitätsverlauf zeigt Einträge", activity.includes("Hotel") && activity.includes("Testreise"), activity.slice(0, 200));

// 9b. Rückfragen laufen über ein Modal, nicht über den Browser
await page.goto(`${BASE}${new URL(groupUrl).pathname}`);
await page.getByRole("link", { name: /Hotel/ }).first().click();
await page.waitForURL(/\/ausgaben\//, { timeout: 15000 });
const detailText = (await page.innerText("body")).replace(/\s+/g, " ");
check("Detailseite nennt den Saldo dieses Eintrags", /Bei diesem Eintrag (bekommst|schuldest) du/.test(detailText), detailText.slice(0, 200));

await page.getByRole("button", { name: "Löschen", exact: true }).first().click();
await page.waitForTimeout(400);
check("Rückfrage erscheint als Modal", await page.locator("dialog[open]").count() === 1);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check("Escape schließt das Modal", await page.locator("dialog[open]").count() === 0);

// 10. Dunkles Design
await page.goto(`${BASE}/uebersicht`);
await page.getByLabel("Dunkles Design").click();
await page.waitForTimeout(200);
check("Dunkles Design umschaltbar", await page.evaluate(() => document.documentElement.classList.contains("dark")));

// 11. Zweite Sprache: Browsersprache erkennen, Wahl merken
const ctxEn = await browser.newContext({ locale: "en-US" });
const enPage = await ctxEn.newPage();
await enPage.goto(`${BASE}/`);
const enBody = await enPage.innerText("body");
check("Englische Browsersprache wird erkannt", enBody.includes("Shared expenses"), enBody.slice(0, 200));
check(
  "html trägt die erkannte Sprache",
  (await enPage.getAttribute("html", "lang")) === "en",
  String(await enPage.getAttribute("html", "lang")),
);
check("Keine deutschen Reste auf der Startseite", !enBody.includes("Häufige Fragen"), enBody.slice(0, 200));

await enPage.goto(`${BASE}/rechner`);
const enRechner = await enPage.innerText("body");
check("Rechner spricht Englisch", enRechner.includes("Quick split") && enRechner.includes("Result"), enRechner.slice(0, 200));

// Umschalten auf Deutsch – und die Wahl überlebt den Seitenwechsel
await enPage.getByRole("link", { name: /^DE/ }).first().click();
await enPage.waitForTimeout(500);
check("Umschalten auf Deutsch wirkt", (await enPage.innerText("body")).includes("Schnell-Abrechnung"));
await enPage.goto(`${BASE}/`);
check(
  "Die gewählte Sprache bleibt erhalten",
  (await enPage.innerText("body")).includes("Häufige Fragen"),
  (await enPage.innerText("body")).slice(0, 200),
);

// Deutsche Browsersprache bleibt deutsch
const ctxDe = await browser.newContext({ locale: "de-DE" });
const dePage = await ctxDe.newPage();
await dePage.goto(`${BASE}/`);
check("Deutsche Browsersprache bleibt deutsch", (await dePage.innerText("body")).includes("Häufige Fragen"));

check("keine Browserdialoge verwendet", nativeDialog === null, String(nativeDialog));

await browser.close();
console.log(`\n${ok.length} bestanden, ${fail.length} fehlgeschlagen`);
process.exit(fail.length ? 1 : 0);

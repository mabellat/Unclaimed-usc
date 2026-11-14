// End-to-end checks against the real API/database started by scripts/app.py test.
// The runner enables labelled cached claim replay and disables external LLM calls.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8000";
const personas = JSON.parse(await readFile(new URL("../../../data/demo_personas.json", import.meta.url))).personas;
const cards = new Set();
const output = new URL("../../../.local/test-logs/", import.meta.url).pathname;
await mkdir(output, { recursive: true });
async function call(path, method = "GET", body) {
  const response = await fetch(API + path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  assert(response.ok, `${method} ${path}: ${response.status} ${await response.clone().text()}`);
  return response.status === 204 ? null : response.json();
}
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", async (response) => {
  if (response.url() === `${API}/students` && response.request().method() === "POST" && response.ok()) {
    cards.add((await response.json()).id);
  }
});
const text = (value) => page.waitForFunction((value) => document.body.innerText.toLowerCase().includes(value.toLowerCase()), { timeout: 20000 }, value);
async function click(value, selector = "button,a") {
  await page.waitForFunction((value, selector) => [...document.querySelectorAll(selector)].some((el) => el.textContent.trim().startsWith(value) && !el.disabled), {}, value, selector);
  await page.evaluate((value, selector) => [...document.querySelectorAll(selector)].find((el) => el.textContent.trim().startsWith(value) && !el.disabled).click(), value, selector);
}
async function route(path) {
  await page.goto(WEB + path, { waitUntil: "networkidle0" });
}
async function saved(predicate) {
  const sid = await page.evaluate(() => localStorage.getItem("unclaimed.card"));
  for (let i = 0; i < 40; i++) {
    const current = await call(`/students/${sid}`);
    if (predicate(current)) return current;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail("Card change was not persisted by the API");
}
try {
  const catalog = await call("/resources");
  assert(catalog.resources.length > 0);
  assert(catalog.resources.every((r) => r.status === "approved" && r.source_url && r.evidence_quote));
  const admin = await fetch(`${API}/admin`);
  assert.equal(admin.status, 401, "Admin requires authentication");
  const authorized = await fetch(`${API}/admin`, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString("base64")}` } });
  assert.equal(authorized.status, 200, "Authenticated admin queue renders");
  // All personas go through real persistence and matching, not intercepted fixtures.
  for (const p of personas) {
    const c = await call("/students", "POST", { facts: p.facts, needs: p.needs, persona: p.id });
    cards.add(c.id);
    const matches = await call(`/students/${c.id}/match`);
    assert.deepEqual(matches.yes.map((m) => m.id), p.expected.yes, `${p.name}: yes matches`);
    assert.deepEqual(matches.maybe.map((m) => m.id).sort(), [...p.expected.maybe].sort(), `${p.name}: maybe matches`);
    await call(`/students/${c.id}`, "DELETE");
    cards.delete(c.id);
  }
  console.log("PASS: approved catalog, authenticated admin, every demo persona's real API matches");

  await route("/");
  await click("Try a demo student");
  await click("Priya");
  await page.waitForFunction(() => location.pathname === "/wallet");
  const sid = await page.evaluate(() => localStorage.getItem("unclaimed.card"));
  cards.add(sid);
  await text("My wallet");
  await click("Needs answers");
  await text("Dornsife faculty member");
  await click("Yes", 'section[aria-label="One question"] button');
  await saved((c) => c.facts.has_dornsife_faculty_mentor === true);
  const resolved = await call(`/students/${sid}/match`);
  assert(resolved.yes.some((m) => m.id === "soar") && resolved.yes.some((m) => m.id === "surf-shure"));
  await click("Matches");
  await page.type("#resource-search", "PURF");
  await page.waitForSelector('a[href="/ticket/purf"]');
  await page.click('a[href="/ticket/purf"]');
  await text("Prepare my application");
  await click("Prepare my application");
  await page.waitForFunction(() => location.pathname.endsWith("/packet"), { timeout: 30000 });
  await text("Replayed from a cached run");
  const packet = (await call(`/students/${sid}/claims/purf`)).packet;
  assert.equal(packet.grounding.passed, true);
  assert.equal(packet.sent_by_agent, false);
  await click("All ");
  await text("SOURCE PAGE");
  const checkbox = await page.$('button[role="checkbox"]');
  assert(checkbox, "Claim has a preparation checklist");
  await checkbox.click();
  assert.equal(await checkbox.evaluate((el) => el.getAttribute("aria-checked")), "true");
  if (packet.has_calendar) {
    const calendar = await fetch(`${API}/students/${sid}/claims/purf/calendar.ics`);
    assert(calendar.ok && (await calendar.text()).includes("BEGIN:VCALENDAR"));
  }
  await click("I sent it");
  await page.waitForFunction(() => location.pathname === "/claims");
  await text("Sent on day");
  await click("Day 7");
  await text("The office is reviewing");
  await click("Day 30");
  await text("Semester recap");
  assert.equal((await call(`/students/${sid}/claims`)).claims[0].stage, "Received");
  console.log("PASS: wallet question, claim stream/packet, source citations, checklist, calendar, sent/review/received timeline");

  await page.click('nav a[href="/alerts"]');
  await page.waitForFunction(() => location.pathname === "/alerts");
  const alerts = await call(`/students/${sid}/alerts`);
  assert(alerts.alerts.length > 0);
  await text(alerts.alerts[0].title);
  await page.click('nav a[href="/ask"]');
  await page.waitForSelector("#chat");
  await page.type("#chat", "My landlord won't return my deposit");
  await click("Send");
  await saved((c) => c.needs.includes("housing"));
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled);
  await page.click('nav a[href="/card"]');
  await text("Everything you told us");
  const labels = await call("/profile/fields");
  await page.evaluate((label) => document.querySelector(`button[aria-label="${CSS.escape(label)}"]`).click(), `Delete your answer to: ${labels.fields.has_dornsife_faculty_mentor.question}`);
  await saved((c) => !("has_dornsife_faculty_mentor" in c.facts));
  assert((await call(`/students/${sid}/match`)).maybe.some((m) => m.id === "soar"));
  console.log("PASS: alerts, Navigator updates, profile deletion returns eligibility to unknown");

  for (const path of ["/wallet", "/claims", "/alerts", "/ask", "/card"]) {
    await route(path);
    for (const width of [320, 390, 1280]) {
      await page.setViewport({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: no overflow at ${width}px`);
    }
  }
  await click("Delete my card and restart");
  await page.waitForFunction(() => location.pathname === "/");
  assert.equal((await fetch(`${API}/students/${sid}`)).status, 404);
  assert.equal((await fetch(`${API}/students/${sid}/claims/purf`)).status, 404);
  cards.delete(sid);
  await route("/wallet");
  await page.waitForFunction(() => location.pathname === "/");
  assert.deepEqual(errors, [], "No uncaught browser errors");
  console.log("PASS: all tab layouts, card/claim deletion, signed-out redirect; no uncaught browser errors");
} catch (error) {
  await page.screenshot({ path: `${output}/e2e-failure.png`, fullPage: true });
  console.error(`Failed at ${page.url()}. Screenshot: ${output}/e2e-failure.png`);
  throw error;
} finally {
  for (const sid of cards) await fetch(`${API}/students/${sid}`, { method: "DELETE" }).catch(() => {});
  await browser.close();
}

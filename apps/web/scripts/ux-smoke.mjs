// Browser checks with intercepted API responses; no student data or live API needed.
// Run against a running production server: npm run test:ux
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const fields = JSON.parse(await readFile(new URL("../../../data/profile_fields.json", import.meta.url))).fields;
const snapshot = JSON.parse(await readFile(new URL("../../../data/approved_resources.json", import.meta.url)));
const resources = snapshot.resources.slice(0, 3).map((r) => ({ ...r, conflicts: [], deadline: null }));
const question = "has_dornsife_faculty_mentor";
const output = process.env.UX_SCREENSHOTS ?? "/tmp/unclaimed-ux";
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let card = null;
let submitted;
let failCreate = true;
let failAnswer = true;
let failFields = false;
let clearedMaybe = false;
const item = (r, status) => ({ id: r.id, status, why: [], unknown: status === "maybe" ? [question] : [], office_decides: [], basis: "Based on what you told us. The office will confirm.", data_version: 90 });
await page.setRequestInterception(true);
page.on("request", async (request) => {
  if (!request.url().startsWith(API + "/")) return request.continue();
  const url = new URL(request.url());
  let status = 200;
  let data = {};
  if (request.method() === "OPTIONS") status = 204;
  else if (url.pathname === "/resources") data = { resources, data_version: 90 };
  else if (url.pathname === "/profile/fields") { data = { fields }; if (failFields) status = 503; }
  else if (url.pathname === "/demo/personas") data = { personas: [{ id: "test", name: "Demo student", summary: "A sample student", facts: {}, needs: [] }] };
  else if (url.pathname === "/students" && request.method() === "POST") {
    submitted = JSON.parse(request.postData());
    if (failCreate) { status = 503; failCreate = false; }
    else { card = { id: "ux-test", ...submitted, demo_day: 1 }; data = card; }
  } else if (url.pathname.endsWith("/match")) {
    data = {
      data_version: 90, needs: card?.needs ?? [], no: [],
      yes: (clearedMaybe ? resources : resources.slice(0, 1)).map((r) => item(r, "yes")),
      maybe: clearedMaybe ? [] : resources.slice(1).map((r) => item(r, "maybe")),
      next_question: clearedMaybe ? null : { ...fields[question], field: question, count: 2 },
    };
  } else if (url.pathname.includes("/facts/")) {
    if (failAnswer) { status = 503; failAnswer = false; }
    else { card.facts[question] = JSON.parse(request.postData()).value; clearedMaybe = true; data = card; }
  } else if (url.pathname.endsWith("/claims")) data = { claims: [], demo_day: 1 };
  else if (url.pathname.endsWith("/alerts")) data = { alerts: [], demo_day: 1 };
  else if (url.pathname === "/students/ux-test") data = card;
  else { status = 404; data = { detail: "Unexpected test API path" }; }
  await request.respond({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }, body: status === 204 ? undefined : JSON.stringify(data) });
});
async function click(text, scope = "body") {
  await page.waitForFunction((text, scope) => [...document.querySelectorAll(`${scope} button, ${scope} a`)].some((e) => e.textContent.trim().startsWith(text)), {}, text, scope);
  assert(await page.evaluate((text, scope) => {
    const el = [...document.querySelectorAll(`${scope} button, ${scope} a`)].find((e) => e.textContent.trim().startsWith(text));
    if (!el || el.disabled) return false;
    el.click(); return true;
  }, text, scope), `Clickable: ${text}`);
}
const hasText = (text) => page.waitForFunction((text) => document.body.innerText.includes(text), {}, text);
async function checkWidth(width) {
  await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px on ${page.url()}`);
}
try {
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(WEB, { waitUntil: "networkidle0" });
  await hasText("Find my matches");
  for (const width of [320, 390, 1280]) await checkWidth(width);
  await page.screenshot({ path: `${output}/welcome-desktop.png`, fullPage: true });
  await checkWidth(390);
  await page.screenshot({ path: `${output}/welcome-mobile.png`, fullPage: true });
  await click("Try a demo student");
  await hasText("Demo student");
  await click("Hide demo students");
  await click("Find my matches");
  await hasText("What are you studying?");
  await click("Undergraduate");
  assert(await page.$eval("h1", (el) => el.textContent) === "What are you studying?", "Selection does not advance automatically");
  await click("Continue");
  await hasText("Which school are you in?");
  assert(await page.evaluate(() => document.activeElement?.tagName === "H1"), "Focus moves to the new question");
  await page.select("#school", fields.schools.values[0]);
  await click("Back");
  assert(await page.$eval('button[aria-pressed="true"]', (el) => el.textContent.includes("Undergraduate")), "Back preserves selection");
  await click("Skip for now");
  await click("Skip for now");
  await hasText("What could you use help with?");
  await checkWidth(320);
  await click("Money is tight");
  await click("Find my matches");
  await hasText("Your answers are still here");
  assert.deepEqual(submitted.facts, {}, "Skipped answers stay unknown");
  assert.deepEqual(submitted.needs, ["money"], "Selected needs survive failed save");
  await click("Find my matches");
  await page.waitForFunction(() => location.pathname === "/wallet");
  await hasText("My wallet");
  assert.equal(await page.$('section[aria-label="One question"]'), null, "Matches are the first view");
  assert.equal(await page.$eval('nav[aria-label="Main"] a[aria-current="page"]', (el) => el.getAttribute("href")), "/wallet", "Navigation identifies the active page");
  for (const width of [320, 390, 1280]) await checkWidth(width);
  await checkWidth(390);
  await page.screenshot({ path: `${output}/wallet-mobile.png`, fullPage: true });
  await page.type("#resource-search", "zzzz-no-result");
  await hasText("No results for this search");
  await click("Clear");
  await click("Needs answers");
  await click("Yes", 'section[aria-label="One question"]');
  await hasText("We couldn't update your matches");
  await click("Yes", 'section[aria-label="One question"]');
  await hasText("You're all caught up");
  await click("Matches");
  await page.waitForFunction(() => document.querySelector('[aria-label="Resource view"] button').textContent.includes("3"));
  await page.goto(`${WEB}/ticket/${resources[0].id}`, { waitUntil: "networkidle0" });
  await hasText("Prepare my application");
  await checkWidth(320);
  await page.screenshot({ path: `${output}/ticket-mobile.png`, fullPage: true });
  await page.goto(`${WEB}/scan`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => location.pathname === "/wallet");
  // Returning students go straight back to their wallet.
  await page.goto(WEB, { waitUntil: "networkidle0" });
  await hasText("Open my wallet");
  // A failed profile request shows an error instead of an empty questionnaire.
  failFields = true;
  await page.goto(`${WEB}/build`, { waitUntil: "networkidle0" });
  await hasText("We couldn't load the questions");
  assert.equal(await page.$("select"), null);
  failFields = false;
  await click("Try again");
  await hasText("What are you studying?");
  assert.deepEqual(errors, [], "No uncaught browser errors");
  console.log(`UX checks passed: onboarding, unknown answers, request recovery, search, question resolution, return visits, mobile/desktop overflow. Screenshots: ${output}`);
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  console.error(`Failed on ${page.url()}. Screenshot: ${output}/failure.png`);
  throw error;
} finally {
  await browser.close();
}

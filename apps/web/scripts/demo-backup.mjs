// Records a click-through backup of the demo (Priya's pitch flow, then Wei's "unknown is not no").
// Usage: make demo-backup   (needs the API on :8000 and the web app on :3000)
// Output: docs/demo/backup/index.html + frames/*.png. Cards it creates are deleted at the end.
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8000";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../docs/demo/backup");

const frames = [];
const cards = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

async function frame(caption, full = false) {
  await wait(900);
  const file = `frames/${String(frames.length + 1).padStart(2, "0")}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: full });
  frames.push({ file, caption });
  console.log(`${frames.length}. ${caption}`);
}

async function click(text, scope = "body") {
  const ok = await page.evaluate((t, s) => {
    const root = document.querySelector(s) ?? document.body;
    const el = [...root.querySelectorAll("button,a")].find((e) => e.textContent.trim().startsWith(t));
    if (el) { el.click(); return true; }
    return false;
  }, text, scope);
  if (!ok) throw new Error(`no button or link starting with "${text}"`);
}

const until = (fn, timeout = 30000) => page.waitForFunction(fn, { timeout });

async function loadPersona(name) {
  await page.goto(WEB, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(WEB, { waitUntil: "networkidle0" });
  await click("Skip: load a demo student");
  await wait(600);
  await click(name);
  await until(() => location.pathname === "/scan");
  cards.push(await page.evaluate(() => localStorage.getItem("unclaimed.card")));
}

try {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, "frames"), { recursive: true });

  await page.goto(WEB, { waitUntil: "networkidle0" });
  await frame("Welcome. USC has set money and help aside; some of it is yours.");
  await click("Skip: load a demo student");
  await frame("Five demo students, loaded through the same API as a real card.");

  await loadPersona("Priya");
  await frame("Priya, a Dornsife junior: the rules engine checks every approved resource.");
  await until(() => location.pathname === "/wallet");
  await wait(2500);
  await frame("Her wallet. PURF is due soon, so it is marked urgent. One question could unlock two more.", true);
  await click("Yes", 'section[aria-label="One question"]');
  await wait(2500);
  await frame("She has a faculty mentor: SOAR and SURF flip from maybe to yes. Nothing was guessed.", true);

  await page.goto(`${WEB}/ticket/purf`, { waitUntil: "networkidle0" });
  await frame("PURF ticket: why she qualifies (with what she told us), how to claim, and the source page.", true);
  await click("Claim it for me");
  // Catch the live trace when its last step lands, before the app moves on to the packet.
  await until(() => document.body.innerText.includes("Your claim packet is ready"), 90000);
  const file = `frames/${String(frames.length + 1).padStart(2, "0")}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  frames.push({ file, caption: "The claim agent, live: re-checks the page, lists what she needs, drafts, and checks every statement." });
  console.log(`${frames.length}. live trace`);
  await until(() => location.pathname.endsWith("/packet"));
  await frame("Claim packet: what to prepare, a draft where every sentence traces to the source, and a calendar file.", true);
  await click("All ");
  await frame("Where each statement comes from: the source page or her own card.", true);
  await click("I sent it");
  await until(() => location.pathname === "/claims");
  await frame("She sends it herself. Unclaimed never sends anything.");
  await click("Day 7");
  await frame("Demo clock, Day 7: in review (simulated, and labelled so).");
  await click("Day 30");
  await frame("Day 30: received. Only USC offices see real decisions; in the app, the student reports the outcome.");
  await page.goto(`${WEB}/alerts`, { waitUntil: "networkidle0" });
  await frame("Alerts: reminders and follow-ups. Source changes reach students only after a person approves them.", true);

  await loadPersona("Wei");
  await until(() => location.pathname === "/wallet");
  await wait(2500);
  await page.goto(`${WEB}/ticket/csi-emergency-loan`, { waitUntil: "networkidle0" });
  await frame("Wei, an international student: the emergency loan is a maybe. Unknown is never treated as no.", true);
  await click("No");
  await wait(2000);
  await frame("He has no U.S. Social Security number: only now does it say it doesn\u2019t fit. Unknown was never treated as no.");

  await page.goto(`${WEB}/ask`, { waitUntil: "networkidle0" });
  await click("My landlord won");
  await wait(3500);
  await frame("The Navigator maps plain words to the card with tool calls, shown as chips.");
  await page.type("#chat", "Why can't I get Federal Work-Study?");
  await click("Send");
  await wait(3500);
  await frame("Ask why not: the rules engine's reason, in plain words and politely, with a pointer to the office.");

  const slides = frames.map((f, i) => `<figure data-i="${i}"${i ? " hidden" : ""}><img src="${f.file}" alt="${f.caption.replace(/"/g, "&quot;")}"><figcaption><b>${i + 1}/${frames.length}</b> ${f.caption}</figcaption></figure>`).join("\n");
  await writeFile(path.join(OUT, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unclaimed demo backup</title><style>
body{margin:0;background:#1A1210;color:#FFFCF5;font:16px/1.45 Inter,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh}
figure{margin:16px;display:flex;flex-direction:column;align-items:center;gap:12px;max-width:min(94vw,520px)}
img{max-height:78vh;max-width:100%;border-radius:18px;box-shadow:0 0 0 2px #FFCC00}
figcaption{text-align:center}b{color:#FFCC00;margin-right:6px}
nav{display:flex;gap:10px;margin:8px 0 20px}button{min-height:44px;min-width:110px;border:2px solid #FFCC00;background:none;color:#FFCC00;border-radius:10px;font:600 15px Inter,sans-serif;cursor:pointer}
p{color:#C9BFB4;font-size:13px;margin:12px}</style></head><body>
<p>Backup of the live demo, recorded from the real app. Use the arrow keys or the buttons.</p>
${slides}
<nav><button id="prev">Previous</button><button id="next">Next</button></nav>
<script>let i=0;const f=[...document.querySelectorAll("figure")];function go(n){f[i].hidden=true;i=(n+f.length)%f.length;f[i].hidden=false;}
document.getElementById("prev").onclick=()=>go(i-1);document.getElementById("next").onclick=()=>go(i+1);
addEventListener("keydown",e=>{if(e.key==="ArrowRight")go(i+1);if(e.key==="ArrowLeft")go(i-1);});</script></body></html>\n`);
  console.log(`\nWrote ${frames.length} frames to ${OUT}/index.html`);
} finally {
  for (const id of cards.filter(Boolean)) await fetch(`${API}/students/${id}`, { method: "DELETE" }).catch(() => {});
  await browser.close();
}

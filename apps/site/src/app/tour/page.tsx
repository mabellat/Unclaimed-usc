"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Track } from "@/components/bits";
import { SCMark } from "@/components/SCMark";
import { TrojanCard } from "@/components/TrojanCard";
import { useStudent } from "@/lib/student";
import { NEED_LABELS, capitalize, hostOf, money, stubFor } from "@/lib/ui";
import type { FieldSpec, Resource } from "@/lib/types";
import { Logo } from "@site/components/Shell";
import { AiTag, CLICK, H, W, clamp, lerp, pressed, prog, tick } from "./kit";
import { SceneMany, SceneMarcus, SceneOutro, SceneRules, SceneSofia, SceneUnder, SceneWei } from "./story";

/*
 * A self-playing product tour. Everything on screen is a pure function of one clock `t`, so it can pause,
 * seek and replay. The cursor and the camera head for elements marked with data-hit, measured each frame.
 * Amounts and titles come from the approved data; the student is Marcus from data/demo_personas.json.
 */

const FRAME = { x: 80, y: 34, w: 1280, h: 768 };

// Marcus's expected results in data/demo_personas.json.
const MARCUS_YES = ["cavaney-vet", "skull-and-dagger", "federal-work-study", "gsg-emergency-fund", "gsg-npe-fund", "gsg-travel-award", "gsg-empowerment-award", "town-and-gown", "campus-support-and-intervention", "its-laptop-loaner", "sbn-financial-navigation", "ship-insurance-waiver"];
const MARCUS_MAYBE = 3;
const SCHOLAR = "cavaney-vet";
const FUND = "gsg-emergency-fund";
const LOAN = "csi-emergency-loan";
// The opening story plays as illustrations; the cursor only appears once the app is on screen.
const STORY = new Set(["marcus", "wei", "sofia", "many", "reveal", "rules", "under"]);
// The scholarship's criteria, as written in data/eligibility_rules.json.
const WHY = ["Price master's degree student", "U.S. military veteran"];
const DRAFT = "Hello,\n\nI'm a master's student at the USC Price School of Public Policy and a U.S. military veteran. I'd like to apply for the Cavaney Graduate Veteran Scholarship when applications open on December 1, 2026.\n\nCould you let me know if there's anything I should prepare beforehand?\n\nThank you,\nMarcus";
const AGENT_STEPS: [string, string, number][] = [
  ["Plan the claim", "A plan for the Cavaney Graduate Veteran Scholarship.", 600],
  ["Verify the source page", "The live page matches the approved record.", 1800],
  ["Work out what you need", "Apply in Scholarship Universe with your USC NetID.", 3000],
  ["Draft your message", "Draft written from your card and the source page.", 9400],
  ["Check every statement against the source", "Every line traces to your card or the page.", 11800],
  ["Prepare your claim packet", "Checklist, message and reminder ready.", 12600],
];

type Move = [number, string, boolean?];
type Cam = [number, string | null, number, number?];
type Chapter = { id: string; label: string; dur: number; url?: string; captions: [number, string][]; moves?: Move[]; cams: Cam[] };

function chaptersFor(n: number, total: number, hosts: number, count: number): Chapter[] {
  return [
    { id: "marcus", label: "Marcus", dur: 13500,
      captions: [[0, "Marcus, a master's student at USC Price, catches up with friends."], [3600, "They're talking about a scholarship he's never heard of."], [8000, "Applications closed on November 15."], [10000, "He met every requirement. He just never knew it existed."]],
      cams: [[1400, "friend", 1.15], [6400, "marcus-face", 1.4], [8800, "marcus-face", 1.6, 600], [10000, "m-found", 1.2]] },
    { id: "wei", label: "Wei", dur: 11000,
      captions: [[0, "Wei, an international master's student in Viterbi, just landed his first interview."], [3200, "He needs a suit, a sharper resume and someone to practice with."], [7400, "USC gives out free interview clothes, and runs mock interviews around the clock."]],
      cams: [[1000, "w-screen", 1.3], [5000, "wei-face", 1.5], [7300, "w-found", 1.25]] },
    { id: "sofia", label: "Sofia", dur: 11500,
      captions: [[0, "Sofia commutes to campus every day and stretches every dollar."], [3700, "She's skipping lunch to cover rent, which just went up."], [7800, "She doesn't know USC can load emergency meal swipes onto her card, or give one-time help with housing costs."]],
      cams: [[3600, "sofia-face", 1.35], [5000, "thought", 1.25], [7700, "s-found", 1.2]] },
    { id: "many", label: "So much help", dur: 12000,
      captions: [[0, "Three students. Three different problems. Help existed for every one of them."], [5000, "It's scattered across offices, schools and student groups, each with its own page and rules."], [8500, "So students tend to find out by accident, from a friend, or too late."]],
      cams: [[5000, "stats", 1.2], [8400, null, 1]] },
    { id: "reveal", label: "Unclaimed", dur: 7000, cams: [[300, null, 1.06, 6000]],
      captions: [[0, "Unclaimed brings all of it into one place,"], [3400, "and AI agents help you claim it."]] },
    { id: "card", label: "Your card", dur: 14000, url: "unclaimed.app/build",
      captions: [[0, "Let's follow Marcus. He builds his Trojan card in three taps."], [4800, "His degree, his school and what's going on. Nothing else."], [8800, "His card fills in as he goes."], [11600, "Then Unclaimed checks him against every approved USC resource."]],
      moves: [[2000, "lvl-masters", true], [4200, "sch-price", true], [6400, "need-money", true], [7600, "need-conference", true], [11000, "find", true]],
      cams: [[600, "q-level", 1.5], [3300, "q-school", 1.5], [5500, "q-needs", 1.45], [8600, "trojan", 1.45], [10300, null, 1]] },
    { id: "rules", label: "How matching works", dur: 16000,
      captions: [[0, "How does Unclaimed decide? Every resource has rules, taken from its USC page."], [2200, "Each rule is checked against his card. Every one passes, so it's a yes."], [5400, "If his card is missing an answer, it's a maybe, never a no. Unclaimed just asks."], [9600, "If a rule doesn't fit, it's a no, and he can see why in plain words."], [12400, "See how easy that was? Every match comes with its reason."]],
      cams: [[1800, "r-c0", 1.3], [5200, "r-c1", 1.3], [9400, "r-c2", 1.3], [12400, "r-principle", 1.35], [14800, null, 1]] },
    { id: "wallet", label: "Wallet", dur: 14000, url: "unclaimed.app/wallet",
      captions: [[0, "Everything he qualifies for lands in one wallet."], [2800, `${n} ready to claim, including ${money(total)} in stated amounts.`], [6400, "Scholarships, emergency funds, paid work, health and basics. Not just scholarships."], [9200, "And this time, there's a scholarship he won't miss."]],
      moves: [[11600, `tk-${SCHOLAR}`, true]],
      cams: [[2400, "w-total", 1.75], [6000, null, 1], [9200, `tk-${SCHOLAR}`, 1.45]] },
    { id: "ticket", label: "Why it fits", dur: 10000, url: `unclaimed.app/ticket/${SCHOLAR}`,
      captions: [[0, "Every match says why it fits, in plain words."], [3800, "And unlike the last one, this one is still open."], [6800, "One tap, and the AI claim agent takes over."]],
      moves: [[8200, "claim-btn", true]],
      cams: [[900, "why", 1.6], [3600, "deadline", 1.6], [6600, "claim-btn", 1.5]] },
    { id: "agent", label: "Claim agent", dur: 16500, url: `unclaimed.app/ticket/${SCHOLAR}/claim`,
      captions: [[0, "The AI claim agent starts by re-reading the live USC page."], [3000, "It works out what he needs to prepare, each item tied to the page."], [4200, "Then it drafts his message from his card and the source page."], [9800, "A second check traces every line back to his card or the page. No made-up facts."], [13200, "His claim packet is ready."]],
      moves: [[14400, "send-btn"]],
      cams: [[700, "trace", 1.4], [4000, "draft", 1.45], [9800, "checks", 1.6], [13000, null, 1]] },
    { id: "tracking", label: "Tracking", dur: 9000, url: "unclaimed.app/claims",
      captions: [[0, "Then Unclaimed tracks the claim, step by step."], [3400, "Review steps are simulated in this demo."], [5600, "Claimed."]],
      cams: [[400, "claim-card", 1.35], [5400, "stamp", 1.9]] },
    { id: "ask", label: "Navigator", dur: 13000, url: "unclaimed.app/ask",
      captions: [[0, "Got a question? He asks the AI Navigator, in plain words."], [3600, "It reads his card and searches approved USC data only."], [6200, "Then answers with what fits, and what it still needs to know."]],
      moves: [[2900, "ask-send", true], [9000, "ask-r1"]],
      cams: [[500, "ask-input", 1.5], [3300, null, 1], [5600, "ask-reply", 1.35], [10800, null, 1]] },
    { id: "under", label: "Under the hood", dur: 15000,
      captions: [[0, "Under the hood, AI reads each USC page and pulls out amounts, rules and deadlines."], [2400, "Every fact keeps the exact quote it came from."], [4400, "Then a USC admin approves each record before any student sees it."], [7600, "Rules, not AI, decide who qualifies. No guessing."], [9200, "AI agents then help with the claim: drafting, checking and answering."], [10600, "And every night the Watcher re-reads the pages, so changes reach students as alerts."]],
      cams: [[300, "n1", 1.3], [4300, "n2", 1.35], [7500, "n3", 1.35], [9100, "n4", 1.35], [10500, "watch", 1.3], [13600, null, 1]] },
    { id: "outro", label: "Try it", dur: 10000, captions: [[0, "This time, nobody misses out."], [4500, "Unclaimed. Find what's yours."]], moves: [[5600, "cta"]], cams: [] },
  ];
}

const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const MOVE = 800;


export default function Tour() {
  const { resources, fields } = useStudent();
  const all = useMemo(() => Object.values(resources), [resources]);
  const items = useMemo(() => MARCUS_YES.map((id) => resources[id]).filter(Boolean).sort((a, b) => (b.benefit?.value ?? -1) - (a.benefit?.value ?? -1)), [resources]);
  const total = items.reduce((a, r) => a + (r.benefit?.value ?? 0), 0);
  const hostList = useMemo(() => [...new Set(all.map((r) => hostOf(r.source_url)))], [all]);
  const chapters = useMemo(() => chaptersFor(items.length, total, hostList.length, all.length), [items.length, total, hostList.length, all.length]);
  const starts = useMemo(() => chapters.reduce<number[]>((acc, c, i) => [...acc, i ? acc[i - 1] + chapters[i - 1].dur : 0], []), [chapters]);
  const END = starts[starts.length - 1] + chapters[chapters.length - 1].dur;
  const loaded = items.length > 0 && !!resources[SCHOLAR];

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fit, setFit] = useState(0.5);
  const view = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const spots = useRef(new Map<string, { x: number; y: number }>());

  useEffect(() => { if (loaded) setPlaying(true); }, [loaded]);
  useEffect(() => { if (t >= END) setPlaying(false); }, [t, END]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const step = (now: number) => { const dt = now - last; last = now; setT((p) => Math.min(END, p + dt)); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, END]);
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit(el.clientWidth / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Where each marked element sits on the stage, before the camera moves it.
  useLayoutEffect(() => {
    const root = cam.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-hit]").forEach((el) => {
      let x = el.offsetWidth / 2, y = el.offsetHeight / 2;
      let node: HTMLElement | null = el;
      while (node && node !== root) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
      if (node === root) spots.current.set(el.dataset.hit!, { x, y });
    });
  });

  const ci = Math.max(0, starts.findLastIndex((s) => t >= s));
  const ch = chapters[ci];
  const lt = t - starts[ci];

  function seek(ms: number) { setT(clamp(ms, 0, END)); setPlaying(true); }
  function toggle() { if (t >= END) seek(0); else setPlaying((p) => !p); }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight") seek(starts[Math.min(ci + 1, starts.length - 1)]);
      if (e.code === "ArrowLeft") seek(starts[lt < 1500 ? Math.max(ci - 1, 0) : ci]);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  // The camera: each keyframe eases from wherever the last one left it. Every chapter opens zoomed out.
  const spot = (id: string | null) => (id ? spots.current.get(id) : undefined);
  let c = { x: W / 2, y: H / 2, s: 1 };
  let cursor = { x: W * 0.72, y: H * 0.8 };
  let ripple = null as { x: number; y: number; p: number } | null;
  chapters.forEach((chap, i) => {
    if (t < starts[i]) return;
    const keys: Cam[] = [[0, null, 1, 700], ...chap.cams];
    for (const [at, hit, s, dur] of keys) {
      const g = starts[i] + at;
      if (t < g) break;
      const p = spot(hit);
      const e = prog(t, g, dur ?? 1100);
      c = { x: lerp(c.x, p?.x ?? W / 2, e), y: lerp(c.y, p?.y ?? H / 2, e), s: lerp(c.s, s, e) };
    }
    for (const [at, hit, click] of chap.moves ?? []) {
      const g = starts[i] + at;
      if (t < g - MOVE) break;
      const p = spot(hit) ?? cursor;
      const e = prog(t, g - MOVE, MOVE);
      cursor = { x: lerp(cursor.x, p.x, e), y: lerp(cursor.y, p.y, e) };
      if (click && t >= g + CLICK && t < g + CLICK + 600) ripple = { ...cursor, p: (t - g - CLICK) / 600 };
    }
  });
  const hw = W / (2 * c.s), hh = H / (2 * c.s);
  c.x = clamp(c.x, hw, W - hw);
  c.y = clamp(c.y, hh, H - hh);
  const isPressed = (ch.moves ?? []).some(([at, , click]) => click && pressed(lt, at));
  const inApp = !!ch.url;

  const capIdx = chapters.slice(0, ci).reduce((a, x) => a + x.captions.length, 0) + Math.max(0, ch.captions.findLastIndex(([at]) => lt >= at));
  const caption = ch.captions.findLast(([at]) => lt >= at)?.[1] ?? ch.captions[0][1];

  return (
    <main className="flex min-h-dvh flex-col items-center bg-ink px-4 pb-6 text-white">
      <div className="flex w-full max-w-[1280px] items-center justify-between gap-4 py-3">
        <Logo light />
        <Link href="/build" className="inline-flex min-h-[44px] items-center rounded-full border border-white/25 px-5 text-[15px] font-semibold hover:border-white/60">Try it yourself</Link>
      </div>

      <div ref={player} className="flex w-full flex-col items-center bg-ink">
        <div ref={view} className="relative overflow-hidden rounded-t-[18px] bg-paper" style={{ width: "min(100%, calc((100dvh - 150px) * 1.6))", aspectRatio: `${W} / ${H}` }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${fit})` }}>
            <div ref={cam} className="relative origin-top-left text-ink" style={{ width: W, height: H, transform: `translate(${W / 2 - c.x * c.s}px, ${H / 2 - c.y * c.s}px) scale(${c.s})` }}>
              <div aria-hidden="true" className="dotgrid absolute inset-0" />
              <div aria-hidden="true" className="blob -right-24 -top-32 h-[460px] w-[460px] bg-gold" />
              <div aria-hidden="true" className="blob -bottom-40 -left-24 h-[420px] w-[420px] bg-cardinal opacity-25" style={{ animationDelay: "-6s" }} />

              {ch.id === "marcus" && <SceneMarcus t={lt} res={resources} />}
              {ch.id === "wei" && <SceneWei t={lt} res={resources} />}
              {ch.id === "sofia" && <SceneSofia t={lt} res={resources} />}
              {ch.id === "many" && <SceneMany t={lt} all={all} hosts={hostList.length} />}
              {ch.id === "reveal" && <SceneProblem t={lt} hosts={hostList} />}
              {ch.id === "rules" && <SceneRules t={lt} res={resources} question={fields.units_load?.question} />}
              {ch.id === "under" && <SceneUnder t={lt} evidence={resources[SCHOLAR]} hosts={hostList.length} />}
              {ch.id === "outro" && <SceneOutro t={lt} res={resources} />}
              {inApp && loaded && (
                <div className="absolute overflow-hidden rounded-[20px] bg-white shadow-[0_40px_90px_rgba(0,0,0,.18),0_0_0_1px_rgba(0,0,0,.06)]" style={{ left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h }}>
                  <div className="flex h-[44px] items-center gap-3 border-b border-rule bg-[#F7F7F4] px-4">
                    <span className="flex gap-1.5">{["#FF5F57", "#FEBC2E", "#28C840"].map((x) => <span key={x} className="h-3 w-3 rounded-full" style={{ background: x }} />)}</span>
                    <span key={ch.url} className="uin mx-auto flex min-w-[360px] items-center gap-2 rounded-full bg-white px-4 py-1 font-label text-[12px] text-muted ring-1 ring-rule">
                      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v7H3z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>{ch.url}
                    </span>
                    <span className="w-[46px]" />
                  </div>
                  <div key={ch.id} className="uin relative overflow-hidden bg-paper" style={{ height: FRAME.h - 44 }}>
                    {ch.id === "card" && <SceneCard t={lt} fields={fields} count={all.length} found={items.length} />}
                    {ch.id === "wallet" && <SceneWallet t={lt} items={items} total={total} />}
                    {ch.id === "ticket" && <SceneTicket t={lt} r={resources[SCHOLAR]} />}
                    {ch.id === "agent" && <SceneAgent t={lt} r={resources[SCHOLAR]} />}
                    {ch.id === "tracking" && <SceneTracking t={lt} r={resources[SCHOLAR]} />}
                    {ch.id === "ask" && <SceneAsk t={lt} fund={resources[FUND]} loan={resources[LOAN]} question={fields.units_load?.question} />}
                  </div>
                </div>
              )}

              {!STORY.has(ch.id) && loaded && (
                <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-50" style={{ transform: `translate(${cursor.x - 4}px, ${cursor.y - 3}px)` }}>
                  {ripple && <span className="absolute -left-5 -top-5 h-12 w-12 rounded-full border-[3px] border-gold" style={{ transform: `scale(${0.4 + ripple.p * 1.3})`, opacity: 1 - ripple.p }} />}
                  <svg width="30" height="34" viewBox="0 0 30 34" className="drop-shadow-[0_6px_10px_rgba(0,0,0,.3)] transition-transform duration-100" style={{ transform: `scale(${isPressed ? 0.82 : 1})` }}>
                    <path d="M4 3l20 15.5-9.2 1.2 5.6 10.6-4.4 2.2-5.4-10.8L4 28z" fill="#111111" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            {!loaded ? (
              <div className="absolute inset-0 flex items-center justify-center font-label text-lg tracking-[.16em] text-cardinal"><span className="upulse">LOADING THE TOUR</span></div>
            ) : (
              <div className="pointer-events-none absolute inset-x-0 bottom-[34px] flex justify-center">
                <div key={capIdx} className="uin flex max-w-[1000px] items-center gap-4 rounded-full bg-ink py-3 pl-3 pr-8 text-white shadow-[0_20px_50px_rgba(0,0,0,.35)]">
                  <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gold font-label text-[17px] font-semibold text-ink">{capIdx + 1}</span>
                  <span className="text-[24px] font-semibold leading-tight tracking-[-0.01em]">{caption}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-b-[18px] bg-[#0B0B0B] px-4 py-3 ring-1 ring-white/5" style={{ width: "min(100%, calc((100dvh - 150px) * 1.6))" }}>
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gold text-ink transition-transform hover:scale-105">
            {playing
              ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor" /></svg>
              : <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor" /></svg>}
          </button>
          <button type="button" onClick={() => seek(0)} aria-label="Restart" className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9a5.5 5.5 0 1 0 1.8-4.1M3.5 3v3.5H7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="hidden w-[92px] flex-none font-label text-[13px] tabular-nums text-white/60 sm:block">{clock(t)} / {clock(END)}</span>
          <div className="flex min-w-0 flex-1 gap-1.5">
            {chapters.map((x, i) => {
              const fill = clamp((t - starts[i]) / x.dur) * 100;
              return (
                <button key={x.id} type="button" onClick={() => seek(starts[i])} className="group flex min-h-[44px] min-w-0 flex-col justify-center gap-1.5 text-left" style={{ flex: x.dur }}>
                  <span className="block h-[3px] overflow-hidden rounded-full bg-white/15"><span className="block h-full bg-gold" style={{ width: `${fill}%` }} /></span>
                  <span className={`hidden truncate font-label text-[11px] md:block ${i === ci ? "text-gold" : "text-white/50 group-hover:text-white/80"}`}>{x.label}</span>
                </button>
              );
            })}
          </div>
          <button type="button" aria-label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : player.current?.requestFullscreen())} className="hidden h-11 w-11 flex-none items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] text-white/45">Space plays and pauses. Arrow keys jump between chapters.</p>
    </main>
  );
}

/** 1. The help is scattered: real source sites float in, then pull together into one place. */
function SceneProblem({ t, hosts }: { t: number; hosts: string[] }) {
  const shown = hosts.slice(0, 14);
  const pull = prog(t, 4600, 1500);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      {shown.map((h, i) => {
        const a = (i / shown.length) * Math.PI * 2 + 0.3;
        const rx = 560 + (i % 3) * 40, ry = 330 + (i % 2) * 30;
        const x = lerp(Math.cos(a) * rx, 0, pull), y = lerp(Math.sin(a) * ry, 0, pull);
        const on = t >= 900 + i * 140;
        return on && (
          <span key={h} className="absolute left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${1 - pull * 0.6})`, opacity: 1 - pull }}>
            <span className="upop flex items-center gap-2 rounded-full border border-rule bg-white px-4 py-2 font-label text-[15px] text-muted shadow-[0_10px_24px_rgba(0,0,0,.08)]">
              <span className="h-2 w-2 rounded-full" style={{ background: i % 3 === 0 ? "#9D2235" : i % 3 === 1 ? "#FFC72C" : "#111111" }} />{h}
            </span>
          </span>
        );
      })}
      <div className="relative max-w-[980px]" style={{ opacity: 1 - prog(t, 4500, 600) }}>
        <h1 className="font-display text-[84px] font-extrabold leading-[0.98] tracking-[-0.05em]">
          {"USC has set money and help aside.".split(" ").map((w, i) => (
            <span key={i} className="inline-block" style={{ opacity: prog(t, 200 + i * 120, 500), transform: `translateY(${(1 - prog(t, 200 + i * 120, 500)) * 30}px)`, marginRight: "0.25em" }}>{w}</span>
          ))}
        </h1>
      </div>
      {pull > 0.2 && (
        <div className="absolute flex flex-col items-center gap-5" style={{ opacity: pull, transform: `scale(${0.7 + pull * 0.3})` }}>
          <SCMark height={110} />
          <div className="font-display text-[88px] font-extrabold leading-none tracking-[-0.05em]">unclaimed<span className="text-cardinal">.</span></div>
          <div className="text-[26px] text-muted">Everything that's yours, <span className="text-sheen font-semibold">in one place.</span></div>
        </div>
      )}
    </div>
  );
}

/** 2. Three taps build the Trojan card, then the scan runs. */
function SceneCard({ t, fields, count, found }: { t: number; fields: Record<string, FieldSpec>; count: number; found: number }) {
  const lvl = t >= 2000 + CLICK, sch = t >= 4200 + CLICK, mon = t >= 6400 + CLICK, conf = t >= 7600 + CLICK, scan = t >= 11000 + CLICK + 200;
  const opt = (on: boolean, label: string, hit?: string, press?: boolean) => (
    <span data-hit={hit} className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 text-[17px] font-semibold transition-all duration-300 ${on ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink"} ${press ? "scale-95" : ""}`}>
      {label}{on && <span className="upop text-gold">{tick}</span>}
    </span>
  );
  const scanP = prog(t, 11500, 2200);
  return (
    <div className="grid h-full grid-cols-[1fr_440px] gap-14 p-12">
      <div className="flex flex-col gap-7">
        <div data-hit="q-level">
          <div className="mb-1 font-label text-[12px] font-medium uppercase tracking-[.12em] text-cardinal">Step 1 of 3</div>
          <div className="mb-3 font-display text-[26px] font-bold tracking-[-0.03em]">What are you studying toward?</div>
          <div className="grid grid-cols-3 gap-2.5">{opt(false, "Undergrad")}{opt(lvl, "Master's", "lvl-masters", pressed(t, 2000))}{opt(false, "PhD")}</div>
        </div>
        {t >= 2500 && (
          <div data-hit="q-school" className="uin">
            <div className="mb-3 font-display text-[26px] font-bold tracking-[-0.03em]">Which school are you in?</div>
            <div className="grid grid-cols-4 gap-2.5">{opt(false, "Dornsife")}{opt(false, "Viterbi")}{opt(false, "Annenberg")}{opt(sch, "Price", "sch-price", pressed(t, 4200))}</div>
          </div>
        )}
        {t >= 4700 && (
          <div data-hit="q-needs" className="uin">
            <div className="mb-3 font-display text-[26px] font-bold tracking-[-0.03em]">What's going on right now?</div>
            <div className="flex flex-wrap gap-2.5">
              {NEED_LABELS.slice(0, 8).map(([k, label]) => {
                const on = (k === "money" && mon) || (k === "conference" && conf);
                return (
                  <span key={k} data-hit={`need-${k}`} className={`rounded-full border px-4 py-2.5 text-[15px] font-semibold transition-all duration-300 ${on ? "border-ink bg-ink text-white" : "border-rule bg-white"} ${(k === "money" && pressed(t, 6400)) || (k === "conference" && pressed(t, 7600)) ? "scale-95" : ""}`}>{label}</span>
                );
              })}
            </div>
          </div>
        )}
        {t >= 8300 && (
          <span data-hit="find" className={`uin mt-auto flex min-h-[60px] w-[320px] items-center justify-center rounded-full bg-ink text-[18px] font-semibold text-white transition-transform ${pressed(t, 11000) ? "scale-95" : ""}`}>Find what's mine</span>
        )}
      </div>
      <div className="flex flex-col justify-center">
        <div className="mb-3 font-label text-[12px] font-medium uppercase tracking-[.12em] text-muted">Marcus's Trojan card</div>
        <div data-hit="trojan" className="-rotate-[2deg]">
          {fields.level && <TrojanCard fields={fields} level={lvl ? "masters" : null} schools={sch ? ["price"] : []} needs={[mon && "money", conf && "conference"].filter(Boolean) as string[]} />}
        </div>
      </div>
      {scan && (
        <div className="uin absolute inset-0 flex flex-col items-center justify-center bg-paper/95 backdrop-blur-sm">
          <span className="radar relative mb-8 flex h-24 w-24 items-center justify-center"><span /><span style={{ animationDelay: "1.3s" }} /><SCMark height={56} /></span>
          <div className="font-display text-[40px] font-bold tracking-[-0.03em]">Checking every approved USC resource</div>
          <div className="mt-5 h-2 w-[520px] overflow-hidden rounded-full bg-rule"><div className="h-full rounded-full bg-cardinal" style={{ width: `${scanP * 100}%` }} /></div>
          <div className="mt-4 font-label text-[15px] uppercase tracking-[.12em] text-muted"><span className="text-[22px] font-semibold text-ink">{Math.round(found * scanP)}</span> ready for Marcus</div>
        </div>
      )}
    </div>
  );
}

/** 3. The wallet fills: the total counts up and the tickets drop in. */
function SceneWallet({ t, items, total }: { t: number; items: Resource[]; total: number }) {
  const shown = items.slice(0, 9);
  const k = prog(t, 500, 2200);
  return (
    <div className="flex h-full flex-col">
      <div className="relative overflow-hidden bg-ink px-10 py-8 text-white">
        <div aria-hidden="true" className="blob -right-20 -top-28 h-[280px] w-[280px] bg-cardinal opacity-50" />
        <div className="relative flex items-end justify-between gap-8">
          <div>
            <div className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-white/55">Marcus's wallet</div>
            <div className="mt-2 font-display text-[56px] font-extrabold leading-none tracking-[-0.045em]"><span className="text-sheen">{Math.round(items.length * k)}</span> ready for you to claim.</div>
            <div data-hit="w-total" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[17px] font-semibold text-ink">{money(total * k)} in stated amounts</div>
          </div>
          <div className="flex gap-3">
            {[["Ready", String(items.length), "bg-gold text-ink"], ["One answer away", String(MARCUS_MAYBE), "bg-white text-ink"], ["In progress", "0", "bg-white/10 text-white"]].map(([l, v, cls]) => (
              <div key={l} className={`w-[150px] rounded-2xl px-4 py-3.5 ${cls}`}>
                <div className="font-display text-[34px] font-extrabold leading-none">{v}</div>
                <div className="mt-1.5 font-label text-[11px] uppercase tracking-[.08em] opacity-75">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 px-10 pt-6">
        {shown.map((r, i) => {
          const cat = stubFor(r.category);
          const hot = r.id === SCHOLAR && t >= 10600;
          return t >= 700 + i * 220 && (
            <div key={r.id} data-hit={`tk-${r.id}`} className={`upop relative overflow-hidden rounded-2xl border bg-white p-4 pt-5 transition-all duration-300 ${hot ? "-translate-y-1 border-ink shadow-[0_18px_36px_rgba(0,0,0,.14)]" : "border-rule"} ${r.id === SCHOLAR && pressed(t, 11600) ? "scale-[.97]" : ""}`}>
              <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: cat.bg }} />
              <div className="truncate font-label text-[11px] font-medium uppercase tracking-[.1em] text-muted"><span style={{ color: cat.bg === "#FFC72C" || cat.bg === "#FFDF7A" ? "#9D2235" : cat.bg }}>{cat.label}</span> / {r.provider}</div>
              <div className="mt-1.5 line-clamp-1 font-display text-[19px] font-semibold leading-tight">{r.title}</div>
              <div className="mt-3 flex items-center justify-between border-t border-rule pt-2.5">
                <span className="font-display text-[22px] font-bold">{r.benefit?.value != null ? money(r.benefit.value) : capitalize(cat.word.toLowerCase())}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 font-label text-[10.5px] font-medium uppercase text-ink">{tick}You qualify</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 4. The ticket: why it fits, the fine print, and the claim agent's button. */
function SceneTicket({ t, r }: { t: number; r: Resource }) {
  const note = (r.note ?? "").split("\n").map((l) => capitalize(l.trim())).map((l) => (/[.!?]$/.test(l) ? l : l + ".")).join(" ");
  return (
    <div className="flex h-full flex-col">
      <div className="relative overflow-hidden bg-ink px-10 py-8 text-white">
        <div aria-hidden="true" className="blob -left-20 -top-28 h-[260px] w-[260px] bg-gold opacity-30" />
        <div className="relative flex items-center justify-between gap-8">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-white/60">{r.provider}</span>
              <span className="rounded-full bg-gold px-3 py-1 font-label text-[11px] font-medium uppercase tracking-[.06em] text-ink">You qualify</span>
            </div>
            <div className="font-display text-[54px] font-bold leading-none tracking-[-0.04em]">{r.title}</div>
            <div className="mt-3 max-w-[640px] text-[17px] leading-snug text-white/70">{capitalize(r.benefit?.label ?? "")}</div>
            {r.deadline?.label && (
              <div data-hit="deadline" className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-gold/60 bg-gold/10 px-4 py-2 text-[15px] text-white" style={{ opacity: prog(t, 400, 400) }}>
                <span className="rounded-full bg-gold px-2 py-0.5 font-label text-[10.5px] font-semibold uppercase text-ink">Still open</span>
                {r.deadline.label.split(";").slice(0, 2).map((x) => capitalize(x.trim())).join(" · ")}
              </div>
            )}
          </div>
          <div className="w-[230px] flex-none rounded-[22px] border border-white/10 bg-white/[.06] p-5">
            <div className="font-label text-[11px] uppercase tracking-[.12em] text-white/60">{stubFor(r.category).label}</div>
            {/^up to/i.test(r.benefit?.label ?? "") && <div className="mt-3 font-label text-[11px] uppercase tracking-[.1em] text-white/60">Up to</div>}
            <div className="mt-1 font-display text-[54px] font-extrabold leading-none tracking-[-0.04em]">{r.benefit?.value != null ? money(r.benefit.value) : "Funds"}</div>
            <div className="mt-2 font-label text-[11px] uppercase tracking-[.1em] text-white/50">{r.benefit?.period ? `per ${r.benefit.period.replace(/^per /, "")}` : "stated on the source page"}</div>
          </div>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-[1fr_400px] gap-6 px-10 py-7">
        <div className="flex flex-col gap-5">
          <section data-hit="why" className="rounded-[22px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,.06)]">
            <div className="mb-4 font-display text-[22px] font-bold tracking-[-0.02em]">Why you qualify</div>
            <div className="grid grid-cols-2 gap-3">
              {WHY.map((w, i) => t >= 1100 + i * 500 && (
                <div key={w} className="upop flex items-start gap-3 rounded-xl bg-paper px-4 py-3 text-[16px] leading-[1.4]">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ink text-white">{tick}</span>{w}
                </div>
              ))}
            </div>
          </section>
          {note && (
            <div data-hit="note" className="rounded-2xl bg-[#FFF1B8] px-6 py-4 text-[16px] leading-normal">
              <strong className="font-semibold">Heads up.</strong> {note}
            </div>
          )}
        </div>
        <section className="rounded-[22px] bg-ink p-6 text-white">
          <div className="mb-2 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-white/60">Your claim agent</div>
          <div className="mb-4 font-display text-[24px] font-bold leading-tight">Let it do the paperwork.</div>
          <ol className="flex flex-col gap-2.5">
            {["Re-checks the source page right now", "Works out what you need", "Drafts your message", "Checks every statement"].map((x, i) => (
              <li key={x} className="flex items-center gap-3 text-[15px] text-white/70"><span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold font-label text-[12px] font-semibold text-ink">{i + 1}</span>{x}</li>
            ))}
          </ol>
          <span data-hit="claim-btn" className={`shine mt-5 flex min-h-[54px] items-center justify-center rounded-full bg-gold text-[17px] font-semibold text-ink transition-transform ${pressed(t, 8200) ? "scale-95" : ""}`}>Claim it for me</span>
        </section>
      </div>
    </div>
  );
}

/** 5. The claim agent's live trace, then the draft types itself out and passes the check. */
function SceneAgent({ t, r }: { t: number; r: Resource }) {
  const typed = Math.floor(clamp((t - 3800) / 5400) * DRAFT.length);
  const cur = AGENT_STEPS.findIndex(([, , when]) => t < when);
  // Each claim in the draft, where it comes from, and when the check reaches it.
  const checks: [string, string, number][] = [
    ["master's student at the USC Price School of Public Policy", "Your card", 10000],
    ["U.S. military veteran", "Your card", 10600],
    ["open on December 1, 2026", `Source page, ${hostOf(r.source_url)}`, 11200],
  ];
  const parts: React.ReactNode[] = [];
  if (typed < DRAFT.length) parts.push(DRAFT.slice(0, typed));
  else {
    let rest = DRAFT;
    checks.forEach(([phrase, , when]) => {
      const i = rest.indexOf(phrase);
      parts.push(rest.slice(0, i));
      parts.push(<mark key={phrase} className={`rounded px-0.5 transition-colors duration-300 ${t >= when ? "bg-gold/70 text-ink" : "bg-transparent text-inherit"}`}>{phrase}</mark>);
      rest = rest.slice(i + phrase.length);
    });
    parts.push(rest);
  }
  return (
    <div className="grid h-full grid-cols-[440px_1fr] gap-8 bg-[#111111] p-9 text-white">
      <div data-hit="trace">
        <div className="mb-2 flex items-center gap-3"><span className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-white/60">Claim agent</span><AiTag dark /></div>
        <div className="mb-6 font-display text-[30px] font-bold leading-tight tracking-[-0.03em]">{r.title}</div>
        <ol className="flex flex-col gap-4">
          {AGENT_STEPS.map(([label, result, when], i) => {
            const done = t >= when, now = i === cur;
            return (
              <li key={label} className="flex items-start gap-3.5">
                <span className={`mt-px inline-flex h-7 w-7 flex-none items-center justify-center rounded-full ${done ? "upop bg-gold text-ink" : now ? "upulse border-2 border-gold" : "border-2 border-[#4A4A4A]"}`}>{done && tick}</span>
                <div>
                  <div className={`text-[17px] font-medium ${done || now ? "text-white" : "text-white/40"}`}>{label}</div>
                  {done && <div className="uin mt-0.5 text-[14px] leading-snug text-white/60">{result}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div data-hit="draft" className="flex flex-col rounded-[22px] bg-white p-6 text-ink">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-muted">Your draft</span>
          {t >= AGENT_STEPS[4][2] && <span className="upop inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 font-label text-[11px] font-medium uppercase text-ink">{tick}Grounded in your card and the source</span>}
        </div>
        <div className="whitespace-pre-line text-[15.5px] leading-relaxed text-body">
          {typed > 0 ? <>{parts}{typed < DRAFT.length && <span aria-hidden="true" className="caret" />}</> : <span className="text-muted">Waiting for the checklist...</span>}
        </div>
        {t >= checks[0][2] - 300 && (
          <div data-hit="checks" className="uin mt-auto rounded-2xl bg-paper p-4">
            <div className="mb-2 flex items-center gap-2"><AiTag label="Grounding check" /></div>
            {checks.map(([phrase, src, when]) => (
              <div key={phrase} className={`flex items-center justify-between gap-3 py-1 text-[14px] transition-opacity ${t >= when ? "opacity-100" : "opacity-30"}`}>
                <span className="flex min-w-0 items-center gap-2"><span className={`inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${t >= when ? "bg-ink text-white" : "border-2 border-rule"}`}>{t >= when && tick}</span><span className="truncate">&ldquo;{phrase}&rdquo;</span></span>
                <span className="flex-none font-label text-[11px] uppercase tracking-[.06em] text-cardinal">{src}</span>
              </div>
            ))}
          </div>
        )}
        <span data-hit="send-btn" className={`mt-3 flex min-h-[50px] items-center justify-center rounded-full text-[16px] font-semibold transition-colors ${t >= AGENT_STEPS[5][2] ? "shine bg-ink text-white" : "bg-[#ECECE6] text-muted"}`}>Copy message</span>
      </div>
    </div>
  );
}

/** 6. The claim moves along its track until the stamp lands. */
function SceneTracking({ t, r }: { t: number; r: Resource }) {
  const idx = t >= 5400 ? 3 : t >= 3600 ? 2 : t >= 1800 ? 1 : 0;
  const day = [1, 1, 7, 30][idx];
  const line = ["Draft ready to review", "Sent on day 1", "In review since day 7", "Received on day 30"][idx];
  return (
    <div className="flex h-full flex-col px-12 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-cardinal">Claims</div>
          <div className="font-display text-[48px] font-bold leading-none tracking-[-0.04em]">Your claims</div>
        </div>
        <span key={day} className="upop rounded-full bg-ink px-4 py-2 font-label text-[13px] uppercase tracking-[.1em] text-white">Demo clock <span className="text-gold">Day {day}</span></span>
      </div>
      <div data-hit="claim-card" className="relative mx-auto w-full max-w-[860px] rounded-[26px] bg-white p-8 shadow-[0_24px_60px_rgba(0,0,0,.10)]">
        <span className="absolute inset-x-0 top-0 h-2 rounded-t-[26px]" style={{ background: stubFor(r.category).bg }} />
        <div className="font-label text-[12px] uppercase tracking-[.1em] text-muted">{r.provider}</div>
        <div className="mt-1 flex items-end justify-between gap-6">
          <div className="font-display text-[38px] font-bold leading-tight tracking-[-0.03em]">{r.title}</div>
          <div className="font-display text-[44px] font-extrabold leading-none">{r.benefit?.value != null ? `${/^up to/i.test(r.benefit.label ?? "") ? "Up to " : ""}${money(r.benefit.value)}` : ""}</div>
        </div>
        <div className="mt-8 scale-[1.15] px-[7%]"><Track index={idx} /></div>
        <div key={idx} className="uin mt-8 text-[18px] font-medium">{line}</div>
        {idx === 3 && <span data-hit="stamp" className="ustamp absolute right-10 top-10 rounded-lg border-[3px] border-cardinal px-4 py-1 font-label text-[26px] font-semibold tracking-[.14em] text-cardinal">CLAIMED</span>}
      </div>
    </div>
  );
}

/** The Navigator: he asks in plain words and the answer comes back from approved data and his card. */
function SceneAsk({ t, fund, loan, question }: { t: number; fund?: Resource; loan?: Resource; question?: string }) {
  const Q = "I'm short on money this month. Is there anything for me?";
  const typed = t < 3150 ? Q.slice(0, Math.floor(clamp((t - 400) / 2200) * Q.length)) : "";
  const chips: [string, number][] = [["Understood: help with money", 4000], ["Read your card", 4600], ["Searched approved USC resources", 5100]];
  return (
    <div className="flex h-full flex-col px-[180px] pb-8 pt-8">
      <div className="mb-6">
        <div className="flex items-center gap-3"><span className="font-label text-[12px] font-medium uppercase tracking-[.12em] text-cardinal">Navigator</span><AiTag /></div>
        <div className="font-display text-[40px] font-bold leading-none tracking-[-0.04em]">Ask about any USC help</div>
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {t >= 3150 && <div className="upop self-end rounded-[22px] rounded-br-md bg-ink px-5 py-3.5 text-[18px] text-white">{Q}</div>}
        {t >= 3600 && (
          <div className="flex gap-2">
            {chips.map(([l, at], i) => t >= 3600 + i * 450 && (
              <span key={l} className="upop inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 font-label text-[12px] text-muted">
                {t >= at ? <span className="text-cardinal">{tick}</span> : <span className="h-3 w-3 animate-spin rounded-full border-2 border-rule border-t-ink" />}{l}
              </span>
            ))}
          </div>
        )}
        {t >= 5200 && (
          <div data-hit="ask-reply" className="upop max-w-[760px] rounded-[22px] rounded-bl-md bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,.06)]">
            <div className="text-[18px] leading-snug">Based on your card, here&apos;s what fits:</div>
            <div className="mt-3 flex flex-col gap-2.5">
              {fund && t >= 5700 && (
                <div data-hit="ask-r1" className={`uin flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition-all ${t >= 8800 ? "border-ink shadow-[0_10px_24px_rgba(0,0,0,.1)]" : "border-rule"}`}>
                  <div className="min-w-0">
                    <div className="font-display text-[19px] font-semibold">{fund.title}</div>
                    <div className="truncate text-[14px] text-muted">{capitalize((fund.benefit?.label ?? "").split(";")[0])}</div>
                  </div>
                  <span className="flex-none rounded-full bg-gold px-2.5 py-1 font-label text-[11px] uppercase">You qualify</span>
                </div>
              )}
              {loan && t >= 6300 && (
                <div className="uin flex items-center justify-between gap-4 rounded-2xl border border-rule px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-display text-[19px] font-semibold">{loan.title}</div>
                    {question && <div className="truncate text-[14px] text-muted">One question first: {question}</div>}
                  </div>
                  <span className="flex-none rounded-full border border-ink px-2.5 py-1 font-label text-[11px] uppercase">One answer away</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div data-hit="ask-input" className="mt-4 flex items-center gap-3 rounded-full border border-rule bg-white py-2 pl-6 pr-2">
        <span className="flex-1 text-[18px]">{typed || <span className="text-muted">Ask about money, housing, jobs...</span>}{typed && t < 3150 && <span aria-hidden="true" className="caret" />}</span>
        <span data-hit="ask-send" className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white transition-transform ${pressed(t, 2900) ? "scale-90" : ""}`}>
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>
    </div>
  );
}

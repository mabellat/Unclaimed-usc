"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStudent } from "@/lib/student";
import { money, stubFor } from "@/lib/ui";
import type { Resource } from "@/lib/types";
import { FlipNumber, Reveal, Rise, Tilt } from "@site/components/Motion";
import { Footer, Logo, WRAP } from "@site/components/Shell";

const MARQUEE = "EMERGENCY LOANS · LEGAL HELP · TRAVEL AWARDS · RESEARCH FELLOWSHIPS · LAPTOP LOANS · FOOD PANTRY · RESUME REVIEW · ";
// Where the hero tickets sit (px inside a 560 x 500 box) and how they tilt.
const SPOTS = [
  { left: 10, top: 20, r: "-8deg", delay: "0s" },
  { left: 250, top: 0, r: "6deg", delay: "-2s" },
  { left: 60, top: 170, r: "3deg", delay: "-4s" },
  { left: 300, top: 205, r: "-5deg", delay: "-1s" },
  { left: 120, top: 340, r: "-3deg", delay: "-3s" },
];
// An optional campus photo behind the hero (one you took or have rights to), e.g. /campus/hero.jpg in
// apps/site/public. It is shown tinted cardinal. Without it, the hero uses the drawn skyline only.
const HERO_PHOTO = process.env.NEXT_PUBLIC_HERO_PHOTO;
// Plain names for each kind of help on the landing page.
const KIND: Record<string, string> = {
  cash: "Emergency money", scholarship: "Scholarships & fellowships", legal: "Legal help", career: "Career help",
  basics: "Food, housing & basics", health: "Health & insurance", jobs: "Paid work", academic_support: "Help with classes",
  transportation: "Getting around", support_office: "Support offices", community: "Community centers", international: "International students",
};
const STEPS = [
  { n: "01", title: "Build your card", body: "Three quick questions: your level, your school, and what's going on. No login, no name.", art: "card" },
  { n: "02", title: "See what's yours", body: "A plain rules engine checks every approved fund and service, and tells you why each one fits.", art: "tickets" },
  { n: "03", title: "Claim it for me", body: "An AI agent re-checks the page, lists what to prepare and drafts your message. You send it.", art: "packet" },
] as const;
/** Pick the hero tickets: the largest amounts first, one per kind of help. */
function heroTickets(resources: Resource[]): Resource[] {
  const sorted = [...resources].sort((a, b) => (b.benefit?.value ?? 0) - (a.benefit?.value ?? 0));
  const out: Resource[] = [];
  const kinds = new Set<string>();
  for (const r of sorted) {
    if (out.length === SPOTS.length) break;
    if (kinds.has(r.category)) continue;
    kinds.add(r.category);
    out.push(r);
  }
  return out;
}

function MiniTicket({ r, className = "", style }: { r: Resource; className?: string; style?: React.CSSProperties }) {
  const stub = stubFor(r.category);
  const value = r.benefit?.value;
  return (
    <div className={`flex h-[104px] w-[236px] overflow-hidden rounded-xl ${className}`} style={style}>
      <div className="flex w-[80px] flex-none flex-col items-center justify-center px-1 text-center" style={{ background: stub.bg, color: stub.fg }}>
        <span className="font-label text-[10px] tracking-[.16em]">{stub.label}</span>
        <span className="mt-0.5 font-label text-[21px] font-semibold leading-none">{value != null ? money(value) : stub.word}</span>
      </div>
      <div className="w-0 border-l-2 border-dashed border-rule" />
      <div className="min-w-0 flex-1 bg-ticket p-3 text-ink">
        <div className="truncate font-label text-[10px] uppercase tracking-[.12em] text-cardinal">{r.provider}</div>
        <div className="mt-1 line-clamp-2 font-display text-base font-bold leading-[1.12]">{r.title}</div>
      </div>
    </div>
  );
}

function StepArt({ art }: { art: "card" | "tickets" | "packet" }) {
  if (art === "card") {
    return (
      <div className="relative h-full overflow-hidden rounded-xl bg-cardinal p-4 text-ticket">
        <div className="flex justify-between font-label text-[10px] tracking-[.18em]"><span className="text-gold">TROJAN CARD</span><span className="text-blush">ID 4821 0937</span></div>
        <div className="mt-3 font-display text-xl font-bold">Master's</div>
        <div className="text-xs text-blush">Viterbi</div>
        <div className="mt-2 flex gap-1.5">{["Doing research", "Conference"].map((t) => <span key={t} className="rounded-full border border-gold px-2 py-px text-[10px] text-gold">{t}</span>)}</div>
        <div className="barcode mt-3 h-3" />
      </div>
    );
  }
  if (art === "tickets") {
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        {[["#BDE6D9", "#182522", "CASH", "w-[92%]"], ["#CDE5E4", "#183F3B", "SCHOLAR", "w-[80%]"], ["#182522", "#BDE6D9", "LEGAL", "w-[68%]"]].map(([bg, fg, l, w]) => (
          <div key={l} className={`flex h-9 overflow-hidden rounded-md bg-ticket shadow-[0_1px_0_#D9E3DD] ${w}`}>
            <span className="flex w-16 items-center justify-center font-label text-[10px] tracking-[.14em]" style={{ background: bg, color: fg }}>{l}</span>
            <span className="flex flex-1 items-center gap-2 px-2.5"><span className="h-2 w-2/3 rounded bg-rule" /><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#245F58" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="relative flex h-full flex-col gap-2 rounded-xl bg-ticket p-4 shadow-[0_1px_0_#D9E3DD]">
      {["Source page checked", "What to prepare", "Draft message ready"].map((t) => (
        <div key={t} className="flex items-center gap-2 text-[13px]">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-cardinal"><svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{t}
        </div>
      ))}
      <div className="mt-auto rounded-md bg-gold py-1.5 text-center text-xs font-semibold">You send it</div>
      <div className="stamp-on-view absolute right-3 top-7 rounded-md border-[3px] border-cardinal px-2 py-0.5 font-label text-lg font-semibold tracking-[.12em] text-cardinal">CLAIMED</div>
    </div>
  );
}

/** "What's inside": pick a kind on the left and its whole shelf of tickets opens on the right. Cycles on its own until someone picks. */
function Inside({ kinds }: { kinds: [string, Resource[]][] }) {
  const [pick, setPick] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held || kinds.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setPick((p) => (p + 1) % kinds.length), 3800);
    return () => clearInterval(t);
  }, [held, kinds.length]);
  const [k, list] = kinds[Math.min(pick, kinds.length - 1)];
  const s = stubFor(k);
  const choose = (i: number) => { setHeld(true); setPick(i); };
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
      <div role="tablist" aria-label="Kinds of help" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {kinds.map(([kk, l], i) => {
          const on = i === pick;
          const st = stubFor(kk);
          return (
            <button key={kk} type="button" role="tab" aria-selected={on} onClick={() => choose(i)} onMouseEnter={() => choose(i)}
              className={`relative flex min-h-[52px] flex-none items-center gap-3 overflow-hidden rounded-xl px-4 text-left transition-colors lg:flex-auto ${on ? "bg-gold text-ink" : "bg-[rgba(0,0,0,.22)] text-ticket hover:bg-[rgba(0,0,0,.35)]"}`}>
              <span aria-hidden="true" className="h-3.5 w-3.5 flex-none rounded-full border border-[rgba(0,0,0,.2)]" style={{ background: st.bg }} />
              <span className="flex-1 whitespace-nowrap text-[15px] font-semibold">{KIND[kk] ?? st.label}</span>
              <span className={`font-label text-lg font-semibold ${on ? "text-cardinal-dark" : "text-gold"}`}>{l.length}</span>
              {on && !held && <span aria-hidden="true" key={pick} className="inside-timer absolute bottom-0 left-0 h-[3px] bg-cardinal-dark" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-h-[440px]">
        <div key={k} className="uin flex h-full flex-col overflow-hidden rounded-3xl bg-ticket text-ink shadow-[0_24px_60px_rgba(0,0,0,.4)]">
          <div className="flex items-end justify-between gap-6 px-8 pb-6 pt-7" style={{ background: s.bg, color: s.fg }}>
            <div>
              <div className="font-label text-xs tracking-[.2em] opacity-80">{s.label}</div>
              <div className="mt-1 font-display text-[32px] font-bold leading-tight md:text-[38px]">{KIND[k] ?? s.label}</div>
            </div>
            <div className="text-right">
              <div className="font-label text-[72px] font-semibold leading-[.8]">{list.length}</div>
              <div className="mt-1 font-label text-[11px] uppercase tracking-[.18em] opacity-80">{list.length === 1 ? "ticket" : "tickets"}</div>
            </div>
          </div>
          <div aria-hidden="true" className="relative h-0">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-cardinal-dark" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-cardinal-dark" />
            <span className="absolute left-5 right-5 top-0 border-t-2 border-dashed border-rule" />
          </div>
          <ul className="grid flex-1 content-start gap-x-8 px-8 pb-8 pt-6 md:grid-cols-2">
            {list.slice(0, 10).map((r, i) => (
              <li key={r.id} className="uin flex items-start gap-3 border-b border-rule py-3" style={{ animationDelay: `${120 + i * 45}ms` }}>
                <span aria-hidden="true" className="mt-[7px] h-2 w-2 flex-none rounded-full" style={{ background: s.bg === "#FFFFFF" ? "#245F58" : s.bg, boxShadow: "0 0 0 1px rgba(0,0,0,.18)" }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug">{r.title}</span>
                  <span className="block truncate text-[13px] text-muted">{r.provider}</span>
                </span>
                {r.benefit?.value != null && <span className="flex-none font-label text-[15px] font-semibold text-cardinal">{money(r.benefit.value)}</span>}
              </li>
            ))}
          </ul>
          {list.length > 10 && <div className="px-8 pb-6 font-label text-xs uppercase tracking-[.14em] text-cardinal">+ {list.length - 10} more inside</div>}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { card, resources, error, ready } = useStudent();
  const all = useMemo(() => Object.values(resources), [resources]);
  // The hero tickets drift with the pointer, each at its own depth.
  function parallax(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", String((e.clientX - b.left) / b.width - 0.5));
    e.currentTarget.style.setProperty("--my", String((e.clientY - b.top) / b.height - 0.5));
  }
  const hero = useMemo(() => heroTickets(all), [all]);
  const kinds = useMemo(() => {
    const m = new Map<string, Resource[]>();
    all.forEach((r) => m.set(r.category, [...(m.get(r.category) ?? []), r]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [all]);
  const scholarships = all.filter((r) => r.category === "scholarship" || r.category === "cash").length;

  const cta = card
    ? <Link href="/wallet" className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-gold px-8 text-[17px] font-semibold text-ink shadow-[0_5px_0_#183F3B] transition-transform hover:-translate-y-0.5">Open my wallet</Link>
    : <Link href="/build" className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-gold px-8 text-[17px] font-semibold text-ink shadow-[0_5px_0_#183F3B] transition-transform hover:-translate-y-0.5">Build my Trojan card</Link>;

  return (
    <main>
      {/* Hero */}
      <section onPointerMove={parallax} className="relative overflow-hidden bg-cardinal text-ticket">
        {HERO_PHOTO && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={HERO_PHOTO} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply grayscale" />
        )}
        <svg width="900" height="900" viewBox="0 0 900 900" aria-hidden="true" className="ripple pointer-events-none absolute -right-[260px] -top-[340px]">
          <g fill="none" stroke="#BDE6D9" strokeOpacity="0.22" strokeWidth="2">{[100, 170, 240, 310, 380, 450].map((r, i) => <circle key={r} cx="450" cy="450" r={r} style={{ animationDelay: `${-i * 1.5}s` }} />)}</g>
        </svg>
        <div className={`${WRAP} relative`}>
          <nav aria-label="Site" className="flex items-center justify-between gap-4 py-4">
            <Logo />
            <div className="hidden items-center gap-1 md:flex">
              {[["#how", "How it works"], ["#inside", "What's inside"]].map(([h, l]) => (
                <a key={h} href={h} className="inline-flex min-h-[44px] items-center rounded-full px-4 text-[15px] text-blush hover:bg-[rgba(0,0,0,.15)] hover:text-ticket">{l}</a>
              ))}
            </div>
            <Link href={card ? "/wallet" : "/build"} className="inline-flex min-h-[44px] items-center rounded-full border-2 border-gold px-5 text-[15px] font-semibold text-gold hover:bg-gold hover:text-ink">{card ? "My wallet" : "Get started"}</Link>
          </nav>

          <div className="grid max-w-[850px] items-center gap-10 pb-20 pt-10 lg:pt-20">
            <div>
              <div className="uin mb-5 inline-flex items-center gap-2 rounded-full bg-[rgba(0,0,0,.2)] px-4 py-1.5 font-label text-[13px] uppercase tracking-[.18em] text-gold">For USC students</div>
              <h1 className="mb-6 font-display text-[48px] font-bold leading-[1.0] tracking-[-0.03em] md:text-[68px]">
                <Rise text="USC has set money and help aside." /> <Rise text="Some of it is yours." start={480} className="italic text-gold" />
              </h1>
              <p className="uin mb-8 max-w-[560px] text-lg leading-normal text-blush" style={{ animationDelay: "900ms" }}>
                Build your card once. We match you to every fund, clinic and service you qualify for, explain why, then an AI agent does the paperwork.
              </p>
              <div className="uin flex flex-wrap items-center gap-4" style={{ animationDelay: "1050ms" }}>
                {cta}
              </div>
              {error && <p role="alert" className="mt-5 max-w-[560px] rounded-lg bg-cardinal-dark p-3 text-sm">Can't reach the Unclaimed API: {error}</p>}
            </div>

            <div className="relative mx-auto hidden h-[470px] w-[560px]" aria-hidden="true">
              {hero.map((r, i) => (
                <div key={r.id} className="uin absolute" style={{ left: SPOTS[i].left, top: SPOTS[i].top, animationDelay: `${300 + i * 140}ms` }}>
                  <div className="transition-transform duration-300 ease-out" style={{ transform: `translate(calc(var(--mx, 0) * ${18 + i * 9}px), calc(var(--my, 0) * ${14 + i * 7}px))` }}>
                    <div className="udrift" style={{ animationDelay: SPOTS[i].delay, ["--r" as string]: SPOTS[i].r, transform: `rotate(${SPOTS[i].r})` }}>
                      <Tilt className="rounded-xl shadow-[0_16px_28px_rgba(0,0,0,.32)]" max={12}><MiniTicket r={r} /></Tilt>
                    </div>
                  </div>
                </div>
              ))}
              {ready && all.length > 0 && (
                <div className="uin absolute bottom-2 right-0 rotate-[4deg] rounded-xl border-2 border-ink bg-gold px-5 py-3 text-ink shadow-[5px_5px_0_#182522]" style={{ animationDelay: "1100ms" }}>
                  <div className="font-label text-[44px] font-semibold leading-none">{all.length}</div>
                  <div className="text-[13px] font-medium">funds, scholarships &amp; services</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hero-marquee relative -mx-6 -mb-2 -rotate-2 overflow-hidden border-y-2 border-ink bg-gold text-ink" aria-hidden="true">
          <div className="umarq">
            {[0, 1, 2, 3].map((i) => <span key={i} className="whitespace-nowrap py-3 font-label text-xl font-semibold tracking-[.12em]">{MARQUEE}</span>)}
          </div>
        </div>
      </section>

      {/* Numbers: one scoreboard, three counts */}
      <section className="paper-grain">
        <div className={`${WRAP} py-16`}>
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-ink text-ticket shadow-[8px_8px_0_#BDE6D9]">
              <div className="flex flex-col gap-1 border-b-2 border-dashed border-[#34463E] px-8 py-5 md:flex-row md:items-baseline md:justify-between">
                <div className="font-label text-[13px] uppercase tracking-[.2em] text-gold">The scoreboard</div>
                <div className="font-display text-[22px] font-bold italic">Set aside for USC students, waiting in one wallet.</div>
              </div>
              <div className="grid md:grid-cols-3">
                {([
                  [all.length, "Funds, scholarships & services", "Every one checked by hand"],
                  [scholarships, "Put money in your pocket", "Emergency funds and scholarships"],
                  [kinds.length, "Kinds of help", "From food to legal advice"],
                ] as [number, string, string][]).map(([n, l, sub], i) => (
                  <div key={l} className={`flex flex-col items-center px-6 py-9 text-center ${i ? "border-t-2 border-dashed border-[#34463E] md:border-l-2 md:border-t-0" : ""}`}>
                    <FlipNumber value={n} label={l} />
                    <div className="mt-4 font-label text-[15px] uppercase tracking-[.14em] text-gold">{l}</div>
                    <div className="mt-1 text-sm text-[#BFB3A8]">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-4 bg-paper">
        <div className={`${WRAP} py-20`}>
          <Reveal><div className="mb-3 font-label text-[13px] uppercase tracking-[.16em] text-cardinal">How it works</div>
          <h2 className="mb-12 max-w-[720px] font-display text-[40px] font-bold leading-[1.08] tracking-[-0.015em] md:text-[48px]">From "is there anything for me?" to a ready-to-send claim.</h2></Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 140} className="h-full">
                <Tilt className="flex h-full flex-col rounded-2xl bg-ticket p-6 shadow-[0_1px_0_#D9E3DD,0_14px_30px_rgba(60,20,10,.07)]" max={5}>
                  <div className="mb-5 h-[150px] rounded-xl bg-paper p-4"><StepArt art={s.art} /></div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-label text-[40px] font-semibold leading-none text-gold [-webkit-text-stroke:1.5px_#245F58]">{s.n}</span>
                    <h3 className="font-display text-[26px] font-bold leading-tight">{s.title}</h3>
                  </div>
                  <p className="mt-2 text-[15px] leading-normal text-body">{s.body}</p>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What's inside */}
      {kinds.length > 0 && (
        <section id="inside" className="relative scroll-mt-4 overflow-hidden bg-cardinal-dark text-ticket">
          <svg width="800" height="800" viewBox="0 0 800 800" aria-hidden="true" className="ripple pointer-events-none absolute -right-[300px] -top-[300px]">
            <g fill="none" stroke="#BDE6D9" strokeOpacity="0.14" strokeWidth="2">{[110, 180, 250, 320, 390].map((r, i) => <circle key={r} cx="400" cy="400" r={r} style={{ animationDelay: `${-i * 1.8}s` }} />)}</g>
          </svg>
          <div className={`${WRAP} relative py-20`}>
            <Reveal>
              <div className="mb-3 font-label text-[13px] uppercase tracking-[.16em] text-gold">What's inside</div>
              <h2 className="mb-3 max-w-[760px] font-display text-[40px] font-bold leading-[1.08] tracking-[-0.015em] md:text-[52px]">Everything you can claim, <span className="italic text-gold">in one place.</span></h2>
              <p className="mb-10 max-w-[640px] text-[17px] leading-normal text-blush">Emergency funds, scholarships, legal help, career services and the basics, from offices across campus.</p>
            </Reveal>
            <Inside kinds={kinds} />
          </div>
        </section>
      )}

      <Footer dark />
    </main>
  );
}

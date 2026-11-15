"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStudent } from "@/lib/student";
import { money, stubFor } from "@/lib/ui";
import type { Resource } from "@/lib/types";
import { TrojanCard } from "@/components/TrojanCard";
import { Reveal, Rise, RotatingWord, Spotlight, TypeOut, useInView, useLoop, useStepper } from "@site/components/Motion";
import { Footer, Logo, WRAP } from "@site/components/Shell";
import { TryAStudent } from "@site/components/TryAStudent";

const TICKER = ["Emergency loans", "Legal help", "Travel awards", "Research fellowships", "Laptop loans", "Food pantry", "Resume review", "Scholarships"];
const WORDS = ["emergency funds.", "scholarships.", "legal help.", "a free laptop.", "groceries.", "travel money.", "career help."];
// Plain names for each kind of help on the landing page.
const KIND: Record<string, string> = {
  cash: "Emergency money", scholarship: "Scholarships & fellowships", legal: "Legal help", career: "Career help",
  basics: "Food, housing & basics", health: "Health & insurance", jobs: "Paid work", academic_support: "Help with classes",
  transportation: "Getting around", support_office: "Support offices", community: "Community centers", international: "International students",
};
const STEPS = [
  { title: "Tell us a little about you", body: "Three quick taps: your degree, your school and what's going on right now.", url: "unclaimed.app/build" },
  { title: "See everything you qualify for", body: "Every fund, scholarship and service that fits you, with the reason it fits, all in one wallet.", url: "unclaimed.app/wallet" },
  { title: "Let the agent do the paperwork", body: "It checks the page again, lists what to bring and drafts your message. You read it and send it.", url: "unclaimed.app/claim" },
];
const STEP_MS = 7000;
/** Pick the hero tickets: the largest amounts first, one per kind of help. */
function heroTickets(resources: Resource[], n = 3): Resource[] {
  const sorted = [...resources].sort((a, b) => (b.benefit?.value ?? 0) - (a.benefit?.value ?? 0));
  const out: Resource[] = [];
  const kinds = new Set<string>();
  for (const r of sorted) {
    if (out.length === n) break;
    if (kinds.has(r.category)) continue;
    kinds.add(r.category);
    out.push(r);
  }
  return out;
}

function MiniTicket({ r, className = "" }: { r: Resource; className?: string }) {
  const cat = stubFor(r.category);
  const value = r.benefit?.value;
  return (
    <div className={`w-[280px] rounded-2xl border border-rule bg-white p-4 text-ink shadow-[0_18px_40px_rgba(0,0,0,.10)] ${className}`}>
      <div className="flex items-center gap-2 font-label text-[10.5px] font-medium uppercase tracking-[.1em] text-muted">
        <span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ background: cat.bg }} />
        <span className="truncate">{cat.label} · {r.provider}</span>
      </div>
      <div className="mt-2.5 line-clamp-2 font-display text-[17px] font-semibold leading-[1.2]">{r.title}</div>
      <div className="mt-3 flex items-end justify-between border-t border-rule pt-3">
        <span className="font-display text-[22px] font-bold leading-none">{value != null ? money(value) : <span className="text-[15px] font-semibold text-muted">{cat.word.charAt(0) + cat.word.slice(1).toLowerCase()}</span>}</span>
        <span className="rounded-full bg-[#DCEFE1] px-2 py-0.5 font-label text-[10px] font-medium uppercase tracking-[.06em] text-[#14532D]">You qualify</span>
      </div>
    </div>
  );
}

const tick = <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className="flex-none"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** A phone that fills its wallet on a loop: the scan finds tickets one by one and the total climbs. */
function PhoneDemo({ items }: { items: Resource[] }) {
  const n = items.length;
  const step = useLoop(n + 4, 950);
  const shown = Math.min(step, n);
  const total = items.slice(0, shown).reduce((a, r) => a + (r.benefit?.value ?? 0), 0);
  return (
    <div className="relative w-[300px] rounded-[50px] bg-ink p-[11px] shadow-[0_50px_100px_rgba(0,0,0,.28),0_0_0_1px_rgba(0,0,0,.06)]">
      <div className="absolute left-1/2 top-[22px] z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-ink" />
      <div className="relative h-[610px] overflow-hidden rounded-[40px] bg-paper">
        <div className="bg-ink px-5 pb-5 pt-14 text-white">
          <div className="font-label text-[9.5px] font-medium uppercase tracking-[.14em] text-white/55">Waiting for you</div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.04em]">{money(total)}</div>
          <div className="mt-2 flex items-center gap-2 font-label text-[10px] uppercase tracking-[.1em] text-white/60">
            {shown < n
              ? <><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold" /><span className="relative h-1.5 w-1.5 rounded-full bg-gold" /></span>Scanning USC pages</>
              : <><span className="text-gold">{tick}</span>{n} matches found</>}
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold transition-[width] duration-700 ease-out" style={{ width: `${(shown / n) * 100}%` }} /></div>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {items.slice(0, shown).map((r) => {
            const cat = stubFor(r.category);
            return (
              <div key={r.id} className="upop rounded-2xl border border-rule bg-white p-3">
                <div className="flex items-center gap-1.5 font-label text-[8.5px] font-medium uppercase tracking-[.1em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full ring-1 ring-black/10" style={{ background: cat.bg }} /><span className="truncate">{cat.label} · {r.provider}</span>
                </div>
                <div className="mt-1 truncate font-display text-[13.5px] font-semibold leading-tight">{r.title}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-display text-[16px] font-bold leading-none">{r.benefit?.value != null ? money(r.benefit.value) : cat.word.charAt(0) + cat.word.slice(1).toLowerCase()}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCEFE1] px-1.5 py-0.5 font-label text-[8px] font-medium uppercase text-[#14532D]">{tick}You qualify</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A small pill that bobs beside the hero phone. */
function Floater({ children, className, delay, tone }: { children: React.ReactNode; className: string; delay: string; tone: "white" | "ink" | "gold" }) {
  const t = tone === "ink" ? "bg-ink text-white" : tone === "gold" ? "bg-gold text-ink" : "border border-rule bg-white text-ink";
  const dot = tone === "ink" ? "bg-cardinal" : tone === "gold" ? "bg-ink" : "bg-gold";
  return (
    <div className={`ubob absolute z-30 ${className}`} style={{ animationDelay: delay }}>
      <div className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-[0_14px_30px_rgba(0,0,0,.12)] ${t}`}>
        <span className={`h-2 w-2 rounded-full ${dot}`} />{children}
      </div>
    </div>
  );
}

/** "Why it works": a bento grid of colourful tiles, each with its own small animation. */
function Bento({ all, kinds }: { all: Resource[]; kinds: [string, Resource[]][] }) {
  const titles = all.map((r) => r.title);
  const tile = "relative overflow-hidden rounded-[28px] p-7";
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Reveal className="md:col-span-3 md:row-span-2">
        <Spotlight className={`${tile} flex h-full flex-col bg-ink text-white`}>
          <div className="font-label text-[11px] font-medium uppercase tracking-[.12em] text-white/55">The catalog</div>
          <div className="mt-3 font-display text-[96px] font-extrabold leading-[.85] tracking-[-0.05em]"><Count value={all.length} /></div>
          <p className="mt-3 max-w-[340px] text-[17px] leading-snug text-white/70">funds, scholarships and services, every one checked by hand against its USC page.</p>
          <div className="relative mt-6 h-[250px] min-h-0 overflow-hidden [mask-image:linear-gradient(transparent,#000_18%,#000_82%,transparent)]">
            <div className="uvscroll flex flex-col gap-2">
              {[...titles, ...titles].map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-[14px] text-white/85">
                  <span className="text-gold">{tick}</span><span className="truncate">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </Spotlight>
      </Reveal>

      <Reveal className="md:col-span-3" delay={100}>
        <div className={`${tile} h-full bg-gold text-ink`}>
          <div className="font-label text-[11px] font-medium uppercase tracking-[.12em] text-ink/60">Your card</div>
          <div className="mt-3 font-display text-[64px] font-extrabold leading-[.9] tracking-[-0.05em]">1 minute</div>
          <p className="mt-2 text-[16px] leading-snug text-ink/75">Three taps and your wallet starts filling up.</p>
          <div className="seq mt-5 flex flex-wrap gap-2">
            {["Master's", "Viterbi", "Going to a conference", "Money is tight"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white">{tick}{t}</span>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="md:col-span-3" delay={180}>
        <div className={`${tile} magic h-full border border-rule bg-white shadow-[0_1px_2px_rgba(0,0,0,.03),0_14px_40px_rgba(157,34,53,.06)]`}>
          <div className="font-label text-[11px] font-medium uppercase tracking-[.12em] text-muted">Every match explained</div>
          <div className="mt-3 font-display text-[30px] font-bold leading-[1.05] tracking-[-0.035em]">Why you qualify, in plain words.</div>
          <div className="seq mt-5 flex flex-col gap-2 text-[14.5px]">
            <div className="flex items-center gap-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">{tick}</span>For graduate students</div>
            <div className="flex items-center gap-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">{tick}</span>Open to Viterbi students</div>
            <div className="flex items-center gap-3"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-sand font-label text-[11px] text-muted">?</span><span className="text-muted">One answer away: your GPA</span></div>
          </div>
        </div>
      </Reveal>

      <Reveal className="md:col-span-2" delay={80}>
        <Spotlight className={`${tile} h-full bg-cardinal text-white`}>
          <div className="font-label text-[11px] font-medium uppercase tracking-[.12em] text-white/65">Claim agent</div>
          <div className="mt-3 font-display text-[30px] font-bold leading-[1.02] tracking-[-0.035em]">It drafts. You send.</div>
          <div className="mt-4 rounded-2xl bg-white/10 p-4 font-label text-[11.5px] leading-relaxed text-white/90">
            <TypeOut text={"Hello, I'm a master's student in Viterbi and I'd like to apply for the travel award for my conference in March."} speed={24} />
          </div>
        </Spotlight>
      </Reveal>

      <Reveal className="md:col-span-2" delay={160}>
        <div className={`${tile} magic h-full border border-rule bg-white shadow-[0_1px_2px_rgba(0,0,0,.03),0_14px_40px_rgba(157,34,53,.06)]`}>
          <div className="font-label text-[11px] font-medium uppercase tracking-[.12em] text-muted">One wallet</div>
          <div className="mt-3 font-display text-[64px] font-extrabold leading-[.9] tracking-[-0.05em]"><Count value={kinds.length} /></div>
          <p className="mt-1 text-[15px] text-muted">kinds of help, side by side</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {kinds.map(([k], i) => (
              <span key={k} className="upop h-7 w-7 rounded-full ring-1 ring-black/10" style={{ background: stubFor(k).bg, animationDelay: `${i * 90}ms` }} />
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="md:col-span-2" delay={240}>
        <Spotlight className={`${tile} h-full bg-ink text-white`}>
          <div className="font-label text-[11px] font-medium uppercase tracking-[.12em] text-white/55">Always current</div>
          <div className="mt-3 font-display text-[30px] font-bold leading-[1.02] tracking-[-0.035em]">Watched every night.</div>
          <p className="mt-2 text-[14.5px] leading-snug text-white/65">When a page changes, a person approves it before it reaches you.</p>
          <div className="radar absolute -bottom-10 -right-10 h-44 w-44" aria-hidden="true"><span /><span /><span /></div>
          <div aria-hidden="true" className="absolute bottom-[78px] right-[78px] h-3 w-3 rounded-full bg-gold" />
        </Spotlight>
      </Reveal>
    </div>
  );
}

/** A browser window: the frame each "How it works" scene plays in. */
function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-rule bg-white shadow-[0_40px_80px_rgba(0,0,0,.12)]">
      <div className="flex items-center gap-3 border-b border-rule bg-[#F7F7F4] px-4 py-3">
        <span className="flex gap-1.5">{["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}</span>
        <span className="mx-auto flex items-center gap-2 rounded-full bg-white px-4 py-1 font-label text-[11px] text-muted ring-1 ring-rule">
          <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v7H3z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>{url}
        </span>
        <span className="w-[46px]" />
      </div>
      <div className="relative h-[460px] overflow-hidden bg-paper">{children}</div>
    </div>
  );
}

/** Scene 1: the questions get answered and the card fills in beside them. */
function SceneBuild({ fields }: { fields: Record<string, import("@/lib/types").FieldSpec> }) {
  const s = useStepper(7, 650);
  const opt = (on: boolean, label: string) => (
    <span className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all duration-300 ${on ? "scale-[1.02] border-ink bg-ink text-white" : "border-rule bg-white text-ink"}`}>
      {label}{on && <span className="upop text-gold">{tick}</span>}
    </span>
  );
  return (
    <div className="grid h-full grid-cols-[1fr_300px] gap-8 p-8">
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 font-display text-[19px] font-bold tracking-[-0.02em]">What are you studying toward?</div>
          <div className="grid grid-cols-3 gap-2">{opt(false, "Undergrad")}{opt(s >= 1, "Master's")}{opt(false, "PhD")}</div>
        </div>
        {s >= 2 && (
          <div className="uin">
            <div className="mb-2 font-display text-[19px] font-bold tracking-[-0.02em]">Which school are you in?</div>
            <div className="grid grid-cols-3 gap-2">{opt(false, "Dornsife")}{opt(s >= 3, "Viterbi")}{opt(false, "Price")}</div>
          </div>
        )}
        {s >= 4 && (
          <div className="uin">
            <div className="mb-2 font-display text-[19px] font-bold tracking-[-0.02em]">What's going on right now?</div>
            <div className="flex flex-wrap gap-2">
              {["Going to a conference", "Money is tight", "Doing research"].map((t, i) => (
                <span key={t} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors duration-300 ${s >= 5 + (i > 0 ? 1 : 0) && i < 2 ? "border-ink bg-ink text-white" : "border-rule bg-white"}`}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center">
        <div className="mb-3 font-label text-[10.5px] font-medium uppercase tracking-[.12em] text-muted">Your card, filling in</div>
        {fields.level && (
          <div className="-rotate-[3deg] transition-transform">
            <TrojanCard fields={fields} level={s >= 1 ? "masters" : null} schools={s >= 3 ? ["viterbi"] : []} needs={s >= 6 ? ["conference", "money"] : s >= 5 ? ["conference"] : []} />
          </div>
        )}
        {s >= 6 && <div className="upop mt-5 self-start rounded-full bg-gold px-4 py-2 text-[13px] font-semibold">Done. Finding what's yours...</div>}
      </div>
    </div>
  );
}

/** Scene 2: matches drop into the wallet one by one and the total climbs. */
function SceneWallet({ items }: { items: Resource[] }) {
  const n = Math.min(items.length, 6);
  const s = useStepper(n + 1, 520);
  const total = items.slice(0, s).reduce((a, r) => a + (r.benefit?.value ?? 0), 0);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between bg-ink px-8 py-6 text-white">
        <div>
          <div className="font-label text-[10.5px] font-medium uppercase tracking-[.12em] text-white/55">Waiting for you</div>
          <div className="mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.04em]">{money(total)}</div>
        </div>
        <div className="text-right font-label text-[11px] uppercase tracking-[.1em] text-white/60"><span className="font-display text-[28px] font-bold normal-case tracking-normal text-gold">{s}</span> matches</div>
      </div>
      <div className="grid flex-1 grid-cols-3 content-start gap-3 p-6">
        {items.slice(0, s).map((r) => {
          const cat = stubFor(r.category);
          return (
            <div key={r.id} className="upop relative overflow-hidden rounded-2xl border border-rule bg-white p-4 pt-5">
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: cat.bg }} />
              <div className="truncate font-label text-[9.5px] font-medium uppercase tracking-[.1em] text-muted">{cat.label} · {r.provider}</div>
              <div className="mt-1.5 line-clamp-2 min-h-[2.4em] font-display text-[14.5px] font-semibold leading-tight">{r.title}</div>
              <div className="mt-3 flex items-center justify-between border-t border-rule pt-2.5">
                <span className="font-display text-[17px] font-bold">{r.benefit?.value != null ? money(r.benefit.value) : cat.word.charAt(0) + cat.word.slice(1).toLowerCase()}</span>
                <span className="text-cardinal">{tick}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Scene 3: the agent works through its checklist, then the draft types itself out. */
function SceneAgent() {
  const steps = ["Checking the source page", "Listing what you'll need", "Drafting your message", "Checking every line against the page"];
  const s = useStepper(steps.length + 2, 750);
  return (
    <div className="grid h-full grid-cols-[260px_1fr] gap-6 p-8">
      <div className="flex flex-col gap-3">
        <div className="mb-1 font-label text-[10.5px] font-medium uppercase tracking-[.12em] text-muted">Claim agent</div>
        {steps.map((t, i) => (
          <div key={t} className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-[13.5px] font-medium transition-all duration-300 ${i < s ? "border-rule text-ink" : i === s ? "border-ink text-ink" : "border-rule text-muted opacity-50"}`}>
            {i < s ? <span className="upop inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ink text-white">{tick}</span>
              : i === s ? <span className="h-5 w-5 flex-none animate-spin rounded-full border-2 border-rule border-t-ink" />
              : <span className="h-5 w-5 flex-none rounded-full border-2 border-rule" />}
            {t}
          </div>
        ))}
      </div>
      <div className="flex flex-col rounded-2xl border border-rule bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-label text-[10.5px] font-medium uppercase tracking-[.12em] text-muted">Your draft</span>
          {s >= steps.length && <span className="upop rounded-full bg-[#DCEFE1] px-2.5 py-1 font-label text-[10px] font-medium uppercase text-[#14532D]">Checked</span>}
        </div>
        <div className="flex-1 text-[14.5px] leading-relaxed text-body">
          {s >= 2 ? <TypeOut text={"Hello,\n\nI'm a master's student in Viterbi, and I'd like to apply for the GSG Travel Award for my conference in March. I've attached my registration. Could you tell me if anything else is needed?\n\nThank you!"} speed={18} className="whitespace-pre-line" /> : <span className="text-muted">Waiting for the checklist...</span>}
        </div>
        <div className={`shine mt-4 rounded-full py-3 text-center text-[14px] font-semibold transition-colors ${s >= steps.length + 1 ? "bg-ink text-white" : "bg-[#ECECE6] text-muted"}`}>You send it</div>
      </div>
    </div>
  );
}

/** "How it works": three plain steps beside a browser window that plays each one. Moves on by itself until someone picks a step. */
function HowItWorks({ items, fields }: { items: Resource[]; fields: Record<string, import("@/lib/types").FieldSpec> }) {
  const [pick, setPick] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setPick((p) => (p + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, [held]);
  return (
    <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center">
      <div className="flex flex-col gap-3">
        {STEPS.map((st, i) => {
          const on = i === pick;
          return (
            <button key={st.title} type="button" onClick={() => { setHeld(true); setPick(i); }}
              className={`relative overflow-hidden rounded-[22px] border p-6 text-left transition-all duration-300 ${on ? "border-ink bg-white shadow-[0_20px_40px_rgba(0,0,0,.08)]" : "border-transparent hover:bg-white/60"}`}>
              <div className="flex items-center gap-4">
                <span className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-full font-label text-[13px] font-semibold transition-colors ${on ? "bg-ink text-white" : "bg-[#ECECE6] text-muted"}`}>{i + 1}</span>
                <span className={`font-display text-[21px] font-bold leading-tight tracking-[-0.03em] ${on ? "text-ink" : "text-muted"}`}>{st.title}</span>
              </div>
              <div className={`grid transition-all duration-500 ${on ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <p className="overflow-hidden pl-14 text-[15px] leading-relaxed text-muted">{st.body}</p>
              </div>
              {on && !held && <span key={pick} className="absolute bottom-0 left-0 h-[3px] bg-cardinal" style={{ animation: `utimer ${STEP_MS}ms linear both` }} />}
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <BrowserFrame url={STEPS[pick].url}>
          <div key={pick} className="uin h-full">
            {pick === 0 ? <SceneBuild fields={fields} /> : pick === 1 ? <SceneWallet items={items} /> : <SceneAgent />}
          </div>
        </BrowserFrame>
      </div>
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
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
      <div role="tablist" aria-label="Kinds of help" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-rule lg:px-0">
        {kinds.map(([kk, l], i) => {
          const on = i === pick;
          const st = stubFor(kk);
          return (
            <button key={kk} type="button" role="tab" aria-selected={on} onClick={() => choose(i)} onMouseEnter={() => choose(i)}
              className={`relative flex min-h-[52px] flex-none items-center gap-3 overflow-hidden rounded-full px-4 text-left transition-colors lg:flex-auto lg:rounded-none lg:border-b lg:border-rule lg:px-1 ${on ? "bg-ink text-white lg:bg-transparent lg:text-ink" : "bg-white text-muted hover:text-ink lg:bg-transparent"}`}>
              <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full ring-1 ring-black/10" style={{ background: st.bg }} />
              <span className={`flex-1 whitespace-nowrap text-[15px] ${on ? "font-semibold" : "font-medium"}`}>{KIND[kk] ?? st.label}</span>
              <span className="font-label text-[13px] font-medium">{String(l.length).padStart(2, "0")}</span>
              {on && <span aria-hidden="true" className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 -translate-x-3 rounded-full bg-cardinal lg:block" />}
              {on && !held && <span aria-hidden="true" key={pick} className="inside-timer absolute bottom-0 left-0 hidden h-[2px] bg-ink lg:block" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-h-[460px]">
        <div key={k} className="uin relative flex h-full flex-col rounded-[28px] border border-rule bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,.03),0_24px_60px_rgba(157,34,53,.08)] backdrop-blur-sm">
          <div className="flex items-end justify-between gap-6 border-b border-rule px-8 pb-6 pt-7">
            <div>
              <div className="flex items-center gap-2 font-label text-[11px] font-medium uppercase tracking-[.12em] text-muted">
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: s.bg }} />{s.label}
              </div>
              <div className="mt-2 font-display text-[34px] font-bold leading-tight md:text-[40px]">{KIND[k] ?? s.label}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-[64px] font-extrabold leading-[.8]">{list.length}</div>
              <div className="mt-2 font-label text-[10.5px] uppercase tracking-[.12em] text-muted">{list.length === 1 ? "resource" : "resources"}</div>
            </div>
          </div>
          <ul className="grid flex-1 content-start gap-x-10 px-8 pb-8 pt-3 md:grid-cols-2">
            {list.slice(0, 10).map((r, i) => (
              <li key={r.id} className="uin flex items-start gap-3 border-b border-rule py-3.5" style={{ animationDelay: `${100 + i * 40}ms` }}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug">{r.title}</span>
                  <span className="block truncate text-[13px] text-muted">{r.provider}</span>
                </span>
                {r.benefit?.value != null && <span className="flex-none font-display text-[15px] font-bold">{money(r.benefit.value)}</span>}
              </li>
            ))}
          </ul>
          {list.length > 10 && <div className="px-8 pb-6 font-label text-[11px] uppercase tracking-[.12em] text-muted">+ {list.length - 10} more inside</div>}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { card, resources, fields, error, ready } = useStudent();
  const all = useMemo(() => Object.values(resources), [resources]);
  // The hero tickets drift with the pointer, each at its own depth.
  function parallax(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", String((e.clientX - b.left) / b.width - 0.5));
    e.currentTarget.style.setProperty("--my", String((e.clientY - b.top) / b.height - 0.5));
  }
  const hero = useMemo(() => heroTickets(all, 5), [all]);
  const kinds = useMemo(() => {
    const m = new Map<string, Resource[]>();
    all.forEach((r) => m.set(r.category, [...(m.get(r.category) ?? []), r]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [all]);
  const scholarships = all.filter((r) => r.category === "scholarship" || r.category === "cash").length;

  const cta = (
    <Link href={card ? "/wallet" : "/build"} className="group inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-full bg-ink px-8 text-base font-semibold text-white transition-colors hover:bg-[#2A2A2A]">
      {card ? "Open my wallet" : "Build my Trojan card"}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );

  return (
    <main className="bg-paper">
      {/* Hero */}
      <section onPointerMove={parallax} className="relative overflow-hidden">
        <div aria-hidden="true" className="dotgrid pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="blob -right-32 -top-40 h-[520px] w-[520px] bg-gold" />
        <div aria-hidden="true" className="blob -left-40 top-[340px] h-[420px] w-[420px] bg-cardinal opacity-25" style={{ animationDelay: "-6s" }} />
        <div className={`${WRAP} relative`}>
          <nav aria-label="Site" className="flex items-center justify-between gap-4 py-5">
            <Logo />
            <div className="hidden items-center gap-1 md:flex">
              {[["#how", "How it works"], ["#try", "Try a student"], ["#inside", "What's inside"], ["/tour", "Watch the tour"]].map(([h, l]) => (
                <a key={h} href={h} className="inline-flex min-h-[44px] items-center rounded-full px-4 text-[15px] font-medium text-muted hover:text-ink">{l}</a>
              ))}
            </div>
            <Link href={card ? "/wallet" : "/build"} className="inline-flex min-h-[44px] items-center rounded-full border border-ink px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-ink hover:text-white">{card ? "My wallet" : "Get started"}</Link>
          </nav>

          <div className="grid items-center gap-12 pb-20 pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:pb-28 lg:pt-20">
            <div>
              <div className="uin mb-7 inline-flex items-center gap-2.5 rounded-full border border-rule bg-white px-3.5 py-1.5 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-muted">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cardinal opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-cardinal" /></span>
                For USC students
              </div>
              <h1 className="isolate mb-7 font-display text-[48px] font-extrabold leading-[.95] tracking-[-0.045em] md:text-[76px]">
                <Rise text="USC has set money and help aside." /> <span className="text-muted"><Rise text="Some of it is" start={560} /></span>{" "}
                <span className="relative inline-block"><Rise text="yours." start={820} /><span aria-hidden="true" className="hl absolute -bottom-1 left-0 -z-10 h-[38%] w-full rounded-sm bg-gold" /></span>
              </h1>
              <p className="uin mb-4 font-display text-[24px] font-semibold tracking-[-0.03em] md:text-[30px]" style={{ animationDelay: "800ms" }}>
                We find your <span className="relative inline-block min-w-[9ch] text-cardinal"><RotatingWord words={WORDS} every={1900} /></span>
              </p>
              <p className="uin mb-9 max-w-[520px] text-lg leading-relaxed text-muted" style={{ animationDelay: "900ms" }}>
                Build your card once. We match you to every fund, clinic and service you qualify for, explain why, then an AI agent does the paperwork.
              </p>
              <div className="uin flex flex-wrap items-center gap-5" style={{ animationDelay: "1050ms" }}>
                {cta}
                <a href="#how" className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-ink underline decoration-rule decoration-2 underline-offset-[6px] hover:decoration-ink">See how it works</a>
              </div>
              {ready && all.length > 0 && (
                <dl className="uin mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-rule pt-6" style={{ animationDelay: "1200ms" }}>
                  {([[all.length, "resources, all checked by hand"], [scholarships, "put money in your pocket"], [kinds.length, "kinds of help"]] as [number, string][]).map(([n, l]) => (
                    <div key={l}>
                      <dt className="sr-only">{l}</dt>
                      <dd className="font-display text-[34px] font-bold leading-none"><Count value={n} /></dd>
                      <dd className="mt-1.5 font-label text-[11px] uppercase tracking-[.1em] text-muted">{l}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {error && <p role="alert" className="mt-6 max-w-[560px] rounded-xl border border-cardinal bg-white p-3 text-sm">Can't reach the Unclaimed API: {error}</p>}
            </div>

            <div className="relative mx-auto hidden h-[660px] w-full max-w-[520px] lg:block" aria-hidden="true">
              <div className="uin absolute -left-4 top-16 w-[300px] -rotate-[10deg]" style={{ animationDelay: "250ms" }}>
                <div className="transition-transform duration-300 ease-out" style={{ transform: "translate(calc(var(--mx, 0) * -18px), calc(var(--my, 0) * -12px))" }}>
                  {fields.level && <TrojanCard fields={fields} level="masters" schools={["viterbi"]} needs={["research", "conference", "money"]} />}
                </div>
              </div>
              <div className="uin absolute left-[160px] top-0" style={{ animationDelay: "450ms" }}>
                <div className="transition-transform duration-300 ease-out" style={{ transform: "translate(calc(var(--mx, 0) * 12px), calc(var(--my, 0) * 10px))" }}>
                  <PhoneDemo items={hero} />
                </div>
              </div>
              <Floater className="left-0 top-[330px]" delay="0s" tone="white">Checked against usc.edu</Floater>
              <Floater className="-right-6 top-[150px]" delay="-1.6s" tone="ink">Agent drafted your email</Floater>
              <Floater className="-right-2 bottom-[70px]" delay="-3.2s" tone="gold">Made for Trojans</Floater>
            </div>
          </div>
        </div>
        <div className="relative z-10 -mx-4 mb-8 -rotate-[1.5deg] overflow-hidden bg-ink py-4 text-white shadow-[0_20px_40px_rgba(0,0,0,.15)]" aria-hidden="true">
          <div className="umarq">
            {[0, 1].map((k) => TICKER.map((t) => (
              <span key={`${k}${t}`} className="flex items-center whitespace-nowrap font-display text-[40px] font-bold tracking-[-0.03em]">
                {t}<svg width="26" height="26" viewBox="0 0 24 24" className="mx-7 flex-none text-gold"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="currentColor" /></svg>
              </span>
            )))}
          </div>
          <div className="umarq-rev mt-1 text-white/70">
            {[0, 1].map((k) => [...TICKER].reverse().map((t) => (
              <span key={`${k}${t}`} className="outline-text flex items-center whitespace-nowrap font-display text-[40px] font-bold tracking-[-0.03em]">
                {t}<span className="mx-7 inline-block h-3 w-3 rounded-full bg-cardinal [-webkit-text-stroke:0]" />
              </span>
            )))}
          </div>
        </div>
      </section>

      {/* Why it works */}
      {all.length > 0 && (
        <section className="pt-28">
          <div className={WRAP}>
            <Reveal>
              <div className="mb-4 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-muted">Why it works</div>
              <h2 className="mb-12 max-w-[820px] font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] md:text-[56px]">Built for the student who <span className="text-sheen">doesn't know what to ask for.</span></h2>
            </Reveal>
            <Bento all={all} kinds={kinds} />
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="scroll-mt-4">
        <div className={`${WRAP} py-28`}>
          <Reveal>
            <div className="mb-4 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-muted">How it works</div>
            <h2 className="mb-14 max-w-[820px] font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] md:text-[56px]">Three steps. <span className="text-sheen">About a minute.</span></h2>
          </Reveal>
          <Reveal><HowItWorks items={heroTickets(all, 6)} fields={fields} /></Reveal>
        </div>
      </section>

      {/* Try it as a demo student */}
      <TryAStudent />

      {/* What's inside */}
      {kinds.length > 0 && (
        <section id="inside" className="relative scroll-mt-4 overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-20 h-[560px] w-[560px] rounded-full bg-gold opacity-[.18] blur-[120px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-0 h-[460px] w-[460px] rounded-full bg-cardinal opacity-[.07] blur-[110px]" />
          <div className={`${WRAP} py-24`}>
            <Reveal>
              <div className="mb-4 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-muted">What's inside</div>
              <h2 className="mb-4 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] md:text-[56px]">Everything you can claim, <span className="text-sheen">in one place.</span></h2>
              <p className="mb-12 max-w-[620px] text-[17px] leading-relaxed text-muted">Emergency funds, scholarships, legal help, career services and the basics, from offices across campus.</p>
            </Reveal>
            <Inside kinds={kinds} />
          </div>
        </section>
      )}

      {/* Closing call to action */}
      <section className="pb-24">
        <div className={WRAP}>
          <Reveal>
            <Spotlight className="overflow-hidden rounded-[32px] bg-ink px-8 py-20 text-center text-white md:px-16">
              <div aria-hidden="true" className="blob -left-20 -top-28 h-[360px] w-[360px] bg-cardinal opacity-50" />
              <div aria-hidden="true" className="blob -bottom-32 -right-16 h-[380px] w-[380px] bg-gold opacity-30" style={{ animationDelay: "-8s" }} />
              <h2 className="mx-auto max-w-[760px] font-display text-[44px] font-extrabold leading-[1.0] tracking-[-0.045em] md:text-[76px]">Your wallet is <span className="text-sheen">waiting.</span></h2>
              <p className="mx-auto mt-4 max-w-[480px] text-[17px] leading-relaxed text-white/60">Three questions, about a minute. See everything USC has set aside for you.</p>
              <Link href={card ? "/wallet" : "/build"} className="shine mt-9 inline-flex min-h-[56px] items-center gap-2.5 rounded-full bg-gold px-8 text-base font-semibold text-ink transition-transform hover:-translate-y-0.5">
                {card ? "Open my wallet" : "Build my Trojan card"}
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </Spotlight>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/** A number that counts up once it scrolls into view. */
function Count({ value }: { value: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(value);
    let cur = 0;
    const iv = setInterval(() => { cur = Math.min(value, cur + Math.max(1, Math.ceil((value - cur) * 0.2))); setN(cur); if (cur >= value) clearInterval(iv); }, 40);
    return () => clearInterval(iv);
  }, [inView, value]);
  return <span ref={ref}>{n}</span>;
}

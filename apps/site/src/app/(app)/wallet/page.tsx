"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/Answer";
import { Track } from "@/components/bits";
import { MaybeCard } from "@/components/MaybeCard";
import { useTicker } from "@/components/Scoreboard";
import { TicketCard } from "@/components/TicketCard";
import { TrojanCard } from "@/components/TrojanCard";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import { money, stubFor } from "@/lib/ui";
import type { Claim, Resource } from "@/lib/types";
import { Reveal, Tilt } from "@site/components/Motion";
import { Band, WRAP } from "@site/components/Shell";

// Two tickets per row on desktop: show four rows, then reveal more a batch at a time.
const YES_PAGE = 8;
const MAYBE_PAGE = 4;

function More({ total, shown, page, onMore }: { total: number; shown: number; page: number; onMore: (n: number) => void }) {
  if (total <= page) return null;
  const left = total - shown;
  return left <= 0 ? (
    <button type="button" onClick={() => onMore(page)} className="mx-auto mt-2 flex min-h-[44px] px-4 text-sm font-semibold text-cardinal underline">Show fewer</button>
  ) : (
    <button type="button" onClick={() => onMore(shown + page)}
      className="mx-auto mt-2 flex min-h-[48px] items-center rounded-full border border-ink bg-white px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
      Show {Math.min(page, left)} more <span className="ml-1.5 text-muted">({left} left)</span>
    </button>
  );
}

/** A header tile. Clicking it jumps to that list, or opens the claims behind the number. */
function Stat({ value, label, tone, delay, on, onClick }: { value: number; label: string; tone: string; delay: number; on?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={on}
      className={`uin group relative rounded-2xl px-4 py-3.5 text-left transition-transform duration-200 hover:-translate-y-0.5 ${tone} ${on ? "ring-2 ring-white ring-offset-2 ring-offset-ink" : ""}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em]">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5 font-label text-[10px] font-medium uppercase tracking-[.08em] opacity-70">
        {label}
        <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true" className={`transition-transform ${on ? "rotate-90" : "group-hover:translate-x-0.5"}`}><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </button>
  );
}

/** The claims behind a header tile, opened in place: what was claimed, where it stands, and a way in. */
function ClaimList({ title, items, resources, empty }: { title: string; items: Claim[]; resources: Record<string, Resource>; empty: string }) {
  return (
    <div className="uin mt-8 rounded-[22px] border border-white/10 bg-white/[.05] p-5 backdrop-blur-sm">
      <div className="mb-4 font-label text-[11px] font-medium uppercase tracking-[.12em] text-white/60">{title}</div>
      {items.length === 0 ? <p className="text-[15px] text-white/70">{empty}</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c, i) => {
            const r = resources[c.resource_id];
            const st = stubFor(r?.category ?? "basics");
            return (
              <Link key={c.resource_id} href={`/ticket/${c.resource_id}`} className="upop group flex flex-col gap-3 rounded-2xl bg-white p-4 text-ink transition-transform hover:-translate-y-0.5" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-label text-[10px] font-medium uppercase tracking-[.1em] text-muted"><span className="h-2 w-2 rounded-full" style={{ background: st.bg }} />{r?.provider}</span>
                    <span className="mt-1 block font-display text-[17px] font-semibold leading-tight">{c.title}</span>
                  </span>
                  <span className={`flex-none rounded-full px-2.5 py-1 font-label text-[10px] font-medium uppercase tracking-[.06em] ${c.stage_index === 3 ? "bg-cardinal text-white" : "bg-ink text-white"}`}>{c.stage}</span>
                </span>
                <Track index={c.stage_index} />
                <span className="flex items-center justify-between text-[13px] text-muted">
                  <span>{c.stage_index === 3 ? (c.value ? `Up to ${money(c.value)} received` : "Done, you're using it") : c.stage_index === 0 ? "Draft ready, send it yourself" : c.sent_day ? `Sent on day ${c.sent_day}` : "With the office"}</span>
                  <span className="font-semibold text-ink group-hover:underline">Open</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** How much of the wallet has been claimed, as a ring that fills in. */
function Ring({ done, total }: { done: number; total: number }) {
  const [p, setP] = useState(0);
  useEffect(() => { const t = setTimeout(() => setP(total ? done / total : 0), 300); return () => clearTimeout(t); }, [done, total]);
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="relative h-[136px] w-[136px] flex-none">
      <svg viewBox="0 0 136 136" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="12" />
        <circle cx="68" cy="68" r={r} fill="none" stroke="#FFC72C" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.3,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[30px] font-extrabold leading-none">{done}<span className="text-white/40">/{total}</span></span>
        <span className="mt-1 font-label text-[9.5px] uppercase tracking-[.1em] text-white/55">claimed</span>
      </div>
    </div>
  );
}


export default function Wallet() {
  const { card, match, resources, fields, answer, skip } = useStudent();
  const [claims, setClaims] = useState<Record<string, Claim>>({});
  const [yesShown, setYesShown] = useState(YES_PAGE);
  const [maybeShown, setMaybeShown] = useState(MAYBE_PAGE);
  const [cat, setCat] = useState<string | null>(null);
  const yes = useMemo(() => match?.yes ?? [], [match]);
  const maybe = match?.maybe ?? [];
  const count = useTicker(yes.length);
  const q = match?.next_question;

  useEffect(() => {
    if (card) api.claims(card.id).then((c) => setClaims(Object.fromEntries(c.claims.map((x) => [x.resource_id, x])))).catch(() => {});
  }, [card]);

  // Filter chips: one per category in the student's results, in result order.
  const cats = useMemo(() => {
    const seen = new Map<string, number>();
    yes.forEach((m) => { const c = resources[m.id]?.category; if (c) seen.set(c, (seen.get(c) ?? 0) + 1); });
    return [...seen.entries()];
  }, [yes, resources]);
  const shown = cat ? yes.filter((m) => resources[m.id]?.category === cat) : yes;
  const inProgress = Object.values(claims).filter((c) => c.stage_index < 3).length;
  const finished = Object.values(claims).filter((c) => c.stage_index === 3).length;
  const total = totalValue(match, resources);
  const claimList = Object.values(claims).sort((a, b) => b.stage_index - a.stage_index);
  const [open, setOpen] = useState<"progress" | "finished" | "claimed" | null>(null);
  const toggle = (k: "progress" | "finished" | "claimed") => setOpen(open === k ? null : k);
  const jump = (id: string) => { setCat(null); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <main>
      <Band>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-3.5 py-1.5 font-label text-[11px] font-medium uppercase tracking-[.12em] text-white/80">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" /><span className="relative h-2 w-2 rounded-full bg-gold" /></span>
              Your wallet is live
            </div>
            <h1 className="font-display text-[44px] font-extrabold leading-[.95] tracking-[-0.045em] md:text-[60px]">
              <span className="text-sheen">{count}</span> ready<br className="hidden md:block" /> for you to claim.
            </h1>
            <p className="mt-5 text-[17px] leading-snug text-white/70">
              Matched to your card from {Object.keys(resources).length} USC funds and services.{" "}
              {total > 0 && <>That includes <span className="font-display font-bold text-white">{money(total)}</span> in stated amounts. </>}
              {maybe.length > 0 ? <><span className="font-display font-bold text-white">{maybe.length}</span> more {maybe.length === 1 ? "is" : "are"} one answer away.</> : null}
            </p>
          </div>
          <div className="flex flex-none items-center gap-6 rounded-[24px] border border-white/10 bg-white/[.05] p-5 backdrop-blur-sm">
            <button type="button" onClick={() => toggle("claimed")} aria-expanded={open === "claimed"} aria-label="Show what you've claimed" className="rounded-full transition-transform hover:scale-[1.03]">
              <Ring done={finished + inProgress} total={yes.length} />
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat value={yes.length} label="ready" tone="bg-gold text-ink" delay={200} onClick={() => jump("yours")} />
              <Stat value={maybe.length} label="one answer away" tone="bg-white text-ink" delay={280} onClick={() => jump(maybe.length ? "maybe" : "one-question")} />
              <Stat value={inProgress} label="in progress" tone="bg-white/10 text-white" delay={360} on={open === "progress"} onClick={() => toggle("progress")} />
              <Stat value={finished} label="finished" tone="bg-cardinal text-white" delay={440} on={open === "finished"} onClick={() => toggle("finished")} />
            </div>
          </div>
        </div>
        {open === "progress" && <ClaimList title="In progress" items={claimList.filter((c) => c.stage_index < 3)} resources={resources} empty="Nothing in progress. Open a ticket and click Claim it for me to start one." />}
        {open === "finished" && <ClaimList title="Finished" items={claimList.filter((c) => c.stage_index === 3)} resources={resources} empty="Nothing finished yet. Claims move here once the office is done." />}
        {open === "claimed" && <ClaimList title="Everything you've claimed" items={claimList} resources={resources} empty="You haven't started a claim yet. Pick a ticket below and let the agent draft it." />}
      </Band>

      <div className={`${WRAP} grid gap-8 pb-14 pt-8 lg:grid-cols-[minmax(0,1fr)_340px]`}>
        <div className="min-w-0">
          <div id="yours" className="mb-4 flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[38px] font-extrabold leading-tight tracking-[-0.04em]">Yours to <span className="text-sheen">claim.</span></h2>
              <p className="text-[15px] text-muted">Biggest first. Open one to see why it fits, then let the agent do the boring part.</p>
            </div>
          </div>

          {cats.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
              <button type="button" aria-pressed={!cat} onClick={() => { setCat(null); setYesShown(YES_PAGE); }}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-medium ${!cat ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:border-ink"}`}>
                All <span className="ml-1 opacity-70">{yes.length}</span>
              </button>
              {cats.map(([c, n]) => {
                const s = stubFor(c);
                const on = cat === c;
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => { setCat(on ? null : c); setYesShown(YES_PAGE); }}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 text-sm font-medium ${on ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:border-ink"}`}>
                    <span aria-hidden="true" className="h-3 w-3 rounded-full border border-[rgba(0,0,0,.15)]" style={{ background: s.bg }} />
                    {s.label.charAt(0) + s.label.slice(1).toLowerCase()} <span className="opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {yes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-sand bg-white p-8 text-center text-[15px] leading-normal text-muted">
              Nothing confirmed yet. Answer the question on the right, or open <Link href="/card" className="font-semibold text-cardinal underline">My card</Link> to pick what's going on.
            </div>
          )}
          <div className="ticket-grid grid gap-x-5 md:grid-cols-2">
            {shown.slice(0, yesShown).map((m, i) => resources[m.id] && <TicketCard key={m.id} resource={resources[m.id]} claim={claims[m.id]} index={i} />)}
          </div>
          <More total={shown.length} shown={yesShown} page={YES_PAGE} onMore={setYesShown} />

          {maybe.length > 0 && (
            <Reveal as="section" className="mt-12 scroll-mt-24">
              <span id="maybe" className="block scroll-mt-24" />
              <div className="mb-1 flex items-center gap-3">
                <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.035em]">Might be yours</h2>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-label text-xs font-medium text-ink ring-1 ring-rule">{maybe.length}</span>
              </div>
              <p className="mb-4 text-[15px] text-muted">Each one needs one answer from you. Click a card to answer right there.</p>
              <div className="grid gap-x-5 md:grid-cols-2">
                {maybe.slice(0, maybeShown).map((m) => resources[m.id] && <MaybeCard key={m.id} item={m} resource={resources[m.id]} />)}
              </div>
              <More total={maybe.length} shown={maybeShown} page={MAYBE_PAGE} onMore={setMaybeShown} />
            </Reveal>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-[84px] lg:self-start">
          {q && fields[q.field] && (
            <div className="[&>section]:mb-0">
              <QuestionCard field={q.field} spec={fields[q.field]} count={q.count}
                onAnswer={(v) => answer(q.field, v)} onSkip={() => skip(q.field)} />
            </div>
          )}
          <div>
            <Tilt className="rounded-[20px]" max={8}><TrojanCard card={card} fields={fields} /></Tilt>
            <Link href="/card" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Edit my card</Link>
          </div>
          <Link href="/ask" className="group block rounded-[20px] border border-rule bg-white p-5 text-ink transition-colors hover:border-ink">
            <div className="mb-1.5 font-label text-[11px] font-medium uppercase tracking-[.12em] text-cardinal">Navigator</div>
            <div className="font-display text-xl font-bold leading-snug">Something changed? Just tell us.</div>
            <p className="mt-1.5 text-sm leading-snug text-muted">"My landlord won't return my deposit." We update your card and your wallet.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink group-hover:underline">Ask the Navigator
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </Link>
        </aside>
      </div>
    </main>
  );
}

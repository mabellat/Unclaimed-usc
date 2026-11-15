"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/Answer";
import { MaybeCard } from "@/components/MaybeCard";
import { Scoreboard, useTicker } from "@/components/Scoreboard";
import { TicketCard } from "@/components/TicketCard";
import { TrojanCard } from "@/components/TrojanCard";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import { stubFor } from "@/lib/ui";
import type { Claim } from "@/lib/types";
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
      className="mx-auto mt-2 flex min-h-[48px] items-center rounded-full border-2 border-ink bg-ticket px-6 text-[15px] font-semibold text-ink hover:bg-ink hover:text-ticket">
      Show {Math.min(page, left)} more <span className="ml-1.5 text-muted">({left} left)</span>
    </button>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="min-w-[132px] rounded-xl border border-[rgba(255,204,0,.25)] bg-[rgba(0,0,0,.18)] px-4 py-3">
      <div className={`font-label text-[34px] font-semibold leading-none ${tone}`}>{value}</div>
      <div className="mt-1.5 text-[13px] leading-snug text-[#CFE4D8]">{label}</div>
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

  return (
    <main>
      <Band>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 font-label text-[13px] uppercase tracking-[.16em] text-gold">Waiting for you</div>
            <div className="origin-left scale-[1.15]"><Scoreboard amount={totalValue(match, resources)} /></div>
            <p className="mt-4 text-[17px] leading-[1.4] text-blush">
              <span className="font-label text-xl font-semibold text-gold">{count}</span> things you qualify for
              {maybe.length > 0 && <>, <span className="font-label text-xl font-semibold text-ticket">{maybe.length}</span> more to confirm</>}
            </p>
            <p className="mt-1 text-[13px] text-[#E9D3C0]">Counts only amounts the source pages state.</p>
          </div>
          <div className="uin flex flex-wrap gap-3" style={{ animationDelay: "250ms" }}>
            <Stat value={yes.length} label="ready to claim" tone="text-gold" />
            <Stat value={maybe.length} label="one answer away" tone="text-ticket" />
            <Stat value={inProgress} label={inProgress === 1 ? "claim in progress" : "claims in progress"} tone="text-cream" />
            <Stat value={finished} label={finished === 1 ? "claim finished" : "claims finished"} tone="text-[#9FE0A6]" />
          </div>
        </div>
      </Band>

      <div className={`${WRAP} grid gap-8 pb-14 pt-8 lg:grid-cols-[minmax(0,1fr)_340px]`}>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[30px] font-bold leading-tight">Yours to claim</h2>
              <p className="text-[15px] text-muted">Highest amounts first. Open a ticket to see why it fits and how to claim it.</p>
            </div>
          </div>

          {cats.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
              <button type="button" aria-pressed={!cat} onClick={() => { setCat(null); setYesShown(YES_PAGE); }}
                className={`min-h-[40px] rounded-full border-[1.5px] px-4 text-sm font-medium ${!cat ? "border-ink bg-ink text-ticket" : "border-sand bg-ticket text-ink hover:border-ink"}`}>
                All <span className="ml-1 opacity-70">{yes.length}</span>
              </button>
              {cats.map(([c, n]) => {
                const s = stubFor(c);
                const on = cat === c;
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => { setCat(on ? null : c); setYesShown(YES_PAGE); }}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-medium ${on ? "border-ink bg-ink text-ticket" : "border-sand bg-ticket text-ink hover:border-ink"}`}>
                    <span aria-hidden="true" className="h-3 w-3 rounded-full border border-[rgba(0,0,0,.15)]" style={{ background: s.bg }} />
                    {s.label.charAt(0) + s.label.slice(1).toLowerCase()} <span className="opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {yes.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-sand bg-ticket p-8 text-center text-[15px] leading-normal text-muted">
              Nothing confirmed yet. Answer the question on the right, or open <Link href="/card" className="font-semibold text-cardinal underline">My card</Link> to pick what's going on.
            </div>
          )}
          <div className="ticket-grid grid gap-x-5 md:grid-cols-2">
            {shown.slice(0, yesShown).map((m, i) => resources[m.id] && <TicketCard key={m.id} resource={resources[m.id]} claim={claims[m.id]} index={i} />)}
          </div>
          <More total={shown.length} shown={yesShown} page={YES_PAGE} onMore={setYesShown} />

          {maybe.length > 0 && (
            <Reveal as="section" className="mt-12">
              <div className="mb-1 flex items-center gap-3">
                <h2 className="font-display text-[26px] font-bold leading-tight text-body">Might be yours</h2>
                <span className="rounded-full bg-[#E3EBE5] px-2.5 py-0.5 font-label text-sm text-ink">{maybe.length}</span>
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
            <Tilt className="rounded-2xl shadow-[0_12px_24px_rgba(92,0,0,.28)]" max={10}><TrojanCard card={card} fields={fields} /></Tilt>
            <Link href="/card" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Edit my card</Link>
          </div>
          <Link href="/ask" className="group block rounded-2xl bg-ink p-5 text-ticket">
            <div className="mb-1.5 font-label text-xs uppercase tracking-[.16em] text-gold">Navigator</div>
            <div className="font-display text-xl font-bold leading-snug">Something changed? Just tell us.</div>
            <p className="mt-1.5 text-sm leading-snug text-[#EFE3D2]">"My landlord won't return my deposit." We update your card and your wallet.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold group-hover:underline">Ask the Navigator
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </Link>
        </aside>
      </div>
    </main>
  );
}

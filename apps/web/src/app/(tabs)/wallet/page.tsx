"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Kicker, Rings, Scallop } from "@/components/bits";
import { QuestionCard, QuestionNudge } from "@/components/Answer";
import { MaybeCard } from "@/components/MaybeCard";
import { Scoreboard, useTicker } from "@/components/Scoreboard";
import { TicketCard } from "@/components/TicketCard";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import type { Claim } from "@/lib/types";

// The wallet shows the top tickets first (highest amount first) and reveals the rest a batch at a time.
const YES_PAGE = 6;
const MAYBE_PAGE = 3;

function MoreButton({ total, shown, page, onMore }: { total: number; shown: number; page: number; onMore: (n: number) => void }) {
  if (total <= page) return null;
  const left = total - shown;
  if (left <= 0) {
    return (
      <button type="button" onClick={() => onMore(page)} className="mb-4 min-h-[44px] w-full text-sm font-semibold text-cardinal underline">
        Show fewer
      </button>
    );
  }
  return (
    <button type="button" onClick={() => onMore(shown + page)}
      className="mb-4 min-h-[46px] w-full rounded-xl border-2 border-ink bg-ticket text-[15px] font-semibold text-ink">
      Show {Math.min(page, left)} more ({left} left)
    </button>
  );
}

export default function Wallet() {
  const { card, match, resources, fields, answer, skip } = useStudent();
  const [claims, setClaims] = useState<Record<string, Claim>>({});
  const [yesShown, setYesShown] = useState(YES_PAGE);
  const [maybeShown, setMaybeShown] = useState(MAYBE_PAGE);
  const yes = match?.yes ?? [];
  const maybe = match?.maybe ?? [];
  const count = useTicker(yes.length);
  const q = match?.next_question;
  // The full question sits with the maybes it unlocks; a slim nudge at the top jumps to it.
  const question = q && fields[q.field] && (
    <QuestionCard field={q.field} spec={fields[q.field]} count={q.count}
      onAnswer={(v) => answer(q.field, v)} onSkip={() => skip(q.field)} />
  );

  useEffect(() => {
    if (card) api.claims(card.id).then((c) => setClaims(Object.fromEntries(c.claims.map((x) => [x.resource_id, x])))).catch(() => {});
  }, [card]);

  return (
    <main>
      <header className="relative overflow-hidden bg-cardinal-dark px-5 pb-[22px] pt-5 text-ticket">
        <Rings size={200} radii={[30, 55, 80, 105]} opacity={0.16} className="-right-[70px] -top-20" />
        <Kicker className="relative mb-2.5 text-gold">Waiting for you</Kicker>
        <Scoreboard amount={totalValue(match, resources)} />
        <div className="relative text-[15px] leading-[1.4] text-blush">
          <span className="font-label text-lg font-semibold text-gold">{count}</span> things you qualify for
          {maybe.length > 0 && <>, <span className="font-label text-lg font-semibold text-ticket">{maybe.length}</span> more to confirm</>}
        </div>
        <p className="relative mt-1.5 text-xs text-[#E9D3C0]">Counts only amounts the source pages state.</p>
      </header>
      <Scallop color="#183F3B" />

      <div className="px-5 pb-2 pt-[18px]">
        {question && <QuestionNudge count={q!.count} />}

        <Kicker className="mb-3 text-cardinal">Yours to claim</Kicker>
        {yes.length === 0 && (
          <div className="mb-4 rounded-xl border-2 border-dashed border-sand p-4 text-sm leading-normal text-muted">
            Nothing confirmed yet. Answer the question below, or open <Link href="/card" className="font-semibold text-cardinal underline">My card</Link> to pick what's going on.
          </div>
        )}
        {yes.slice(0, yesShown).map((m, i) => resources[m.id] && <TicketCard key={m.id} resource={resources[m.id]} claim={claims[m.id]} index={i} />)}
        <MoreButton total={yes.length} shown={yesShown} page={YES_PAGE} onMore={setYesShown} />

        {(maybe.length > 0 || question) && (
          <>
            <Kicker className="mb-3 mt-6 text-muted">Might be yours</Kicker>
            {question}
            {maybe.slice(0, maybeShown).map((m) => resources[m.id] && <MaybeCard key={m.id} item={m} resource={resources[m.id]} />)}
            <MoreButton total={maybe.length} shown={maybeShown} page={MAYBE_PAGE} onMore={setMaybeShown} />
          </>
        )}
      </div>
    </main>
  );
}

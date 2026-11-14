"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Kicker, Note, Rings, Scallop } from "@/components/bits";
import { QuestionCard } from "@/components/Answer";
import { MaybeCard } from "@/components/MaybeCard";
import { Scoreboard, useTicker } from "@/components/Scoreboard";
import { TicketCard } from "@/components/TicketCard";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import type { Claim } from "@/lib/types";

export default function Wallet() {
  const { card, match, resources, fields, answer, skip } = useStudent();
  const [claims, setClaims] = useState<Record<string, Claim>>({});
  const yes = match?.yes ?? [];
  const maybe = match?.maybe ?? [];
  const count = useTicker(yes.length);
  const q = match?.next_question;

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
      <Scallop color="#5C0000" />

      <div className="px-5 pb-2 pt-[18px]">
        {q && fields[q.field] && (
          <QuestionCard field={q.field} spec={fields[q.field]} count={q.count}
            onAnswer={(v) => answer(q.field, v)} onSkip={() => skip(q.field)} />
        )}

        <Kicker className="mb-3 text-cardinal">Yours to claim</Kicker>
        {yes.length === 0 && (
          <div className="mb-4 rounded-xl border-2 border-dashed border-sand p-4 text-sm leading-normal text-muted">
            Nothing confirmed yet. Answer the question above, or open <Link href="/card" className="font-semibold text-cardinal underline">My card</Link> to pick what's going on.
          </div>
        )}
        {yes.map((m, i) => resources[m.id] && <TicketCard key={m.id} resource={resources[m.id]} claim={claims[m.id]} index={i} />)}

        {maybe.length > 0 && (
          <>
            <Kicker className="mb-3 mt-6 text-muted">Might be yours</Kicker>
            {maybe.map((m) => resources[m.id] && <MaybeCard key={m.id} item={m} resource={resources[m.id]} />)}
          </>
        )}
        <Note className="mb-5 mt-[18px]" />
      </div>
    </main>
  );
}

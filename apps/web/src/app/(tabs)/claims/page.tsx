"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Kicker, Note, Track } from "@/components/bits";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import { money } from "@/lib/ui";
import type { Claim } from "@/lib/types";

const DAYS = [1, 7, 30];
const PILL = ["bg-[#FFF1C2] text-[#6B4E00]", "bg-ink text-white", "bg-ink text-white", "bg-[#DCEFE1] text-[#14532D]"];

function line(c: Claim) {
  if (c.stage_index === 0) return "Draft ready. Send it to the office yourself to start the clock.";
  if (c.stage_index === 1) return `Sent on day ${c.sent_day}. Offices usually take a while; we'll nudge you if it stalls.`;
  if (c.stage_index === 2) return "The office is reviewing. Nothing for you to do right now.";
  return c.value ? `Up to ${money(c.value)} received. Nice work.` : "Done. You're using what's yours.";
}

export default function Claims() {
  const { card, match, resources } = useStudent();
  const [day, setDay] = useState(1);
  const [claims, setClaims] = useState<Claim[] | null>(null);

  const load = useCallback(async () => {
    if (!card) return;
    const c = await api.claims(card.id);
    setDay(c.demo_day);
    setClaims(c.claims);
  }, [card]);

  useEffect(() => { load().catch(() => setClaims([])); }, [load]);

  async function pick(d: number) {
    if (!card) return;
    await api.setClock(card.id, d);
    await load();
  }

  const got = (claims ?? []).filter((c) => c.stage_index === 3).reduce((n, c) => n + (c.value ?? 0), 0);
  const done = (claims ?? []).filter((c) => c.stage_index === 3).length;
  const waiting = Math.max(0, totalValue(match, resources) - got);

  return (
    <main>
      <header className="bg-cardinal-dark px-5 pb-5 pt-[22px] text-ticket">
        <Kicker className="mb-1.5 text-gold">Your claims</Kicker>
        <h1 className="mb-3.5 font-display text-[28px] font-bold leading-[1.1]">From first draft to money in hand.</h1>
        <div className="mb-2 text-[13px] text-white/65">Demo clock. Skip ahead to see the app over a semester.</div>
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <button key={d} type="button" aria-pressed={day === d} onClick={() => pick(d)}
              className={`min-h-[44px] flex-1 rounded-[10px] border-2 border-gold text-[15px] font-semibold ${day === d ? "bg-gold text-ink" : "bg-transparent text-gold"}`}>Day {d}</button>
          ))}
        </div>
      </header>
      <div className="flex flex-col gap-3.5 px-5 pb-5 pt-[18px]">
        {/* Only money claims have a recap; a service used is not a dollar amount. */}
        {day >= 30 && got > 0 && (
          <div className="rounded-[14px] bg-gold p-[18px] shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.06)]">
            <div className="mb-1.5 font-label text-[11px] font-medium uppercase tracking-[.12em]">Semester recap</div>
            <div className="flex items-baseline gap-2.5"><span className="font-label text-[44px] font-semibold leading-none">{money(got)}</span><span className="text-sm">received</span></div>
            <div className="mt-2 text-sm leading-[1.45]">
              {done > 0
                ? `${done} claim${done > 1 ? "s" : ""} done this semester. ${waiting > 0 ? `${money(waiting)} is still waiting in your wallet.` : "Nothing left unclaimed from your card."}`
                : waiting > 0 ? `${money(waiting)} is still sitting unclaimed in your wallet. Start a draft today.` : "Open your wallet to start your first claim."}
            </div>
          </div>
        )}
        {claims && claims.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-sand px-[18px] py-[22px] text-center">
            <div className="mb-1.5 font-display text-xl font-bold">Nothing started yet</div>
            <div className="mb-3.5 text-sm leading-normal text-muted">Open a ticket in your wallet and tap Claim it for me. It shows up here and we track it for you.</div>
            <Link href="/wallet" className="inline-flex min-h-[46px] items-center rounded-full bg-ink px-5 text-[15px] font-semibold text-white">Go to my wallet</Link>
          </div>
        )}
        {(claims ?? []).map((c) => (
          <Link key={c.resource_id} href={`/ticket/${c.resource_id}`} aria-label={`${c.title}, status ${c.stage}. Open details.`}
            className="block w-full rounded-xl bg-ticket px-4 pb-3.5 pt-4 text-left text-ink shadow-[0_1px_0_#E4E4DE,0_8px_16px_rgba(0,0,0,.08)]">
            <span className="mb-3 flex items-start justify-between gap-2.5">
              <span className="font-display text-lg font-bold leading-[1.15]">{c.title}</span>
              <span className={`flex-none rounded px-2 py-1 font-label text-[11.5px] uppercase tracking-[.1em] ${PILL[c.stage_index]}`}>{c.stage}</span>
            </span>
            <Track index={c.stage_index} />
            <span className="mt-2.5 block text-[13px] leading-[1.4] text-muted">{line(c)}</span>
          </Link>
        ))}
        <Note className="mt-1">Only USC offices see real decisions. In this demo, statuses after Sent are simulated by the demo clock.</Note>
      </div>
    </main>
  );
}

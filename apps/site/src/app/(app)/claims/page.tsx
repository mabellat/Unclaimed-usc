"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Note, Track } from "@/components/bits";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import { money, stubFor } from "@/lib/ui";
import type { Claim } from "@/lib/types";
import { Reveal } from "@site/components/Motion";
import { Band, WRAP } from "@site/components/Shell";

const DAYS = [1, 7, 30];
const PILL = ["bg-[#FFE680] text-ink", "bg-ink text-gold", "bg-ink text-gold", "bg-cardinal text-ticket"];

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
      <Band>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[640px]">
            <div className="mb-2 font-label text-[13px] uppercase tracking-[.16em] text-gold">Your claims</div>
            <h1 className="font-display text-[40px] font-bold leading-[1.08] md:text-[48px]">From first draft to money in hand.</h1>
          </div>
          <div className="w-full max-w-[380px]">
            <div className="mb-2 text-sm text-[#F0DCCB]">Demo clock. Skip ahead to see the app over a semester.</div>
            <div className="flex gap-2">
              {DAYS.map((d) => (
                <button key={d} type="button" aria-pressed={day === d} onClick={() => pick(d)}
                  className={`min-h-[48px] flex-1 rounded-xl border-2 border-gold text-base font-semibold ${day === d ? "bg-gold text-ink" : "bg-transparent text-gold hover:bg-[rgba(255,204,0,.12)]"}`}>Day {d}</button>
              ))}
            </div>
          </div>
        </div>
      </Band>

      <div className={`${WRAP} pb-14 pt-8`}>
        {/* Only money claims have a recap; a service used is not a dollar amount. */}
        {day >= 30 && got > 0 && (
          <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-gold p-7 shadow-[5px_5px_0_#1A1210] md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1.5 font-label text-[13px] uppercase tracking-[.16em]">Semester recap</div>
              <div className="flex items-baseline gap-3"><span className="font-label text-[56px] font-semibold leading-none">{money(got)}</span><span className="text-base">received</span></div>
            </div>
            <p className="max-w-[460px] text-base leading-[1.45]">
              {done > 0
                ? `${done} claim${done > 1 ? "s" : ""} done this semester. ${waiting > 0 ? `${money(waiting)} is still waiting in your wallet.` : "Nothing left unclaimed from your card."}`
                : waiting > 0 ? `${money(waiting)} is still sitting unclaimed in your wallet. Start a draft today.` : "Open your wallet to start your first claim."}
            </p>
          </div>
        )}

        {claims && claims.length === 0 && (
          <div className="mx-auto max-w-[560px] rounded-2xl border-2 border-dashed border-sand bg-ticket px-8 py-12 text-center">
            <div className="mb-2 font-display text-[26px] font-bold">Nothing started yet</div>
            <div className="mb-5 text-[15px] leading-normal text-muted">Open a ticket in your wallet and click Claim it for me. It shows up here and we track it for you.</div>
            <Link href="/wallet" className="inline-flex min-h-[48px] items-center rounded-xl bg-cardinal px-6 text-[15px] font-semibold text-ticket shadow-[0_4px_0_#5C0000]">Go to my wallet</Link>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {(claims ?? []).map((c, i) => {
            const r = resources[c.resource_id];
            const stub = stubFor(r?.category ?? "basics");
            return (
              <Reveal key={c.resource_id} delay={i * 80}>
              <Link href={`/ticket/${c.resource_id}`} aria-label={`${c.title}, status ${c.stage}. Open details.`}
                className="glint flex h-full overflow-hidden rounded-2xl bg-ticket text-ink shadow-[0_1px_0_#D8CDB8,0_10px_24px_rgba(60,20,10,.08)] transition-transform hover:-translate-y-1">
                <span aria-hidden="true" className="w-2.5 flex-none" style={{ background: stub.bg }} />
                <span className="flex-1 px-6 pb-5 pt-5">
                  <span className="mb-4 flex items-start justify-between gap-3">
                    <span>
                      {r && <span className="mb-1 block font-label text-[11px] uppercase tracking-[.14em] text-cardinal">{r.provider}</span>}
                      <span className="font-display text-xl font-bold leading-[1.15]">{c.title}</span>
                    </span>
                    <span className={`flex-none rounded px-2.5 py-1 font-label text-xs uppercase tracking-[.1em] ${PILL[c.stage_index]}`}>{c.stage}</span>
                  </span>
                  <Track index={c.stage_index} />
                  <span className="mt-3 block text-sm leading-[1.4] text-muted">{line(c)}</span>
                </span>
              </Link>
              </Reveal>
            );
          })}
        </div>
        <Note className="mt-8">Only USC offices see real decisions. In this demo, statuses after Sent are simulated by the demo clock.</Note>
      </div>
    </main>
  );
}

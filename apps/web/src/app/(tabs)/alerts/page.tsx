"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Kicker, Note } from "@/components/bits";
import { api } from "@/lib/api";
import { markAlertsSeen } from "@/lib/seen";
import { useStudent } from "@/lib/student";
import { hostOf, prettyDate } from "@/lib/ui";
import type { Alert } from "@/lib/types";

const TONE: Record<string, string> = {
  ink: "bg-ink text-white", gold: "bg-[#FFF1C2] text-[#6B4E00]", cardinal: "bg-cardinal text-white", green: "bg-[#DCEFE1] text-[#14532D]",
};
const OUTCOMES: [("received" | "denied" | "waiting"), string][] = [["received", "Got it"], ["denied", "Turned down"], ["waiting", "Still waiting"]];

export default function Alerts() {
  const { card } = useStudent();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [thanks, setThanks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!card) return;
    const a = await api.alerts(card.id);
    setAlerts(a.alerts);
    markAlertsSeen(card.id, a.alerts.map((x) => x.key));
  }, [card]);

  useEffect(() => { load().catch(() => setAlerts([])); }, [load]);

  async function report(a: Alert, outcome: "received" | "denied" | "waiting") {
    if (!card || !a.resource_id) return;
    try {
      await api.outcome(card.id, a.resource_id, outcome);
      setThanks({ ...thanks, [a.key]: outcome === "waiting" ? "Thanks. We'll check in again later." : "Thanks for telling us. Your claim is updated." });
      if (outcome !== "waiting") setTimeout(() => load(), 1200);
    } catch (e) {
      setThanks({ ...thanks, [a.key]: e instanceof Error ? e.message : "Couldn't save that" });
    }
  }

  return (
    <main>
      <header className="bg-cardinal-dark px-5 pb-5 pt-[22px] text-ticket">
        <Kicker className="mb-1.5 text-gold">Alerts</Kicker>
        <h1 className="mb-2 font-display text-[28px] font-bold leading-[1.1]">We keep watching so you don't have to.</h1>
        <p className="text-sm leading-normal text-white/65">Every night we re-read each source page. When something changes, a person approves it before it reaches you.</p>
      </header>
      <div className="flex flex-col gap-3 px-5 pb-5 pt-[18px]">
        {(alerts ?? []).map((a) => (
          <div key={a.key} className="rounded-xl bg-ticket px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`rounded px-2 py-[3px] font-label text-[11.5px] tracking-[.12em] ${TONE[a.tone]}`}>{a.tag}</span>
              <span className="font-label text-xs tracking-[.1em] text-muted">
                {a.date ? prettyDate(a.date).toUpperCase() : a.day ? `DAY ${a.day}` : ""}{a.simulated ? " · SIMULATED" : ""}
              </span>
            </div>
            <div className="mb-1 font-display text-[17px] font-bold leading-[1.2]">{a.title}</div>
            <div className="text-sm leading-[1.45] text-body">{a.body}</div>
            {a.diff && a.diff.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {a.diff.map((d, i) => (
                  <div key={i} className="overflow-hidden rounded-lg font-mono text-[12.5px] leading-normal">
                    <div className="bg-paper px-2.5 py-1 font-sans text-[11.5px] font-semibold text-muted">{d.field}</div>
                    <div className="bg-[#FBE1DE] px-2.5 py-1.5 text-[#6B0F0A]">− {d.old}</div>
                    <div className="bg-[#DDF0DD] px-2.5 py-1.5 text-[#14501F]">+ {d.new}</div>
                  </div>
                ))}
              </div>
            )}
            {a.versions && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {a.versions.map((v, i) => (
                  <div key={i} className="rounded-lg bg-paper px-2.5 py-2 text-[13px] leading-snug">
                    <div className="font-semibold">{String(v.value)}</div>
                    <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-[12px] text-cardinal underline">{hostOf(v.source_url)}</a>
                  </div>
                ))}
              </div>
            )}
            {a.quote && <p className="mt-2.5 rounded-lg bg-paper px-3 py-2.5 font-display text-sm italic leading-normal text-[#222222]">{a.quote}</p>}
            {a.ask_outcome && (
              thanks[a.key] ? <p className="mt-2.5 text-sm font-medium text-[#14501F]">{thanks[a.key]}</p> : (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {OUTCOMES.map(([o, label]) => (
                    <button key={o} type="button" onClick={() => report(a, o)} className="min-h-[44px] flex-1 rounded-[10px] border border-ink bg-white px-3 text-sm font-semibold text-ink">{label}</button>
                  ))}
                </div>
              )
            )}
            {a.cta && (
              <Link href={a.go === "card" ? "/card" : `/ticket/${a.resource_id}`} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">{a.cta}</Link>
            )}
          </div>
        ))}
        <Note className="mt-0.5">Change alerts come from the nightly re-check and reach you only after a person approves them. Alerts marked simulated are driven by the demo clock on Claims.</Note>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Note } from "@/components/bits";
import { api } from "@/lib/api";
import { markAlertsSeen } from "@/lib/seen";
import { useStudent } from "@/lib/student";
import { hostOf, prettyDate } from "@/lib/ui";
import type { Alert } from "@/lib/types";
import { Reveal } from "@site/components/Motion";
import { Band, WRAP } from "@site/components/Shell";

const TONE: Record<string, string> = {
  ink: "bg-ink text-gold", gold: "bg-[#D4EEE4] text-ink", cardinal: "bg-cardinal text-ticket", green: "bg-[#DDF0DD] text-[#14501F]",
};
const EDGE: Record<string, string> = { ink: "#182522", gold: "#BDE6D9", cardinal: "#245F58", green: "#2E7D3A" };
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
      <Band>
        <div className="max-w-[720px]">
          <div className="mb-2 font-label text-[13px] uppercase tracking-[.16em] text-gold">Alerts</div>
          <h1 className="mb-3 font-display text-[40px] font-bold leading-[1.08] md:text-[48px]">We keep watching so you don't have to.</h1>
          <p className="text-base leading-normal text-[#CFE4D8]">Every night we re-read each source page. When something changes, a person approves it before it reaches you.</p>
        </div>
      </Band>

      <div className={`${WRAP} pb-14 pt-8`}>
        {alerts && alerts.length === 0 && (
          <div className="mx-auto max-w-[560px] rounded-2xl border-2 border-dashed border-sand bg-ticket px-8 py-12 text-center">
            <div className="mb-2 font-display text-[26px] font-bold">All quiet</div>
            <div className="text-[15px] leading-normal text-muted">Nothing new on the pages behind your tickets. We'll tell you when something changes.</div>
          </div>
        )}
        <div className="gap-5 md:columns-2">
          {(alerts ?? []).map((a, i) => (
            <Reveal key={a.key} delay={(i % 4) * 80} className="mb-5 break-inside-avoid">
            <div className="break-inside-avoid overflow-hidden rounded-2xl bg-ticket shadow-[0_1px_0_#D9E3DD,0_10px_24px_rgba(60,20,10,.06)]">
              <div className="h-1.5" style={{ background: EDGE[a.tone] ?? EDGE.ink }} />
              <div className="px-6 py-5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className={`rounded px-2 py-[3px] font-label text-xs tracking-[.12em] ${TONE[a.tone]}`}>{a.tag}</span>
                  <span className="font-label text-xs tracking-[.1em] text-muted">
                    {a.date ? prettyDate(a.date).toUpperCase() : a.day ? `DAY ${a.day}` : ""}{a.simulated ? " · SIMULATED" : ""}
                  </span>
                </div>
                <div className="mb-1.5 font-display text-xl font-bold leading-[1.2]">{a.title}</div>
                <div className="text-[15px] leading-[1.5] text-body">{a.body}</div>
                {a.diff && a.diff.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {a.diff.map((d, i) => (
                      <div key={i} className="overflow-hidden rounded-lg font-mono text-[13px] leading-normal">
                        <div className="bg-paper px-3 py-1 font-sans text-xs font-semibold text-muted">{d.field}</div>
                        <div className="bg-[#FBE1DE] px-3 py-1.5 text-[#6B0F0A]">− {d.old}</div>
                        <div className="bg-[#DDF0DD] px-3 py-1.5 text-[#14501F]">+ {d.new}</div>
                      </div>
                    ))}
                  </div>
                )}
                {a.versions && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {a.versions.map((v, i) => (
                      <div key={i} className="rounded-lg bg-paper px-3 py-2.5 text-sm leading-snug">
                        <div className="font-semibold">{String(v.value)}</div>
                        <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-cardinal underline">{hostOf(v.source_url)}</a>
                      </div>
                    ))}
                  </div>
                )}
                {a.quote && <p className="mt-3 rounded-lg bg-paper px-4 py-3 font-display text-[15px] italic leading-normal text-[#23332E]">{a.quote}</p>}
                {a.ask_outcome && (
                  thanks[a.key] ? <p className="mt-3 text-sm font-medium text-[#14501F]">{thanks[a.key]}</p> : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {OUTCOMES.map(([o, label]) => (
                        <button key={o} type="button" onClick={() => report(a, o)} className="min-h-[44px] flex-1 rounded-xl border-2 border-ink bg-ticket px-3 text-sm font-semibold text-ink hover:bg-ink hover:text-ticket">{label}</button>
                      ))}
                    </div>
                  )
                )}
                {a.cta && (
                  <Link href={a.go === "card" ? "/card" : `/ticket/${a.resource_id}`} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">{a.cta}</Link>
                )}
              </div>
            </div>
            </Reveal>
          ))}
        </div>
        <Note className="mt-4">Change alerts come from the nightly re-check and reach you only after a person approves them. Alerts marked simulated are driven by the demo clock on Claims.</Note>
      </div>
    </main>
  );
}

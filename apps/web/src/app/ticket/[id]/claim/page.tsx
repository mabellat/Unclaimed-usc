"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ErrorBox, Loading } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import type { TraceEvent } from "@/lib/types";

type Step = { node: string; label: string };

/** The Claim Agent's live trace. Each row lights up as the graph finishes a node. */
export default function ClaimRun() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, card, resources } = useStudent();
  const [steps, setSteps] = useState<Step[]>([]);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [mode, setMode] = useState<string | null>(null);
  const [aiName, setAiName] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const es = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!card) return;
    const source = new EventSource(api.runUrl(card.id, id));
    es.current = source;
    source.addEventListener("start", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setSteps(d.steps);
      setMode(d.mode);
      setAiName(d.name ?? null);
    });
    source.addEventListener("step", (e) => setEvents((prev) => [...prev, JSON.parse((e as MessageEvent).data)]));
    source.addEventListener("done", () => {
      source.close();
      setTimeout(() => router.replace(`/ticket/${id}/packet`), 900);
    });
    source.addEventListener("failed", (e) => {
      source.close();
      setFailed(JSON.parse((e as MessageEvent).data).error);
    });
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) return;
      source.close();
      setFailed((f) => f ?? "Lost the connection to the claim agent. Nothing was sent.");
    };
    return () => source.close();
  }, [card, id, router]);

  if (!ready || !card) return <Loading dark />;
  const r = resources[id];
  if (!r) return <ErrorBox message="This ticket isn't in the approved data." />;

  const last = (node: string) => [...events].reverse().find((e) => e.node === node);
  const doneNodes = new Set(events.map((e) => e.node));
  const drafts = events.filter((e) => e.node === "draft").length;
  const redrafting = events.length > 0 && events[events.length - 1].node === "groundedness_check" && events[events.length - 1].passed === false;
  const current = redrafting ? "draft" : steps.find((s) => !doneNodes.has(s.node))?.node;

  function stop() {
    es.current?.close();
    router.replace(`/ticket/${id}`);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-cardinal-dark text-ticket">
      <div className="flex-1 px-6 pb-3 pt-5">
        <div className="mb-2.5 font-label text-[13px] uppercase tracking-[.16em] text-gold">Claim agent</div>
        <h1 className="mb-1.5 font-display text-[28px] font-bold leading-[1.1]">{r.title}</h1>
        <p className="mb-[22px] text-sm text-[#F0DCCB]">
          {failed ? "Stopped." : "Working on it. You can stop at any time."}
          {mode && <span className="ml-1.5 rounded bg-[rgba(255,204,0,.15)] px-1.5 py-px font-label text-[11px] tracking-[.1em] text-gold">{mode === "ai" ? (aiName ?? "AI").toUpperCase() : mode === "replay" ? "REPLAY OF A CACHED RUN" : "TEMPLATE, NO AI KEY"}</span>}
        </p>
        <ol className="flex flex-col gap-4" aria-live="polite">
          {steps.map((s) => {
            const ev = last(s.node);
            const done = !!ev && !(s.node === current);
            const cur = s.node === current && !failed;
            return (
              <li key={s.node} className="flex items-start gap-3.5">
                <span className={`mt-px inline-flex h-6 w-6 flex-none items-center justify-center rounded-full ${done ? "bg-gold" : cur ? "upulse border-2 border-gold" : "border-2 border-[#8A4A44]"}`}>
                  {done && <Check color="#5C0000" size={14} width={2.4} />}
                </span>
                <div className="min-w-0">
                  <div className={`text-base font-medium ${done || cur ? "text-ticket" : "text-[#C9A99A]"}`}>
                    {s.label}{s.node === "draft" && drafts > 1 ? ` (try ${drafts})` : ""}
                  </div>
                  {ev && (
                    <>
                      
                      <div className="mt-1 text-[13.5px] leading-[1.4] text-[#EFE3D2]">{ev.result}</div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {failed && <div role="alert" className="mt-6 rounded-xl bg-[rgba(0,0,0,.25)] p-4 text-sm leading-normal">{failed}</div>}
        <p className="mt-7 text-xs leading-normal text-[#E3CDBB]">Nothing is sent without you.</p>
      </div>
      <div className="border-t border-[#8A2A2A] px-6 pb-[22px] pt-3">
        {failed ? (
          <Link href={`/ticket/${id}`} className="flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-gold text-[15px] font-semibold text-gold">Back to the ticket</Link>
        ) : (
          <button type="button" onClick={stop} className="min-h-[48px] w-full rounded-xl border-2 border-gold bg-transparent text-[15px] font-semibold text-gold">Stop</button>
        )}
      </div>
    </main>
  );
}

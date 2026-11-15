"use client";

import { useState } from "react";
import { Check } from "./bits";
import { shortLabel } from "@/lib/ui";
import type { FactValue, FieldSpec } from "@/lib/types";

/**
 * Answer controls for one profile field. Answers are self-reported.
 * "Prefer not to say" / "Not now" leaves the field unknown; it never stores false.
 */
export function AnswerControls({ spec, onAnswer, onSkip, dark = true, busy = false }: {
  spec: FieldSpec;
  onAnswer: (v: FactValue) => void;
  onSkip?: () => void;
  dark?: boolean;
  busy?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const btn = `min-h-[46px] flex-1 rounded-[10px] px-3 text-[15px] font-semibold disabled:opacity-60 ${dark ? "bg-ink text-ticket" : "border-2 border-ink bg-ticket text-ink"}`;
  const skip = onSkip && (
    <button type="button" onClick={onSkip} disabled={busy} className="mt-2 min-h-[44px] w-full text-sm font-medium text-ink underline">
      {spec.sensitive ? "Prefer not to say" : "Not now"}
    </button>
  );
  if (spec.type === "bool") {
    return (
      <div>
        <div className="flex gap-2.5">
          <button type="button" disabled={busy} className={btn} onClick={() => onAnswer(true)}>Yes</button>
          <button type="button" disabled={busy} className={btn} onClick={() => onAnswer(false)}>No</button>
        </div>
        {skip}
      </div>
    );
  }
  const values = spec.values ?? [];
  const label = (v: string) => shortLabel(spec.labels?.[v] ?? v);
  if (spec.type === "enum") {
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <button key={v} type="button" disabled={busy} className={`${btn} basis-[calc(50%-4px)]`} onClick={() => onAnswer(v)}>{label(v)}</button>
          ))}
        </div>
        {skip}
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-col gap-1">
        {values.map((v) => {
          const on = picked.includes(v);
          return (
            <button key={v} type="button" role="checkbox" aria-checked={on} disabled={busy}
              onClick={() => setPicked(on ? picked.filter((x) => x !== v) : [...picked, v])}
              className="flex min-h-[44px] w-full items-center gap-3 text-left text-[15px] text-ink">
              <span className={`box-border inline-flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 ${on ? "border-cardinal bg-cardinal" : "border-ink bg-ticket"}`}>
                {on && <Check color="#FFFCF5" size={14} width={2.4} />}
              </span>
              {spec.labels?.[v] ?? v}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2.5">
        <button type="button" disabled={busy} className={btn} onClick={() => onAnswer(picked)}>
          {picked.length ? "Save" : "None of these"}
        </button>
      </div>
      {skip}
    </div>
  );
}

/** A slim reminder at the top of the wallet that jumps down to the "One question" card. */
export function QuestionNudge({ count }: { count: number }) {
  const jump = () => document.getElementById("one-question")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <button type="button" onClick={jump}
      className="mb-[22px] flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl bg-gold px-4 py-2.5 text-left shadow-[3px_3px_0_#1A1210]">
      <span className="text-[15px] leading-snug text-ink">
        <b className="font-semibold">One quick question</b> could unlock {count} more
      </span>
      <span className="flex-none font-label text-xs uppercase tracking-[.14em] text-ink">Answer &darr;</span>
    </button>
  );
}

/** The gold "One question" card: the next-best question. */
export function QuestionCard({ field, spec, count, onAnswer, onSkip }: {
  field: string;
  spec: FieldSpec;
  count: number;
  onAnswer: (v: FactValue) => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="one-question" aria-label="One question" className="mb-[22px] scroll-mt-4 rounded-[14px] bg-gold px-[18px] pb-[18px] pt-4 shadow-[4px_4px_0_#1A1210]">
      <div className="mb-1.5 font-label text-xs uppercase tracking-[.16em] text-ink">One question</div>
      <div className="mb-1 font-display text-[22px] font-bold leading-[1.15] text-ink">{spec.question}</div>
      <div className="mb-3.5 text-sm text-ink">Answering could unlock {count} more.</div>
      {spec.why && <p className="-mt-2 mb-3.5 text-[13px] leading-snug text-ink"><b>Why we ask:</b> {spec.why}</p>}
      <AnswerControls key={field} spec={spec} busy={busy} onAnswer={(v) => run(() => onAnswer(v))()} onSkip={run(onSkip)} />
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip, Kicker, Note, outlineBtn } from "@/components/bits";
import { TrojanCard } from "@/components/TrojanCard";
import { useStudent } from "@/lib/student";
import { answerLabel, NEED_LABELS, shortLabel } from "@/lib/ui";

export default function MyCard() {
  const router = useRouter();
  const { card, match, fields, setNeeds, answer, forget, reset } = useStudent();
  const [busy, setBusy] = useState(false);
  if (!card) return null;
  const level = card.facts.level as string | undefined;
  const schools = (card.facts.schools as string[] | undefined) ?? [];

  const act = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };
  const toggleNeed = (k: string) => act(() => setNeeds(card.needs.includes(k) ? card.needs.filter((n) => n !== k) : [...card.needs, k]));
  const toggleSchool = (s: string) => act(async () => {
    const next = schools.includes(s) ? schools.filter((x) => x !== s) : [...schools, s];
    return next.length ? answer("schools", next) : forget("schools");
  });

  async function restart() {
    setBusy(true);
    await reset();
    router.replace("/");
  }

  return (
    <main className="px-5 pb-5 pt-[22px]" aria-busy={busy}>
      <Kicker className="mb-1.5 text-cardinal">Your Trojan card</Kicker>
      <h1 className="mb-3.5 font-display text-[28px] font-bold leading-[1.1]">Life changes. Your card keeps up.</h1>
      <div className="mb-[18px]"><TrojanCard card={card} fields={fields} /></div>
      <div className="mb-5 rounded-xl bg-gold px-4 py-3 text-sm leading-[1.4]">
        <span className="font-label text-xl font-semibold">{match?.yes.length ?? 0}</span> tickets match your card right now. Change a situation below and watch the wallet update.
      </div>

      <Kicker className="mb-2.5 text-cardinal">What's going on right now</Kicker>
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        {NEED_LABELS.map(([k, label]) => <Chip key={k} on={card.needs.includes(k)} onClick={toggleNeed(k)}>{label}</Chip>)}
      </div>

      {fields.level && (
        <>
          <Kicker className="mb-2.5 text-cardinal">Level</Kicker>
          <div className="mb-[22px] flex flex-wrap gap-2.5">
            {(fields.level.values ?? []).map((v) => (
              <Chip key={v} on={level === v} onClick={act(() => (level === v ? forget("level") : answer("level", v)))}>{shortLabel(fields.level.labels?.[v] ?? v)}</Chip>
            ))}
          </div>
        </>
      )}
      {fields.schools && (
        <>
          <Kicker className="mb-2.5 text-cardinal">School</Kicker>
          <div className="mb-6 flex flex-wrap gap-2.5">
            {(fields.schools.values ?? []).map((v) => (
              <Chip key={v} on={schools.includes(v)} onClick={toggleSchool(v)}>{v === "other" ? "Another school" : shortLabel(fields.schools.labels?.[v] ?? v)}</Chip>
            ))}
          </div>
        </>
      )}

      <Kicker className="mb-1 text-cardinal">Everything you told us</Kicker>
      <p className="mb-2.5 text-[13px] leading-snug text-muted">Self-reported. Offices confirm the details when you apply. Delete any answer and it goes back to unknown.</p>
      <div className="mb-6 overflow-hidden rounded-xl bg-ticket shadow-[0_1px_0_#D8CDB8]">
        {Object.keys(card.facts).length === 0 && <p className="p-4 text-sm text-muted">No answers yet.</p>}
        {Object.entries(card.facts).map(([f, v]) => (
          <div key={f} className="flex items-center gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug text-muted">{fields[f]?.question ?? f}{fields[f]?.sensitive && <span className="ml-1.5 rounded bg-paper px-1.5 py-px font-label text-[10.5px] tracking-[.1em] text-cardinal">SENSITIVE</span>}</div>
              <div className="text-[15px] font-semibold">{answerLabel(fields[f], v)}</div>
            </div>
            <button type="button" onClick={act(() => forget(f))} disabled={busy} aria-label={`Delete your answer to: ${fields[f]?.question ?? f}`}
              className="min-h-[44px] flex-none px-2 text-sm font-semibold text-cardinal underline">Delete</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={restart} disabled={busy} className={outlineBtn}>Delete my card and restart</button>
      <Note className="mt-3.5">Your card is stored under a random id, with no name, email or USC login. Sample data from public usc.edu pages. Not official or USC-affiliated.</Note>
    </main>
  );
}

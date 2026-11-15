"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip, Note, outlineBtn } from "@/components/bits";
import { TrojanCard } from "@/components/TrojanCard";
import { useStudent } from "@/lib/student";
import { answerLabel, NEED_LABELS, shortLabel } from "@/lib/ui";
import { Tilt } from "@site/components/Motion";
import { Band, Panel, WRAP } from "@site/components/Shell";

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
    <main aria-busy={busy}>
      <Band>
        <div className="mb-2 font-label text-[13px] uppercase tracking-[.16em] text-gold">Your Trojan card</div>
        <h1 className="font-display text-[40px] font-bold leading-[1.08] md:text-[48px]">Life changes. Your card keeps up.</h1>
      </Band>

      <div className={`${WRAP} grid gap-8 pb-14 pt-8 lg:grid-cols-[360px_minmax(0,1fr)]`}>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[84px] lg:self-start">
          <Tilt className="rounded-2xl shadow-[0_12px_24px_rgba(92,0,0,.28)]" max={10}><TrojanCard card={card} fields={fields} /></Tilt>
          <div className="rounded-2xl bg-gold px-5 py-4 text-[15px] leading-[1.4] shadow-[4px_4px_0_#1A1210]">
            <span className="font-label text-[28px] font-semibold">{match?.yes.length ?? 0}</span> tickets match your card right now. Change anything here and your wallet updates.
          </div>
          <button type="button" onClick={restart} disabled={busy} className={outlineBtn}>Delete my card and restart</button>
          <Note>Your card is stored under a random id, with no name, email or USC login.</Note>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="What's going on right now">
            <div className="flex flex-wrap gap-2.5">
              {NEED_LABELS.map(([k, label]) => <Chip key={k} on={card.needs.includes(k)} onClick={toggleNeed(k)}>{label}</Chip>)}
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            {fields.level && (
              <Panel title="Level">
                <div className="flex flex-wrap gap-2.5">
                  {(fields.level.values ?? []).map((v) => (
                    <Chip key={v} on={level === v} onClick={act(() => (level === v ? forget("level") : answer("level", v)))}>{shortLabel(fields.level.labels?.[v] ?? v)}</Chip>
                  ))}
                </div>
              </Panel>
            )}
            {fields.schools && (
              <Panel title="School">
                <div className="flex flex-wrap gap-2.5">
                  {(fields.schools.values ?? []).map((v) => (
                    <Chip key={v} on={schools.includes(v)} onClick={toggleSchool(v)}>{v === "other" ? "Another school" : shortLabel(fields.schools.labels?.[v] ?? v)}</Chip>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          <Panel title="Your answers">
            <p className="-mt-2 mb-3 text-sm leading-snug text-muted">Delete an answer to change it. We'll ask again only if it matters.</p>
            {Object.keys(card.facts).length === 0 && <p className="text-[15px] text-muted">No answers yet.</p>}
            <div className="grid gap-x-6 md:grid-cols-2">
              {Object.entries(card.facts).map(([f, v]) => (
                <div key={f} className="flex items-center gap-3 border-b border-rule py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] leading-snug text-muted">{fields[f]?.question ?? f}{fields[f]?.sensitive && <span className="ml-1.5 rounded bg-paper px-1.5 py-px font-label text-[10.5px] tracking-[.1em] text-cardinal">SENSITIVE</span>}</div>
                    <div className="text-[15px] font-semibold">{answerLabel(fields[f], v)}</div>
                  </div>
                  <button type="button" onClick={act(() => forget(f))} disabled={busy} aria-label={`Delete your answer to: ${fields[f]?.question ?? f}`}
                    className="min-h-[44px] flex-none px-2 text-sm font-semibold text-cardinal underline">Delete</button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

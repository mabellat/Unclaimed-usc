"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackButton, Chip, primaryBtn } from "@/components/bits";
import { TrojanCard } from "@/components/TrojanCard";
import { useStudent } from "@/lib/student";
import { NEED_LABELS, shortLabel } from "@/lib/ui";

const TITLES = ["What are you studying toward?", "Which school are you in?", "What's going on right now?"];
const HINTS = [
  "Many funds are only for grads or only for undergrads.",
  "Some fellowships belong to one school. You can skip this and we'll ask later.",
  "Pick everything that fits. Change it any time as life changes.",
];
const LEVEL_SUB: Record<string, string> = { undergrad: "Bachelor's degree", masters: "Graduate program", phd_or_other_grad: "PhD, JD, MD and more" };

export default function Build() {
  const router = useRouter();
  const { fields, start } = useStudent();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [needs, setNeeds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const levelSpec = fields.level;
  const schoolSpec = fields.schools;

  async function find() {
    setBusy(true);
    setProblem(null);
    try {
      // Only what the student picked is saved. Skipped questions stay unknown.
      // Unclaimed is for current USC students, so building a card says you are one (owner decision 2026-11-14).
      const facts: Record<string, boolean | string | string[]> = { enrolled: true };
      if (level) facts.level = level;
      if (school) facts.schools = [school];
      await start(facts, needs);
      router.push("/scan");
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save your card");
      setBusy(false);
    }
  }

  const back = () => (step === 0 ? router.push("/") : setStep(step - 1));

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1 px-6 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <button type="button" onClick={back} aria-label="Back" className="inline-flex min-h-[44px] items-center gap-1.5 pr-3 text-[15px] text-muted">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Back
          </button>
          <span className="font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-cardinal">Step {step + 1} of 3</span>
        </div>
        <div className="mb-[22px]">
          <TrojanCard fields={fields} level={level} schools={school ? [school] : []} needs={needs} />
        </div>
        <h1 className="mb-1 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em]">{TITLES[step]}</h1>
        <p className="mb-4 text-sm leading-[1.45] text-muted">{HINTS[step]}</p>

        {step === 0 && (
          <div className="flex flex-col gap-2.5">
            {(levelSpec?.values ?? []).map((v) => {
              const on = level === v;
              return (
                <button key={v} type="button" aria-pressed={on} onClick={() => { setLevel(v); setStep(1); }}
                  className={`flex min-h-[62px] items-center justify-between rounded-2xl border px-5 transition-colors text-left ${on ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:border-ink"}`}>
                  <span className="font-display text-xl font-semibold">{shortLabel(levelSpec?.labels?.[v] ?? v)}</span>
                  <span className="text-[13px] opacity-80">{LEVEL_SUB[v]}</span>
                </button>
              );
            })}
            <button type="button" onClick={() => { setLevel(null); setStep(1); }} className="min-h-[48px] w-full text-sm font-medium text-muted underline">Skip for now</button>
          </div>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {(schoolSpec?.values ?? []).map((v) => {
                const on = school === v;
                return (
                  <button key={v} type="button" aria-pressed={on} onClick={() => { setSchool(v); setStep(2); }}
                    className={`min-h-[56px] rounded-2xl border px-2 font-display text-[17px] font-semibold transition-colors ${on ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:border-ink"}`}>
                    {v === "other" ? "Another school" : shortLabel(schoolSpec?.labels?.[v] ?? v)}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => { setSchool(null); setStep(2); }} className="mt-2.5 min-h-[48px] w-full text-sm font-medium text-muted underline">Not sure yet, skip for now</button>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2.5">
            {NEED_LABELS.map(([k, label]) => (
              <Chip key={k} on={needs.includes(k)} onClick={() => setNeeds(needs.includes(k) ? needs.filter((n) => n !== k) : [...needs, k])}>{label}</Chip>
            ))}
          </div>
        )}
      </div>
      {step === 2 && (
        <div className="sticky bottom-0 border-t border-rule bg-paper px-6 pb-5 pt-3">
          {problem && <p role="alert" className="mb-2 text-sm text-cardinal">{problem}</p>}
          <button type="button" onClick={find} disabled={busy} className={primaryBtn}>{busy ? "Saving your card..." : "Find what's mine"}</button>
        </div>
      )}
    </main>
  );
}

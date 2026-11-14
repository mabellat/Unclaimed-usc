"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chip, ErrorBox, Loading, Note, primaryBtn } from "@/components/bits";
import { useStudent } from "@/lib/student";
import { NEED_LABELS, shortLabel } from "@/lib/ui";

const TITLES = ["What are you studying?", "Which school are you in?", "What could you use help with?"];
const HINTS = [
  "Your degree helps us find relevant funds and services.",
  "Some resources are specific to your school. It's okay to skip this.",
  "Choose anything that fits. You can change your answers later.",
];
const LEVEL_SUB: Record<string, string> = { undergrad: "Bachelor's degree", masters: "Graduate program", phd_or_other_grad: "PhD, JD, MD and more" };

export default function Build() {
  const router = useRouter();
  const { ready, error, fields, start } = useStudent();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const [needs, setNeeds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const levelSpec = fields.level;
  const schoolSpec = fields.schools;

  useEffect(() => { heading.current?.focus(); }, [step, ready]);

  async function find() {
    setBusy(true);
    setProblem(null);
    try {
      const facts: Record<string, string | string[]> = {};
      if (level && levelSpec) facts.level = level;
      if (school && schoolSpec) facts.schools = [school];
      await start(facts, needs);
      router.push("/wallet");
    } catch {
      setProblem("We couldn't save your card. Your answers are still here; please try again.");
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message="We couldn't load the questions. Please refresh to try again." />;
  if (!ready) return <Loading />;

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1 px-6 pb-8 pt-4 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" disabled={busy} onClick={() => step === 0 ? router.push("/") : setStep(step - 1)} className="inline-flex min-h-[44px] items-center gap-2 pr-3 text-sm text-muted disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Back
          </button>
          <span className="font-label text-xs uppercase tracking-[.16em] text-cardinal">Your Trojan card</span>
        </div>
        <div className="mb-8">
          <p className="mb-3 text-xs font-medium text-muted">Step {step + 1} of 3</p>
          <div className="flex gap-2" aria-hidden="true">{TITLES.map((title, i) => <span key={title} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-cardinal" : "bg-rule"}`} />)}</div>
        </div>
        <h1 ref={heading} tabIndex={-1} className="mb-3 font-display text-[32px] font-bold leading-[1.15] tracking-[-.02em] focus:outline-none">{TITLES[step]}</h1>
        <p id="step-hint" className="mb-7 text-sm leading-relaxed text-muted">{HINTS[step]}</p>

        {step === 0 && <div className="flex flex-col gap-3" role="group" aria-label="Degree level" aria-describedby="step-hint">
          {(levelSpec?.values ?? []).map((v) => (
            <button key={v} type="button" aria-pressed={level === v} onClick={() => setLevel(v)} className={`flex min-h-[72px] items-center justify-between gap-3 rounded-xl border px-5 py-3 text-left ${level === v ? "border-cardinal bg-cardinal text-ticket" : "border-rule bg-ticket text-ink"}`}>
              <span><span className="block text-base font-semibold">{shortLabel(levelSpec?.labels?.[v] ?? v)}</span><span className={`mt-1 block text-sm ${level === v ? "text-blush" : "text-muted"}`}>{LEVEL_SUB[v]}</span></span>
              <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${level === v ? "border-ticket" : "border-sand"}`}>{level === v && <span className="h-2.5 w-2.5 rounded-full bg-ticket" />}</span>
            </button>
          ))}
          {!levelSpec && <p className="text-sm text-muted">No degree information is needed right now. Continue to the next step.</p>}
        </div>}

        {step === 1 && schoolSpec && <div>
          <label htmlFor="school" className="mb-2 block text-sm font-semibold">School</label>
          <select id="school" value={school ?? ""} onChange={(e) => setSchool(e.target.value || null)} className="min-h-[52px] w-full rounded-xl border border-sand bg-ticket px-3 text-base">
            <option value="">Select your school (optional)</option>
            {(schoolSpec.values ?? []).map((v) => <option key={v} value={v}>{v === "other" ? "Another school" : shortLabel(schoolSpec.labels?.[v] ?? v)}</option>)}
          </select>
        </div>}
        {step === 1 && !schoolSpec && <p className="text-sm text-muted">No school information is needed right now. Continue to the next step.</p>}

        {step === 2 && <div className="flex flex-wrap gap-2" role="group" aria-label="What you need" aria-describedby="step-hint">
          {NEED_LABELS.map(([k, label]) => <Chip key={k} on={needs.includes(k)} onClick={() => setNeeds(needs.includes(k) ? needs.filter((n) => n !== k) : [...needs, k])}>{label}</Chip>)}
        </div>}
      </div>
      <div className="safe-bottom sticky bottom-0 border-t border-rule bg-paper px-6 pb-5 pt-4 sm:px-8">
        {problem && <p role="alert" className="mb-3 text-sm text-cardinal">{problem}</p>}
        <button type="button" disabled={busy} onClick={() => step < 2 ? setStep(step + 1) : find()} className={primaryBtn}>
          {busy ? "Finding your matches…" : step === 2 ? "Find my matches" : "Continue"}
        </button>
        {step < 2 ? <button type="button" onClick={() => { if (step === 0) setLevel(null); else setSchool(null); setStep(step + 1); }} className="mt-2 min-h-[44px] w-full text-sm text-muted underline underline-offset-4">Skip for now</button>
          : <p className="mt-3 text-center text-xs leading-relaxed text-muted">{needs.length ? "Only the answers you chose will be saved." : "Nothing selected? We'll start with resources open to everyone."}</p>}
        <Note className="mt-3" />
      </div>
    </main>
  );
}

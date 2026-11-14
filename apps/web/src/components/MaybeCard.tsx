"use client";

import Link from "next/link";
import { useState } from "react";
import { AnswerControls } from "./Answer";
import { useStudent } from "@/lib/student";
import type { MatchItem, Resource } from "@/lib/types";

const ABOUT: Record<string, string> = {
  enrolled: "whether you're enrolled", level: "your degree level", schools: "your school", units_load: "your units",
  gpa_band: "your GPA", continuing: "whether you're continuing", gsg_fee_paid: "the GSG fee", citizenship: "your citizenship or visa",
  has_ssn: "a Social Security number", financial_aid: "financial aid", communities: "your communities",
  has_dornsife_faculty_mentor: "a faculty mentor", under_144_units: "your total units", expected_graduation_term: "when you graduate",
  usc_legacy_50yr: "family USC history", socal_resident: "where you live", progressive_degree: "Progressive Degree status",
};

/** A "maybe" ticket. Tapping it asks the exact question it needs, right here. */
export function MaybeCard({ item, resource }: { item: MatchItem; resource: Resource }) {
  const { fields, answer } = useStudent();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const field = item.unknown[0];
  const spec = field ? fields[field] : undefined;
  const depends = item.unknown.map((f) => ABOUT[f] ?? f.replace(/_/g, " ")).join(" and ");

  return (
    <div className="mb-3 rounded-[10px] border-2 border-dashed border-sand px-4 py-3.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-[44px] w-full items-start gap-3 text-left">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 flex-none"><rect x="4" y="9" width="12" height="9" rx="2" fill="none" stroke="#5E524C" strokeWidth="1.8" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="#5E524C" strokeWidth="1.8" /></svg>
        <span>
          <span className="mb-[3px] block font-display text-[17px] font-bold leading-[1.2] text-body">{resource.title}</span>
          <span className="block text-[13px] leading-[1.4] text-muted">{depends ? `Depends on ${depends}.` : "Needs a check by the office."} {spec ? (open ? "" : "Tap to answer.") : ""}</span>
        </span>
      </button>
      {open && spec && field && (
        <div className="mt-3 border-t border-dashed border-rule pt-3">
          <div className="mb-1 font-display text-lg font-bold leading-tight">{spec.question}</div>
          {spec.why && <p className="mb-2 text-[13px] leading-snug text-muted"><b>Why we ask:</b> {spec.why}</p>}
          <AnswerControls key={field} spec={spec} dark={false} busy={busy} onSkip={() => setOpen(false)} onAnswer={async (v) => { setBusy(true); setProblem(null); try { await answer(field, v); } catch { setProblem("We couldn't update your matches. Please try again."); } finally { setBusy(false); } }} />
          {problem && <p role="alert" className="mt-3 text-sm text-cardinal">{problem}</p>}
          <Link href={`/ticket/${resource.id}`} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">See the full ticket</Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { capitalize } from "@/lib/ui";
import type { Resource } from "@/lib/types";

const DUE = /\b(due|deadline|closes?)\b/i;

function longDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** The deadline label as separate moments ("applications open ...; due ...; decisions ..."). */
function moments(label: string): string[] {
  return label.split(/;\s*|\.\s+(?=[A-Z])/).map((s) => s.trim().replace(/\.$/, "")).filter(Boolean);
}

function DuePill({ closed, days }: { closed: boolean; days: number | null }) {
  if (closed) return <span className="rounded-full bg-[#E3EBE5] px-2.5 py-1 text-xs font-semibold text-muted">Closed</span>;
  if (days === null) return null;
  const urgent = days <= 14;
  const text = days === 0 ? "Due today" : days === 1 ? "1 day left" : `${days} days left`;
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${urgent ? "bg-cardinal text-ticket" : "bg-[#E6EEE8] text-ink"}`}>{text}</span>;
}

/** "How to claim it": the deadline first and big, then the steps, what to have ready, and where. */
export function HowToClaim({ r }: { r: Resource }) {
  const d = r.deadline;
  const parts = d ? moments(d.label) : [];
  return (
    <section className="rounded-xl bg-ticket px-[18px] py-4 shadow-[0_1px_0_#D9E3DD]">
      <h2 className="mb-3 font-label text-xs font-normal uppercase tracking-[.16em] text-cardinal">How to claim it</h2>

      {d?.date ? (
        <div className={`mb-4 rounded-lg px-3.5 py-3 ${d.closed ? "bg-paper" : "bg-[#E6F4EE]"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-label text-[11px] uppercase tracking-[.14em] text-muted">{d.closed ? "Was due" : "Due"}</div>
              <div className="font-display text-[22px] font-bold leading-tight text-ink">{longDate(d.date)}</div>
            </div>
            <DuePill closed={d.closed} days={d.days_left} />
          </div>
          {parts.length > 1 && (
            <ol className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-rule pt-3">
              {parts.map((p) => {
                const key = DUE.test(p);
                return (
                  <li key={p} className="flex items-start gap-2.5 text-[14px] leading-snug">
                    <span className={`mt-[6px] h-2 w-2 flex-none rounded-full ${key ? "bg-cardinal" : "bg-sand"}`} />
                    <span className={key ? "font-semibold text-ink" : "text-body"}>{capitalize(p)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : d ? (
        <div className="mb-4 rounded-lg bg-paper px-3.5 py-3">
          <div className="font-label text-[11px] uppercase tracking-[.14em] text-muted">When</div>
          <div className="text-[15px] font-semibold leading-snug text-ink">{capitalize(d.label)}</div>
        </div>
      ) : (
        <div className="mb-4 text-sm text-muted">No deadline is published. You can apply any time.</div>
      )}

      {r.steps.length > 0 && (
        <>
          <div className="mb-2 font-label text-[11px] uppercase tracking-[.14em] text-muted">Steps</div>
          <ol className="mb-4 flex flex-col gap-3">
            {r.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.4]">
                <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold font-label text-[13px] font-semibold text-ink">{i + 1}</span>
                <span className="min-w-0 break-words">{capitalize(s.text)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {r.docs.length > 0 && (
        <>
          <div className="mb-1.5 font-label text-[11px] uppercase tracking-[.14em] text-muted">Have ready</div>
          <ul className="mb-4 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-[1.4]">
            {r.docs.map((doc, i) => <li key={i}>{capitalize(doc.text)}</li>)}
          </ul>
        </>
      )}

      {r.where && (
        <>
          <div className="mb-1 font-label text-[11px] uppercase tracking-[.14em] text-muted">Where</div>
          <p className="mb-4 text-[15px] leading-[1.4]">{capitalize(r.where)}</p>
        </>
      )}

      <a href={r.source_url} target="_blank" rel="noopener noreferrer"
        className="flex min-h-[46px] w-full items-center justify-center rounded-xl border-2 border-ink bg-ticket text-[15px] font-semibold text-ink">
        Open the official page to apply
      </a>
    </section>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackButton, Check, ErrorBox, Loading, Rings, Scallop, outlineBtn, primaryBtn } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import { capitalize, hostOf } from "@/lib/ui";
import type { Packet } from "@/lib/types";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-ticket px-[18px] py-4 shadow-[0_1px_0_#D8CDB8]">
    <h2 className="mb-2.5 font-label text-xs font-normal uppercase tracking-[.16em] text-cardinal">{title}</h2>
    {children}
  </section>
);

const CHECK_NOTE: Record<string, string> = {
  changed: "The page looks different from the version a person approved. We used the approved version and flagged it for review. Check the page before you send.",
  unreadable: "We couldn't re-read this page automatically (it loads with JavaScript), so this uses the version a person approved. Open the page to double-check.",
  unreachable: "We couldn't reach the page just now, so this uses the version a person approved. Open the page to double-check.",
  blocked: "This page isn't on our allowlist, so it wasn't re-checked.",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PacketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, card } = useStudent();
  const [packet, setPacket] = useState<Packet | null>(null);
  const [stage, setStage] = useState<string>("drafted");
  const [problem, setProblem] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (card) api.claim(card.id, id).then((c) => { setPacket(c.packet); setStage(c.stage); }).catch((e) => setProblem(e.message));
  }, [card, id]);

  if (problem) return <ErrorBox message={problem} />;
  if (!ready || !card || !packet) return <Loading />;
  const p = packet;
  const todo = p.checklist.map((c, i) => ({ c, i })).filter(({ c }) => c.kind === "step" || c.kind === "prepare" || c.kind === "confirm");
  const office = p.checklist.filter((c) => c.kind === "office");

  async function copy() {
    try { await navigator.clipboard.writeText(p.draft.text); } catch {}
    setCopied(true);
  }

  async function sent() {
    setSending(true);
    await api.markSent(card!.id, id);
    router.replace("/claims");
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1">
        <header className="relative overflow-hidden bg-cardinal px-5 pb-[22px] pt-2.5 text-ticket">
          <Rings size={200} radii={[30, 55, 80, 105]} className="-right-[70px] -top-[60px]" />
          <BackButton href={`/ticket/${id}`} label="Back" light />
          <div className="relative mb-2 font-label text-xs uppercase tracking-[.16em] text-gold">Claim packet ready</div>
          <h1 className="relative mb-2 font-display text-[27px] font-bold leading-[1.1]">{p.title}</h1>
          <div className="relative text-sm leading-[1.4] text-cream">Checked against {hostOf(p.source_url)} on {when(p.verified_at)}. Review it, then send it yourself.</div>
        </header>
        <Scallop color="#990000" />

        <div className="flex flex-col gap-4 px-5 pb-2.5 pt-[18px]">
          {p.source_check.status !== "verified" && (
            <div role="note" className="rounded-xl bg-[#FFF1B8] px-[18px] py-3.5 text-sm leading-normal"><strong className="font-semibold">Heads up.</strong> {CHECK_NOTE[p.source_check.status]}</div>
          )}

          <Section title="What to prepare">
            <div className="-mt-1 mb-2.5 text-[12.5px] text-muted">Worked out from the source page and your card. Check each item with the office.</div>
            {todo.length === 0 && <div className="text-[15px]">Nothing to prepare. You can go straight there.</div>}
            <div className="flex flex-col gap-0.5">
              {todo.map(({ c, i }) => {
                const on = !!checks[i];
                return (
                  <button key={i} type="button" role="checkbox" aria-checked={on} onClick={() => setChecks({ ...checks, [i]: !on })}
                    className="flex min-h-[44px] w-full items-center gap-3 py-1 text-left text-[15px] leading-[1.35] text-ink">
                    <span className={`box-border inline-flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 ${on ? "border-cardinal bg-cardinal" : "border-ink bg-ticket"}`}>
                      {on && <Check color="#FFFCF5" size={14} width={2.4} />}
                    </span>
                    <span>
                      {capitalize(c.text)}
                      {c.kind === "confirm" && <span className="block text-[12px] text-muted">You told us this. {c.office_verifies ? "The office verifies it." : "The office may ask."}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {office.length > 0 && (
              <div className="mt-3 border-t border-dashed border-rule pt-3 text-[13.5px] leading-snug text-body">
                <b className="font-semibold">The office decides:</b> {office.map((o) => o.text.replace(/^The office checks: /, "")).join("; ")}.
              </div>
            )}
          </Section>

          <Section title="Your draft message">
            <div className="-mt-1 mb-2 flex items-center justify-between gap-2">
              <span className="text-[12.5px] text-muted">{p.draft.mode === "claude" ? "Drafted by Claude." : p.draft.mode === "claude-cached" ? "Drafted by Claude earlier and cached for this demo." : "Drafted from a template (no AI key configured)."}{p.replayed_from ? " Replayed from a cached run." : ""} Subject: {p.draft.subject}</span>
              <button type="button" onClick={copy} className="min-h-[44px] flex-none pl-3 text-sm font-semibold text-cardinal">{copied ? "Copied" : "Copy"}</button>
            </div>
            <p className="whitespace-pre-line font-display text-[15px] italic leading-normal text-[#2A1E1A]">{p.draft.text}</p>
            <button type="button" aria-expanded={showSources} onClick={() => setShowSources(!showSources)}
              className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-cardinal">
              <Check color="#990000" size={14} /> All {p.grounding.checked} statements checked against the source. {showSources ? "Hide" : "Show"} where each one comes from
            </button>
            {showSources && (
              <ol className="mt-1 flex flex-col gap-2.5 border-t border-dashed border-rule pt-3">
                {p.draft.sentences.map((s, i) => (
                  <li key={i} className="text-[13px] leading-snug">
                    <div className="font-medium text-ink">“{s.text}”</div>
                    {s.cites.length === 0 ? <div className="text-muted">A question to the office; states no facts.</div> :
                      s.cites.map((c) => <div key={c} className="text-muted"><span className="font-label tracking-[.06em] text-cardinal">{c.startsWith("profile:") ? "YOUR CARD" : "SOURCE PAGE"}</span> {p.catalog[c]}</div>)}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Where to go">
            <div className="flex flex-col gap-1 text-sm text-body">
              {p.where && <div><strong className="font-semibold">Where:</strong> {p.where}</div>}
              <div><strong className="font-semibold">When:</strong> {p.deadline.label ?? "No deadline is published on the source page."}</div>
              <div><strong className="font-semibold">Reminder:</strong> {p.reminder.text}</div>
            </div>
            <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Open the source page</a>
          </Section>

          <div className="text-xs leading-normal text-muted">
            Every statement in this packet comes from the source page or your card. {p.basis} Data version {p.data_version}.
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-rule bg-paper px-5 pb-5 pt-3">
        {p.has_calendar && (
          <a href={api.calendarUrl(card.id, id)} className={`${outlineBtn} flex items-center justify-center`}>Add deadline to calendar</a>
        )}
        {stage === "drafted" ? (
          <button type="button" onClick={sent} disabled={sending} className={primaryBtn}>{sending ? "Saving..." : "I sent it"}</button>
        ) : (
          <button type="button" onClick={() => router.push("/claims")} className={primaryBtn}>Track it in Claims</button>
        )}
      </div>
    </main>
  );
}

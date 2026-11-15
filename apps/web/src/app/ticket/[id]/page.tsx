"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnswerControls } from "@/components/Answer";
import { HowToClaim } from "@/components/HowToClaim";
import { BackButton, Check, ErrorBox, Loading, Track, primaryBtn } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import { capitalize, hostOf } from "@/lib/ui";
import type { Claim } from "@/lib/types";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-ticket px-[18px] py-4">
    <h2 className="mb-3 font-label text-xs font-normal uppercase tracking-[.16em] text-cardinal">{title}</h2>
    {children}
  </section>
);

export default function Ticket() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, card, match, resources, fields, answer, error } = useStudent();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [why, setWhy] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !card && !error) router.replace("/");
  }, [ready, card, error, router]);
  useEffect(() => {
    if (card) api.claims(card.id).then((c) => setClaim(c.claims.find((x) => x.resource_id === id) ?? null)).catch(() => {});
  }, [card, id]);

  const shownStatus = match ? ([...match.yes, ...match.maybe, ...match.no].find((m) => m.id === id)?.status ?? "hidden") : null;
  useEffect(() => {
    // When it doesn't fit, explain why in plain words (the rules engine's own result).
    if (card && (shownStatus === "no" || shownStatus === "hidden")) api.explain(card.id, id).then((e) => setWhy(e.sentences)).catch(() => setWhy(null));
  }, [card, id, shownStatus]);

  if (error) return <ErrorBox message={error} />;
  if (!ready || !card || !match) return <Loading />;
  const r = resources[id];
  if (!r) return <ErrorBox message="This ticket isn't in the approved data." />;
  const item = [...match.yes, ...match.maybe, ...match.no].find((m) => m.id === id);
  const status = item?.status ?? "hidden";
  const idx = claim?.stage_index ?? -1;

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1">
        <header className="relative overflow-hidden bg-ink px-5 pb-[22px] pt-2.5 text-white">
          <BackButton href="/wallet" label="Back" light />
          <div className="relative mb-2 font-label text-[11px] font-medium uppercase tracking-[.12em] text-gold">{r.provider}</div>
          <h1 className="relative mb-2 font-display text-[29px] font-bold leading-[1.1] tracking-[-0.01em]">{r.title}</h1>
          <div className="relative text-base font-medium text-cream">{capitalize(r.benefit?.label ?? "")}</div>
          {idx === 3 && (
            <div className="ustamp absolute bottom-4 right-[18px] rounded-lg border-4 border-gold bg-[rgba(0,0,0,.55)] px-3 py-1 font-label text-[30px] font-semibold tracking-[.12em] text-gold">CLAIMED</div>
          )}
        </header>

        <div className="flex flex-col gap-4 px-5 pb-2.5 pt-[18px]">
          {status === "yes" && (
            <Section title="Where this stands">
              <Track index={idx} />
              <div className="mt-2.5 text-[13px] leading-[1.4] text-muted">
                {idx < 0 ? "Not started. Let the claim agent prepare everything." : idx === 0 ? "Draft ready. Send it yourself to start the clock." : `Status: ${claim?.stage}${claim?.simulated ? " (simulated in this demo)" : ""}.`}
              </div>
            </Section>
          )}

          {status === "yes" && (
            <Section title="Why you qualify">
              <div className="flex flex-col gap-2">
                {[...new Set(item!.why.map((w) => w.text))].map((text) => (
                  <div key={text} className="flex items-start gap-2.5 text-[15px] leading-[1.4]">
                    <span className="mt-[3px]"><Check color="#9D2235" /></span>
                    <span>{capitalize(text)}</span>
                  </div>
                ))}
                {item!.why.length === 0 && <div className="text-[15px]">The source page sets no rule we check. The office decides.</div>}
              </div>
              {item!.basis && <p className="mt-3 text-[13px] leading-snug text-muted">{item!.basis}</p>}
            </Section>
          )}

          {status === "maybe" && (
            <Section title="What we still need to know">
              <div className="flex flex-col gap-5">
                {item!.unknown.map((f) => fields[f] && (
                  <div key={f}>
                    <div className="mb-1 font-display text-lg font-bold leading-tight">{fields[f].question}</div>
                    {fields[f].why && <p className="mb-2 text-[13px] leading-snug text-muted"><b>Why we ask:</b> {fields[f].why}</p>}
                    <AnswerControls spec={fields[f]} dark={false} busy={busy} onAnswer={async (v) => { setBusy(true); try { await answer(f, v); } finally { setBusy(false); } }} />
                  </div>
                ))}
              </div>
              {item!.why.length > 0 && (
                <div className="mt-4 border-t border-dashed border-rule pt-3 text-[13px] leading-snug text-muted">
                  Already fits: {item!.why.map((w) => w.text).join("; ")}.
                </div>
              )}
            </Section>
          )}

          {(status === "no" || status === "hidden") && (
            <Section title="Why it doesn't fit right now">
              {why && why.length > 0 ? (
                <div className="flex flex-col gap-2 text-[15px] leading-[1.45]">{why.map((t, i) => <p key={i}>{t}</p>)}</div>
              ) : (
                <p className="text-[15px] leading-[1.45]">{status === "no" ? "Based on your card, this one doesn't fit right now." : "This doesn't match the situations on your card."}</p>
              )}
              <Link href="/card" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Update my card</Link>
            </Section>
          )}

          {item && item.office_decides.length > 0 && (
            <Section title="The office decides">
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.4]">
                {item.office_decides.map((t) => <li key={t}>{capitalize(t)}</li>)}
              </ul>
              <p className="mt-2.5 text-[13px] leading-snug text-muted">We don't ask about these. The office checks them when you apply.</p>
            </Section>
          )}

          <HowToClaim r={r} />

          {r.conflicts?.length > 0 && (
            <Section title="USC pages disagree">
              {r.conflicts.map((c) => (
                <div key={c.field} className="mb-2 last:mb-0">
                  <div className="mb-1 text-[13px] font-semibold text-muted">{c.field.replace(/_label$/, "").replace(/_/g, " ")}</div>
                  {c.versions.map((v, i) => (
                    <div key={i} className="mb-1.5 rounded-lg bg-paper px-2.5 py-2 text-sm leading-snug">
                      <div className="font-semibold">{String(v.value)}</div>
                      <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-cardinal underline">{hostOf(v.source_url)}</a>
                    </div>
                  ))}
                </div>
              ))}
              <p className="text-[13px] leading-snug text-muted">We show both until the office settles it. Confirm with them before you go.</p>
            </Section>
          )}

          {r.note && (
            <div className="rounded-xl bg-[#FFF1B8] px-[18px] py-3.5 text-sm leading-normal text-ink">
              <strong className="font-semibold">Heads up.</strong>{" "}
              {r.note.split("\n").map((l) => capitalize(l.trim())).map((l) => (/[.!?]$/.test(l) ? l : l + ".")).join(" ")}
            </div>
          )}

          {status === "yes" && idx < 0 && (
            <div className="rounded-xl bg-ink px-[18px] py-4 text-ticket">
              <div className="mb-2 font-label text-[11px] font-medium uppercase tracking-[.12em] text-gold">Your claim agent</div>
              <div className="mb-2.5 font-display text-[19px] font-bold leading-[1.2]">Let it do the paperwork.</div>
              <ol className="flex flex-col gap-[7px] text-sm leading-[1.4] text-white/65">
                <li>1. Re-checks the source page right now</li>
                <li>2. Works out exactly what you need to prepare</li>
                <li>3. Drafts your message from your card</li>
                <li>4. Checks every statement against the source</li>
              </ol>
              <div className="mt-3 text-[13px] leading-[1.45] text-cream">You stay in control. Nothing is sent until you send it yourself.</div>
            </div>
          )}

          <div className="text-xs leading-normal text-muted">
            Source: <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-cardinal underline">{hostOf(r.source_url)}</a>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-rule bg-paper px-5 pb-5 pt-3">
        {status === "yes" && r.deadline?.closed && idx < 0 ? (
          <>
            <p className="text-center text-[13px] text-muted">The source page says this window has closed. Watch Alerts for the next one.</p>
            <Link href="/wallet" className={`${primaryBtn} flex items-center justify-center`}>Back to my wallet</Link>
          </>
        ) : status === "yes" ? (
          idx < 0 ? <Link href={`/ticket/${id}/claim`} className={`${primaryBtn} flex items-center justify-center`}>Claim it for me</Link>
          : idx === 0 ? <Link href={`/ticket/${id}/packet`} className={`${primaryBtn} flex items-center justify-center`}>Open my claim packet</Link>
          : idx < 3 ? <Link href="/claims" className={`${primaryBtn} flex items-center justify-center`}>Track it in Claims</Link>
          : <Link href="/wallet" className={`${primaryBtn} flex items-center justify-center`}>Back to my wallet</Link>
        ) : (
          <Link href="/wallet" className={`${primaryBtn} flex items-center justify-center`}>Back to my wallet</Link>
        )}
      </div>
    </main>
  );
}

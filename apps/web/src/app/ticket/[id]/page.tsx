"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnswerControls } from "@/components/Answer";
import { BackButton, Check, ErrorBox, Loading, Rings, Scallop, Track, primaryBtn } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import { answerLabel, capitalize, hostOf, prettyDate } from "@/lib/ui";
import type { Claim } from "@/lib/types";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-ticket px-[18px] py-4 shadow-[0_1px_0_#D8CDB8]">
    <h2 className="mb-3 font-label text-xs font-normal uppercase tracking-[.16em] text-cardinal">{title}</h2>
    {children}
  </section>
);

export default function Ticket() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, card, match, resources, fields, answer, error } = useStudent();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !card && !error) router.replace("/");
  }, [ready, card, error, router]);
  useEffect(() => {
    if (card) api.claims(card.id).then((c) => setClaim(c.claims.find((x) => x.resource_id === id) ?? null)).catch(() => {});
  }, [card, id]);

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
        <header className="relative overflow-hidden bg-cardinal px-5 pb-[22px] pt-2.5 text-ticket">
          <Rings size={200} radii={[30, 55, 80, 105]} className="-right-[70px] -top-[60px]" />
          <BackButton light />
          <div className="relative mb-2 font-label text-xs uppercase tracking-[.16em] text-gold">{r.provider}</div>
          <h1 className="relative mb-2 font-display text-[29px] font-bold leading-[1.1] tracking-[-0.01em]">{r.title}</h1>
          <div className="relative text-base font-medium text-cream">{capitalize(r.benefit?.label ?? "")}</div>
          {idx === 3 && (
            <div className="ustamp absolute bottom-4 right-[18px] rounded-lg border-4 border-gold bg-[rgba(92,0,0,.55)] px-3 py-1 font-label text-[30px] font-semibold tracking-[.12em] text-gold">CLAIMED</div>
          )}
        </header>
        <Scallop color="#990000" />

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
                {item!.why.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.4]">
                    <span className="mt-[3px]"><Check color="#990000" /></span>
                    <span>{capitalize(w.text)}{w.field && card.facts[w.field] !== undefined && <span className="block text-[13px] text-muted">You told us: {answerLabel(fields[w.field], card.facts[w.field])}</span>}</span>
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
            <div className="rounded-xl border-2 border-dashed border-sand p-4 text-sm leading-normal text-muted">
              {status === "no" ? "Based on your card, this one doesn't fit right now." : "This doesn't match the situations on your card."} You can update your card any time.
            </div>
          )}

          {item && item.office_decides.length > 0 && (
            <Section title="The office decides">
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.4]">
                {item.office_decides.map((t) => <li key={t}>{capitalize(t)}</li>)}
              </ul>
              <p className="mt-2.5 text-[13px] leading-snug text-muted">We don't ask about these. The office checks them when you apply.</p>
            </Section>
          )}

          <Section title="How to claim it">
            {r.steps.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {r.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.4]">
                    <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold font-label text-[13px] font-semibold text-ink">{i + 1}</span>
                    <span className="min-w-0 break-words">{capitalize(s.text)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[15px] leading-[1.4]">The source page has the details on how to apply. The claim agent can work out the steps with you.</p>
            )}
            {r.docs.length > 0 && (
              <div className="mt-3 text-[15px] leading-[1.4]"><b className="font-semibold">Have ready:</b> {r.docs.map((d) => d.text).join("; ")}.</div>
            )}
            <div className="mt-3.5 flex flex-col gap-1 border-t border-dashed border-rule pt-3 text-sm text-body">
              {r.where && <div><strong className="font-semibold">Where:</strong> {r.where}</div>}
              <div><strong className="font-semibold">When:</strong> {r.deadline?.label ?? "No deadline is published on the source page."}</div>
            </div>
          </Section>

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
              <div className="mb-2 font-label text-xs uppercase tracking-[.16em] text-gold">Your claim agent</div>
              <div className="mb-2.5 font-display text-[19px] font-bold leading-[1.2]">Let it do the paperwork.</div>
              <ol className="flex flex-col gap-[7px] text-sm leading-[1.4] text-[#EFE3D2]">
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
            <br />Sample data, checked {prettyDate(r.last_verified)}. Confirm details with the office before you rely on them. Data version {r.data_version}.
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-rule bg-paper px-5 pb-5 pt-3">
        {status === "yes" ? (
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

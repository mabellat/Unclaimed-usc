"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnswerControls } from "@/components/Answer";
import { HowToClaim } from "@/components/HowToClaim";
import { Check, ErrorBox, Loading, Track, primaryBtn } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import { capitalize, hostOf, money, stubFor } from "@/lib/ui";
import type { Claim } from "@/lib/types";
import { Band, Panel, WRAP } from "@site/components/Shell";

export default function Ticket() {
  const { id } = useParams<{ id: string }>();
  const { card, match, resources, fields, answer, error } = useStudent();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [why, setWhy] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (card) api.claims(card.id).then((c) => setClaim(c.claims.find((x) => x.resource_id === id) ?? null)).catch(() => {});
  }, [card, id]);

  const shownStatus = match ? ([...match.yes, ...match.maybe, ...match.no].find((m) => m.id === id)?.status ?? "hidden") : null;
  useEffect(() => {
    // When it doesn't fit, explain why in plain words (the rules engine's own result).
    if (card && (shownStatus === "no" || shownStatus === "hidden")) api.explain(card.id, id).then((e) => setWhy(e.sentences)).catch(() => setWhy(null));
  }, [card, id, shownStatus]);

  if (error) return <ErrorBox message={error} />;
  if (!card || !match) return <Loading />;
  const r = resources[id];
  if (!r) return <div className="mx-auto w-full max-w-xl py-16"><ErrorBox message="This ticket isn't in the approved data." /></div>;
  const item = [...match.yes, ...match.maybe, ...match.no].find((m) => m.id === id);
  const status = item?.status ?? "hidden";
  const idx = claim?.stage_index ?? -1;
  const stub = stubFor(r.category);
  const value = r.benefit?.value;

  const action = status === "yes" && r.deadline?.closed && idx < 0 ? null
    : status !== "yes" ? null
    : idx < 0 ? { href: `/ticket/${id}/claim`, label: "Claim it for me" }
    : idx === 0 ? { href: `/ticket/${id}/packet`, label: "Open my claim packet" }
    : idx < 3 ? { href: "/claims", label: "Track it in Claims" }
    : null;
  const verdict = status === "yes" ? { text: "You qualify", cls: "bg-gold text-ink" }
    : status === "maybe" ? { text: "One answer away", cls: "bg-ticket text-ink" }
    : { text: "Not a fit right now", cls: "bg-[rgba(0,0,0,.25)] text-ticket" };

  return (
    <main>
      <Band color="#990000">
        <Link href="/wallet" className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 pr-3 text-[15px] text-[#FFE9D6] hover:underline">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to my wallet
        </Link>
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[720px]">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="font-label text-[13px] uppercase tracking-[.16em] text-gold">{r.provider}</span>
              <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${verdict.cls}`}>{verdict.text}</span>
            </div>
            <h1 className="mb-3 font-display text-[40px] font-bold leading-[1.05] tracking-[-0.015em] md:text-[52px]">{r.title}</h1>
            <p className="text-lg font-medium leading-snug text-cream">{capitalize(r.benefit?.label ?? "")}</p>
          </div>
          <div aria-hidden="true" className="relative flex h-[150px] w-[230px] flex-none rotate-[4deg] overflow-hidden rounded-xl shadow-[0_18px_30px_rgba(0,0,0,.35)]">
            <div className="flex w-[96px] flex-col items-center justify-center" style={{ background: stub.bg, color: stub.fg }}>
              <span className="font-label text-[11px] tracking-[.18em]">{stub.label}</span>
              <span className="mt-1 text-center font-label text-[26px] font-semibold leading-none">{value != null ? money(value) : stub.word}</span>
            </div>
            <div className="w-0 border-l-2 border-dashed border-rule" />
            <div className="flex flex-1 flex-col justify-between bg-ticket p-3.5 text-ink">
              <span className="font-label text-[10px] tracking-[.14em] text-cardinal">ADMIT ONE</span>
              <span className="font-display text-[15px] font-bold leading-tight">{r.title}</span>
              <span className="barcode h-4 opacity-100 [filter:brightness(.3)]" />
            </div>
            {idx === 3 && (
              <div className="ustamp absolute inset-0 m-auto h-fit w-fit rounded-lg border-4 border-cardinal bg-[rgba(255,252,245,.85)] px-3 py-1 font-label text-[28px] font-semibold tracking-[.12em] text-cardinal">CLAIMED</div>
            )}
          </div>
        </div>
      </Band>

      <div className={`${WRAP} grid gap-6 pb-14 pt-8 lg:grid-cols-[minmax(0,1fr)_400px]`}>
        <div className="flex min-w-0 flex-col gap-5">
          {status === "yes" && (
            <Panel title="Why you qualify">
              <div className="grid gap-3 sm:grid-cols-2">
                {[...new Set(item!.why.map((w) => w.text))].map((text) => (
                  <div key={text} className="flex items-start gap-3 rounded-xl bg-paper px-4 py-3 text-[15px] leading-[1.4]">
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-cardinal"><Check color="#FFFCF5" size={14} width={2.4} /></span>
                    <span>{capitalize(text)}</span>
                  </div>
                ))}
              </div>
              {item!.why.length === 0 && <p className="text-[15px]">The source page sets no rule we check. The office decides.</p>}
              {item!.basis && <p className="mt-4 text-sm leading-snug text-muted">{item!.basis}</p>}
            </Panel>
          )}

          {status === "maybe" && (
            <Panel title="What we still need to know">
              <div className="flex flex-col gap-6">
                {item!.unknown.map((f) => fields[f] && (
                  <div key={f} className="max-w-[560px]">
                    <div className="mb-1 font-display text-xl font-bold leading-tight">{fields[f].question}</div>
                    {fields[f].why && <p className="mb-3 text-sm leading-snug text-muted"><b>Why we ask:</b> {fields[f].why}</p>}
                    <AnswerControls spec={fields[f]} dark={false} busy={busy} onAnswer={async (v) => { setBusy(true); try { await answer(f, v); } finally { setBusy(false); } }} />
                  </div>
                ))}
              </div>
              {item!.why.length > 0 && (
                <div className="mt-5 border-t border-dashed border-rule pt-4 text-sm leading-snug text-muted">Already fits: {item!.why.map((w) => w.text).join("; ")}.</div>
              )}
            </Panel>
          )}

          {(status === "no" || status === "hidden") && (
            <Panel title="Why it doesn't fit right now">
              {why && why.length > 0 ? (
                <div className="flex flex-col gap-2 text-base leading-[1.5]">{why.map((t, i) => <p key={i}>{t}</p>)}</div>
              ) : (
                <p className="text-base leading-[1.5]">{status === "no" ? "Based on your card, this one doesn't fit right now." : "This doesn't match the situations on your card."}</p>
              )}
              <Link href="/card" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Update my card</Link>
            </Panel>
          )}

          {item && item.office_decides.length > 0 && (
            <Panel title="The office decides">
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.45]">
                {item.office_decides.map((t) => <li key={t}>{capitalize(t)}</li>)}
              </ul>
              <p className="mt-3 text-sm leading-snug text-muted">We don't ask about these. The office checks them when you apply.</p>
            </Panel>
          )}

          {r.note && (
            <div className="rounded-2xl bg-[#FFF1B8] px-6 py-4 text-[15px] leading-normal text-ink">
              <strong className="font-semibold">Heads up.</strong>{" "}
              {r.note.split("\n").map((l) => capitalize(l.trim())).map((l) => (/[.!?]$/.test(l) ? l : l + ".")).join(" ")}
            </div>
          )}

          {r.conflicts?.length > 0 && (
            <Panel title="USC pages disagree">
              {r.conflicts.map((c) => (
                <div key={c.field} className="mb-3 last:mb-0">
                  <div className="mb-1.5 text-sm font-semibold text-muted">{c.field.replace(/_label$/, "").replace(/_/g, " ")}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {c.versions.map((v, i) => (
                      <div key={i} className="rounded-lg bg-paper px-3 py-2.5 text-sm leading-snug">
                        <div className="font-semibold">{String(v.value)}</div>
                        <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-cardinal underline">{hostOf(v.source_url)}</a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-sm leading-snug text-muted">We show both until the office settles it. Confirm with them before you go.</p>
            </Panel>
          )}

          {status === "yes" && idx < 0 && !r.deadline?.closed && (
            <section className="rounded-2xl bg-ink p-6 text-ticket">
              <div className="mb-2 font-label text-xs uppercase tracking-[.16em] text-gold">Your claim agent</div>
              <div className="mb-4 font-display text-2xl font-bold leading-[1.2]">Let it do the paperwork.</div>
              <ol className="grid gap-3 sm:grid-cols-2">
                {["Re-checks the source page right now", "Works out exactly what you need to prepare", "Drafts your message from your card", "Checks every statement against the source"].map((t, i) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] leading-snug text-[#EFE3D2]">
                    <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold font-label text-sm font-semibold text-ink">{i + 1}</span>{t}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm leading-[1.45] text-cream">You stay in control. Nothing is sent until you send it yourself.</p>
            </section>
          )}

          <div className="text-[13px] leading-normal text-muted">
            Source: <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-cardinal underline">{hostOf(r.source_url)}</a>
          </div>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-[84px] lg:self-start">
          {status === "yes" && (
            <Panel title="Where this stands">
              <Track index={idx} />
              <p className="mt-3 text-sm leading-[1.4] text-muted">
                {r.deadline?.closed && idx < 0 ? "The source page says this window has closed. Watch Alerts for the next one."
                  : idx < 0 ? "Not started. Let the claim agent prepare everything."
                  : idx === 0 ? "Draft ready. Send it yourself to start the clock."
                  : `Status: ${claim?.stage}${claim?.simulated ? " (simulated in this demo)" : ""}.`}
              </p>
              {action && <Link href={action.href} className={`${primaryBtn} mt-4 flex items-center justify-center`}>{action.label}</Link>}
            </Panel>
          )}
          <HowToClaim r={r} />
        </aside>
      </div>
    </main>
  );
}

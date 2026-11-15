"use client";

import { useState } from "react";
import { needLabel, shortLabel } from "@/lib/ui";
import type { Card, FieldSpec } from "@/lib/types";

function serial(id: string | undefined) {
  if (!id) return "ID ---- ----";
  const digits = Array.from(id).map((c) => c.charCodeAt(0) % 10).join("");
  return `ID ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
}

/** The student's Trojan card. Fills in as they answer. A saved card flips over on click to show its details. */
export function TrojanCard({ card, level, schools, needs, fields }: {
  card?: Card | null;
  level?: string | null;
  schools?: string[];
  needs?: string[];
  fields: Record<string, FieldSpec>;
}) {
  const [flipped, setFlipped] = useState(false);
  const lv = level ?? (card?.facts.level as string | undefined) ?? null;
  const sc = schools ?? (card?.facts.schools as string[] | undefined) ?? [];
  const nd = needs ?? card?.needs ?? [];
  const levelText = lv ? shortLabel(fields.level?.labels?.[lv] ?? lv) : "Who are you?";
  const schoolText = sc.length
    ? sc.map((s) => shortLabel(fields.schools?.labels?.[s] ?? s)).join(" · ")
    : lv ? "School not set" : "Your card fills in as you go";
  const tags = nd.slice(0, 3).map(needLabel).concat(nd.length > 3 ? [`+${nd.length - 3} more`] : []);

  const front = (
    <div className="relative box-border h-full w-full overflow-hidden rounded-[20px] bg-ink px-5 pb-4 pt-[18px] text-left text-white shadow-[0_18px_40px_rgba(0,0,0,.22)]">
      <span aria-hidden="true" className="absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
      <span aria-hidden="true" className="absolute -right-2 -top-6 h-24 w-24 rounded-full border border-white/10" />
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-label text-[11px] font-medium tracking-[.14em] text-white/70">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cardinal" />TROJAN CARD
        </span>
        <span className="font-label text-[11px] tracking-[.1em] text-white/50">{serial(card?.id)}</span>
      </div>
      <div className={`relative mb-0.5 mt-5 font-display text-[28px] font-bold leading-[1.05] ${lv ? "text-white" : "text-white/55"}`}>{levelText}</div>
      <div className="relative text-sm text-white/60">{schoolText}</div>
      <div className="relative mt-4 flex min-h-[26px] flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">{t}</span>
        ))}
      </div>
      <div aria-hidden="true" className="relative mt-4 flex items-center gap-2">
        <span className="h-[18px] w-[26px] rounded-[4px] bg-gold/90" />
        <span className="barcode h-3 flex-1" />
      </div>
    </div>
  );
  if (!card || level !== undefined) return front;

  // The back shows the basics only. Sensitive answers are counted, never shown here.
  const others = Object.keys(card.facts).filter((f) => !["level", "schools", "enrolled"].includes(f)).length;
  const rows: [string, string][] = [
    ["Degree", lv ? fields.level?.labels?.[lv] ?? lv : "Not set"],
    ["School", sc.length ? sc.map((s) => shortLabel(fields.schools?.labels?.[s] ?? s)).join(", ") : "Not set"],
    ["Status", card.facts.enrolled === true ? "Current USC student" : card.facts.enrolled === false ? "Not enrolled this term" : "Not set"],
    ["Looking for", nd.length ? nd.map(needLabel).join(", ") : "Nothing picked yet"],
  ];
  return (
    <button type="button" onClick={() => setFlipped(!flipped)} aria-pressed={flipped}
      aria-label={flipped ? "Trojan card details. Click to flip back." : "Trojan card. Click to see your details."}
      className={`flip-card block w-full rounded-[20px] ${flipped ? "is-flipped" : ""}`}>
      <span className="flip-inner relative block">
        <span className="flip-face block">{front}</span>
        <span className="flip-face flip-back absolute inset-0 block">
          <span className="relative box-border flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-[#1C1C1C] px-5 pb-4 pt-[18px] text-left text-white shadow-[0_18px_40px_rgba(0,0,0,.22)]">
            <span className="relative flex items-center justify-between">
              <span className="font-label text-[11px] font-medium tracking-[.14em] text-white/70">STUDENT DETAILS</span>
              <span className="font-label text-[11px] tracking-[.1em] text-white/50">{serial(card.id)}</span>
            </span>
            <span className="relative mt-3.5 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px] leading-snug">
              {rows.map(([k, v]) => (
                <span key={k} className="contents">
                  <span className="font-label text-[10.5px] uppercase tracking-[.1em] text-white/50">{k}</span>
                  <span className="truncate text-white" title={v}>{v}</span>
                </span>
              ))}
            </span>
            <span className="relative mt-auto flex items-center justify-between pt-2 text-[11px] text-white/50">
              <span>{others ? `${others} more answer${others > 1 ? "s" : ""} on My card` : "Answers live on My card"}</span>
              <span className="font-label tracking-[.12em] text-gold">FLIP BACK</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}

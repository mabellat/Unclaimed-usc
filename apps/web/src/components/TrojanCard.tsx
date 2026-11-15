"use client";

import { useState } from "react";
import { Rings } from "./bits";
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
    <div className="relative box-border h-full w-full overflow-hidden rounded-2xl bg-cardinal px-[18px] pb-3.5 pt-4 text-left text-ticket shadow-[0_12px_24px_rgba(92,0,0,.28)]">
      <Rings size={170} radii={[30, 50, 70, 90]} opacity={0.28} className="-right-[50px] -top-[60px]" />
      <div className="relative flex items-center justify-between">
        <span className="font-label text-xs tracking-[.18em] text-gold">TROJAN CARD</span>
        <span className="font-label text-xs tracking-[.12em] text-blush">{serial(card?.id)}</span>
      </div>
      <div className={`relative mb-0.5 mt-3.5 font-display text-[26px] font-bold leading-[1.1] ${lv ? "text-ticket" : "text-[#E9B9B2]"}`}>{levelText}</div>
      <div className="relative text-sm text-blush">{schoolText}</div>
      <div className="relative mt-3 flex min-h-[26px] flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-[13px] border border-gold px-2.5 py-[3px] text-xs font-medium text-gold">{t}</span>
        ))}
      </div>
      <div aria-hidden="true" className="barcode relative mt-3.5 h-5" />
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
      className={`flip-card block w-full rounded-2xl ${flipped ? "is-flipped" : ""}`}>
      <span className="flip-inner relative block">
        <span className="flip-face block">{front}</span>
        <span className="flip-face flip-back absolute inset-0 block">
          <span className="relative box-border flex h-full w-full flex-col overflow-hidden rounded-2xl bg-cardinal-dark px-[18px] pb-3.5 pt-4 text-left text-ticket shadow-[0_12px_24px_rgba(92,0,0,.28)]">
            <span className="relative flex items-center justify-between">
              <span className="font-label text-xs tracking-[.18em] text-gold">STUDENT DETAILS</span>
              <span className="font-label text-xs tracking-[.12em] text-blush">{serial(card.id)}</span>
            </span>
            <span className="relative mt-3.5 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px] leading-snug">
              {rows.map(([k, v]) => (
                <span key={k} className="contents">
                  <span className="font-label text-[11px] uppercase tracking-[.14em] text-gold">{k}</span>
                  <span className="truncate text-ticket" title={v}>{v}</span>
                </span>
              ))}
            </span>
            <span className="relative mt-auto flex items-center justify-between pt-2 text-[11px] text-blush">
              <span>{others ? `${others} more answer${others > 1 ? "s" : ""} on My card` : "Answers live on My card"}</span>
              <span className="font-label tracking-[.14em] text-gold">FLIP BACK</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}

"use client";

import { Rings } from "./bits";
import { needLabel, shortLabel } from "@/lib/ui";
import type { Card, FieldSpec } from "@/lib/types";

function serial(id: string | undefined) {
  if (!id) return "ID ---- ----";
  const digits = Array.from(id).map((c) => c.charCodeAt(0) % 10).join("");
  return `ID ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
}

/** The student's Trojan card. Fills in as they answer. */
export function TrojanCard({ card, level, schools, needs, fields }: {
  card?: Card | null;
  level?: string | null;
  schools?: string[];
  needs?: string[];
  fields: Record<string, FieldSpec>;
}) {
  const lv = level ?? (card?.facts.level as string | undefined) ?? null;
  const sc = schools ?? (card?.facts.schools as string[] | undefined) ?? [];
  const nd = needs ?? card?.needs ?? [];
  const levelText = lv ? shortLabel(fields.level?.labels?.[lv] ?? lv) : "Who are you?";
  const schoolText = sc.length
    ? sc.map((s) => shortLabel(fields.schools?.labels?.[s] ?? s)).join(" · ")
    : lv ? "School not set" : "Your card fills in as you go";
  const tags = nd.slice(0, 3).map(needLabel).concat(nd.length > 3 ? [`+${nd.length - 3} more`] : []);
  return (
    <div className="relative box-border w-full overflow-hidden rounded-2xl bg-cardinal px-[18px] pb-3.5 pt-4 text-ticket shadow-[0_12px_24px_rgba(92,0,0,.28)]">
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
}

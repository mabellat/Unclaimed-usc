"use client";

import Link from "next/link";
import { capitalize, deadlinePill, money, stubFor } from "@/lib/ui";
import type { Claim, Resource } from "@/lib/types";

const PILL: Record<string, string> = {
  Drafted: "bg-[#FFF1C2] text-[#6B4E00]",
  Sent: "bg-ink text-white",
  "In review": "bg-ink text-white",
  Received: "bg-[#DCEFE1] text-[#14532D]",
};

/** One thing the student qualifies for: category, office, title, amount and where it stands. */
export function TicketCard({ resource, claim, index }: { resource: Resource; claim?: Claim; index: number }) {
  const cat = stubFor(resource.category);
  const value = resource.benefit?.value;
  const period = resource.benefit?.period;
  const dl = deadlinePill(resource.deadline);
  const pill = claim ? claim.stage : dl.text;
  const pillClass = claim ? PILL[claim.stage] ?? PILL.Received
    : dl.tone === "urgent" ? "bg-cardinal text-white" : dl.tone === "closed" ? "bg-[#ECECE6] text-muted" : "bg-[#F4F4F1] text-body";
  return (
    <Link
      href={`/ticket/${resource.id}`}
      aria-label={`${resource.title}. ${resource.benefit?.label ?? ""}. Open claim details.`}
      className="magic uin group relative mb-3.5 flex w-full flex-col overflow-hidden rounded-2xl border border-rule bg-white p-5 pt-6 text-left text-ink shadow-[0_1px_2px_rgba(0,0,0,.03),0_10px_30px_rgba(157,34,53,.05)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(157,34,53,.14)]"
      style={{ animationDelay: `${Math.min(index, 10) * 60}ms` }}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 origin-left transition-transform duration-300 group-hover:scale-y-[2]" style={{ background: cat.bg }} />
      <span className="relative mb-4 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap font-label text-[11px] font-medium uppercase tracking-[.1em] text-muted">
          <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: cat.bg }} />
          <span className="flex-none" style={{ color: ["#FFC72C", "#FFDF7A", "#E6A3B0", "#D9A400"].includes(cat.bg) ? "#7A5A00" : cat.bg }}>{cat.label}</span><span className="flex-none text-rule">/</span><span className="truncate normal-case tracking-normal">{resource.provider}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" className="flex-none text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
          <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="mb-1.5 font-display text-[19px] font-semibold leading-[1.2]">{resource.title}</span>
      <span className="mb-5 line-clamp-2 text-[13.5px] leading-[1.45] text-muted">{capitalize(resource.benefit?.label ?? "")}</span>
      <span className="mt-auto flex items-end justify-between gap-3 border-t border-rule pt-4">
        <span>
          <span className="block font-display text-[26px] font-bold leading-none">{value != null ? money(value) : <span className="inline-flex items-center gap-2 text-[17px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: cat.bg }} />{cat.word}</span>}</span>
          {value != null && period && period.length <= 18 && <span className="mt-1 block font-label text-[10.5px] uppercase tracking-[.08em] text-muted">per {period.replace(/^per /, "")}</span>}
        </span>
        <span className={`max-w-[200px] truncate rounded-full px-2.5 py-1 font-label text-[10.5px] font-medium uppercase tracking-[.06em] ${pillClass}`}>{pill}</span>
      </span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { capitalize, deadlinePill, money, stubFor } from "@/lib/ui";
import type { Claim, Resource } from "@/lib/types";

const PILL: Record<string, string> = {
  Drafted: "bg-[#FFE680] text-ink",
  Sent: "bg-ink text-gold",
  "In review": "bg-ink text-gold",
  Received: "bg-cardinal text-ticket",
};

/** A perforated ticket with a coloured category stub. */
export function TicketCard({ resource, claim, index }: { resource: Resource; claim?: Claim; index: number }) {
  const stub = stubFor(resource.category);
  const value = resource.benefit?.value;
  const period = resource.benefit?.period;
  const dl = deadlinePill(resource.deadline);
  const pill = claim ? claim.stage : dl.text;
  const pillClass = claim ? PILL[claim.stage] ?? PILL.Received
    : dl.tone === "urgent" ? "bg-cardinal font-semibold text-ticket" : dl.tone === "closed" ? "bg-[#E6D9BD] font-medium text-muted" : "bg-[#F0E4C8] font-medium text-ink";
  return (
    <Link
      href={`/ticket/${resource.id}`}
      aria-label={`${resource.title}. ${resource.benefit?.label ?? ""}. Open claim details.`}
      className="uin relative mb-3.5 flex w-full rounded-[10px] bg-ticket text-left text-ink shadow-[0_1px_0_#D8CDB8,0_8px_16px_rgba(60,20,10,.10)]"
      style={{ animationDelay: `${Math.min(index, 10) * 70}ms` }}
    >
      <span className="box-border flex w-[92px] flex-none flex-col items-center justify-center rounded-l-[10px] px-2 py-2.5 text-center" style={{ background: stub.bg, color: stub.fg }}>
        <span className="font-label text-[10.5px] tracking-[.18em]">{stub.label}</span>
        <span className="mt-1.5 font-label text-2xl font-semibold leading-[1.1]">{value != null ? money(value) : stub.word}</span>
        <span className="mt-0.5 min-h-[14px] text-[11px] font-medium leading-tight">{value != null && period && period.length <= 18 ? `per ${period.replace(/^per /, "")}` : ""}</span>
      </span>
      <span aria-hidden="true" className="absolute -top-2 left-[84px] h-4 w-4 rounded-full bg-paper" />
      <span aria-hidden="true" className="absolute -bottom-2 left-[84px] h-4 w-4 rounded-full bg-paper" />
      <span aria-hidden="true" className="my-3 block w-0 border-l-2 border-dashed border-rule" />
      <span className="flex min-w-0 flex-1 flex-col pb-3 pl-3.5 pr-4 pt-3.5">
        <span className="mb-1 font-label text-[11px] uppercase tracking-[.14em] text-cardinal">{resource.provider}</span>
        <span className="mb-1 font-display text-lg font-bold leading-[1.15]">{resource.title}</span>
        <span className="mb-2.5 line-clamp-2 text-[13px] leading-[1.35] text-body">{capitalize(resource.benefit?.label ?? "")}</span>
        <span className="mt-auto flex items-center justify-between gap-2">
          <span className={`max-w-[190px] truncate rounded px-2 py-[3px] text-xs ${pillClass}`}>{pill}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="flex-none">
            <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="#990000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

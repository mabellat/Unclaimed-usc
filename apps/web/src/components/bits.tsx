"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Kicker({ children, className = "text-muted" }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-label text-[11.5px] font-medium uppercase tracking-[.12em] ${className}`}>{children}</div>;
}

export function Note({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-center text-[11.5px] leading-normal text-muted ${className}`}>{children}</p>;
}

export function Check({ color = "currentColor", size = 16, width = 2.2 }: { color?: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="flex-none">
      <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackButton({ href, label = "Back", light = false }: { href?: string; label?: string; light?: boolean }) {
  const router = useRouter();
  const cls = `relative inline-flex min-h-[44px] items-center gap-1.5 bg-transparent pr-3 text-[15px] font-medium ${light ? "text-[#E5E5E0] hover:text-white" : "text-muted hover:text-ink"}`;
  const icon = (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (href) return <Link href={href} className={cls} aria-label={label}>{icon}{label}</Link>;
  return <button type="button" onClick={() => router.back()} className={cls} aria-label={label}>{icon}{label}</button>;
}

export function chipClass(on: boolean) {
  return `inline-flex min-h-[44px] items-center gap-[7px] rounded-full px-4 text-sm font-medium border transition-colors ${
    on ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:border-ink"
  }`;
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={chipClass(on)}>
      {on && <Check />}
      {children}
    </button>
  );
}

export const primaryBtn = "w-full min-h-[54px] rounded-full bg-ink text-base font-semibold text-white transition-colors hover:bg-[#2A2A2A] disabled:opacity-60";
export const outlineBtn = "w-full min-h-[46px] rounded-full border border-rule bg-white text-[15px] font-semibold text-ink transition-colors hover:border-ink";

/** The four-stop claim progress track. */
export function Track({ index, labels = ["Drafted", "Sent", "In review", "Received"] }: { index: number; labels?: string[] }) {
  return (
    <span className="flex">
      {labels.map((l, i) => {
        const done = i < index, cur = i === index;
        return (
          <span key={l} className="relative flex flex-1 flex-col items-center gap-2">
            <span className="absolute top-[6px] h-[2px]" style={{ left: i === 0 ? "50%" : 0, right: i === labels.length - 1 ? "50%" : 0, background: i < labels.length - 1 && done ? "#111111" : "#E4E4DE" }} />
            <span className={`relative box-border h-[14px] w-[14px] rounded-full ${cur ? "border-[3px] border-ink bg-gold" : done ? "bg-ink" : "border-2 border-sand bg-white"}`} />
            <span className={`font-label text-[10.5px] uppercase tracking-[.08em] ${done || cur ? "text-ink" : "text-muted"}`}>{l}</span>
          </span>
        );
      })}
    </span>
  );
}

export function Loading({ dark = false }: { dark?: boolean }) {
  return <div className={`upulse p-8 text-center font-label tracking-[.16em] ${dark ? "text-gold" : "text-cardinal"}`}>LOADING</div>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="m-5 rounded-2xl border border-cardinal bg-white p-4 text-sm">
      <b>Something went wrong.</b> {message}
    </div>
  );
}

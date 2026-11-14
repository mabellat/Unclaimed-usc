"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NOTE } from "@/lib/ui";

export function Rings({ size, className, opacity = 0.22, radii }: { size: number; className?: string; opacity?: number; radii: number[] }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={`pointer-events-none absolute ${className ?? ""}`}>
      <g fill="none" stroke="#FFCC00" strokeOpacity={opacity} strokeWidth="2">
        {radii.map((r) => <circle key={r} cx={c} cy={c} r={r} />)}
      </g>
    </svg>
  );
}

/** Scalloped bottom edge under a coloured header. */
export function Scallop({ color }: { color: string }) {
  const id = `sc-${color.slice(1)}`;
  return (
    <svg width="100%" height="13" aria-hidden="true" className="block flex-none">
      <defs>
        <pattern id={id} width="26" height="13" patternUnits="userSpaceOnUse">
          <circle cx="13" cy="0" r="13" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="13" fill={`url(#${id})`} />
    </svg>
  );
}

export function Kicker({ children, className = "text-cardinal" }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-label text-[13px] uppercase tracking-[.16em] ${className}`}>{children}</div>;
}

export function Note({ children = NOTE, className = "" }: { children?: React.ReactNode; className?: string }) {
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
  const cls = `relative inline-flex min-h-[44px] items-center gap-1.5 bg-transparent pr-3 text-[15px] ${light ? "text-[#FFE9D6]" : "text-muted"}`;
  const icon = (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (href) return <Link href={href} className={cls} aria-label={label}>{icon}{label}</Link>;
  return <button type="button" onClick={() => router.back()} className={cls} aria-label={label}>{icon}{label}</button>;
}

export function chipClass(on: boolean) {
  return `inline-flex min-h-[44px] items-center gap-[7px] rounded-[22px] px-3.5 text-sm font-medium border-[1.5px] ${
    on ? "border-cardinal bg-cardinal text-ticket" : "border-sand bg-ticket text-ink"
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

export const primaryBtn = "w-full min-h-[54px] rounded-xl bg-cardinal text-[17px] font-semibold text-ticket shadow-[0_4px_0_#5C0000] disabled:opacity-60";
export const outlineBtn = "w-full min-h-[46px] rounded-xl border-2 border-ink bg-ticket text-[15px] font-semibold text-ink";

/** The four-stop claim progress track. */
export function Track({ index, labels = ["Drafted", "Sent", "In review", "Received"] }: { index: number; labels?: string[] }) {
  return (
    <span className="flex">
      {labels.map((l, i) => {
        const done = i < index, cur = i === index;
        return (
          <span key={l} className="relative flex flex-1 flex-col items-center gap-1.5">
            <span className="absolute top-[10px] h-[3px]" style={{ left: i === 0 ? "50%" : 0, right: i === labels.length - 1 ? "50%" : 0, background: i < labels.length - 1 && done ? "#990000" : "#D8CDB8" }} />
            <span className={`relative box-border h-[22px] w-[22px] rounded-full ${cur ? "border-[3px] border-cardinal bg-gold" : done ? "border-[3px] border-cardinal bg-cardinal" : "border-2 border-sand bg-ticket"}`} />
            <span className={`text-[11.5px] font-medium ${done || cur ? "text-ink" : "text-[#6B5F58]"}`}>{l}</span>
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
    <div role="alert" className="m-5 rounded-xl border-2 border-cardinal bg-ticket p-4 text-sm">
      <b>Something went wrong.</b> {message}
    </div>
  );
}

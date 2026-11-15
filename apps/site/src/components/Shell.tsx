"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shortLabel } from "@/lib/ui";
import { useStudent } from "@/lib/student";
import { SCMark } from "@/components/SCMark";
import { Skyline } from "./Skyline";

/** Page width used by every desktop screen. */
export const WRAP = "mx-auto w-full max-w-[1200px] px-5 md:px-8 lg:px-10";

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex min-h-[44px] items-center gap-2.5" aria-label="Unclaimed home">
      <SCMark height={30} />
      <span className={`font-display text-[26px] font-bold tracking-[-0.03em] ${light ? "text-ticket" : "text-ink"}`}>Unclaimed<span className="text-gold">.</span></span>
    </Link>
  );
}

const LINKS: [string, string, string][] = [
  ["/wallet", "Wallet", "M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM10 7v10"],
  ["/claims", "Claims", "M9 4h6l1 2h3v14H5V6h3zM9 13l2 2 4-4"],
  ["/ask", "Ask", "M4 5h16v11H10l-5 4v-4H4z"],
  ["/alerts", "Alerts", "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"],
];

/** The sticky top bar on every signed-in screen. */
export function TopNav({ unseen = 0 }: { unseen?: number }) {
  const path = usePathname();
  const { card, fields } = useStudent();
  const level = card?.facts.level as string | undefined;
  const who = level ? shortLabel(fields.level?.labels?.[level] ?? level) : "My card";
  const active = (href: string) => path === href || (href === "/wallet" && path.startsWith("/ticket"));
  return (
    <nav aria-label="Main" className="sticky top-0 z-30 border-b-2 border-gold bg-ink">
      <div className={`${WRAP} flex items-center gap-4 py-2`}>
        <Logo />
        <div className="mx-auto flex items-center gap-1 overflow-x-auto">
          {LINKS.map(([href, label, icon]) => {
            const on = active(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined} aria-label={label + (href === "/alerts" && unseen ? `, ${unseen} new` : "")}
                className={`relative inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors ${on ? "bg-gold text-ink" : "text-[#D9CFC4] hover:bg-[#2B201C] hover:text-ticket"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
                <span className="hidden sm:inline">{label}</span>
                {href === "/alerts" && unseen > 0 && !on && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-ink">{unseen}</span>
                )}
              </Link>
            );
          })}
        </div>
        <Link href="/card" aria-current={path === "/card" ? "page" : undefined}
          className={`hidden min-h-[44px] items-center gap-2.5 rounded-full border-2 py-1 pl-1.5 pr-4 md:inline-flex ${path === "/card" ? "border-gold bg-gold text-ink" : "border-[#4A3A33] text-ticket hover:border-gold"}`}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cardinal">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#BDE6D9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4zM8 11h5M8 14h8" /></svg>
          </span>
          <span className="text-sm font-semibold">{who}</span>
        </Link>
      </div>
    </nav>
  );
}

export function Footer({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={dark ? "bg-ink text-[#C9BFB4]" : "border-t border-rule text-muted"}>
      <div className={`${WRAP} flex flex-col items-center justify-between gap-3 py-7 md:flex-row`}>
        <Logo light={dark} />
        <p className="text-center text-[13px] leading-normal md:text-right">Find what's yours.</p>
      </div>
    </footer>
  );
}

/** A coloured page band with rings and a scalloped edge, used as each screen's header. */
export function Band({ children, color = "#183F3B" }: { children: React.ReactNode; color?: string }) {
  return (
    <>
      <header className="relative overflow-hidden text-ticket" style={{ background: color }}>
        <Skyline className="absolute bottom-0 left-0 h-[210px] w-full" opacity={0.16} />
        <svg width="560" height="560" viewBox="0 0 560 560" aria-hidden="true" className="ripple pointer-events-none absolute -right-[160px] -top-[260px]">
          <g fill="none" stroke="#BDE6D9" strokeOpacity="0.16" strokeWidth="2">
            {[70, 120, 170, 220, 270].map((r, i) => <circle key={r} cx="280" cy="280" r={r} style={{ animationDelay: `${-i * 1.8}s` }} />)}
          </g>
        </svg>
        <div className={`${WRAP} relative py-10`}>{children}</div>
      </header>
      <svg width="100%" height="13" aria-hidden="true" className="block">
        <defs>
          <pattern id={`band-${color.slice(1)}`} width="26" height="13" patternUnits="userSpaceOnUse"><circle cx="13" cy="0" r="13" fill={color} /></pattern>
        </defs>
        <rect width="100%" height="13" fill={`url(#band-${color.slice(1)})`} />
      </svg>
    </>
  );
}

/** A white panel with a small red label, the building block of every desktop screen. */
export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-ticket p-6 shadow-[0_1px_0_#D9E3DD,0_10px_24px_rgba(60,20,10,.06)] ${className}`}>
      {title && <h2 className="mb-4 font-label text-[13px] font-normal uppercase tracking-[.16em] text-cardinal">{title}</h2>}
      {children}
    </section>
  );
}

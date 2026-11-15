"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shortLabel } from "@/lib/ui";
import { useStudent } from "@/lib/student";
import { SCMark } from "@/components/SCMark";
import { Spotlight } from "./Motion";

/** Page width used by every desktop screen. */
export const WRAP = "mx-auto w-full max-w-[1200px] px-5 md:px-8 lg:px-10";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex min-h-[44px] items-center gap-2.5" aria-label="Unclaimed home">
      <SCMark height={26} />
      <span className={`font-display text-[22px] font-bold tracking-[-0.04em] ${light ? "text-white" : "text-ink"}`}>unclaimed<span className="text-cardinal">.</span></span>
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
  const schools = (card?.facts.schools as string[] | undefined) ?? [];
  // A short line under "My card" so students see what the wallet is based on, e.g. "Master's · Viterbi".
  const who = [level && shortLabel(fields.level?.labels?.[level] ?? level), ...schools.map((s) => shortLabel(fields.schools?.labels?.[s] ?? s))]
    .filter(Boolean).join(" · ") || "Add your details";
  const active = (href: string) => path === href || (href === "/wallet" && path.startsWith("/ticket"));
  return (
    <nav aria-label="Main" className="sticky top-0 z-30 border-b border-rule bg-white/85 backdrop-blur-md">
      <div className={`${WRAP} flex items-center gap-4 py-2`}>
        <Logo />
        <div className="mx-auto flex items-center gap-1 overflow-x-auto">
          {LINKS.map(([href, label, icon]) => {
            const on = active(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined} aria-label={label + (href === "/alerts" && unseen ? `, ${unseen} new` : "")}
                className={`relative inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-[14.5px] font-medium transition-colors ${on ? "bg-ink text-white" : "text-muted hover:bg-[#F0F0EC] hover:text-ink"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
                <span className="hidden sm:inline">{label}</span>
                {href === "/alerts" && unseen > 0 && !on && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cardinal px-1.5 font-label text-[10.5px] font-semibold text-white">{unseen}</span>
                )}
              </Link>
            );
          })}
        </div>
        <Link href="/card" aria-current={path === "/card" ? "page" : undefined}
          className={`hidden min-h-[44px] items-center gap-2.5 rounded-full border py-1 pl-1 pr-4 transition-colors md:inline-flex ${path === "/card" ? "border-ink bg-ink text-white" : "border-rule text-ink hover:border-ink"}`}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink ring-2 ring-white">
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#FFC72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4zM8 11h5M8 14h8" /></svg>
          </span>
          <span className="flex max-w-[180px] flex-col leading-tight">
            <span className="text-sm font-semibold">My card</span>
            <span className={`truncate text-xs ${path === "/card" ? "text-white/60" : "text-muted"}`}>{who}</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}

export function Footer({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={dark ? "bg-ink text-white/50" : "border-t border-rule bg-white text-muted"}>
      <div className={`${WRAP} flex flex-col items-center justify-between gap-3 py-8 md:flex-row`}>
        <Logo light={dark} />
        <p className="flex flex-col items-center gap-1 font-label text-[11.5px] uppercase tracking-[.12em] md:items-end">
          <span>Find what's yours</span>
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
            Made with
            <svg width="13" height="13" viewBox="0 0 24 24" aria-label="love" role="img" className="text-cardinal"><path d="M12 21s-7.5-4.6-9.7-9.3C.6 8 2.6 4 6.4 4c2.2 0 3.7 1.2 4.6 2.6l1 1.5 1-1.5C13.9 5.2 15.4 4 17.6 4c3.8 0 5.8 4 4.1 7.7C19.5 16.4 12 21 12 21z" fill="currentColor" /></svg>
            by Bellatti
          </span>
        </p>
      </div>
    </footer>
  );
}

/** Each screen's header: a black panel set into the page, with soft colour glows and a light that follows the cursor. */
export function Band({ children }: { children: React.ReactNode; color?: string }) {
  return (
    <div className={`${WRAP} pt-6`}>
      <Spotlight className="overflow-hidden rounded-[28px] bg-ink text-white">
        <div aria-hidden="true" className="blob -right-24 -top-48 h-[380px] w-[380px] bg-cardinal opacity-60" />
        <div aria-hidden="true" className="blob -bottom-52 right-1/3 h-[300px] w-[300px] bg-gold opacity-20" style={{ animationDelay: "-7s" }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,transparent,#000)]" />
        <header className="px-7 py-9 md:px-10 md:py-11">{children}</header>
      </Spotlight>
    </div>
  );
}

/** A white panel with a small label, the building block of every desktop screen. */
export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative rounded-2xl border border-rule bg-white/90 p-6 shadow-[0_1px_2px_rgba(0,0,0,.03),0_10px_30px_rgba(157,34,53,.05)] backdrop-blur-sm ${className}`}>
      {title && <h2 className="mb-4 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-muted">{title}</h2>}
      {children}
    </section>
  );
}

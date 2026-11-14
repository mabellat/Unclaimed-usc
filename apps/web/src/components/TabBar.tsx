"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: [string, string, string][] = [
  ["/wallet", "Wallet", "M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM10 7v10"],
  ["/claims", "Claims", "M9 4h6l1 2h3v14H5V6h3zM9 13l2 2 4-4"],
  ["/ask", "Ask", "M4 5h16v11H10l-5 4v-4H4z"],
  ["/alerts", "Alerts", "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"],
  ["/card", "My card", "M4 6h16v12H4zM8 11h5M8 14h8M16 10h.01"],
];

export function TabBar({ badges = {} }: { badges?: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="safe-bottom sticky bottom-0 z-10 flex border-t border-rule bg-ticket px-1.5 pb-3.5 pt-1.5">
      {TABS.map(([href, label, icon]) => {
        const on = path === href;
        const badge = badges[href] ?? 0;
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} aria-label={label + (badge ? `, ${badge} new` : "")}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-[3px] rounded-lg ${on ? "bg-paper text-cardinal" : "text-muted"}`}>
            <span className="relative inline-flex">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
              {badge > 0 && !on && (
                <span className="absolute -right-2 -top-[5px] inline-flex h-4 min-w-[16px] items-center justify-center rounded-lg bg-gold px-[3px] text-[10.5px] font-semibold text-ink">{badge}</span>
              )}
            </span>
            <span className="text-[11.5px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

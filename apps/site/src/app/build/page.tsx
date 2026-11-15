"use client";

import BuildCard from "@/app/build/page";
import { Logo } from "@site/components/Shell";

export default function Build() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_560px]">
      <section className="relative hidden overflow-hidden bg-cardinal px-14 py-12 text-ticket lg:flex lg:flex-col">
        <svg width="720" height="720" viewBox="0 0 720 720" aria-hidden="true" className="pointer-events-none absolute -bottom-[320px] -left-[260px]">
          <g fill="none" stroke="#BDE6D9" strokeOpacity="0.18" strokeWidth="2">{[90, 150, 210, 270, 330].map((r) => <circle key={r} cx="360" cy="360" r={r} />)}</g>
        </svg>
        <Logo />
        <div className="relative my-auto max-w-[520px]">
          <div className="mb-3 font-label text-[13px] uppercase tracking-[.16em] text-gold">Build your Trojan card</div>
          <h1 className="font-display text-[56px] font-bold leading-[1.02] tracking-[-0.02em]">Three questions. <span className="italic text-gold">Then we do the looking.</span></h1>
        </div>
      </section>
      <div className="mx-auto w-full max-w-[560px] bg-paper lg:border-l lg:border-rule">
        <BuildCard />
      </div>
    </div>
  );
}

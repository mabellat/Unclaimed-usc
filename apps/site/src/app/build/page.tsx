"use client";

import BuildCard from "@/app/build/page";
import { Logo } from "@site/components/Shell";

export default function Build() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_560px]">
      <section className="relative hidden overflow-hidden bg-ink px-14 py-12 text-white lg:flex lg:flex-col">
        <svg width="720" height="720" viewBox="0 0 720 720" aria-hidden="true" className="pointer-events-none absolute -bottom-[320px] -left-[260px]">
          <g fill="none" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="1">{[150, 290].map((r) => <circle key={r} cx="360" cy="360" r={r} />)}</g>
        </svg>
        <Logo light />
        <div className="relative my-auto max-w-[520px]">
          <div className="mb-3 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-white/60">Build your Trojan card</div>
          <h1 className="font-display text-[60px] font-extrabold leading-[.98] tracking-[-0.045em]">Three questions. <span className="text-white/45">Then we do the looking.</span></h1>
        </div>
      </section>
      <div className="mx-auto w-full max-w-[560px] bg-paper lg:border-l lg:border-rule">
        <BuildCard />
      </div>
    </div>
  );
}

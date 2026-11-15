"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import type { Persona } from "@/lib/types";
import { MARCUS, Person, PRIYA, SOFIA, WEI, type Look } from "@site/app/tour/people";
import { Reveal, useInView } from "@site/components/Motion";
import { WRAP } from "@site/components/Shell";

// The demo students shown on the landing page, in this order, each drawn as in the tour.
const LOOKS: Record<string, { look: Look; tint: string }> = {
  marcus: { look: MARCUS, tint: "#F6D5D9" },
  wei: { look: WEI, tint: "#E5E5E0" },
  sofia: { look: SOFIA, tint: "#FFE9A8" },
  priya: { look: PRIYA, tint: "#F1E4CC" },
};

/** A clock that runs only while the section is on screen, so the people breathe and blink. */
function useClock(on: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => { setT(now - start); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return t;
}

export function TryAStudent() {
  const router = useRouter();
  const { card, start } = useStudent();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>();
  const t = useClock(inView);

  useEffect(() => {
    api.personas()
      .then((r) => setPersonas(Object.keys(LOOKS).map((id) => r.personas.find((p) => p.id === id)).filter((p): p is Persona => !!p)))
      .catch(() => setPersonas([]));
  }, []);

  async function tryAs(p: Persona) {
    setBusy(p.id);
    setProblem(null);
    try {
      // Same API as a hand-built card; the persona id only links the card to its demo runs.
      await start(p.facts, p.needs, p.id);
      router.push("/scan");
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not open that student");
      setBusy(null);
    }
  }

  if (personas.length === 0) return null;
  return (
    <section id="try" className="scroll-mt-4">
      <div className={`${WRAP} pb-28`}>
        <Reveal>
          <div className="mb-4 font-label text-[11.5px] font-medium uppercase tracking-[.12em] text-muted">Try it out</div>
          <h2 className="mb-4 max-w-[820px] font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] md:text-[56px]">Step into a student's shoes <span className="text-sheen">first.</span></h2>
          <p className="mb-12 max-w-[620px] text-[17px] leading-relaxed text-muted">Pick a student and see their wallet in seconds. {card ? "This swaps out the card you have now; you can build yours again anytime." : "Build your own card whenever you're ready."}</p>
        </Reveal>
        <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => {
            const { look, tint } = LOOKS[p.id];
            const on = hover === p.id || busy === p.id;
            return (
              <button key={p.id} type="button" onClick={() => tryAs(p)} disabled={busy !== null}
                onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(p.id)} onBlur={() => setHover(null)}
                className="group flex flex-col overflow-hidden rounded-[24px] border border-rule bg-white text-left transition-transform hover:-translate-y-1 disabled:opacity-70">
                <div className="relative h-[210px] w-full overflow-hidden" style={{ background: tint }} aria-hidden="true">
                  <div className="absolute bottom-1 left-1/2">
                    <Person t={t} x={0} y={0} scale={0.55} {...look} pose={on ? "wave" : "idle"} mood={on ? "grin" : "happy"} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="font-display text-[24px] font-bold tracking-[-0.02em]">{p.name}</div>
                  <p className="mt-1.5 flex-1 text-[14.5px] leading-snug text-muted">{p.summary}</p>
                  <span className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-semibold text-cardinal">
                    {busy === p.id ? "Opening..." : `Try as ${p.name}`}
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {problem && <p role="alert" className="mt-6 rounded-xl border border-cardinal bg-white p-3 text-sm">Can't reach the Unclaimed API: {problem}</p>}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Rings } from "@/components/bits";
import { SCMark } from "@/components/SCMark";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import type { Persona } from "@/lib/types";

// Decorative tickets. Each one is an approved record, shown with its approved title and amount.
const FLOATERS = [
  { r: "-9deg", left: 22, top: 34, delay: "0s", stub: ["#FFCC00", "#1A1210"], cat: "CASH", big: "$1,000", provider: "CAMPUS SUPPORT", title: "CSI Emergency Loan" },
  { r: "6deg", left: 150, top: 86, delay: "-1.6s", stub: ["#1A1210", "#FFCC00"], cat: "LEGAL", big: "HELP", provider: "USG AND GSG", title: "Free legal counseling" },
  { r: "-4deg", left: 42, top: 150, delay: "-3.2s", stub: ["#F1C6C0", "#5C0000"], cat: "SCHOLAR", big: "$3,000", provider: "DORNSIFE", title: "SURF / SHURE research" },
];
const MARQUEE = "EMERGENCY LOANS · LEGAL HELP · TRAVEL AWARDS · RESEARCH FELLOWSHIPS · LAPTOP LOANS · FOOD PANTRY · RESUME REVIEW · ";

export default function Welcome() {
  const router = useRouter();
  const { card, start, error } = useStudent();
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[] | null>(null);

  async function showPersonas() {
    setProblem(null);
    try {
      setPersonas((await api.personas()).personas);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not load the demo students");
    }
  }

  async function loadDemo(p: Persona) {
    setLoading(true);
    setProblem(null);
    try {
      // Same API as a hand-built card; the persona id only links the card to its cached demo runs.
      await start(p.facts, p.needs, p.id);
      router.push("/scan");
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not load the demo student");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-cardinal text-ticket">
      <Rings size={520} radii={[60, 100, 140, 180, 220]} className="-right-[230px] -top-[150px]" />
      <div className="relative px-[26px] pt-[30px]">
        <div className="mb-[18px] flex items-center gap-2.5">
          <SCMark height={30} />
          <span className="font-label text-[13px] uppercase tracking-[.2em] text-gold">For USC students</span>
        </div>
        <h1 className="m-0 font-display text-[68px] font-bold leading-[.95] tracking-[-0.035em]">Unclaimed<span className="text-gold">.</span></h1>
      </div>

      <div className="relative mt-1.5 h-[250px]" aria-hidden="true">
        {FLOATERS.map((f) => (
          <div key={f.title} className="ufloat absolute flex h-[92px] w-[196px] overflow-hidden rounded-lg shadow-[0_12px_20px_rgba(0,0,0,.3)]"
            style={{ left: f.left, top: f.top, transform: `rotate(${f.r})`, animationDelay: f.delay, ["--r" as string]: f.r }}>
            <div className="flex w-[68px] flex-col items-center justify-center" style={{ background: f.stub[0], color: f.stub[1] }}>
              <span className="font-label text-[10px] tracking-[.14em]">{f.cat}</span>
              <span className="font-label text-[22px] font-semibold">{f.big}</span>
            </div>
            <div className="flex-1 bg-ticket p-3 text-ink">
              <div className="font-label text-[10px] tracking-[.12em] text-cardinal">{f.provider}</div>
              <div className="mt-1 font-display text-[15px] font-bold leading-[1.1]">{f.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="-mx-5 -rotate-3 overflow-hidden border-y-2 border-ink bg-gold text-ink" aria-hidden="true">
        <div className="umarq">
          {[0, 1].map((i) => <span key={i} className="whitespace-nowrap py-[9px] font-label text-[17px] font-semibold tracking-[.12em]">{MARQUEE}</span>)}
        </div>
      </div>

      <div className="flex-1" />
      <div className="relative px-[26px] pb-[22px] pt-6">
        <h2 className="mb-2 font-display text-[25px] font-medium leading-[1.15] tracking-[-0.01em]">USC has set money and help aside. <span className="italic text-gold">Some of it is yours.</span></h2>
        <p className="mb-4 text-[14.5px] leading-normal text-blush">Build your card once. We match you to every fund, clinic and service you qualify for, then an AI agent does the paperwork.</p>
        {(error || problem) && <p role="alert" className="mb-3 rounded-lg bg-cardinal-dark p-3 text-sm">Can't reach the Unclaimed API: {problem ?? error}</p>}
        {card ? (
          <Link href="/wallet" className="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-gold text-[17px] font-semibold text-ink shadow-[0_4px_0_#5C0000]">Open my wallet</Link>
        ) : (
          <Link href="/build" className="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-gold text-[17px] font-semibold text-ink shadow-[0_4px_0_#5C0000]">Build my Trojan card</Link>
        )}
        {personas ? (
          <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Demo students">
            {personas.map((p) => (
              <button key={p.id} type="button" onClick={() => loadDemo(p)} disabled={loading}
                className="min-h-[44px] w-full rounded-xl border-2 border-gold bg-transparent px-3.5 py-2 text-left disabled:opacity-60">
                <span className="block font-display text-[17px] font-bold text-gold">{p.name}</span>
                <span className="block text-[13px] leading-snug text-[#FFE9D6]">{p.summary}</span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={showPersonas} className="mt-1.5 min-h-[44px] w-full text-sm font-medium text-[#FFE9D6] underline">
            Skip: load a demo student
          </button>
        )}
      </div>
    </main>
  );
}

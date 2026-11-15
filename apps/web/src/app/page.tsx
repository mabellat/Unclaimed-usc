"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SCMark } from "@/components/SCMark";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import type { Persona } from "@/lib/types";

// Approved examples shown as a quiet list in the welcome screen.
const FLOATERS = [
  { cat: "CASH", big: "$1,000", provider: "CAMPUS SUPPORT", title: "CSI Emergency Loan" },
  { cat: "LEGAL", big: "HELP", provider: "USG AND GSG", title: "Free legal counseling" },
  { cat: "SCHOLAR", big: "$3,000", provider: "DORNSIFE", title: "SURF / SHURE research" },
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
      <div className="relative px-[26px] pt-[30px]">
        <div className="mb-[18px] flex items-center gap-2.5">
          <SCMark height={30} />
          <span className="font-label text-[13px] uppercase tracking-[.2em] text-gold">For USC students</span>
        </div>
        <h1 className="m-0 font-display text-[68px] font-bold leading-[.95] tracking-[-0.035em]">Unclaimed<span className="text-gold">.</span></h1>
      </div>

      <div className="relative mx-[26px] mt-8 grid gap-2" aria-hidden="true">
        {FLOATERS.map((f) => (
          <div key={f.title} className="flex min-h-[63px] items-center gap-3 rounded-lg border border-ticket/20 bg-ticket/5 px-3.5 py-2.5">
            <div className="w-[72px] flex-none border-r border-ticket/20 pr-2 text-center text-gold">
              <span className="block font-label text-[9px] tracking-[.14em]">{f.cat}</span>
              <span className="block font-label text-[17px] font-semibold">{f.big}</span>
            </div>
            <div className="min-w-0">
              <div className="font-label text-[9px] tracking-[.12em] text-gold">{f.provider}</div>
              <div className="mt-1 font-display text-[14px] font-semibold leading-[1.1]">{f.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 overflow-hidden border-y border-ticket/20 px-[26px] text-gold" aria-hidden="true">
        <span className="block truncate py-2.5 font-label text-[11px] tracking-[.12em]">{MARQUEE}</span>
      </div>

      <div className="flex-1" />
      <div className="relative px-[26px] pb-[22px] pt-6">
        <h2 className="mb-2 font-display text-[25px] font-medium leading-[1.15] tracking-[-0.01em]">USC has set money and help aside. <span className="italic text-gold">Some of it is yours.</span></h2>
        <p className="mb-4 text-[14.5px] leading-normal text-blush">Build your card once. We match you to every fund, clinic and service you qualify for, then an AI agent does the paperwork.</p>
        {(error || problem) && <p role="alert" className="mb-3 rounded-lg bg-cardinal-dark p-3 text-sm">Can't reach the Unclaimed API: {problem ?? error}</p>}
        {card ? (
          <Link href="/wallet" className="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-gold text-[17px] font-semibold text-ink shadow-[0_4px_0_#183F3B]">Open my wallet</Link>
        ) : (
          <Link href="/build" className="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-gold text-[17px] font-semibold text-ink shadow-[0_4px_0_#183F3B]">Build my Trojan card</Link>
        )}
        {personas ? (
          <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Demo students">
            {personas.map((p) => (
              <button key={p.id} type="button" onClick={() => loadDemo(p)} disabled={loading}
                className="min-h-[44px] w-full rounded-xl border-2 border-gold bg-transparent px-3.5 py-2 text-left disabled:opacity-60">
                <span className="block font-display text-[17px] font-bold text-gold">{p.name}</span>
                <span className="block text-[13px] leading-snug text-[#E5F2EB]">{p.summary}</span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={showPersonas} className="mt-1.5 min-h-[44px] w-full text-sm font-medium text-[#E5F2EB] underline">
            Skip: load a demo student
          </button>
        )}
      </div>
    </main>
  );
}

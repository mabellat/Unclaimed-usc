"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Note, Scallop } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";
import type { Persona } from "@/lib/types";

export default function Welcome() {
  const router = useRouter();
  const { ready, card, start, error } = useStudent();
  const [loading, setLoading] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  async function toggleDemo() {
    setShowDemo(!showDemo);
    if (personas || showDemo) return;
    setLoadingPersonas(true);
    setProblem(null);
    try {
      setPersonas((await api.personas()).personas);
    } catch {
      setProblem("Demo students couldn't load. Close this section and try again.");
    } finally {
      setLoadingPersonas(false);
    }
  }

  async function loadDemo(p: Persona) {
    setLoading(true);
    setProblem(null);
    try {
      await start(p.facts, p.needs, p.id);
      router.push("/wallet");
    } catch {
      setProblem("We couldn't load this student. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="bg-cardinal px-6 pb-8 pt-8 text-ticket sm:px-8">
        <p className="mb-5 font-label text-xs uppercase tracking-[.18em] text-gold">For USC students</p>
        <h1 className="font-display text-[clamp(3rem,13vw,4.25rem)] font-bold leading-none tracking-[-.035em]">Unclaimed<span className="text-gold">.</span></h1>
      </header>
      <Scallop color="#990000" />

      <div className="flex flex-1 flex-col px-6 pb-6 pt-9 sm:px-8">
        <h2 className="max-w-sm font-display text-4xl font-medium leading-[1.12] tracking-[-.025em]">Find support.<br /><span className="text-cardinal">Take the next step.</span></h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">Explore USC funds, scholarships and services that fit your situation. Get help preparing the paperwork.</p>

        <ol className="my-8 divide-y divide-dashed divide-rule rounded-xl border border-rule bg-ticket px-5" aria-label="How it works">
          {[
            ["Build your card", "Share what you're studying and what you need."],
            ["Explore your matches", "See why each resource fits your answers."],
            ["Prepare your application", "Get a checklist and draft. You review and send."],
          ].map(([title, detail], i) => (
            <li key={title} className="flex gap-4 py-4">
              <span className="font-label text-lg text-cardinal" aria-hidden="true">0{i + 1}</span>
              <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p></div>
            </li>
          ))}
        </ol>

        <div className="mt-auto">
          {(error || problem) && <p role="alert" className="mb-4 rounded-lg border border-rule bg-ticket p-3 text-sm text-cardinal">{problem ?? "We couldn't connect. Please refresh to try again."}</p>}
          {ready ? (
            <Link href={card ? "/wallet" : "/build"} className="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-cardinal px-4 text-base font-semibold text-ticket">
              {card ? "Open my wallet" : "Find my matches"}
            </Link>
          ) : <p role="status" className="py-4 text-center text-sm text-muted">Getting things ready…</p>}
          <p className="mt-3 text-center text-xs leading-relaxed text-muted">No USC login needed. Skip any question.</p>
          <button type="button" onClick={toggleDemo} disabled={loading || loadingPersonas} aria-expanded={showDemo} aria-controls="demo-students" className="mt-3 min-h-[44px] w-full text-sm font-medium text-cardinal underline underline-offset-4 disabled:opacity-60">
            {loadingPersonas ? "Loading demo students…" : showDemo ? "Hide demo students" : "Try a demo student"}
          </button>
          {showDemo && <div id="demo-students" className="mt-2 flex flex-col gap-2" role="group" aria-label="Demo students" aria-busy={loading}>
            {personas?.map((p) => (
              <button key={p.id} type="button" onClick={() => loadDemo(p)} disabled={loading} className="min-h-[44px] rounded-xl border border-rule bg-ticket px-4 py-3 text-left disabled:opacity-60">
                <span className="block text-sm font-semibold">{p.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{p.summary}</span>
              </button>
            ))}
            {loading && <p role="status" className="text-sm text-muted">Finding this student's matches…</p>}
          </div>}
          <Note className="mt-5" />
        </div>
      </div>
    </main>
  );
}

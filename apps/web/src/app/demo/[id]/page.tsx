"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";

// Unlisted link for presenters: /demo/<persona id> loads that demo student and opens the scan.
// The personas live in docs/demo, not on the site.
export default function LoadDemo() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { start } = useStudent();
  const [problem, setProblem] = useState<string | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      const p = (await api.personas()).personas.find((x) => x.id === id);
      if (!p) throw new Error(`No demo student called "${id}"`);
      // Same API as a hand-built card; the persona id only links the card to its demo runs.
      await start(p.facts, p.needs, p.id);
      router.replace("/scan");
    })().catch((e) => setProblem(e instanceof Error ? e.message : "Could not load the demo student"));
  }, [id, start, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-cardinal-dark px-6 text-center text-ticket">
      {problem
        ? <p role="alert" className="max-w-[420px] text-[15px] leading-normal">{problem}</p>
        : <div className="upulse font-label tracking-[.16em] text-gold">LOADING</div>}
    </main>
  );
}

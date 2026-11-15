"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "@/components/bits";
import { useStudent } from "@/lib/student";

export default function Scan() {
  const router = useRouter();
  const { resources, match } = useStudent();
  const [step, setStep] = useState(0);
  const n = Object.keys(resources).length;
  const rows = [
    "Reading your Trojan card",
    `Checking ${n || "every"} approved funds, scholarships and services`,
    "Applying each office's eligibility rules",
    "Counting what is yours",
  ];

  useEffect(() => {
    if (step < rows.length) {
      const t = setTimeout(() => setStep(step + 1), 600);
      return () => clearTimeout(t);
    }
    if (match) {
      const t = setTimeout(() => router.replace("/wallet"), 250);
      return () => clearTimeout(t);
    }
  }, [step, match, router, rows.length]);

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-cardinal-dark px-9 text-ticket">
      <div className="mb-3 font-label text-[13px] uppercase tracking-[.16em] text-gold">Checking the rules</div>
      <h1 className="mb-[30px] font-display text-[32px] font-bold leading-[1.1] tracking-[-0.01em]">Matching you against each office's approved rules.</h1>
      <ol className="flex flex-col gap-4" aria-live="polite">
        {rows.map((label, i) => {
          const done = step > i, cur = step === i;
          return (
            <li key={label} className={`flex items-center gap-3.5 text-base ${done || cur ? "text-ticket" : "text-[#C9A99A]"}`}>
              <span className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-full ${done ? "bg-gold" : cur ? "border-2 border-gold" : "border-2 border-[#8A4A44]"}`}>
                {done && <Check color="#183F3B" size={14} width={2.4} />}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-[34px] text-[13px] leading-normal text-[#E9D3C0]">AI reads the source pages into drafts that a person approves. A plain rules engine makes the match, so every result comes with a reason.</p>
    </main>
  );
}

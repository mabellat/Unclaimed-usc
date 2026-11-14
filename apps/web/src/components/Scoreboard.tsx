"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/ui";

/** Animate a number toward its target, like the prototype's flip counter. */
export function useTicker(target: number) {
  const [shown, setShown] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      cur.current = target;
      setShown(target);
      return;
    }
    const iv = setInterval(() => {
      const d = target - cur.current;
      if (d === 0) return clearInterval(iv);
      const step = Math.max(1, Math.ceil(Math.abs(d) * 0.14));
      cur.current = d > 0 ? Math.min(target, cur.current + step) : Math.max(target, cur.current - step);
      setShown(cur.current);
    }, 40);
    return () => clearInterval(iv);
  }, [target]);
  return shown;
}

/** Gold flip-clock scoreboard. */
export function Scoreboard({ amount }: { amount: number }) {
  const shown = useTicker(amount);
  const text = money(shown);
  return (
    <div role="img" aria-label={`${money(amount)} in funds you qualify for`} className="relative mb-3 flex items-center gap-[5px]">
      {Array.from(text).map((c, i) =>
        /\d/.test(c) ? (
          <span key={i} className="flip inline-flex h-[52px] w-9 items-center justify-center rounded-md font-label text-[36px] font-semibold text-gold">{c}</span>
        ) : (
          <span key={i} className={`px-px font-label font-semibold text-gold ${c === "$" ? "text-[30px]" : "text-[34px]"}`}>{c}</span>
        ),
      )}
    </div>
  );
}

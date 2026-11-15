"use client";

import { useEffect, useRef, useState } from "react";

/** Adds "is-in" once the element scrolls into view (see .reveal in globals.css). */
export function useInView<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, margin]);
  return [ref, inView] as const;
}

/** Rises into view on scroll. `delay` staggers siblings. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: {
  children: React.ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li";
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <Tag ref={ref as React.Ref<never>} className={`reveal ${inView ? "is-in" : ""} ${className}`} style={{ ["--d" as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Headline text whose words rise in one after another. */
export function Rise({ text, start = 0, step = 70, className = "" }: { text: string; start?: number; step?: number; className?: string }) {
  return (
    <span className={`rise ${className}`} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>{w}&nbsp;</span>
      ))}
    </span>
  );
}

/** Tilts toward the pointer in 3D, with a gold glint on hover. */
export function Tilt({ children, className = "", max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    el.style.setProperty("--ry", `${x * max}deg`);
    el.style.setProperty("--rx", `${-y * max}deg`);
  }
  function leave() {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  }
  return <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt glint ${className}`}>{children}</div>;
}

/** A gold flip-clock number that counts up when it scrolls into view. */
export function FlipNumber({ value, label }: { value: number; label: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    let n = 0;
    const iv = setInterval(() => {
      n = Math.min(value, n + Math.max(1, Math.ceil((value - n) * 0.18)));
      setShown(n);
      if (n >= value) clearInterval(iv);
    }, 45);
    return () => clearInterval(iv);
  }, [inView, value]);
  const digits = String(shown).padStart(String(value).length, "0");
  return (
    <div ref={ref} role="img" aria-label={`${value} ${label}`} className="flex gap-[5px]">
      {Array.from(digits).map((d, i) => (
        <span key={i} className="flip inline-flex h-[64px] w-[46px] items-center justify-center rounded-md font-label text-[44px] font-semibold text-gold">{d}</span>
      ))}
    </div>
  );
}

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A dark panel with a soft light that follows the cursor (.spot in globals.css). */
export function Spotlight({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--sx", `${e.clientX - b.left}px`);
    e.currentTarget.style.setProperty("--sy", `${e.clientY - b.top}px`);
  }
  return <div onPointerMove={move} className={`spot ${className}`}>{children}</div>;
}

/** Cycles through words, each sliding up into place. */
export function RotatingWord({ words, every = 2000, className = "" }: { words: string[]; every?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced() || words.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => clearInterval(t);
  }, [words.length, every]);
  return <span key={i} className={`uword ${className}`}>{words[i]}</span>;
}

/** Types its text out once it scrolls into view, with a blinking caret. */
export function TypeOut({ text, speed = 28, className = "" }: { text: string; speed?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) return setN(text.length);
    const t = setInterval(() => setN((c) => { if (c >= text.length) { clearInterval(t); return c; } return c + 1; }), speed);
    return () => clearInterval(t);
  }, [inView, text, speed]);
  return <span ref={ref} className={className}>{text.slice(0, n)}<span aria-hidden="true" className="caret" /></span>;
}

/** A counter that steps 0..steps-1 on a timer and starts over, for looping demos. */
export function useLoop(steps: number, every = 900) {
  const [step, setStep] = useState(reduced() ? steps - 1 : 0);
  useEffect(() => {
    if (reduced() || steps < 2) return;
    const t = setInterval(() => setStep((s) => (s + 1) % steps), every);
    return () => clearInterval(t);
  }, [steps, every]);
  return step;
}

/** Steps 0..steps-1 once on a timer, then holds on the last step. */
export function useStepper(steps: number, every = 700) {
  const [step, setStep] = useState(reduced() ? steps - 1 : 0);
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setStep((s) => { if (s >= steps - 1) { clearInterval(t); return s; } return s + 1; }), every);
    return () => clearInterval(t);
  }, [steps, every]);
  return step;
}

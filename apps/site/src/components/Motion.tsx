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

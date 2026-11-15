// Shared timing helpers for the tour. Every animation is a pure function of the clock.

export const W = 1440, H = 900;
export const CLICK = 250;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const prog = (t: number, from: number, dur: number) => ease(clamp((t - from) / dur));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** A springy 0..1 that overshoots a little, for things that pop into place. */
export const pop = (t: number, from: number, dur = 450) => {
  const x = clamp((t - from) / dur);
  return x === 0 ? 0 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
};
/** Whichever value in a timeline is current at t: [[0, a], [1200, b]] -> b after 1200. */
export function at<T>(t: number, steps: [number, T][]): T {
  let v = steps[0][1];
  for (const [from, x] of steps) if (t >= from) v = x;
  return v;
}
export const pressed = (t: number, when: number) => t >= when + CLICK - 80 && t < when + CLICK + 160;

export const tick = <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className="flex-none"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** Marks the parts of the app where AI is doing the work. */
export function AiTag({ label = "AI", dark = false }: { label?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-[11px] font-semibold uppercase tracking-[.08em] ${dark ? "bg-gold text-ink" : "bg-ink text-gold"}`}>
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6zM13 11l.7 1.6 1.3.4-1.3.5L13 15l-.7-1.5-1.3-.5 1.3-.4z" fill="currentColor" /></svg>
      {label}
    </span>
  );
}

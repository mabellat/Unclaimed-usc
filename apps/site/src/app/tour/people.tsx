// The tour's illustrated students and the places they stand in. Flat SVG, posed and animated from the clock.

import { W, H, clamp, lerp, pop, prog } from "./kit";

export type Pose = "idle" | "walk" | "wave" | "cheer" | "talk" | "phone" | "think" | "shrug" | "slump" | "type";
export type Mood = "happy" | "grin" | "sad" | "neutral" | "talk" | "shock" | "worried";
export type Emote = "?" | "!" | "sweat" | "growl" | "spark" | null;
export type Look = { hoodie: string; hair: string; skin: string; pants: string; style: 0 | 1 | 2 | 3; glasses?: boolean; bag?: string };

export const MARCUS: Look = { hoodie: "#9D2235", hair: "#2A1A12", skin: "#C68E64", pants: "#2E3A55", style: 0, bag: "#111111" };
export const WEI: Look = { hoodie: "#3A3A3A", hair: "#111111", skin: "#E8C39E", pants: "#5B5B66", style: 3, glasses: true, bag: "#9D2235" };
export const SOFIA: Look = { hoodie: "#C8475E", hair: "#3B2416", skin: "#D7A27A", pants: "#111111", style: 2, bag: "#FFC72C" };
export const PRIYA: Look = { hoodie: "#2E3A55", hair: "#111111", skin: "#B07A55", pants: "#5B5B66", style: 2, bag: "#9D2235" };
export const FRIEND: Look = { hoodie: "#FFC72C", hair: "#111111", skin: "#8D5A3B", pants: "#2E3A55", style: 1 };
export const FRIEND_B: Look = { hoodie: "#6E1423", hair: "#5A3A22", skin: "#F0C8A0", pants: "#4A4A4A", style: 0, bag: "#FFC72C" };

// Shoulder and elbow angles for each pose: [left shoulder, left forearm, right shoulder, right forearm].
// 0 hangs down, 90 points outward, 180 points up; negative swings across the body.
const ARMS: Record<Pose, [number, number, number, number]> = {
  idle: [7, 4, 7, 4], walk: [8, 14, 8, 14], wave: [7, 4, 140, 160], cheer: [150, 170, 150, 170],
  talk: [7, 4, 28, -50], phone: [7, 4, 18, -140], think: [7, 4, 14, -150], shrug: [48, 128, 48, 128],
  slump: [3, 2, 3, 2], type: [14, -95, 14, -95],
};

const dir = (a: number, side = 1) => [Math.sin((a * Math.PI) / 180) * side, Math.cos((a * Math.PI) / 180)];

/**
 * A student, feet at (x, y). `pose` eases in over `poseT` ms from `from`; walking runs while `walk` (a phase) moves.
 * Breathing, blinking, a little head sway and talking all run off `t`.
 */
export function Person({ t, x, y = 740, scale = 1.25, walk, flip = false, pose = "idle", from = "idle", poseT = 1e9, mood = "neutral", emote = null, look = 0, hit, sit = false, ...lk }: Look & {
  t: number; x: number; y?: number; scale?: number; walk?: number; flip?: boolean; pose?: Pose; from?: Pose; poseT?: number;
  mood?: Mood; emote?: Emote; look?: number; hit?: string; sit?: boolean;
}) {
  const walking = walk != null;
  const ph = walk ?? 0;
  const k = prog(poseT, 0, 380);
  const a0 = ARMS[walking ? "walk" : from], a1 = ARMS[walking ? "walk" : pose];
  let [ls, le, rs, re] = a0.map((v, i) => lerp(v, a1[i], k));
  if (walking) { ls += 16 * Math.sin(ph); rs -= 16 * Math.sin(ph); }
  if (pose === "wave" && !walking) re += 22 * Math.sin(t / 140);
  if (pose === "talk" && !walking) { rs += 8 * Math.sin(t / 260); re += 14 * Math.sin(t / 190); }
  if (pose === "type" && !walking) { le += 6 * Math.sin(t / 70); re += 6 * Math.sin(t / 80 + 1); }
  if (pose === "cheer" && !walking) { ls += 6 * Math.sin(t / 160); rs += 6 * Math.sin(t / 160 + 1); }

  const slumped = pose === "slump" || mood === "sad";
  const bob = walking ? -5 * Math.abs(Math.sin(ph)) : Math.sin(t / 700) * 1.6 + (pose === "cheer" ? -6 * Math.abs(Math.sin(t / 220)) : 0);
  const lean = walking ? 3 : 0;
  const shrugUp = pose === "shrug" ? -7 * k : 0;
  const headDrop = slumped ? 6 : 0;
  const tilt = (slumped ? 6 : 0) + Math.sin(t / 900 + x) * 2 + (mood === "talk" ? Math.sin(t / 300) * 3 : 0) + (emote === "?" ? -7 : 0);
  const blink = (t + x * 13) % 3600 < 120;
  const pupil = clamp(look, -1, 1) * 3;
  const talkOpen = 2 + ((Math.sin(t / 62) + 1) / 2) * 7;

  // Legs: hip -> knee -> foot, with the knee bending through the stride.
  const leg = (side: number) => {
    const s = walking ? Math.sin(ph + (side < 0 ? 0 : Math.PI)) : 0;
    const thigh = 24 * s, knee = walking ? 34 * Math.max(0, -Math.cos(ph + (side < 0 ? 0 : Math.PI))) : 0;
    const hx = 100 + side * 12, hy = 230;
    const [tx, ty] = dir(thigh);
    const kx = hx + tx * 60, ky = hy + ty * 60;
    const [sx, sy] = dir(thigh - knee);
    const fx = kx + sx * 60, fy = ky + sy * 60;
    return { d: `M${hx} ${hy} L${kx} ${ky} L${fx} ${fy}`, fx, fy };
  };
  const arm = (side: number, sh: number, fo: number) => {
    const ox = 100 + side * 40, oy = 146 + shrugUp;
    const [ux, uy] = dir(sh, side);
    const ex = ox + ux * 48, ey = oy + uy * 48;
    const [fx, fy] = dir(fo, side);
    return { d: `M${ox} ${oy} L${ex} ${ey} L${ex + fx * 46} ${ey + fy * 46}`, hx: ex + fx * 46, hy: ey + fy * 46 };
  };
  const L = leg(-1), R = leg(1);
  const la = arm(-1, ls, le), ra = arm(1, rs, re);

  const brows = mood === "sad" || mood === "worried" ? "M75 75 L91 69 M125 75 L109 69"
    : mood === "shock" ? "M75 64 L92 61 M125 64 L108 61"
    : mood === "happy" || mood === "grin" ? "M76 69 Q84 64 92 68 M124 69 Q116 64 108 68" : "M76 71 L92 70 M124 71 L108 70";
  const mouth = mood === "talk" ? <ellipse cx="100" cy="110" rx="9" ry={talkOpen} fill="#5A0F1C" />
    : mood === "shock" ? <ellipse cx="100" cy="113" rx="7.5" ry="9.5" fill="#5A0F1C" />
    : mood === "grin" ? <path d="M82 102 Q100 128 118 102 Z" fill="#5A0F1C" stroke="#111111" strokeWidth="2.5" strokeLinejoin="round" />
    : <path d={mood === "happy" ? "M84 104 Q100 121 116 104" : mood === "sad" ? "M86 117 Q100 104 114 117" : mood === "worried" ? "M85 113 q7.5 -6 15 0 q7.5 6 15 0" : "M89 111 L111 111"} stroke="#111111" strokeWidth="3.5" fill="none" strokeLinecap="round" />;

  return (
    <div className="absolute" style={{ left: x - 100 * scale, top: y - 360 * scale, width: 200 * scale, height: 360 * scale }}>
      <svg viewBox="0 0 200 360" width={200 * scale} height={360 * scale} overflow="visible" aria-hidden="true" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <ellipse cx="100" cy="352" rx={60 - (walking ? 6 * Math.abs(Math.sin(ph)) : 0)} ry="8" fill="rgba(0,0,0,.13)" />
        <g transform={`translate(0 ${bob}) rotate(${lean} 100 300)`}>
          {!sit && [L, R].map((l, i) => (
            <g key={i}>
              <path d={l.d} stroke={lk.pants} strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={`M${l.fx - 12} ${l.fy + 2} q4 -12 18 -10 q12 2 14 10 z`} fill="#111111" />
              <path d={`M${l.fx - 12} ${l.fy + 2} h32`} stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            </g>
          ))}
          {lk.bag && <rect x="38" y="140" width="124" height="96" rx="22" fill={lk.bag} />}
          <path d={la.d} stroke={lk.hoodie} strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={la.d} stroke="rgba(0,0,0,.12)" strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={la.hx} cy={la.hy} r="10.5" fill={lk.skin} />
          <path d={`M50 ${150 + shrugUp} Q50 ${126 + shrugUp} 74 ${124 + shrugUp} L126 ${124 + shrugUp} Q150 ${126 + shrugUp} 150 ${150 + shrugUp} L152 246 Q100 258 48 246 Z`} fill={lk.hoodie} />
          <path d="M66 130 Q100 152 134 130" stroke="rgba(0,0,0,.18)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M72 204 H128 L122 238 H78 Z" fill="rgba(0,0,0,.10)" />
          <path d="M91 136 L93 168 M109 136 L107 168" stroke="rgba(255,255,255,.75)" strokeWidth="3" strokeLinecap="round" />
          {lk.bag && <path d="M70 128 L66 200 M130 128 L134 200" stroke={lk.bag} strokeWidth="7" strokeLinecap="round" />}
          <path d={ra.d} stroke={lk.hoodie} strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={ra.hx} cy={ra.hy} r="10.5" fill={lk.skin} />
          {pose === "phone" && !walking && k > 0.6 && (
            <g transform={`translate(${ra.hx - 14} ${ra.hy - 30})`}>
              <rect width="26" height="44" rx="5" fill="#111111" />
              <rect x="3" y="4" width="20" height="34" rx="2" fill="#FFE7A3" opacity={0.75 + 0.25 * Math.sin(t / 300)} />
            </g>
          )}
          <g transform={`translate(0 ${headDrop + shrugUp * 0.6}) rotate(${tilt} 100 128)`}>
            <rect x="88" y="106" width="24" height="24" rx="6" fill={lk.skin} />
            {lk.style === 2 && <path d="M50 140 Q36 40 100 32 Q164 40 150 140 L134 140 Q142 72 120 62 Q100 56 78 64 Q58 74 66 140Z" fill={lk.hair} />}
            <circle cx="54" cy="88" r="9" fill={lk.skin} /><circle cx="146" cy="88" r="9" fill={lk.skin} />
            <circle cx="100" cy="82" r="46" fill={lk.skin} />
            {lk.style === 0 && <path d="M54 80 Q48 28 100 30 Q152 28 146 80 Q138 56 118 54 Q112 62 98 58 Q72 54 54 80Z" fill={lk.hair} />}
            {lk.style === 1 && <><circle cx="100" cy="28" r="20" fill={lk.hair} /><path d="M54 84 Q48 34 100 36 Q152 34 146 84 Q140 56 100 58 Q60 56 54 84Z" fill={lk.hair} /></>}
            {lk.style === 2 && <path d="M54 86 Q50 34 100 34 Q150 34 146 86 Q134 54 100 54 Q76 56 54 86Z" fill={lk.hair} />}
            {lk.style === 3 && <path d="M54 82 Q46 34 96 30 Q150 26 148 80 Q142 52 120 48 Q92 66 54 82Z" fill={lk.hair} />}
            {blink
              ? <><rect x="77" y="85" width="14" height="3" rx="1.5" fill="#111111" /><rect x="109" y="85" width="14" height="3" rx="1.5" fill="#111111" /></>
              : <>
                  <ellipse cx="84" cy="86" rx="7" ry={mood === "shock" ? 8 : 6.5} fill="#FFFFFF" /><ellipse cx="116" cy="86" rx="7" ry={mood === "shock" ? 8 : 6.5} fill="#FFFFFF" />
                  <circle cx={84 + pupil} cy="87" r="4.2" fill="#111111" /><circle cx={116 + pupil} cy="87" r="4.2" fill="#111111" />
                  <circle cx={85.5 + pupil} cy="85.5" r="1.3" fill="#FFFFFF" /><circle cx={117.5 + pupil} cy="85.5" r="1.3" fill="#FFFFFF" />
                </>}
            {lk.glasses && <g fill="rgba(255,255,255,.12)" stroke="#111111" strokeWidth="3"><circle cx="84" cy="86" r="12" /><circle cx="116" cy="86" r="12" /><path d="M96 86 h8" /></g>}
            <path d={brows} stroke={lk.hair === "#111111" ? "#111111" : lk.hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            {(mood === "happy" || mood === "grin") && <><circle cx="70" cy="102" r="7" fill="#E6A3B0" opacity=".65" /><circle cx="130" cy="102" r="7" fill="#E6A3B0" opacity=".65" /></>}
            {mouth}
          </g>
          {emote && <EmoteMark t={t} emote={emote} flip={flip} />}
        </g>
      </svg>
      {hit && <div data-hit={hit} className="absolute" style={{ left: 50 * scale, top: 34 * scale, width: 100 * scale, height: 110 * scale }} />}
    </div>
  );
}

function EmoteMark({ t, emote, flip }: { t: number; emote: Emote; flip: boolean }) {
  const unflip = flip ? "translate(200 0) scale(-1 1)" : "";
  if (emote === "?" || emote === "!") {
    const s = 1 + 0.08 * Math.sin(t / 180);
    return (
      <g transform={`${unflip} translate(158 -4) scale(${s})`}>
        <circle r="24" fill="#FFFFFF" stroke="#111111" strokeWidth="3" />
        <text y="11" textAnchor="middle" fontSize="32" fontWeight="800" fill="#9D2235" fontFamily="var(--font-display)">{emote}</text>
      </g>
    );
  }
  if (emote === "sweat") {
    const d = (t % 1400) / 1400;
    return <path transform={`translate(150 ${52 + d * 22})`} d="M0 0 q-9 14 0 18 q9 -4 0 -18z" fill="#8EC5E8" opacity={1 - d} />;
  }
  if (emote === "growl") {
    const o = 0.4 + 0.6 * Math.abs(Math.sin(t / 160));
    return <g transform="translate(162 192)" stroke="#111111" strokeWidth="3" fill="none" strokeLinecap="round" opacity={o}><path d="M0 0 q8 -6 0 -12 q-8 -6 0 -12" /><path d="M14 4 q8 -8 0 -16 q-8 -8 0 -16" /></g>;
  }
  if (emote === "spark") {
    return (
      <g transform={`${unflip} translate(156 10)`}>
        {[0, 1, 2].map((i) => {
          const o = (Math.sin(t / 200 + i * 2) + 1) / 2;
          const [px, py] = [[0, 0], [26, 26], [-6, 40]][i];
          return <path key={i} transform={`translate(${px} ${py}) scale(${0.6 + o * 0.5})`} d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3Z" fill="#FFC72C" stroke="#111111" strokeWidth="1.5" />;
        })}
      </g>
    );
  }
  return null;
}

/** A speech bubble whose tail sits at (x, y). Typing dots first, then the words. */
export function Bubble({ t, x, y, from, until = Infinity, text, dark = false, hit, side = "center" }: { t: number; x: number; y: number; from: number; until?: number; text: string; dark?: boolean; hit?: string; side?: "left" | "center" | "right" }) {
  if (t < from || t >= until) return null;
  const typing = t < from + 650;
  const s = pop(t, from);
  const shift = side === "left" ? "-18%" : side === "right" ? "-82%" : "-50%";
  return (
    <div data-hit={hit} className="absolute z-10" style={{ left: x, top: y, transform: `translate(${shift}, -100%) scale(${s})`, transformOrigin: "50% 100%" }}>
      <div className={`relative max-w-[400px] rounded-[28px] px-6 py-4 text-[22px] font-semibold leading-snug shadow-[0_16px_36px_rgba(0,0,0,.16)] ${dark ? "bg-ink text-white" : "bg-white text-ink"}`}>
        {typing
          ? <span className="flex gap-1.5 py-2">{[0, 1, 2].map((i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white" : "bg-ink"}`} style={{ transform: `translateY(${-4 * Math.max(0, Math.sin(t / 110 - i))}px)` }} />)}</span>
          : text}
        <span className={`absolute -bottom-2 h-5 w-5 rotate-45 ${dark ? "bg-ink" : "bg-white"}`} style={{ left: side === "left" ? "18%" : side === "right" ? "82%" : "50%", marginLeft: -10 }} />
      </div>
    </div>
  );
}

/** A thought cloud anchored above a head; lines appear one at a time. */
export function Thought({ t, x, y, from, lines, hit = "thought" }: { t: number; x: number; y: number; from: number; lines: [number, string][]; hit?: string }) {
  if (t < from) return null;
  return (
    <div data-hit={hit} className="absolute z-10" style={{ left: x, top: y }}>
      <span className="absolute -left-7 top-[100%] mt-10 h-5 w-5 rounded-full bg-white shadow" style={{ transform: `scale(${pop(t, from)})` }} />
      <span className="absolute -left-1 top-[100%] mt-2 h-8 w-8 rounded-full bg-white shadow" style={{ transform: `scale(${pop(t, from + 100)})` }} />
      <div className="flex w-[400px] flex-col gap-1.5 rounded-[40px] bg-white px-8 py-6 shadow-[0_16px_36px_rgba(0,0,0,.12)]" style={{ transform: `scale(${pop(t, from + 200)})`, transformOrigin: "0 100%" }}>
        {lines.map(([when, l]) => t >= when && <div key={l} className="uin text-[23px] font-semibold leading-snug">{l}</div>)}
      </div>
    </div>
  );
}

/** A card that pops up beside a student, listing help that was there all along. */
export function FoundCard({ t, x, y, from, title, items, hit }: { t: number; x: number; y: number; from: number; title: string; items: { name: string; line: string; color: string }[]; hit?: string }) {
  if (t < from) return null;
  return (
    <div data-hit={hit} className="absolute z-20 w-[470px] rounded-[26px] bg-ink p-6 text-white shadow-[0_30px_70px_rgba(0,0,0,.35)]" style={{ left: x, top: y, transform: `scale(${pop(t, from)})`, transformOrigin: "0 0" }}>
      <div className="mb-3 font-label text-[12px] uppercase tracking-[.12em] text-gold">{title}</div>
      <div className="flex flex-col gap-2.5">
        {items.map((it, i) => t >= from + 350 + i * 350 && (
          <div key={it.name} className="uin flex items-start gap-3 rounded-2xl bg-white/[.07] px-4 py-3">
            <span className="mt-1.5 h-3 w-3 flex-none rounded-full" style={{ background: it.color }} />
            <div className="min-w-0">
              <div className="font-display text-[20px] font-bold leading-tight">{it.name}</div>
              <div className="mt-0.5 line-clamp-2 text-[14.5px] leading-snug text-white/65">{it.line}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Places ---------- */

const arches = (x0: number, n: number, y: number, fill: string) =>
  Array.from({ length: n }, (_, i) => <path key={i} d={`M${x0 + i * 64} ${y} V${y - 70} a18 18 0 0 1 36 0 V${y}Z`} fill={fill} />);

function palm(x: number, h: number, t: number, frond = "#6F8F6A") {
  const sway = Math.sin(t / 1300 + x) * 4;
  return (
    <g>
      <path d={`M${x} 740 Q${x - 14} ${740 - h / 2} ${x + 10} ${740 - h}`} stroke="#A08B6A" strokeWidth="14" fill="none" strokeLinecap="round" />
      <g transform={`rotate(${sway} ${x + 10} ${740 - h})`}>
        {[-160, -120, -75, -30, 10].map((a) => {
          const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
          return <path key={a} d={`M${x + 10} ${740 - h} q${c * 60} ${s * 60 - 14} ${c * 124} ${s * 46 + 44}`} stroke={frond} strokeWidth="16" fill="none" strokeLinecap="round" />;
        })}
      </g>
    </g>
  );
}

/** Campus by day: a brick hall with a tower, arches, palms and drifting clouds. */
export function Campus({ t }: { t: number }) {
  const cloud = (x: number, y: number, s: number) => (
    <g transform={`translate(${((x + t / 40) % (W + 300)) - 150} ${y}) scale(${s})`} fill="#FFFFFF">
      <ellipse cx="0" cy="0" rx="60" ry="22" /><ellipse cx="34" cy="-14" rx="40" ry="24" /><ellipse cx="-30" cy="-8" rx="32" ry="18" />
    </g>
  );
  return (
    <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <rect width={W} height={H} fill="#F4F1EA" />
      <circle cx="1220" cy="150" r="74" fill="#FFC72C" />
      {cloud(200, 120, 1)}{cloud(760, 190, 0.8)}{cloud(1240, 100, 0.7)}
      <path d="M150 740 V420 H290 V330 L340 258 L390 330 V420 H610 V740Z" fill="#C9826B" />
      <path d="M150 420 H610 V440 H150Z M290 330 H390 V346 H290Z" fill="#B36D58" />
      <path d="M318 348 h44 v58 h-44z" fill="#F4F1EA" />
      {arches(178, 7, 640, "#8C4A3A")}
      <path d="M840 740 V470 H1300 V740Z" fill="#D4A08B" />
      <path d="M820 470 L1070 400 L1320 470Z" fill="#B36D58" />
      {arches(872, 7, 660, "#8C4A3A")}
      {palm(700, 330, t)}
      {palm(1360, 290, t)}
      <rect y="740" width={W} height={160} fill="#E2DDD0" />
      <path d={`M0 742 H${W}`} stroke="#CFC8B8" strokeWidth="4" />
    </svg>
  );
}

/** A quiet library: tall shelves, a window and a long table. */
export function Library() {
  const colors = ["#9D2235", "#FFC72C", "#111111", "#C8475E", "#CFCFC8", "#6E1423", "#B8860B", "#4A4A4A"];
  const shelf = (x0: number) => (
    <g>
      <rect x={x0} y="150" width="300" height="590" fill="#B98F6B" />
      {[0, 1, 2, 3, 4].map((r) => (
        <g key={r}>
          <rect x={x0 + 12} y={170 + r * 112} width="276" height="96" fill="#8C6A4E" />
          {Array.from({ length: 12 }, (_, i) => {
            const h = 62 + ((i * 7 + r * 5 + x0) % 26);
            return <rect key={i} x={x0 + 18 + i * 22.5} y={170 + r * 112 + 96 - h} width="18" height={h} rx="2" fill={colors[(i + r * 3 + x0) % colors.length]} />;
          })}
        </g>
      ))}
    </g>
  );
  return (
    <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <rect width={W} height={H} fill="#EFE8DA" />
      {shelf(40)}
      <rect x="1140" y="150" width="260" height="590" fill="#B98F6B" />
      <path d="M690 380 V180 a120 120 0 0 1 240 0 V380Z" fill="#CFE3EE" stroke="#B98F6B" strokeWidth="14" />
      <path d="M810 60 V380 M690 230 H930" stroke="#B98F6B" strokeWidth="8" />
      <rect y="740" width={W} height={160} fill="#C9B79C" />
    </svg>
  );
}

/** A bus stop at dawn: low sun, a shelter, and a bus that pulls away. */
export function BusStop({ t, busFrom = 0 }: { t: number; busFrom?: number }) {
  const bx = lerp(1500, -900, clamp((t - busFrom) / 2600));
  return (
    <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <rect width={W} height={H} fill="#FBE7C0" />
      <rect y="380" width={W} height="300" fill="#F6D9A6" />
      <circle cx="1120" cy="560" r="110" fill="#FFC72C" />
      <path d="M0 640 V520 h90 v-60 h70 v90 h120 v-140 h80 v110 h140 v-70 h110 v120 h130 v-180 h90 v150 h160 v-90 h120 v130 h140 v-60 h90 V640Z" fill="#E8C79A" />
      <rect y="640" width={W} height="100" fill="#D4D4CF" />
      <rect y="740" width={W} height="160" fill="#3A3A3A" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 130 + 20} y="815" width="70" height="8" rx="4" fill="#FFC72C" />)}
      <rect x="860" y="470" width="300" height="12" fill="#4A4A4A" />
      <rect x="866" y="482" width="6" height="258" fill="#4A4A4A" /><rect x="1148" y="482" width="6" height="258" fill="#4A4A4A" />
      <rect x="872" y="482" width="276" height="200" fill="rgba(255,255,255,.35)" />
      <rect x="900" y="650" width="220" height="14" rx="4" fill="#6B6B6B" />
      <rect x="820" y="420" width="8" height="320" fill="#4A4A4A" />
      <circle cx="824" cy="420" r="26" fill="#9D2235" /><rect x="812" y="410" width="24" height="18" rx="3" fill="#FFFFFF" />
      <g transform={`translate(${bx} 560)`}>
        <rect width="560" height="190" rx="26" fill="#FFC72C" />
        <rect y="150" width="560" height="14" fill="#E0A800" />
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={30 + i * 84} y="30" width="66" height="70" rx="10" fill="#2A2A2A" />)}
        <circle cx="110" cy="190" r="30" fill="#111111" /><circle cx="450" cy="190" r="30" fill="#111111" />
        <circle cx="110" cy="190" r="12" fill="#8C8C8C" /><circle cx="450" cy="190" r="12" fill="#8C8C8C" />
      </g>
    </svg>
  );
}

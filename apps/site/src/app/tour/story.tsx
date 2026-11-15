// The tour's illustrated chapters: three students who didn't know what was theirs, the general point,
// how the AI is used under the hood, and the sign-off.

import Link from "next/link";
import { SCMark } from "@/components/SCMark";
import { capitalize, hostOf, money, stubFor } from "@/lib/ui";
import type { Resource } from "@/lib/types";
import { AiTag, H, W, at, clamp, lerp, pop, prog, tick } from "./kit";
import { BusStop, Bubble, Campus, FRIEND, FRIEND_B, FoundCard, Library, MARCUS, Person, SOFIA, Thought, WEI, type Pose } from "./people";

type Res = Record<string, Resource>;

/** The current pose in a timeline, plus the one before it and how long ago it changed, so the switch can ease. */
function poseAt(t: number, steps: [number, Pose][]) {
  let i = 0;
  steps.forEach(([s], j) => { if (t >= s) i = j; });
  return { pose: steps[i][1], from: steps[Math.max(0, i - 1)][1], poseT: t - steps[i][0] };
}
const walkX = (t: number, from: number, dur: number, x0: number, x1: number) => lerp(x0, x1, clamp((t - from) / dur));
const walking = (t: number, from: number, dur: number, speed = 115) => (t >= from && t < from + dur ? t / speed : undefined);
const firstClause = (s?: string | null) => capitalize((s ?? "").split(/;|\(/)[0].trim());
const found = (res: Res, ids: string[]) => ids.filter((id) => res[id]).map((id) => ({ name: res[id].title, line: firstClause(res[id].benefit?.label), color: stubFor(res[id].category).bg }));

/** Story 1. Marcus overhears friends talking about a scholarship he fully qualified for. It has already closed. */
// Town and Gown's rules, as written in data/eligibility_rules.json; Marcus's demo card meets each one.
const TOWN_AND_GOWN = ["U.S. citizen or permanent resident of Southern California", "Minimum unweighted GPA 3.4", "Open to continuing students"];
export function SceneMarcus({ t, res }: { t: number; res: Res }) {
  const mx = walkX(t, 0, 2200, -150, 430);
  const tg = res["town-and-gown"];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Campus t={t} />
      <Person t={t} x={mx} walk={walking(t, 0, 2200)} {...poseAt(t, [[0, "idle"], [6400, "shrug"], [8800, "slump"]])}
        mood={at(t, [[0, "happy"], [3600, "neutral"], [6400, "shock"], [8800, "sad"]])} emote={at(t, [[0, null], [6400, "!"], [8600, "sweat"]])}
        look={t >= 2200 ? 1 : 0} hit="marcus-face" {...MARCUS} />
      <Person t={t + 500} x={870} flip {...poseAt(t, [[0, "talk"], [1400, "cheer"], [3600, "idle"], [8000, "talk"], [10000, "idle"]])}
        mood={at(t, [[0, "talk"], [1400, "grin"], [3600, "happy"], [8000, "talk"], [10000, "neutral"]])} look={t >= 6400 ? 1 : 0} hit="friend" {...FRIEND} />
      <Person t={t + 900} x={1090} flip {...poseAt(t, [[0, "idle"], [3600, "talk"], [6400, "idle"]])}
        mood={at(t, [[0, "happy"], [3600, "talk"], [6400, "neutral"]])} look={1} {...FRIEND_B} />
      <Bubble t={t} x={870} y={300} from={1400} until={3600} text="I just had my interview for the Town and Gown Scholarship!" />
      <Bubble t={t} x={1090} y={300} from={3600} until={6400} side="right" text="$15,000 a year toward grad tuition. Marcus, you applied, right?" />
      <Bubble t={t} x={430} y={300} from={6400} until={8800} side="left" dark text="Wait... what scholarship?" />
      <Bubble t={t} x={870} y={300} from={8000} until={10000} text="Applications closed November 15." />
      {t >= 9000 && (
        <span className="ustamp absolute rounded-lg border-[5px] border-cardinal bg-white/85 px-5 py-1.5 font-label text-[40px] font-semibold tracking-[.14em] text-cardinal" style={{ left: 230, top: 190 }}>MISSED IT</span>
      )}
      {tg && t >= 10000 && (
        <div data-hit="m-found" className="absolute z-20 w-[500px] rounded-[26px] bg-ink p-6 text-white shadow-[0_30px_70px_rgba(0,0,0,.35)]" style={{ left: 700, top: 110, transform: `scale(${pop(t, 10000)})`, transformOrigin: "0 0" }}>
          <div className="font-label text-[12px] uppercase tracking-[.12em] text-gold">He was more than qualified</div>
          <div className="mt-2 font-display text-[28px] font-bold leading-tight">{tg.title}</div>
          <div className="mt-1 text-[15px] text-white/65">{capitalize(tg.benefit?.label ?? "")}</div>
          <div className="mt-4 flex flex-col gap-2">
            {TOWN_AND_GOWN.map((rule, i) => t >= 10400 + i * 350 && (
              <div key={rule} className="uin flex items-center gap-3 rounded-xl bg-white/[.07] px-4 py-2.5 text-[16px]">
                <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold text-ink">{tick}</span>{rule}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Story 2. Wei lands his first interview, with no suit and no one to practice with. */
export function SceneWei({ t, res }: { t: number; res: Res }) {
  const todos: [number, string, boolean][] = [
    [1200, "Interview confirmed: Friday, 10 AM", true],
    [2200, "Buy a suit (how much are these??)", false],
    [3200, "Get someone to look at my resume", false],
    [4200, "Practice answers... with who?", false],
  ];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Library />
      <Person t={t} x={400} y={810} sit {...poseAt(t, [[0, "type"], [5000, "think"], [6800, "slump"]])}
        mood={at(t, [[0, "neutral"], [3000, "worried"], [6800, "sad"]])} emote={at(t, [[0, null], [3200, "?"], [6400, "sweat"]])} look={0.6} hit="wei-face" {...WEI} />
      <div className="absolute left-[100px] top-[624px] h-[28px] w-[620px] rounded-md bg-[#8C6A4E]" />
      <div className="absolute left-[140px] top-[652px] h-[90px] w-[20px] bg-[#6E513A]" /><div className="absolute left-[660px] top-[652px] h-[90px] w-[20px] bg-[#6E513A]" />
      <div className="absolute left-[400px] top-[536px] h-[88px] w-[150px] rounded-t-xl bg-[#CFCFC8]"><span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" /></div>

      <div data-hit="w-screen" className="absolute left-[770px] top-[110px] w-[600px] rounded-[20px] bg-white p-6 shadow-[0_30px_70px_rgba(0,0,0,.18)]">
        <div className="font-label text-[11px] uppercase tracking-[.1em] text-muted">Notes</div>
        <div className="mt-1 font-display text-[28px] font-bold leading-tight">Before Friday</div>
        <div className="mt-4 flex flex-col gap-2.5">
          {todos.map(([when, text, done]) => t >= when && (
            <div key={text} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${done ? "bg-gold/30" : "bg-paper"}`} style={{ transform: `scale(${pop(t, when)})`, transformOrigin: "0 50%" }}>
              <span className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-md ${done ? "bg-ink text-white" : "border-2 border-sand"}`}>{done && tick}</span>
              <span className="text-[18px] font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <FoundCard t={t} x={820} y={330} from={7400} hit="w-found" title="Free, and he never knew" items={found(res, ["tommys-closet", "career-advising-and-tools", "career-fest-2027"])} />
    </div>
  );
}

/** Story 3. Sofia skips lunch to cover rent, not knowing about meal swipes, free event food or one-time help. */
export function SceneSofia({ t, res }: { t: number; res: Res }) {
  const sx = walkX(t, 1300, 2300, -150, 520);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <BusStop t={t} busFrom={300} />
      <Person t={t} x={sx} walk={walking(t, 1300, 2300, 90)} {...poseAt(t, [[0, "idle"], [3700, "shrug"], [5200, "idle"], [8800, "slump"]])}
        mood={at(t, [[0, "worried"], [3700, "sad"], [5200, "worried"], [8800, "sad"]])} emote={at(t, [[0, null], [3700, "sweat"], [5200, "growl"], [8800, null]])}
        look={at(t, [[0, 0], [3600, -1], [5200, 0.5]])} hit="sofia-face" {...SOFIA} />
      <Thought t={t} x={600} y={110} from={5000} lines={[[5300, "Skipped lunch again."], [6200, "And rent just went up."]]} />
      <FoundCard t={t} x={860} y={150} from={7800} hit="s-found" title="Waiting for her the whole time" items={found(res, ["emergency-meal-swipes", "tommys-table", "sbn-supplemental-funding"])} />
    </div>
  );
}

/** The general point: so many resources, scattered, and three students who each knew none of it. */
export function SceneMany({ t, all, hosts }: { t: number; all: Resource[]; hosts: number }) {
  const dim = prog(t, 4800, 700);
  const shrug = t >= 8500;
  return (
    <div className="absolute inset-0 overflow-hidden">
      {all.map((r, i) => {
        const col = i % 5, row = Math.floor(i / 5);
        const x = 70 + col * 262 + ((row * 53) % 90), y = 40 + row * 46;
        return t >= 300 + i * 75 && (
          <span key={r.id} className="absolute flex max-w-[300px] items-center gap-2 rounded-full border border-rule bg-white px-3.5 py-1.5 text-[14px] font-semibold shadow-[0_6px_14px_rgba(0,0,0,.06)]"
            style={{ left: x, top: y + Math.sin(t / 900 + i) * 4, transform: `scale(${pop(t, 300 + i * 75)})`, opacity: 1 - dim * 0.8, filter: `blur(${dim * 2}px)` }}>
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: stubFor(r.category).bg }} /><span className="truncate">{r.title}</span>
          </span>
        );
      })}
      {t >= 4800 && (
        <div data-hit="stats" className="absolute left-1/2 top-[150px] flex -translate-x-1/2 gap-5">
          {[["Every office", "has its own page"], ["Every page", "has its own rules"], ["Every rule", "has its own deadline"]].map(([n, l], i) => (
            <div key={l} className="w-[250px] rounded-[26px] bg-ink px-6 py-5 text-center text-white shadow-[0_24px_60px_rgba(0,0,0,.25)]" style={{ transform: `scale(${pop(t, 4900 + i * 200)})` }}>
              <div className="font-display text-[40px] font-extrabold leading-none tracking-[-0.04em] text-gold">{n}</div>
              <div className="mt-2 font-label text-[13px] uppercase tracking-[.1em] text-white/70">{l}</div>
            </div>
          ))}
        </div>
      )}
      {([[MARCUS, 430], [WEI, 720], [SOFIA, 1010]] as const).map(([lk, x], i) => (
        <Person key={x} t={t + i * 400} x={x} y={770} scale={0.95} {...poseAt(t, [[0, "idle"], [8500, "shrug"]])} mood={shrug ? "worried" : "neutral"}
          emote={t >= 1200 + i * 300 ? "?" : null} look={t < 4800 ? Math.sin(t / 900 + i) : 0} {...lk} />
      ))}
    </div>
  );
}

/** Under the hood: where AI does the work, where a USC admin checks it, and where rules decide. */
export function SceneUnder({ t, evidence, hosts }: { t: number; evidence?: Resource; hosts: number }) {
  const nodes: { id: string; tag: React.ReactNode; title: string; sub: string; from: number }[] = [
    { id: "n0", tag: <span className="rounded-full bg-paper px-2.5 py-1 font-label text-[11px] uppercase tracking-[.08em] text-muted ring-1 ring-rule">Source</span>, title: "USC pages", sub: "Official usc.edu pages, read as they are.", from: 200 },
    { id: "n1", tag: <AiTag />, title: "AI reads each page", sub: "Pulls out amounts, rules, steps and deadlines. Anything not stated stays blank.", from: 900 },
    { id: "n2", tag: <span className="rounded-full bg-cardinal px-2.5 py-1 font-label text-[11px] uppercase tracking-[.08em] text-white">USC admin</span>, title: "A USC admin approves", sub: "Nothing unapproved reaches a student.", from: 4400 },
    { id: "n3", tag: <span className="rounded-full bg-paper px-2.5 py-1 font-label text-[11px] uppercase tracking-[.08em] text-ink ring-1 ring-ink">Rules</span>, title: "Rules match your card", sub: "Yes, maybe or no. An unknown is never a yes.", from: 7600 },
    { id: "n4", tag: <AiTag label="AI agents" />, title: "Agents help you claim", sub: "The claim agent drafts and checks. The Navigator answers.", from: 9200 },
  ];
  const cx = (i: number) => 165 + i * 277.5;
  const active = at(t, [[0, 1], [4400, 2], [7600, 3], [9200, 4], [10600, -1]]);
  const watch: [number, string][] = [[11000, "Re-reads every source page"], [11700, "Spots a change and drafts a new version"], [12400, "A USC admin approves it, then students get an alert"]];
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-[56px] text-center" style={{ opacity: prog(t, 0, 500) }}>
        <div className="font-label text-[13px] uppercase tracking-[.14em] text-cardinal">Under the hood</div>
        <div className="mt-2 font-display text-[46px] font-extrabold leading-none tracking-[-0.04em]">Where AI does the work, and where it doesn&apos;t.</div>
      </div>
      <svg className="absolute inset-0" width={W} height={H} aria-hidden="true">
        {nodes.slice(1).map((n, i) => t >= n.from && (
          <g key={n.id}>
            <path d={`M${cx(i) + 118} 370 H${cx(i + 1) - 118}`} stroke="#111111" strokeWidth="3" strokeDasharray="6 6" />
            {[0, 1, 2].map((k) => {
              const p = ((t / 900 + k / 3) % 1);
              return <circle key={k} cx={lerp(cx(i) + 118, cx(i + 1) - 118, p)} cy="370" r="5" fill="#9D2235" />;
            })}
          </g>
        ))}
        {t >= 10600 && <path d={`M480 690 C 260 690, 170 640, ${cx(0)} 482`} stroke="#9D2235" strokeWidth="3" strokeDasharray="8 7" fill="none" strokeDashoffset={-t / 30} />}
      </svg>
      {nodes.map((n, i) => t >= n.from && (
        <div key={n.id} data-hit={n.id} className={`absolute flex w-[236px] flex-col gap-2.5 rounded-[24px] bg-white p-5 transition-shadow ${active === i ? "shadow-[0_0_0_3px_#FFC72C,0_24px_50px_rgba(0,0,0,.14)]" : "shadow-[0_14px_34px_rgba(0,0,0,.08)]"}`}
          style={{ left: cx(i) - 118, top: 260, transform: `scale(${pop(t, n.from)})` }}>
          <div>{n.tag}</div>
          <div className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">{n.title}</div>
          <div className="text-[14.5px] leading-snug text-muted">{n.sub}</div>
        </div>
      ))}
      {evidence && t >= 2400 && (
        <div className="absolute w-[330px] rounded-[20px] bg-ink p-5 text-white shadow-[0_24px_50px_rgba(0,0,0,.25)]" style={{ left: cx(1) - 165, top: 530, transform: `scale(${pop(t, 2400)})`, transformOrigin: "50% 0" }}>
          <div className="font-label text-[11px] uppercase tracking-[.12em] text-gold">Evidence kept with every fact</div>
          <div className="mt-2 font-display text-[22px] font-bold leading-snug">&ldquo;{evidence.evidence_quote}&rdquo;</div>
          <div className="mt-2 font-label text-[12px] text-white/55">{hostOf(evidence.source_url)}</div>
        </div>
      )}
      {t >= 7800 && t < 10600 && (
        <div className="absolute w-[300px] rounded-[20px] border-2 border-ink bg-white p-4 text-[16px] font-semibold leading-snug" style={{ left: cx(3) - 150, top: 530, transform: `scale(${pop(t, 7800)})` }}>
          The AI never decides who qualifies. Rules do, and every reason is shown.
        </div>
      )}
      {t >= 10600 && (
        <div data-hit="watch" className="absolute w-[520px] rounded-[24px] bg-white p-6 shadow-[0_0_0_3px_#FFC72C,0_24px_50px_rgba(0,0,0,.14)]" style={{ left: 480, top: 560, transform: `scale(${pop(t, 10600)})` }}>
          <div className="mb-3 flex items-center gap-3"><AiTag label="Watcher" /><span className="font-label text-[12px] uppercase tracking-[.1em] text-muted">Every night</span></div>
          <div className="flex flex-col gap-2">
            {watch.map(([when, l]) => (
              <div key={l} className={`flex items-center gap-3 text-[17px] font-medium transition-opacity ${t >= when ? "opacity-100" : "opacity-25"}`}>
                <span className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-full ${t >= when ? "bg-ink text-white" : "border-2 border-rule"}`}>{t >= when && tick}</span>{l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The sign-off: everyone comes back, each with what they found. */
export function SceneOutro({ t, res }: { t: number; res: Res }) {
  const wins: [string, string][] = [["Marcus", "cavaney-vet"], ["Wei", "tommys-closet"], ["Sofia", "emergency-meal-swipes"]];
  const cast = [
    { lk: MARCUS, x: 105, from: -140, pose: "cheer" as Pose },
    { lk: WEI, x: 250, from: -300, pose: "wave" as Pose },
    { lk: FRIEND, x: 1190, from: 1600, pose: "wave" as Pose },
    { lk: SOFIA, x: 1330, from: 1750, pose: "cheer" as Pose },
  ];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pb-16 text-center">
      {cast.map((c, i) => (
        <Person key={i} t={t + i * 300} x={walkX(t, 0, 1500, c.from, c.x)} y={800} scale={0.78} flip={c.from > c.x} walk={walking(t, 0, 1500)}
          {...poseAt(t, [[0, "idle"], [1500 + i * 150, c.pose]])} mood={t >= 1500 ? "grin" : "happy"} emote={t >= 1900 ? "spark" : null} {...c.lk} />
      ))}
      <div style={{ transform: `scale(${pop(t, 0)})` }}><SCMark height={78} /></div>
      <div className="mt-5 font-display text-[80px] font-extrabold leading-none tracking-[-0.05em]" style={{ opacity: prog(t, 300, 600) }}>Find what&apos;s <span className="text-sheen">yours.</span></div>
      <div className="mt-4 max-w-[700px] text-[22px] leading-snug text-muted" style={{ opacity: prog(t, 900, 600) }}>Everything USC has set aside for you, in one place.</div>
      <div className="mt-7 flex gap-4">
        {wins.map(([who, id], i) => {
          const r = res[id];
          if (!r) return null;
          const cat = stubFor(r.category);
          return (
            <div key={id} className="relative w-[240px] overflow-hidden rounded-2xl border border-rule bg-white p-4 pt-5 text-left shadow-[0_14px_30px_rgba(0,0,0,.08)]" style={{ transform: `scale(${pop(t, 1600 + i * 250)})` }}>
              <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: cat.bg }} />
              <div className="font-label text-[11px] uppercase tracking-[.1em] text-cardinal">{who} found</div>
              <div className="mt-1 line-clamp-2 font-display text-[17px] font-bold leading-tight">{r.title}</div>
              <div className="mt-2 font-display text-[18px] font-extrabold">{r.benefit?.value != null ? money(r.benefit.value) : capitalize(cat.word.toLowerCase())}</div>
            </div>
          );
        })}
      </div>
      <Link href="/build" data-hit="cta" className={`shine mt-8 inline-flex min-h-[60px] items-center gap-3 rounded-full bg-ink px-10 text-[19px] font-semibold text-white ${t >= 2200 ? "upop" : "opacity-0"}`}>Build my Trojan card</Link>
    </div>
  );
}

/** How matching works: each resource's rules, checked one by one against Marcus's card. Yes, maybe or no. */
type Check = "pass" | "unknown" | "fail";
const FACTS: [string, string, string][] = [["level", "Degree", "Master's"], ["school", "School", "Price"], ["veteran", "U.S. military veteran", "Yes"], ["units", "Units this term", "Not answered"]];
// Rules as written in data/eligibility_rules.json, checked against Marcus's demo card.
const RULE_CARDS: { id: string; from: number; rules: [string, string, Check][]; extra?: "ask" | "why" }[] = [
  { id: "cavaney-vet", from: 1200, rules: [["Price student", "school", "pass"], ["Master's degree", "level", "pass"], ["U.S. military veteran", "veteran", "pass"]] },
  { id: "sbn-supplemental-funding", from: 4800, rules: [["Enrolled at least half time this term", "units", "unknown"]], extra: "ask" },
  { id: "dornsife-continuing-student-scholarship", from: 8800, rules: [["Declared Dornsife major", "school", "fail"], ["Full-time undergraduate", "level", "fail"]], extra: "why" },
];
const checkAt = (from: number, i: number) => from + 800 + i * 550;

export function SceneRules({ t, res, question }: { t: number; res: Res; question?: string }) {
  // The fact being checked right now lights up on the card.
  let lit: { key: string; result: Check } | null = null;
  RULE_CARDS.forEach((c) => c.rules.forEach(([, key, result], i) => { const w = checkAt(c.from, i); if (t >= w && t < w + 700) lit = { key, result }; }));
  const litNow = lit as { key: string; result: Check } | null;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute left-[60px] top-[90px] w-[380px]" style={{ transform: `scale(${pop(t, 0)})`, transformOrigin: "0 0" }}>
        <div className="rounded-[26px] bg-ink p-6 text-white shadow-[0_30px_70px_rgba(0,0,0,.25)]">
          <div className="mb-1 flex items-center gap-3"><SCMark height={22} /><span className="font-label text-[12px] uppercase tracking-[.12em] text-white/60">Marcus&apos;s card</span></div>
          <div className="mt-4 flex flex-col gap-2">
            {FACTS.map(([key, label, value], i) => {
              const on = litNow?.key === key ? litNow.result : null;
              return t >= 200 + i * 150 && (
                <div key={key} className={`uin flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 ${on === "pass" ? "bg-gold text-ink" : on === "fail" ? "bg-cardinal text-white" : on === "unknown" ? "bg-white/10 outline-dashed outline-2 outline-gold" : "bg-white/[.07]"}`}>
                  <span className={`text-[15px] ${on === "pass" ? "text-ink/70" : "text-white/60"}`}>{label}</span>
                  <span className={`font-display text-[18px] font-bold ${value === "Not answered" && on !== "unknown" ? "text-white/40" : ""}`}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>
        {t >= 12400 && (
          <div data-hit="r-principle" className="mt-5 rounded-[22px] border-2 border-ink bg-white p-5" style={{ transform: `scale(${pop(t, 12400)})`, transformOrigin: "0 0" }}>
            <div className="font-display text-[24px] font-extrabold leading-tight tracking-[-0.02em]">See how easy that was?</div>
            <div className="mt-1 text-[16px] text-muted">Every match comes with its reason.</div>
          </div>
        )}
      </div>

      <div className="absolute left-[500px] top-[70px] flex w-[880px] flex-col gap-4">
        {RULE_CARDS.map((c, ci) => {
          const r = res[c.id];
          if (!r || t < c.from) return null;
          const done = t >= checkAt(c.from, c.rules.length) + 100;
          const verdict = c.rules.some(([, , x]) => x === "fail") ? "no" : c.rules.some(([, , x]) => x === "unknown") ? "maybe" : "yes";
          const cat = stubFor(r.category);
          return (
            <div key={c.id} data-hit={`r-c${ci}`} className="relative overflow-hidden rounded-[22px] bg-white p-5 pl-6 shadow-[0_16px_40px_rgba(0,0,0,.08)]" style={{ transform: `scale(${pop(t, c.from)})`, transformOrigin: "0 0" }}>
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: cat.bg }} />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-label text-[11px] uppercase tracking-[.1em] text-muted">{r.provider}</div>
                  <div className="truncate font-display text-[22px] font-bold leading-tight">{r.title}</div>
                </div>
                {done && (
                  <span className={`upop flex-none rounded-full px-3.5 py-1.5 font-label text-[12px] font-semibold uppercase tracking-[.06em] ${verdict === "yes" ? "bg-gold text-ink" : verdict === "maybe" ? "border-2 border-ink text-ink" : "bg-[#ECECE6] text-muted"}`}>
                    {verdict === "yes" ? "You qualify" : verdict === "maybe" ? "One answer away" : "Not a fit"}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.rules.map(([text, , result], i) => {
                  const checked = t >= checkAt(c.from, i);
                  return (
                    <span key={text} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[15px] font-medium transition-colors duration-200 ${!checked ? "border-rule text-muted" : result === "pass" ? "border-ink bg-ink text-white" : result === "fail" ? "border-cardinal text-cardinal line-through decoration-2" : "border-dashed border-ink text-ink"}`}>
                      {checked && (result === "pass" ? <span className="text-gold">{tick}</span> : result === "fail" ? <span className="font-bold no-underline">✕</span> : <span className="font-bold">?</span>)}
                      {text}
                    </span>
                  );
                })}
              </div>
              {c.extra === "ask" && t >= 7000 && (
                <div className="uin mt-3 flex items-center gap-3 rounded-xl bg-paper px-4 py-2.5">
                  <span className="font-label text-[11px] uppercase tracking-[.1em] text-cardinal">Unclaimed asks</span>
                  <span className="text-[16px] font-semibold">{question ?? "How many units are you taking this term?"}</span>
                </div>
              )}
              {c.extra === "why" && t >= 10600 && (
                <div className="uin mt-3 rounded-xl bg-paper px-4 py-2.5 text-[16px]">It&apos;s for Dornsife undergraduates, and your card says Price, Master&apos;s.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

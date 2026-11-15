"use client";

import Link from "next/link";
import Navigator from "@/app/(tabs)/ask/page";
import { TrojanCard } from "@/components/TrojanCard";
import { useStudent } from "@/lib/student";
import { Tilt } from "@site/components/Motion";
import { WRAP } from "@site/components/Shell";

const CAN = [
  "Update your card from plain words",
  "Tell you what a ticket is and how to claim it",
  "Explain why something fits, or why it doesn't",
  "Show what matches your card right now",
];

export default function Ask() {
  const { card, match, fields } = useStudent();
  return (
    <div className={`${WRAP} grid gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_340px]`}>
      <div className="flex min-h-[680px] flex-col overflow-clip rounded-3xl bg-paper shadow-[0_2px_0_#D8CDB8,0_24px_60px_rgba(60,20,10,.12)]">
        <Navigator />
      </div>
      <aside className="flex flex-col gap-5 lg:sticky lg:top-[84px] lg:self-start">
        <div>
          <div className="mb-2 font-label text-xs uppercase tracking-[.16em] text-cardinal">Updates live as you chat</div>
          <Tilt className="rounded-2xl shadow-[0_12px_24px_rgba(92,0,0,.28)]" max={10}><TrojanCard card={card} fields={fields} /></Tilt>
        </div>
        <Link href="/wallet" className="flex items-center justify-between rounded-2xl bg-gold px-5 py-4 shadow-[4px_4px_0_#1A1210]">
          <span>
            <span className="block font-label text-[32px] font-semibold leading-none">{match?.yes.length ?? 0}</span>
            <span className="text-sm">ready to claim{match?.maybe.length ? `, ${match.maybe.length} to confirm` : ""}</span>
          </span>
          <span className="text-sm font-semibold underline">Open wallet</span>
        </Link>
        <div className="rounded-2xl bg-ticket p-5 shadow-[0_1px_0_#D8CDB8]">
          <div className="mb-3 font-label text-xs uppercase tracking-[.16em] text-cardinal">What it can do</div>
          <ul className="flex flex-col gap-2.5 text-[15px] leading-snug">
            {CAN.map((t) => (
              <li key={t} className="flex items-start gap-2.5"><span className="mt-[7px] h-2 w-2 flex-none rounded-full bg-cardinal" />{t}</li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-snug text-muted">It never sends anything for you and never fills in sensitive details.</p>
        </div>
      </aside>
    </div>
  );
}

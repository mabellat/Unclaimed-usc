"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Note, Scallop } from "@/components/bits";
import { QuestionCard } from "@/components/Answer";
import { MaybeCard } from "@/components/MaybeCard";
import { Scoreboard } from "@/components/Scoreboard";
import { TicketCard } from "@/components/TicketCard";
import { api } from "@/lib/api";
import { totalValue, useStudent } from "@/lib/student";
import type { Claim } from "@/lib/types";

export default function Wallet() {
  const { card, match, resources, fields, answer, skip } = useStudent();
  const [claims, setClaims] = useState<Record<string, Claim>>({});
  const [view, setView] = useState<"matches" | "questions">("matches");
  const [query, setQuery] = useState("");
  const yes = match?.yes ?? [];
  const maybe = match?.maybe ?? [];
  const q = match?.next_question;
  const items = view === "matches" ? yes : maybe;
  const visible = items.filter((m) => {
    const r = resources[m.id];
    return r && `${r.title} ${r.provider ?? ""} ${r.benefit?.label ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (card) api.claims(card.id).then((c) => setClaims(Object.fromEntries(c.claims.map((x) => [x.resource_id, x])))).catch(() => {});
  }, [card]);

  return (
    <main>
      <header className="bg-cardinal-dark px-6 pb-6 pt-7 text-ticket">
        <p className="mb-3 font-label text-xs uppercase tracking-[.16em] text-gold">Your support, in one place</p>
        <h1 className="font-display text-4xl font-bold tracking-[-.025em]">My wallet</h1>
        <p className="mt-3 text-sm leading-relaxed text-blush">Based on what you told us. The office will confirm.</p>
        {totalValue(match, resources) > 0 && <details className="mt-4 border-t border-ticket/20 pt-1">
          <summary className="min-h-[44px] cursor-pointer content-center text-sm font-medium text-gold">View published amounts</summary>
          <div className="pt-2"><Scoreboard amount={totalValue(match, resources)} /><p className="text-xs leading-relaxed text-blush">Total of published amounts for matches with no closed deadline. Includes different types of support and award periods; this is not a guaranteed payout.</p></div>
        </details>}
      </header>
      <Scallop color="#5C0000" />

      <div className="px-5 pb-5 pt-6 sm:px-6">
        <div className="mb-5 flex gap-1 rounded-xl border border-rule bg-ticket p-1" role="group" aria-label="Resource view">
          {([ ["matches", "Matches", yes.length], ["questions", "Needs answers", maybe.length] ] as const).map(([key, label, count]) => (
            <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); setQuery(""); }} className={`min-h-[44px] flex-1 rounded-lg px-2 text-sm font-semibold ${view === key ? "bg-cardinal text-ticket" : "text-muted"}`}>
              {label} <span className="ml-1 text-xs">{count}</span>
            </button>
          ))}
        </div>

        {view === "questions" && <>
          <p className="mb-4 text-sm leading-relaxed text-muted">A missing answer isn't a no. Answer only what you're comfortable sharing.</p>
          {q && fields[q.field] && <QuestionCard key={q.field} field={q.field} spec={fields[q.field]} count={q.count} onAnswer={(v) => answer(q.field, v)} onSkip={() => skip(q.field)} />}
        </>}

        {items.length > 0 && <div className="mb-5">
          <label htmlFor="resource-search" className="mb-2 block text-sm font-medium">Search {view === "matches" ? "your matches" : "resources needing answers"}</label>
          <div className="flex gap-2">
            <input id="resource-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, office or support…" className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-sand bg-ticket px-4 text-base" />
            {query && <button type="button" onClick={() => setQuery("")} className="min-h-[44px] px-2 text-sm font-medium text-cardinal underline">Clear</button>}
          </div>
        </div>}

        <p role="status" className="sr-only">{visible.length} {view === "matches" ? "matches" : "resources needing answers"}{query ? ` for ${query}` : ""}</p>
        {visible.length === 0 && <div className="rounded-xl border border-rule bg-ticket p-5">
          <h2 className="font-display text-xl font-bold">{query ? "No results for this search" : view === "matches" ? "Let's find your first match" : "You're all caught up"}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{query ? "Try a different name or clear your search to see everything." : view === "matches" ? "Add what you need to your card, or answer a question to check more resources." : "There are no resources waiting on an answer right now. Update your card whenever your needs change."}</p>
          {!query && (view === "matches" && maybe.length > 0 ? <button type="button" onClick={() => setView("questions")} className="mt-3 min-h-[44px] text-sm font-semibold text-cardinal underline">Check resources needing answers</button> : <Link href="/card" className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Update my card</Link>)}
        </div>}
        {visible.map((m, i) => view === "matches" ? <TicketCard key={m.id} resource={resources[m.id]} claim={claims[m.id]} index={i} /> : <MaybeCard key={m.id} item={m} resource={resources[m.id]} />)}
        <Note className="mt-6" />
      </div>
    </main>
  );
}

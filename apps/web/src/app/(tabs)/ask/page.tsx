"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Kicker, Scallop } from "@/components/bits";
import { api } from "@/lib/api";
import { useStudent } from "@/lib/student";

type Msg = { role: "assistant" | "user"; text: string; tools?: string[]; ticket?: string | null };
const HELLO: Msg = { role: "assistant", text: "Hi, I'm the Navigator. Tell me what's going on in plain words and I'll update your card and find what fits." };
const SUGGESTIONS = ["My landlord won't return my deposit", "I'm going to a conference in March", "I need a laptop for finals", "Groceries are getting expensive"];

export default function Ask() {
  const { card, resources, reload } = useStudent();
  const [chat, setChat] = useState<Msg[]>([HELLO]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chat, busy]);

  async function send(t: string) {
    t = t.trim();
    if (!t || !card || busy) return;
    const history = chat.slice(1).map((m) => ({ role: m.role, text: m.text }));
    setChat((c) => [...c, { role: "user", text: t }]);
    setText("");
    setBusy(true);
    try {
      const r = await api.navigator(card.id, t, history);
      setChat((c) => [...c, { role: "assistant", text: r.reply, tools: r.tools, ticket: r.ticket }]);
      await reload();
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", text: `Sorry, I couldn't reach the Navigator (${e instanceof Error ? e.message : "error"}). Your card wasn't changed.` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-cardinal-dark px-5 pb-3.5 pt-[18px] text-ticket">
        <Kicker className="mb-1 text-gold">Navigator</Kicker>
        <h1 className="font-display text-2xl font-bold leading-[1.1]">Tell me what's going on.</h1>
      </header>
      <Scallop color="#5C0000" />
      <div className="flex flex-1 flex-col justify-end gap-2.5 px-4 pb-2 pt-3" aria-live="polite">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`box-border max-w-[86%] rounded-[14px] px-3.5 py-2.5 ${m.role === "user" ? "bg-cardinal text-ticket" : "bg-ticket text-ink shadow-[0_1px_0_#D8CDB8]"}`}>
              <div className="text-[14.5px] leading-[1.45]">{m.text}</div>
              {m.ticket && resources[m.ticket] && (
                <Link href={`/ticket/${m.ticket}`} className="mt-1.5 inline-flex min-h-[44px] items-center text-sm font-semibold text-cardinal underline">Open {resources[m.ticket].title}</Link>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="upulse self-start rounded-[14px] bg-ticket px-3.5 py-2.5 text-sm text-muted">Thinking...</div>}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-1.5 pt-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => send(s)} className="min-h-[44px] rounded-[22px] border-[1.5px] border-sand bg-ticket px-3 text-[13px] font-medium text-ink disabled:opacity-60">{s}</button>
        ))}
      </div>
      <form className="flex items-center gap-2 px-4 pb-2.5 pt-1" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label htmlFor="chat" className="sr-only">Message the Navigator</label>
        <input id="chat" value={text} onChange={(e) => setText(e.target.value)} placeholder="My landlord won't return my deposit..."
          className="box-border min-h-[46px] min-w-0 flex-1 rounded-xl border-2 border-ink bg-ticket px-3.5 text-[15px] text-ink" />
        <button type="submit" disabled={busy} className="min-h-[46px] rounded-xl bg-cardinal px-[18px] text-[15px] font-semibold text-ticket disabled:opacity-60">Send</button>
      </form>
      <p className="mb-2 px-4 text-center text-[11px] leading-[1.4] text-muted">
        The Navigator understands plain words, and the rules engine decides what fits. It never sets sensitive details.
      </p>
    </main>
  );
}

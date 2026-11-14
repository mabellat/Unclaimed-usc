"use client";

// The student's card, the approved resources and the latest match, shared by every screen.
// The card lives in the API under a pseudonymous id; this browser only remembers the id.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import type { Card, FactValue, FieldSpec, MatchResult, Resource } from "./types";

const ID_KEY = "unclaimed.card";

function readId(): string | null {
  try {
    return localStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}

function writeId(id: string | null) {
  try {
    if (id) localStorage.setItem(ID_KEY, id);
    else localStorage.removeItem(ID_KEY);
  } catch {}
}

interface StudentState {
  ready: boolean;
  error: string | null;
  card: Card | null;
  match: MatchResult | null;
  resources: Record<string, Resource>;
  fields: Record<string, FieldSpec>;
  skipped: string[];
  start: (facts: Record<string, FactValue>, needs: string[]) => Promise<Card>;
  answer: (field: string, value: FactValue) => Promise<void>;
  forget: (field: string) => Promise<void>;
  setNeeds: (needs: string[]) => Promise<void>;
  skip: (field: string) => Promise<void>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  reset: () => Promise<void>;
}

const Ctx = createContext<StudentState | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [resources, setResources] = useState<Record<string, Resource>>({});
  const [fields, setFields] = useState<Record<string, FieldSpec>>({});
  const [skipped, setSkipped] = useState<string[]>([]);

  const rematch = useCallback(async (id: string, skip: string[]) => {
    setMatch(await api.match(id, skip));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [res, f] = await Promise.all([api.resources(), api.fields()]);
        setResources(Object.fromEntries(res.resources.map((r) => [r.id, r])));
        setFields(f.fields);
        const id = readId();
        if (id) {
          try {
            setCard(await api.card(id));
            await rematch(id, []);
          } catch (e) {
            if (e instanceof ApiError && e.status === 404) writeId(null);
            else throw e;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reach the Unclaimed API");
      } finally {
        setReady(true);
      }
    })();
  }, [rematch]);

  const value = useMemo<StudentState>(() => {
    const withCard = async (fn: (id: string) => Promise<Card>) => {
      if (!card) throw new Error("No card yet");
      const next = await fn(card.id);
      setCard(next);
      await rematch(next.id, skipped);
    };
    return {
      ready, error, card, match, resources, fields, skipped,
      start: async (facts, needs) => {
        const c = await api.createCard(facts, needs);
        writeId(c.id);
        setCard(c);
        setSkipped([]);
        await rematch(c.id, []);
        return c;
      },
      answer: (field, v) => withCard((id) => api.setFact(id, field, v)),
      forget: (field) => withCard((id) => api.forgetFact(id, field)),
      setNeeds: (needs) => withCard((id) => api.setNeeds(id, needs)),
      skip: async (field) => {
        if (!card) return;
        const next = [...skipped, field];
        setSkipped(next);
        await rematch(card.id, next);
      },
      refresh: async () => {
        if (card) await rematch(card.id, skipped);
      },
      reload: async () => {
        if (!card) return;
        const c = await api.card(card.id);
        setCard(c);
        await rematch(c.id, skipped);
      },
      reset: async () => {
        if (card) await api.deleteCard(card.id).catch(() => {});
        writeId(null);
        setCard(null);
        setMatch(null);
        setSkipped([]);
      },
    };
  }, [ready, error, card, match, resources, fields, skipped, rematch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudent(): StudentState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudent outside StudentProvider");
  return v;
}

export function totalValue(match: MatchResult | null, resources: Record<string, Resource>): number {
  return (match?.yes ?? []).reduce((n, m) => n + (resources[m.id]?.benefit?.value ?? 0), 0);
}

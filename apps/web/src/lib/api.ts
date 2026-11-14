import type { Alert, Card, Claim, FactValue, FieldSpec, MatchResult, NavReply, Packet, Persona, Resource } from "./types";

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new ApiError(res.status, String(detail));
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  resources: () => call<{ data_version: number | null; resources: Resource[] }>("/resources"),
  fields: () => call<{ fields: Record<string, FieldSpec> }>("/profile/fields"),
  personas: () => call<{ personas: Persona[] }>("/demo/personas"),
  createCard: (facts: Record<string, FactValue>, needs: string[], persona?: string) => call<Card>("/students", json("POST", { facts, needs, persona })),
  card: (id: string) => call<Card>(`/students/${id}`),
  deleteCard: (id: string) => call<void>(`/students/${id}`, json("DELETE")),
  setNeeds: (id: string, needs: string[]) => call<Card>(`/students/${id}/needs`, json("PUT", { needs })),
  setFact: (id: string, field: string, value: FactValue) => call<Card>(`/students/${id}/facts/${field}`, json("PUT", { value })),
  forgetFact: (id: string, field: string) => call<Card>(`/students/${id}/facts/${field}`, json("DELETE")),
  match: (id: string, skip: string[]) => call<MatchResult>(`/students/${id}/match?skip=${encodeURIComponent(skip.join(","))}`),
  claims: (id: string) => call<{ demo_day: number; claims: Claim[] }>(`/students/${id}/claims`),
  markSent: (id: string, rid: string) => call<Claim>(`/students/${id}/claims/${rid}/sent`, json("POST")),
  outcome: (id: string, rid: string, outcome: "received" | "denied" | "waiting") =>
    call<Claim>(`/students/${id}/claims/${rid}/outcome`, json("POST", { outcome })),
  setClock: (id: string, day: number) => call<{ demo_day: number }>(`/students/${id}/clock`, json("PUT", { day })),
  agentStatus: () => call<{ llm: boolean; model: string }>("/agents/status"),
  runUrl: (id: string, rid: string) => `${BASE}/students/${id}/claims/${rid}/run`,
  calendarUrl: (id: string, rid: string) => `${BASE}/students/${id}/claims/${rid}/calendar.ics`,
  claim: (id: string, rid: string) => call<{ stage: string; packet: Packet }>(`/students/${id}/claims/${rid}`),
  navigator: (id: string, message: string, history: { role: string; text: string }[]) =>
    call<NavReply>(`/students/${id}/navigator`, json("POST", { message, history })),
  explain: (id: string, rid: string) =>
    call<{ status: string; relevant: boolean; sentences: string[] }>(`/students/${id}/explain/${rid}`),
  alerts: (id: string) => call<{ demo_day: number; alerts: Alert[] }>(`/students/${id}/alerts`),
};

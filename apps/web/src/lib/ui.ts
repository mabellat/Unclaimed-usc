// Copy and visual mappings shared by screens. Colors come from the prototype tokens.

import type { FactValue, FieldSpec } from "./types";


// Situation chips (needs). Order follows the prototype, extended with the owner's 2026-11-13 needs.
export const NEED_LABELS: [string, string][] = [
  ["money", "Money is tight"],
  ["conference", "Going to a conference"],
  ["research", "Doing research"],
  ["job", "Job or internship hunt"],
  ["housing", "Landlord or lease problem"],
  ["legal", "Need legal advice"],
  ["international", "International student"],
  ["caregiver", "Caring for a child or dependent"],
  ["food", "Groceries are a stretch"],
  ["wellbeing", "Stress or health worries"],
  ["accessibility", "Disability or accommodations"],
  ["academics", "Help with classes or writing"],
  ["transport", "Getting around LA"],
  ["community", "Looking for my community"],
];
export const needLabel = (n: string) => NEED_LABELS.find(([k]) => k === n)?.[1] ?? n;

type Stub = { bg: string; fg: string; label: string; word: string };
// Stub colour, stub label, and the word shown when no amount is published (never an invented amount).
export const CATEGORY: Record<string, Stub> = {
  cash: { bg: "#BDE6D9", fg: "#182522", label: "CASH", word: "FUNDS" },
  scholarship: { bg: "#CDE5E4", fg: "#183F3B", label: "SCHOLAR", word: "AWARD" },
  legal: { bg: "#182522", fg: "#BDE6D9", label: "LEGAL", word: "HELP" },
  career: { bg: "#245F58", fg: "#FFFFFF", label: "CAREER", word: "HELP" },
  basics: { bg: "#E3EBE5", fg: "#183F3B", label: "BASICS", word: "HELP" },
  health: { bg: "#DDF0DD", fg: "#14501F", label: "HEALTH", word: "CARE" },
  jobs: { bg: "#183F3B", fg: "#BDE6D9", label: "JOBS", word: "WORK" },
  academic_support: { bg: "#E3EBE5", fg: "#182522", label: "STUDY", word: "HELP" },
  transportation: { bg: "#182522", fg: "#FFFFFF", label: "TRANSIT", word: "RIDES" },
  support_office: { bg: "#E6EEE8", fg: "#183F3B", label: "SUPPORT", word: "HELP" },
  community: { bg: "#D4EEE4", fg: "#182522", label: "COMMUNITY", word: "HUB" },
  international: { bg: "#182522", fg: "#D6F0E7", label: "INTL", word: "HELP" },
};
export const stubFor = (category: string): Stub => CATEGORY[category] ?? CATEGORY.basics;

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// "Dornsife (letters, arts and sciences)" -> "Dornsife"
export const shortLabel = (label: string) => label.split(" (")[0];

export function answerLabel(spec: FieldSpec | undefined, value: FactValue): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const one = (v: string) => (spec?.labels?.[v] ? shortLabel(spec.labels[v]) : v);
  return Array.isArray(value) ? (value.length ? value.map(one).join(", ") : "None of these") : one(value);
}

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function prettyDate(iso: string | null): string {
  if (!iso) return "";
  // A bare date is a calendar day; a full timestamp is shown in the student's own time zone.
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** The ticket pill for a deadline: closed, due soon (14 days or less), or the label as published. */
export function deadlinePill(d: { label: string; date: string | null; closed: boolean; days_left: number | null } | null) {
  if (!d) return { text: "No deadline posted", tone: "plain" as const };
  if (d.closed) return { text: "Closed", tone: "closed" as const };
  if (d.date && d.days_left !== null && d.days_left <= 14) {
    const day = prettyDate(d.date).replace(/, \d{4}$/, "");
    const left = d.days_left === 0 ? "today" : d.days_left === 1 ? "1 day left" : `${d.days_left} days left`;
    return { text: `Due ${day} · ${left}`, tone: "urgent" as const };
  }
  return { text: d.label, tone: "plain" as const };
}

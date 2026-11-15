// Copy and visual mappings shared by screens. Category colours are the minimal theme's accents.

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
// Every category colour is a shade of USC cardinal, gold or black, so the wallet stays on brand.
export const CATEGORY: Record<string, Stub> = {
  cash: { bg: "#FFC72C", fg: "#111111", label: "CASH", word: "Funds" },
  scholarship: { bg: "#9D2235", fg: "#FFFFFF", label: "SCHOLAR", word: "Award" },
  legal: { bg: "#111111", fg: "#FFFFFF", label: "LEGAL", word: "Legal help" },
  career: { bg: "#C8475E", fg: "#FFFFFF", label: "CAREER", word: "Career help" },
  basics: { bg: "#D9A400", fg: "#111111", label: "BASICS", word: "Basics" },
  health: { bg: "#6E1423", fg: "#FFFFFF", label: "HEALTH", word: "Care" },
  jobs: { bg: "#FFDF7A", fg: "#111111", label: "JOBS", word: "Paid work" },
  academic_support: { bg: "#4A4A4A", fg: "#FFFFFF", label: "STUDY", word: "Study help" },
  transportation: { bg: "#8C8C8C", fg: "#FFFFFF", label: "TRANSIT", word: "Rides" },
  support_office: { bg: "#E6A3B0", fg: "#111111", label: "SUPPORT", word: "Support" },
  community: { bg: "#B8860B", fg: "#FFFFFF", label: "COMMUNITY", word: "Community" },
  international: { bg: "#5A0F1C", fg: "#FFC72C", label: "INTL", word: "Intl help" },
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

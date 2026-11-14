// Shapes returned by the Unclaimed API (apps/api). Field names match the API exactly.

export type FieldType = "bool" | "enum" | "multi";
export type FactValue = boolean | string | string[];

export interface FieldSpec {
  type: FieldType;
  question: string;
  values?: string[];
  labels?: Record<string, string>;
  sensitive?: boolean;
  why?: string;
  office_verifies?: boolean;
}

export interface Criterion {
  kind: "rule" | "office" | null;
  field?: string | null;
  op?: string | null;
  value?: FactValue | null;
  text: string;
  evidence_quote?: string | null;
}

export interface Resource {
  id: string;
  title: string;
  provider: string | null;
  category: string;
  benefit: { label: string | null; value: number | null; period: string | null } | null;
  eligibility: Criterion[];
  relevance: string[];
  deadline: { label: string } | null;
  conflicts: { field: string; versions: { source_url: string; value: string | number; quote: string }[] }[];
  academic_year: string | null;
  where: string | null;
  steps: { text: string }[];
  docs: { text: string }[];
  note: string | null;
  source_url: string;
  evidence_quote: string;
  last_verified: string | null;
  data_version: number;
}

export interface MatchItem {
  id: string;
  status: "yes" | "maybe" | "no";
  why: { field: string | null; text: string }[];
  unknown: string[];
  office_decides: string[];
  basis: string | null;
  data_version: number;
}

export interface NextQuestion extends FieldSpec {
  field: string;
  count: number;
}

export interface MatchResult {
  data_version: number | null;
  needs: string[];
  yes: MatchItem[];
  maybe: MatchItem[];
  no: MatchItem[];
  next_question: NextQuestion | null;
}

export interface Card {
  id: string;
  needs: string[];
  facts: Record<string, FactValue>;
  demo_day: number;
}

export interface Claim {
  resource_id: string;
  title: string;
  value: number | null;
  stage: "Drafted" | "Sent" | "In review" | "Received";
  stage_index: number;
  sent_day: number | null;
  outcome: "received" | "denied" | "waiting" | null;
  simulated: boolean;
}

export interface Alert {
  key: string;
  day?: number;
  date?: string;
  diff?: { field: string; old: string; new: string }[];
  versions?: { source_url: string; value: string | number; quote: string }[];
  ask_outcome?: boolean;
  simulated: boolean;
  tag: string;
  tone: "ink" | "gold" | "cardinal" | "green";
  title: string;
  body: string;
  quote?: string;
  resource_id: string | null;
  cta?: string;
  go?: string;
}

export interface Persona {
  id: string;
  summary: string;
  facts: Record<string, FactValue>;
  needs: string[];
}

export interface TraceEvent {
  node: string;
  label: string;
  tools: { name: string; summary: string }[];
  result: string;
  passed?: boolean;
  issues?: { where: string; problem: string }[];
  mode?: string;
  status?: string;
}

export interface ChecklistItem {
  kind: "step" | "prepare" | "office" | "confirm" | "deadline";
  text: string;
  evidence_quote?: string;
  evidence_level?: "item" | "record";
  office_verifies?: boolean;
}

export interface Packet {
  resource_id: string;
  title: string;
  provider: string | null;
  data_version: number;
  source_url: string;
  verified_at: string;
  source_check: { status: "verified" | "changed" | "unreadable" | "unreachable" | "blocked"; detail: string };
  checklist: ChecklistItem[];
  draft: { subject: string; greeting: string; closing: string; text: string; mode: "claude" | "template"; sentences: { text: string; cites: string[] }[] };
  catalog: Record<string, string>;
  grounding: { passed: boolean; checked: number };
  deadline: { label: string | null; date: string | null };
  has_calendar: boolean;
  reminder: { date: string | null; text: string };
  where: string | null;
  basis: string | null;
}

export interface NavReply {
  reply: string;
  tools: string[];
  ticket: string | null;
  mode: "claude" | "rules";
}

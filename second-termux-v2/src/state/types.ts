// Session type definitions — single contract, used by state, ops, format, server.

export type SessionStatus =
  | "running"
  | "finished"
  | "failed"
  | "killed"
  | "stopped"
  | "timed_out"
  | "healed";

export interface SessionMeta {
  name: string;
  command: string;
  cwd: string;
  pid: number | null;
  sid: number | null;
  status: SessionStatus;
  started_at: string; // ISO 8601 UTC
  finished_at: string | null;
  exit_code: number | null;
  ttl: number | null; // seconds
  tags: string[]; // semantic labels: ["build", "test", "lint"]
  parent: string | null; // parent session name (for restart chains)
  heal_attempts: number;
  duration_ms: number | null;
  host: string;
}

export interface SessionView {
  name: string;
  status: SessionStatus;
  pid: number | null;
  command: string;
  exit_code: number | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  cwd: string;
  tags: string[];
  heal_attempts: number;
}

export interface SpawnArgs {
  name: string;
  command: string;
  cwd?: string;
  ttl?: number;
  tags?: string[];
}

export interface StartResult {
  name: string;
  pid: number;
  status: "running";
  started_at: string;
}

export interface StopResult {
  name: string;
  status: SessionStatus;
  duration_ms: number;
}

export interface HealResult {
  applied: boolean;
  detail: string;
  fix_skill?: string;
  fix_pattern?: string;
  risk_score?: number;
}

export interface JobResult {
  name: string;
  exit_code: number;
  duration_ms: number;
  status: SessionStatus;
}

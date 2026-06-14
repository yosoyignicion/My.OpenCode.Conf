// Process helpers — PID/SID existence checks, killpg, signal-group operations.

import { kill } from "node:process";

export function pidExists(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function sidExists(sid: number): boolean {
  return pidExists(sid); // SID is just a PID under POSIX
}

export function killProcess(pid: number, signal: NodeJS.Signals = "SIGTERM"): boolean {
  try {
    kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

export function killProcessGroup(sid: number, signal: NodeJS.Signals = "SIGTERM"): boolean {
  try {
    process.kill(-sid, signal); // negative PID = process group
    return true;
  } catch {
    return false;
  }
}

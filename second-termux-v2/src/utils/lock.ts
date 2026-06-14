// Lock via O_EXCL file creation. POSIX-portable, zero-deps, atomic.
//
// We do NOT use flock(2) because Node's stdlib only exposes flockSync
// behind an experimental flag in some versions. O_EXCL atomic-create
// is a well-defined POSIX primitive and works the same on Linux/macOS/BSD.

import { openSync, closeSync, mkdirSync, statSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";
import { LOCKS_DIR } from "../state/paths.js";

export class LockTimeoutError extends Error {
  constructor(public resource: string, public waited_ms: number) {
    super(`lock timeout: could not acquire '${resource}' after ${waited_ms}ms`);
  }
}

mkdirSync(LOCKS_DIR, { recursive: true });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Track which lockfile path each fd owns, for proper cleanup on release.
const fdToPath = new Map<number, string>();

/** Acquire an exclusive lock by atomically creating a sentinel file. */
export async function acquire(resource: string, timeout_ms = 5000): Promise<number> {
  const lockFile = join(LOCKS_DIR, `${resource}.lock`);
  const start = Date.now();

  const cleanupStale = () => {
    try {
      const stat = statSync(lockFile);
      if (Date.now() - stat.mtimeMs > 30_000) {
        try { unlinkSync(lockFile); } catch { /* */ }
      }
    } catch {
      /* gone */
    }
  };

  while (true) {
    cleanupStale();
    try {
      const fd = openSync(lockFile, "wx");
      writeSync(fd, `${process.pid}\n`);
      fdToPath.set(fd, lockFile);
      return fd;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") throw e;
      if (Date.now() - start >= timeout_ms) {
        throw new LockTimeoutError(resource, timeout_ms);
      }
      await sleep(5 + Math.random() * 15);
    }
  }
}

/** Release a previously-acquired lock. */
export async function release(fd: number): Promise<void> {
  const lockFile = fdToPath.get(fd);
  fdToPath.delete(fd);
  try {
    closeSync(fd);
  } catch {
    /* already closed */
  }
  if (lockFile) {
    try {
      unlinkSync(lockFile);
    } catch {
      /* already gone or owned by another process */
    }
  }
}

/** Async one-shot critical section. */
export async function withLock<T>(resource: string, fn: () => Promise<T> | T, timeout_ms = 5000): Promise<T> {
  const fd = await acquire(resource, timeout_ms);
  try {
    return await fn();
  } finally {
    await release(fd);
  }
}

/** Type helper: withLock always returns Promise<T> even if fn is sync. */
export type Locked<T> = Promise<T>;

/** Sync convenience (best-effort, no wait). For startup paths. */
export function tryLockSync(resource: string): number | null {
  const lockFile = join(LOCKS_DIR, `${resource}.lock`);
  try {
    return openSync(lockFile, "wx");
  } catch {
    return null;
  }
}

/** Release a sync lock by closing the fd AND unlinking the file. */
export function releaseSync(resource: string, fd: number): void {
  try { closeSync(fd); } catch { /* */ }
  try { unlinkSync(join(LOCKS_DIR, `${resource}.lock`)); } catch { /* */ }
}

/**
 * Synchronous withLock — short-lived, no waiting. Returns null on contention.
 * Use ONLY for fast read-modify-write on already-running sessions where
 * the caller can retry on null.
 */
export function withLockSync<T>(resource: string, fn: () => T): T | null {
  const fd = tryLockSync(resource);
  if (fd === null) return null;
  const lockFile = join(LOCKS_DIR, `${resource}.lock`);
  try {
    return fn();
  } finally {
    try { closeSync(fd); } catch { /* */ }
    try { unlinkSync(lockFile); } catch { /* */ }
  }
}

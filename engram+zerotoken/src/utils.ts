import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export function generateId(): string { return randomUUID() }
export function getGlobalDir(): string { return join(homedir(), '.engram') }
export function getGlobalDbPath(): string { return join(getGlobalDir(), '.engram.db') }
export function getProjectDir(basePath: string): string { return resolve(basePath, '.engram') }
export function getProjectDbPath(basePath: string): string { return join(getProjectDir(basePath), '.engram.db') }

export function approximateTokens(text: string): number {
  return Math.ceil(new TextEncoder().encode(text).length / 3.5)
}

export function nowISO(): string { return new Date().toISOString() }

export function sanitizeFtsQuery(query: string): string {
  const terms = query.replace(/['"*()^$~:;@#\\/\\[\\]]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map(t => `"${t.replace(/"/g, '""')}"`)
  return terms.length ? terms.join(' AND ') : ''
}

export function clampImportance(v: number): number {
  return Math.max(0, Math.min(1, v))
}

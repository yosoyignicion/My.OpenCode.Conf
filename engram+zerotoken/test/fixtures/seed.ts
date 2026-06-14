import { Database } from "bun:sqlite"
import type { MemoryRecord, MemoryType, MemorySource } from "../../src/types.js"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

export type TestDb = Database

const DAY_MS = 24 * 3600_000

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString()
}

export interface Relation {
  id: string
  observation_id: string
  entity_id: string
  relation_type: string
  created_at: string
}

export const sampleRecords: MemoryRecord[] = [
  {
    id: "rec-config-1",
    title: "API Key en .env.local",
    content: "La API key de Stripe está en .env.local — nunca commitear al repo",
    type: "config",
    source: "manual",
    importance: 0.9,
    access_count: 50,
    last_accessed_at: daysAgo(0),
    created_at: daysAgo(7),
    updated_at: null,
  },
  {
    id: "rec-arch-1",
    title: "Arquitectura del backend",
    content: "El backend usa Drogon C++20 con SQLite + FTS5. Frontend en Next.js 16.",
    type: "architecture",
    source: "tool",
    importance: 0.85,
    access_count: 12,
    last_accessed_at: daysAgo(1),
    created_at: daysAgo(30),
    updated_at: null,
  },
  {
    id: "rec-err-1",
    title: "Error: timeout PostgreSQL",
    content: "Error de conexión a PostgreSQL: timeout. Solución: aumentar pool_size a 20",
    type: "error_solution",
    source: "auto_error_fix",
    importance: 0.7,
    access_count: 3,
    last_accessed_at: daysAgo(10),
    created_at: daysAgo(90),
    updated_at: null,
  },
  {
    id: "rec-gen-1",
    title: "Prefiere commits atómicos",
    content: "El usuario prefiere commits atómicos con mensajes en español",
    type: "preference",
    source: "manual",
    importance: 0.95,
    access_count: 25,
    last_accessed_at: daysAgo(0),
    created_at: daysAgo(365),
    updated_at: null,
  },
  {
    id: "rec-conv-1",
    title: "Sesión: revisión inicial",
    content: "Revisión del proyecto FoundryCast: backend compila OK, frontend nunca se ejecutó",
    type: "conversation",
    source: "auto_compaction",
    importance: 0.3,
    access_count: 0,
    last_accessed_at: null,
    created_at: daysAgo(1),
    updated_at: null,
  },
]

export const sampleRelations: Relation[] = [
  { id: "rel-1", observation_id: "rec-config-1", entity_id: "ent-stripe", relation_type: "mentions", created_at: daysAgo(7) },
  { id: "rel-2", observation_id: "rec-arch-1",  entity_id: "ent-stripe", relation_type: "mentions", created_at: daysAgo(30) },
  { id: "rel-3", observation_id: "rec-arch-1",  entity_id: "ent-drogon", relation_type: "mentions", created_at: daysAgo(30) },
]

export function createTestDb(): Database {
  const db = new Database(":memory:")
  db.exec("PRAGMA journal_mode = MEMORY")
  db.exec(`
    CREATE TABLE observations (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general', source TEXT NOT NULL DEFAULT 'manual',
      importance REAL NOT NULL DEFAULT 1.0, access_count INTEGER NOT NULL DEFAULT 0,
      last_accessed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT
    );
    CREATE TABLE entities (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, entity_type TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE relations (
      id TEXT PRIMARY KEY, observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(observation_id, entity_id, relation_type)
    );
  `)
  return db
}

export function seedDecayFixtures(db: Database): MemoryRecord[] {
  const stmt = db.prepare(`
    INSERT INTO observations (id, title, content, type, source, importance, access_count, last_accessed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const r of sampleRecords) {
    stmt.run(
      r.id, r.title, r.content, r.type, r.source,
      r.importance, r.access_count, r.last_accessed_at, r.created_at, r.updated_at
    )
  }
  return sampleRecords
}

export function makeRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: overrides.id ?? `test-${Math.random().toString(36).slice(2, 10)}`,
    title: overrides.title ?? "Test record",
    content: overrides.content ?? "Contenido de prueba",
    type: (overrides.type ?? "general") as MemoryType,
    source: (overrides.source ?? "manual") as MemorySource,
    importance: overrides.importance ?? 0.7,
    access_count: overrides.access_count ?? 0,
    last_accessed_at: overrides.last_accessed_at ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? null,
  }
}

export function tempDir(prefix = "engram-test-"): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

export function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

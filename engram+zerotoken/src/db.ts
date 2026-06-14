import { Database } from 'bun:sqlite'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { getProjectDbPath } from './utils.js'

export class DatabaseManager {
  private globalDb: Database
  private projectDb: Database | null = null

  constructor(globalPath: string) {
    ensureDir(dirname(globalPath))
    this.globalDb = new Database(globalPath)
    this.globalDb.run('PRAGMA journal_mode = WAL')
    runMigrations(this.globalDb)
  }

  initProject(projectPath: string | null): void {
    if (this.projectDb) { this.projectDb.close(); this.projectDb = null }
    if (!projectPath) return
    const dbPath = getProjectDbPath(projectPath)
    ensureDir(dirname(dbPath))
    this.projectDb = new Database(dbPath)
    this.projectDb.run('PRAGMA journal_mode = WAL')
    runMigrations(this.projectDb)
  }

  all(
    sql: string, params: unknown[] = [], scope: 'global' | 'project' | 'both' = 'both'
  ): unknown[] {
    const results: unknown[] = []
    if (scope !== 'project') results.push(...this.globalDb.query(sql).all(...params))
    if (scope !== 'global' && this.projectDb) results.push(...this.projectDb.query(sql).all(...params))
    return results
  }

  run(sql: string, params: unknown[] = [], scope: 'global' | 'project'): void {
    const db = scope === 'global' ? this.globalDb : this.projectDb
    if (!db) throw new Error(`DB not available for scope: ${scope}`)
    db.run(sql, ...params)
  }

  get(sql: string, params: unknown[] = [], scope: 'global' | 'project'): unknown {
    const db = scope === 'global' ? this.globalDb : this.projectDb
    return db?.query(sql).get(...params) ?? null
  }

  close(): void {
    this.globalDb.close()
    this.projectDb?.close()
  }
}

function runMigrations(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', source TEXT NOT NULL DEFAULT 'manual',
    importance REAL NOT NULL DEFAULT 1.0, access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT
  )`)
  db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
    title, content, type, tokenize='trigram', content=observations, content_rowid=rowid
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, entity_type TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY, observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(observation_id, entity_id, relation_type)
  )`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_observations_source ON observations(source)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_observations_importance ON observations(importance)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at)`)

  const hasTriggers = !!db.query(
    `SELECT name FROM sqlite_master WHERE type='trigger' AND name='observations_ai'`
  ).get()
  if (!hasTriggers) {
    db.run(`CREATE TRIGGER observations_ai AFTER INSERT ON observations BEGIN
      INSERT INTO observations_fts(rowid, title, content, type) VALUES (new.rowid, new.title, new.content, new.type);
    END`)
    db.run(`CREATE TRIGGER observations_ad AFTER DELETE ON observations BEGIN
      INSERT INTO observations_fts(observations_fts, rowid, title, content, type)
      VALUES ('delete', old.rowid, old.title, old.content, old.type);
    END`)
    db.run(`CREATE TRIGGER observations_au AFTER UPDATE ON observations BEGIN
      INSERT INTO observations_fts(observations_fts, rowid, title, content, type)
      VALUES ('delete', old.rowid, old.title, old.content, old.type);
      INSERT INTO observations_fts(rowid, title, content, type) VALUES (new.rowid, new.title, new.content, new.type);
    END`)
  }

  db.run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`)
  db.run(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')`
  )
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

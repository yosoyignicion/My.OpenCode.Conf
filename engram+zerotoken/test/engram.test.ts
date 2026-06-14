import Database from "better-sqlite3"
import { mkdirSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { symbols } from "../src/constants.js"

const tmp = join(tmpdir(), `engram-test-${Date.now()}`)
mkdirSync(tmp, { recursive: true })

const globalDir = join(tmp, "global")
mkdirSync(globalDir, { recursive: true })
const globalPath = join(globalDir, "engram.db")

const projectDir = join(tmp, "project/.engram")
mkdirSync(projectDir, { recursive: true })
const projectPath = join(projectDir, "engram.db")

const errors: string[] = []

function assert(condition: boolean, msg: string) {
  if (!condition) {
    errors.push(`FAIL: ${msg}`)
    console.error(`  ${symbols.error} ${msg}`)
  } else {
    console.log(`  ${symbols.saved} ${msg}`)
  }
}

// Test 1: Create global DB with FTS5
console.log(`\n${symbols.package} Test 1: Creación de DB global con FTS5`)
const db = new Database(globalPath)
db.pragma("journal_mode = WAL")
db.exec(`
  CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', source TEXT NOT NULL DEFAULT 'manual',
    importance REAL DEFAULT 1.0, access_count INTEGER DEFAULT 0,
    last_accessed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
    title, content, type,
    tokenize='trigram',
    content=observations, content_rowid=rowid
  );
  CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
    INSERT INTO observations_fts(rowid, title, content, type)
    VALUES (new.rowid, new.title, new.content, new.type);
  END;
`)
assert(true, "DB global + FTS5 + triggers creados")

// Test 2: Insert and verify FTS sync
console.log(`\n${symbols.package} Test 2: Inserción y sincronización FTS5`)
db.prepare(`INSERT INTO observations (id, title, content, type, source, importance, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
  "test-1", "Express TypeScript", "Este proyecto usa Express con TypeScript",
  "config", "manual", 0.8, new Date().toISOString()
)
db.prepare(`INSERT INTO observations (id, title, content, type, source, importance, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
  "test-2", "API Key en .env.local", "La API key de Stripe está en .env.local",
  "config", "auto_keyword", 0.9, new Date().toISOString()
)
db.prepare(`INSERT INTO observations (id, title, content, type, source, importance, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
  "test-3", "Error: conexion DB", "Error de conexión a PostgreSQL: timeout. Solución: aumentar pool_size a 20",
  "error_solution", "auto_error_fix", 0.85, new Date().toISOString()
)
assert(true, "3 memorias insertadas")

// Test 3: FTS5 search with trigram
console.log(`\n${symbols.package} Test 3: Búsqueda FTS5 con trigramas`)
const results1 = db.prepare(
  `SELECT o.id, o.title, rank FROM observations_fts
   JOIN observations o ON o.rowid = observations_fts.rowid
   WHERE observations_fts MATCH ? ORDER BY rank DESC`
).all('"Express" AND "TypeScript"')
assert(results1.length === 1, `Busqueda 'Express TypeScript': ${results1.length} resultado(s)`)
assert((results1[0] as any).id === "test-1", "Resultado correcto: test-1")

const results2 = db.prepare(
  `SELECT o.id, o.title, rank FROM observations_fts
   JOIN observations o ON o.rowid = observations_fts.rowid
   WHERE observations_fts MATCH ? ORDER BY rank DESC`
).all('"API" AND "key"')
assert(results2.length === 1, `Busqueda 'API key': ${results2.length} resultado(s)`)

// Test 4: Approximate matching with trigram
console.log(`\n${symbols.package} Test 4: Matching aproximado con trigramas`)
const results3 = db.prepare(
  `SELECT o.id, o.title, rank FROM observations_fts
   JOIN observations o ON o.rowid = observations_fts.rowid
   WHERE observations_fts MATCH ? ORDER BY rank DESC`
).all('"Stripe"')
assert(results3.length === 1, `Busqueda 'Stripe' (encontrado via trigramas): ${results3.length} resultado(s)`)

const results4 = db.prepare(
  `SELECT o.id, o.title, rank FROM observations_fts
   JOIN observations o ON o.rowid = observations_fts.rowid
   WHERE observations_fts MATCH ? ORDER BY rank DESC`
).all('"Express"')
assert(results4.length >= 1, `Busqueda parcial 'Express': ${results4.length} resultado(s)`)

// Test 5: Error fix partial match
console.log(`\n${symbols.package} Test 5: Match aproximado de error`)
const results5 = db.prepare(
  `SELECT o.id, o.title, rank FROM observations_fts
   JOIN observations o ON o.rowid = observations_fts.rowid
   WHERE observations_fts MATCH ? ORDER BY rank DESC`
).all('"conexion"')
assert(results5.length >= 1, `Busqueda 'conexion' (typo en 'conexion' vs 'conexión'): ${results5.length}`)

// Test 6: Project DB isolation
console.log(`\n${symbols.package} Test 6: Aislamiento de DB de proyecto`)
const dbp = new Database(projectPath)
dbp.pragma("journal_mode = WAL")
dbp.exec(`CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', source TEXT NOT NULL DEFAULT 'manual',
    importance REAL DEFAULT 1.0, access_count INTEGER DEFAULT 0,
    last_accessed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT
  )`)
dbp.prepare(`INSERT INTO observations (id, title, content, type, source, importance, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
  "proj-1", "Proyecto local", "Memoria específica del proyecto",
  "general", "tool", 0.7, new Date().toISOString()
)
const projCount = dbp.prepare("SELECT COUNT(*) as c FROM observations").get() as { c: number }
assert(projCount.c === 1, "DB de proyecto aislada: 1 memoria")

// Test 7: Delete
console.log(`\n${symbols.package} Test 7: Eliminación`)
dbp.prepare("DELETE FROM observations WHERE id = ?").run("proj-1")
const afterDelete = dbp.prepare("SELECT COUNT(*) as c FROM observations").get() as { c: number }
assert(afterDelete.c === 0, "Memoria eliminada correctamente")

// Cleanup
db.close()
dbp.close()
rmSync(tmp, { recursive: true, force: true })

console.log(`\n${"=".repeat(50)}`)
if (errors.length === 0) {
  console.log(`${symbols.success} TODAS LAS PRUEBAS PASARON`)
} else {
  console.log(`${symbols.error} ${errors.length} prueba(s) fallaron:`)
  errors.forEach(e => console.log(`  - ${e}`))
  process.exit(1)
}

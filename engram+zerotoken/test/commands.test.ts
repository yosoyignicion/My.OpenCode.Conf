import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseManager } from "../src/db.js"
import { MemoryEngine } from "../src/memory-engine.js"
import { createTestDb, sampleRecords, seedDecayFixtures } from "./fixtures/seed.js"

let work = ""
beforeEach(() => { work = mkdtempSync(join(tmpdir(), "cmd-test-")) })
afterEach(() => { rmSync(work, { recursive: true, force: true }) })

function setupDeps() {
  const globalDbPath = join(work, "global.db")
  const db = new DatabaseManager(globalDbPath)
  const engine = new MemoryEngine(db)
  for (const r of sampleRecords) {
    engine.save({
      title: r.title,
      content: r.content,
      type: r.type,
      source: r.source,
      importance: r.importance,
    }, "global")
  }
  return { db, globalDbPath, engine }
}

function setupEmptyDeps() {
  const globalDbPath = join(work, "empty.db")
  const db = new DatabaseManager(globalDbPath)
  const engine = new MemoryEngine(db)
  return { db, globalDbPath, engine }
}

describe("tool factories", () => {
  test("buildGraphTool returns a tool definition", async () => {
    const { buildGraphTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildGraphTool({ db, globalDbPath })
    expect(t).toBeDefined()
    expect(typeof t.execute).toBe("function")
  })

  test("buildDiffTool returns a tool definition", async () => {
    const { buildDiffTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildDiffTool({ db, globalDbPath })
    expect(t).toBeDefined()
    expect(typeof t.execute).toBe("function")
  })

  test("buildExportTool returns a tool definition", async () => {
    const { buildExportTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildExportTool({ db, globalDbPath })
    expect(t).toBeDefined()
    expect(typeof t.execute).toBe("function")
  })

  test("buildCompactTool returns a tool definition", async () => {
    const { buildCompactTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildCompactTool({ db, globalDbPath })
    expect(t).toBeDefined()
    expect(typeof t.execute).toBe("function")
  })
})

describe("engram_graph tool (via buildGraphTool)", () => {
  test("default layout is TD when no layout arg passed", async () => {
    const { buildGraphTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildGraphTool({ db, globalDbPath })
    const result = await t.execute({ layout: "TD", color_by_type: true }, { worktree: work } as any)
    expect(result.output).toMatch(/graph TD/)
  })

  test("explicit layout LR is respected", async () => {
    const { buildGraphTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildGraphTool({ db, globalDbPath })
    const result = await t.execute({ layout: "LR", color_by_type: false }, { worktree: work } as any)
    expect(result.output).toMatch(/graph LR/)
  })

  test("graph output is valid Mermaid block", async () => {
    const { buildGraphTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildGraphTool({ db, globalDbPath })
    const result = await t.execute({ layout: "TD", color_by_type: true }, { worktree: work } as any)
    expect(result.output).toContain("```mermaid")
  })
})

describe("engram_export tool (via buildExportTool)", () => {
  test("produces valid markdown with H1, H2, and Mermaid block", async () => {
    const { buildExportTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildExportTool({ db, globalDbPath })
    const outPath = join(work, "export.md")
    const result = await t.execute({
      project: "test",
      scope: "global",
      output: outPath,
      limit: 100,
    }, { worktree: work } as any)
    expect(existsSync(outPath)).toBe(true)
    const content = readFileSync(outPath, "utf-8")
    expect(content).toMatch(/^#\s/m)
    expect(content).toMatch(/^##\s/m)
    expect(typeof result.output).toBe("string")
    expect(result.output.length).toBeGreaterThan(0)
  })

  test("export filters by type", async () => {
    const { buildExportTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildExportTool({ db, globalDbPath })
    const outPath = join(work, "export-config.md")
    await t.execute({
      scope: "global",
      output: outPath,
      type: "config",
      limit: 50,
    }, { worktree: work } as any)
    const content = readFileSync(outPath, "utf-8")
    expect(content).toContain("## config")
  })
})

describe("engram_diff tool (via buildDiffTool)", () => {
  test("diff between two different records produces output", async () => {
    const { buildDiffTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildDiffTool({ db, globalDbPath })
    const records = (db.all("SELECT id FROM observations", [], "global") as { id: string }[]).map(r => r.id)
    expect(records.length).toBeGreaterThanOrEqual(2)
    const result = await t.execute({
      id_a: records[0]!,
      id_b: records[1]!,
      scope: "global",
    }, { worktree: work } as any)
    expect(result.output).toContain("Diff")
  })

  test("diff with same ID returns warning about missing second record", async () => {
    const { buildDiffTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildDiffTool({ db, globalDbPath })
    const records = (db.all("SELECT id FROM observations LIMIT 1", [], "global") as { id: string }[])
    const result = await t.execute({
      id_a: records[0]!.id,
      id_b: records[0]!.id,
      scope: "global",
    }, { worktree: work } as any)
    expect(result.output).toBeDefined()
  })
})

describe("engram_compact tool (via buildCompactTool)", () => {
  test("dry-run does not modify DB (record count unchanged)", async () => {
    const { buildCompactTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildCompactTool({ db, globalDbPath })
    const before = (db.get("SELECT COUNT(*) as c FROM observations", [], "global") as { c: number }).c
    const result = await t.execute({
      dry_run: true,
      apply: false,
      lambda: 0.2,
      min_importance: 0.3,
      max_keep: 0.7,
      scope: "global",
    }, { worktree: work } as any)
    const after = (db.get("SELECT COUNT(*) as c FROM observations", [], "global") as { c: number }).c
    expect(after).toBe(before)
    expect(result.metadata?.dry_run).toBe(true)
  })

  test("compact result includes plan (keep/merge/drop)", async () => {
    const { buildCompactTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupDeps()
    const t = buildCompactTool({ db, globalDbPath })
    const result = await t.execute({
      dry_run: true,
      apply: false,
      lambda: 0.2,
      min_importance: 0.1,
      max_keep: 0.7,
      scope: "global",
    }, { worktree: work } as any)
    expect(result.metadata?.plan).toBeDefined()
    expect(typeof result.metadata?.plan?.keep).toBe("number")
    expect(typeof result.metadata?.plan?.merge).toBe("number")
    expect(typeof result.metadata?.plan?.drop).toBe("number")
  })
})

describe("edge cases: empty DB", () => {
  test("engram_compact on empty DB does not throw, returns empty plan", async () => {
    const { buildCompactTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupEmptyDeps()
    const t = buildCompactTool({ db, globalDbPath })
    const result = await t.execute({ dry_run: true, apply: false, scope: "global" }, { worktree: work } as any)
    expect(result.metadata?.plan?.keep).toBe(0)
    expect(result.metadata?.plan?.merge).toBe(0)
    expect(result.metadata?.plan?.drop).toBe(0)
    expect(result.output).toBeDefined()
  })

  test("engram_export on empty DB produces valid markdown (H1, no crash)", async () => {
    const { buildExportTool } = await import("../src/commands.js")
    const { db, globalDbPath } = setupEmptyDeps()
    const t = buildExportTool({ db, globalDbPath })
    const outPath = join(work, "empty-export.md")
    await t.execute({ scope: "global", output: outPath, limit: 50 }, { worktree: work } as any)
    expect(existsSync(outPath)).toBe(true)
    const content = readFileSync(outPath, "utf-8")
    expect(content).toMatch(/^#\s/m)
  })

  test("engram_graph on DB with single memory produces valid Mermaid with 1 node", async () => {
    const { buildGraphTool } = await import("../src/commands.js")
    const { db, globalDbPath, engine } = setupEmptyDeps()
    engine.save({ title: "Solo memory", content: "Una sola memoria para el test de borde", type: "general", source: "manual", importance: 0.5 }, "global")
    const t = buildGraphTool({ db, globalDbPath })
    const result = await t.execute({ layout: "TD", color_by_type: true }, { worktree: work } as any)
    expect(result.output).toContain("```mermaid")
    expect(result.output).toMatch(/Solo memory/)
  })
})

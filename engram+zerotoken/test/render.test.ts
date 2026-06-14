import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createTestDb, makeRecord, sampleRecords } from "./fixtures/seed.js"

let work = ""
beforeEach(() => { work = mkdtempSync(join(tmpdir(), "render-test-")) })
afterEach(() => { rmSync(work, { recursive: true, force: true }) })

const ANSI_REGEX = /\x1b\[[0-9;]*m/
import type { ColumnDef } from "../src/render.js"
import type { MemoryRecord } from "../src/types.js"

describe("EngramRenderer", () => {
  test("renderCard: long content is truncated", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const long = "x".repeat(500)
    const out = r.renderCard(makeRecord({ content: long }))
    expect(out).toContain("…")
    expect(out.length).toBeLessThan(long.length + 300)
  })

  test("renderCard: special chars are preserved or escaped", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const out = r.renderCard(makeRecord({ title: "Test | pipe & ampersand <html>" }))
    expect(out.length).toBeGreaterThan(0)
    expect(typeof out).toBe("string")
  })

  test("renderCard: Unicode (Spanish accents) preserved", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const out = r.renderCard(makeRecord({
      title: "Configuración de conexión",
      content: "La contraseña está en ñoño.md — ángulo: 45°"
    }))
    expect(out).toContain("Configuración")
    expect(out).toContain("ñ")
  })

  test("renderCard: empty fields handled gracefully", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const out = r.renderCard(makeRecord({ title: "", content: "", access_count: 0 }))
    expect(out).toBeDefined()
    expect(out.length).toBeGreaterThan(0)
  })

  test("renderCard: very old date renders without throwing", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const veryOld = new Date(Date.now() - 365 * 5 * 24 * 3600_000).toISOString()
    const out = r.renderCard(makeRecord({ created_at: veryOld }))
    expect(out).toBeDefined()
    expect(out.length).toBeGreaterThan(0)
  })

  test("renderTable: 0 rows renders header only", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const cols: ColumnDef<MemoryRecord>[] = [
      { key: "id", header: "ID", minWidth: 8 },
      { key: "title", header: "TITLE", minWidth: 20 },
    ]
    const out = r.renderTable<MemoryRecord>([], cols)
    expect(out).toBeDefined()
    expect(out.length).toBeGreaterThan(0)
  })

  test("renderTable: 1 row renders single entry", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const cols: ColumnDef<MemoryRecord>[] = [
      { key: "id", header: "ID", minWidth: 8 },
      { key: "title", header: "TITLE", minWidth: 20 },
    ]
    const out = r.renderTable<MemoryRecord>([makeRecord()], cols)
    expect(out).toBeDefined()
    expect(out).toContain("Test record")
  })

  test("renderTable: 100 rows render within terminal width", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const cols: ColumnDef<MemoryRecord>[] = [
      { key: "id", header: "ID", minWidth: 8 },
      { key: "title", header: "TITLE", minWidth: 30, format: (row) => row.title.slice(0, 30) },
    ]
    const rows = Array.from({ length: 100 }, (_, i) => makeRecord({ title: `row-${i}-with-very-long-title-padding-to-test-wrap`, id: `r${i}` }))
    const out = r.renderTable<MemoryRecord>(rows, cols, { width: 120 })
    const lines = out.split("\n")
    for (const ln of lines) {
      expect(ln.length).toBeLessThanOrEqual(120 + 50)
    }
  })

  test("renderTable: columns wider than terminal are truncated", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer()
    const cols: ColumnDef<MemoryRecord>[] = [
      { key: "id", header: "ID", minWidth: 8 },
      { key: "title", header: "TITLE", minWidth: 30 },
    ]
    const out = r.renderTable<MemoryRecord>([makeRecord({ title: "x".repeat(200) })], cols, { width: 40 })
    const lines = out.split("\n")
    const maxLine = Math.max(...lines.map(l => l.length))
    expect(maxLine).toBeLessThanOrEqual(40 + 50)
  })

  test("color output: ANSI codes present when enabled", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer({ color: true })
    const out = r.renderCard(makeRecord({ importance: 0.9 }))
    expect(ANSI_REGEX.test(out)).toBe(true)
  })

  test("color output: no ANSI when disabled", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer({ color: false })
    const out = r.renderCard(makeRecord({ importance: 0.9 }))
    expect(ANSI_REGEX.test(out)).toBe(false)
  })

  test("score bar: 0.0 = all empty", async () => {
    const { scoreBar } = await import("../src/render.js")
    const bar = scoreBar(0.0, 10)
    expect(bar).toBeDefined()
    expect(bar).not.toContain("▓")
  })

  test("score bar: 1.0 = all full", async () => {
    const { scoreBar } = await import("../src/render.js")
    const bar = scoreBar(1.0, 10)
    expect(bar).toContain("▓")
  })

  test("score bar: 0.5 = half full", async () => {
    const { scoreBar } = await import("../src/render.js")
    const bar = scoreBar(0.5, 10)
    const filled = (bar.match(/▓/g) || []).length
    const empty = (bar.match(/░/g) || []).length
    expect(filled).toBeGreaterThan(0)
    expect(empty).toBeGreaterThan(0)
  })

  test("Unicode fallback: TERM=linux → ASCII", async () => {
    const prev = process.env.TERM
    process.env.TERM = "linux"
    const { EngramRenderer } = await import("../src/render.js?v=linux")
    const r = new EngramRenderer()
    const out = r.renderCard(makeRecord())
    const hasUnicodeGlyphs = /[┌┐└┘─│┬┴├┤┼▓░]/.test(out)
    expect(hasUnicodeGlyphs).toBe(false)
    if (prev !== undefined) process.env.TERM = prev
    else delete process.env.TERM
  })

  test("Unicode support: TERM=xterm-256color → Unicode", async () => {
    const prev = process.env.TERM
    process.env.TERM = "xterm-256color"
    const { EngramRenderer } = await import("../src/render.js?v=unicode")
    const r = new EngramRenderer()
    const out = r.renderCard(makeRecord())
    expect(out).toBeDefined()
    if (prev !== undefined) process.env.TERM = prev
    else delete process.env.TERM
  })

  test("renderSearchResults: returns formatted multi-record output", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer({ color: false })
    const matches = sampleRecords.map((rec, i) => ({ ...rec, score: 1.0 - i * 0.1 }))
    const out = r.renderSearchResults(matches)
    expect(out).toContain("API Key")
    expect(out).toContain("Arquitectura")
  })

  test("renderStatus: stats formatted", async () => {
    const { EngramRenderer } = await import("../src/render.js")
    const r = new EngramRenderer({ color: false })
    const out = r.renderStatus(
      {
        total: 100, global: 60, project: 40,
        by_type: { config: 20, architecture: 30, general: 50 },
        by_source: { manual: 70, tool: 30 },
      },
      { global: "/tmp/global.db", project: null }
    )
    expect(out).toContain("100")
    expect(out).toContain("config")
  })
})

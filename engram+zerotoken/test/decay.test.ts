import { describe, expect, test } from "bun:test"
import { makeRecord, sampleRecords, seedDecayFixtures, createTestDb } from "./fixtures/seed.js"
import { DEFAULT_DECAY_OPTIONS } from "../src/decay.js"

const DAY_MS = 24 * 3600_000
function daysAgo(n: number): string { return new Date(Date.now() - n * DAY_MS).toISOString() }

describe("decay engine", () => {
  test("effectiveScore: brand new record has maximum score", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const rec = makeRecord({ created_at: new Date().toISOString(), importance: 1.0, access_count: 0 })
    const s = effectiveScore(rec, DEFAULT_DECAY_OPTIONS)
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(1.0001)
  })

  test("effectiveScore: 30d old record is decayed", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const fresh = effectiveScore(makeRecord({ created_at: new Date().toISOString(), importance: 1.0 }), DEFAULT_DECAY_OPTIONS)
    const aged = effectiveScore(makeRecord({ created_at: daysAgo(30), importance: 1.0 }), DEFAULT_DECAY_OPTIONS)
    expect(aged).toBeLessThan(fresh)
  })

  test("effectiveScore: 365d old record is very decayed", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const fresh = effectiveScore(makeRecord({ created_at: new Date().toISOString(), importance: 1.0 }), DEFAULT_DECAY_OPTIONS)
    const veryOld = effectiveScore(makeRecord({ created_at: daysAgo(365), importance: 1.0 }), DEFAULT_DECAY_OPTIONS)
    expect(veryOld).toBeLessThan(fresh * 0.5)
  })

  test("effectiveScore: high access_count boosts score", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const a = effectiveScore(makeRecord({ created_at: daysAgo(30), importance: 0.7, access_count: 0 }), DEFAULT_DECAY_OPTIONS)
    const b = effectiveScore(makeRecord({ created_at: daysAgo(30), importance: 0.7, access_count: 100 }), DEFAULT_DECAY_OPTIONS)
    expect(b).toBeGreaterThan(a)
  })

  test("decay: lambda 0.1 → slow decay", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const rec = makeRecord({ created_at: daysAgo(7), importance: 1.0 })
    const s = effectiveScore(rec, { ...DEFAULT_DECAY_OPTIONS, lambda: 0.1 })
    expect(s).toBeGreaterThan(0.4)
  })

  test("decay: lambda 0.2 → moderate decay", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const rec = makeRecord({ created_at: daysAgo(7), importance: 1.0 })
    const s = effectiveScore(rec, { ...DEFAULT_DECAY_OPTIONS, lambda: 0.2 })
    expect(s).toBeGreaterThan(0.2)
    expect(s).toBeLessThan(0.6)
  })

  test("decay: lambda 0.5 → fast decay", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const rec = makeRecord({ created_at: daysAgo(7), importance: 1.0 })
    const s = effectiveScore(rec, { ...DEFAULT_DECAY_OPTIONS, lambda: 0.5 })
    expect(s).toBeLessThan(0.1)
  })

  test("decay: lambda 1.5 → very fast decay", async () => {
    const { effectiveScore } = await import("../src/decay.js")
    const rec = makeRecord({ created_at: daysAgo(7), importance: 1.0 })
    const s = effectiveScore(rec, { ...DEFAULT_DECAY_OPTIONS, lambda: 1.5 })
    expect(s).toBeLessThan(0.0001)
  })

  test("compactCandidates: never deletes importance > 0.85 (whitelisted)", async () => {
    const { compactCandidates, IMPORTANCE_WHITELIST_THRESHOLD } = await import("../src/decay.js")
    const candidates = sampleRecords.filter(r => r.importance > IMPORTANCE_WHITELIST_THRESHOLD)
    const result = compactCandidates(candidates, DEFAULT_DECAY_OPTIONS)
    for (const rec of candidates) {
      expect(result.drop.map(r => r.id)).not.toContain(rec.id)
    }
    expect(result.keep.map(r => r.id)).toEqual(expect.arrayContaining(candidates.map(r => r.id)))
  })

  test("compactCandidates: merges records with shared type+title prefix", async () => {
    const { compactCandidates } = await import("../src/decay.js")
    const sharedPrefix = "Config API key configuration details and notes about the specific"
    const candidates = [
      makeRecord({ id: "a1", title: sharedPrefix, importance: 0.5, created_at: daysAgo(60) }),
      makeRecord({ id: "a2", title: sharedPrefix + " extra notes", importance: 0.5, created_at: daysAgo(60) }),
      makeRecord({ id: "a3", title: sharedPrefix + " and more", importance: 0.5, created_at: daysAgo(60) }),
    ]
    const result = compactCandidates(candidates, DEFAULT_DECAY_OPTIONS, 0.5)
    expect(result.merge.length).toBeGreaterThan(0)
  })

  test("compactCandidates: respects minImportance threshold for drop", async () => {
    const { compactCandidates } = await import("../src/decay.js")
    const candidates = [
      makeRecord({ id: "low-1", title: "Obsolete note alpha", importance: 0.05, created_at: daysAgo(400) }),
      makeRecord({ id: "low-2", title: "Obsolete note beta", importance: 0.05, created_at: daysAgo(400) }),
      makeRecord({ id: "low-3", title: "Obsolete note gamma", importance: 0.05, created_at: daysAgo(400) }),
      makeRecord({ id: "low-4", title: "Obsolete note delta", importance: 0.05, created_at: daysAgo(400) }),
      makeRecord({ id: "high-1", title: "Important thing one", importance: 0.5, created_at: daysAgo(2) }),
      makeRecord({ id: "high-2", title: "Important thing two", importance: 0.6, created_at: daysAgo(2) }),
    ]
    const result = compactCandidates(candidates, { ...DEFAULT_DECAY_OPTIONS, minImportance: 0.3 }, 0.2)
    const dropIds = result.drop.map(r => r.id)
    for (const id of ["low-1", "low-2", "low-3", "low-4"]) {
      expect(dropIds).toContain(id)
    }
    expect(dropIds).not.toContain("high-1")
    expect(dropIds).not.toContain("high-2")
  })

  test("compactCandidates: empty input → empty result, no throw", async () => {
    const { compactCandidates } = await import("../src/decay.js")
    const result = compactCandidates([], DEFAULT_DECAY_OPTIONS)
    expect(result.keep).toEqual([])
    expect(result.merge).toEqual([])
    expect(result.drop).toEqual([])
  })

  test("compactCandidates: single record → no merging (singleton)", async () => {
    const { compactCandidates } = await import("../src/decay.js")
    const rec = makeRecord({ id: "only", title: "Solo", importance: 0.5 })
    const result = compactCandidates([rec], DEFAULT_DECAY_OPTIONS)
    expect(result.merge.length).toBe(0)
  })

  test("decayReport: produces summary with total/avgDecay/healthyCount/atRisk", async () => {
    const { decayReport } = await import("../src/decay.js")
    const recs = sampleRecords
    const report = decayReport(recs, DEFAULT_DECAY_OPTIONS)
    expect(report).toBeDefined()
    expect(report.total).toBe(recs.length)
    expect(typeof report.avgDecay).toBe("number")
    expect(typeof report.healthyCount).toBe("number")
    expect(typeof report.atRisk).toBe("number")
  })

  test("decayReport: total count matches input size", async () => {
    const { decayReport } = await import("../src/decay.js")
    const report = decayReport(sampleRecords, DEFAULT_DECAY_OPTIONS)
    expect(report.total).toBe(sampleRecords.length)
  })

  test("decayReport: empty input", async () => {
    const { decayReport } = await import("../src/decay.js")
    const report = decayReport([], DEFAULT_DECAY_OPTIONS)
    expect(report.total).toBe(0)
    expect(report.avgDecay).toBe(0)
  })

  test("rankByDecay: returns records sorted by score desc", async () => {
    const { rankByDecay } = await import("../src/decay.js")
    const ranked = rankByDecay(sampleRecords, DEFAULT_DECAY_OPTIONS)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score)
    }
  })

  test("seedDecayFixtures: 5 records inserted into in-memory DB", () => {
    const db = createTestDb()
    const seeded = seedDecayFixtures(db)
    expect(seeded.length).toBe(5)
    const row = db.query("SELECT COUNT(*) as c FROM observations").get() as { c: number }
    expect(row.c).toBe(5)
  })
})

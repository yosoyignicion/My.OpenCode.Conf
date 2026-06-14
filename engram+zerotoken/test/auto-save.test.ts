import { describe, expect, test } from "bun:test"
import { IMPORTANCE_WHITELIST_THRESHOLD } from "../src/decay.js"

describe("auto-save: keyword patterns", () => {
  test("detects 'recuerda que ...' pattern", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("Recuerdo importante: recuerda que el agent loop corre en el main thread")
    expect(cands.length).toBeGreaterThanOrEqual(1)
    const remembered = cands.find(c => c.content.includes("el agent loop"))
    expect(remembered).toBeDefined()
    expect(remembered!.type).toBe("general")
    expect(remembered!.importance).toBeGreaterThanOrEqual(0.7)
  })

  test("detects 'importante: ...' pattern with high importance", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("importante: la password de la DB está en /etc/secrets/db.pass")
    const importante = cands.find(c => c.content.includes("password de la DB"))
    expect(importante).toBeDefined()
    expect(importante!.importance).toBeGreaterThanOrEqual(0.85)
  })

  test("detects 'no olvides ...' pattern with high importance", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("no olvides que el MCP context7 tiene rate limit")
    const olvido = cands.find(c => c.content.includes("rate limit"))
    expect(olvido).toBeDefined()
    expect(olvido!.importance).toBeGreaterThanOrEqual(0.85)
  })

  test("detects 'ten en cuenta ...' pattern as preference", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("ten en cuenta que ignicion prefiere la respuesta corta")
    const pref = cands.find(c => c.content.includes("respuesta corta"))
    expect(pref).toBeDefined()
    expect(pref!.type).toBe("preference")
  })

  test("case-insensitive matching works", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("RECUERDA QUE el cache expira en 5 min")
    expect(cands.length).toBeGreaterThanOrEqual(1)
  })

  test("random text does not trigger keyword patterns", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("el tiempo en Madrid es soleado y hace calor")
    expect(cands).toHaveLength(0)
  })

  test("text below 3 char threshold is rejected (after capture)", async () => {
    const { detectKeywordSave } = await import("../src/auto-save.js")
    const cands = detectKeywordSave("recuerda que x")
    expect(cands).toHaveLength(0)
  })
})

describe("auto-save: architecture patterns", () => {
  test("detects 'vamos a usar X' as architecture", async () => {
    const { detectArchitectureSave } = await import("../src/auto-save.js")
    const cands = detectArchitectureSave("vamos a usar bun:sqlite porque better-sqlite3 no funciona en bun")
    const arch = cands.find(c => c.content.includes("bun:sqlite"))
    expect(arch).toBeDefined()
    expect(arch!.type).toBe("architecture")
    expect(arch!.title.startsWith("Arquitectura:")).toBe(true)
  })

  test("detects 'la arquitectura es X' with high importance", async () => {
    const { detectArchitectureSave } = await import("../src/auto-save.js")
    const cands = detectArchitectureSave("la arquitectura es de tres subproyectos independientes")
    const arch = cands.find(c => c.content.includes("tres subproyectos"))
    expect(arch).toBeDefined()
    expect(arch!.importance).toBeGreaterThanOrEqual(0.85)
  })

  test("detects 'decidí usar X' as architecture decision", async () => {
    const { detectArchitectureSave } = await import("../src/auto-save.js")
    const cands = detectArchitectureSave("decidí usar sqlite FTS5 para el search engine")
    const arch = cands.find(c => c.content.includes("FTS5"))
    expect(arch).toBeDefined()
    expect(arch!.importance).toBeGreaterThanOrEqual(0.85)
  })

  test("detects 'el stack incluye X' as architecture", async () => {
    const { detectArchitectureSave } = await import("../src/auto-save.js")
    const cands = detectArchitectureSave("el stack incluye TypeScript + bun + SQLite")
    const arch = cands.find(c => c.content.includes("TypeScript"))
    expect(arch).toBeDefined()
    expect(arch!.type).toBe("architecture")
  })

  test("random text does not trigger architecture patterns", async () => {
    const { detectArchitectureSave } = await import("../src/auto-save.js")
    const cands = detectArchitectureSave("ayer llovió en Barcelona durante toda la tarde")
    expect(cands).toHaveLength(0)
  })
})

describe("auto-save: error-fix detector (stateful)", () => {
  test("first call with error: stores lastError, returns null", async () => {
    const { createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    const c = det.check("Error: Cannot find module 'foo'")
    expect(c).toBeNull()
  })

  test("second call with resolution within 5min: returns fix candidate", async () => {
    const { createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    det.check("Error: Cannot find module 'foo'")
    const c = det.check("solucionado, era un typo en el import path")
    expect(c).toBeDefined()
    expect(c!.type).toBe("error_solution")
    expect(c!.source).toBe("auto_error_fix")
    expect(c!.importance).toBeGreaterThanOrEqual(0.8)
    expect(c!.content).toContain("Error:")
    expect(c!.content).toContain("Solución:")
  })

  test("resolution after 5min: returns null (out of window)", async () => {
    const { createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    det.check("Error: something failed")
    const originalNow = Date.now
    Date.now = () => originalNow() + 6 * 60 * 1000
    try {
      const c = det.check("fixed")
      expect(c).toBeNull()
    } finally {
      Date.now = originalNow
    }
  })

  test("consecutive errors without fix: keep returning null (no premature save)", async () => {
    const { createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    expect(det.check("Error: first failure")).toBeNull()
    expect(det.check("Error: second failure")).toBeNull()
    expect(det.check("Error: third failure")).toBeNull()
  })

  test("after fix emitted, detector resets (next error starts a new cycle)", async () => {
    const { createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    det.check("Error: first issue")
    const firstFix = det.check("solucionado el primer problema")
    expect(firstFix).toBeDefined()
    expect(det.check("fixed again")).toBeNull()
    det.check("Error: second issue")
    const secondFix = det.check("arreglado el segundo problema")
    expect(secondFix).toBeDefined()
  })
})

describe("auto-save: detectAll (composed)", () => {
  test("combines keyword + error-fix in single call (regression test for double-call bug)", async () => {
    const { detectAll, createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    det.check("Error: module not found")
    const cands = detectAll("solucionado, era un typo en el import path", det)
    const fixCand = cands.find(c => c.source === "auto_error_fix")
    expect(fixCand).toBeDefined()
  })

  test("detectAll calls check() exactly once per invocation (no double-call)", async () => {
    const { detectAll } = await import("../src/auto-save.js")
    let callCount = 0
    const det = {
      check: (_text: string) => {
        callCount++
        return null
      }
    }
    detectAll("importante: el agent corre en el main thread", det)
    expect(callCount).toBe(1)
  })

  test("empty text returns no candidates", async () => {
    const { detectAll, createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    const cands = detectAll("", det)
    expect(cands).toHaveLength(0)
  })

  test("text below 5-char minimum is ignored", async () => {
    const { detectAll, createErrorFixDetector } = await import("../src/auto-save.js")
    const det = createErrorFixDetector()
    const cands = detectAll("hi", det)
    expect(cands).toHaveLength(0)
  })
})

describe("decay: whitelist threshold contract", () => {
  test("threshold is 0.9 (aligned with AGENTS.md doc and plugin user-facing promise)", () => {
    expect(IMPORTANCE_WHITELIST_THRESHOLD).toBe(0.9)
  })

  test("memories with importance exactly at threshold are NOT whitelisted (strict >)", async () => {
    const { compactCandidates } = await import("../src/decay.js")
    const { makeRecord } = await import("./fixtures/seed.js")
    const candidates = [
      makeRecord({ id: "boundary", title: "At threshold", importance: IMPORTANCE_WHITELIST_THRESHOLD }),
      makeRecord({ id: "above", title: "Above threshold", importance: 0.95 }),
    ]
    const result = compactCandidates(candidates, { lambda: 0.2, minImportance: 0.5, accessBoost: 0.5 })
    const keptIds = [...result.keep.map(r => r.id), ...result.merge.map(m => m.parent.id)]
    expect(keptIds).toContain("above")
  })
})

import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { sampleRecords, sampleRelations } from "./fixtures/seed.js"
import type { GraphObservation, GraphRelation } from "../src/graph.js"

let work = ""
beforeEach(() => { work = mkdtempSync(join(tmpdir(), "graph-test-")) })
afterEach(() => { rmSync(work, { recursive: true, force: true }) })

const obs: GraphObservation[] = sampleRecords.map(r => ({ id: r.id, title: r.title, type: r.type }))

const graphObs: GraphObservation[] = [
  ...obs,
  { id: "ent-stripe", title: "Stripe (entity)", type: "config" },
  { id: "ent-drogon", title: "Drogon (entity)", type: "architecture" },
]

const rels: GraphRelation[] = sampleRelations.map(r => ({
  fromId: r.observation_id,
  toId: r.entity_id,
  relationType: r.relation_type,
}))

describe("graph builder", () => {
  test("buildGraph: produces valid Mermaid syntax with graph TD", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph(graphObs, rels, { layout: "TD", colorByType: false })
    expect(g).toMatch(/^```mermaid\ngraph TD/m)
  })

  test("buildGraph: layout LR produces 'graph LR'", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph(graphObs, rels, { layout: "LR", colorByType: false })
    expect(g).toMatch(/^```mermaid\ngraph LR/m)
  })

  test("buildGraph: edges use '-->'", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph(graphObs, rels, { layout: "TD", colorByType: false })
    expect(g).toContain("-->")
  })

  test("buildGraph: node IDs are alphanumeric + underscore", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph(graphObs, rels, { layout: "TD", colorByType: false })
    const idPattern = /\b[a-zA-Z][a-zA-Z0-9_]*\b/g
    const ids = g.match(idPattern) || []
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    }
  })

  test("buildGraph: special chars in titles are escaped", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const dirty: GraphObservation[] = sampleRecords.map(r => ({ id: r.id, type: r.type, title: `${r.title} [with] <brackets> & ampersand "quotes"` }))
    const g = buildGraph(dirty, rels, { layout: "TD", colorByType: false })
    expect(g).toBeDefined()
    expect(g.length).toBeGreaterThan(0)
    expect(g).toContain("&amp;")
    expect(g).toContain("&lt;")
    expect(g).toContain("&quot;")
  })

  test("buildGraph: empty input returns valid Mermaid header", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph([], [], { layout: "TD", colorByType: false })
    expect(g).toMatch(/^```mermaid\ngraph TD/m)
  })

  test("buildGraph: colorByType creates subgraphs", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph(graphObs, rels, { layout: "TD", colorByType: true })
    expect(g).toContain("subgraph")
    expect(g).toContain("style")
  })

  test("buildGraph: filterType restricts observations", async () => {
    const { buildGraph } = await import("../src/graph.js")
    const g = buildGraph(graphObs, rels, { layout: "TD", colorByType: false, filterType: "config" })
    expect(g).toContain("rec_config_1")
    expect(g).not.toContain("rec_arch_1")
  })

  test("topHubs: returns k items ordered by degree desc", async () => {
    const { topHubs } = await import("../src/graph.js")
    const hubs = topHubs(graphObs, rels, 3)
    expect(hubs.length).toBeLessThanOrEqual(3)
    if (hubs.length >= 2) {
      for (let i = 1; i < hubs.length; i++) {
        expect(hubs[i - 1]!.degree).toBeGreaterThanOrEqual(hubs[i]!.degree)
      }
    }
  })

  test("topHubs: arch-1 has degree 2 (mentions stripe + drogon)", async () => {
    const { topHubs } = await import("../src/graph.js")
    const hubs = topHubs(graphObs, rels, 10)
    const arch = hubs.find(h => h.id === "rec-arch-1")
    expect(arch).toBeDefined()
    expect(arch!.degree).toBeGreaterThanOrEqual(2)
  })

  test("topHubs: returns zero-degree entries when no relations", async () => {
    const { topHubs } = await import("../src/graph.js")
    const hubs = topHubs(graphObs, [], 5)
    expect(hubs.every(h => h.degree === 0)).toBe(true)
  })

  test("exportMermaidFile: creates file", async () => {
    const { exportMermaidFile } = await import("../src/graph.js")
    const outPath = join(work, "graph.mmd")
    exportMermaidFile(graphObs, rels, outPath, { layout: "TD", colorByType: false })
    expect(existsSync(outPath)).toBe(true)
  })

  test("exportMermaidFile: file content is valid Mermaid", async () => {
    const { exportMermaidFile } = await import("../src/graph.js")
    const outPath = join(work, "graph2.mmd")
    exportMermaidFile(graphObs, rels, outPath, { layout: "LR", colorByType: false })
    const content = readFileSync(outPath, "utf-8")
    expect(content).toMatch(/^```mermaid\ngraph LR/m)
  })

  test("exportMermaidFile: atomic write (creates parent dir, no partial file)", async () => {
    const { exportMermaidFile } = await import("../src/graph.js")
    const outPath = join(work, "subdir", "nested", "graph.mmd")
    expect(() => exportMermaidFile(graphObs, rels, outPath, { layout: "TD", colorByType: false })).not.toThrow()
    expect(existsSync(outPath)).toBe(true)
  })
})

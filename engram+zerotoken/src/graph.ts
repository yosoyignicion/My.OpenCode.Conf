import { writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { MemoryRecord, MemoryType } from './types.js'
import { shortId } from './render.js'

export interface GraphObservation {
  id: string
  title: string
  type: MemoryType
}

export interface GraphRelation {
  fromId: string
  toId: string
  relationType: string
}

export interface GraphOptions {
  layout: 'TD' | 'LR'
  colorByType: boolean
  filterType?: MemoryType
}

export const TYPE_HEX: Record<MemoryType, string> = {
  architecture: '#ff5555',
  error_solution: '#ffaa00',
  config: '#00afff',
  general: '#888888',
  preference: '#aa00ff',
  learned_pattern: '#55ff55',
  conversation: '#00ccaa',
  command: '#ffcc00',
}

function escapeLabel(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br/>')
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}

export function buildGraph(observations: GraphObservation[], relations: GraphRelation[], options: GraphOptions): string {
  const lines: string[] = []
  lines.push('```mermaid')
  lines.push(`graph ${options.layout}`)
  const filtered = options.filterType ? observations.filter(o => o.type === options.filterType) : observations
  const idSet = new Set(filtered.map(o => o.id))
  const filteredRels = relations.filter(r => idSet.has(r.fromId) && idSet.has(r.toId))
  if (options.colorByType) {
    for (const [t, hex] of Object.entries(TYPE_HEX)) {
      const group = filtered.filter(o => o.type === t)
      if (!group.length) continue
      lines.push(`  subgraph ${t}["${t}"]`)
      for (const o of group) {
        const sid = safeId(o.id)
        const label = `${shortId(o.id)}: ${escapeLabel(o.title)}`
        lines.push(`    ${sid}["${label}"]`)
        lines.push(`    style ${sid} fill:${hex},stroke:#333,color:#fff`)
      }
      lines.push('  end')
    }
  } else {
    for (const o of filtered) {
      const sid = safeId(o.id)
      const label = `${shortId(o.id)}: ${escapeLabel(o.title)}`
      lines.push(`  ${sid}["${label}"]`)
    }
  }
  for (const r of filteredRels) {
    const a = safeId(r.fromId)
    const b = safeId(r.toId)
    const label = escapeLabel(r.relationType)
    lines.push(`  ${a} -->|${label}| ${b}`)
  }
  lines.push('```')
  return lines.join('\n')
}

export interface GraphHub {
  id: string
  degree: number
  score: number
}

export function topHubs(observations: GraphObservation[], relations: GraphRelation[], k = 5): GraphHub[] {
  const degree = new Map<string, number>()
  for (const o of observations) degree.set(o.id, 0)
  for (const r of relations) {
    degree.set(r.fromId, (degree.get(r.fromId) ?? 0) + 1)
    degree.set(r.toId, (degree.get(r.toId) ?? 0) + 1)
  }
  const maxDeg = Math.max(1, ...Array.from(degree.values()))
  const entries = Array.from(degree.entries()).map(([id, deg]) => ({ id, degree: deg, score: deg / maxDeg }))
  entries.sort((a, b) => b.degree - a.degree)
  return entries.slice(0, k)
}

export function exportMermaidFile(observations: GraphObservation[], relations: GraphRelation[], outputPath: string, options: GraphOptions): void {
  const content = buildGraph(observations, relations, options)
  const dir = dirname(outputPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmp = `${outputPath}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, content, 'utf-8')
  renameSync(tmp, outputPath)
}

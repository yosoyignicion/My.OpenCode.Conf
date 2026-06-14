import { tool } from '@opencode-ai/plugin'
import { z } from 'zod'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseManager } from './db.js'
import { symbols } from './constants.js'
import { EngramRenderer, type ColumnDef } from './render.js'
import { compactCandidates, decayReport, DEFAULT_DECAY_OPTIONS } from './decay.js'
import { buildGraph, exportMermaidFile, topHubs, type GraphObservation, type GraphRelation } from './graph.js'
import type { ToolResult } from '@opencode-ai/plugin'
import type { MemoryRecord } from './types.js'

const MEMORY_TYPES = ['general', 'config', 'architecture', 'error_solution', 'preference', 'learned_pattern', 'conversation', 'command'] as const

interface CommandDeps {
  db: DatabaseManager
  globalDbPath: string
}

function loadObservationsAndRelations(db: DatabaseManager, scope: 'global' | 'project' | 'both' = 'global'): { observations: MemoryRecord[]; relations: GraphRelation[] } {
  const observations = db.all(
    `SELECT id,title,content,type,source,importance,access_count,last_accessed_at,created_at,updated_at FROM observations`,
    [],
    scope,
  ) as MemoryRecord[]
  const relationRows = db.all(
    `SELECT observation_id,entity_id,relation_type FROM relations`,
    [],
    scope,
  ) as { observation_id: string; entity_id: string; relation_type: string }[]
  const idIndex = new Set(observations.map(o => o.id))
  const relations: GraphRelation[] = []
  for (const r of relationRows) {
    if (!idIndex.has(r.observation_id) || !idIndex.has(r.entity_id)) continue
    relations.push({ fromId: r.observation_id, toId: r.entity_id, relationType: r.relation_type })
  }
  return { observations, relations }
}

function diffLines(a: string, b: string): { kind: 'eq' | 'del' | 'add'; text: string }[] {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const out: { kind: 'eq' | 'del' | 'add'; text: string }[] = []
  let i = 0
  let j = 0
  while (i < aLines.length || j < bLines.length) {
    if (i >= aLines.length) {
      out.push({ kind: 'add', text: bLines[j++]! })
    } else if (j >= bLines.length) {
      out.push({ kind: 'del', text: aLines[i++]! })
    } else if (aLines[i] === bLines[j]) {
      out.push({ kind: 'eq', text: aLines[i++]! })
      j++
    } else {
      const aInB = bLines.indexOf(aLines[i]!, j)
      const bInA = aLines.indexOf(bLines[j]!, i)
      if (aInB === -1 || (bInA !== -1 && bInA < aInB)) {
        out.push({ kind: 'add', text: bLines[j++]! })
      } else if (bInA === -1) {
        out.push({ kind: 'del', text: aLines[i++]! })
      } else {
        out.push({ kind: 'del', text: aLines[i++]! })
        out.push({ kind: 'add', text: bLines[j++]! })
      }
    }
  }
  return out
}

function formatUnifiedDiff(aLabel: string, bLabel: string, a: string, b: string): string {
  const ops = diffLines(a, b)
  const lines: string[] = []
  lines.push(`--- ${aLabel}`)
  lines.push(`+++ ${bLabel}`)
  for (const op of ops) {
    const prefix = op.kind === 'add' ? '+' : op.kind === 'del' ? '-' : ' '
    lines.push(prefix + op.text)
  }
  return lines.join('\n')
}

export function buildGraphTool(deps: CommandDeps) {
  return tool({
    description: 'Genera grafo Mermaid de memorias y relaciones.',
    args: {
      layout: z.enum(['TD', 'LR']).optional().default('TD').describe('Direccion del grafo (TD|LR)'),
      type: z.enum(MEMORY_TYPES).optional().describe('Filtrar por tipo de memoria'),
      output: z.string().optional().describe('Ruta del archivo .mmd de salida (opcional)'),
      color_by_type: z.boolean().optional().default(true).describe('Colorear nodos por tipo (def:true)'),
    },
    execute: async (args): Promise<ToolResult> => {
      const { observations, relations } = loadObservationsAndRelations(deps.db, 'global')
      const filtered = args.type ? observations.filter(o => o.type === args.type) : observations
      if (!filtered.length) return { output: `${symbols.warning} No hay memorias para graficar.` }
      const obs: GraphObservation[] = filtered.map(o => ({ id: o.id, title: o.title, type: o.type }))
      const rels: GraphRelation[] = relations.filter(r => obs.some(o => o.id === r.fromId) && obs.some(o => o.id === r.toId))
      const graph = buildGraph(obs, rels, { layout: args.layout, colorByType: args.color_by_type })
      const hubs = topHubs(obs, rels, 5)
      let out = `${symbols.stats} Grafo (${obs.length} nodos, ${rels.length} aristas)\n${graph}\n\n`
      if (hubs.length) {
        out += `${symbols.stats} Top hubs:\n`
        for (const h of hubs) out += `  ${h.id.slice(0, 8)}  degree=${h.degree}  score=${h.score.toFixed(2)}\n`
      }
      if (args.output) {
        exportMermaidFile(obs, rels, args.output, { layout: args.layout, colorByType: args.color_by_type })
        out += `\n${symbols.saved} Exportado a: ${args.output}`
      }
      return { output: out, metadata: { nodes: obs.length, edges: rels.length, layout: args.layout, type: args.type ?? null, output: args.output ?? null } }
    },
  })
}

export function buildDiffTool(deps: CommandDeps) {
  return tool({
    description: 'Diff unificado entre dos memorias por ID.',
    args: {
      id_a: z.string().describe('ID de la primera memoria'),
      id_b: z.string().describe('ID de la segunda memoria'),
      scope: z.enum(['global', 'project', 'both']).optional().default('both').describe('Scope de busqueda'),
    },
    execute: async (args): Promise<ToolResult> => {
      const a = deps.db.get(`SELECT id,title,content,type,source,importance,access_count,last_accessed_at,created_at,updated_at FROM observations WHERE id=?`, [args.id_a], args.scope === 'both' ? 'global' : args.scope) as MemoryRecord | null
      const b = deps.db.get(`SELECT id,title,content,type,source,importance,access_count,last_accessed_at,created_at,updated_at FROM observations WHERE id=?`, [args.id_b], args.scope === 'both' ? 'global' : args.scope) as MemoryRecord | null
      if (!a || !b) return { output: `${symbols.warning} Memoria no encontrada. a=${!!a} b=${!!b}` }
      const headerA = `[${a.type}] ${a.title}`
      const headerB = `[${b.type}] ${b.title}`
      const textA = `${headerA}\n${a.content}`
      const textB = `${headerB}\n${b.content}`
      const diff = formatUnifiedDiff(args.id_a, args.id_b, textA, textB)
      return { output: `${symbols.search} Diff ${args.id_a} -> ${args.id_b}\n\n${diff}` }
    },
  })
}

export function buildExportTool(deps: CommandDeps) {
  return tool({
    description: 'Exporta bundle markdown de memorias.',
    args: {
      project: z.string().optional().describe('Etiqueta del proyecto (metadata)'),
      type: z.enum(MEMORY_TYPES).optional().describe('Filtrar por tipo'),
      scope: z.enum(['global', 'project', 'both']).optional().default('global').describe('Scope de exportacion'),
      output: z.string().describe('Ruta del archivo .md de salida'),
      limit: z.number().min(1).max(5000).optional().default(500).describe('Maximo de registros (def:500)'),
    },
    execute: async (args): Promise<ToolResult> => {
      const rows = deps.db.all(
        `SELECT id,title,content,type,source,importance,access_count,last_accessed_at,created_at,updated_at FROM observations ORDER BY importance DESC,created_at DESC LIMIT ?`,
        [args.limit],
        args.scope,
      ) as MemoryRecord[]
      const filtered = args.type ? rows.filter(r => r.type === args.type) : rows
      const date = new Date().toISOString()
      const lines: string[] = []
      lines.push(`# Engram Export`)
      lines.push(``)
      lines.push(`- Generated: ${date}`)
      lines.push(`- Project: ${args.project ?? '(unspecified)'}`)
      lines.push(`- Scope: ${args.scope}`)
      if (args.type) lines.push(`- Type filter: ${args.type}`)
      lines.push(`- Records: ${filtered.length}`)
      lines.push(``)
      const grouped = new Map<string, MemoryRecord[]>()
      for (const r of filtered) {
        const list = grouped.get(r.type) ?? []
        list.push(r)
        grouped.set(r.type, list)
      }
      for (const [t, list] of grouped) {
        lines.push(`## ${t} (${list.length})`)
        lines.push(``)
        for (const r of list) {
          lines.push(`### ${r.title}`)
          lines.push(``)
          lines.push(`- id: \`${r.id}\``)
          lines.push(`- importance: ${r.importance.toFixed(2)}`)
          lines.push(`- accesses: ${r.access_count}`)
          lines.push(`- created: ${r.created_at}`)
          lines.push(``)
          lines.push(r.content)
          lines.push(``)
          lines.push('---')
          lines.push(``)
        }
      }
      const dir = dirname(args.output)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(args.output, lines.join('\n'), 'utf-8')
      return { output: `${symbols.saved} Exportadas ${filtered.length} memorias a ${args.output}`, metadata: { count: filtered.length, output: args.output, scope: args.scope, type: args.type ?? null } }
    },
  })
}

export function buildCompactTool(deps: CommandDeps) {
  const renderer = new EngramRenderer()
  return tool({
    description: 'Compacta memorias: agrupa duplicados por tipo+prefijo. DRY-RUN por defecto. Requiere --apply para ejecutar.',
    args: {
      dry_run: z.boolean().optional().default(true).describe('Si true (def), solo muestra el plan'),
      apply: z.boolean().optional().default(false).describe('Si true, ejecuta la compactacion (peligroso)'),
      lambda: z.number().min(0.1).max(1.5).optional().default(DEFAULT_DECAY_OPTIONS.lambda).describe('Decay lambda (0.1-1.5, def:0.2)'),
      min_importance: z.number().min(0).max(1).optional().default(DEFAULT_DECAY_OPTIONS.minImportance).describe('Importancia minima (0-1, def:0.1)'),
      max_keep: z.number().min(0.1).max(1).optional().default(0.7).describe('Ratio maximo a mantener (0.1-1, def:0.7)'),
      scope: z.enum(['global', 'project', 'both']).optional().default('global').describe('Scope a compactar'),
    },
    execute: async (args): Promise<ToolResult> => {
      const opts = { lambda: args.lambda, minImportance: args.min_importance, accessBoost: DEFAULT_DECAY_OPTIONS.accessBoost }
      const records = deps.db.all(
        `SELECT id,title,content,type,source,importance,access_count,last_accessed_at,created_at,updated_at FROM observations`,
        [],
        args.scope,
      ) as MemoryRecord[]
      if (!records.length) return { output: `${symbols.warning} No hay memorias en scope=${args.scope}.` }
      const report = decayReport(records, opts)
      const result = compactCandidates(records, opts, args.max_keep)
      const wouldDrop = result.drop.length
      const wouldMerge = result.merge.reduce((s, g) => s + g.children.length, 0)
      const wouldKeep = result.keep.length
      let out = `${symbols.stats} Compact plan (dry-run=${!args.apply})\n\n`
      out += `Scope: ${args.scope}  Records: ${records.length}\n`
      out += `Options: lambda=${opts.lambda} min_importance=${opts.minImportance} max_keep=${args.max_keep}\n`
      out += `Decay report: avg=${report.avgDecay}  healthy=${report.healthyCount}  at_risk=${report.atRisk}\n\n`
      out += `Plan: keep=${wouldKeep}  merge_children=${wouldMerge}  drop=${wouldDrop}\n\n`
      const cols: ColumnDef<MemoryRecord>[] = [
        { key: 'id', header: 'ID', minWidth: 10, format: r => r.id.slice(0, 8) },
        { key: 'type', header: 'TYPE', minWidth: 12 },
        { key: 'title', header: 'TITLE', minWidth: 30, format: r => r.title },
        { key: 'importance', header: 'IMP', minWidth: 5, align: 'right', format: r => r.importance.toFixed(2) },
        { key: 'access_count', header: 'ACC', minWidth: 4, align: 'right', format: r => String(r.access_count) },
        { key: 'created_at', header: 'CREATED', minWidth: 12, format: r => r.created_at.slice(0, 10) },
      ]
      if (result.drop.length) {
        out += `── Drop (${result.drop.length}) ──\n`
        const dropCols: ColumnDef<Record<string, unknown>>[] = cols as unknown as ColumnDef<Record<string, unknown>>[]
        out += renderer.renderTable(result.drop as unknown as Record<string, unknown>[], dropCols, { width: 120 })
        out += '\n\n'
      }
      if (result.merge.length) {
        out += `── Merge (${result.merge.length} groups) ──\n`
        for (const g of result.merge) {
          out += `  Parent: ${g.parent.id.slice(0, 8)} "${g.parent.title}" (importance=${g.parent.importance.toFixed(2)}, children=${g.children.length})\n`
          for (const c of g.children) out += `    - ${c.id.slice(0, 8)} "${c.title}" (imp=${c.importance.toFixed(2)})\n`
        }
        out += '\n'
      }
      if (!args.apply) {
        out += `\n${symbols.warning} Dry-run. Pasa --apply=true para ejecutar la compactacion.`
        return { output: out, metadata: { dry_run: true, plan: { keep: wouldKeep, merge: wouldMerge, drop: wouldDrop } } }
      }
      out += `\n${symbols.warning} Executing compaction...\n`
      let merged = 0
      for (const g of result.merge) {
        try {
          deps.db.run(
            `UPDATE observations SET title=?, content=?, importance=?, access_count=?, updated_at=? WHERE id=?`,
            [g.parent.title, g.parent.content, g.parent.importance, g.parent.access_count, new Date().toISOString(), g.parent.id],
            args.scope === 'both' ? 'global' : args.scope,
          )
          for (const c of g.children) {
            if (c.id === g.parent.id) continue
            try { deps.db.run(`DELETE FROM observations WHERE id=?`, [c.id], args.scope === 'both' ? 'global' : args.scope) } catch {}
          }
          merged++
        } catch {}
      }
      out += `${symbols.saved} Compact applied. Groups merged: ${merged}`
      return { output: out, metadata: { dry_run: false, applied: true, merged } }
    },
  })
}

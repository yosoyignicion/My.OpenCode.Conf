import { DatabaseManager } from './db.js'
import { generateId, nowISO, sanitizeFtsQuery, clampImportance, approximateTokens } from './utils.js'
import type { MemoryRecord, MemoryType, MemorySource, SaveParams, SearchParams, SearchMatch } from './types.js'

export class MemoryEngine {
  constructor(private db: DatabaseManager) {}

  save(params: SaveParams, scope: 'global' | 'project'): MemoryRecord {
    const id = generateId()
    const now = nowISO()
    const importance = clampImportance(params.importance ?? 0.7)
    this.db.run(
      `INSERT INTO observations (id,title,content,type,source,importance,created_at) VALUES (?,?,?,?,?,?,?)`,
      [id, params.title, params.content, params.type ?? 'general', params.source ?? 'tool', importance, now],
      scope,
    )
    return { id, title: params.title, content: params.content, type: params.type ?? 'general',
      source: params.source ?? 'tool', importance, access_count: 0, last_accessed_at: null, created_at: now, updated_at: null }
  }

  search(params: SearchParams): SearchMatch[] {
    const ftsQuery = sanitizeFtsQuery(params.query)
    if (!ftsQuery) return []

    const rows = this.db.all(
      `SELECT o.id,o.title,o.content,o.type,o.source,o.importance,o.access_count,o.last_accessed_at,o.created_at,
              COALESCE(rank,0.0) AS fts_rank
       FROM observations_fts JOIN observations o ON o.rowid=observations_fts.rowid
       WHERE observations_fts MATCH ? AND o.importance>=? ORDER BY rank DESC LIMIT ?`,
      [ftsQuery, params.min_importance ?? 0, (params.limit ?? 10) * 2],
      'both',
    ) as Record<string, unknown>[]

    let matches: SearchMatch[] = rows.map(r => {
      const ftsRank = Number(r.fts_rank) || 0
      const importance = Number(r.importance) || 0
      const ac = Number(r.access_count) || 0
      const lastAccess = r.last_accessed_at as string | null
      const recency = lastAccess
        ? Math.min(1, (Date.now() - new Date(lastAccess).getTime()) / (30 * 24 * 3600_000)) : 0.3
      const score = Math.exp(ftsRank) * 0.5 + importance * 0.25 + (1 - recency) * 0.15 + Math.min(ac / 50, 0.2) * 0.1
      return { id: r.id as string, title: r.title as string, content: r.content as string,
        type: r.type as MemoryType, source: r.source as MemorySource, importance,
        access_count: ac, last_accessed_at: lastAccess, created_at: r.created_at as string,
        updated_at: null, score: Math.round(score * 1000) / 1000 }
    })

    if (params.types?.length) matches = matches.filter(m => params.types!.includes(m.type))
    matches.sort((a, b) => b.score - a.score)
    const top = matches.slice(0, params.limit ?? 10)

    const now = nowISO()
    for (const m of top) {
      try { this.db.run(`UPDATE observations SET access_count=access_count+1,last_accessed_at=? WHERE id=?`, [now, m.id], 'global') } catch {}
      try { this.db.run(`UPDATE observations SET access_count=access_count+1,last_accessed_at=? WHERE id=?`, [now, m.id], 'project') } catch {}
    }
    return top
  }

  deleteById(id: string, scope: 'global' | 'project'): boolean {
    const existing = this.db.get(`SELECT id FROM observations WHERE id=?`, [id], scope)
    if (!existing) return false
    this.db.run(`DELETE FROM observations WHERE id=?`, [id], scope)
    return true
  }

  deleteByQuery(query: string, scope: 'global' | 'project'): number {
    const ftsQuery = sanitizeFtsQuery(query)
    if (!ftsQuery) return 0
    const ids = this.db.all(
      `SELECT o.id FROM observations_fts JOIN observations o ON o.rowid=observations_fts.rowid WHERE observations_fts MATCH ?`,
      [ftsQuery], scope,
    ) as { id: string }[]
    for (const { id } of ids) this.db.run(`DELETE FROM observations WHERE id=?`, [id], scope)
    return ids.length
  }

  getStats() {
    const globalTotal = (this.db.get(`SELECT COUNT(*) as c FROM observations`, [], 'global') as { c: number })?.c ?? 0
    const projectTotal = (this.db.get(`SELECT COUNT(*) as c FROM observations`, [], 'project') as { c: number })?.c ?? 0
    const byType = (this.db.all(
      `SELECT type,COUNT(*) as c FROM observations GROUP BY type ORDER BY c DESC`, [], 'both'
    ) as { type: string; c: number }[]).reduce((a, r) => { a[r.type] = r.c; return a }, {} as Record<string, number>)
    const bySource = (this.db.all(
      `SELECT source,COUNT(*) as c FROM observations GROUP BY source ORDER BY c DESC`, [], 'both'
    ) as { source: string; c: number }[]).reduce((a, r) => { a[r.source] = r.c; return a }, {} as Record<string, number>)
    return { total: globalTotal + projectTotal, global: globalTotal, project: projectTotal, by_type: byType, by_source: bySource }
  }

  getRecentForContext(maxTokens: number, maxMemories: number): string {
    const rows = this.db.all(
      `SELECT title,content,type,importance FROM observations ORDER BY importance DESC,access_count DESC,created_at DESC LIMIT ?`,
      [maxMemories], 'both',
    ) as { title: string; content: string; type: string; importance: number }[]
    let context = '', tokens = 0
    for (const r of rows) {
      const entry = `[${r.type}] ${r.title}: ${r.content}`
      const t = approximateTokens(entry)
      if (tokens + t > maxTokens) break
      context += entry + '\n'; tokens += t
    }
    return context
  }

  saveSessionSummary(sessionID: string, summary: string): void {
    this.save({ title: `Sesión: ${sessionID.slice(0, 8)}`, content: summary, type: 'conversation', source: 'auto_compaction', importance: 0.6 }, 'project')
  }
}

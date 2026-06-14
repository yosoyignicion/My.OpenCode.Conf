import type { MemoryRecord } from './types.js'

export interface DecayOptions {
  lambda: number
  minImportance: number
  accessBoost: number
}

export const DEFAULT_DECAY_OPTIONS: DecayOptions = {
  lambda: 0.2,
  minImportance: 0.1,
  accessBoost: 0.5,
}

export const IMPORTANCE_WHITELIST_THRESHOLD = 0.85

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function effectiveScore(record: MemoryRecord, options: DecayOptions, now: number = Date.now()): number {
  const created = new Date(record.created_at).getTime()
  if (!Number.isFinite(created)) return record.importance
  const ageDays = Math.max(0, (now - created) / 86_400_000)
  const recency = clamp(Math.exp(-options.lambda * ageDays), 0, 1)
  const ac = Math.max(0, record.access_count)
  const accessWeight = clamp(1 + options.accessBoost * Math.log(1 + ac), 1, 1 + options.accessBoost * 5)
  return record.importance * recency * accessWeight
}

export interface MergeGroup {
  parent: MemoryRecord
  children: MemoryRecord[]
}

export interface CompactResult {
  keep: MemoryRecord[]
  merge: MergeGroup[]
  drop: MemoryRecord[]
}

export function compactCandidates(records: MemoryRecord[], options: DecayOptions, maxKeep = 0.7): CompactResult {
  if (!records.length) return { keep: [], merge: [], drop: [] }

  const scored = records.map(r => ({ r, s: effectiveScore(r, options) }))
  scored.sort((a, b) => b.s - a.s)

  const total = records.length
  const keepCount = Math.max(1, Math.ceil(total * maxKeep))
  const dropZone = scored.slice(keepCount)
  const drop: MemoryRecord[] = []
  for (const { r } of dropZone) {
    if (r.importance < options.minImportance) drop.push(r)
  }

  const keptRecords = scored.filter(x => !drop.includes(x.r)).map(x => x.r)

  const whitelist = new Set<string>()
  const groupable: MemoryRecord[] = []
  for (const r of keptRecords) {
    if (r.importance > IMPORTANCE_WHITELIST_THRESHOLD) whitelist.add(r.id)
    else groupable.push(r)
  }

  const groups = new Map<string, MemoryRecord[]>()
  for (const r of groupable) {
    const titlePrefix = r.title.replace(/\s+/g, ' ').trim().slice(0, 50).toLowerCase()
    const key = `${r.type}::${titlePrefix}`
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }

  const merge: MergeGroup[] = []
  const singletons: MemoryRecord[] = []
  for (const list of groups.values()) {
    if (list.length === 1) {
      singletons.push(list[0]!)
      continue
    }
    list.sort((a, b) => b.importance - a.importance)
    const [parent, ...children] = list
    if (!parent) continue
    const parentMerged: MemoryRecord = {
      ...parent,
      title: list.reduce((a, b) => (b.title.length > a.length ? b.title : a), parent.title),
      content: list.map(x => sanitizeForMerge(x.content)).join(' --- '),
      importance: Math.max(...list.map(x => x.importance)),
      access_count: list.reduce((s, x) => s + x.access_count, 0),
    }
    merge.push({ parent: parentMerged, children })
  }

  const keep: MemoryRecord[] = [...whitelist.size > 0 ? keptRecords.filter(r => whitelist.has(r.id)) : [], ...singletons, ...merge.map(m => m.parent)]
  return { keep, merge, drop }
}

function sanitizeForMerge(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export interface DecayReport {
  total: number
  avgDecay: number
  healthyCount: number
  atRisk: number
  healthyThreshold: number
  atRiskThreshold: number
}

export function decayReport(records: MemoryRecord[], options: DecayOptions, now: number = Date.now()): DecayReport {
  if (!records.length) {
    return { total: 0, avgDecay: 0, healthyCount: 0, atRisk: 0, healthyThreshold: 0.5, atRiskThreshold: 0.2 }
  }
  const scores = records.map(r => effectiveScore(r, options, now))
  const total = scores.length
  const avg = scores.reduce((a, b) => a + b, 0) / total
  const healthyThreshold = 0.5
  const atRiskThreshold = 0.2
  const healthyCount = scores.filter(s => s >= healthyThreshold).length
  const atRisk = scores.filter(s => s < atRiskThreshold).length
  return {
    total,
    avgDecay: Math.round(avg * 1000) / 1000,
    healthyCount,
    atRisk,
    healthyThreshold,
    atRiskThreshold,
  }
}

export function rankByDecay(records: MemoryRecord[], options: DecayOptions, now: number = Date.now()): { record: MemoryRecord; score: number }[] {
  return records.map(r => ({ record: r, score: effectiveScore(r, options, now) })).sort((a, b) => b.score - a.score)
}

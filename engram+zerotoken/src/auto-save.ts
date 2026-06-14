import type { AutoSaveCandidate, MemoryType, MemorySource } from './types.js'

const KEYWORD_PATTERNS: { regex: RegExp; type: MemoryType; importance: number }[] = [
  { regex: /recuerda\s+(que\s+)?(.+)/i, type: 'general', importance: 0.8 },
  { regex: /guarda\s+(esto|esta)\s+(.+)/i, type: 'general', importance: 0.8 },
  { regex: /importante:\s*(.+)/i, type: 'general', importance: 0.9 },
  { regex: /no\s+olvides\s+(que\s+)?(.+)/i, type: 'general', importance: 0.9 },
  { regex: /ten\s+en\s+cuenta\s+(que\s+)?(.+)/i, type: 'preference', importance: 0.7 },
  { regex: /recordar\s+(que\s+)?(.+)/i, type: 'general', importance: 0.8 },
  { regex: /persiste\s+(esto|que)\s+(.+)/i, type: 'general', importance: 0.8 },
]

const ARCHITECTURE_PATTERNS: { regex: RegExp; type: MemoryType; importance: number }[] = [
  { regex: /(vamos\s+a|voy\s+a)\s+usar\s+(.+)/i, type: 'architecture', importance: 0.8 },
  { regex: /la\s+arquitectura\s+(es|será|consiste\s+en)\s+(.+)/i, type: 'architecture', importance: 0.9 },
  { regex: /(estructura|setup|configuración)\s+del\s+proyecto\s*(:|es)\s*(.+)/i, type: 'config', importance: 0.8 },
  { regex: /(decidí|decidimos|he\s+decidido)\s+(usar|implementar|adoptar)\s+(.+)/i, type: 'architecture', importance: 0.9 },
  { regex: /el\s+stack\s+(es|será|incluye)\s+(.+)/i, type: 'architecture', importance: 0.8 },
]

function detect(text: string, patterns: typeof KEYWORD_PATTERNS, prefix: string): AutoSaveCandidate[] {
  const candidates: AutoSaveCandidate[] = []
  for (const p of patterns) {
    const m = text.match(p.regex)
    if (m) {
      const captured = m[m.length - 1].trim()
      if (captured.length > 3) {
        candidates.push({
          title: prefix ? `${prefix}: ${truncate(captured)}` : truncate(captured),
          content: captured, type: p.type, source: (prefix ? 'auto_architecture' : 'auto_keyword') as MemorySource,
          importance: p.importance,
        })
      }
    }
  }
  return candidates
}

export function detectKeywordSave(text: string): AutoSaveCandidate[] {
  return detect(text, KEYWORD_PATTERNS, '')
}
export function detectArchitectureSave(text: string): AutoSaveCandidate[] {
  return detect(text, ARCHITECTURE_PATTERNS, 'Arquitectura')
}

export interface ErrorFixDetector { check(text: string): AutoSaveCandidate | null }

const ERROR_INDICATORS = [/error/i, /failed/i, /fallo/, /exception/i, /traceback/i, /stack\s+trace/i, /syntaxerror/i, /typeerror/i, /referenceerror/i]
const RESOLUTION_INDICATORS = [/solucionado/, /resuelto/, /fixed/i, /arreglado/, /funciona/, /ya\s+está/, /works/i, /corregido/, /funcionando/]

export function createErrorFixDetector(): ErrorFixDetector {
  let lastError: string | null = null
  let lastErrorTime: number | null = null

  return {
    check(text: string): AutoSaveCandidate | null {
      if (ERROR_INDICATORS.some(p => p.test(text))) {
        lastError = text.slice(0, 2000)
        lastErrorTime = Date.now()
        return null
      }
      if (lastError && RESOLUTION_INDICATORS.some(p => p.test(text)) && (Date.now() - (lastErrorTime ?? 0)) < 300_000) {
        const c: AutoSaveCandidate = {
          title: `Fix: ${truncate(text.slice(0, 80))}`,
          content: `**Error:**\n${lastError.slice(0, 300)}\n\n**Solución:**\n${text.slice(0, 300)}`,
          type: 'error_solution', source: 'auto_error_fix', importance: 0.85,
        }
        lastError = null; lastErrorTime = null
        return c
      }
      return null
    },
  }
}

export function detectAll(text: string, errorFix: ErrorFixDetector): AutoSaveCandidate[] {
  return [...detectKeywordSave(text), ...detectArchitectureSave(text), ...(errorFix.check(text) ? [errorFix.check(text)!] : [])]
}

function truncate(text: string, maxLen = 80): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length <= maxLen ? cleaned : cleaned.slice(0, maxLen) + '...'
}

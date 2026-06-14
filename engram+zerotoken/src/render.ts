import type { MemoryRecord, MemoryType, SearchMatch } from './types.js'

function isUnicodeSupported(): boolean {
  if (process.platform !== 'win32') {
    return process.env.TERM !== 'linux'
  }
  return Boolean(process.env.WT_SESSION)
    || Boolean(process.env.TERMINUS_SUBLIME)
    || process.env.ConEmuTask === '{cmd::Cmder}'
    || process.env.TERM_PROGRAM === 'Terminus-Sublime'
    || process.env.TERM_PROGRAM === 'vscode'
    || process.env.TERM === 'xterm-256color'
    || process.env.TERM === 'alacritty'
    || process.env.TERM === 'rxvt-unicode'
    || process.env.TERM === 'kitty'
    || process.env.TERM?.endsWith('-256color')
    || process.env.COLORTERM === 'truecolor'
}

const unicode = isUnicodeSupported()
const useColor = process.env.NO_COLOR === undefined && process.env.FORCE_COLOR !== '0'

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightYellow: '\x1b[93m',
  brightCyan: '\x1b[96m',
}

export function c(color: string, text: string): string {
  return useColor ? `${color}${text}${ANSI.reset}` : text
}

export const BOX = unicode
  ? {
      tl: '┌', tr: '┐', bl: '└', br: '┘',
      h: '─', v: '│',
      tm: '┬', bm: '┴', lm: '├', rm: '┤', mm: '┼',
      tt: '┬', bt: '┴',
    }
  : {
      tl: '+', tr: '+', bl: '+', br: '+',
      h: '-', v: '|',
      tm: '+', bm: '+', lm: '+', rm: '+', mm: '+',
      tt: '+', bt: '+',
    }

const TYPE_COLORS: Record<MemoryType, string> = {
  architecture: ANSI.red,
  error_solution: ANSI.yellow,
  config: ANSI.cyan,
  general: ANSI.dim,
  preference: ANSI.magenta,
  learned_pattern: ANSI.green,
  conversation: ANSI.brightCyan,
  command: ANSI.brightYellow,
}

export function typeColor(t: MemoryType): string {
  return TYPE_COLORS[t] ?? ANSI.white
}

export function shortId(id: string): string {
  return id.slice(0, 8)
}

export function truncate(s: string, n: number): string {
  if (n <= 0) return ''
  const arr = [...s]
  if (arr.length <= n) return s
  if (n <= 1) return arr[0] ?? ''
  return arr.slice(0, n - 1).join('') + '…'
}

export function sanitizeContent(s: string): string {
  const cleaned = s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
  return cleaned.trim()
}

export function ageString(iso: string | null, now = Date.now()): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Math.max(0, now - t)
  if (diff < 60_000) return 'just now'
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  const y = Math.floor(d / 365)
  return `${y}y ago`
}

export function scoreBar(score: number, width = 5): string {
  const clamped = Math.max(0, Math.min(1, score))
  const filled = Math.round(clamped * width)
  return unicode ? '▓'.repeat(filled) + '░'.repeat(width - filled) : '#'.repeat(filled) + '.'.repeat(width - filled)
}

export function getTerminalWidth(defaultWidth = 100, minWidth = 60): number {
  const w = process.stdout?.columns ?? defaultWidth
  return Math.max(minWidth, Math.min(defaultWidth, w || defaultWidth))
}

export interface SearchResultOptions {
  unicode?: boolean
  color?: boolean
  width?: number
  showContent?: boolean
  contentLines?: number
}

export interface StatusOptions {
  unicode?: boolean
  color?: boolean
  width?: number
}

export interface CardOptions {
  unicode?: boolean
  color?: boolean
  width?: number
  showContent?: boolean
  contentLines?: number
  showId?: boolean
}

export interface ColumnDef<T> {
  key: keyof T | string
  header: string
  width?: number
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  format?: (row: T) => string
}

export interface TableOptions {
  unicode?: boolean
  color?: boolean
  width?: number
  defaultColMin?: number
}

export class EngramRenderer {
  private color: boolean
  private box: typeof BOX

  constructor(opts: { unicode?: boolean; color?: boolean } = {}) {
    this.color = opts.color ?? (useColor && (opts.unicode ?? unicode))
    this.box = (opts.unicode ?? unicode) ? BOX : BOX
  }

  private colorize(c: string, t: string): string {
    return this.color ? `${c}${t}${ANSI.reset}` : t
  }

  renderSearchResults(matches: SearchMatch[], options: SearchResultOptions = {}): string {
    const width = options.width ?? getTerminalWidth()
    if (!matches.length) return this.colorize(ANSI.dim, '(no results)')
    const lines: string[] = []
    const titleBar = ` ${matches.length} result${matches.length === 1 ? '' : 's'} `
    const pad = Math.max(0, Math.floor((width - titleBar.length) / 2))
    lines.push(this.colorize(ANSI.bold, '─'.repeat(pad) + titleBar + '─'.repeat(width - pad - titleBar.length)))
    for (const m of matches) {
      lines.push(this.renderCard(m, {
        width,
        showContent: options.showContent ?? true,
        contentLines: options.contentLines ?? 3,
        showId: true,
      }))
    }
    return lines.join('\n')
  }

  renderStatus(
    stats: { total: number; global: number; project: number; by_type: Record<string, number>; by_source: Record<string, number> },
    paths: { global: string; project?: string | null },
    options: StatusOptions = {},
  ): string {
    const width = options.width ?? getTerminalWidth()
    const lines: string[] = []
    lines.push(this.colorize(ANSI.bold + ANSI.cyan, 'Engram Status'))
    lines.push(this.box.tl + this.box.h.repeat(width - 2) + this.box.tr)
    lines.push(this.box.v + ' Global: ' + truncate(paths.global, width - 12) + ' '.repeat(Math.max(0, width - 12 - truncate(paths.global, width - 12).length)) + this.box.v)
    if (paths.project) {
      const left = ' Project: ' + truncate(paths.project, width - 12)
      lines.push(this.box.v + left + ' '.repeat(Math.max(0, width - 2 - left.length)) + this.box.v)
    }
    const counts = ` Totals: ${stats.total} (global=${stats.global}, project=${stats.project}) `
    lines.push(this.box.v + this.colorize(ANSI.bold, counts) + ' '.repeat(Math.max(0, width - 2 - counts.length)) + this.box.v)
    lines.push(this.box.lm + this.box.h.repeat(width - 2) + this.box.rm)

    const typeEntries = Object.entries(stats.by_type).sort((a, b) => b[1] - a[1])
    if (typeEntries.length) {
      lines.push(this.box.v + this.colorize(ANSI.bold, ' By type:') + ' '.repeat(Math.max(0, width - 11)) + this.box.v)
      for (const [t, c] of typeEntries) {
        const bar = scoreBar(Math.min(1, c / Math.max(1, stats.total)), 8)
        const line = `   ${t.padEnd(16)} ${String(c).padStart(4)}  ${bar}`
        const colored = this.colorize(typeColor(t as MemoryType), line)
        lines.push(this.box.v + colored + ' '.repeat(Math.max(0, width - 2 - line.length)) + this.box.v)
      }
    }
    const sourceEntries = Object.entries(stats.by_source).sort((a, b) => b[1] - a[1])
    if (sourceEntries.length) {
      lines.push(this.box.lm + this.box.h.repeat(width - 2) + this.box.rm)
      lines.push(this.box.v + this.colorize(ANSI.bold, ' By source:') + ' '.repeat(Math.max(0, width - 12)) + this.box.v)
      for (const [s, c] of sourceEntries) {
        const line = `   ${s.padEnd(20)} ${String(c).padStart(4)}`
        lines.push(this.box.v + line + ' '.repeat(Math.max(0, width - 2 - line.length)) + this.box.v)
      }
    }
    lines.push(this.box.bl + this.box.h.repeat(width - 2) + this.box.br)
    return lines.join('\n')
  }

  renderCard(record: MemoryRecord & { score?: number }, options: CardOptions = {}): string {
    const width = options.width ?? getTerminalWidth()
    const contentLines = options.contentLines ?? 4
    const showContent = options.showContent ?? true
    const showId = options.showId ?? true
    const idLabel = showId ? ` [${shortId(record.id)}]` : ''
    const scoreLabel = typeof record.score === 'number' ? ` ${scoreBar(record.score)} ${record.score.toFixed(2)}` : ''
    const headerLeft = ` ${record.type}${idLabel}`
    const headerRight = `${ageString(record.created_at)}${scoreLabel} `
    const innerWidth = width - 2
    const leftLen = headerLeft.length
    const rightLen = headerRight.length
    const filler = Math.max(1, innerWidth - leftLen - rightLen)
    const top = this.box.tl + this.box.h.repeat(leftLen) + this.box.h.repeat(filler) + this.box.h.repeat(rightLen) + this.box.tr
    const headerLine = this.box.v + this.colorize(typeColor(record.type), headerLeft) + ' '.repeat(filler) + this.colorize(ANSI.dim, headerRight) + this.box.v
    const titleLine = this.box.v + this.colorize(ANSI.bold, ' ' + truncate(record.title, innerWidth - 2)) + ' '.repeat(Math.max(0, innerWidth - 1 - truncate(record.title, innerWidth - 2).length)) + this.box.v
    const meta = ` importance=${record.importance.toFixed(2)}  accesses=${record.access_count}`
    const metaLine = this.box.v + this.colorize(ANSI.dim, truncate(meta, innerWidth - 2)) + ' '.repeat(Math.max(0, innerWidth - truncate(meta, innerWidth - 2).length)) + this.box.v
    const lines: string[] = [top, headerLine, titleLine, metaLine]
    if (showContent) {
      const sep = this.box.lm + this.box.h.repeat(width - 2) + this.box.rm
      lines.push(sep)
      const clean = sanitizeContent(record.content)
      const rawLines = clean.split('\n').slice(0, contentLines)
      for (const ln of rawLines) {
        const t = truncate(ln, innerWidth - 2)
        lines.push(this.box.v + ' ' + t + ' '.repeat(Math.max(0, innerWidth - 1 - t.length)) + this.box.v)
      }
    }
    lines.push(this.box.bl + this.box.h.repeat(width - 2) + this.box.br)
    return lines.join('\n')
  }

  renderTable<T extends Record<string, unknown>>(records: T[], columns: ColumnDef<T>[], options: TableOptions = {}): string {
    const width = options.width ?? getTerminalWidth()
    const defaultColMin = options.defaultColMin ?? 8
    if (!records.length) return this.colorize(ANSI.dim, '(empty)')
    const minTotal = columns.reduce((s, c) => s + (c.minWidth ?? defaultColMin), 0)
    const usableWidth = Math.max(minTotal, width - columns.length - 1)
    const flexCols: ColumnDef<T>[] = []
    let fixedWidth = 0
    for (const c of columns) {
      if (c.width !== undefined) fixedWidth += c.width
      else flexCols.push(c)
    }
    const remaining = Math.max(0, usableWidth - fixedWidth)
    const flexSum = flexCols.reduce((s, c) => s + (c.minWidth ?? defaultColMin), 0) || 1
    const widths: Record<string, number> = {}
    for (const c of columns) {
      if (c.width !== undefined) widths[String(c.key)] = c.width
      else widths[String(c.key)] = Math.max(c.minWidth ?? defaultColMin, Math.floor(remaining * ((c.minWidth ?? defaultColMin) / flexSum)))
    }

    const valueAt = (row: T, col: ColumnDef<T>): string => {
      if (col.format) return col.format(row)
      const v = row[col.key as keyof T]
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    }

    const renderRow = (vals: string[], left: string, mid: string, right: string): string => {
      const cells: string[] = []
      for (let i = 0; i < vals.length; i++) {
        const w = widths[String(columns[i]!.key)]
        const v = truncate(vals[i]!, w)
        const pad = ' '.repeat(w - [...v].length)
        const align = columns[i]!.align ?? 'left'
        const cell = align === 'right' ? pad + v : align === 'center' ? ' '.repeat(Math.floor((w - [...v].length) / 2)) + v + ' '.repeat(Math.ceil((w - [...v].length) / 2)) : v + pad
        cells.push(cell)
      }
      return left + ' ' + cells.join(' ') + ' ' + right
    }

    const border = (left: string, mid: string, right: string): string => {
      const segs: string[] = []
      for (let i = 0; i < columns.length; i++) {
        segs.push(this.box.h.repeat(widths[String(columns[i]!.key)] + 2))
        if (i < columns.length - 1) segs.push(mid)
      }
      return left + segs.join('') + right
    }

    const headerCells = columns.map(c => c.header)
    const top = border(this.box.tl, this.box.tm, this.box.tr)
    const headerSep = border(this.box.lm, this.box.mm, this.box.rm)
    const bottom = border(this.box.bl, this.box.bm, this.box.br)
    const headerLine = renderRow(headerCells, this.box.v, this.box.v, this.box.v)
    const dataLines = records.map(r => renderRow(columns.map(c => valueAt(r, c)), this.box.v, this.box.v, this.box.v))
    const headerColored = this.colorize(ANSI.bold, headerLine)
    return [top, headerColored, headerSep, ...dataLines, bottom].join('\n')
  }
}

export const renderer = new EngramRenderer()

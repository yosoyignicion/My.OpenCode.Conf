import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import { existsSync, accessSync, constants } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { DatabaseManager } from "./db.js"
import { MemoryEngine } from "./memory-engine.js"
import { createErrorFixDetector, detectAll } from "./auto-save.js"
import { getProjectDbPath } from "./utils.js"
import { DEFAULT_OPTIONS } from "./types.js"
import type { Plugin, PluginOptions } from "@opencode-ai/plugin"
import type { ToolResult } from "@opencode-ai/plugin"
import type { EngramOptions, MemoryType } from "./types.js"
import { symbols } from "./constants.js"
import { buildGraphTool, buildDiffTool, buildExportTool, buildCompactTool } from "./commands.js"

const ENGRAM_INSTRUCTIONS = `## Engram
Tools: engram_save, engram_search, engram_forget, engram_context, engram_status. Auto-guarda en "recuerda que...", "importante:" y deteccion error->fix.`

const MEMORY_TYPES = ["general", "config", "architecture", "error_solution", "preference", "learned_pattern", "conversation", "command"] as const
const SCOPES = ["global", "project", "both"] as const

function parseOptions(raw?: PluginOptions): Required<EngramOptions> {
  const opts = (raw ?? {}) as Record<string, unknown>
  const m = structuredClone(DEFAULT_OPTIONS)
  if (typeof opts.global_dir === "string" && opts.global_dir) m.global_dir = opts.global_dir
  if (opts.auto_save && typeof opts.auto_save === "object") {
    const as = opts.auto_save as Record<string, unknown>
    if (typeof as.keywords === "boolean") m.auto_save.keywords = as.keywords
    if (typeof as.error_fix === "boolean") m.auto_save.error_fix = as.error_fix
    if (typeof as.compaction === "boolean") m.auto_save.compaction = as.compaction
    if (typeof as.architecture === "boolean") m.auto_save.architecture = as.architecture
  }
  if (opts.injection && typeof opts.injection === "object") {
    const inj = opts.injection as Record<string, unknown>
    if (typeof inj.enabled === "boolean") m.injection.enabled = inj.enabled
    if (typeof inj.max_memories === "number") m.injection.max_memories = inj.max_memories
    if (typeof inj.max_tokens === "number") m.injection.max_tokens = inj.max_tokens
  }
  return m
}

export default (async (_input: Record<string, unknown>, rawOptions?: PluginOptions): ReturnType<Plugin> => {
  const options = parseOptions(rawOptions)
  const globalDbPath = options.global_dir
    ? join(resolve(options.global_dir), ".engram.db")
    : join(homedir(), ".engram", ".engram.db")

  const db = new DatabaseManager(globalDbPath)
  const errorFixDetector = createErrorFixDetector()

  let engine: MemoryEngine | null = null
  let initializedProject: string | null = null

  function ensureEngine(ctx?: { worktree?: string }): MemoryEngine {
    if (!engine) engine = new MemoryEngine(db)
    const wt = ctx?.worktree
    if (wt && wt !== initializedProject && wt.length > 2 && wt !== "/") {
      try { accessSync(wt, constants.W_OK); db.initProject(wt); initializedProject = wt } catch {}
    }
    return engine
  }

  function extractText(output: { message?: { role?: string; content?: string; parts?: { type?: string; text?: string }[] }; parts?: { type?: string; text?: string }[] }): string {
    const texts: string[] = []
    if (output.message?.content) texts.push(output.message.content)
    for (const p of [...(output.message?.parts ?? []), ...(output.parts ?? [])]) {
      if (p.type === "text" && p.text && !texts.includes(p.text)) texts.push(p.text)
    }
    return texts.join(" ").trim()
  }

  return {
    event: async (input) => {
      const event = input.event as { type: string; properties?: Record<string, unknown> }
      try {
        const props = event.properties as Record<string, unknown> | undefined
        if (event.type === "session.created") {
          const dir = (props as { info?: { directory?: string } } | undefined)?.info?.directory
          if (dir) { try { accessSync(dir, constants.W_OK); db.initProject(dir); initializedProject = dir } catch {} }
        } else if (event.type === "session.compacted" && options.auto_save.compaction && engine) {
          const sid = (props as { sessionID?: string } | undefined)?.sessionID
          if (sid) { try { const c = engine.getRecentForContext(600, 3); if (c) engine.saveSessionSummary(sid, c) } catch {} }
        }
      } catch {}
    },

    tool: {
      engram_save: tool({
        description: "Guarda memoria persistente.",
        args: { title: z.string().describe("Titulo (max 100 chars)"), content: z.string().describe("Contenido"),
          type: z.enum(MEMORY_TYPES).optional().default("general").describe("Tipo: general|config|architecture|error_solution|preference|learned_pattern|conversation|command"),
          scope: z.enum(["global", "project"]).optional().default("project").describe("global o project"),
          importance: z.number().min(0).max(1).optional().default(0.7).describe("0.0-1.0 (def:0.7)") },
        execute: async (args, ctx): Promise<ToolResult> => {
          const me = ensureEngine(ctx)
          const requested: "global" | "project" = args.scope === "global" ? "global" : "project"
          let scope: "global" | "project" = requested
          let fallbackWarning = ""
          if (scope === "project" && !ctx?.worktree) {
            scope = "global"
            fallbackWarning = `\n${symbols.warning} (no worktree detected — saved to global instead of project)`
          }
          const record = me.save({ title: args.title, content: args.content, type: args.type as MemoryType, source: "tool", importance: args.importance }, scope)
          return { output: `${symbols.saved} Memoria guardada (${scope}): "${record.title}" [${record.type}]\nID: ${record.id}${fallbackWarning}`, metadata: { memory_id: record.id, scope } }
        },
      }),

      engram_search: tool({
        description: "Busca memoria con FTS5+scoring.",
        args: { query: z.string().describe("Texto a buscar"), types: z.array(z.enum(MEMORY_TYPES)).optional().describe("Filtrar por tipo"),
          limit: z.number().min(1).max(50).optional().default(10).describe("Max resultados (def:10)"),
          min_importance: z.number().min(0).max(1).optional().default(0).describe("Importancia minima (def:0)"),
          scope: z.enum(SCOPES).optional().default("both").describe("global|project|both") },
        execute: async (args, ctx): Promise<ToolResult> => {
          const me = ensureEngine(ctx)
          const results = me.search({ query: args.query, types: args.types as MemoryType[] | undefined, limit: args.limit, min_importance: args.min_importance })
          if (!results.length) return { output: `${symbols.search} No se encontraron memorias relevantes.` }
          let out = `${symbols.search} ${results.length} resultado(s):\n\n`
          for (const r of results) {
            out += `[${r.score.toFixed(2)}] **${r.title}** (${r.type})\n`
            out += `> ${r.content.length > 200 ? r.content.slice(0, 200) + "..." : r.content}\n`
            out += `_ID: ${r.id} | importancia: ${r.importance} | accesos: ${r.access_count}_\n\n`
          }
          return { output: out }
        },
      }),

      engram_forget: tool({
        description: "Elimina memoria por ID o query.",
        args: { id: z.string().optional().describe("ID exacto"), query: z.string().optional().describe("Query para eliminar"),
          scope: z.enum(["global", "project"]).optional().default("project").describe("global|project") },
        execute: async (args, ctx): Promise<ToolResult> => {
          const me = ensureEngine(ctx)
          const scope = args.scope ?? "project"
          if (args.id) return { output: me.deleteById(args.id, scope) ? `${symbols.deleted} Memoria eliminada: ${args.id}` : `${symbols.warning} No se encontró memoria con ID: ${args.id}` }
          if (args.query) return { output: `${symbols.deleted} ${me.deleteByQuery(args.query, scope)} memoria(s) eliminada(s) matching: "${args.query}"` }
          return { output: `${symbols.warning} Especifica un ID o un query para eliminar.` }
        },
      }),

      engram_context: tool({
        description: "Contexto relevante de memorias.",
        args: { max_tokens: z.number().min(100).max(8000).optional().default(1500).describe("Max tokens (def:1500)"),
          max_memories: z.number().min(1).max(20).optional().default(5).describe("Max memorias (def:5)") },
        execute: async (args, ctx): Promise<ToolResult> => {
          const me = ensureEngine(ctx)
          const context = me.getRecentForContext(args.max_tokens ?? 1500, args.max_memories ?? 5)
          return { output: context ? `${symbols.context} Contexto de memoria:\n\n${context}` : `${symbols.context} No hay memorias para el contexto actual.` }
        },
      }),

      engram_status: tool({
        description: "Estadisticas del sistema Engram.",
        args: {},
        execute: async (_args, ctx): Promise<ToolResult> => {
          const me = ensureEngine(ctx)
          const stats = me.getStats()
          const projectPath = ctx.worktree ? getProjectDbPath(ctx.worktree) : null
          let out = `${symbols.stats} **Engram Status**\n\n`
          out += `**Base global:** ${globalDbPath} - ${existsSync(globalDbPath) ? symbols.saved : symbols.error} (${stats.global} memorias)\n`
          if (projectPath) out += `**Base local:** ${projectPath} - ${existsSync(projectPath) ? symbols.saved : symbols.error} (${stats.project} memorias)\n`
          out += `**Total:** ${stats.total} memorias\n\n**Por tipo:**\n`
          for (const [t, c] of Object.entries(stats.by_type)) out += `  - ${t}: ${c}\n`
          out += `\n**Por fuente:**\n`
          for (const [s, c] of Object.entries(stats.by_source)) out += `  - ${s}: ${c}\n`
          return { output: out }
        },
      }),

      engram_graph: buildGraphTool({ db, globalDbPath }),
      engram_diff: buildDiffTool({ db, globalDbPath }),
      engram_export: buildExportTool({ db, globalDbPath }),
      engram_compact: buildCompactTool({ db, globalDbPath }),
    },

    "chat.message": async (_input, output): Promise<void> => {
      if (!options.auto_save.keywords && !options.auto_save.architecture && !options.auto_save.error_fix) return
      try {
        const text = extractText(output)
        if (!text || text.length < 5) return
        for (const c of detectAll(text, errorFixDetector)) {
          if ((c.source === "auto_keyword" && !options.auto_save.keywords) ||
              (c.source === "auto_architecture" && !options.auto_save.architecture) ||
              (c.source === "auto_error_fix" && !options.auto_save.error_fix)) continue
          ensureEngine().save({ title: c.title, content: c.content, type: c.type, source: c.source, importance: c.importance }, "project")
        }
      } catch {}
    },

    "experimental.session.compacting": async (_input, output): Promise<void> => {
      if (!options.injection.enabled) return
      try {
        if (options.auto_save.compaction) {
          const summary = ensureEngine().getRecentForContext(400, 3)
          if (summary) output.context.push(`\n<engram_memory>\n${summary}\n</engram_memory>`)
        }
      } catch {}
    },

    "experimental.chat.system.transform": async (_input, output): Promise<void> => {
      output.system.push(`\n${ENGRAM_INSTRUCTIONS}\n`)
      if (!options.injection.enabled) return
      try {
        const mems = ensureEngine().getRecentForContext(options.injection.max_tokens || 1500, options.injection.max_memories || 3)
        if (mems) output.system.push(`\n<engram_memory>\n${mems}\n</engram_memory>`)
      } catch {}
    },
  }
}) satisfies Plugin

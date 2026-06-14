---
name: opencode-documentation
description: "Documentación oficial sintetizada de opencode.ai/docs/ organizada en 6 dominios y 32 subcategorías. Cubre CLI, TUI, Web, IDE, ACP, Server, Zen, Config, Providers, Models, Network, Permissions, Plugins, Skills, MCP Servers, Custom Tools, LSP, Rules, Formatters, Commands, Keybinds, Themes, SDK (Go), GitHub, GitLab, Share, Agents, Troubleshooting, Enterprise, Ecosystem, References, Windows/WSL. Self-referential: el agente consulta esto para autoconfigurarse, autocompletar config, autocompletar SKILL.md, autocompletar plugins, autocompletar MCP. Triggers: opencode docs, opencode config, opencode plugin, opencode skill, opencode mcp, opencode tui, opencode cli, opencode agents, opencode acp, opencode sdk, opencode providers, opencode models, opencode lsp, opencode rules, opencode formatters, opencode permissions, opencode keybinds, opencode themes, opencode custom-tools, opencode github, opencode gitlab, opencode share, opencode zen, opencode troubleshooting, opencode enterprise, opencode ecosystem, opencode windows wsl."
---

# opencode-documentation

## Semantic Triggers
```
opencode docs, opencode config, opencode plugin, opencode skill, opencode mcp server,
opencode tui, opencode cli, opencode agents, opencode acp, opencode sdk,
opencode providers, opencode models, opencode network, opencode lsp,
opencode rules, opencode formatters, opencode permissions, opencode keybinds,
opencode themes, opencode custom-tools, opencode commands,
opencode github integration, opencode gitlab integration, opencode share, opencode zen,
opencode troubleshooting, opencode enterprise, opencode ecosystem, opencode windows wsl,
opencode.jsonc, opencode config file, opencode.json
```

---

## 1. Definición Teórica

OpenCode es un agente AI open-source para terminal, escritorio e IDE. Su documentación oficial (https://opencode.ai/docs/) está organizada en 32 subcategorías que cubren 6 dominios: **CORE** (cómo ejecutarlo), **CONFIG** (cómo configurarlo), **EXTENSIBILITY** (cómo extenderlo), **REFERENCE** (catálogo de elementos configurables), **INTEGRATIONS** (conectar a servicios externos), **WORKFLOW** (operarlo y mantenerlo). Esta skill sintetiza todas las 32 subcategorías en un único SKILL.md de referencia, permitiendo al agente autoconfigurarse, autocompletar `opencode.jsonc`, y verificar APIs antes de escribir código de extensión.

---

## 2. Implementación de Referencia

OpenCode versión 1.16+, basado en Bun/Node.js, soporta JSON y JSONC para config, MCP 2025 spec, Agent Skills spec (compatible con Claude/agents), plugins via npm o filesystem.

### Ejemplo Práctico Avanzado: opencode.jsonc canónico

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "autoupdate": true,
  "theme": "system",
  "permission": {
    "edit": "allow", "bash": "ask", "webfetch": "deny"
  },
  "skills": {
    "paths": [".opencode/skills", "~/.config/opencode/skills"]
  },
  "instructions": ["AGENTS.md", "CLAUDE.md"],
  "mcp": {
    "context7":     { "type": "remote", "url": "https://mcp.context7.com/mcp", "enabled": true },
    "sqlite":       { "type": "local",  "command": ["npx","-y","mcp-sqlite","./data.db"] }
  },
  "plugin": ["opencode-wakatime", "@my-org/custom-plugin"],
  "lsp":  { "typescript": { "command": ["typescript-language-server", "--stdio"] } },
  "formatter": { "prettier": { "command": ["prettier","--write"] } },
  "watcher": { "ignore": ["node_modules/**", "dist/**"] },
  "compaction": { "auto": true, "prune": true, "reserved": 5000 }
}
```

**Fuente oficial:** https://opencode.ai/docs/config/

### Alternativa: SKILL.md canónico (Agent Skills spec)

```markdown
---
name: my-skill
description: "One-line description with trigger keywords. Required."
---

# my-skill

## When to use
Triggers: foo, bar, baz.

## Instructions
Step-by-step what the agent should do when this skill is loaded.
```

**Fuente oficial:** https://opencode.ai/docs/skills/

---

## 3. Estructura: 6 dominios × 32 subcategorías

### DOMINIO 1 — CORE (interfaces de uso)

| # | Subcategoría | URL | Qué cubre |
|---|---|---|---|
| 1.1 | CLI | `/docs/cli/` | Comandos: `agent`, `attach`, `auth`, `github`, `mcp`, `models`, `run`, `serve`, `session`, `stats`, `export`, `import`, `web`, `acp`, `plugin`, `pr`, `db`, `debug`, `uninstall`, `upgrade`. Global flags (`--continue`, `--session`, `--fork`, `--model`, `--agent`, `--port`, `--hostname`, `--mdns`). |
| 1.2 | TUI | `/docs/tui/` | Interfaz terminal interactiva. File references con `@`, bash commands con `!`, comandos slash (`/init`, `/compact`, `/undo`, `/redo`, `/editor`, `/sessions`, `/share`, `/themes`, `/thinking`, `/help`). |
| 1.3 | Web | `/docs/web/` | Frontend web browser-based, conexión a server local. |
| 1.4 | IDE | `/docs/ide/` | Extensión IDE (VSCode, etc). Integra opencode en el editor. |
| 1.5 | ACP | `/docs/acp/` | Agent Client Protocol — integración con clientes ACP. |
| 1.6 | Server | `/docs/server/` | Modo servidor headless para integrar opencode programáticamente. |
| 1.7 | Zen | `/docs/zen/` | Modo "zen": provider interno sin API keys, sandbox seguro. |

### DOMINIO 2 — CONFIG (cómo configurar el agente)

| # | Subcategoría | URL | Qué cubre |
|---|---|---|---|
| 2.1 | Config | `/docs/config/` | `opencode.jsonc`, format JSON/JSONC, locations (Remote, Global `~/.config/opencode/opencode.jsonc`, Per project, Custom path, Custom directory, Managed settings). **Settings merge, not replace** — configs se combinan, solo se overridean keys conflictivas. |
| 2.2 | Providers | `/docs/providers/` | Anthropic, OpenAI, Google, Bedrock, Groq, etc. Config en `provider.<name>`. Override de headers, baseURL, modelos custom. |
| 2.3 | Models | `/docs/models/` | Modelo por defecto, modelo por agente, formato `provider/model`. Variants (claude-opus, claude-sonnet, etc). |
| 2.4 | Network | `/docs/network/` | Proxy, TLS, timeouts, retries, mDNS discovery. |
| 2.5 | Permissions | `/docs/permissions/` | Por tool (`bash`, `edit`, `webfetch`, `read`, `grep`, `glob`, `task`, `skill`): `allow` / `ask` / `deny`. Per-agent overrides. |

### DOMINIO 3 — EXTENSIBILITY (cómo añadir capacidades)

| # | Subcategoría | URL | Qué cubre |
|---|---|---|---|
| 3.1 | Plugins | `/docs/plugins/` | Cargar plugins desde `.opencode/plugins/` o `~/.config/opencode/plugins/` (filesystem) o desde npm (auto-instalados con Bun). 17 eventos hookeables. TypeScript-first. |
| 3.2 | Skills | `/docs/skills/` | Especificación Agent Skills (compatible con Claude/.claude/skills y agents/.agents/skills). `SKILL.md` con YAML frontmatter (`name`, `description` requerida). Carga on-demand. |
| 3.3 | MCP Servers | `/docs/mcp-servers/` | Servidores locales (stdio) o remotos (HTTPS). Caveat: **añaden al context** — un GitHub MCP consume muchos tokens. Ejemplos: Sentry, Context7, Grep by Vercel. |
| 3.4 | Custom Tools | `/docs/custom-tools/` | Definir tools propios sin necesidad de plugin completo, vía plugin o MCP. |
| 3.5 | LSP | `/docs/lsp/` | Integración con Language Server Protocol por lenguaje (`typescript-language-server`, `pyright`, `gopls`, `rust-analyzer`). |
| 3.6 | Rules | `/docs/rules/` | Reglas globales que el agente sigue siempre (estilo de código, convenciones de naming, etc). |
| 3.7 | Formatters | `/docs/formatters/` | Formateo automático on-save: `prettier`, `black`, `gofmt`, `rustfmt`. Config en `formatter.<tool>`. |

### DOMINIO 4 — REFERENCE (catálogos)

| # | Subcategoría | URL | Qué cubre |
|---|---|---|---|
| 4.1 | Commands | `/docs/commands/` | Comandos slash de la TUI: `connect`, `compact`, `details`, `editor`, `exit`, `export`, `help`, `init`, `models`, `new`, `redo`, `sessions`, `share`, `themes`, `thinking`, `undo`, `unshare`. |
| 4.2 | Keybinds | `/docs/keybinds/` | Atajos de teclado. Config en `keybinds.<command>`. |
| 4.3 | Themes | `/docs/themes/` | Temas visuales: `system`, `dark`, `light`, custom CSS. |
| 4.4 | SDK (Go) | `/docs/sdk/` | SDK oficial en Go para integrar opencode como librería: `github.com/opencode/sdk-go`. |

### DOMINIO 5 — INTEGRATIONS (servicios externos)

| # | Subcategoría | URL | Qué cubre |
|---|---|---|---|
| 5.1 | GitHub | `/docs/github/` | Integración con GitHub: PR creation, issue management, code review via MCP GitHub server. |
| 5.2 | GitLab | `/docs/gitlab/` | Análogo a GitHub para GitLab. |
| 5.3 | Share | `/docs/share/` | Compartir sesiones con otros, export markdown. |

### DOMINIO 6 — WORKFLOW (operar y mantener)

| # | Subcategoría | URL | Qué cubre |
|---|---|---|---|
| 6.1 | Agents | `/docs/agents/` | Tipos: primary (main) y subagents. Built-in: `build`, `plan`, `general`, `explore`, `scout`, `compaction`, `title`, `summary`. Crear custom agents con `opencode agent create` o JSON. |
| 6.2 | Troubleshooting | `/docs/troubleshooting/` | Problemas comunes y soluciones. |
| 6.3 | Enterprise | `/docs/enterprise/` | Config gestionada, SSO, auditoría, compliance. |
| 6.4 | Ecosystem | `/docs/ecosystem/` | Directorio de plugins/skills/MCPs de la comunidad. |
| 6.5 | References | `/docs/references/` | Schema completo de `opencode.jsonc` (todos los keys). |
| 6.6 | Windows/WSL | `/docs/windows-wsl` | Instalación y quirks en Windows + WSL. |

---

## 4. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar este skill** | Cualquier consulta que toque config, plugins, skills, MCP, agentes, providers, keybinds, formatters, LSP, TUI commands, o integración con servicios. |
| **Cuándo evitar** | Para decisiones de aplicación (Next.js, Rust, SQL) — esos tienen skills dedicados. Esta skill es **meta**: sobre opencode mismo, no sobre apps construidas con opencode. |
| **Fuentes vivas** | Esta skill es un **snapshot**. Para docs actualizadas, siempre contrastar con `https://opencode.ai/docs/<sección>/` vía WebFetch o Context7. |
| **Coste/Complejidad** | ~3000 tokens al cargar. Carga solo cuando el usuario pregunta por opencode mismo, no por código escrito con opencode. |

---

## 5. Cheatsheet Rápido

```bash
# Install
curl -fsSL https://opencode.ai/install | bash
# o: npm i -g opencode-ai | bun add -g opencode-ai | brew install anomalyco/tap/opencode

# Run
opencode                           # TUI
opencode run "explain closures"    # one-shot
opencode serve --port 4096         # headless server
opencode acp                       # Agent Client Protocol

# Config
opencode agent create               # interactive agent wizard
opencode models list                # see available models
opencode mcp list                   # see MCP servers

# TUI slash commands
/init                               # initialize project context
/compact                            # compact conversation context
/sessions                           # browse history
/share                              # export session
/themes                             # switch theme
```

```jsonc
// opencode.jsonc minimal
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5"
}
```

---

## 6. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~3000 tokens estimados.
- **Trigger de activación:** palabras en español/inglés que mencionen opencode + concepto (ver lista arriba). NO cargar para preguntas de código genéricas.
- **Prioridad de carga:** **Alta** para preguntas meta (sobre opencode mismo); **Baja** para código de aplicación.
- **Dependencias:** ninguna. Pero **complementaria con** `context7-mcp-docs` (para fetch live de otras libs) y `engram-memory-system` (para auto-gardar configs del propio opencode).

### Tool Integration

```json
{
  "tool_name": "opencode-documentation",
  "description": "Documentación oficial sintetizada de opencode en 6 dominios × 32 subcategorías. Self-referential: el agente se autoconfigura leyendo esto.",
  "triggers": [
    "opencode config", "opencode plugin", "opencode skill",
    "opencode mcp", "opencode.jsonc", "opencode agents",
    "opencode tui", "opencode cli", "opencode acp",
    "opencode lsp", "opencode formatters", "opencode permissions",
    "opencode providers", "opencode models", "opencode keybinds",
    "opencode themes", "opencode custom-tools", "opencode commands"
  ],
  "context_hint": "Cargar solo si la consulta es META sobre opencode. Para código de aplicación (Next.js, Rust, etc) hay skills dedicadas — NO cargar esta.",
  "output_format": "markdown",
  "max_tokens": 3000
}
```

### Prompt Snippet

```
Cuando el usuario pregunte sobre opencode mismo (config, plugins, skills, MCP,
agentes, providers, TUI commands, integraciones), carga el skill
opencode-documentation. Si la docs evoluciona, complementa con
context7_query-docs("sst/opencode", query).
```

---

## 7. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `context7-mcp-docs` | Complementaria: fetch live de otras libs | Sí, si la respuesta necesita validar contra la doc vigente |
| `engram-memory-system` | Complementaria: persistir configs opencode entre proyectos | Opcional |
| `mcp-tools-protocol` | Complementaria: spec JSON-RPC 2.0 que opencode implementa | Opcional |
| `plugins-extensibility-agent` | Superconjunto: patrones de plugin en general | Solo si la consulta es muy abstracta |
| `customize-opencode` | **Conflitiva** — built-in skill que también cubre opencode. Esta skill es **alternativa/más completa** porque tiene las 32 subcategorías sintetizadas. | No, una u otra. |

---

## 8. Metadatos del Skill

```yaml
---
id: opencode-documentation
domain: meta-tools
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: ignicion
status: active
archive_after: 2026-08-13  # 60 días sin uso
source: oficial (https://opencode.ai/docs/)
tags: [opencode, meta, config, plugins, skills, mcp, agents, self-reference]
trigger_count: 32
subcategories_covered: 32/32
urls_fetched: 8 (intro + 7 deep-dives)
---
```

---

## 9. Disclaimer de vigencia

Esta skill es un **snapshot del 2026-06-14** de la documentación oficial. La doc de opencode evoluciona rápido. Antes de actuar sobre un campo de config o un evento de plugin, **verificar contra la URL original** listada en la columna URL de la tabla §3, o usar `context7_query_docs` con `libraryId="sst/opencode"`. Las secciones con cambios recientes están marcadas con `(verificar)` en §2 si aplica.

---

*Skill generada por ignicion, fuente: opencode.ai/docs/ + 7 páginas deep-dive + memoria de proyecto.*

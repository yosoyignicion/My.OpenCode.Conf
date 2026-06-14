# engram+zerotoken

> **Memoria persistente entre sesiones + política zero-token. El componente que convierte a opencode en un agente con continuidad, no en un chat con amnesia.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blue)](https://opencode.ai)
[![Runtime: Bun](https://img.shields.io/badge/bun-required-f9f1e1)](https://bun.sh)
[![Tests: bun test](https://img.shields.io/badge/tests-bun%20test-000)](test/)

---

## ¿Qué hace esto?

Es un **plugin de opencode** escrito en TypeScript que:

1. **Persiste memoria entre sesiones** vía SQLite + FTS5 (con tokenizer `trigram` para matching parcial en español).
2. **Auto-guarda** lo que el usuario le dice con frases como *"recuerda que..."*, *"importante:"*, *"la arquitectura es..."*, o cuando un `error` → `solucionado` ocurre en <5 min.
3. **Inyecta memorias relevantes** automáticamente al inicio de cada conversación (hasta 2 memorias, 600 tokens).
4. **Implementa la política zero-token** que mantiene las respuestas del agente concisas (≤10 palabras o JSON).

Es uno de los 3 sub-proyectos del repo [`my-opencode`](../). Los otros son [`skill-matrix/`](../skill-matrix/) y [`second-termux-v2/`](../second-termux-v2/).

---

## TL;DR (30 segundos)

```bash
cd engram+zerotoken
bun install
bun test test/
```

Si los 6 tests pasan, el plugin está sano. Para usarlo dentro de opencode, basta con que `~/.config/opencode/opencode.jsonc` apunte a `["./src/engram.ts"]` — el instalador del repo padre se encarga.

---

## Arquitectura

```
engram+zerotoken/
├── src/
│   ├── engram.ts          ← entrypoint del plugin (~25 líneas de wiring)
│   ├── db.ts              ← SQLite manager (global + project)
│   ├── memory-engine.ts   ← CRUD de memorias
│   ├── auto-save.ts       ← detectores de keywords/error→fix
│   ├── commands.ts        ← tools expuestos al agente
│   ├── types.ts           ← 8 tipos de memoria
│   ├── constants.ts       ← símbolos y defaults
│   └── utils.ts           ← helpers
├── test/                  ← bun test (6 archivos)
│   ├── engram.test.ts
│   ├── render.test.ts
│   ├── decay.test.ts
│   ├── graph.test.ts
│   ├── commands.test.ts
│   ├── fixtures/
│   └── smoke.sh
├── opencode.json          ← config del plugin (auto_save, injection)
├── package.json
├── tsconfig.json
├── zero-tokens-policy/
└── .gitignore
```

### Las dos DBs

| DB | Ruta | Scope | Quién escribe |
|---|---|---|---|
| **Global** | `~/.engram/.engram.db` | Todas las sesiones, todos los proyectos | El plugin (auto) + el usuario (manual) |
| **Snapshot local** | `./.engram/.engram.db` | Backup personal al instalar | El plugin (auto) — NO usada en runtime |

> La DB vive **fuera del proyecto** (`~/.engram/`). La carpeta `.engram/` dentro de este repo es un **snapshot personal** deliberado, ignorado por git. No la borres a menos que sepas lo que haces.

### Schema (resumido)

```sql
CREATE TABLE engram_entries (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        TEXT CHECK(type IN (
                'general','config','architecture',
                'error_solution','preference',
                'learned_pattern','conversation','command'
              )),
  scope       TEXT CHECK(scope IN ('global','project')) DEFAULT 'project',
  source      TEXT,
  importance  REAL DEFAULT 0.7,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE VIRTUAL TABLE engram_fts USING fts5(
  title, content,
  content='engram_entries', content_rowid='id',
  tokenize='trigram'           -- matching parcial + español
);
```

### Los 8 tipos de memoria

| Tipo | Cuándo se usa | Importance default |
|---|---|---|
| `general` | Memoria genérica sin categoría | 0.7 |
| `config` | Configuración de un proyecto | 0.8 |
| `architecture` | Decisión arquitectónica | 0.9 (pineada) |
| `error_solution` | Error → fix verificado | 0.9 (pineada) |
| `preference` | Preferencia del usuario | 0.6 |
| `learned_pattern` | Patrón usado ≥2 veces con éxito | 0.8 |
| `conversation` | Hito conversacional | 0.5 |
| `command` | Comando exitoso recurrente | 0.7 |

> **Pineada = importance ≥ 0.9 → no decae nunca.** Las decisiones de arquitectura y las soluciones de error son "para siempre" por defecto.

### Decay

```
importance_efectiva = importance × (1 / (1 + horas_desde_update))
```

A las 24h sin update, una memoria de importance 0.5 vale 0.087. Una pineada (≥0.9) sigue valiendo 0.9 para siempre.

### Auto-save triggers

| Frase en tu mensaje | Tipo guardado | Importance |
|---|---|---|
| *"recuerda que…"*, *"importante:"*, *"no olvides"*, *"ten en cuenta"*, *"persiste"* | varies | 0.8 |
| *"vamos a usar"*, *"la arquitectura es"*, *"decidí usar"*, *"el stack es"* | `architecture` | 0.9 |
| `error`/`failed`/`traceback` → `solucionado`/`fixed`/`funciona` (< 5 min) | `error_solution` | 0.9 |

### Tools expuestos al agente

`engram_save`, `engram_search`, `engram_forget`, `engram_context`, `engram_status`, `engram_compact`, `engram_graph`, `engram_export`, `engram_diff`.

---

## Instalación y verificación

### Prereqs

- **Bun** ≥ 1.0 — `curl -fsSL https://bun.sh/install | bash`
- **opencode** ≥ 1.16 — https://opencode.ai
- **node-gyp** chain si compilas `better-sqlite3` desde fuente: `sudo apt install -y python3 make g++`

### Install (standalone)

```bash
cd engram+zerotoken
bun install              # solo si necesitas node_modules para tests/dev
```

No hay build step. El plugin se carga directamente desde `src/engram.ts`.

### Verificación

```bash
# 1. Typecheck
npm run typecheck        # tsc --noEmit

# 2. Run all tests
bun test test/

# 3. Run individual tests
bun test test/render.test.ts
bun test test/decay.test.ts
bun test test/graph.test.ts
bun test test/commands.test.ts

# 4. Smoke test (real end-to-end via opencode)
bun run test:smoke       # ejecuta test/smoke.sh
```

Si los 5 tests de `bun test` pasan, el plugin está sano. El smoke test (`bash test/smoke.sh`) lanza una sesión real de opencode con el plugin cargado.

### Verificar que el plugin carga en opencode

```bash
# Verifica que opencode reconoce el plugin
opencode mcp list 2>/dev/null   # MCPs, no el plugin
# El plugin se carga desde opencode.json → plugin array, no desde MCP.
grep -A2 "plugin" ~/.config/opencode/opencode.jsonc
# debe mostrar: ["./src/engram.ts", { "auto_save": {...} }]
```

### Inyectar manualmente una memoria de prueba

```bash
# En opencode TUI, escribe:
# "recuerda que el setup de engram está activo"
# → debe aparecer una entrada nueva en ~/.engram/.engram.db

# Verificarla desde la shell:
sqlite3 ~/.engram/.engram.db "SELECT id, title, type, importance FROM engram_entries ORDER BY id DESC LIMIT 5;"
```

---

## Prompt para tu agente: explorar este subproyecto

Si quieres que **tu propio agente** (opencode, Claude Code, Cline, Cursor) entienda este plugin en profundidad, copia esta carpeta a tu workspace y pégale al agente estas tres líneas:

> **Copy-paste prompt (3 líneas):**
> ```
> Explore ~/path/to/engram+zerotoken/. Read AGENTS.md (if present), opencode.json, package.json, src/engram.ts, and test/.
> Summarise the plugin's lifecycle: when does it auto-save, when does it inject, when does it decay, when does it compact?
> For the SQLite schema and FTS5 trigram tokenize behavior, use context7 (resolve-library-id + query-docs)
> to fetch the official SQLite docs and cache the answer in engram with prefix "ctx7:".
> ```

**Por qué funciona:**

1. *"Read AGENTS.md, opencode.json, package.json, src/engram.ts, test/"* — apunta a los 5 puntos de entrada: configuración, contrato, código real, y tests como spec ejecutable.
2. *"Summarise the plugin's lifecycle…"* — fuerza al agente a entender el **flujo temporal** (auto-save → inyección → decay → compactación), no solo la estructura estática.
3. *"use context7 to fetch the official SQLite docs…"* — SQLite + FTS5 tienen quirks reales (trigram tokenizer, triggers, virtual tables) que el LLM no debe inventar.

> **Bonus:** si tu agente no es opencode, sustituye `engram_*` por un archivo local `notes.md` y `context7_*` por `WebFetch` de `https://sqlite.org/fts5.html`.

---

## Política Zero-Token (qué hace al agente)

Este plugin también implementa (a nivel de instrucciones, no de código) la política zero-token:

- Respuestas ≤10 palabras o JSON directo
- Sin saludos, despedidas, ni explicaciones innecesarias
- Búsqueda en Engram FTS5 antes de llamar al LLM
- Referencia por ID de memoria, no por descripción larga
- Encoding UTF-8 estricto en todo write/edit

> **Cómo se aplica:** el plugin inyecta este bloque en cada `system prompt`:
> ```
> ## Engram
> Tools: engram_save, engram_search, engram_forget, engram_context, engram_status.
> Auto-guarda en "recuerda que...", "importante:" y deteccion error->fix.
> ```
> Combinado con el AGENTS.md del repo, el agente recibe la instrucción de ser conciso sin sacrificar la potencia.

---

## Añadir un nuevo tool a Engram

Los tools del plugin están en `src/commands.ts`. Para añadir uno:

```typescript
// 1. En src/commands.ts, importa y crea
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"

export const buildMyTool = (deps: Deps) => tool({
  description: "Does X with Y",
  args: {
    input: z.string().describe("The input to process"),
  },
  async execute({ input }) {
    // your logic
    return { output: result }
  },
})

// 2. En src/engram.ts, regístralo
import { buildMyTool } from "./commands.js"
// ...
const myTool = buildMyTool({ db, engine })
return {
  tool: {
    engram_save: buildSave({ ... }),
    engram_my_tool: myTool,    // ← nuevo
    // ...
  }
}
```

```bash
# Verifica
npm run typecheck
bun test test/commands.test.ts
```

Reinicia opencode → el nuevo tool aparece disponible para el agente.

---

## Troubleshooting

### `bun:sqlite` no se encuentra

```bash
which bun  # debe apuntar a ~/.bun/bin/bun o similar
# Reinstala bun si la versión es < 1.0
curl -fsSL https://bun.sh/install | bash
```

### `better-sqlite3` falla al compilar

```bash
sudo apt install -y python3 make g++
rm -rf node_modules
bun install
```

### El plugin no se carga en opencode

```bash
# 1. Verifica que el path en opencode.jsonc es correcto
cat ~/.config/opencode/opencode.jsonc | grep -A3 "plugin"

# 2. Verifica que el archivo existe
ls -la /path/to/engram+zerotoken/src/engram.ts

# 3. Reinicia opencode (no basta con cerrar y abrir; mata el proceso)
```

### `engram_search` no encuentra memorias que deberían estar

```bash
# 1. Verifica la DB
ls -la ~/.engram/.engram.db

# 2. FTS5 con trigram necesita ≥3 chars
sqlite3 ~/.engram/.engram.db "SELECT COUNT(*) FROM engram_entries;"
sqlite3 ~/.engram/.engram.db "SELECT id, title FROM engram_fts WHERE engram_fts MATCH 'remember';"

# 3. Si la DB está corrupta, el plugin la recrea en el próximo save
# (puedes borrar la DB vieja: rm ~/.engram/.engram.db*)
```

### Quiero resetear la memoria

```bash
# ⚠️ Borra TODAS las memorias
rm -rf ~/.engram
# El plugin la recrea vacía en el primer save.
```

---

## Licencia y créditos

**MIT** © 2026 ignicion — ver [`../LICENSE`](../LICENSE)

Este sub-proyecto es parte del bundle [`my-opencode`](../). Diseño e implementación del autor. Stack:

- [Bun](https://bun.sh) — runtime + `bun:sqlite` binding nativo
- [SQLite + FTS5](https://sqlite.org/fts5.html) — persistencia + búsqueda full-text
- [opencode plugin API](https://opencode.ai/docs/plugins/) — `tool()`, `Plugin`, `PluginOptions`
- [zod](https://zod.dev) — validación de argumentos

---

> *"La memoria es lo que separa un chat de un colega."*

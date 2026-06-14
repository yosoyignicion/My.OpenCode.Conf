# my-opencode

```
███╗   ███╗██╗   ██╗       ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗
████╗ ████║╚██╗ ██╔╝      ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
██╔████╔██║ ╚████╔╝ █████╗██████╔╝██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██║  ██║█████╗
██║╚██╔╝██║  ╚██╔╝  ╚════╝██╔═══╝ ██╔══██╗██╔══╝  ██║╚██╗██║██║     ██║   ██║██║  ██║██╔══╝
██║ ╚═╝ ██║   ██║         ██║     ██║  ██║███████╗██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝     ╚═╝   ╚═╝         ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
                                                                                          v1.0
```

> *Un bundle open-source que convierte `opencode` en algo serio: 249 skills bajo demanda, memoria persistente, y un orquestador que devuelve una sola línea premium en vez de inundar tu terminal.*

**Open source · Listo para probar · Se puede desinstalar**

---

## 🩸 La historia detrás de esto

> *Si alguna vez has visto a un agente escupir 200 líneas de `npm install` en tu terminal mientras intentabas mantener una conversación, este proyecto existe por ti.*

`my-opencode` nació de una pregunta simple: **¿qué pasaría si opencode viniera con memoria, habilidades, y un protocolo de ejecución que respeta tu atención?** La respuesta no es otra app monolítica. Es un **bundle de tres proyectos independientes** que se conectan mediante un protocolo abierto y un prompt maestro que se autoconfigura en cualquier sistema operativo.

No es magia. Es ingeniería honesta: TypeScript, SQLite, FTS5, y un montón de iteraciones hasta que la fricción desapareció.

> *Te invito a probarlo, a romperlo, a leer el código, y a decirme qué cambiarías. El proyecto está vivo, se actualiza, y se puede desinstalar limpiamente. Sin lock-in, sin telemetría oculta, sin sorpresas.*

— ignicion, 2026

---

## ⚡ Lo que obtienes (en 60 segundos)

| Capacidad | Antes (opencode pelado) | Con `my-opencode` |
|---|---|---|
| **Memoria entre sesiones** | ❌ Empiezas de cero cada vez | ✅ SQLite con FTS5, 8 tipos, decay automático |
| **Skills técnicas** | ❌ Traes las tuyas | ✅ 249 skills curadas (Next.js, K8s, Go, Rust, ML, diseño, ...) |
| **Skills de diseño** | ❌ Manual | ✅ 14 skills de iconografía, tipografía, badges, motion |
| **Background jobs** | ⚠️ Inundan la TUI con logs | ✅ Una sola línea `✨ name ✓ 0 (3.2s) @HH:MM:SS` |
| **Docs actualizadas** | ❌ El LLM alucina APIs | ✅ Context7 trae docs oficiales en vivo |
| **Respuestas ruidosas** | ❠ Saludos, despedidas, párrafos | ✅ ≤10 palabras o JSON, sin preámbulos |
| **Errores recurrentes** | ❠ Aprende a base de cicatrices | ✅ Engram auto-guarda error→fix cuando se repite |
| **Personalización** | ❠ Editas `~/.config/opencode/` a mano | ✅ Un prompt maestro que lo hace por ti |

---

## 🏗️ Cómo está montado

```
┌─────────────────────────────────────────────────────────────────────┐
│  my-opencode  (config bundle, sin código de instalación)            │
│                                                                     │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────┐ │
│  │  skill-matrix/    │  │  second-termux-v2/ │  │ engram+zero.../ │ │
│  │                   │  │                    │  │                │ │
│  │  249 SKILL.md     │  │  MCP server        │  │ opencode       │ │
│  │  + template       │  │  + 3 shims (st,    │  │ plugin         │ │
│  │  + 14 design      │  │  bgx, second-      │  │ + SQLite +     │ │
│  │    skills         │  │  termux)           │  │   FTS5 +       │ │
│  │                   │  │  + premium line    │  │   bun:sqlite   │ │
│  │  Markdown only    │  │  + auto-heal       │  │                │ │
│  └───────────────────┘  └───────────────────┘  └────────────────┘ │
│         ▲                          ▲                     ▲         │
│         └──────────────────────────┴─────────────────────┘         │
│                       Conectados por 3 MCPs:                       │
│                  context7 · sqlite · second-termux                  │
└─────────────────────────────────────────────────────────────────────┘
```

| Proyecto | Qué hace | Lenguaje | Build |
|---|---|---|---|
| [`skill-matrix/`](skill-matrix/README.md) | 249 skills (técnicas + diseño + auto-healing), formato SKILL.md de 9 secciones | Markdown | — |
| [`second-termux-v2/`](second-termux-v2/README.md) | MCP server que ejecuta jobs en background y devuelve una línea premium | TypeScript (ESM) | `npm run build` |
| [`engram+zerotoken/`](engram+zerotoken/README.md) | Plugin opencode con memoria tipada en SQLite+FTS5, auto-save, decay | TypeScript (Bun) | sin build step |

> *Los tres son **independientes** y se pueden usar por separado. La magia está en que se hablan entre sí a través de MCP, un protocolo abierto.*

---

## 🧠 Sobre tu AGENTS.md global (la pieza que heredas de opencode)

> *Esta sección es la que mucha gente se salta y luego se pierde. Léela, son 3 minutos.*

`my-opencode` **no** trae su propio protocolo de ejecución. En su lugar, **hereda** el `AGENTS.md` global de opencode (424 líneas, en `~/.config/opencode/AGENTS.md`). Esto es intencional: el proyecto no quiere reinventar cómo le hablas a un agente, prefiere sumarse al estándar que opencode ya mantiene.

### ¿Qué hay dentro del AGENTS.md global?

| § | Sección | Qué hace por ti |
|---|---|---|
| 0 | Identity Charter | Las reglas core del agente (zero-token, anti-patrones) |
| 1 | Dual-Agent Protocol | Cómo el agente se desdobla en **Builder** (escribe) + **Copilot** (valida) en paralelo |
| 2 | Skills Auto-Trigger | Tabla de keywords → skills. Detecta "next.js" y carga la skill adecuada |
| 3 | Engram Memory | Cómo el agente recuerda y olvida (importance + decay) |
| 4 | Context7 Fast | Cómo cachea docs de librerías para no pedirle 2 veces lo mismo |
| 5 | Zero-Token Output | ≤10 palabras o JSON. La regla que evita el ruido |
| 5.5 | Tool Selection | **MCP second-termux en vez de bash raw** para builds largos. Línea `✨` en vez de 200 líneas de log |
| 6 | Quality Gates | Tests, smoke checks, git hygiene antes de dar nada por hecho |
| 7 | Anti-Patterns | Lo que **nunca** debe hacer (8 patrones prohibidos) |
| 8 | Sister Manifests | Cómo se coordina con tus otros AGENTS.md (Tríada, router, etc) |

### ¿Y este proyecto qué aporta encima?

Tres cosas concretas, **específicas de my-opencode** (no duplican el global):

1. **Mapeo de paths** — qué archivo del repo corresponde a qué key de `opencode.jsonc`. Sin esto, el agente no sabe qué patchear.
2. **Comandos verificados** — `npm run build` aquí, `bun test` allí, **no al revés**. Un error de runtime al elegir mal el runner.
3. **Trampas documentadas** — el entrypoint del plugin engram **no** se copia a `~/.config/opencode/` (rompe silencioso), `bun test` en `second-termux-v2/` **no** funciona (usa tsx). Las aprendimos a base de errores.

> *Si modificas tu AGENTS.md global, no estás rompiendo `my-opencode`. El proyecto sobrevive a cambios en el global porque solo lo lee.*

---

## 🧙 Prompt maestro: instalar my-opencode desde cero (cualquier OS)

**Filosofía**: cero scripts de instalación que mantener, el agente se autoconfigura. Funciona idéntico en Linux, macOS, Windows/WSL, FreeBSD — el propio agente detecta el SO y adapta los comandos.

### Requisito único previo

Tener **opencode CLI** instalado. Si no lo tienes, una sola línea:

```bash
curl -fsSL https://opencode.ai/install | bash
```

(o `npm i -g opencode-ai`, `brew install anomalyco/tap/opencode`, `pacman -S opencode-bin` — el agente conoce las 4).

### El prompt (pégalo en opencode TUI con un directorio vacío como CWD)

> **Install prompt:**
> ```
> Install my-opencode bundle. The repo is at <path/to/my-opencode> (clone it first
> if it doesn't exist: `git clone <repo-url>` into a writable dir, then cd into it).
> Do these steps in order. After each step, report the exact output and a one-line
> premium-style summary. Roll back the failed step if any check fails. Never proceed
> past a failure.
>
> 1. PREREQS — Detect OS via `uname -s`. Verify each, install if missing, report:
>      - node ≥ 20 (via node --version; install via https://nodejs.org or nvm)
>      - bun ≥ 1.0 (via bun --version; install via https://bun.sh if missing)
>      - opencode CLI in PATH (via `which opencode`)
>      - sqlite3 native binding (via `python3 make g++` on Debian/Ubuntu,
>        `xcode-select --install` on macOS, skip on Windows/WSL if pre-built)
>
> 2. SKILLS — Copy the repo's skill-matrix/skills-matrix/ into your global skills root
>    so the catalog is auto-discovered without per-project config:
>      - On Linux/macOS: ~/.config/opencode/skills-matrix
>      - On Windows/WSL: %USERPROFILE%\.config\opencode\skills-matrix
>    Use `cp -a` (or `Copy-Item -Recurse` on PowerShell). Verify with `ls` that
>    `00-standard-skill-template/SKILL.md` is reachable. All 249 skills (incl.
>    design + auto-healing) live in this single folder.
>
> 3. CONFIG PATCH — Edit ~/.config/opencode/opencode.jsonc (or the opencode global
>    config on your OS). Back up the file first: opencode.jsonc.bak.YYYYMMDDHHMMSS.
>    Then add or merge these blocks:
>      - skills.paths += [absolute paths to skill-matrix/skills-matrix,
>        second-termux-v2/opencode-integration]
>      - instructions += [absolute path to skill-matrix/AGENTS.md]
>      - mcp.context7 = { type: "remote", url: "https://mcp.context7.com/mcp", enabled: true }
>      - mcp.sqlite   = { type: "local",  command: ["npx","-y","mcp-sqlite","./data.db"], enabled: true }
>    Re-serialise with JSON.stringify. Comments in the original config will be lost
>    (acceptable, the backup preserves them).
>
> 4. SECOND-TERMUX — Build the orchestrator:
>      - `cd <repo>/second-termux-v2 && npm install && npm run build`
>      - Link the 3 shims into a directory on PATH: st, bgx, second-termux
>        (default: ~/.local/bin/ on Linux/macOS, $env:LOCALAPPDATA on Windows/WSL)
>      - Register the MCP server in opencode.jsonc (the second-termux/install.sh
>        sub-installer used to do this; if missing, add manually with
>        command = ["node", "<repo>/second-termux-v2/dist/src/server.js"])
>
> 5. ENGRAM — Set up the memory plugin:
>      - `cd <repo>/engram+zerotoken && bun install`
>      - Ensure the global DB dir exists: `mkdir -p ~/.engram`
>      - The plugin loads via opencode.jsonc plugin[] array pointing to
>        ["./src/engram.ts"] with auto_save + injection config (the sub-readme
>        has the canonical block)
>
> 6. SMOKE CHECKS — Run and report each. All must pass:
>      - `opencode mcp list`               → must show context7, sqlite, second-termux all connected
>      - `st version`                      → must print "second-termux v2.x.x"
>      - `bgx echo "smoke"`                → must print a line starting with ✨
>      - `ls -la ~/.engram/`               → must exist and be writable
>      - `find <repo>/skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l`  → must be ≥ 230
>      - `bun test <repo>/engram+zerotoken/test/`  → all tests pass
>      - `sqlite3 --version`               → must print a version
>
> 7. CACHE — Use engram_save to persist each step's result with title
>    "install:my-opencode:<step>" and importance 0.7. Use context7_query-docs
>    with libraryId="sst/opencode" whenever you hit an unknown API or config key.
>
> 8. FINAL — On full success, output exactly:
>      "✨ my-opencode installed. Restart opencode TUI to activate."
>    On any failure, output the failing step + the rollback performed.
> ```

### Qué valida este prompt (en orden)

| # | Validación | Criterio de éxito |
|---|---|---|
| 1 | Prereqs | node ≥20, bun ≥1, opencode en PATH, sqlite3 build chain |
| 2 | Skills discovery | `00-standard-skill-template/SKILL.md` visible desde `~/.config/opencode/skills-matrix/` |
| 3 | Config patch | `opencode.jsonc` válido (parseable por node), 4 bloques mergeados, backup timestamped |
| 4 | Second-termux | `st` corre, `bgx` genera línea `✨`, dist/ contiene `server.js` |
| 5 | Engram | `bun test` pasa, `~/.engram/` escribible, plugin entrypoint existe |
| 6 | Smoke checks | 7/7 verdes |
| 7 | Memoria | Cada paso guardado en Engram con prefijo `install:my-opencore:` |
| 8 | Rollback | Si algo falla, el paso concreto se revierte (no rollback total) |

### Por qué esto y no un `install.sh`

- **Cero código de instalación que mantener** — el prompt es texto, no binario
- **Cero variantes por OS** — el agente detecta `uname -s` y adapta
- **Idempotente por diseño** — re-ejecutar el prompt = re-validar, no re-instalar destructivo
- **Usa el propio stack del repo** — `context7` para APIs desconocidas, `engram` para cachear el resultado, `engram` para auto-recordar que ya tienes node instalado
- **Testeable desde opencode TUI mismo** — pegas el prompt, observas, ajustas

### Si no tienes opencode todavía

Instálalo primero con la línea del inicio, luego vuelve aquí y pega el prompt. Es la única dependencia dura.

---

## 🛠️ Cómo funciona por dentro (para curiosos)

### MCP Servers — qué hace cada uno

| Server | Tipo | Comando | Herramientas | Por qué está |
|---|---|---|---|---|
| `context7` | remoto (HTTPS) | `https://mcp.context7.com/mcp` | `resolve-library-id`, `query-docs` | Trae docs oficiales actualizadas de cualquier librería, sin alucinar |
| `sqlite` | local stdio | `npx -y mcp-sqlite ./data.db` | 8 tools de SQL | SQLite como herramienta nativa del chat: el agente crea tablas, queries, joins |
| `second-termux` | local stdio | `node .../second-termux-v2/dist/src/server.js` | 10 tools `bg_*` | Builds, tests, daemons → una línea `✨` en vez de 200 líneas de log |

### Plugin Engram — la memoria persistente

El corazón de "el agente que recuerda". Cuando dices *"recuerda que..."* o *"importante: ..."*, el plugin:

1. **Auto-detecta** keywords y archiva la frase en SQLite
2. **Asigna tipo** (architecture, error_solution, preference, learned_pattern, ...)
3. **Calcula importance** (0-1; las arquitecturas se pinean a 0.9)
4. **Aplica decay** (los recuerdos recientes y los muy importantes ascienden al prompt)
5. **Inyecta** los 2-3 recuerdos más relevantes en cada nueva consulta (≤600 tokens)

> *El usuario nunca llama a `engram_save` a mano. Funciona en background. Pruébalo: di "ignicion prefiere la respuesta corta" en una sesión, abre otra, pregunta algo — y observa cómo el agente lo trae al contexto.*

### AGENTS.md — el protocolo dual-agente v3.0

> *Ya cubierto arriba en "Sobre tu AGENTS.md global". Si llegaste aquí por el link directo, vuelve un párrafo arriba.*

---

## 🧹 Desinstalar (limpio, sin residuos)

> *El proyecto es 100% reversible. Esto es intencional — no queremos lock-in, queremos que lo pruebes sin miedo.*

### Opción A — Desinstalación rápida (recomendada)

Pega este prompt en opencode TUI:

```
Uninstall my-opencode. The repo is at <path/to/my-opencode>. Do these steps in
order. After each step, report success and a premium-line. Never proceed past
a failure.

1. RESTORE CONFIG — Find the most recent ~/.config/opencode/opencode.jsonc.bak.*
   (highest timestamp). Copy it back to opencode.jsonc. If no backup exists,
   warn the user and stop — do not delete the active config.

2. REMOVE SKILLS — Delete the copy you created in step 2 of the install prompt:
      - Linux/macOS: rm -rf ~/.config/opencode/skills-matrix
      - Windows/WSL: Remove-Item -Recurse -Force $env:USERPROFILE\.config\opencode\skills-matrix

3. UNREGISTER MCPs — Edit opencode.jsonc (restored in step 1) and remove the
   mcp.context7, mcp.sqlite, mcp.second-termux blocks you added in install step 3.
   Do not touch other keys. Save.

4. SECOND-TERMUX — Stop any running sessions (`st cleanup --all`),
   remove the shims (`rm ~/.local/bin/{st,bgx,second-termux}`), and delete
   the dist/ build output (`rm -rf <repo>/second-termux-v2/dist`).
   Keep the repo: the user might reinstall.

5. ENGRAM — Confirm the user wants to delete their memory DB:
   `rm -rf ~/.engram`. If they say no, keep it (the DB survives uninstalls
   by design — your memories are yours, not ours).

6. VERIFY — Run and report each:
     - `opencode mcp list`            → should NOT show second-termux / context7 / sqlite from this bundle
     - `which st bgx second-termux`   → should print "not found" or empty
     - `[ -d ~/.engram/ ] && echo "kept" || echo "removed"`

7. FINAL — Output exactly:
   "✨ my-opencode uninstalled. opencode is back to baseline."
```

### Opción B — Desinstalación quirúrgica (1 comando)

Si solo quieres quitar el bundle y conservar opencode tal cual:

```bash
# Esto elimina las skills, MCPs, y binarios, restaurando tu config previa
rm -rf ~/.config/opencode/skills-matrix \
       ~/.local/bin/{st,bgx,second-termux} \
       ~/.local/share/second-termux/
cp -a $(ls -t ~/.config/opencode/opencode.jsonc.bak.* | head -1) \
      ~/.config/opencode/opencode.jsonc
echo "✨ my-opencode desinstalado (tu ~/.engram/ queda intacto si quieres conservarlo)"
```

> *Por diseño, `~/.engram/` **no se borra automáticamente**. Tus recuerdos son tuyos.*

### Opción C — Nuclear (borrar todo, incluyendo memoria)

```bash
rm -rf ~/.config/opencode/skills-matrix \
       ~/.local/bin/{st,bgx,second-termux} \
       ~/.local/share/second-termux/ \
       ~/.engram/                         # ← solo si estás seguro
cp -a $(ls -t ~/.config/opencode/opencode.jsonc.bak.* | head -1) \
      ~/.config/opencode/opencode.jsonc
```

> *Esto es irreversible. Una vez borrado `~/.engram/`, los recuerdos se van. Exporta primero si quieres conservarlos: `engram_export project ~/my-opencode-memories.md`.*

---

## 🩺 Troubleshooting

> *Los 6 problemas más comunes, y la solución exacta. Si tu problema no está aquí, abre un issue con la salida de `opencode mcp list` y `st version`.*

### `node-gyp` falla compilando `mcp-sqlite`

**Causa:** faltan las build tools nativas. **Fix:**
```bash
# Debian/Ubuntu
sudo apt install python3 make g++

# macOS
xcode-select --install

# Fedora/RHEL
sudo dnf install python3 make gcc-c++
```

### `bun` no encontrado

**Causa:** Bun es opcional pero el plugin engram lo necesita para tests y para `bun:sqlite`. **Fix:**
```bash
curl -fsSL https://bun.sh/install | bash
```

### `opencode mcp list` no muestra los 3 servers

**Causa:** el patch de `opencode.jsonc` no se aplicó, o los paths absolutos son incorrectos. **Fix:**
1. Verifica el archivo: `cat ~/.config/opencode/opencode.jsonc | jq`
2. Compara con el backup más reciente: `diff <(jq -S . ~/.config/opencode/opencode.jsonc) <(jq -S . $(ls -t ~/.config/opencode/opencode.jsonc.bak.* | head -1))`
3. Re-ejecuta el prompt maestro (es idempotente).

### Las skills no se cargan en opencode

**Causa:** los paths en `skills.paths[]` apuntan a carpetas inexistentes o son relativos en vez de absolutos. **Fix:**
```bash
# Los paths deben ser ABSOLUTOS
jq '.skills.paths' ~/.config/opencode/opencode.jsonc
# Esperado: ["/home/ignicion/Documentos/dev-space/My.OpenCode.Conf/skill-matrix/skills-matrix", ...]

# Después, REINICIA el TUI de opencode (no basta con cerrar y abrir)
```

### Engram no encuentra la DB

**Causa:** `~/.engram/` no existe o no es escribible. **Fix:**
```bash
mkdir -p ~/.engram && touch ~/.engram/.engram.db && [ -w ~/.engram/ ] && echo "OK" || echo "FAIL"
```

### Quiero empezar desde cero

**Causa:** la config se ha vuelto un nido de ratas. **Fix:**
```bash
# 1. Desinstala (Opción A del bloque anterior)
# 2. Borra el repo y vuelve a clonarlo
rm -rf <path/to/my-opencode>
git clone <repo-url>
# 3. Re-ejecuta el prompt maestro
```

---

## 📂 Estructura final del repositorio

```
my-opencode/
├── AGENTS.md                              ← orientación para el agente en este repo
├── README.md                              ← este archivo
├── LICENSE                                ← MIT © 2026 ignicion
├── .gitignore
│
├── skill-matrix/                          ← 249 skills (técnicas + diseño + auto-healing)
│   ├── AGENTS.md                          ← (símbolo del router, no se commitea)
│   ├── README.md                          ← tour del catálogo
│   └── skills-matrix/                     ← 249 SKILL.md (técnicas + diseño + auto-healing)
│       ├── 00-standard-skill-template/
│       ├── opencode-documentation/        ← docs oficiales de opencode
│       ├── plugins-extensions/            ← OCS-flavored plugin protocol
│       ├── auto-healing/                  ← 10 skills de resiliencia y recuperación
│       ├── advanced-effects/              ← skills de diseño (consolidadas aquí)
│       ├── badge-system/
│       └── ... (242 más, ver INDEX.md)
│
├── second-termux-v2/                      ← MCP server de background jobs
│   ├── README.md                          ← arquitectura, tests, sistema de heal
│   ├── src/                               ← TypeScript ESM (Node ≥ 20)
│   ├── dist/                              ← output compilado (no editar)
│   ├── opencode-integration/              ← SKILL.md on-demand + fragment.jsonc
│   └── package.json
│
└── engram+zerotoken/                      ← Plugin de memoria persistente
    ├── README.md                          ← schema, tipos, auto-save
    ├── src/                               ← TypeScript (Bun + bun:sqlite)
    │   └── engram.ts                      ← entrypoint del plugin (204 líneas)
    ├── test/                              ← bun test (6 archivos)
    ├── opencode.json                      ← config per-subdir (auto-carga el plugin)
    └── package.json
```

> *Si llegaste hasta aquí, ya conoces el proyecto mejor que el 90% de los usuarios potenciales. Comparte, itera, y si encuentras una mejora, un PR es bienvenido.*

---

## 🎓 Para tu propio agente (3 líneas, copy-paste)

> *Si quieres que tu propio agente (opencode, Claude Code, Cline, Cursor) entienda este repo en 30 segundos, pégale esto:*

```
Explore ~/path/to/my-opencode/. Read AGENTS.md (root) for repo-specific traps,
then ~/.config/opencode/AGENTS.md (global router, 424 lines) for the dual-agent
protocol. The repo has 3 subprojects (skill-matrix, second-termux-v2,
engram+zerotoken) glued by a prompt maestro — never an install.sh. If you find
a gap, propose the change following the conventions in the existing files.
Cache anything you learn in engram with prefix "ctx7:".
```

---

## 🤝 Licencia y créditos

**MIT** © 2026 ignicion — ver [`LICENSE`](LICENSE)

Construido sobre hombros de gigantes:

- **[Anthropic Agent Skills spec](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)** — formato y convenciones de `SKILL.md`
- **[Context7](https://context7.com)** — fuente de docs oficiales en vivo
- **[opencode](https://opencode.ai)** — runtime del agente
- **249 skills** — autoría mixta (comunidad open-source + curación personal)
- **Diseño de marca** — paleta Memphis Phonk (`#0D0D0D` `#DC2626` `#FFFFFF`)

> *Gracias por llegar hasta aquí. Si el proyecto te sirvió, una ⭐ en GitHub ayuda más de lo que imaginas. Si te rompió algo, un issue con la salida de `opencode mcp list` + `st version` nos ayuda a arreglarlo en horas, no en días.*

---

```
⚡ IgnicionDev v1.0 · MIT · Open source · Bienvenido al futuro del agente local.
```

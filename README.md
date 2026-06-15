<!-- MY·CONF README · darkmode red/black/white · v2.0 -->

<!--
<style>
  :root {
    --bg: #0D0D0D;
    --surface: #121212;
    --surface-hi: #1E1E1E;
    --border: #2A2A2A;
    --text: #E0E0E0;
    --text-dim: #A0A0A0;
    --text-bright: #FFFFFF;
    --red: #DC2626;
    --red-neon: #FF1744;
    --red-glow: rgba(255, 23, 68, 0.45);
    --mono: ui-monospace, 'JetBrains Mono', 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace;
    --display: 'Bebas Neue', 'Oswald', Impact, 'Helvetica Neue Condensed', 'Arial Narrow', sans-serif;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #FAFAFA;
      --surface: #FFFFFF;
      --surface-hi: #F0F0F0;
      --border: #D4D4D4;
      --text: #1A1A1A;
      --text-dim: #555;
      --text-bright: #000;
      --red: #B91C1C;
      --red-neon: #DC2626;
      --red-glow: rgba(220, 38, 38, 0.25);
    }
  }
  /* Reset to look like the rest of GitHub's UI but with our accents */
  html { background: var(--bg); }
  body { color: var(--text); }
  /* Animated accent for headlines */
  @keyframes mc-glow {
    0%, 100% { text-shadow: 0 0 0 transparent, 0 0 0 transparent; }
    50%      { text-shadow: 0 0 8px var(--red-glow), 0 0 22px var(--red-glow), 0 0 2px var(--red); }
  }
  @keyframes mc-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes mc-scan {
    0%   { background-position: 0 0; }
    100% { background-position: 0 8px; }
  }
  @keyframes mc-blink {
    0%, 49% { opacity: 1; }
    50%,100% { opacity: 0.25; }
  }
  .mc-display {
    font-family: var(--display);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-bright);
  }
  .mc-mono { font-family: var(--mono); }
  .mc-red  { color: var(--red-neon); }
  .mc-glow { animation: mc-glow 3.2s ease-in-out infinite; }
  .mc-blink { animation: mc-blink 1.1s steps(1) infinite; }
  .mc-marquee {
    overflow: hidden;
    white-space: nowrap;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    padding: 8px 0;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .mc-marquee__track {
    display: inline-block;
    padding-left: 100%;
    animation: mc-marquee 60s linear infinite;
  }
  .mc-marquee__track span { margin: 0 18px; }
  .mc-marquee__track span::before { content: '◆'; color: var(--red); margin-right: 6px; }
  .mc-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--red);
    padding: 18px 22px;
    border-radius: 0;
    margin: 18px 0;
  }
  .mc-card h3 { margin-top: 0; color: var(--text-bright); }
  .mc-cta {
    display: inline-block;
    padding: 10px 22px;
    border: 2px solid var(--red);
    color: var(--red-neon);
    font-family: var(--display);
    font-size: 18px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    transition: all 0.18s ease;
  }
  .mc-cta:hover {
    background: var(--red);
    color: var(--text-bright);
    box-shadow: 0 0 18px var(--red-glow);
  }
  .mc-ascii {
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.05;
    color: var(--text-dim);
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 16px;
    overflow-x: auto;
    white-space: pre;
  }
  .mc-ascii .hi { color: var(--red-neon); }
  .mc-ascii .br { color: var(--text-bright); }
  .mc-banner-red  { color: var(--red-neon); text-shadow: 0 0 10px var(--red-glow); }
  .mc-banner-white { color: var(--text-bright); }
  .mc-tag {
    display: inline-block;
    padding: 2px 8px;
    font-family: var(--mono);
    font-size: 11px;
    border: 1px solid var(--border);
    color: var(--text-dim);
    background: var(--surface);
    margin-right: 6px;
  }
  .mc-tag--red { color: var(--red-neon); border-color: var(--red); }
  /* Scanline overlay for code blocks (subtle) */
  pre {
    position: relative;
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent 0,
        transparent 3px,
        rgba(255,255,255,0.012) 3px,
        rgba(255,255,255,0.012) 4px
      );
  }
  /* Kill all motion if user requests it */
  @media (prefers-reduced-motion: reduce) {
    .mc-glow, .mc-blink, .mc-marquee__track { animation: none !important; }
  }
  /* Tables: tighter, red-accented first column */
  table { border-collapse: collapse; }
  table th, table td { border: 1px solid var(--border) !important; padding: 8px 12px; }
  table th { background: var(--surface-hi); color: var(--text-bright); }
  table tr td:first-child { color: var(--red-neon); font-weight: 600; }
  /* Headings: typographic rhythm */
  h1, h2 { font-family: var(--display); letter-spacing: 0.02em; text-transform: uppercase; }
  h2 { border-bottom: 2px solid var(--red); padding-bottom: 4px; }
  h3 { color: var(--text-bright); }
  /* Inline code accent */
  code { color: var(--red-neon) !important; background: var(--surface) !important; }
  a { color: var(--red-neon); }
  hr { border: none; border-top: 1px solid var(--border); }
  blockquote {
    border-left: 4px solid var(--red);
    background: var(--surface);
    padding: 12px 18px;
    color: var(--text-dim);
    font-style: italic;
  }
</style>
-->

<!-- ░▒▓ BANNER ▓▒░ -->
<pre class="mc-ascii">
<span class="mc-banner-red">███╗   ███╗██╗   ██╗      ██████╗ ██████╗ ███╗   ██╗███████╗</span>
<span class="mc-banner-red">████╗ ████║╚██╗ ██╔╝     ██╔════╝██╔═══██╗████╗  ██║██╔════╝</span>
<span class="mc-banner-red">██╔████╔██║ ╚████╔╝ ████╗██║     ██║   ██║██╔██╗ ██║█████╗  </span>
<span class="mc-banner-red">██║╚██╔╝██║  ╚██╔╝  ╚═══╝██║     ██║   ██║██║╚██╗██║██╔══╝  </span>
<span class="mc-banner-red">██║ ╚═╝ ██║   ██║        ╚██████╗╚██████╔╝██║ ╚████║██║     </span>
<span class="mc-banner-red">╚═╝     ╚═╝   ╚═╝         ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     </span>
                                                                  
<span class="mc-banner-white">      ╔═╗╔═╗╔╗╔   ╔═╗╔╗╔╔═╗</span>
<span class="mc-banner-white">      ║  ║ ║║║║───║╣ ║║║║╦╝</span>
<span class="mc-banner-white">      ╚═╝╚═╝╝╚╝   ╚═╝╝╚╝╩╚═</span>
                                                                  
                           <span class="mc-red mc-glow">v2.0</span>  ·  <span class="hi">MIT</span>  ·  <span class="br">DARK</span>
</pre>

> *Un bundle open-source que convierte `opencode` en algo serio: **250 skills** bajo demanda, memoria persistente entre sesiones, y un orquestador que devuelve una **sola línea premium** en vez de inundar tu terminal.*

<span class="mc-tag mc-tag--red">DARK MODE</span>
<span class="mc-tag">v2.0.0</span>
<span class="mc-tag">MIT</span>
<span class="mc-tag">250 SKILLS</span>
<span class="mc-tag">3 MCPs</span>
<span class="mc-tag">REVERSIBLE</span>
<span class="mc-tag">BIOME LINTED</span>
<span class="mc-tag">CI VERIFIED</span>

---

## 🩸 La historia detrás de esto

> *Si alguna vez has visto a un agente escupir 200 líneas de `npm install` en tu terminal mientras intentabas mantener una conversación, este proyecto existe por ti.*

`my-opencode` nació de una pregunta simple: **¿qué pasaría si opencode viniera con memoria, habilidades, y un protocolo de ejecución que respeta tu atención?** La respuesta no es otra app monolítica. Es un **bundle de tres proyectos independientes** que se conectan mediante un protocolo abierto y un prompt maestro que se autoconfigura en cualquier sistema operativo.

No es magia. Es ingeniería honesta: **TypeScript, SQLite, FTS5, y un montón de iteraciones hasta que la fricción desapareció.**

> *Te invito a probarlo, a romperlo, a leer el código, y a decirme qué cambiarías. El proyecto está vivo, se actualiza, y se puede desinstalar limpiamente. Sin lock-in, sin telemetría oculta, sin sorpresas.*

— <span class="mc-red">ignicion</span>, 2026

---

<!-- ░▒▓ MARQUEE — 60-second pitch ▓▒░ -->
<div class="mc-marquee">
  <div class="mc-marquee__track">
    <span>250 SKILLS</span><span>MEMORIA PERSISTENTE</span><span>MCP-NATIVE</span><span>ZERO-TOKEN</span><span>BACKGROUND JOBS</span><span>FTS5 + TRIGRAM</span><span>AUTO-HEAL</span><span>CONTEXT7 DOCS</span><span>ENGRAM DECAY</span><span>BRIDGE PREDICTOR</span><span>PHOENIX RECOVERY</span><span>TRÍADA STACK</span>
    <span>250 SKILLS</span><span>MEMORIA PERSISTENTE</span><span>MCP-NATIVE</span><span>ZERO-TOKEN</span><span>BACKGROUND JOBS</span><span>FTS5 + TRIGRAM</span><span>AUTO-HEAL</span><span>CONTEXT7 DOCS</span><span>ENGRAM DECAY</span><span>BRIDGE PREDICTOR</span><span>PHOENIX RECOVERY</span><span>TRÍADA STACK</span>
  </div>
</div>

## ⚡ Lo que obtienes (en 60 segundos)

| Capacidad | Antes (opencode pelado) | Con `my-opencode` |
|---|---|---|
| **Memoria entre sesiones** | ❌ Empiezas de cero cada vez | ✅ SQLite con FTS5, 8 tipos, decay automático |
| **Skills técnicas** | ❌ Traes las tuyas | ✅ 250 skills curadas (Next.js, K8s, Go, Rust, ML, ...) |
| **Skills de diseño** | ❌ Manual | ✅ 13 skills de iconografía, tipografía, badges, motion |
| **Background jobs** | ⚠️ Inundan la TUI con logs | ✅ Una sola línea `✨ name ✓ 0 (3.2s) @HH:MM:SS` |
| **Docs actualizadas** | ❌ El LLM alucina APIs | ✅ Context7 trae docs oficiales en vivo |
| **Respuestas ruidosas** | ⚠️ Saludos, despedidas, párrafos | ✅ ≤10 palabras o JSON, sin preámbulos |
| **Errores recurrentes** | ⚠️ Aprende a base de cicatrices | ✅ Engram auto-guarda error→fix cuando se repite |
| **Personalización** | ⚠️ Editas `~/.config/opencode/` a mano | ✅ Un prompt maestro que lo hace por ti |

---

## 🏗️ Cómo está montado

<pre class="mc-ascii">
<span class="br">┌─────────────────────────────────────────────────────────────────────┐</span>
<span class="br">│</span>  <span class="hi">my-opencode</span>  (config bundle, sin código de instalación)            <span class="br">│</span>
<span class="br">│</span>                                                                     <span class="br">│</span>
<span class="br">│</span>  <span class="br">┌───────────────────┐</span>  <span class="br">┌───────────────────┐</span>  <span class="br">┌────────────────┐</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>  <span class="hi">skill-matrix/</span>    <span class="br">│</span>  <span class="br">│</span>  <span class="hi">second-termux-v2/</span> <span class="br">│</span>  <span class="br">│</span> <span class="hi">engram+zero.../</span> <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>                   <span class="br">│</span>  <span class="br">│</span>                    <span class="br">│</span>  <span class="br">│</span>                <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>  <span class="mc-red">250 SKILL.md</span>     <span class="br">│</span>  <span class="br">│</span>  <span class="mc-red">MCP server</span>        <span class="br">│</span>  <span class="br">│</span> <span class="mc-red">opencode</span>       <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>  <span class="br">+ template</span>       <span class="br">│</span>  <span class="br">│</span>  <span class="br">+ 3 shims (st,</span>    <span class="br">│</span>  <span class="br">│</span> <span class="br">plugin</span>         <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>  <span class="br">+ 13 design</span>      <span class="br">│</span>  <span class="br">│</span>  <span class="br">bgx, second-</span>      <span class="br">│</span>  <span class="br">│</span> <span class="br">+ SQLite +</span>     <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>    <span class="br">skills</span>         <span class="br">│</span>  <span class="br">│</span>  <span class="br">termux)</span>           <span class="br">│</span>  <span class="br">│</span>  <span class="br">FTS5 +</span>         <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>                   <span class="br">│</span>  <span class="br">│</span>  <span class="br">+ premium line</span>    <span class="br">│</span>  <span class="br">│</span>  <span class="br">bun:sqlite</span>     <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">│</span>  <span class="br">Markdown only</span>    <span class="br">│</span>  <span class="br">│</span>  <span class="br">+ auto-heal</span>       <span class="br">│</span>  <span class="br">│</span>                <span class="br">│</span> <span class="br">│</span>
<span class="br">│</span>  <span class="br">└───────────────────┘</span>  <span class="br">└───────────────────┘</span>  <span class="br">└────────────────┘</span> <span class="br">│</span>
<span class="br">│</span>         <span class="mc-red">▲</span>                          <span class="mc-red">▲</span>                     <span class="mc-red">▲</span>         <span class="br">│</span>
<span class="br">│</span>         <span class="br">└──────────────────────────┴─────────────────────┘</span>         <span class="br">│</span>
<span class="br">│</span>                       <span class="hi">Conectados por 3 MCPs:</span>                       <span class="br">│</span>
<span class="br">│</span>              <span class="mc-red">context7</span> · <span class="mc-red">sqlite</span> · <span class="mc-red">second-termux</span>              <span class="br">│</span>
<span class="br">└─────────────────────────────────────────────────────────────────────┘</span>
</pre>

| Proyecto | Qué hace | Lenguaje | Build |
|---|---|---|---|
| [`skill-matrix/`](skill-matrix/README.md) | 250 skills (técnicas + diseño + auto-healing), formato SKILL.md de 9 secciones | Markdown | — |
| [`second-termux-v2/`](second-termux-v2/README.md) | MCP server que ejecuta jobs en background y devuelve una línea premium | TypeScript (ESM) | `npm run build` |
| [`engram+zerotoken/`](engram+zerotoken/README.md) | Plugin opencode con memoria tipada en SQLite+FTS5, auto-save, decay | TypeScript (Bun) | sin build step |

> *Los tres son **independientes** y se pueden usar por separado. La magia está en que se hablan entre sí a través de MCP, un protocolo abierto.*

---

## 🆕 v2.0 — qué cambió

> *Bump de versión unificado a 2.0.0 en el bundle completo. Cambios livianos en engram, robustos en second-termux, equivalentes a v2 en el catálogo de skills.*

### Cambios duros (los que un agente nota)

| Subproyecto | Cambio | Justificación |
|---|---|---|
| `second-termux-v2/` | Suprimido `install.sh` y scripts `install:global` / `uninstall:global` del `package.json` | El script `install.sh` no existía en disco (huérfano desde v1.0). El prompt maestro de este README es el único install path. |
| Repo | Eliminados `pnpm-lock.yaml` y `pnpm-workspace.yaml` de los 2 subproyectos | `pnpm` no se ejecuta en este host; los lockfiles eran ruido cross-platform-only. |
| Repo | Añadido `biome.json` raíz + por subproyecto (extend `//`) | Linter/formatter único, cero config por TS, mismo binario. |
| Repo | Añadidos `scripts/verify.sh` y `scripts/regen-index.mjs` | Verificación en un solo comando; INDEX auto-regenerable y chequeable por CI. |
| `.github/workflows/verify.yml` | Nuevo workflow | Corre `verify.sh` + INDEX freshness en cada push/PR. |
| `engram+zerotoken/` | Bump a 2.0.0; añadidos scripts `lint`/`format`; per-test targets | Consistencia con el resto del bundle. |
| `second-termux-v2/opencode-integration/opencode.fragment.jsonc` | Reescrito: minimalista, con `<REPO>` placeholder, cubre los 3 MCPs + skills + plugin engram | El fragment es único para el bundle completo, no solo para second-termux. |
| `skill-matrix/skills-matrix/INDEX.md` | Regenerado desde filesystem (250 skills reales) | Antes: stale con 250 hard-coded; ahora: ground truth vía `node scripts/regen-index.mjs`. |

### Lo que no cambió (intencionalmente)

- La arquitectura de 3 subproyectos independientes.
- El protocolo dual-agent (heredado de `~/.config/opencode/AGENTS.md`).
- La política zero-token.
- La forma del "Prompt maestro" — sigue siendo texto, no binario.
- La reversibilidad total (uninstall restaura la config previa).

### Verificación

```bash
./scripts/verify.sh         # full: build + test + typecheck
./scripts/verify.sh quick   # skip slow engram tests
node scripts/regen-index.mjs --check   # INDEX freshness
```

---

## 🧠 Sobre tu AGENTS.md global (la pieza que heredas de opencode)

> *Esta sección es la que mucha gente se salta y luego se pierde. Léela, son 3 minutos.*

`my-opencode` **no** trae su propio protocolo de ejecución. En su lugar, **hereda** el `AGENTS.md` global de opencode (~424 líneas, en `~/.config/opencode/AGENTS.md`). Esto es intencional: el proyecto no quiere reinventar cómo le hablas a un agente, prefiere sumarse al estándar que opencode ya mantiene.

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
> 2. SKILLS — Register the catalog with opencode by adding ABSOLUTE paths to
>    `~/.config/opencode/opencode.jsonc → skills.paths[]` (opencode auto-discovers
>    all SKILL.md folders under each path on startup; no copying required):
>      - <repo>/skill-matrix/skills-matrix
>      - <repo>/second-termux-v2/opencode-integration
>    Verify the array contains the new entries with `jq '.skills.paths'`. After
>    patching, RESTART the opencode TUI to reload the catalog.
>
> 3. CONFIG PATCH — Edit ~/.config/opencode/opencode.jsonc. Back up first:
>    opencode.jsonc.bak.YYYYMMDDHHMMSS. Then merge these blocks:
>      - mcp.context7 = { type: "remote", url: "https://mcp.context7.com/mcp", enabled: true }
>      - mcp.sqlite   = { type: "local",  command: ["npx","-y","mcp-sqlite","./data.db"], enabled: true }
>    Re-serialise with JSON.stringify. Comments in the original config will be lost
>    (acceptable, the backup preserves them).
>
> 4. SECOND-TERMUX — Build the orchestrator:
>      - `cd <repo>/second-termux-v2 && npm install && npm run build`
>      - Link the 3 shims into a directory on PATH: st, bgx, second-termux
>        (default: ~/.local/bin/ on Linux/macOS, $env:LOCALAPPDATA on Windows/WSL).
>        Use `ln -sf` to a `realpath <repo>`-based target for rename-resilience.
>      - Register the MCP server in opencode.jsonc with the absolute path to
>        <repo>/second-termux-v2/dist/src/server.js
>
> 5. ENGRAM — Set up the memory plugin:
>      - `cd <repo>/engram+zerotoken && bun install`
>      - Ensure the global DB dir exists: `mkdir -p ~/.engram`
>      - Register the plugin in opencode.jsonc plugin[] with an absolute file:// URL:
>        ["file://<repo>/engram+zerotoken/src/engram.ts", { auto_save, injection }]
>
> 6. SMOKE CHECKS — Run and report each. All must pass:
>      - `opencode mcp list`               → must show context7, sqlite, second-termux all connected
>      - `st version`                      → must print "second-termux v2.x.x"
>      - `bgx echo "smoke"`                → must print a line starting with ✨
>      - `ls -la ~/.engram/`               → must exist and be writable
>      - `find <repo>/skill-matrix/skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l`  → must be ≥ 250
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
| 2 | Skills discovery | `00-standard-skill-template/SKILL.md` visible desde `skills.paths[]` |
| 3 | Config patch | `opencode.jsonc` válido (parseable por node), 4 bloques mergeados, backup timestamped |
| 4 | Second-termux | `st` corre, `bgx` genera línea `✨`, dist/ contiene `server.js` |
| 5 | Engram | `bun test` pasa, `~/.engram/` escribible, plugin entrypoint existe |
| 6 | Smoke checks | 7/7 verdes |
| 7 | Memoria | Cada paso guardado en Engram con prefijo `install:my-opencode:` |
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

2. REMOVE SKILLS — Edit opencode.jsonc and remove the entries from
   `skills.paths[]` that point into the repo (do not touch unrelated paths).

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
# Esto elimina los shims y el state de second-termux, restaurando tu config previa
rm -f  ~/.local/bin/{st,bgx,second-termux} \
       ~/.local/share/second-termux/
cp -a $(ls -t ~/.config/opencode/opencode.jsonc.bak.* | head -1) \
      ~/.config/opencode/opencode.jsonc
# Quita las entradas del repo de opencode.jsonc (skills.paths[], mcp.second-termux, plugin[])
# con `jq` antes de restaurar si quieres limpieza quirúrgica.
echo "✨ my-opencode desinstalado (tu ~/.engram/ queda intacto si quieres conservarlo)"
```

> *Por diseño, `~/.engram/` **no se borra automáticamente**. Tus recuerdos son tuyos.*

### Opción C — Nuclear (borrar todo, incluyendo memoria)

```bash
rm -rf ~/.local/bin/{st,bgx,second-termux} \
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

### `st version` falla con `MODULE_NOT_FOUND` (y el MCP dice "connected")

**Causa:** los 3 shims en `~/.local/bin/{st,bgx,second-termux}` apuntan a un path obsoleto del repo (típico después de renombrar/mover el repo). El MCP usa un path absoluto en `opencode.jsonc`, por eso no se entera. **Fix:**
```bash
# Reescribe los 3 shims con el path actual (o usa ln -sf para resiliencia)
REPO=$(realpath <path/to/my-opencode>)
for tool in st bgx second-termux; do
  printf '#!/bin/bash\nexec node %s/second-termux-v2/dist/cli/%s.js "$@"\n' \
    "$REPO" "${tool/second-termux/st}" > ~/.local/bin/$tool
  chmod +x ~/.local/bin/$tool
done
st version   # → "second-termux v2.x.x"
```

### Las skills no se cargan en opencode

**Causa:** los paths en `skills.paths[]` apuntan a carpetas inexistentes o son relativos en vez de absolutos. **Fix:**
```bash
# Los paths deben ser ABSOLUTOS
jq '.skills.paths' ~/.config/opencode/opencode.jsonc
# Esperado: ["/home/<user>/.../My.OpenCode.Conf/skill-matrix/skills-matrix", ...]

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
├── scripts/
│   └── with-safe-env.sh                   ← sanitiza $TERM para los shims (Kitty/Alacritty)
│
├── skill-matrix/                          ← 250 skills (técnicas + diseño + auto-healing)
│   ├── README.md                          ← tour del catálogo
│   └── skills-matrix/                     ← 250 SKILL.md
│       ├── 00-standard-skill-template/
│       ├── opencode-documentation/        ← docs oficiales de opencode
│       ├── plugins-extensions/            ← OCS-flavored plugin protocol
│       ├── auto-healing/                  ← 10 skills de resiliencia y recuperación
│       ├── dev-environment/               ← 1 skill (auto-binding-rebuild)
│       ├── advanced-effects/              ← skills de diseño (consolidadas aquí)
│       ├── badge-system/
│       ├── color-basics/
│       ├── composition-layout/
│       ├── cultural-references/
│       ├── dark-mode/
│       ├── design-thinking/
│       ├── emotional-design/
│       ├── gamification-rewards/
│       ├── icon-symbolism/
│       ├── motion-ui/
│       ├── trends-forecasting/
│       ├── typography-phonk/
│       └── ... (233 más, ver INDEX.md)
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
    │   └── engram.ts                      ← entrypoint del plugin
    ├── test/                              ← bun test (5 .ts + 1 .sh)
    ├── opencode.json                      ← config per-subdir (auto-carga el plugin)
    └── package.json
```

> *Si llegaste hasta aquí, ya conoces el proyecto mejor que el 90% de los usuarios potenciales. Comparte, itera, y si encuentras una mejora, un PR es bienvenido.*

---

## 🎓 Para tu propio agente (3 líneas, copy-paste)

> *Si quieres que tu propio agente (opencode, Claude Code, Cline, Cursor) entienda este repo en 30 segundos, pégale esto:*

```
Explore ~/path/to/my-opencode/. Read AGENTS.md (root) for repo-specific traps,
then ~/.config/opencode/AGENTS.md (global router, ~424 lines) for the dual-agent
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
- **250 skills** — autoría mixta (comunidad open-source + curación personal)
- **Diseño de marca** — paleta Memphis Phonk (`#0D0D0D` `#DC2626` `#FFFFFF`)

> *Gracias por llegar hasta aquí. Si el proyecto te sirvió, una ⭐ en GitHub ayuda más de lo que imaginas. Si te rompió algo, un issue con la salida de `opencode mcp list` + `st version` nos ayuda a arreglarlo en horas, no en días.*

---

## 🔧 Mantenimiento reciente (Junio 2026)

**Sesión de mantenimiento completada:**

- ✅ **Repositorio restaurado:** Todos los archivos dañados fueron recuperados usando `git restore .`
- ✅ **Estructura preservada:** La organización original (skill-matrix/, second-termux-v2/, engram+zerotoken/) se mantiene intacta
- ✅ **Limpieza completada:** Directorios innecesarios eliminados
- ✅ **Engram actualizado:** Lección importante guardada en memoria persistente para futuras sesiones

> *Recordatorio: Este proyecto sigue una filosofía de estructura mínima. No crear directorios paralelos ni duplicar la organización existente. La simplicidad es clave.*

---

```
⚡ IgnicionDev v2.0 · MIT · Open source · Bienvenido al futuro del agente local.
```

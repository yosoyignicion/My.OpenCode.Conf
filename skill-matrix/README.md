# skill-matrix

> **232 skills técnicas + 14 design skills. El catálogo que el agente carga bajo demanda para responder con conocimiento experto.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)
[![Skills: 231 + 1 template](https://img.shields.io/badge/skills-231%20%2B%201%20template-purple)](skills-matrix/)
[![Design: 14](https://img.shields.io/badge/design-14-pink)](design-skills/)
[![Format: SKILL.md](https://img.shields.io/badge/format-9%20sections-blue)](skills-matrix/00-standard-skill-template/SKILL.md)

---

## ¿Qué hace esto?

Es una **biblioteca de skills técnicas** que opencode auto-descubre y carga bajo demanda. Cada skill es un archivo `SKILL.md` autocontenido con 9 secciones (definición, implementación, trade-offs, FAQ, vector IA, terminal/GUI, cheatsheet, skills relacionados, metadatos).

Las skills se activan por **triggers** (palabras clave en la consulta del usuario). El router en [`AGENTS.md`](AGENTS.md) decide cuál cargar basándose en §2.1 (tabla de triggers) y §2.2 (reglas de carga: max 3 simultáneas, predict-failure-risk primero, etc).

Es uno de los 3 sub-proyectos del repo [`my-opencode`](../). Los otros son [`engram+zerotoken/`](../engram+zerotoken/) y [`second-termux-v2/`](../second-termux-v2/).

---

## TL;DR (30 segundos)

```bash
# Ver el catálogo
ls skills-matrix/ | head -20
ls design-skills/

# Contar skills
find skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l   # 232
find design-skills -maxdepth 1 -mindepth 1 -type d | wc -l  # 14

# Leer el template
cat skills-matrix/00-standard-skill-template/SKILL.md
```

Para usar: la ruta a `skills-matrix/` debe estar en `~/.config/opencode/opencode.jsonc` bajo `skills.paths`. El instalador del repo padre ya lo hace.

---

## Estructura

```
skill-matrix/
├── AGENTS.md                          ← router del catálogo + protocolo dual-agente
├── README.md                          ← este archivo
├── LICENSE                            ← MIT (heredado del repo padre)
├── .gitignore
├── .engram/                           ← snapshot personal (no se commitea)
├── .git/                              ← submódulo
│
├── skills-matrix/                     ← 232 SKILL.md (231 skills + 1 template)
│   ├── 00-standard-skill-template/    ← plantilla de 9 secciones
│   ├── a11y-accessibility-wcag/
│   ├── advanced-graph-rag/
│   ├── agent-benchmarking-evaluation/
│   ├── ... (228 más)
│   └── opencode-documentation/        ← docs oficiales de opencode sintetizadas
│
└── design-skills/                     ← 14 SKILL.md de diseño
    ├── advanced-effects/
    ├── badge-system/
    ├── color-basics/
    ├── composition-layout/
    ├── cultural-references/
    ├── dark-mode/
    ├── design-thinking/
    ├── emotional-design/
    ├── gamification-rewards/
    ├── icon-symbolism/
    ├── motion-ui/
    ├── typography-phonk/
    ├── visual-narrative/
    └── advanced-effects/
```

### Distribución por dominio (las 8 áreas)

| Dominio | Nº skills | Ejemplos |
|---|---|---|
| **Frontend / Web** | ~45 | next-js-app-router, react-ui-development, tailwind-css-utility, react-native-mobile, vue, svelte |
| **Backend / Sistemas** | ~50 | go-systems-production, rust-systems-programming, modern-cpp-development, fastapi-rest-development, electron-desktop-apps |
| **AI / ML / Agentes** | ~30 | advanced-graph-rag, llm-inference-engines-vllm, agent-benchmarking-evaluation, agent-memory-persistence-episodic, context7-mcp-docs |
| **Infra / DevOps** | ~40 | container-orchestration-k8s-scheduling, docker-compose-watch, infrastructure-as-code-terraform, monitoring-prometheus-metrics, gitops-declarative-reconciliation |
| **Patrones / Arquitectura** | ~30 | clean-architecture-principles, hexagonal-architecture, event-sourcing-eventstore, distributed-consensus-raft, microservices-decomposition |
| **Seguridad** | ~20 | owasp-top-10-mitigation, auth-jwt-oauth-detailed, oauth2-oidc-flows, secret-management-vault-integration, threat-modeling-stride |
| **Datos / DB** | ~10 | prisma-orm-database, postgresql-advanced, sqlite-sqlalchemy-persistence, distributed-cache-redis-cluster, knowledge-graphs-neo4j |
| **Diseño** | 14 (carpeta aparte) | color-basics, motion-ui, typography-phonk, badge-system, design-thinking (lista completa en la sección siguiente) |

### Sobre los 14 design skills

Proceden de `~/Documentos/dev-space/my-opencode/Skills-o-extra/` (5 carpetas legacy: `elite-skills`, `master-skills`, `legend-skills`, `loyalty-skills`, `initiation-skills`), portados el 2026-06-14 bajo el protocolo dual-agente en dos pasadas paralelas (Group A = 7 foundation, Group B = 7 visual/badge/motion). Las carpetas legacy siguen en disco para referencia.

**Triggers de activación** (palabras clave que el router busca para auto-cargar): `badge`, `icon`, `animación`, `tipografía`, `Octalysis`, `FOMO`, `Campbell`, `phonk`, `Y2K`, `Disney principles`, `Peirce`, `Norman 3 levels`, `WCAG`, `OLED`, `gamificación`, `brutalismo`, `retrowave`. La skill con la coincidencia más específica se carga primero; las demás se enlazan vía "Skills Relacionados".

**Lista completa de las 14**: `advanced-effects` · `badge-system` · `color-basics` · `composition-layout` · `cultural-references` · `dark-mode` · `design-thinking` · `emotional-design` · `gamification-rewards` · `icon-symbolism` · `motion-ui` · `trends-forecasting` · `typography-phonk` · `visual-narrative`.

(Conteos aproximados — para cifras exactas usa `find` o el AGENTS.md del router.)

---

## Cómo se carga una skill

El flujo es:

```
1. Usuario: "cómo hago async params en Next.js 16?"
2. Router (§2.1) detecta keywords: "next.js", "async params"
3. Router carga el skill `next-js-app-router` (~2500 tokens)
4. El agente responde con la §2 (implementación de referencia) +
   §3 (trade-offs) + §7 (cheatsheet)
5. La respuesta se inyecta al context y se cachea en Engram
6. La próxima vez que preguntes lo mismo, el FTS5 ya lo tiene
```

### Reglas de carga (router §2.2)

- **Max 3 skills simultáneas** — más infla el context sin beneficio.
- **`predict-failure-risk` primero** — cuando hay error/fix/debug, se carga antes que cualquier otra.
- **Skills de contexto (como `context7-mcp-docs`) antes que skills de patrón genérico** — la doc oficial > el patrón.
- **Si una skill falta una sección** del template, el router infiere de docs upstream (no rompe el flujo).

---

## Añadir una skill nueva

```bash
# 1. Crea la carpeta con kebab-case
mkdir -p skills-matrix/mi-skill-nueva

# 2. Copia el template
cp skills-matrix/00-standard-skill-template/SKILL.md skills-matrix/mi-skill-nueva/SKILL.md

# 3. Edita — 9 secciones obligatorias
$EDITOR skills-matrix/mi-skill-nueva/SKILL.md
```

El template v1.0 exige:

1. **Definición teórica** (4 líneas, problema que resuelve)
2. **Implementación de referencia** (framework, versión, ejemplo idiomático)
3. **Trade-offs y decisiones** (cuándo usar / cuándo evitar / alternativas)
4. **FAQ** (2+ problemas comunes con causa + fix + explicación)
5. **Vector de IA agéntica** (triggers, tool integration JSON, prompt snippet)
6. **Uso en terminal y GUI** (CLI flags, IDE shortcuts)
7. **Cheatsheet rápido** (< 15 líneas de fragmentos idiomáticos)
8. **Skills relacionados** (tabla de complementariedad)
9. **Metadatos** (YAML: id, domain, version, tags, archive_after)

### Registrar el trigger

Si quieres que el agente la cargue **automáticamente** por keyword, añade el trigger a la tabla en `AGENTS.md §2.1`:

```markdown
| `mi-keyword`, `mkm`, `microservicio ligero` | `mi-skill-nueva` |
```

Sin este paso, la skill existe y se puede invocar manualmente, pero el router no la activará por sí solo.

### Verificar

```bash
# 1. El archivo está bien formado (9 secciones)
grep -E "^## [0-9]" skills-matrix/mi-skill-nueva/SKILL.md
# Debe listar: Definición, Implementación, Trade-offs, FAQ, Vector, Uso, Cheatsheet, Skills, Metadatos

# 2. El frontmatter YAML es válido
head -10 skills-matrix/mi-skill-nueva/SKILL.md
# Debe tener: name, description (requeridos)

# 3. Reinicia opencode TUI
# (no basta con cerrar y abrir; hay que matar el proceso)
```

---

## Auto-carga en opencode

Para que opencode descubra las skills, añade a `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "skills": {
    "paths": [
      "/ruta/a/my-opencode/skill-matrix/skills-matrix",
      "/ruta/a/my-opencode/skill-matrix/design-skills"
    ]
  }
}
```

El instalador raíz (`install.sh`) ya hace esto automáticamente. Si clonas el repo en otra máquina, ejecuta:

```bash
cd /ruta/a/my-opencode
# El install.sh raíz ya no existe (fue borrado). Re-parchear a mano o usar el router:
cat skill-matrix/skills-matrix/AGENTS.md | head -5
```

---

## Conteo y mantenimiento

```bash
# Conteo actual
find skills-matrix -maxdepth 1 -mindepth 1 -type d | wc -l
# Esperado: 232 (231 skills + 1 template)

find design-skills -maxdepth 1 -mindepth 1 -type d | wc -l
# Esperado: 14

# Buscar skills huérfanas (sin trigger en el router)
comm -23 <(ls skills-matrix/ | grep -v "^00-" | sort) \
         <(grep -oP "(?<=^\| \`).+(?=\` \|)" AGENTS.md | sort -u)
# Si hay diferencias, esas skills existen pero no se auto-cargan.

# Skills sin frontmatter YAML válido
for d in skills-matrix/*/; do
  head -1 "$d/SKILL.md" 2>/dev/null | grep -q "^---" || echo "MALO: $d"
done
# Esperado: 0 outputs (todas tienen frontmatter)
```

---

## Prompt para tu agente: explorar este subproyecto

Si quieres que **tu propio agente** (opencode, Claude Code, Cline, Cursor) entienda este catálogo, copia esta carpeta a tu workspace y pégale:

> **Copy-paste prompt (3 líneas):**
> ```
> Explore ~/path/to/skill-matrix/. Read AGENTS.md (router) and the first SKILL.md from each of the 8 domains.
> Build a mental map: which skill covers which domain, and which triggers activate which.
> If you find a gap (a domain with no skill, or a stale trigger), propose a new SKILL.md
> following the 9-section template in skills-matrix/00-standard-skill-template/SKILL.md,
> and cache any third-party API research in engram with prefix "ctx7:".
> ```

**Por qué funciona:**

1. *"Read AGENTS.md (router) and the first SKILL.md from each of the 8 domains"* — muestra la estructura macro y un ejemplo representativo de cada categoría, sin cargar las 232 skills en el context.
2. *"Build a mental map: which skill covers which domain, and which triggers activate which"* — fuerza al agente a entender las **dos dimensiones** del catálogo: dominios (qué cubre) y triggers (cuándo se activa). Esto es exactamente la decisión que opencode toma cada vez que recibe una consulta.
3. *"propose a new SKILL.md following the 9-section template"* — convierte al agente en colaborador, no solo lector. El output es accionable.

> **Bonus:** si tu agente no es opencode, dile que las skills son Markdown y puede leerlas con su `read` tool nativa. No requiere MCP.

---

## Licencia y créditos

**MIT** © 2026 ignicion — ver [`../LICENSE`](../LICENSE)

Catálogo construido sobre:

- [Anthropic's Agent Skills spec](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) — formato y convenciones
- [Context7](https://context7.com) — fuente de docs oficiales para validar APIs
- [opencode](https://opencode.ai) — runtime de skills
- 231 skills curadas + 14 design skills — autoría mixta (comunidad open-source + curación personal)

Cada skill individual es `SKILL.md` autocontenido — no requiere compilación, build step, ni dependencias. Es puro Markdown.

---

> *"232 skills × 1 trigger = un agente que sabe lo que necesita cuando lo necesita."*

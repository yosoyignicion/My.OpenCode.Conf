---
name: bash-scripting-advanced
description: "Bash scripting avanzado resuelve la automatización robusta de procesos en entornos Unix/Linux mediante shell scripts predecibles, re-ejecutables y auto-contenidos"
---
# bash-scripting-advanced

## Semantic Triggers
```
bash strict mode set -euo pipefail, argument parsing getopts while case shift, jq JSON query and transformation, parallel execution xargs parallel GNU parallel, idempotent scripts safe temp files mktemp, trap cleanup EXIT ERR signal handlers
```

---

## 1. Definición Teórica

Bash scripting avanzado resuelve la automatización robusta de procesos en entornos Unix/Linux mediante shell scripts predecibles, re-ejecutables y auto-contenidos. El principio fundamental es el "strict mode" (`set -euo pipefail` combinado con `IFS=$'\n\t'`) que convierte errores silenciosos en fallos inmediatos. En un contexto arquitectónico de CI/CD, DevOps y tooling local, los scripts bash son el pegamento entre herramientas — pero sin disciplina se convierten en fuente de bugs difíciles de rastrear. Existe como alternativa madura a soluciones más pesadas (Python, Go) cuando la tarea es orchestrar comandos del sistema operativo.

## 2. Implementación de Referencia

La implementación recomendada usa `#!/usr/bin/env bash` + `set -euo pipefail` + `IFS=$'\n\t'`. Argument parsing con `while case` loop. `mktemp -d` + `trap cleanup EXIT` para archivos temporales seguros. `command -v` para verificar dependencias. `jq` para JSON. `xargs -P $(nproc)` para paralelismo. Siempre pasar ShellCheck.

### Ejemplo Práctico Avanzado

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
usage() { cat <<EOF; exit 1; }
cleanup() { rm -rf "${TMPDIR:-}"; }; trap cleanup EXIT

# --- arg parsing ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output) OUT="$2"; shift 2 ;;
    -v|--verbose) VERBOSE=true; shift ;;
    -h|--help) usage ;;
    --) shift; break ;;
    *) INPUT="$1"; shift ;;
  esac
done

# Patterns
mkdir -p "$OUTPUT_DIR"                                    # idempotent
TMPDIR="$(mktemp -d)"                                     # safe temp
trap 'rm -rf "$TMPDIR"' EXIT
command -v jq &>/dev/null || { echo "jq required" >&2; exit 1; }
jq -r '.users[] | select(.active) | .email' data.json     # JSON query
find logs/ -name "*.gz" -print0 | xargs -0 -P "$(nproc)" -I {} gunzip -k {}  # parallel
while IFS= read -r line; do process "$line"; done < "input.txt"
```

**Fuente oficial:** https://www.shellcheck.net/ — https://github.com/koalaman/shellcheck

### Alternativa de Implementación Específica

Para scripts que requieren parsing de argumentos más complejo que `getopts` nativo, usar `argbash` (genera código bash a partir de una definición POSIX-compatible) o `bashly` (framework Ruby que genera scripts bash completos con autocompletado). Para proyectos multi-script, considerar mover a Python con Click/Typer.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Automatización de tareas del SO, pipelines CI/CD (~50-200 líneas), glue code entre herramientas CLI, infraestructura efímera (Docker entrypoints, cloud-init) |
| **Cuándo evitar** | Lógica de negocio compleja, estructuras de datos anidadas, operaciones con cadenas largas, equipos con estándares de tipado fuerte, tareas que requieren testing unitario |
| **Alternativas** | Python (subprocess + argparse/cli: más legible, testable, portable Windows); Go (single binary, tipado fuerte, concurrencia nativa); Justfile/Makefile (recetas declarativas sin lógica condicional) |
| **Coste/Complejidad** | Bajo si se sigue el strict mode; medio si se añade parsing complejo o arrays asociativos; alto si se necesita depuración entre shells (bash 3 vs 5, zsh vs dash). ShellCheck reduce drásticamente el coste de mantenimiento |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Script falla silenciosamente en CI pero funciona en local

**¿Qué ocasionó el error?**
El script depende de variables no definidas (ej: `$OUTPUT_DIR` sin valor) que en local existen por contexto del shell interactivo. Sin `set -u`, bash expande variables vacías como string vacío sin error.

**¿Cómo se solucionó?**
Añadir `set -u` (parte de `set -euo pipefail`) al inicio del script. Validar variables requeridas al inicio: `${REQUIRED_VAR:?Error: REQUIRED_VAR no definida}`.

**¿Por qué funciona esta técnica?**
`set -u` convierte el uso de variables no definidas en un error inmediato con exit code distinto de cero, evitando que el script continúe con valores vacíos.

### Caso: trap no se ejecuta cuando el script recibe SIGTERM

**¿Qué ocasionó el error?**
`trap cleanup EXIT` captura salida normal pero no señales fatales. Un `docker stop` envía SIGTERM, que mata el proceso antes de ejecutar handlers.

**¿Cómo se solucionó?**
Añadir `trap cleanup EXIT INT TERM HUP`. Para señales como SIGKILL (9) no hay solución — es intrínsecamente no capturable.

**¿Por qué funciona esta técnica?**
El trap se registra para múltiples señales; el shell ejecuta el handler antes de terminar salvo para SIGKILL/SIGSTOP.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** Script bash con argumentos, necesita parsing y validación
- **Prioridad de carga:** Alta — bash scripting es ubicuo en infraestructura DevOps
- **Dependencias:** Ninguna; puede cargarse junto con `docker-compose-watch`, `background-jobs-queues`

### Tool Integration

```json
{
  "tool_name": "bash-scripting-advanced",
  "description": "Genera bash scripts robustos con strict mode, parsing de argumentos, manejo seguro de temporales y errores",
  "triggers": ["bash", "shell script", "strict mode", "argument parsing", "shellcheck"],
  "context_hint": "Inyectar secciones 1-3 cuando el usuario pida un script bash nuevo; secciones 4-6 cuando depure uno existente",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre scripting bash, carga el skill bash-scripting-advanced y responde
siguiendo la sección de implementación de referencia. Prioriza strict mode y shellcheck
sobre compatibilidad con shells antiguos.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear script nuevo con template strict mode
cat <<'SCRIPT' > script.sh
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT

chmod +x script.sh

# Ejecutar con debug y line numbers
PS4='+[$LINENO] ' bash -x script.sh -o output.txt

# Lint
shellcheck -x script.sh

# Ejecución parcial (dry-run con echo)
bash -n script.sh                    # syntax check only
bash -x script.sh --dry-run 2>&1 | grep '+'

# JSON pipeline
curl -s api.example.com | jq -r '.data[] | select(.status=="active") | .id' | \
  xargs -P "$(nproc)" -I {} ./process.sh {}

# Debug con bash -v (verbose mode — imprime líneas antes de ejecutar)
bash -v script.sh
```

### GUI / Web

- **ShellCheck Online:** https://www.shellcheck.net/ — linteo visual con explicaciones de cada warning
- **VSCode:** Extensión "shellman" (snippets) + "ShellCheck" (lint en-editor con diagnósticos inline)
- **explainshell.com:** Descompone comandos bash complejos mostrando flags y argumentos
- **Vim/Neovim:** `syntastic` o `ale` con shellcheck integrado, `:set ft=sh` para syntax highlighting

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Syntax check | `bash -n script.sh` | F8 (VSCode problem matcher) |
| Debug mode | `bash -x script.sh` | Ctrl+Shift+D (VSCode debug) |
| Lint all | `shellcheck *.sh` | Ctrl+Shift+P → ShellCheck |
| Format | `shfmt -w script.sh` | Shift+Alt+F (VSCode) |

---

## 7. Cheatsheet Rápido

```bash
set -euo pipefail; IFS=$'\n\t'           # strict mode
usage() { cat <<EOF; exit 1; }; EOF      # usage
trap 'rm -rf "$TMPDIR"' EXIT             # cleanup
while [[ $# -gt 0 ]]; do case "$1" in    # argparse
*) INPUT="$1"; shift ;; esac; done
command -v jq &>/dev/null || exit 1       # dep check
TMPDIR="$(mktemp -d)"                     # safe temp
mkdir -p /path && local -r VAR="val"     # idemp + local
jq -r '.key' file.json                   # JSON query
xargs -0 -P $(nproc) -I {} cmd {}        # parallel
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `docker-compose-watch` | Complementario — bash scripts entrypoint + docker compose | Sí |
| `background-jobs-queues` | Complementario — scripts de worker/healthcheck en bash | Sí |
| `python-packaging-pyproject` | Alternativa — scripts complejos migran a Python/CLI | No |
| `ci-cd-declarative-pipelines` | Complementario — bash en pipelines CI/CD | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: bash-scripting-advanced
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/bash
tags: [bash, shell, scripting, automation, ci-cd, shellcheck, strict-mode]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

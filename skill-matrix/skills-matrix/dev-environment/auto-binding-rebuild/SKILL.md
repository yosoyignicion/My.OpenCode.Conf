# auto-binding-rebuild

> **Cross-project skill** — Aplica a cualquier proyecto Node con native modules (better-sqlite3, bcrypt, sharp, canvas, etc.) en máquinas donde el prebuilt del maintainer no esté disponible o donde bun no soporte el módulo. **Este skill es agnóstico al proyecto concreto**: el `engram+zerotoken` que lo originó ya no lo necesita (migró a `bun:sqlite` puro), pero el conocimiento sigue siendo útil para reinstalaciones, nuevos proyectos Node, o cuando un contributor reintroduzca `better-sqlite3` por accidente.

## Semantic Triggers
```
binding rebuild, native module, better-sqlite3, node-gyp, python3 make g++, prebuilt binary, dlopen failed, bun native module, ERR_DLOPEN_FAILED, prebuild-install, dlopen, binding missing
```

---

## 1. Definición Teórica

Los native modules de Node.js (better-sqlite3, bcrypt, sharp, node-canvas, etc.) son librerías escritas en C++ que se compilan a un shared object (`.node` en Linux, `.dylib` en macOS, `.dll` en Windows) y Node carga dinámicamente con `dlopen`. El patrón auto-binding-rebuild resuelve el problema de los fallos "Could not locate the bindings file" que aparecen cuando: (1) el maintainer no distribuye un prebuilt para tu combinación exacta de Node+OS+arch, (2) cambias de versión de Node sin reinstalar, o (3) `node_modules/` se corrompe tras un `git pull`. Aplica en cualquier proyecto Node con dependencias nativas. Existe como patrón diferenciada porque la "solución obvia" (`rm -rf node_modules && npm install`) re-descarga el prebuilt — pero si el prebuilt no existe, hay que **caer al fallback de compilación local con `node-gyp`**, que requiere una toolchain del sistema (`python3 + make + g++` en Linux). En el ecosistema bun, la complicación adicional es que bun **no soporta todos los native modules** (issue oven-sh/bun#4290 para `better-sqlite3`); cuando esto ocurre, el workaround es ejecutar el código con Node + `tsx` en lugar de bun.

---

## 2. Implementación de Referencia

Toolchain de referencia:
- **Build system:** `node-gyp` (incluido en npm; v10+ en npm 11+)
- **Compilador Linux:** `g++` con soporte C++20 (GCC 11+, clang 14+)
- **Build orchestrator:** `make` (GNU Make 4.x)
- **Config generator:** `python3` (≥ 3.6, requerido por `gyp` scripts de `node-gyp`)
- **Prebuilt distribution:** `prebuild-install` (paquete npm usado por la mayoría de native modules)

Lenguajes: bash, npm scripts.

### Ejemplo Práctico Avanzado

```bash
#!/usr/bin/env bash
# auto-binding-rebuild.sh
# Detecta qué native modules faltan binding y los recompila.
# Idempotente: ejecuta N veces produce el mismo resultado.
set -euo pipefail

PROJECT_DIR="${1:-.}"
TOOLCHAIN_PKGS_LINUX=(python3 make g++)
NEED_INSTALL=0

echo "=== Verificando toolchain nativa ==="
for cmd in python3 make g++; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "  ❌ $cmd missing"
    NEED_INSTALL=1
  else
    echo "  ✅ $cmd $(command -v $cmd)"
  fi
done

if [ "$NEED_INSTALL" = "1" ]; then
  echo ""
  echo "=== Instalando toolchain (requiere sudo) ==="
  if [ -f /etc/debian_version ]; then
    sudo apt update && sudo apt install -y "${TOOLCHAIN_PKGS_LINUX[@]}"
  elif [ -f /etc/fedora-release ]; then
    sudo dnf install -y python3 make gcc-c++
  elif [ -f /etc/arch-release ]; then
    sudo pacman -S --needed python make gcc
  else
    echo "Distro no soportada. Instala python3, make, g++ manualmente."
    exit 1
  fi
fi

echo ""
echo "=== Detectando native modules con binding faltante ==="
cd "$PROJECT_DIR"
MISSING=()
for mod_dir in node_modules/*/; do
  mod=$(basename "$mod_dir")
  pkg_json="$mod_dir/package.json"
  [ -f "$pkg_json" ] || continue
  # Detectar si es native module (tiene "binary" o "install" script con prebuild-install)
  if grep -q '"binary"\|prebuild-install\|node-gyp' "$pkg_json" 2>/dev/null; then
    binding=$(find "$mod_dir/build/Release" "$mod_dir/compiled" -name "*.node" 2>/dev/null | head -1)
    if [ -z "$binding" ]; then
      MISSING+=("$mod")
    fi
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "  ✅ Todos los bindings presentes"
  exit 0
fi

echo "  ⚠️  Módulos con binding faltante: ${MISSING[*]}"

# Si usamos bun, advertir que bun no soporta todos los native modules
if command -v bun >/dev/null 2>&1; then
  echo ""
  echo "⚠️  bun detectado. Recuerda: bun NO soporta todos los native modules"
  echo "   (ej: better-sqlite3, oven-sh/bun#4290). Tests que los usen deben"
  echo "   correr con Node (npx tsx) NO con bun test."
fi

echo ""
echo "=== Recompilando bindings desde fuente ==="
for mod in "${MISSING[@]}"; do
  echo "  → $mod"
  npm rebuild "$mod" --build-from-source 2>&1 | tail -3
done

echo ""
echo "=== Verificación post-rebuild ==="
ALL_OK=1
for mod in "${MISSING[@]}"; do
  if [ -d "node_modules/$mod/build/Release" ]; then
    binding=$(find "node_modules/$mod/build/Release" -name "*.node" | head -1)
    if [ -n "$binding" ]; then
      size=$(stat -c %s "$binding")
      echo "  ✅ $mod: $(basename $binding) ($size bytes)"
    else
      echo "  ❌ $mod: binding aún ausente"
      ALL_OK=0
    fi
  fi
done

[ "$ALL_OK" = "1" ] && echo "✅ Todos los bindings OK" || exit 1
```

**Fuente oficial:** [node-gyp README](https://github.com/nodejs/node-gyp#installation) · [Node.js Addons Documentation](https://nodejs.org/api/addons.html) · [bun#4290 better-sqlite3 support](https://github.com/oven-sh/bun/issues/4290)

### Alternativa de Implementación Específica

**Sin compilar (cuando hay prebuilt):**
```bash
# Forzar re-descarga del prebuilt del maintainer
npm install <module> --force
# o limpiar cache y reinstalar
npm cache clean --force
rm -rf node_modules/<module>
npm install
```

**En CI/CD (Docker multi-stage):**
```dockerfile
# Build stage con toolchain
FROM node:24-bookworm AS builder
RUN apt-get update && apt-get install -y python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Production stage sin toolchain (solo runtime + binarios compilados)
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["node", "dist/server.js"]
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo rebuildear desde fuente** | Prebuilt no existe para tu (node, platform, arch); acabas de cambiar versión de Node; acabas de clonar repo en CI |
| **Cuándo confiar en prebuilt** | Producción con Node LTS (20, 22); prebuilt publicado por maintainer en su matrix oficial |
| **Cuándo evitar native modules** | Lambdas serverless (cold start + 250 MB zip limit), edge runtimes (V8 isolates sin dlopen), proyectos con zero-deps philosophy |
| **Alternativas** | Pure-JS modules (sql.js, bcryptjs — más lentas pero portables), WASM modules (mejor portabilidad, peor FFI), musl libc static builds (Alpine sin glibc) |
| **Coste/Complejidad** | Build: 30s-2min por módulo en hardware moderno; toolchain: 150 MB en disco; alternativa: 5-30s de download con prebuilt; trade-off tiempo-setup vs portabilidad |
| **Cuándo NO necesitas este skill localmente** | Tu proyecto migró a un driver puro (ej: `bun:sqlite`, WASM, o sql.js). Mantén el skill accesible pero márcalo en metadata como `applies_to_local_project: false` para no confundir futuras sesiones. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: `Could not locate the bindings file ... compiled/24.3.0/linux/x64/`

**¿Qué ocasionó el error?**
Tu Node es una versión de parche intermedia (ej: 24.16.0) que el maintainer **no incluye en su matrix de prebuilts** (que llega solo a 24.3.x). npm intentó descargar el prebuilt, no lo encontró, **pero no cayó al fallback de compilación** porque `node-gyp` no estaba disponible o `python3 make g++` faltaban.

**¿Cómo se solucionó?**
1. Instalar toolchain: `sudo apt install -y python3 make g++`
2. Forzar rebuild desde fuente: `npm rebuild <module> --build-from-source`
3. El binario `.node` aparece en `node_modules/<module>/build/Release/` (no en `compiled/`)
4. Verificar: `file node_modules/<module>/build/Release/<module>.node` debe decir `ELF 64-bit LSB shared object`

**¿Por qué funciona esta técnica?**
El path `compiled/{node}/...` es **solo para prebuilts distribuidos**. Cuando compilas localmente, el binario va a `build/Release/`. El `bindings` loader busca en ambos paths, así que el binario local es suficiente.

### Caso: `bun test` falla con `ERR_DLOPEN_FAILED: 'X' is not yet supported in Bun`

**¿Qué ocasionó el error?**
bun tiene un loader de native modules **parcial**: soporta muchos pero no todos. `better-sqlite3` específicamente está pendiente (oven-sh/bun#4290). El binding existe y es válido para Node, pero bun no puede cargarlo.

**¿Cómo se solucionó?**
**Opción A (cambiar runner):** ejecutar el código con Node + `tsx` en lugar de bun:
```bash
npx tsx test/engram.test.ts   # en lugar de bun test test/engram.test.ts
```

**Opción B (refactor del código):** reemplazar el import con la alternativa nativa de bun:
```typescript
// Antes
import Database from "better-sqlite3"
// Después
import { Database } from "bun:sqlite"
```

La opción B es más invasiva pero elimina la dependencia del binding Node.

**¿Por qué funciona esta técnica?**
`bun:sqlite` está compilado **dentro** del binario de bun (no es un binding externo), así que bun lo carga siempre. La API surface es lo bastante similar a `better-sqlite3` para los métodos básicos (`prepare`, `run`, `get`, `all`, `exec`).

### Caso: `npm rebuild` termina en 5 segundos sin compilar nada

**¿Qué ocasionó el error?**
npm detectó que ya existe un binding funcional y no recompiló. Pero el binding es para una versión de Node **distinta** a la actual (tras un `nvm use` o cambio de runtime). El "rebuild" es no-op.

**¿Cómo se solucionó?**
Forzar limpieza + recompilación completa:
```bash
rm -rf node_modules/<module>/build
npm rebuild <module> --build-from-source
# Verificar timestamp del binding
ls -la node_modules/<module>/build/Release/*.node  # debe ser reciente
```

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "binding", "dlopen", "node-gyp", "build-from-source", "native module", "ERR_DLOPEN_FAILED", "Could not locate the bindings"
- **Prioridad de carga:** Alta — frecuente foot-gun en proyectos Node
- **Dependencias:** `bash-scripting-advanced`, `frontend-runtimes-build` (bun vs node context)

### Tool Integration

```json
{
  "tool_name": "auto_binding_rebuild",
  "description": "Diagnostica y repara native modules de Node con binding faltante: detecta qué módulos fallan, instala toolchain python3/make/g++ si falta, recompila con npm rebuild --build-from-source, o redirige a Node+tsx si bun no soporta el módulo.",
  "triggers": ["binding", "dlopen", "node-gyp", "native module", "ERR_DLOPEN_FAILED", "Could not locate", "build-from-source", "prebuilt"],
  "context_hint": "Cargar cuando el usuario reporte errores 'Could not locate the bindings file' o 'dlopen failed' en proyectos Node con native modules.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario reporte un error tipo "Could not locate the bindings file"
o "ERR_DLOPEN_FAILED" en un proyecto Node, carga el skill auto-binding-rebuild.
Si el proyecto usa bun, recuerda verificar oven-sh/bun#4290 — bun no soporta
todos los native modules y el fix puede ser cambiar a Node+tsx.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Diagnóstico rápido: ¿el binding existe y es válido?
ls -la node_modules/better-sqlite3/build/Release/*.node
file node_modules/better-sqlite3/build/Release/*.node

# Rebuild desde fuente (Linux)
sudo apt install -y python3 make g++
npm rebuild better-sqlite3 --build-from-source

# Verificar que el binding carga en Node
node -e "const Database = require('better-sqlite3')(':memory:'); console.log(Database.prototype)"

# Verificar versión de SQLite compilada dentro
node -e "const d = require('better-sqlite3')(':memory:'); console.log(d.prepare('SELECT sqlite_version() v').get())"

# Docker: build stage con toolchain, runtime stage sin
docker build --target builder -t myapp:builder .
```

### GUI / Web

- **VS Code**: panel "Output" muestra logs de `npm rebuild` si está integrado con task runner
- **Docker Desktop**: logs del multi-stage build muestran paso de toolchain install
- **GitHub Actions**: log de la step "Install dependencies" muestra si recurrió a `node-gyp rebuild`

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver toolchain instalada | `which python3 make g++` | Terminal integrada de VS Code |
| Rebuild interactivo | `npm rebuild --build-from-source` | Click derecho en `node_modules/<mod>` → "Rebuild" (algunas extensiones) |
| Limpiar cache npm | `npm cache clean --force` | Botón "Clear Cache" en VS Code npm extension |

---

## 7. Cheatsheet Rápido

```bash
# Diagnóstico de 5 segundos
ls node_modules/<mod>/build/Release/*.node 2>/dev/null || echo "MISSING"

# Fix de 1 minuto (asume toolchain ya instalada)
npm rebuild <mod> --build-from-source

# Fix completo de 3 minutos (toolchain + rebuild)
sudo apt install -y python3 make g++ && npm rebuild <mod> --build-from-source

# Workaround bun: ejecutar test con Node+tsx
npx tsx test/file-that-uses-better-sqlite3.test.ts
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `bash-scripting-advanced` | Dependiente (scripts de build) | Sí |
| `frontend-runtimes-build` | Complementario (bun vs node context) | Sí |
| `predictive-failure-detection` | Complementario (detectar binding issues antes) | No |
| `self-healing-infrastructure` | Superconjunto (auto-recovery incluye bindings) | No |
| `auto-healing-systems` | Superconjunto (recuperación automática) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: auto-binding-rebuild
domain: dev-environment
version: 1.1.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
applies_to_local_project: false  # el proyecto que lo originó (engram+zerotoken) ya migró a bun:sqlite
applies_to: "any Node project with native modules where (a) prebuilt missing or (b) bun doesn't dlopen the binding"
origin_project: my-opencode-conf / engram+zerotoken
origin_trigger: "engram.test.ts importó better-sqlite3; oven-sh/bun#4290 bloqueó bun test"
origin_resolution: "refactor a bun:sqlite (commit <ref>) + eliminación de dep + este skill queda como knowledge base"
archive_after: 2026-08-13  # 60 días sin uso
source: nueva-creacion
tags: [binding, node-gyp, native-module, better-sqlite3, dlopen, build-from-source, bun, devops, debugging, cross-project]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

---
name: monorepo-management
description: "Monorepos almacenan múltiples paquetes/apps en un solo repositorio con tooling compartido"
---
# Monorepo Management

## Semantic Triggers
```
monorepo, turborepo, nx, pnpm workspaces, build caching, task pipeline, changesets versioning, ts project references, monorepo docker deploy, pnpm filter deploy
```

---

## 1. Definición Teórica

Monorepos almacenan múltiples paquetes/apps en un solo repositorio con tooling compartido. pnpm workspaces + Turborepo proporcionan gestión de dependencias, build caching, y ejecución paralela de tareas a escala. Nx ofrece task graph computation, affected commands, y configuración por proyecto. Changesets maneja versionado por paquete. TypeScript Project References permiten builds incrementales con `composite: true`.

---

## 2. Implementación de Referencia

pnpm v10+ con pnpm-workspace.yaml. Turborepo v2.4+ o Nx v20+ para orquestación. Changesets v2.28+ para versionado.

### Ejemplo Práctico Avanzado

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tooling/*"
---
# turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true,
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.ts"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true,
      "inputs": ["src/**/*.test.ts"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalDependencies": ["tsconfig.json", ".env"],
  "globalEnv": ["NODE_ENV", "API_URL"]
}
---
# Root package.json
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev --parallel",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "@changesets/cli": "^2.28.0",
    "typescript": "^5.7.0",
    "prettier": "^3.5.0"
  }
}
---
# .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": true,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
---
# Dockerfile (pnpm deploy)
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY tooling/ tooling/
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm deploy --filter=api --prod /app/dist
```

**Fuente oficial:** https://turbo.build/repo/docs

### Alternativa de Implementación Específica

Nx con NxCloud para equipos que necesitan distributed task execution (paralelismo entre múltiples CI runners) y affected commands avanzados.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Múltiples paquetes compartidos, apps relacionadas, tooling unificado |
| **Cuándo evitar** | Equipos independientes con ciclos de release diferentes, repos >10GB |
| **Alternativas** | Nx (más features), Lage (Microsoft), Bazel (Google-scale), single repos separados |
| **Coste/Complejidad** | Medio. pnpm + Turborepo son simples. Nx añade complejidad pero mejor caching |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Turbo cache miss en CI

**¿Qué ocasionó el error?**
`turbo.json` no tenía `inputs` definidos, entonces cualquier cambio (README) invalidaba el cache.

**¿Cómo se solucionó?**
```json
"build": {
  "inputs": ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.test.ts"]
}
```
Se definieron inputs específicos para evitar cache misses por archivos no relacionados.

**¿Por qué funciona esta técnica?**
Turborepo usa hash de inputs para cache. Sin `inputs`, cualquier cambio global invalida el cache.

### Caso: pnpm workspace dependencies no resueltas

**¿Qué ocasionó el error?**
Un paquete en `packages/ui` no podía importar de `packages/utils` porque faltaba en `dependencies` del package.json.

**¿Cómo se solucionó?**
```json
{
  "name": "@myorg/ui",
  "dependencies": {
    "@myorg/utils": "workspace:*"  // ← workspace protocol
  }
}
```

**¿Por qué funciona esta técnica?**
`workspace:*` en pnpm vincula paquetes del monorepo. Sin él, pnpm busca en npm registry.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** monorepo, turborepo, nx, pnpm workspace, changesets, build cache
- **Prioridad de carga:** Media — skill de organización de repos
- **Dependencias:** `31-git-workflows-conventional`

### Tool Integration

```json
{
  "tool_name": "monorepo-management",
  "description": "Gestión de monorepos con pnpm, Turborepo/Nx, changesets y build caching",
  "triggers": ["monorepo", "turborepo", "nx", "pnpm workspace", "changesets", "build cache"],
  "context_hint": "Activar cuando se discuta estructura de repositorio multi-paquete",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre monorepos o estructura de repositorio, carga el skill
monorepo-management. Proporciona pnpm-workspace.yaml, turbo.json con pipeline,
changesets para versionado, y Dockerfile con pnpm deploy.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# pnpm
pnpm install
pnpm add @myorg/utils --filter=@myorg/api
pnpm --filter=@myorg/api run build
pnpm deploy --filter=api --prod /dist

# Turborepo
turbo run build
turbo run test --filter=@myorg/api
turbo run dev --parallel
turbo prune --scope=@myorg/api --docker

# Nx
nx build api
nx affected:test
nx graph

# Changesets
npx changeset
npx changeset version
npx changeset publish

# TypeScript
tsc --build  # build all project references
tsc --build --clean
```

### GUI / Web

- **Turborepo UI (Vercel Remote Caching)**: Dashboard de cache hits/misses, artefactos de build
- **Nx Cloud UI**: Task graph visual, distributed task execution, cache analytics
- **Nx Console (VS Code)**: UI para run tasks, generate code, affected graph
- **Changesets GitHub App**: PRs de versionado automático

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Build all | `turbo run build` | Nx Console → Run Build |
| Test affected | `nx affected:test` | VSCode → Nx → Affected |
| Add changeset | `npx changeset` | GitHub → Changesets PR |

---

## 7. Cheatsheet Rápido

```bash
# pnpm workspace
pnpm install
pnpm add lodash --filter=@myorg/api --workspace
pnpm --filter=@myorg/api run build

# Turborepo
turbo run build --parallel
turbo run test --filter=@myorg/api
turbo prune --scope=@myorg/api --docker

# Changesets
npx changeset
npx changeset version
npx changeset publish

# pnpm deploy (Docker)
pnpm deploy --filter=api --prod /app/dist
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `31-git-workflows-conventional` | complementario (commits + monorepo) | Sí |
| `06-cicd-declarative-pipelines` | complementario (CI + monorepo) | Sí |
| `04-typescript-type-system` | complementario (TS project references) | No |
| `01-gitops-declarative-reconciliation` | complementario (GitOps + monorepo) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: monorepo-management
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/monorepo
tags: [monorepo, turborepo, nx, pnpm-workspaces, changesets, build-caching]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: git-workflows-conventional
description: "Los Git workflows estandarizados permiten automatización, generación de changelog, y versionado semántico"
---
# Git Workflows & Conventional Commits

## Semantic Triggers
```
git workflows, conventional commits, pre-commit hooks, branching strategy, changelog generation, commit lint, semantic versioning, trunk based development, git flow
```

---

## 1. Definición Teórica

Los Git workflows estandarizados permiten automatización, generación de changelog, y versionado semántico. Conventional Commits definen formato estructurado: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `BREAKING CHANGE:`. pre-commit hooks ejecutan linters/validadores antes del commit. Branching strategies: trunk-based (main + short-lived feature branches) vs Git Flow (develop, release, hotfix). Semantic versioning se deriva de commit types: fix→patch, feat→minor, BREAKING→major.

---

## 2. Implementación de Referencia

Conventional Commits v1.0.0 (especificación). pre-commit v4.2+. semantic-release v24+ o changesets v2.28+ para versionado automático.

### Ejemplo Práctico Avanzado

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: [--maxkb=500]
  - repo: https://github.com/compilerla/conventional-precommit
    rev: v3.2.0
    hooks:
      - id: conventional-precommit
        stages: [commit-msg]
  - repo: https://github.com/AlbinZhu/commit-msg-linter
    rev: v1.2.0
    hooks:
      - id: commit-msg-linter
---
# .github/workflows/versioning.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
---
# Conventional Commit messages
# feat: add user authentication
# feat(api): add login endpoint
# fix: correct email validation regex
# fix(db): handle null user_id migration
# docs: update README with setup instructions
# refactor: extract payment service
# chore: update dependencies
# BREAKING CHANGE: remove v1 API endpoints
---
# Commitizen config (package.json)
{
  "scripts": {
    "commit": "cz"
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

**Fuente oficial:** https://www.conventionalcommits.org/

### Alternativa de Implementación Específica

GitHub Actions + semantic-release para release automation. Detecta commit types, incrementa versión, genera changelog, y publica en GitHub Releases automáticamente.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos multi-desarrollador, CI/CD automation, releases frecuentes, open-source |
| **Cuándo evitar** | Proyectos personales, equipos pequeños sin release automation, monolitos legacy |
| **Alternativas** | Git Flow (releases planificadas), GitHub Flow (trunk-based), GitLab Flow (environment branches) |
| **Coste/Complejidad** | Bajo. pre-commit y conventional commits son fáciles de adoptar. semantic-release añade CI complexity |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: commit-msg hook bloquea commits válidos

**¿Qué ocasionó el error?**
El hook `conventional-precommit` rechazaba commits con cuerpo multilínea porque no coincidía con el regex.

**¿Cómo se solucionó?**
```yaml
- repo: https://github.com/compilerla/conventional-precommit
  rev: v3.2.0
  hooks:
    - id: conventional-precommit
      args: [--strict=false]  # menos restrictivo con formato
```

**¿Por qué funciona esta técnica?**
`--strict=false` relaja la validación permitiendo cuerpos multilínea y mensajes más largos.

### Caso: Changelog no se genera automáticamente

**¿Qué ocasionó el error?**
semantic-release requiere `fetch-depth: 0` en checkout para ver todo el historial de commits.

**¿Cómo se solucionó?**
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # ← necesario para semver
```

**¿Por qué funciona esta técnica?**
semantic-release necesita el historial completo para determinar el próximo version según commits desde la última release.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~380 tokens al invocar este skill
- **Trigger de activación:** git workflow, conventional commit, pre-commit, branching, changelog, semver
- **Prioridad de carga:** Alta — fundacional para cualquier proyecto
- **Dependencias:** `06-cicd-declarative-pipelines`

### Tool Integration

```json
{
  "tool_name": "git-workflows-conventional",
  "description": "Git workflows, Conventional Commits, pre-commit hooks, y versionado semántico",
  "triggers": ["git workflow", "conventional commit", "pre-commit", "branching", "changelog"],
  "context_hint": "Activar cuando se discuta gestión de versiones o commits",
  "output_format": "markdown",
  "max_tokens": 1900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre git workflows o conventional commits, carga el skill
git-workflows-conventional. Proporciona pre-commit config, commit format, branching
strategy, y semantic-release automation.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# pre-commit
pre-commit install
pre-commit run --all-files
pre-commit autoupdate

# Commitizen
npx cz
git commit -m "feat(api): add login endpoint"

# Changelog
npx standard-version --dry-run
git log --oneline --no-decorate v1.0.0..HEAD

# Semantic release
npx semantic-release --dry-run
npx semantic-release

# Git flow
git flow feature start user-auth
git flow release start v1.2.0
git flow hotfix start security-patch

# Branch naming
git branch feat/234-user-auth
git branch fix/123-email-validation
```

### GUI / Web

- **GitHub Desktop**: Visual diff, branch switcher, commit con templates
- **GitHub Releases UI**: Changelog generado automáticamente, release notes
- **GitLab UI**: Merge request con pipeline status, squash commits
- **GitKraken/SourceTree**: Visual branching tree, commit history

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Stage all | `git add -A` | `Ctrl + Shift + A` (GitHub Desktop) |
| Commit | `git commit -m "feat: msg"` | `Ctrl + Enter` (GitHub Desktop) |
| Push | `git push` | `Ctrl + P` (GitHub Desktop) |

---

## 7. Cheatsheet Rápido

```bash
# Conventional commit format
# <type>(<scope>): <description>
git commit -m "feat(api): add login endpoint"
git commit -m "fix(db): handle null user_id"
git commit -m "BREAKING CHANGE: remove v1 API"

# pre-commit
pre-commit install
pre-commit run --all-files

# Changelog
npx standard-version --dry-run
git log --oneline v1.0.0..HEAD

# Branch naming
git checkout -b feat/234-user-auth
git checkout -b fix/123-validation-fix
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-cicd-declarative-pipelines` | complementario (CI + conventional commits) | Sí |
| `32-monorepo-management` | complementario (changesets + monorepo) | No |
| `01-gitops-declarative-reconciliation` | complementario (GitOps + git workflow) | No |
| `07-progressive-delivery-canary` | complementario (releases + canary) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: git-workflows-conventional
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/git-workflows
tags: [git-workflows, conventional-commits, pre-commit, semantic-versioning, changelog]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

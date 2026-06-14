---
name: cicd-declarative-pipelines
description: "Los pipelines CI/CD declarativos se definen como código YAML dentro del repositorio (.github/workflows/ o .gitlab-ci.yml). Covers integración, sistema, CI/CD, automation, despliegue, pipeline, build system, asset pipeline, DevOps, BackstopJS, SVGO, Sharp"
---
# CI/CD Declarative Pipelines

## Semantic Triggers
```
ci cd pipeline, github actions, gitlab ci, declarative workflow, matrix build test, pipeline cache artifacts, oidc cloud auth, composite action reuse
```

---

## 1. Definición Teórica

Los pipelines CI/CD declarativos se definen como código YAML dentro del repositorio (.github/workflows/ o .gitlab-ci.yml). La estrategia matrix ejecuta jobs en múltiples combinaciones (OS, versiones de lenguaje) con fail-fast: false para máxima señal. OIDC permite autenticación cloud sin credenciales estáticas. Composite actions encapsulan pasos reutilizables entre workflows.

---

## 2. Implementación de Referencia

GitHub Actions es la plataforma líder con su ecosistema de marketplace. GitLab CI y CircleCI ofrecen modelos similares con ejecutores autogestionados.

### Ejemplo Práctico Avanzado

```yaml
name: CI/CD Pipeline
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  workflow_dispatch: {}
env:
  NODE_VERSION: "22"
  PNPM_VERSION: "10"

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: "${{ env.PNPM_VERSION }}" }
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node-version }}", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck
      - run: pnpm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: test-results-${{ matrix.node-version }}, path: test-results/ }

  deploy:
    needs: [test]
    if: github.ref == 'refs/heads/main'
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
```

**Fuente oficial:** https://docs.github.com/en/actions

### Alternativa de Implementación Específica

GitLab CI con runners autogestionados para equipos que necesitan ejecutores on-premise con GPU/aceleración hardware y pipelines multi-stage más complejos.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Automatización de build, test, deploy con integración nativa al repositorio |
| **Cuándo evitar** | Workflows extremadamente complejos (>100 jobs), pipelines que requieren ejecutores muy especializados |
| **Alternativas** | CircleCI (caché configurable), Jenkins (customizable), Argo Workflows (K8s nativo) |
| **Coste/Complejidad** | Bajo-medio. GitHub Actions incluye minutos gratuitos. Costo escala con paralelismo y tiempo de ejecución |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Cache no restaurada entre runs

**¿Qué ocasionó el error?**
El hash del lockfile cambió por un `pnpm install` sin `--frozen-lockfile`, invalidando el cache key.

**¿Cómo se solucionó?**
```yaml
- run: pnpm install --frozen-lockfile  # ← siempre usar frozen-lockfile en CI
```
Y se agregó fallback cache:
```yaml
key: pnpm-${{ hashFiles('pnpm-lock.yaml') }}
restore-keys: pnpm-
```

**¿Por qué funciona esta técnica?**
`hashFiles('pnpm-lock.yaml')` asegura que el cache se invalide solo cuando las dependencias cambien.

### Caso: Secrets expuestos en logs

**¿Qué ocasionó el error?**
Usar `${{ env.SECRET }}` en lugar de `${{ secrets.SECRET }}` imprimió el valor en los logs.

**¿Cómo se solucionó?**
Siempre usar `${{ secrets.X }}` que GitHub auto-masca. Nunca pasar secrets via `env:` para debug.

**¿Por qué funciona esta técnica?**
GitHub Actions auto-detecta y masca valores de `secrets.*` en logs.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~370 tokens al invocar este skill
- **Trigger de activación:** ci/cd, github actions, pipeline, gitlab ci, workflow, automation
- **Prioridad de carga:** Alta — skill central para automatización
- **Dependencias:** `31-git-workflows-conventional`, `07-progressive-delivery-canary`

### Tool Integration

```json
{
  "tool_name": "cicd-declarative-pipelines",
  "description": "Creación y debugging de pipelines CI/CD declarativos con GitHub Actions, GitLab CI y matrix builds",
  "triggers": ["ci/cd", "github actions", "pipeline", "gitlab ci", "matrix build"],
  "context_hint": "Activar cuando se hable de automatización de build/test/deploy",
  "output_format": "markdown",
  "max_tokens": 1850
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre CI/CD o pipelines declarativos, carga el skill
cicd-declarative-pipelines. Proporciona ejemplos de matrix strategy, caching OIDC,
composite actions, y patrones de seguridad.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# GitHub CLI
gh workflow list
gh workflow run ci.yml --ref main
gh run list --limit 10
gh run watch <run-id>
gh run download <run-id> -n test-results

# Act locally
act --job test -s GITHUB_TOKEN=xxx
act pull_request --verbose

# Cache management
gh actions-cache list
gh actions-cache delete <key>
```

### GUI / Web

- **GitHub Actions UI**: Dashboard de workflows, logs en vivo, artefactos descargables, matriz de resultados
- **GitLab CI UI**: Pipeline DAG visual, job traces, environments con deploy status
- **Netlify/Vercel**: Preview deployments por PR
- **VS Code**: GitHub Actions extension para ver workflows y logs locales

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver workflows | `gh workflow list` | Actions tab |
| Re-run failed | `gh run rerun <id> --failed` | Re-run failed jobs |
| Cancel run | `gh run cancel <id>` | Cancel button |

---

## 7. Cheatsheet Rápido

```yaml
# Mínimo CI workflow
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node }}", cache: "npm" }
      - run: npm ci
      - run: npm test
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `31-git-workflows-conventional` | complementario (conventional commits + CI) | Sí |
| `07-progressive-delivery-canary` | complementario (CI + canary deploy) | Sí |
| `25-load-testing-k6-distributed` | complementario (load test en CI) | No |
| `22-artifact-registries-security` | complementario (registro de artefactos) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: cicd-declarative-pipelines
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/github-actions
tags: [ci-cd, github-actions, gitlab-ci, pipelines, matrix-build, oidc, automation]
---
```

---

## Comparativa 2026 / Ecosystem

### Pipeline de Assets (Badge/Design System) + CI/CD

```
/src/svg/[01-20].svg
  → 1. SVGO multipass (optimización AST)
  → 2. Sharp rasterización (SVG→PNG 36×36)
  → 3. Re-color por era (Node script)
  → 4. pngquant compresión (cuantización paleta)
  → 5. zopfli deflate extremo
  → 6. Exportación multi-formato (PNG/WebP/AVIF)
  → /dist/[era]/[formato]/[01-20].*
```

### Asset Pipeline en GitHub Actions

```yaml
# .github/workflows/badge-build.yml
name: badge-build
on:
  push:
    paths: ['src/svg/**', 'scripts/**']
  pull_request:
    paths: ['src/svg/**', 'scripts/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - name: SVGO optimization
        run: npx svgo -f src/svg/ -o dist/svg/ --multipass
      - name: Rasterize + pngquant
        run: node pipeline.js
      - name: Visual regression testing
        run: npx backstopjs test
      - uses: actions/upload-artifact@v4
        with:
          path: dist/
          name: badge-assets-${{ github.sha }}
```

### Automatización Completa

| Herramienta | Función | Output típico |
|-------------|---------|---------------|
| SVGO multipass | Optimización SVG AST | 2KB → 1KB (-50%) |
| Sharp | Rasterización | SVG → PNG 36×36 |
| pngquant | Cuantización paleta | 5KB → 1KB (-80%) |
| zopfli | Deflate extremo | 1KB → 0.7KB (-30%) |
| BackstopJS | Visual regression testing | Detect layout shifts |
| ImageMagick | Conversión batch | PDF → PNG, format change |

### Despliegue y Distribución de Assets

```yaml
# Deploy a CDN
deploy-assets:
  needs: [build]
  runs-on: ubuntu-latest
  permissions:
    id-token: write
    contents: read
  steps:
    - uses: actions/checkout@v4
    - name: Upload to Cloudflare R2 / S3
      run: |
        aws s3 sync dist/ s3://my-bucket/badges/ --cache-control max-age=31536000
        npx cloudflare-cli r2 sync dist/ badges/
```

**Prácticas:**
- Cache invalidation por hash de contenido (e.g., `badge-{hash}.png`)
- Versionado semántico de eras (v1, v2, v3)
- Health checks en build: tamaño, formato, resolución
- Content-Type correcto por extensión
- Compresión Brotli/gzip en CDN

### Pipeline Completo Unificado (CI + Asset + Deploy)

```yaml
name: full-pipeline
on:
  push:
    branches: [main]
    paths: ['src/**', 'scripts/**', '.github/workflows/**']

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node-version }}', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck
      - run: pnpm test --coverage

  build-assets:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: node pipeline.js  # SVGO + Sharp + pngquant
      - run: npx backstopjs test  # visual regression
      - uses: actions/upload-artifact@v4
        with:
          path: dist/

  deploy:
    needs: [build-assets]
    if: github.ref == 'refs/heads/main'
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE }}
      - run: aws s3 sync dist/ s3://prod-bucket/
```

### Health Checks Automatizados

```bash
# Verificar tamaño máximo
find dist/ -size +2k -name "*.png" && exit 1

# Verificar formato correcto
file dist/**/*.png | grep -v "PNG image"

# Verificar resolución mínima
for f in dist/*.png; do identify -format "%w x %h" "$f"; done
```

### Tabla de Decisión: Cuándo usar Cada Runner

| Runner | Caso de uso | Minutos gratis/mes |
|--------|-------------|-------------------|
| ubuntu-latest | Builds estándar, Node, Python, Go | 2000 |
| windows-latest | .NET, PowerShell, tests en Windows | 2000 |
| macos-latest | iOS, Xcode, Swift | 200 (10x costo) |
| self-hosted | GPU, hardware específico, datos sensibles | Ilimitado (infraestructura propia) |

### VRT (Visual Regression Testing)

```javascript
// backstop.json
{
  "id": "badge-vrt",
  "viewports": [{ "label": "36x36", "width": 36, "height": 36 }],
  "scenarios": [
    { "label": "Era 1", "url": "http://localhost:3000/badge/01/era-1" },
    { "label": "Era 4", "url": "http://localhost:3000/badge/01/era-4" }
  ],
  "expect": 0.01,  // 1% pixel diff tolerance
  "misMatchThreshold": 0.1
}
```

Detecta cambios visuales no intencionales después de optimizaciones SVGO o cambios de tokens.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with system-integration)*

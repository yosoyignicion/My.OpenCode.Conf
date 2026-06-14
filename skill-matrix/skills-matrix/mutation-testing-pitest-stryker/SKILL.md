---
name: mutation-testing-pitest-stryker
description: "Mutation testing introduce pequeños cambios (mutaciones) en el código (ej: cambiar `>` por `<`, negar condiciones, eliminar llamadas) y verifica si los tests existentes detectan el cambio"
---
# mutation-testing-pitest-stryker

## Semantic Triggers
```
mutation testing with PITest for Java, Stryker mutator for JavaScript and TypeScript, mutation score as quality gate in CI, surviving mutants indicate untested code paths, incremental mutation testing for large codebases, combining mutation testing with property-based testing
```

---

## 1. Definición Teórica

Mutation testing introduce pequeños cambios (mutaciones) en el código (ej: cambiar `>` por `<`, negar condiciones, eliminar llamadas) y verifica si los tests existentes detectan el cambio. Los mutantes que sobreviven indican código no testeado. El objetivo es >80% mutation score. Tipos de mutantes: conditional boundary, math operators, return values, void method calls, negation, empty returns. Herramientas: PITest (Java), Stryker (JS/TS, C#, Scala), Mutmut (Python), Humbug (Go).

---

## 2. Implementación de Referencia

**Stryker Mutator** v8+ para JavaScript/TypeScript. Soporta Vitest, Jest, Mocha, Jasmine. Ejecución incremental, parallel, y dashboard web con reports.

### Ejemplo Práctico Avanzado

```json
// stryker.config.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "pnpm",
  "plugins": [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/typescript-checker"
  ],
  "testRunner": "vitest",
  "checkers": ["typescript"],
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 60
  },
  "mutators": {
    "arithmetic": true,
    "conditional": true,
    "stringLiteral": true,
    "blockStatement": true,
    "methodExpression": true,
    "objectLiteral": true
  },
  "incremental": true,
  "incrementalFile": "reports/stryker-incremental.json",
  "reporters": ["html", "json", "progress", "dashboard"],
  "tempDirName": "stryker-tmp"
}
```

```bash
# Run mutation tests
npx stryker run

# Run with dashboard upload (requires dashboard token)
npx stryker run --dashboard

# Incremental mode (only test changed files)
npx stryker run --incremental
```

**Fuente oficial:** https://stryker-mutator.io/docs/stryker-js/getting-started/

### Alternativa de Implementación Específica

**PITest** (PIT Mutation Testing) para Java. Soporta JUnit 5, Spring, y mocks (Mockito). Integración Maven/Gradle con reportes HTML y XML (JUnit compatible). Ejecución incremental y parallel.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Código crítico donde los tests deben ser robustos (auth, payments, lógica de negocio sensible) |
| **Cuándo evitar** | Proyectos con cobertura <50% (primero mejorar cobertura), código legacy sin tests |
| **Alternativas** | PITest (Java), Mutmut (Python), Humbug (Go), Infinitest (continuous testing) |
| **Coste/Complejidad** | Medio. Ejecución lenta (10-100x más que tests normales). Mutación incremental reduce el tiempo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Mutation testing timeout en CI

**¿Qué ocasionó el error?**
Stryker ejecutaba todos los mutantes secuencialmente, tomando >60 minutos en CI.

**¿Cómo se solucionó?**
Activar `--incremental` y `--concurrency 4` (parallel). Limitar mutantes con `mutate` a solo archivos modificados en el PR.

**¿Por qué funciona esta técnica?**
Incremental usa cache de resultados previos. Parallel ejecuta mutantes en workers separados.

### Caso: Mutantes equivalentes (código muerto)

**¿Qué ocasionó el error?**
Condiciones como `while (true)` generaban mutantes equivalentes (cambio no observable) que no podían matarse.

**¿Cómo se solucionó?**
Configurar Stryker para ignorar mutaciones en archivos específicos y añadir comentarios `// Stryker disable next-line` en casos conocidos.

**¿Por qué funciona esta técnica?**
El disable comment evita que Stryker mute líneas específicas, eliminando falsos positivos por mutantes equivalentes.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~550 tokens estimados al invocar este skill
- **Trigger de activación:** "mutation testing" o "Stryker" en la consulta
- **Prioridad de carga:** Media — útil para validar calidad de tests pero no crítico
- **Dependencias:** `03-property-based-testing` (combinación recomendada)

### Tool Integration

```json
{
  "tool_name": "mutation-testing-pitest-stryker",
  "description": "Mutation testing con Stryker y PITest, configuración incremental, y quality gates en CI",
  "triggers": ["mutation testing", "Stryker", "PITest", "mutation score", "mutant", "test quality"],
  "context_hint": "Inyectar junto con 03-property-based-testing para testing avanzado",
  "output_format": "markdown",
  "max_tokens": 550
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre mutation testing, carga el skill mutation-testing-pitest-stryker y responde
con ejemplos de configuración Stryker incremental.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Stryker
npx stryker run
npx stryker run --incremental
npx stryker run --concurrency 4

# PITest (Maven)
mvn org.pitest:pitest-maven:mutationCoverage
mvn pitest:mutationCoverage -DtargetTests=com.example.*Test

# Mutmut (Python)
mutmut run --paths-to-mutate src/
mutmut results
mutmut junitxml > mutation-results.xml

# Humbug (Go)
humbug run --source="./..."
```

### GUI / Web

- **Stryker Dashboard:** Historial de mutation score por branch, PR comments automáticos
- **PITest HTML Report:** Visualización de mutantes vivos/muertos por clase y línea
- **Stryker Playground:** Editor web de código con mutation testing interactivo

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar mutation | `npx stryker run` | Stryker Dashboard → Run |
| Ver resultados | `npx stryker run --dashboard` | HTML Report → Open |

---

## 7. Cheatsheet Rápido

```json
// Stryker config essentials
{
  "mutate": ["src/**/*.ts"],
  "testRunner": "vitest",
  "thresholds": { "high": 80, "low": 60, "break": 60 },
  "incremental": true,
  "mutators": ["arithmetic", "conditional", "stringLiteral"]
}
```

```bash
# CLI
npx stryker run
# Target: >80% mutation score
# Incremental: only changed files
# Parallel: --concurrency N
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-property-based-testing` | Complementario — property-based + mutation = testing robusto | Sí |
| `18-integration-testing-wiremock-testcontainers` | Alternativa — integration testing complementa mutation unitario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 16-mutation-testing-pitest-stryker
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [mutation-testing, stryker, pitest, test-quality, mutmut, mutation-score]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: static-application-security-testing-sast
description: "SAST (Static Application Security Testing) analiza código fuente sin ejecutarlo, detectando vulnerabilidades de seguridad temprano en el ciclo de desarrollo (shift left)"
---
# static-application-security-testing-sast

## Semantic Triggers
```
SAST source code vulnerability scanning, Semgrep custom rules for security patterns, SonarQube security hotspots analysis, CodeQL query-based vulnerability detection, SAST in CI pipeline with SARIF output, false positive triage and suppression for SAST
```

---

## 1. Definición Teórica

SAST (Static Application Security Testing) analiza código fuente sin ejecutarlo, detectando vulnerabilidades de seguridad temprano en el ciclo de desarrollo (shift left). Las herramientas clave son: Semgrep (reglas personalizables, OSS), CodeQL (GitHub, queries basadas en AST), SonarQube (análisis comprehensivo). SAST encuentra inyecciones, secretos hardcodeados, criptografía insegura, path traversal, y bugs lógicos. Se ejecuta en cada PR, bloqueando hallazgos críticos/altos.

---

## 2. Implementación de Referencia

**Semgrep** (r2c) v1.70+ es el SAST más flexible y rápido. Soporta 30+ lenguajes con reglas OSS (Semgrep Registry) y reglas personalizadas. Se integra vía pre-commit hooks y CI/CD con salida SARIF.

### Ejemplo Práctico Avanzado

```yaml
# .github/workflows/sast.yml
name: SAST Scan
on: [pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/default
            p/python
            p/javascript
            p/owasp-top-ten
            rules/custom-sensitive-data.yaml
          sarif: results.sarif
          audit_on: push
      - name: Upload SARIF to GitHub
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

      - name: Block on critical findings
        run: |
          critical=$(jq '[.runs[].results[] | select(.properties.severity == "error")] | length' results.sarif)
          if [ "$critical" -gt 0 ]; then
            echo "::error::$critical critical vulnerabilities found"
            exit 1
          fi
```

**Fuente oficial:** https://semgrep.dev/docs

### Alternativa de Implementación Específica

**CodeQL** (GitHub): Para equipos que ya usan GitHub. Queries en QL (Query Language) para análisis AST profundo. El pack de seguridad incluye 200+ queries para CWE Top 25. Integración nativa con GitHub Code Scanning.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | En cada PR, bloqueando hallazgos críticos. Complementar con DAST para cobertura runtime |
| **Cuándo evitar** | Código generado (protobuf, swagger codegen) — añadir a .semgrepignore |
| **Alternativas** | SonarQube (más pesado, mejor para quality), Snyk Code (mejor para dependencias), Ruff (Python solo) |
| **Coste/Complejidad** | Bajo. Semgrep es OSS y rápido. Configuración única de reglas. Falsos positivos requieren triage inicial |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Semgrep no detecta SQL injection dinámica

**¿Qué ocasionó el error?**
La inyección usaba string concatenation con `f"SELECT * FROM {table}"` donde `table` venía de un enum, pero Semgrep no seguía el flujo de datos.

**¿Cómo se solucionó?**
Escribir una regla personalizada Semgrep para detectar `f"SELECT" o `"SELECT" + variable` con taint tracking:

```yaml
rules:
  - id: dynamic-sql-query
    mode: taint
    pattern-sources:
      - pattern: request.$METHOD(...)
    pattern-sinks:
      - pattern: cursor.execute(...)
    message: "Potential SQL injection from user input"
    languages: [python]
```

**¿Por qué funciona esta técnica?**
El taint tracking sigue el flujo desde la entrada del usuario hasta la ejecución SQL, detectando inyecciones incluso con transformaciones intermedias.

### Caso: Falsos positivos por reglas demasiado genéricas

**¿Qué ocasionó el error?**
La regla `default` de Semgrep marcaba `eval(input())` como crítico, incluso cuando `input` estaba sanitizado por una whitelist.

**¿Cómo se solucionó?**
Crear una regla de autofix con `pattern-not` para excluir usos sanitizados, y usar `metadata: cwe` para priorizar:

```yaml
rules:
  - id: dangerous-eval
    patterns:
      - pattern: eval($X)
      - pattern-not: eval(ALLOWED_FUNCTIONS[$X])
    metadata:
      cwe: "CWE-95: Eval Injection"
      likelihood: HIGH
```

**¿Por qué funciona esta técnica?**
`pattern-not` excluye casos conocidos seguros, reduciendo falsos positivos sin eliminar la detección.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "SAST" o "Semgrep" en la consulta del usuario
- **Prioridad de carga:** Alta — análisis estático es primer filtro de seguridad
- **Dependencias:** `04-owasp-top-10-mitigation`, `07-dynamic-application-security-testing-dast`

### Tool Integration

```json
{
  "tool_name": "static-application-security-testing-sast",
  "description": "SAST con Semgrep y CodeQL, reglas personalizadas, integración CI/CD con SARIF",
  "triggers": ["SAST", "Semgrep", "CodeQL", "static analysis", "SonarQube", "security scanning"],
  "context_hint": "Inyectar secciones 1-2 cuando el usuario necesite análisis estático de seguridad en código",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre SAST o Semgrep, carga el skill static-application-security-testing-sast y responde
con ejemplos de reglas personalizadas y taint tracking.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Run Semgrep locally
semgrep --config=auto --sarif -o results.sarif .
semgrep --config=p/default --severity=ERROR .

# CodeQL CLI
codeql database create --language=python ./db
codeql database analyze ./db codeql/python-queries --format=sarif-latest --output=results.sarif

# Pre-commit hook
echo "repos:
  - repo: https://github.com/semgrep/pre-commit
    rev: v1.70.0
    hooks:
      - id: semgrep
        args: ['--config=auto', '--error']" > .pre-commit-config.yaml

# SARIF to GitHub
gh api repos/$REPO/code-scanning/sarifs -f commit_sha=$SHA -f sarif=@results.sarif
```

### GUI / Web

- **Semgrep Playground:** Editor web para crear y probar reglas con feedback visual
- **GitHub Code Scanning:** Resultados SAST en la pestaña Security de cada PR
- **SonarQube Dashboard:** Métricas de seguridad, reliability, maintainability con history

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Escanear directorio | `semgrep --config=auto .` | GitHub → Code Scanning → Run |
| Ver reglas disponibles | `semgrep --show-supported-languages` | Semgrep Registry (web) |

---

## 7. Cheatsheet Rápido

```yaml
# Semgrep essentials
rules:
  - id: no-hardcoded-secrets
    pattern-either:
      - pattern-regex: (?:api[_-]?key|apikey|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']
    severity: ERROR
    languages: [python, javascript, go, rust, java]

# CLI
semgrep --config=auto .
semgrep --config=p/owasp-top-ten .
semgrep --config=rules.yaml --sarif -o results.sarif .
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-dynamic-application-security-testing-dast` | Complementario — SAST + DAST = cobertura completa | Sí |
| `04-owasp-top-10-mitigation` | Complementario — reglas SAST se basan en OWASP Top 10 | Sí |
| `15-vulnerability-scanning-dependency-check` | Complementario — SAST para código propio, scanning para dependencias | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 08-static-application-security-testing-sast
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [sast, semgrep, codeql, sonarqube, static-analysis, security-testing, sarif]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

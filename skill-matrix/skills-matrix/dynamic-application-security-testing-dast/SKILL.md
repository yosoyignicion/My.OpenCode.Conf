---
name: dynamic-application-security-testing-dast
description: "DAST (Dynamic Application Security Testing) analiza aplicaciones en ejecución desde afuera, identificando vulnerabilidades explotables en runtime"
---
# dynamic-application-security-testing-dast

## Semantic Triggers
```
DAST scanning for runtime vulnerabilities, OWASP ZAP automated security testing, Burp Suite professional passive and active scanning, authenticated DAST scans with session management, API DAST for REST and GraphQL endpoints, headless browser DAST for single-page applications
```

---

## 1. Definición Teórica

DAST (Dynamic Application Security Testing) analiza aplicaciones en ejecución desde afuera, identificando vulnerabilidades explotables en runtime. A diferencia de SAST, DAST requiere una instancia desplegada y no necesita acceso al código fuente. Escaneo pasivo (observa tráfico sin modificar) vs activo (inyecta payloads maliciosos). Ideal para encontrar XSS, SQL injection, SSRF, auth bypass, y problemas de configuración. Se integra típicamente en staging post-deploy.

---

## 2. Implementación de Referencia

**OWASP ZAP** (Zed Attack Proxy) v2.16+ es la herramienta DAST open-source más completa. Soporta escaneo automatizado, autenticación, API testing, y formato SARIF para integración CI/CD.

### Ejemplo Práctico Avanzado

```yaml
# GitHub Actions: DAST with ZAP authenticated scan
jobs:
  dast:
    runs-on: ubuntu-latest
    services:
      zap:
        image: ghcr.io/zaproxy/zaproxy:stable
        options: --user root
    steps:
      - uses: actions/checkout@v4
      - name: Start ZAP and authenticate
        run: |
          zap.sh -daemon -host 0.0.0.0 -port 8090 -config api.key=zap-api-key &
          sleep 10
          # Authenticate via login form
          zap-cli --api-key zap-api-key quick-scan \
            --spider --ajax-spider \
            --user "user@example.com:password123" \
            --context "My App Context" \
            https://staging.example.com
      - name: Active scan with API definition
        run: |
          curl -X POST "http://localhost:8090/JSON/openapi/action/importUrl/" \
            -d "url=https://staging.example.com/openapi.json&apiKey=zap-api-key"
          curl -X POST "http://localhost:8090/JSON/ascan/action/scan/" \
            -d "url=https://staging.example.com&recurse=true&apiKey=zap-api-key"
      - name: Generate SARIF report
        run: |
          curl "http://localhost:8090/JSON/core/view/alerts/?baseurl=https://staging.example.com&apikey=zap-api-key" \
            -o zap-results.json
          # Convert to SARIF for GitHub Code Scanning
          gh api repos/${{ github.repository }}/code-scanning/sarifs \
            -f commit_sha=${{ github.sha }} \
            -f sarif=@zap-results.sarif
```

**Fuente oficial:** https://www.zaproxy.org/docs/docker/

### Alternativa de Implementación Específica

**Burp Suite Professional**: Para equipos que necesitan escaneo más profundo con session handling rules, extensions (BApp Store), y Intruder para fuzzing personalizado. La API REST permite automatización en CI/CD.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones web/API con autenticación y múltiples roles de usuario. Post-deploy en staging |
| **Cuándo evitar** | Componentes internos sin interfaz HTTP, aplicaciones no desplegadas (usar SAST en su lugar) |
| **Alternativas** | SAST (para análisis estático en código), IAST (integración con runtime agent), RASP (protección en producción) |
| **Coste/Complejidad** | Medio. ZAP es gratuito pero requiere configuración de autenticación. Burp Suite Pro tiene costo de licencia |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: DAST no detecta vulnerabilidades en SPAs

**¿Qué ocasionó el error?**
ZAP escaneaba solo el HTML inicial sin ejecutar JavaScript. Las rutas y APIs cargadas dinámicamente no se escaneaban.

**¿Cómo se solucionó?**
Configurar AJAX Spider (ZAP headless browser) y pre-poblar la sesión con URLs descubiertas por Crawl Start Point.

**¿Por qué funciona esta técnica?**
AJAX Spider usa un navegador headless (Selenium) que ejecuta JS, descubre rutas dinámicas, y llena el árbol de URLs para el escáner activo.

### Caso: Falsos positivos por sesión expirada durante escaneo

**¿Qué ocasionó el error?**
El escaneo activo duraba >30 min y la sesión expiraba, causando que ZAP reportara "unauthenticated access" como falso positivo.

**¿Cómo se solucionó?**
Configurar Session Management en ZAP con verificación de sesión (/auth/status endpoint) y re-autenticación automática.

**¿Por qué funciona esta técnica?**
ZAP verifica periódicamente si la sesión sigue activa y ejecuta el flujo de login nuevamente, manteniendo el escaneo autenticado.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "DAST" o "ZAP" en la consulta del usuario
- **Prioridad de carga:** Alta — testing de seguridad runtime es crítico pre-producción
- **Dependencias:** `08-static-application-security-testing-sast`, `04-owasp-top-10-mitigation`

### Tool Integration

```json
{
  "tool_name": "dynamic-application-security-testing-dast",
  "description": "DAST con OWASP ZAP y Burp Suite, escaneo autenticado, API testing, SARIF reporting",
  "triggers": ["DAST", "ZAP", "Burp Suite", "dynamic security testing", "penetration testing"],
  "context_hint": "Inyectar secciones 1-2 cuando el usuario necesite escaneo de seguridad en aplicaciones desplegadas",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre DAST, carga el skill dynamic-application-security-testing-dast y responde
con ejemplos de OWASP ZAP para escaneo autenticado en CI/CD.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# ZAP baseline scan (quick, non-intrusive)
docker run -v $(pwd):/zap/wrk:rw -t ghcr.io/zaproxy/zaproxy \
  zap-baseline.py -t https://staging.example.com -r report.html

# ZAP full scan (includes active scanning)
docker run -v $(pwd):/zap/wrk:rw -t ghcr.io/zaproxy/zaproxy \
  zap-full-scan.py -t https://staging.example.com -r full-report.html -x zap.xml

# ZAP API scan (OpenAPI-first)
docker run -v $(pwd):/zap/wrk:rw -t ghcr.io/zaproxy/zaproxy \
  zap-api-scan.py -t https://staging.example.com/openapi.json -f openapi -r api-report.html

# Burp Suite CLI
burpsuite --project-file=project.burp --config-file=config.json --scan-url=https://target.com
```

### GUI / Web

- **OWASP ZAP Desktop:** Interfaz completa con HUD (Heads Up Display) para pentesters
- **Burp Suite Professional:** Interfaz con Repeater, Intruder, Decoder, Comparer
- **Acunetix / Netsparker:** DAST comercial con crawling avanzado y verificación de falsos positivos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Baseline scan | `zap-baseline.py -t URL -r report.html` | ZAP → Quick Scan |
| API scan | `zap-api-scan.py -t schema.json -f openapi` | ZAP → Import OpenAPI |

---

## 7. Cheatsheet Rápido

```bash
# Quick ZAP commands
zap-baseline.py -t https://staging.example.com -r report.html
zap-full-scan.py -t https://staging.example.com -r report.html
zap-api-scan.py -t https://example.com/openapi.json -f openapi -r report.html

# Docker flags explained
# -v $(pwd):/zap/wrk:rw  -> mount results directory
# -t ghcr.io/zaproxy/zaproxy:stable -> stable tag
# -x report.xml -> SARIF output for CI
# -j -> JWT support for API scans
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-static-application-security-testing-sast` | Complementario — SAST + DAST cubre toda la superficie | Sí |
| `04-owasp-top-10-mitigation` | Complementario — DAST encuentra vulnerabilidades OWASP Top 10 | Sí |
| `17-fuzzing-security-boundaries` | Complementario — fuzzing es una forma de DAST especializada | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 07-dynamic-application-security-testing-dast
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [dast, zap, burp-suite, security-testing, vulnerability-scanning, sast, pentesting]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

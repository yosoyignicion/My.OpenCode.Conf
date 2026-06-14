---
name: software-bill-of-materials-sbom
description: "Un SBOM (Software Bill of Materials) es un inventario anidado de todos los componentes, librerías y dependencias de un artefacto de software"
---
# software-bill-of-materials-sbom

## Semantic Triggers
```
SPDX and CycloneDX SBOM formats, generating SBOM from package manifests, SBOM diffing and vulnerability correlation, attesting SBOM with Sigstore and in-toto, NIST SSDF and EO 14028 SBOM requirements, dependency tree analysis with sbom-utility
```

---

## 1. Definición Teórica

Un SBOM (Software Bill of Materials) es un inventario anidado de todos los componentes, librerías y dependencias de un artefacto de software. Los formatos estándar son SPDX (Linux Foundation, ISO 5962) y CycloneDX (OWASP). La EO 14028 (Executive Order on Cybersecurity) de EEUU exige SBOMs para software federal. Herramientas: Syft, cdxgen, Trivy sbom, Dependency-Track. El SBOM firmado (attestation) con Sigstore garantiza integridad supply chain.

---

## 2. Implementación de Referencia

**Syft** (Anchore) para generación de SBOMs + **Cosign** para attestation + **Dependency-Track** para gestión. Syft soporta SPDX, CycloneDX, y formatos personalizados. Se integra en CI/CD para generar SBOM en cada build.

### Ejemplo Práctico Avanzado

```yaml
# CI Pipeline: SBOM generation, attest, and upload
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM with Syft (SPDX + CycloneDX)
        uses: anchore/sbom-action@v0
        with:
          path: ./
          format: spdx-json
          output-file: sbom.spdx.json
      - name: Generate CycloneDX for Dependency-Track
        run: |
          syft packages . -o cyclonedx-json > bom.cdx.json
          curl -X POST "https://dt.example.com/api/v1/bom" \
            -H "X-Api-Key: ${{ secrets.DT_API_KEY }}" \
            -H "Content-Type: multipart/form-data" \
            -F "bom=@bom.cdx.json"
      - name: Sign SBOM with Cosign
        run: |
          cosign attest --yes --predicate sbom.spdx.json --type spdx \
            ${{ vars.REGISTRY }}/app:${{ github.sha }}
      - name: Validate SBOM with OPA
        run: |
          opa eval --input sbom.spdx.json --data policy/sbom.rego "data.sbom.deny"
```

**Fuente oficial:** https://github.com/anchore/syft

### Alternativa de Implementación Específica

**cdxgen** (OWASP CycloneDX): Alternativa que genera SBOMs con datos de licencias y firmas. Ideal cuando se necesita compliance de licencias además de vulnerabilidades. Soporta 50+ lenguajes y ecosistemas.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | En cada build de CI/CD, especialmente para software distribuido a terceros o desplegado en entornos regulados |
| **Cuándo evitar** | Proyectos internos sin dependencias externas (monolitos sin packages) |
| **Alternativas** | Trivy sbom (si ya usas Trivy), cdxgen (mejor para licencias), SPDX SBOM Generator (Microsoft) |
| **Coste/Complejidad** | Bajo. Herramientas maduras, fácil integración CI/CD. El retorno es alto ante auditorías |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: SBOM con dependencias transitivas faltantes

**¿Qué ocasionó el error?**
Syft no detectaba dependencias transitivas de paquetes Rust (Cargo.lock) porque el `Cargo.toml` no tenía lock file.

**¿Cómo se solucionó?**
Asegurar que `Cargo.lock` esté versionado en el repo. Syft (y la mayoría de scanners) requieren el lock file para transitivas.

**¿Por qué funciona esta técnica?**
El lock file contiene el árbol de dependencias resuelto. Sin él, solo se ven las dependencias directas. CVE-2022-21668 (Rust) fue un caso donde dependencias transitivas no escaneadas introdujeron vulnerabilidades.

### Caso: Falsos positivos por SBOM desactualizado

**¿Qué ocasionó el error?**
El SBOM se generaba una vez al día, no por build. Vulnerabilidades corregidas durante el día seguían apareciendo.

**¿Cómo se solucionó?**
Generar SBOM en cada push a main, almacenar con timestamp, y correlacionar contra NVD actualizado cada hora.

**¿Por qué funciona esta técnica?**
SBOM por build elimina el desfase temporal. Dependency-Track re-evalúa SBOMs anteriores contra nuevas CVEs.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "SBOM" o "Software Bill of Materials" en la consulta
- **Prioridad de carga:** Alta — crítico para supply chain security y compliance
- **Dependencias:** `15-vulnerability-scanning-dependency-check`, `05-zero-trust-architecture-sdlc`

### Tool Integration

```json
{
  "tool_name": "software-bill-of-materials-sbom",
  "description": "Generación, firma y gestión de SBOMs con Syft, Cosign, CycloneDX/SPDX, y Dependency-Track",
  "triggers": ["SBOM", "SPDX", "CycloneDX", "Syft", "Dependency-Track", "supply chain"],
  "context_hint": "Inyectar junto con 15-vulnerability-scanning para correlación de CVEs con SBOM",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre SBOMs, carga el skill software-bill-of-materials-sbom y responde
con ejemplos de generación con Syft y attestation con Cosign.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generate SBOMs
syft packages ./app -o spdx-json > sbom.spdx.json
syft packages ./app -o cyclonedx-json > bom.cdx.json
syft packages alpine:latest -o table    # quick view

# Attest SBOM
cosign attest --yes --predicate sbom.spdx.json --type spdx $IMAGE

# Compare SBOMs
sbom-utility diff --old sbom_v1.json --new sbom_v2.json

# Validate
opa eval --input sbom.spdx.json --data policy/sbom.rego "data.sbom.deny"
```

### GUI / Web

- **Dependency-Track:** Dashboard de SBOMs con correlación de CVEs, políticas, y métricas
- **Syft OSS Dashboard:** Visualización con SBOMs (CUPS)
- **Anchore Enterprise:** Políticas SBOM, gatekeeping en CI/CD

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar SBOM | `syft packages . -o spdx-json > sbom.json` | DTrack → Upload BOM |
| Firmar SBOM | `cosign attest --yes --predicate sbom.json --type spdx` | Sigstore → Attest |

---

## 7. Cheatsheet Rápido

```bash
# Quick SBOM generation for CI
syft packages . -o spdx-json > sbom.spdx.json
syft packages . -o cyclonedx-json > bom.cdx.json

# Upload to Dependency-Track
curl -X POST "https://dt.example.com/api/v1/bom" -H "X-Api-Key: $KEY" -F "bom=@bom.cdx.json"

# Diff SBOMs
sbom-utility diff --old v1.json --new v2.json

# Required fields per EO 14028
# supplier, component name, version, license, dependency relationship, hash
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `15-vulnerability-scanning-dependency-check` | Complementario — correlaciona SBOM con CVEs | Sí |
| `05-zero-trust-architecture-sdlc` | Complementario — SBOM attestation es parte de Zero Trust | Sí |
| `12-securing-cicd-pipelines` | Dependiente — CI/CD debe generar SBOM en cada build | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 06-software-bill-of-materials-sbom
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [sbom, spdx, cyclonedx, syft, cosign, dependency-track, supply-chain]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

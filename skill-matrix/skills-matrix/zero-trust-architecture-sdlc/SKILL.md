---
name: zero-trust-architecture-sdlc
description: "Zero Trust (NIST SP 800-207) asume que la red ya está comprometida y verifica cada solicitud como si originara de una red abierta"
---
# zero-trust-architecture-sdlc

## Semantic Triggers
```
zero trust principles never trust always verify, micro-segmentation and per-request authentication, least privilege CI/CD pipeline access, continuous verification throughout software lifecycle, zero trust for artifact signing and deployment, NIST SP 800-207 zero trust maturity model
```

---

## 1. Definición Teórica

Zero Trust (NIST SP 800-207) asume que la red ya está comprometida y verifica cada solicitud como si originara de una red abierta. Sus pilares son: verificación de identidad, salud del dispositivo, privilegio mínimo, micro-segmentación, y monitoreo continuo. Aplicado al SDLC implica artefactos firmados, despliegues con compuertas (gated), credenciales efímeras, y trails de auditoría inmutables. Los niveles de madurez van desde VPN tradicional hasta políticas automatizadas.

---

## 2. Implementación de Referencia

**Sigstore + Cosign para firma de artefactos** y **OIDC para CI/CD** son las implementaciones de referencia para Zero Trust en SDLC. Sigstore proporciona keyless signing mediante OIDC, eliminando la gestión de claves.

### Ejemplo Práctico Avanzado

```yaml
# GitHub Actions with OIDC Zero Trust
name: Zero Trust Build & Sign
on: [push]

permissions:
  id-token: write
  contents: read
  attestations: write

jobs:
  build-and-attest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build container
        run: docker build -t ${{ vars.REGISTRY }}/app:${{ github.sha }} .
      - name: Sign with Sigstore keyless
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: v2.4.1
      - run: |
          cosign sign --yes ${{ vars.REGISTRY }}/app:${{ github.sha }}
      - name: Generate SBOM and attest
        run: |
          syft packages . -o spdx-json > sbom.json
          cosign attest --yes --predicate sbom.json --type spdx \
            ${{ vars.REGISTRY }}/app:${{ github.sha }}
```

**Fuente oficial:** https://docs.sigstore.dev

### Alternativa de Implementación Específica

**SLSA (Supply-chain Levels for Software Artifacts)**: Framework de niveles (L1-L4) para madurez de supply chain security. Implementar SLSA L3 requiere builds herméticos (sin network), dos personas de revisión, y provenance attestation.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Organizaciones que manejan datos sensibles, entradas multi-cloud, o requieren compliance (FedRAMP, PCI) |
| **Cuándo evitar** | Proyectos personales o startups early-stage donde Zero Trust introduce overhead injustificado |
| **Alternativas** | VPN-based perimeter security (legacy), castle-and-moat (tradicional), Zero Trust en fases (NIST maturity model) |
| **Coste/Complejidad** | Alto. Requiere cambios culturales, tooling, y procesos. Retorno en reducción de radio de explosión |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: OIDC token expiry en builds largos

**¿Qué ocasionó el error?**
Builds que duran >60 minutos expiran el OIDC token de GitHub Actions, causando fallos en `cosign sign` o `aws sts assume-role-with-web-identity`.

**¿Cómo se solucionó?**
Dividir el pipeline en jobs más cortos (< 30 min) y pasar artefactos firmados entre jobs. Usar artifact attestation de GitHub para preservar integridad.

**¿Por qué funciona esta técnica?**
Jobs cortos renuevan automáticamente los tokens OIDC. Los artefactos firmados entre jobs mantienen la integridad del pipeline.

### Caso: SLSA L4 en entornos multi-tenant

**¿Qué ocasionó el error?**
Builds herméticos (sin network) rompen dependencias en entornos air-gapped que necesitan descargar paquetes.

**¿Cómo se solucionó?**
Implementar un mirror interno de paquetes (JFrog Artifactory / Sonatype Nexus) como parte del trust boundary del build.

**¿Por qué funciona esta técnica?**
El mirror es parte del entorno controlado de build, permitiendo SLSA L3+ sin depender de redes externas.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "Zero Trust" o "SLSA" en la consulta del usuario
- **Prioridad de carga:** Alta — fundamental para seguridad de supply chain
- **Dependencias:** `06-software-bill-of-materials-sbom`, `12-securing-cicd-pipelines`

### Tool Integration

```json
{
  "tool_name": "zero-trust-architecture-sdlc",
  "description": "Implementación de Zero Trust en SDLC con OIDC, Sigstore, Cosign, y SLSA levels",
  "triggers": ["Zero Trust", "SLSA", "Sigstore", "Cosign", "OIDC CI/CD", "supply chain security"],
  "context_hint": "Inyectar junto con 06-sbom y 12-securing-cicd-pipelines para cobertura completa de supply chain",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Zero Trust en SDLC, carga el skill zero-trust-architecture-sdlc y responde
con ejemplos de OIDC, Sigstore, y SLSA levels.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Install cosign
go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Keyless sign
cosign sign --yes registry.example.com/app:latest

# Verify signature
cosign verify registry.example.com/app:latest

# Check SLSA level
slsa-verifier verify-artifact --source-uri github.com/org/repo --source-tag v1.0 artifact.bin

# Generate OIDC token
curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=api://AzureADTokenExchange"
```

### GUI / Web

- **Sigstore Dashboard:** Visualización de firmas y transparencia de certificados (Rekor)
- **SLSA Dashboard:** Seguimiento de niveles SLSA por repositorio y pipeline
- **Dependency-Track:** Correlación de SBOMs con políticas Zero Trust

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Firmar imagen | `cosign sign --yes $IMAGE` | Docker Desktop → Sign |
| Verificar firma | `cosign verify $IMAGE` | Sigstore → Search |

---

## 7. Cheatsheet Rápido

```bash
# Zero Trust essentials
export COSIGN_EXPERIMENTAL=1  # keyless mode
cosign sign --yes $IMAGE     # sign with OIDC
cosign verify $IMAGE         # verify
cosign attest --yes --predicate sbom.json --type spdx $IMAGE  # attest

# SLSA levels
# L1: Documented build process
# L2: Signed + hosted build
# L3: Hermetic + reproducible + two-person review
# L4: Fully auditable + dependencies enumerated

# OIDC for CI
# Jobs get ephemeral tokens via id-token:write permission
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-software-bill-of-materials-sbom` | Complementario — SBOM es parte de SLSA attestation | Sí |
| `12-securing-cicd-pipelines` | Complementario — CI/CD pipelines son el punto de aplicación | Sí |
| `23-compliance-auditing-frameworks` | Complementario — Zero Trust es requerido por múltiples frameworks | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 05-zero-trust-architecture-sdlc
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [zero-trust, slsa, sigstore, cosign, oidc, supply-chain, nist-800-207]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

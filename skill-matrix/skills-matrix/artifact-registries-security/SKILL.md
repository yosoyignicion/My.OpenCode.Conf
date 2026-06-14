---
name: artifact-registries-security
description: "Los artifact registries almacenan y distribuyen imágenes de contenedor, Helm charts, y artefactos OCI"
---
# Artifact Registries & Security

## Semantic Triggers
```
container registry, artifact registry, docker image security, ghcr, ecr, gcr artifact registry, image signing cosign, vulnerability scanning trivy, supply chain security slsa, image attestation
```

---

## 1. Definición Teórica

Los artifact registries almacenan y distribuyen imágenes de contenedor, Helm charts, y artefactos OCI. La seguridad incluye vulnerability scanning (Trivy, Grype), image signing (Cosign keyless via OIDC), y SBOM generation (Syft) para proteger la cadena de suministro. SLSA (Supply-chain Levels for Software Artifacts) define niveles de atestación de provenance. Cosign + admission controller validan firmas antes del deploy.

---

## 2. Implementación de Referencia

GitHub Container Registry (GHCR), AWS ECR, y Harbor v3.0+ son los registros principales. Cosign v2.5+ para signing, Trivy v0.60+ para scanning, Syft v1.20+ para SBOM.

### Ejemplo Práctico Avanzado

```yaml
# GitHub Actions: Build, scan, sign, push
jobs:
  secure-build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build image
        run: docker build -t ghcr.io/myorg/api:${{ github.sha }} .

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ghcr.io/myorg/api:${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/myorg/api:${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          exit-code: 1
          severity: CRITICAL,HIGH
          ignore-unfixed: true

      - name: Sign image
        uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign \
            ghcr.io/myorg/api:${{ github.sha }} \
            --yes

      - name: Push image
        run: docker push ghcr.io/myorg/api:${{ github.sha }}

      - name: Upload attestation
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
---
# Cosign verify en admission controller
apiVersion: cosign.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: image-signature-policy
spec:
  images:
    - glob: "ghcr.io/myorg/*"
  authorities:
    - keyless:
        url: https://fulcio.sigstore.dev
        identities:
          - issuer: https://token.actions.githubusercontent.com
            subjectRegExp: "https://github.com/myorg/.*"
```

**Fuente oficial:** https://docs.sigstore.dev/cosign/overview/

### Alternativa de Implementación Específica

Harbor con vulnerability scanning integrado (Trivy) + Cosign + OIDC auth + retention policies. Ideal para entornos on-premise con compliance.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Seguridad de cadena de suministro, compliance SLSA, imágenes públicas |
| **Cuándo evitar** | Proyectos internos sin requisitos de seguridad, equipos pequeños |
| **Alternativas** | Harbor (on-prem), ECR (AWS), GAR (GCP), Quay (Red Hat), Docker Hub (público) |
| **Coste/Complejidad** | Medio. Scanning y signing en CI incrementan build time. Registry storage tiene costo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Cosign sign falla con OIDC error

**¿Qué ocasionó el error?**
El workflow de CI no tenía `permissions: id-token: write`, necesario para keyless signing.

**¿Cómo se solucionó?**
```yaml
permissions:
  id-token: write  # ← requerido para OIDC keyless signing
  contents: read
  packages: write
```

**¿Por qué funciona esta técnica?**
Cosign keyless usa OIDC para obtener un token de Fulcio. Sin `id-token: write`, GitHub no provee token OIDC.

### Caso: Trivy false positives en imágenes base

**¿Qué ocasionó el error?**
Trivy reportaba CRITICAL CVEs en la imagen base Alpine 3.18, pero el fix no existía.

**¿Cómo se solucionó?**
```yaml
ignore-unfixed: true  # solo fallar si hay fix disponible
```
Y se añadió un policy de excepción para CVEs sin fix.

**¿Por qué funciona esta técnica?**
No todas las CVEs tienen fix disponible. `ignore-unfixed` permite distinguir entre riesgos gestionables y no.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~410 tokens al invocar este skill
- **Trigger de activación:** container registry, artifact, supply chain, cosign, trivy, sbom, slsa
- **Prioridad de carga:** Alta — crítico para seguridad
- **Dependencias:** `06-cicd-declarative-pipelines`

### Tool Integration

```json
{
  "tool_name": "artifact-registries-security",
  "description": "Registros de artefactos, scanning de vulnerabilidades, signing con Cosign y SBOM generation",
  "triggers": ["registry", "artifact", "container image", "cosign", "trivy", "sbom", "supply chain"],
  "context_hint": "Activar cuando se discuta seguridad de imágenes o cadena de suministro",
  "output_format": "markdown",
  "max_tokens": 2050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre seguridad de artefactos o registros de contenedores, carga el skill
artifact-registries-security. Proporciona Cosign keyless signing, Trivy scanning en CI,
SBOM generation, y ClusterImagePolicy para admission control.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Cosign
cosign sign ghcr.io/myorg/api:1.0.0 --yes
cosign verify ghcr.io/myorg/api:1.0.0 \
  --certificate-identity-regexp "https://github.com/myorg/.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
cosign triangulate ghcr.io/myorg/api:1.0.0

# Trivy
trivy image ghcr.io/myorg/api:1.0.0 --severity CRITICAL,HIGH --exit-code 1
trivy image --format sarif -o report.sarif ghcr.io/myorg/api:1.0.0
trivy sbom sbom.spdx.json

# Syft
syft ghcr.io/myorg/api:1.0.0 -o spdx-json=sbom.json
syft packages dir:./app -o cyclonedx

# Registry auth
docker login ghcr.io -u myuser --password-stdin
crane auth login ghcr.io -u myuser -p $TOKEN
```

### GUI / Web

- **GHCR UI**: Packages tab con versiones, tags, y Dockerfile
- **Harbor UI**: Scanning results, retention policies, robot accounts, replication
- **ECR UI**: Vulnerability scanning dashboard, lifecycle policies, pull-through cache
- **Sigstore Dashboard**: Transparency log de certificados de firmas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver tags | `crane ls ghcr.io/myorg/api` | GHCR → Packages → Versions |
| Scan image | `trivy image <image>` | Harbor → Artifact → Scan |
| Sign image | `cosign sign <image>` | GHCR → Package → Signing |

---

## 7. Cheatsheet Rápido

```bash
# Cosign keyless sign + verify
cosign sign ghcr.io/myorg/api:1.0.0 --yes
cosign verify ghcr.io/myorg/api:1.0.0 \
  --certificate-identity-regexp "https://github.com/myorg/.*" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

# Trivy scan
trivy image --severity CRITICAL,HIGH --exit-code 1 ghcr.io/myorg/api:1.0.0

# Syft SBOM
syft ghcr.io/myorg/api:1.0.0 -o spdx-json=sbom.json
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-cicd-declarative-pipelines` | complementario (CI pipeline con scanning) | Sí |
| `14-immutable-infrastructure-packer` | complementario (imágenes inmutables) | No |
| `12-secret-management-vault-integration` | complementario (registry auth + secrets) | No |
| `24-policy-as-code-opa-rego` | complementario (admission policies) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: artifact-registries-security
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [artifact-registry, container-registry, cosign, trivy, sbom, supply-chain-security, slsa]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

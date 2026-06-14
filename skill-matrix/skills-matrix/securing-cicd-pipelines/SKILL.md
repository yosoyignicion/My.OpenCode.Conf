---
name: securing-cicd-pipelines
description: "Los pipelines CI/CD son objetivos de alto valor — un compromiso en el pipeline puede distribuir malware a todos los usuarios"
---
# securing-cicd-pipelines

## Semantic Triggers
```
CI/CD pipeline security hardened workflows, supply chain level SLSA attestation requirements, ephemeral credentials and OIDC-based cloud access, artifact signing with Cosign and Sigstore, pipeline integrity checking signed commits, secret scanning and prevention in CI logs
```

---

## 1. Definición Teórica

Los pipelines CI/CD son objetivos de alto valor — un compromiso en el pipeline puede distribuir malware a todos los usuarios. El framework SLSA (Supply-chain Levels for Software Artifacts) define niveles de madurez: L1 (build documentado) a L4 (totalmente auditable). Las prácticas clave son: credenciales OIDC efímeras (sin secrets estáticos), artefactos firmados (Cosign/Sigstore), entornos efímeros, builds herméticos (sin network), y revisión de dos personas para releases.

---

## 2. Implementación de Referencia

**GitHub Actions** con OIDC + **Cosign** + **SLSA Framework**. GitHub Actions provee OIDC tokens nativos para cloud auth sin secrets estáticos. Cosign firma artefactos. SLSA Generator de GitHub produce provenance attestations.

### Ejemplo Práctico Avanzado

```yaml
# SLSA L3 Pipeline with provenance attestation
name: SLSA L3 Build
on:
  push:
    branches: [main]

permissions:
  id-token: write  # OIDC for cloud auth
  contents: read
  attestations: write  # SLSA provenance

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Hermetic build: no network access
      - name: Build with network isolation
        run: |
          docker build --network=none \
            --build-arg BUILDKIT_SANDBOX_HOSTNAME=none \
            -t ${{ vars.REGISTRY }}/app:${{ github.sha }} .
        env:
          DOCKER_BUILDKIT: 1

      # Sign container image with Cosign
      - name: Sign container
        uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign --yes \
            -a "sha=${{ github.sha }}" \
            -a "ref=${{ github.ref }}" \
            -a "runner=${{ runner.name }}" \
            ${{ vars.REGISTRY }}/app:${{ github.sha }}

      # Generate SLSA provenance
      - name: Generate SLSA provenance
        uses: slsa-framework/slsa-github-generator@v2
        with:
          artifact: "sbom.spdx.json"
          provenance-name: "provenance.intoto.jsonl"

      # Deploy with gated approval
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ github.sha }}..."
          # cosign verify before deploy
          cosign verify ${{ vars.REGISTRY }}/app:${{ github.sha }}
```

**Fuente oficial:** https://slsa.dev/spec/v1.0/

### Alternativa de Implementación Específica

**GitLab CI/CD con OIDC + SLSA**: GitLab provee OIDC nativo, CI_JOB_JWT_V2 para tokens, y firma de artefactos integrada. SLSA L3 requiere builds herméticos con `needs: []` y `interruptible: false`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier pipeline que despliegue software a producción (SLSA L2 mínimo) |
| **Cuándo evitar** | Pipelines de desarrollo local sin despliegue externo |
| **Alternativas** | CircleCI OIDC + orbs, GitLab CI + SLSA, Jenkins + Sigstore plugin, Tekton Chains |
| **Coste/Complejidad** | Medio. SLSA L3 requiere builds herméticos (sin network), lo que puede romper dependencias. Requiere mirror interno de paquetes |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: OIDC token expiry durante despliegue largo

**¿Qué ocasionó el error?**
El pipeline de despliegue >60 min expiraba el OIDC token de GitHub Actions, fallando `aws sts assume-role-with-web-identity`.

**¿Cómo se solucionó?**
Dividir el pipeline en jobs independientes que renuevan tokens automáticamente. Pasar artefactos firmados entre jobs usando Actions upload/download artifact con hash verification.

**¿Por qué funciona esta técnica?**
Cada job obtiene un nuevo token OIDC. Los artefactos firmados garantizan integridad entre jobs.

### Caso: Secret filtrado en logs de CI

**¿Qué ocasionó el error?**
Un `echo $AWS_SECRET` accidental en un step de debug filtró la clave en los logs públicos de CI.

**¿Cómo se solucionó?**
GitHub Actions secret masking oculta automáticamente secrets en logs. Adicionalmente, implementar `trufflehog` scanning en pre-commit y `actions/secret-scanning` en CI.

**¿Por qué funciona esta técnica?**
El secret masking reemplaza el valor por `***` en la salida. Trufflehog detecta commits históricos con secrets.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "CI/CD security" o "pipeline security" en la consulta
- **Prioridad de carga:** Alta — pipeline seguro es requisito para supply chain security
- **Dependencias:** `05-zero-trust-architecture-sdlc`, `06-software-bill-of-materials-sbom`

### Tool Integration

```json
{
  "tool_name": "securing-cicd-pipelines",
  "description": "Seguridad de CI/CD con SLSA, OIDC, Cosign, builds herméticos, y secret scanning",
  "triggers": ["CI/CD security", "SLSA", "OIDC pipeline", "Cosign", "pipeline security", "supply chain"],
  "context_hint": "Inyectar junto con 05-zero-trust y 06-sbom para supply chain coverage completa",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre seguridad de CI/CD, carga el skill securing-cicd-pipelines y responde
con ejemplos de SLSA L3 y OIDC-based auth.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Verify artifact provenance
slsa-verifier verify-artifact \
  --source-uri github.com/org/repo \
  --source-tag v1.0.0 \
  artifact.bin

# Cosign verify before deploy
cosign verify --key k8s://cluster-name/namespace/cosign-public-key $IMAGE

# Scan for secrets in CI logs
trufflehog git --since-commit HEAD~10 --branch main https://github.com/org/repo.git

# Check for exposed credentials
git secrets --scan-history

# Generate SLSA provenance manually
wget https://github.com/slsa-framework/slsa-github-generator/releases/latest/download/slsa-signed-attestation
chmod +x slsa-signed-attestation && ./slsa-signed-attestation generate "$ARTIFACT"
```

### GUI / Web

- **GitHub Security Tab:** Dependabot, secret scanning, CodeQL, y SLSA dashboard
- **Sigstore Dashboard:** Visualización de firmas y transparency log (Rekor)
- **SLSA Dashboard (sigstore.dev):** Verificación de niveles SLSA por artefacto

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Firmar artefacto | `cosign sign --yes $IMAGE` | Sigstore → Sign |
| Verificar SLSA | `slsa-verifier verify-artifact --source-uri $URI` | SLSA Dashboard → Verify |

---

## 7. Cheatsheet Rápido

```yaml
# Pipeline security essentials
permissions:
  id-token: write    # OIDC — no static secrets
  attestations: write # SLSA provenance

# Hermetic build
docker build --network=none -t $IMAGE .

# Sign + Verify
cosign sign --yes -a "sha=$GITHUB_SHA" $IMAGE
cosign verify $IMAGE

# SLSA levels
# L1: Build documented
# L2: Signed + hosted build
# L3: Hermetic + 2-person review
# L4: Fully auditable
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `05-zero-trust-architecture-sdlc` | Dependiente — CI/CD seguro es requisito para Zero Trust en SDLC | Sí |
| `06-software-bill-of-materials-sbom` | Complementario — pipeline genera y firma SBOM | Sí |
| `31-git-workflows-conventional` | Complementario — signed commits integridad del código fuente | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 12-securing-cicd-pipelines
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [cicd-security, slsa, oidc, cosign, pipeline-hardening, supply-chain, github-actions]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

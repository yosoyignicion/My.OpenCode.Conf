---
name: package-management-helm-kustomize
description: "Helm empaqueta YAML de Kubernetes como charts versionados con templates (values, template functions, hooks)"
---
# Package Management (Helm / Kustomize)

## Semantic Triggers
```
helm package manager, kustomize overlay, helm chart structure, kustomize variant overlay, helm values inheritance, post renderer helm, helmfile, kustomize patches strategic merge
```

---

## 1. Definición Teórica

Helm empaqueta YAML de Kubernetes como charts versionados con templates (values, template functions, hooks). Kustomize proporciona personalización basada en overlays sin templates — YAML puro con patches estratégicos, generators y transformers. Helm usa `Chart.yaml` + `values.yaml` + `templates/` + `charts/` (dependencias). Kustomize usa `kustomization.yaml` con `resources` base y `patches` overlay por entorno.

---

## 2. Implementación de Referencia

Helm v3.17+ (sin Tiller). Kustomize v5.6+ (nativo en kubectl v1.30+). Helmfile v0.170+ para gestión declarativa de múltiples releases.

### Ejemplo Práctico Avanzado

```yaml
# Helm Chart structure
# chart/
# ├── Chart.yaml
# ├── values.yaml
# ├── values.prod.yaml
# ├── templates/
# │   ├── deployment.yaml
# │   ├── _helpers.tpl
# │   └── tests/
# └── charts/
---
# Chart.yaml
apiVersion: v2
name: api
version: 1.2.0
appVersion: "1.2.0"
description: API service chart
dependencies:
  - name: redis
    version: ~18.0.0
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
---
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
  labels: {{- include "api.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: {{- include "api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "api.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          env:
            {{- toYaml .Values.env | nindent 12 }}
---
# Helmfile.yaml
repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami
releases:
  - name: api-prod
    namespace: prod
    chart: ./charts/api
    values:
      - values/prod.yaml
    secrets:
      - secrets/prod.yaml
    set:
      - name: image.tag
        value: "1.2.0"
---
# Kustomize overlay
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namePrefix: prod-
namespace: prod
commonLabels:
  environment: prod
patches:
  - path: replica-patch.yaml
    target:
      kind: Deployment
      name: api
images:
  - name: ghcr.io/myorg/api
    newTag: 1.2.0
configMapGenerator:
  - name: api-config
    literals:
      - LOG_LEVEL=info
      - DB_POOL_SIZE=20
```

**Fuente oficial:** https://helm.sh/docs/

### Alternativa de Implementación Específica

Kustomize con `helm template` + post-render para equipos que necesitan Helm charts de terceros pero personalización Kustomize nativa.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Charts reusables (Helm), overlays multi-entorno (Kustomize), gestión de 3rd party (Helm) |
| **Cuándo evitar** | Overlays simples sin templating (Kustomize > Helm), config estática (solo YAML basta) |
| **Alternativas** | Helmfile (multi-helm), Kustomize (nativo kubectl), ytt (YAML templating), Carvel |
| **Coste/Complejidad** | Medio. Helm tiene learning curve en templating. Kustomize es más simple pero menos flexible |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Helm install crea recursos en namespace incorrecto

**¿Qué ocasionó el error?**
El chart no define `namespace` en los templates y el Helm install usó `--namespace default`.

**¿Cómo se solucionó?**
```yaml
# templates/_helpers.tpl
{{- define "api.namespace" -}}
{{- .Values.namespace | default .Release.Namespace -}}
{{- end -}}
```
Usar `--namespace prod` al instalar y referenciar en templates.

**¿Por qué funciona esta técnica?**
El namespace del release no se inyecta automáticamente en los templates. Debe usarse `.Release.Namespace`.

### Caso: Kustomize patch no se aplica

**¿Qué ocasionó el error?**
El target `kind: Deployment` no coincidía porque el base tenía `apiVersion: apps/v1` pero el patch no lo especificaba.

**¿Cómo se solucionó?**
```yaml
patches:
  - path: replica-patch.yaml
    target:
      kind: Deployment
      apiVersion: apps/v1  # añadir apiVersion
      name: api
```

**¿Por qué funciona esta técnica?**
Kustomize match requiere exactitud. Incluir `apiVersion` elimina ambigüedad.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~420 tokens al invocar este skill
- **Trigger de activación:** helm, kustomize, chart, overlay, helmfile, package management
- **Prioridad de carga:** Alta — esencial para gestión K8s
- **Dependencias:** `01-gitops-declarative-reconciliation`

### Tool Integration

```json
{
  "tool_name": "package-management-helm-kustomize",
  "description": "Gestión de paquetes K8s con Helm charts, Kustomize overlays y Helmfile",
  "triggers": ["helm", "kustomize", "chart", "overlay", "helmfile"],
  "context_hint": "Activar cuando se discuta empaquetado o gestión de config K8s",
  "output_format": "markdown",
  "max_tokens": 2100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Helm o Kustomize, carga el skill
package-management-helm-kustomize. Proporciona Chart.yaml structure, Kustomize overlays,
strategic merge patches, y Helmfile para múltiples releases.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Helm
helm create api
helm lint ./charts/api
helm template ./charts/api --values values/prod.yaml
helm install api-prod ./charts/api --namespace prod --values values/prod.yaml
helm upgrade api-prod ./charts/api --set image.tag=1.3.0
helm rollback api-prod 2
helm list -A
helm get values api-prod

# Helmfile
helmfile diff
helmfile apply
helmfile destroy

# Kustomize
kustomize build overlays/prod
kubectl apply -k overlays/prod
kubectl diff -k overlays/prod
```

### GUI / Web

- **Helm Dashboard**: UI para gestionar releases Helm (instalar, upgrade, rollback)
- **Monokle**: Visual YAML editor con validación de schemas K8s
- **Lens**: Helm releases tab con valores y manifiestos renderizados
- **K9s**: Helm releases list con estado y valores

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Install | `helm install <name> <chart>` | Lens → Helm → Install |
| Upgrade | `helm upgrade <name> <chart>` | Lens → Helm → Upgrade |
| Render | `helm template <chart>` | Monokle → Preview |

---

## 7. Cheatsheet Rápido

```bash
# Helm ciclo completo
helm create api
helm lint ./api
helm template api ./api --values values/prod.yaml > /tmp/manifests.yaml
helm upgrade --install api-prod ./api --namespace prod --values values/prod.yaml \
  --set image.tag=1.2.0 --wait --timeout 5m
helm rollback api-prod 1

# Kustomize
kustomize build overlays/prod | kubectl apply -f -
kubectl diff -k overlays/prod
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `01-gitops-declarative-reconciliation` | dependiente (Gitops deploya charts) | Sí |
| `04-kubernetes-operators-controllers` | complementario (Helm operator pattern) | No |
| `29-configmap-secrets-hot-reloading` | complementario (config + charts) | No |
| `28-storage-classes-pv-pvc-csi` | complementario (storage en charts) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: package-management-helm-kustomize
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [helm, kustomize, helmfile, kubernetes-packages, chart-management, overlays]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

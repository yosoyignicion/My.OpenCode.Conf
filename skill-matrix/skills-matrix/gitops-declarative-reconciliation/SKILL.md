---
name: gitops-declarative-reconciliation
description: "GitOps usa Git como fuente única de verdad para infraestructura y aplicaciones declarativas"
---
# GitOps Declarative Reconciliation

## Semantic Triggers
```
gitops declarativa, reconciliacion estado deseado, git como fuente única verdad, push vs pull deployment, drift detection automatico, argocd, flux
```

---

## 1. Definición Teórica

GitOps usa Git como fuente única de verdad para infraestructura y aplicaciones declarativas. Agentes como ArgoCD o Flux continuamente reconcilian el estado real del clúster contra el estado deseado en Git, corrigiendo automáticamente cualquier desviación. El modelo pull-based (agente dentro del clúster consulta Git) es preferido por seguridad sobre push-based. Este patrón elimina la deriva de configuración (drift) y proporciona un audit trail completo de todos los cambios.

---

## 2. Implementación de Referencia

ArgoCD v2.14+ es la implementación líder para GitOps en Kubernetes. Flux v2 es la alternativa del ecosistema CNCF. Ambos soportan sincronización automática, prunning, self-healing, y notificaciones.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/infra.git
    targetRevision: main
    path: apps/api/overlays/prod
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: api-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  info:
    - name: Description
      value: "Production API deployment managed via GitOps"
```

**Fuente oficial:** https://argo-cd.readthedocs.io/

### Alternativa de Implementación Específica

Flux v2 usa `Kustomization` y `GitRepository` CRDs en lugar del recurso `Application` de ArgoCD. Es más ligero y se integra nativamente con Kustomize y SOPS para secretos cifrados en Git.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos que ya usan Git como fuente de verdad, necesitan audit trail completo, despliegues multi-cluster |
| **Cuándo evitar** | Entornos de desarrollo efímeros, cambios de infraestructura muy frecuentes sin revisión |
| **Alternativas** | Jenkins X (CI/CD + GitOps integrado), Rancher Fleet (GitOps a escala masiva), Terraform Cloud (solo infraestructura) |
| **Coste/Complejidad** | Medio-alto. Requiere operador ArgoCD/Flux en clúster, gestión de secrets externalizada, y disciplina de PRs |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Drift detectado pero no corregido automáticamente

**¿Qué ocasionó el error?**
El `selfHeal` no estaba habilitado en la `syncPolicy`. ArgoCD detectó el drift (estado `OutOfSync`) pero no actuó.

**¿Cómo se solucionó?**
```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true  # ← se agregó esta línea
```

**¿Por qué funciona esta técnica?**
`selfHeal: true` le indica a ArgoCD que corrija automáticamente cualquier desviación sin esperar intervención manual.

### Caso: Sync falla por recursos huérfanos

**¿Qué ocasionó el error?**
Recursos creados fuera del ciclo de GitOps (kubectl apply manual) que ArgoCD intenta gestionar, causando conflictos.

**¿Cómo se solucionó?**
Se agregó `syncOptions: ["PruneLast=true"]` y `syncOptions: ["ApplyOutOfSyncOnly=true"]` para controlar el orden de sync y evitar conflictos con recursos existentes.

**¿Por qué funciona esta técnica?**
`PruneLast` elimina recursos huérfanos solo después de aplicar cambios, minimizando downtime.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~320 tokens al invocar este skill
- **Trigger de activación:** gitops, argocd, flux, reconciliación declarativa, drift detection
- **Prioridad de carga:** Alta — skill fundacional para despliegues K8s
- **Dependencias:** `20-package-management-helm-kustomize`, `10-container-orchestration-k8s-scheduling`

### Tool Integration

```json
{
  "tool_name": "gitops-declarative-reconciliation",
  "description": "Habilita configuración y debugging de GitOps con ArgoCD/Flux, reconciliación declarativa y detección de drift",
  "triggers": ["gitops", "argocd", "flux", "reconciliación", "drift"],
  "context_hint": "Inyectar cuando el usuario mencione despliegues GitOps o sincronización K8s",
  "output_format": "markdown",
  "max_tokens": 1600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre despliegues GitOps, carga el skill gitops-declarative-reconciliation
y proporciona ejemplos reales de Application CRD de ArgoCD o Kustomization de Flux. Prioriza
la estructura de repositorio, políticas de sync, y manejo de drift sobre teoría general.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
argocd app list
argocd app sync api-production --prune
argocd app get api-production
argocd app diff api-production --local ./apps/api
argocd app set api-production --sync-policy automated
argocd app wait api-production --health

flux get kustomizations --watch
flux reconcile kustomization api-production
flux build kustomization api-production
flux diff kustomization api-production --path ./apps/api
```

### GUI / Web

- **ArgoCD UI**: `https://argocd.example.com` — dashboard visual de aplicaciones, árbol de recursos, sync history, diffs en vivo
- **Flux UI**: Flux Dashboard o Weave GitOps — visualización de estado de reconciliación
- **GitHub/GitLab**: Pull requests como mecanismo de aprobación de cambios

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Sync aplicación | `argocd app sync <name>` | Botón "Sync" en app detail |
| Ver diff | `argocd app diff <name>` | Tab "Diff" en app detail |
| Forzar resync | `argocd app sync <name> --force` | Sync Options → Force |

---

## 7. Cheatsheet Rápido

```yaml
# argocd-app.yaml — estructura mínima
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: api, namespace: argocd }
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/infra.git
    targetRevision: main
    path: apps/api
  destination:
    server: https://kubernetes.default.svc
    namespace: api-prod
  syncPolicy:
    automated: { prune: true, selfHeal: true }
---
# CLI rápido
argocd app sync api-prd --prune
argocd app diff api-prd --local ./apps/api
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `20-package-management-helm-kustomize` | complementario (Kustomize usado en overlays) | Sí |
| `10-container-orchestration-k8s-scheduling` | dependiente (GitOps despliega en K8s) | Sí |
| `07-progressive-delivery-canary` | complementario (canary via Argo Rollouts) | Sí |
| `24-policy-as-code-opa-rego` | complementario (Gatekeeper + GitOps) | No |
| `12-secret-management-vault-integration` | complementario (secrets en GitOps) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: gitops-declarative-reconciliation
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [gitops, argocd, flux, kubernetes, declarative, reconciliation, drift-detection]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

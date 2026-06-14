---
name: blue-green-deployment-strategies
description: "Blue-green deploya dos entornos idénticos simultáneamente: blue = versión actual, green = nueva versión"
---
# Blue-Green Deployment Strategies

## Semantic Triggers
```
blue green deployment, zero downtime deployment, traffic switch blue green, drain old version, kubernetes blue green, service mesh traffic shift, rolling vs blue green, ab testing vs blue green
```

---

## 1. Definición Teórica

Blue-green deploya dos entornos idénticos simultáneamente: blue = versión actual, green = nueva versión. En el momento del deploy, el router/load balancer cambia todo el tráfico de blue a green. El rollback es instantáneo: solo se revierte el switch. Schema de base de datos debe ser backward-compatible (cambios aditivos solamente). Validation de health checks + smoke tests gatean el cutover.

---

## 2. Implementación de Referencia

Implementación nativa con Deployments K8s + Service selector switch, o con Argo Rollouts (blue-green strategy). Service mesh (Istio) permite weighted traffic split en lugar de cutover instantáneo.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-blue
  labels: { app: api, color: blue }
spec:
  replicas: 5
  selector:
    matchLabels: { app: api, color: blue }
  template:
    metadata:
      labels: { app: api, color: blue, version: "1.0.0" }
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/api:1.0.0
          readinessProbe:
            httpGet: { path: /ready, port: 8000 }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-green
  labels: { app: api, color: green }
spec:
  replicas: 5
  selector:
    matchLabels: { app: api, color: green }
  template:
    metadata:
      labels: { app: api, color: green, version: "1.1.0" }
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/api:1.1.0
          readinessProbe:
            httpGet: { path: /ready, port: 8000 }
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
    color: blue  # switch to "green" for cutover
  ports:
    - port: 80
      targetPort: 8000
---
# Argo Rollouts blue-green alternative
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-rollout
spec:
  replicas: 5
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: false
  template:
    metadata:
      labels: { app: api }
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/api:1.1.0
```

**Fuente oficial:** https://martinfowler.com/bliki/BlueGreenDeployment.html

### Alternativa de Implementación Específica

Service mesh (Istio VirtualService) para weighted traffic shift: 0% green → 10% → 50% → 100%. No es instantáneo pero permite monitoreo progresivo.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Servicios críticos que requieren rollback instantáneo, deploys con schema backward-compatible |
| **Cuándo evitar** | DB schema no compatible, costos prohibitivos de 2x infra, deploys frecuentes cada hora |
| **Alternativas** | Rolling update (sin 2x costo), Canary (progresivo), Ramped (lento) |
| **Coste/Complejidad** | Medio-alto. 2x infra durante el deploy. DB schema management requiere disciplina |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Green no recibe tráfico después del switch

**¿Qué ocasionó el error?**
El Service selector apuntaba a `color: green` pero los pods de green tenían label `version: "1.1.0"` sin `color: green`.

**¿Cómo se solucionó?**
```yaml
metadata:
  labels: { app: api, color: green, version: "1.1.0" }
```
Se agregó `color: green` match con el selector del Service.

**¿Por qué funciona esta técnica?**
Kubernetes Service selecciona pods exclusivamente por labels. Si no hay match, no envía tráfico.

### Caso: Green pasa health checks pero falla en producción

**¿Qué ocasionó el error?**
La base de datos tenía un schema nuevo (columna `email_verified` NOT NULL sin default) que no existía en blue. Green funcionaba en staging con DB migrada.

**¿Cómo se solucionó?**
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL;
```
Se agregó default value para compatibilidad con blue. Cambios aditivos siempre.

**¿Por qué funciona esta técnica?**
Blue-green requiere schema backward-compatible. `DEFAULT` permite que blue (sin la columna) coexista.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~370 tokens al invocar este skill
- **Trigger de activación:** blue-green, deployment strategy, zero downtime, cutover, traffic switch
- **Prioridad de carga:** Media — estrategia de deploy complementaria
- **Dependencias:** `07-progressive-delivery-canary`

### Tool Integration

```json
{
  "tool_name": "blue-green-deployment-strategies",
  "description": "Estrategias blue-green con Kubernetes Services, Argo Rollouts y service mesh",
  "triggers": ["blue-green", "zero downtime", "cutover", "deploy strategy"],
  "context_hint": "Activar cuando se discutan estrategias de deploy sin downtime",
  "output_format": "markdown",
  "max_tokens": 1850
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre blue-green deployments, carga el skill
blue-green-deployment-strategies. Enfócate en Service selector switch, schema compatibilidad,
Argo Rollouts blue-green strategy, y rollback instantáneo.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Blue-green switch
kubectl patch service api -p '{"spec":{"selector":{"color":"green"}}}'
kubectl rollout status deployment/api-green

# Argo Rollouts
kubectl argo rollouts promote api-rollout
kubectl argo rollouts abort api-rollout

# Smoke test del green
kubectl run smoke-test --image=curlimages/curl -it --rm -- \
  curl -s http://api-preview:8000/health

# Revert
kubectl patch service api -p '{"spec":{"selector":{"color":"blue"}}}'
```

### GUI / Web

- **Argo Rollouts UI**: Dashboard de blue-green con preview service, promoción manual, y rollback
- **Grafana**: Métricas de ambos stacks (blue vs green) durante deploy
- **Kiali (Istio)**: Visualización de tráfico entre stacks

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Switch a green | `kubectl patch service api -p '{"spec":{"selector":{"color":"green"}}}'` | Argo UI → Promote |
| Rollback | `kubectl patch service api -p '{"spec":{"selector":{"color":"blue"}}}'` | Argo UI → Abort |
| Test green | `curl http://api-preview:8000/health` | Kiali → Traffic Graph |

---

## 7. Cheatsheet Rápido

```bash
# Blue-green service switch
kubectl patch svc api -p '{"spec":{"selector":{"color":"green"}}}'
# Rollback
kubectl patch svc api -p '{"spec":{"selector":{"color":"blue"}}}'
# Smoke test
kubectl run test -it --rm --image=curlimages/curl -- curl http://api-preview:8000/health
# Argo Rollouts promote
kubectl argo rollouts promote api-rollout
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-progressive-delivery-canary` | alternativa (canary vs blue-green) | No |
| `01-gitops-declarative-reconciliation` | complementario (GitOps + blue-green) | Sí |
| `18-mesh-data-planes-control-planes` | complementario (service mesh traffic split) | No |
| `06-cicd-declarative-pipelines` | complementario (CI/CD + blue-green) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: blue-green-deployment-strategies
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [blue-green, deployment-strategy, zero-downtime, kubernetes, service-switch]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

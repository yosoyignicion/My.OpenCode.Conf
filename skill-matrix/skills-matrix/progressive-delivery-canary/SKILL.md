---
name: progressive-delivery-canary
description: "Progressive delivery despliega nuevas versiones gradualmente, monitorizando métricas en cada paso"
---
# Progressive Delivery & Canary Releases

## Semantic Triggers
```
canary deployment, progressive delivery, traffic splitting, feature flags, argo rollouts, flagger, automated rollback, metrics based promotion
```

---

## 1. Definición Teórica

Progressive delivery despliega nuevas versiones gradualmente, monitorizando métricas en cada paso. Argo Rollouts y Flagger implementan canary releases con integración service mesh. El tráfico se divide entre baseline (estable) y canary (nuevo), con análisis de métricas (error rate, latencia) en cada step. Si las métricas fallan, el rollback es automático.

---

## 2. Implementación de Referencia

Argo Rollouts v1.8+ es la herramienta líder. Flagger v2+ es la alternativa integrada con Istio/Linkerd. Ambos reemplazan el Deployment estándar de K8s con un recurso `Rollout` que soporta canary, blue-green, y análisis.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-rollout
spec:
  replicas: 10
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myorg/api:1.2.0
          ports:
            - containerPort: 8000
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 2m }
        - setWeight: 25
        - pause: { duration: 2m }
        - setWeight: 50
        - pause: { duration: 2m }
        - setWeight: 100
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 0
      trafficRouting:
        istio:
          virtualService:
            name: api-vsvc
            routes:
              - primary
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 30s
      count: 10
      successCondition: result >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          query: |
            1 - (sum(rate(http_requests_total{status=~"5.*",app="api"}[1m])) / sum(rate(http_requests_total{app="api"}[1m])))
```

**Fuente oficial:** https://argoproj.github.io/argo-rollouts/

### Alternativa de Implementación Específica

Flagger con Istio: usa `Canary` CRD que gestiona VirtualService y DestinationRule automáticamente. Menos config manual pero menos flexible que Argo Rollouts.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Servicios críticos que necesitan deploy gradual con rollback automático basado en métricas |
| **Cuándo evitar** | Servicios stateless simples, deploys nocturnos sin supervisión |
| **Alternativas** | Flagger (más automatizado), Istio VirtualService manual (sin análisis), Gloo Gateway (con AI) |
| **Coste/Complejidad** | Alto. Service mesh requerido, métricas Prometheus configuradas, y análisis templates |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Canary no avanza más allá del primer step

**¿Qué ocasionó el error?**
El análisis de métricas falló porque Prometheus no tenía datos (query incorrecta o labels mal matching).

**¿Cómo se solucionó?**
```yaml
provider:
  prometheus:
    address: http://prometheus:9090
    query: |
      1 - (sum(rate(http_requests_total{status=~"5.*",namespace="prod"}[1m])) / sum(rate(http_requests_total{namespace="prod"}[1m])))
```
Se corrigió el namespace en la query.

**¿Por qué funciona esta técnica?**
AnalysisTemplate necesita datos de Prometheus correctos. La query debe coincidir con los labels de los pods.

### Caso: Rollout se queda en "Paused" sin avanzar

**¿Qué ocasionó el error?**
Se definió un step `pause: {duration: 0}` sin `setWeight`, causando un pause infinito.

**¿Cómo se solucionó?**
Siempre incluir `setWeight` antes o después de un pause. Para promoción manual, usar `pause: {}` sin duration.

**¿Por qué funciona esta técnica?**
Argo Rollouts espera un peso definido en steps. Sin `setWeight`, no sabe qué proporción del tráfico asignar.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** canary, progressive delivery, rolling deploy, rollout, flagger
- **Prioridad de carga:** Alta — esencial para deploys seguros
- **Dependencias:** `18-mesh-data-planes-control-planes`, `08-monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "progressive-delivery-canary",
  "description": "Despliegues canary con Argo Rollouts/Flagger, análisis de métricas y rollback automático",
  "triggers": ["canary", "progressive delivery", "argo rollouts", "flagger", "rollback"],
  "context_hint": "Activar cuando se discuta estrategia de deploy gradual",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre canary releases o progressive delivery, carga el skill
progressive-delivery-canary. Proporciona configuración de Argo Rollouts con AnalysisTemplate,
traffic routing via Istio, y troubleshooting de métricas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Argo Rollouts
kubectl argo rollouts rollout rollouts demo
kubectl argo rollouts set image api-rollout api=myorg/api:1.3.0
kubectl argo rollouts promote api-rollout
kubectl argo rollouts abort api-rollout
kubectl argo rollouts get rollout api-rollout --watch

# Flagger
kubectl get canary --all-namespaces
kubectl describe canary api
```

### GUI / Web

- **Argo Rollouts UI**: Dashboard visual de rollouts con steps, promoción manual, y análisis en vivo
- **Grafana**: Dashboard de canary con métricas de error rate, latency, y traffic split
- **Kiali (Istio)**: Visualización de tráfico entre baseline y canary

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Promover rollout | `kubectl argo rollouts promote <name>` | Botón Promote |
| Abortar rollout | `kubectl argo rollouts abort <name>` | Botón Abort |
| Ver estado | `kubectl argo rollouts get <name> --watch` | Dashboard detail |

---

## 7. Cheatsheet Rápido

```yaml
# Canary mínimo con análisis
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 2m }
        - setWeight: 50
        - pause: { duration: 2m }
        - setWeight: 100
      analysis:
        templates:
          - templateName: success-rate
---
# CLI para deploy y promote
kubectl argo rollouts set image api api=myorg/api:2.0.0
kubectl argo rollouts promote api
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `18-mesh-data-planes-control-planes` | dependiente (traffic routing via mesh) | Sí |
| `08-monitoring-prometheus-metrics` | dependiente (métricas para análisis) | Sí |
| `16-blue-green-deployment-strategies` | alternativa (blue-green vs canary) | No |
| `01-gitops-declarative-reconciliation` | complementario (GitOps + Rollouts) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: progressive-delivery-canary
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [canary, progressive-delivery, argo-rollouts, flagger, traffic-splitting, metrics-analysis]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

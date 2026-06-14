---
name: chaos-mesh-reliability-testing
description: "Chaos Mesh inyecta fallos controlados en Kubernetes (pod kill, network partition, disk I/O latency, CPU stress) para validar resiliencia del sistema"
---
# Chaos Mesh & Reliability Testing

## Semantic Triggers
```
chaos mesh, chaos engineering kubernetes, fault injection, pod failure network partition, stress testing, latency injection, chaos experiments, gameday, blast radius
```

---

## 1. Definición Teórica

Chaos Mesh inyecta fallos controlados en Kubernetes (pod kill, network partition, disk I/O latency, CPU stress) para validar resiliencia del sistema. Los experimentos se definen como CRDs con modo (one/all/fixed %), duración, scheduler (cron), y selectores. Blast radius se controla con labels y namespaces. Workflows permiten experimentos multi-step con ejecución serial/paralela y checks condicionales.

---

## 2. Implementación de Referencia

Chaos Mesh v2.7+ es la herramienta open-source líder. LitmusChaos v3+ es la alternativa con hub de experimentos predefinidos. Ambos se integran con Prometheus para métricas de impacto.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-latency-staging
spec:
  action: delay
  mode: all
  selector:
    namespaces: [staging]
    labelSelectors:
      app: api
  delay:
    latency: "500ms"
    jitter: "100ms"
    correlation: "50"
  duration: "2m"
  scheduler:
    cron: "@every 30m"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: api-kill-test
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [staging]
    labelSelectors:
      app: api
  duration: "30s"
  scheduler:
    cron: "@every 1h"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: resilience-test
spec:
  entry: main
  templates:
    - name: main
      templateType: Serial
      children:
        - inject-latency
        - inject-pod-kill
        - verify-recovery
    - name: inject-latency
      templateType: NetworkChaos
      networkChaos:
        action: delay
        mode: all
        selector: { namespaces: [staging], labelSelectors: { app: api } }
        delay: { latency: "200ms" }
        duration: "2m"
    - name: inject-pod-kill
      templateType: PodChaos
      podChaos:
        action: pod-kill
        mode: one
        selector: { namespaces: [staging], labelSelectors: { app: api } }
        duration: "10s"
    - name: verify-recovery
      templateType: HTTPChaos
      httpChaos:
        action: abort
        mode: one
        selector: { namespaces: [staging], labelSelectors: { app: api } }
        duration: "0s"
        target: "Request"
```

**Fuente oficial:** https://chaos-mesh.org/docs/

### Alternativa de Implementación Específica

LitmusChaos para equipos que prefieren experimentos predefinidos del ChaosHub y workflows declarativos más simples. Integración nativa con GitOps.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Validación de resiliencia, testing de fallos de red, stress testing de límites |
| **Cuándo evitar** | Producción sin guardrails, equipos sin dashboards de observabilidad |
| **Alternativas** | LitmusChaos (experimentos predefinidos), Gremlin (SaaS), toxic-proxy (HTTP) |
| **Coste/Complejidad** | Medio. Requiere planning de gamedays, dashboards, y política de blast radius |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: NetworkChaos afecta monitoreo de Prometheus

**¿Qué ocasionó el error?**
El experimento de latencia incluyó pods del namespace monitoring, afectando las métricas del experimento mismo.

**¿Cómo se solucionó?**
```yaml
selector:
  namespaces: [staging]
  labelSelectors:
    app: api
  podSelector:
    matchExpressions:
      - { key: app, operator: NotIn, values: [prometheus, alertmanager] }
```
Se agregó exclusión explícita de pods de monitoreo.

**¿Por qué funciona esta técnica?**
El selector de Chaos Mesh soporta exclusiones para evitar impactar herramientas de observabilidad.

### Caso: Experimento no termina por duración incorrecta

**¿Qué ocasionó el error?**
El campo `duration: "2m"` estaba en el nivel incorrecto del YAML (dentro de `delay` en lugar de `spec`).

**¿Cómo se solucionó?**
El `duration` debe estar en `spec`, no anidado en `delay`. Chaos Mesh no aplicaba el timeout.

**¿Por qué funciona esta técnica?**
Chaos Mesh parsea `duration` solo a nivel de spec. Si está anidado, el experimento corre indefinidamente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** chaos mesh, fault injection, resilience testing, pod kill, network chaos
- **Prioridad de carga:** Baja — skill especializado de testing
- **Dependencias:** `08-monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "chaos-mesh-reliability-testing",
  "description": "Inyección de fallos controlados con Chaos Mesh, experimentos de resiliencia y workflows",
  "triggers": ["chaos", "fault injection", "resilience", "chaos mesh", "gameday"],
  "context_hint": "Activar cuando se discuta testing de resiliencia o chaos engineering",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre chaos engineering o resiliencia, carga el skill
chaos-mesh-reliability-testing. Proporciona experimentos de NetworkChaos, PodChaos,
workflows multi-step, y configuración de blast radius.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Instalar Chaos Mesh
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --create-namespace

# Experimentos
kubectl apply -f network-latency.yaml
kubectl get networkchaos -n staging
kubectl describe networkchaos api-latency-staging
kubectl delete networkchaos api-latency-staging

# Dashboard
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333

# Chaos Mesh CLI
chaosctl help
chaosctl logs <experiment-name>
```

### GUI / Web

- **Chaos Mesh Dashboard**: `http://localhost:2333` — visual create experiments, scheduling, history
- **Grafana**: Chaos Mesh dashboard con métricas de experimentos y impacto
- **LitmusChaos Portal**: ChaosHub con experimentos predefinidos, workflow builder visual

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Crear experimento | `kubectl apply -f chaos.yaml` | Dashboard → New Experiment |
| Ver estado | `kubectl get networkchaos -A` | Dashboard → Experiments |
| Dashboard | `kubectl port-forward svc/chaos-dashboard 2333:2333` | http://localhost:2333 |

---

## 7. Cheatsheet Rápido

```yaml
# Pod kill mínimo
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata: { name: kill-staging }
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [staging]
    labelSelectors: { app: api }
  duration: "30s"
  scheduler:
    cron: "@every 30m"
---
# CLI
kubectl apply -f chaos.yaml && kubectl get podchaos
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-monitoring-prometheus-metrics` | complementario (métricas de impacto) | Sí |
| `07-progressive-delivery-canary` | complementario (canary + chaos) | No |
| `30-bulkhead-circuit-breaker-resilience` | complementario (patrones resiliencia) | No |
| `35-fault-injection-chaos-engineering` | superconjunto | No |

---

## 9. Metadatos del Skill

```yaml
---
id: chaos-mesh-reliability-testing
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [chaos-mesh, chaos-engineering, fault-injection, resilience-testing, gameday]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

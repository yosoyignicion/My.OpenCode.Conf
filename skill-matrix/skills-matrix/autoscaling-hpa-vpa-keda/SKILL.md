---
name: autoscaling-hpa-vpa-keda
description: "HPA (Horizontal Pod Autoscaler) escala pods horizontalmente basado en CPU/memory/custom metrics"
---
# Autoscaling (HPA / VPA / KEDA)

## Semantic Triggers
```
horizontal pod autoscaler, vertical pod autoscaler, keda event driven autoscaling, custom metrics autoscale, prometheus metrics autoscale, kafka lag autoscale, scale to zero, predictive autoscaling
```

---

## 1. Definición Teórica

HPA (Horizontal Pod Autoscaler) escala pods horizontalmente basado en CPU/memory/custom metrics. VPA (Vertical Pod Autoscaler) ajusta verticalmente los requests de recursos. KEDA extiende HPA con 50+ event triggers (Kafka lag, queue depth, Prometheus, cron, AWS SQS). KEDA puede escalar a cero réplicas para workloads no-serving (queue consumers). Predictive autoscaling usa patrones históricos.

---

## 2. Implementación de Referencia

HPA v2 (autoscaling/v2) es nativo de K8s. KEDA v2.16+ es el estándar para event-driven autoscaling. VPA v1.3+ en modo "Off" (solo recomendaciones) para evitar recreación de pods.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "500"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-worker
spec:
  scaleTargetRef:
    name: worker
    apiVersion: apps/v1
    kind: Deployment
  minReplicaCount: 0
  maxReplicaCount: 30
  pollingInterval: 10
  cooldownPeriod: 120
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-cluster:9092
        consumerGroup: my-group
        topic: orders
        lagThreshold: "100"
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: queue_depth
        query: sum(rabbitmq_queue_messages_ready)
        threshold: "50"
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 2
          memory: 4Gi
```

**Fuente oficial:** https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

### Alternativa de Implementación Específica

Karpenter para node-level autoscaling con spot/on-demand mix, consolidación, y scheduling directo (sin esperar pending pods).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Workloads variables, event-driven, queue consumers, scale-to-zero para ahorro |
| **Cuándo evitar** | Workloads stateful (HPA complejo), servicios con cold start crítico (scale-to-zero) |
| **Alternativas** | Karpenter (node scaling), Cluster Autoscaler (node), Custom Metrics API (DIY) |
| **Coste/Complejidad** | Medio. HPA es nativo y simple. KEDA requiere operador y metric server. VPA requiere planning |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: HPA no escala basado en custom metrics

**¿Qué ocasionó el error?**
El metric server de Prometheus no estaba configurado como adapter para custom.metrics.k8s.io.

**¿Cómo se solucionó?**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --set prometheus.url=http://prometheus:9090
```

**¿Por qué funciona esta técnica?**
HPA necesita la API `custom.metrics.k8s.io` disponible. Prometheus Adapter expone métricas en ese endpoint.

### Caso: KEDA scale-to-zero no funciona

**¿Qué ocasionó el error?**
El deployment target tenía `replicas: 1` como default en el manifiesto, KEDA no podía escalar a 0.

**¿Cómo se solucionó?**
```yaml
# ScaledObject con version 0 del deployment
spec:
  minReplicaCount: 0
```
El deployment no debe tener `replicas` definido (KEDA lo gestiona).

**¿Por qué funciona esta técnica?**
KEDA crea un HPA que controla las réplicas. Si el deployment tiene `replicas` fijo, KEDA no puede reducirlo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~420 tokens al invocar este skill
- **Trigger de activación:** autoscaling, hpa, vpa, keda, scale to zero, event driven scaling
- **Prioridad de carga:** Alta — skill esencial para eficiencia en K8s
- **Dependencias:** `08-monitoring-prometheus-metrics`, `10-container-orchestration-k8s-scheduling`

### Tool Integration

```json
{
  "tool_name": "autoscaling-hpa-vpa-keda",
  "description": "Autoscaling horizontal, vertical y event-driven con HPA, VPA, KEDA y custom metrics",
  "triggers": ["autoscaling", "hpa", "vpa", "keda", "scale to zero"],
  "context_hint": "Activar cuando se discuta escalado automático o eficiencia de recursos",
  "output_format": "markdown",
  "max_tokens": 2100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre autoscaling en K8s, carga el skill
autoscaling-hpa-vpa-keda. Proporciona HPA con custom metrics, KEDA ScaledObject con triggers,
y VPA en modo recomendación. Evita teoría básica.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# HPA
kubectl get hpa -A
kubectl describe hpa api-hpa
kubectl get --raw /apis/autoscaling/v2/namespaces/default/horizontalpodautoscalers/api-hpa/status

# KEDA
kubectl get scaledobject -A
kubectl describe scaledobject queue-worker
kubectl get triggerauthentication

# VPA
kubectl get vpa api-vpa -o yaml | grep -A5 recommendation

# Simulación
kubectl run load-generator --image=busybox -- /bin/sh -c "while true; do wget -q -O- http://api:8000; done"
```

### GUI / Web

- **Kubernetes Dashboard**: HPA status con métricas actuales y target
- **KEDA ScaledObject UI**: Dashboard de estado de escalado por trigger
- **Grafana + Prometheus**: Métricas de scaling decisions, replica count history

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver HPA | `kubectl get hpa -A` | Dashboard → Workloads → HPAs |
| Escalar manual | `kubectl scale deployment api --replicas=5` | Deployment → Scale |
| Ver VPA rec | `kubectl get vpa api-vpa -o yaml | grep recommendation` | VPA → Recommendations |

---

## 7. Cheatsheet Rápido

```yaml
# HPA mínimo (CPU)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api-hpa }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
---
# KEDA Kafka trigger mínimo
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: worker }
spec:
  scaleTargetRef: { name: worker }
  minReplicaCount: 0
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka:9092
        consumerGroup: my-group
        topic: orders
        lagThreshold: "100"
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-monitoring-prometheus-metrics` | dependiente (métricas para escalado) | Sí |
| `10-container-orchestration-k8s-scheduling` | complementario (scheduling + scaling) | Sí |
| `30-cost-optimization-finops-kubernetes` | complementario (autoscaling ahorra costos) | Sí |
| `26-serverless-knative-cold-starts` | complementario (scale-to-zero + cold starts) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: autoscaling-hpa-vpa-keda
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [autoscaling, hpa, vpa, keda, event-driven-scaling, scale-to-zero]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

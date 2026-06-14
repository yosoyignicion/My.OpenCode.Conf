---
name: container-orchestration-k8s-scheduling
description: "El scheduler de Kubernetes asigna pods a nodos basado en requests de recursos, reglas de afinidad, taints/tolerations, y constraints de topología"
---
# Container Orchestration & K8s Scheduling

## Semantic Triggers
```
kubernetes scheduler, pod scheduling, node affinity, taints tolerations, topology spread constraints, resource quotas, priority classes, descheduler, pod topology
```

---

## 1. Definición Teórica

El scheduler de Kubernetes asigna pods a nodos basado en requests de recursos, reglas de afinidad, taints/tolerations, y constraints de topología. NodeAffinity (required/preferred) controla en qué nodos puede ejecutarse un pod. Taints repelen pods sin tolerations. TopologySpreadConstraints distribuyen pods entre zonas/regiones. PriorityClasses determinan preemption (pods de alta prioridad pueden desalojar los de baja). Descheduler evacúa pods para mejorar utilización.

---

## 2. Implementación de Referencia

Kubernetes scheduler nativo (kube-scheduler) con scheduler plugins. Descheduler v0.30+ para rebalanceo periódico. Kueue para job queuing y scheduling avanzado.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels: { app: api, environment: prod }
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
    spec:
      priorityClassName: high-priority
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector: { matchLabels: { app: api } }
                topologyKey: topology.kubernetes.io/zone
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node.kubernetes.io/instance-type
                    operator: In
                    values: [m5.xlarge]
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector: { matchLabels: { app: api } }
      containers:
        - name: api
          image: ghcr.io/myorg/api:1.0.0
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }
```

**Fuente oficial:** https://kubernetes.io/docs/concepts/scheduling-eviction/

### Alternativa de Implementación Específica

Volcano scheduler para workloads batch (ML/AI), con gang scheduling, cola de prioridad, y resource fairness entre equipos.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Workloads que requieren distribución multi-zona, aislamiento de recursos, QoS diferenciado |
| **Cuándo evitar** | Clusters pequeños (<10 nodos), todos los workloads en misma zona |
| **Alternativas** | Volcano (batch/ML), Kueue (quotas), Descheduler (rebalance), Node Feature Discovery (affinity automatica) |
| **Coste/Complejidad** | Medio. Afinidad mal configurada puede impedir scheduling. Topology spread incrementa complejidad |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Pods no programados por affinity conflictiva

**¿Qué ocasionó el error?**
PodAntiAffinity `requiredDuringScheduling` con `maxSkew=1` y solo 2 zonas disponibles impedía escalar a más de 2 pods.

**¿Cómo se solucionó?**
```yaml
podAntiAffinity:
  preferredDuringSchedulingIgnoredDuringExecution:  # ← changed from required to preferred
```
O se aumentó `maxSkew: 2` para permitir mayor concentración.

**¿Por qué funciona esta técnica?**
`requiredDuringScheduling` es un hard constraint que puede impedir el scheduling si no hay suficientes nodos/zonas.

### Caso: PriorityClass no afecta scheduling

**¿Qué ocasionó el error?**
`PriorityClass` estaba definida pero `globalDefault: false` y ningún pod la referenciaba.

**¿Cómo se solucionó?**
```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false  # debe referenciarse explícitamente
---
spec:
  priorityClassName: high-priority  # ← referencia en el pod
```

**¿Por qué funciona esta técnica?**
Sin `globalDefault: true`, los pods deben tener `priorityClassName` explícito. El valor determina orden de preemption.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~380 tokens al invocar este skill
- **Trigger de activación:** scheduling, node affinity, taints, tolerations, topology spread, descheduler
- **Prioridad de carga:** Alta — fundacional para operación K8s
- **Dependencias:** `03-container-internals-namespaces`, `17-autoscaling-hpa-vpa-keda`

### Tool Integration

```json
{
  "tool_name": "container-orchestration-k8s-scheduling",
  "description": "Scheduling de pods, afinidad de nodos, taints/tolerations, y constraints de topología en Kubernetes",
  "triggers": ["scheduling", "node affinity", "taints", "tolerations", "topology spread"],
  "context_hint": "Activar cuando se discuta distribución de pods o capacidad del cluster",
  "output_format": "markdown",
  "max_tokens": 1900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre scheduling de pods o distribución en clúster, carga el skill
container-orchestration-k8s-scheduling. Prioriza configuraciones de affinity, taints/tolerations,
y topology spread constraints sobre teoría de scheduler.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver scheduling
kubectl describe pod api-xxxx | grep -A5 Events
kubectl get events --field-selector reason=FailedScheduling
kubectl get pods -o wide --sort-by=.spec.nodeName

# Taints y tolerations
kubectl taint nodes node1 dedicated=prod:NoSchedule
kubectl describe node node1 | grep Taints

# Descheduler
kubectl create configmap descheduler-policy --from-file=policy.yaml
kubectl apply -f descheduler-cronjob.yaml

# Ver capacidad
kubectl describe node | grep -A5 "Allocated resources"
kubectl top nodes
```

### GUI / Web

- **Lens**: Pod inspector con scheduling info, node resource utilization, taints visibles
- **K9s**: Visor TUI con vista de scheduling constraints por pod
- **Grafana + Prometheus**: Scheduling latency dashboard, pending pods by reason

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver eventos | `kubectl get events --field-selector reason=FailedScheduling` | Lens → Events tab |
| Taint nodo | `kubectl taint nodes <node> key=value:NoSchedule` | Lens → Node → Edit Taints |
| Top pods | `kubectl top pod` | K9s → `:pod` → `t` |

---

## 7. Cheatsheet Rápido

```yaml
# Scheduling constraints comunes
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values: [us-east-1a, us-east-1b]
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: ScheduleAnyway
  tolerations:
    - key: dedicated
      operator: Exists
      effect: NoSchedule
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `17-autoscaling-hpa-vpa-keda` | complementario (escalado + scheduling) | Sí |
| `03-container-internals-namespaces` | dependiente (namespaces + scheduling) | No |
| `30-cost-optimization-finops-kubernetes` | complementario (optimización nodos) | Sí |
| `28-storage-classes-pv-pvc-csi` | complementario (storage + topology) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: container-orchestration-k8s-scheduling
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/kubernetes
tags: [kubernetes-scheduler, pod-scheduling, node-affinity, taints-tolerations, topology-spread, descheduler]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

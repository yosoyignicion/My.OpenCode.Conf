# auto-scaling-strategies

## Semantic Triggers
```
auto-scaling, autoscaling, horizontal pod autoscaler, HPA, VPA, KEDA, cluster autoscaler, scale to zero, predictive scaling, reactive scaling
```

---

## 1. Definición Teórica

Las estrategias de auto-scaling resuelven el problema de adaptar la capacidad computacional a la demanda variable sin intervención manual, optimizando coste y SLA simultáneamente. El principio fundamental combina tres dimensiones: horizontal (añadir/quitar instancias, "escalar hacia afuera"), vertical (cambiar CPU/RAM de instancias existentes, "escalar hacia arriba") y de cluster (añadir/quitar nodos físicos). Aplica en cloud-native (K8s, serverless) y cloud clásico (AWS ASG, Azure VMSS, GCP MIG). Existe como categoría diferenciada porque cada tipo de workload tiene una firma de escalado distinta: web HTTP escala horizontalmente, bases de datos relacionales escalan verticalmente, batch jobs escalan a cero entre ejecuciones. La elección incorrecta del tipo de escalado (ej: VPA en un servicio stateless HTTP) causa thrashing, OOMs, o latencia elevada.

---

## 2. Implementación de Referencia

Stack de referencia: Kubernetes 1.30+ con HPA, VPA, KEDA, Cluster Autoscaler. Compatible con AWS Karpenter (sucesor de CA). Lenguajes: YAML declarativo + Go para métricas custom.

### Ejemplo Práctico Avanzado

```yaml
# HPA con métricas custom (Prometheus) + KEDA trigger
# Caso: escalar workers de RabbitMQ según profundidad de cola
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-worker-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: rabbitmq-worker
  pollingInterval: 15  # cada cuánto evaluar (s)
  cooldownPeriod: 300  # tiempo sin tráfico antes de scale-to-zero
  idleReplicaCount: 0  # scale to zero habilitado
  minReplicaCount: 0
  maxReplicaCount: 50
  fallback:
    failureThreshold: 5
    replicas: 3  # si KEDA falla, mantener 3 réplicas
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 0
          policies:
          - type: Percent
            value: 100
            periodSeconds: 30
        scaleDown:
          stabilizationWindowSeconds: 300  # esperar 5min antes de reducir
          policies:
          - type: Percent
            value: 10
            periodSeconds: 60
  triggers:
  - type: rabbitmq
    metadata:
      protocol: amqp
      queueName: jobs.pending
      mode: QueueLength
      value: "50"  # 1 réplica por cada 50 mensajes
      activationValue: "5"  # activar si > 5 mensajes
      host: rabbitmq.rabbitmq.svc.cluster.local
      protocolHeader: amqp
---
# VPA para el API server (scaling vertical, stateful)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto"  # recrea pods con nuevos requests
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
---
# Cluster Autoscaler + Karpenter
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64", "arm64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["4"]
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: default
  limits:
    cpu: "1000"
    memory: 4000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h  # 30 días
```

**Fuente oficial:** [Kubernetes HPA Docs](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) · [KEDA ScaledObjects](https://keda.sh/docs/latest/concepts/scaling-deployments/) · [Karpenter NodePools](https://karpenter.sh/docs/concepts/nodepools/)

### Alternativa de Implementación Específica

AWS-native: Application Auto Scaling + Target Tracking Policies sobre ECS/Fargate. Más simple para equipos que no usan K8s, integrado con CloudWatch.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar HPA** | Servicios stateless HTTP/gRPC, workers queue-based, microservicios con tráfico variable |
| **Cuándo usar VPA** | Bases de datos, stateful services, JVM apps con heap tuning, servicios con perfil de recursos estable pero infra-determinado |
| **Cuándo usar Cluster Autoscaler/Karpenter** | Cuando HPA/VPA generan scheduling pressure (pods Pending por falta de nodos) |
| **Cuándo evitar** | Workloads con state local no migrable, sistemas con licences per-instance, aplicaciones con startup time > 60s |
| **Alternativas** | Capacity planning manual, Reserved Instances + buffer, Spot fleets (coste) |
| **Coste/Complejidad** | Coste medio (HPA trivial, KEDA+Karpenter ~2 semanas); ahorro típico 30-50% en cloud bill; requiere métricas confiables |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: HPA thrashing (escala arriba y abajo en bucle cada minuto)

**¿Qué ocasionó el error?**
Métricas con ruido (ej: CPU con picos esporádicos) hacen que HPA fluctúe. El `behavior.scaleDown` por defecto espera 5min de estabilización, pero si la métrica es ruidosa y fluctúa > 5min, genera churn constante.

**¿Cómo se solucionó?**
1. Configurar `behavior.scaleDown.stabilizationWindowSeconds=600` (10min)
2. Usar `metrics[].type=Pods` con `Pods(average)` o `Pods(95th percentile)` en lugar de `Utilization` (más estable)
3. Si la app tiene patrones diarios claros, migrar a **KEDA con cron trigger** que pre-escala antes del pico conocido
4. Aumentar `pollingInterval` de KEDA a 30-60s si las métricas son batch

**¿Por qué funciona esta técnica?**
El thrashing destruye instancias recién creadas (cold caches, JIT warmup) y desperdicia capacidad. La estabilización temporal + métricas suavizadas (percentiles) reflejan mejor la carga real.

### Caso: VPA y HPA en conflicto sobre el mismo Deployment

**¿Qué ocasionó el error?**
VPA cambia `resources.requests`, pero HPA usa `resources.requests` para calcular el `currentUtilization`. Si ambos están activos sobre el mismo Deployment, compiten y los resultados son incoherentes.

**¿Cómo se solucionó?**
1. HPA + VPA: NO usar en el mismo Deployment. Aplicar HPA a servicios stateless, VPA a stateful.
2. Si necesitas ambos, usar VPA en modo `Recommendation` (no `Auto`) y dejar que un humano aplique los valores.
3. Alternativa: usar KEDA con métricas de aplicación (no CPU/mem) para que VPA opere sin interferencia.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1150 tokens estimados al invocar este skill
- **Trigger de activación:** "autoscaling", "HPA", "VPA", "KEDA", "scale to zero", "elasticidad"
- **Prioridad de carga:** Alta — patrón transversal en cloud-native
- **Dependencias:** `container-orchestration-k8s-scheduling`, `monitoring-prometheus-metrics`, `background-jobs-queues`

### Tool Integration

```json
{
  "tool_name": "auto_scaling_strategies",
  "description": "Diseña estrategias de auto-scaling cloud-native: HPA, VPA, KEDA (event-driven), Cluster Autoscaler, Karpenter. Elige el tipo correcto según el perfil de carga.",
  "triggers": ["autoscaling", "HPA", "VPA", "KEDA", "scale to zero", "Karpenter", "elastic capacity"],
  "context_hint": "Activar cuando el usuario diseñe capacidad cloud, optimice costes de infraestructura, o enfrente picos de tráfico.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre auto-scaling, HPA, VPA, KEDA o Karpenter,
carga el skill auto-scaling-strategies y recomienda el tipo de scaling según
el perfil del workload (stateless → HPA, stateful → VPA, eventos → KEDA).
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver estado de HPA
kubectl get hpa -A
kubectl describe hpa <name> -n <ns>

# Métricas actuales
kubectl top pods -n <ns>
kubectl top nodes

# Probar Karpenter NodePool
kubectl get nodepools
kubectl logs -n kube-system -l app=karpenter

# Simular carga con k6 o hey
hey -n 10000 -c 50 http://api.example.com/health
```

### GUI / Web

- **Grafana**: dashboard "Kubernetes Capacity" con pods pendientes, node utilization, HPA events
- **Karpenter Dashboard**: vista de consolidation, pending pods, instance types
- **CloudWatch → Container Insights**: métricas ECS/EKS integradas
- **KEDA Visualizer**: web UI que muestra scaledObjects y triggers activos
- **Lens (IDE K8s)**: panel "Workloads" con HPA status en vivo

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Escalar manualmente | `kubectl scale deploy/foo --replicas=5` | Click derecho → Scale en Lens |
| Ver eventos HPA | `kubectl describe hpa foo` | Panel "Events" en Grafana K8s |
| Trigger scale-up test | `hey -c 1000 ...` | "Load Test" en CloudWatch Synthetics |

---

## 7. Cheatsheet Rápido

```yaml
# HPA mínimo
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: foo }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: foo }
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `container-orchestration-k8s-scheduling` | Dependiente (host K8s) | Sí |
| `monitoring-prometheus-metrics` | Dependiente (fuente de métricas) | Sí |
| `background-jobs-queues` | Complementario (trigger KEDA) | No |
| `cost-optimization-finops-kubernetes` | Superconjunto (coste + scaling) | Sí |
| `auto-healing-systems` | Complementario (recuperación) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: auto-scaling-strategies
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [autoscaling, HPA, VPA, KEDA, Karpenter, kubernetes, elasticity, scale-to-zero]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

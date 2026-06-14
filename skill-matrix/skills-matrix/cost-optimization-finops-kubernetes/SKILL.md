---
name: cost-optimization-finops-kubernetes
description: "FinOps aplica responsabilidad financiera a Kubernetes"
---
# Cost Optimization & FinOps for Kubernetes

## Semantic Triggers
```
finops kubernetes, cost optimization k8s, kubecost, request right sizing, spot instance kubernetes, node pool optimization, waste reduction, cluster autoscaler, cost allocation team namespace
```

---

## 1. Definición Teórica

FinOps aplica responsabilidad financiera a Kubernetes. Kubecost monitorea costos en tiempo real por namespace/team/label. Right-sizing ajusta requests CPU/memoria basado en uso real (recomendaciones VPA). Spot/Preemptible instances ofrecen 60-90% descuento para workloads batch/stateless. Cluster Autoscaler y Karpenter optimizan nodos según demanda. Cost allocation con tags (team, project, environment) permite chargeback a equipos.

---

## 2. Implementación de Referencia

Kubecost v2.6+ open-source. Karpenter v1.2+ para node provisioning optimizado por costo. VPA en modo "Off" para recomendaciones.

### Ejemplo Práctico Avanzado

```yaml
# Karpenter NodePool con spot/on-demand mix
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: spot-mix
spec:
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values:
            - spot
            - on-demand
        - key: kubernetes.io/arch
          operator: In
          values: [amd64]
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: [2xlarge, 4xlarge]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["5"]
      nodeClassRef:
        name: default
---
# VPA recomendaciones (modo Off)
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
---
# Kubecost namespace budget
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-budgets
  namespace: kubecost
data:
  budgets.csv: |
    namespace,monthly_budget,owner
    prod,5000,platform-team
    staging,1000,dev-team
    dev,200,dev-team
---
# Pod resources recomendados por Kubecost
# kubectl get recommendations -n prod
# NAME        CPU_REQ    MEM_REQ    CPU_LIM    MEM_LIM
# api         250m       512Mi      500m       1Gi
```

**Fuente oficial:** https://www.kubecost.com/docs/

### Alternativa de Implementación Específica

Kubecost + Karpenter para nodos spot con consolidación. Karpenter reemplaza Cluster Autoscaler con scheduling directo basado en API de AWS EC2.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos multi-team, clusters grandes, costos >$10k/mes, compliance financiero |
| **Cuándo evitar** | Clusters pequeños dev, costos fijos <$1k/mes, sin necesidad de chargeback |
| **Alternativas** | Kubecost (open-source), Karpenter (node), Spot.io (SaaS), CloudHealth (enterprise) |
| **Coste/Complejidad** | Medio. Kubecost requiere deploy y configuración de precios cloud. Spot tiene interruption handling |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Spot instance terminada sin aviso

**¿Qué ocasionó el error?**
AWS terminó instancia spot para reasignar capacidad. Karpenter no reemplazó automáticamente.

**¿Cómo se solucionó?**
```yaml
spec:
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h
```
Karpenter maneja interruption handling nativamente si está configurado con `aws.interruptionQueueName`.

**¿Por qué funciona esta técnica?**
Karpenter escucha eventos de interruption de AWS (Spot ITN, health events) y reemplaza nodos proactivamente.

### Caso: VPA recommendations no se aplican

**¿Qué ocasionó el error?**
VPA en modo "Off" solo muestra recomendaciones. Nadie las aplicó manualmente.

**¿Cómo se solucionó?**
```bash
# Aplicar recomendaciones manualmente
kubectl get vpa api-vpa -o yaml | grep -A10 recommendation
kubectl patch deployment api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"requests":{"cpu":"250m","memory":"512Mi"}}}]}}}}'
```
O cambiar VPA a modo "Auto" para aplicar automáticamente (con recreación de pods).

**¿Por qué funciona esta técnica?**
VPA "Off" solo recomienda. "Auto" aplica pero recrea pods, causando downtime breve.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~410 tokens al invocar este skill
- **Trigger de activación:** finops, kubecost, cost optimization, spot, right-sizing, karpenter
- **Prioridad de carga:** Media — skill de optimización
- **Dependencias:** `17-autoscaling-hpa-vpa-keda`

### Tool Integration

```json
{
  "tool_name": "cost-optimization-finops-kubernetes",
  "description": "Optimización de costos K8s, Kubecost, right-sizing, spot instances, Karpenter",
  "triggers": ["finops", "cost", "kubecost", "spot", "right-sizing", "karpenter"],
  "context_hint": "Activar cuando se discuta optimización de costos o eficiencia",
  "output_format": "markdown",
  "max_tokens": 2050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre costos o FinOps en K8s, carga el skill
cost-optimization-finops-kubernetes. Proporciona Karpenter NodePool con spot mix,
VPA en modo recomendación, y configuración de Kubecost para chargeback.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Kubecost
kubectl port-forward svc/kubecost-cost-analyzer -n kubecost 9090:9090
curl http://localhost:9090/model/savings

# VPA
kubectl get vpa api-vpa -o yaml | grep -A15 recommendation
kubectl describe vpa api-vpa

# Karpenter
kubectl get nodepool
kubectl get nodeclaim
kubectl describe nodeclaim <name>

# Costo por namespace
kubectl cost --namespace prod --window d7

# Spot interruption
kubectl get events --field-selector reason=SpotInterruption
```

### GUI / Web

- **Kubecost UI**: Dashboard de costos por namespace/team/label, savings recommendations, budget alerts
- **Karpenter UI**: Node utilization, cost per node, consolidation recommendations
- **AWS Cost Explorer**: Costo por instancia EC2, spot vs on-demand, savings plans
- **Grafana FinOps Dashboard**: Métricas de costos históricos, eficiencia, waste

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver savings | `curl localhost:9090/model/savings` | Kubecost → Savings |
| Namespace cost | `kubectl cost --namespace prod` | Kubecost → Allocations |
| Node cost | `kubectl cost --node` | Kubecost → Assets |

---

## 7. Cheatsheet Rápido

```bash
# Kubecost savings
kubectl port-forward svc/kubecost-cost-analyzer -n kubecost 9090:9090
curl http://localhost:9090/model/savings | jq

# VPA recomendaciones
kubectl get vpa api-vpa -o yaml | grep -A5 -B5 recommendation

# Karpenter nodepool
kubectl get nodepool
kubectl get nodeclaim

# Cost by namespace
kubectl cost --window 7d
# Output: NAMESPACE  MONTHLY_COST  CPU  MEMORY  ...
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `17-autoscaling-hpa-vpa-keda` | complementario (VPA + right-sizing) | Sí |
| `10-container-orchestration-k8s-scheduling` | complementario (scheduling + spot) | No |
| `05-infrastructure-as-code-terraform` | complementario (Terraform + spot) | Sí |
| `26-serverless-knative-cold-starts` | complementario (scale-to-zero ahorra) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: cost-optimization-finops-kubernetes
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [finops, kubecost, cost-optimization, spot-instances, right-sizing, karpenter]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

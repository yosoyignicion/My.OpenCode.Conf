---
name: serverless-knative-cold-starts
description: "Knative sobre Kubernetes provee workloads serverless con auto-escalado a cero"
---
# Serverless (Knative) & Cold Starts

## Semantic Triggers
```
knative serving, serverless kubernetes, cold start latency, scale to zero knative, revision autoscaling knative, knative eventing, knative vs openfaas, warm start keep alive, concurrency based scaling
```

---

## 1. Definición Teórica

Knative sobre Kubernetes provee workloads serverless con auto-escalado a cero. Revisions permiten traffic splitting entre versiones. Cold starts ocurren cuando una revisión escala desde cero — la latencia inicial aumenta mientras el pod inicia. El Activator bufferiza requests durante cold start y luego proxy al pod nuevo. Knative Eventing proporciona arquitectura event-driven con brokers, triggers, y sources.

---

## 2. Implementación de Referencia

Knative Serving v1.16+ con Kourier o Istio como networking layer. Knative Eventing v1.16+ para event-driven.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "50"
        autoscaling.knative.dev/min-scale: "1"
        autoscaling.knative.dev/max-scale: "10"
        autoscaling.knative.dev/window: "30s"
        autoscaling.knative.dev/scale-down-delay: "5m"
    spec:
      containerConcurrency: 50
      timeoutSeconds: 300
      containers:
        - image: ghcr.io/myorg/api:1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: 200m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          env:
            - name: COLD_START_WARMUP
              value: "true"
          startupProbe:
            tcpSocket:
              port: 8000
            initialDelaySeconds: 0
            periodSeconds: 1
            failureThreshold: 30
          readinessProbe:
            httpGet:
              path: /health
            periodSeconds: 5
---
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api-multi
spec:
  traffic:
    - tag: current
      revisionName: api-00001
      percent: 90
    - tag: candidate
      revisionName: api-00002
      percent: 10
    - tag: latest
      latestRevision: true
      percent: 0
---
# Knative Eventing (Kafka source)
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: orders-source
spec:
  consumerGroup: knative-group
  bootstrapServers:
    - kafka-cluster:9092
  topics:
    - orders
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: default
```

**Fuente oficial:** https://knative.dev/docs/

### Alternativa de Implementación Específica

OpenFaaS para funciones serverless con Docker Compose nativo. Menos integrado con K8s pero más simple para equipos pequeños.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs con tráfico variable, event-driven, scale-to-zero para ahorrar recursos |
| **Cuándo evitar** | APIs con requisitos de latencia <100ms constantes, workloads stateful |
| **Alternativas** | OpenFaaS (simple), Nuclio (high-performance), OpenWhisk (Apache), Vercel Edge Functions (SaaS) |
| **Coste/Complejidad** | Medio-Alto. Cold start mitigation requiere tuning. Knative Eventing añde complejidad operativa |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Cold starts >2s en producción

**¿Qué ocasionó el error?**
La imagen del contenedor era grande (1.2GB), causando pull lento en cold start.

**¿Cómo se solucionó?**
```dockerfile
FROM alpine:3.19
COPY --from=build /app /app
RUN rm -rf /var/cache/apk/*
```
Se redujo la imagen a 120MB usando multi-stage build y Alpine.

**¿Por qué funciona esta técnica?**
Imágenes más pequeñas se descargan más rápido. Cold start = image pull + container start + readiness.

### Caso: Knative Service no escala a cero

**¿Qué ocasionó el error?**
`min-scale: 1` estaba configurado, forzando al menos 1 réplica siempre.

**¿Cómo se solucionó?**
```yaml
annotations:
  autoscaling.knative.dev/min-scale: "0"
```

**¿Por qué funciona esta técnica?**
`min-scale: 0` permite escala a cero. Es el default, pero si se define explícitamente a 1, no escala a cero.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** knative, serverless, cold start, scale to zero, knative eventing
- **Prioridad de carga:** Media — skill de serverless
- **Dependencias:** `17-autoscaling-hpa-vpa-keda`

### Tool Integration

```json
{
  "tool_name": "serverless-knative-cold-starts",
  "description": "Serverless con Knative, cold start mitigation, scale-to-zero, revisions y eventing",
  "triggers": ["knative", "serverless", "cold start", "scale to zero", "function"],
  "context_hint": "Activar cuando se discuta serverless en K8s o cold starts",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre serverless o Knative, carga el skill
serverless-knative-cold-starts. Proporciona config de Knative Service con autoscaling,
cold start mitigation (min-scale, image size), y traffic splitting entre revisions.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Knative
kn service create api --image ghcr.io/myorg/api:1.0.0 --port 8000
kn service list
kn service describe api
kn revision list
kn revision list --service api
kn service update api --env KEY=VALUE --min-scale 1
kn service apply -f service.yaml

# Traffic
kn service update api --traffic @latest=100
kn service update api --traffic current=90,candidate=10

# Eventing
kn broker list
kn trigger list
kn source list

# Ver métricas de cold start
kubectl logs -l app=api --tail=20 | grep "startup"
```

### GUI / Web

- **Knative UI**: Dashboard de Services, Revisions, Routes, y configuración de tráfico
- **Grafana Knative Dashboard**: Métricas de cold start count, request latency, activator metrics
- **Kail (kubectl plugin)**: Logs en vivo de servicios Knative

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Crear service | `kn service create api --image=...` | Knative UI → Create Service |
| Traffic split | `kn service update api --traffic @latest=10` | Knative UI → Traffic tab |
| Ver revisions | `kn revision list -s api` | Knative UI → Revisions |

---

## 7. Cheatsheet Rápido

```yaml
# Knative Service mínimo
apiVersion: serving.knative.dev/v1
kind: Service
metadata: { name: api }
spec:
  template:
    spec:
      containers:
        - image: ghcr.io/myorg/api:1.0.0
          ports:
            - containerPort: 8000
# CLI
kn service create api --image=ghcr.io/myorg/api:1.0.0 --port 8000
kn service list
kn service update api --traffic @latest=100 --min-scale 0
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `17-autoscaling-hpa-vpa-keda` | complementario (autoscaling + serverless) | Sí |
| `10-container-orchestration-k8s-scheduling` | complementario (scheduling + serverless) | No |
| `06-cicd-declarative-pipelines` | complementario (CI/CD + serverless deploy) | Sí |
| `30-cost-optimization-finops-kubernetes` | complementario (scale-to-zero ahorra costos) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: serverless-knative-cold-starts
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [knative, serverless, cold-start, scale-to-zero, autoscaling, eventing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: monitoring-prometheus-metrics
description: "Prometheus recolecta métricas via scraping pull-based"
---
# Monitoring & Prometheus Metrics

## Semantic Triggers
```
prometheus metrics, monitoreo kubernetes, promql queries, grafana dashboards, service monitor pod monitor, alertmanager, recording rules, prometheus operator
```

---

## 1. Definición Teórica

Prometheus recolecta métricas via scraping pull-based. El Prometheus Operator gestiona targets de scrape via ServiceMonitor y PodMonitor CRDs. AlertManager maneja enrutamiento, agrupación y silenciamiento de alertas. PromQL es el lenguaje de consultas para agregación de métricas con rate, histogram_quantile, y topk. Recording rules precomputan queries costosas para dashboards.

---

## 2. Implementación de Referencia

kube-prometheus-stack (Helm chart) despliega Prometheus Operator, Prometheus, AlertManager, y Grafana. Prometheus v3+ (2025) soporta almacenamiento nativo OTLP y mejor rendimiento en alta cardinalidad.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-monitor
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
      metricRelabelings:
        - sourceLabels: [__name__]
          regex: 'go_.*'
          action: drop
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-alerts
  labels:
    release: prometheus
spec:
  groups:
    - name: api
      rules:
        - alert: APIHighErrorRate
          expr: rate(http_requests_total{status=~"5.*",namespace="prod"}[5m]) / rate(http_requests_total{namespace="prod"}[5m]) > 0.05
          for: 5m
          labels:
            severity: critical
            team: backend
          annotations:
            summary: "API error rate > 5% for 5m"
            description: "Error rate is {{ $value | humanizePercentage }} in namespace prod"
        - record: namespace:http_requests:rate5m
          expr: sum(rate(http_requests_total[5m])) by (namespace)
```

**Fuente oficial:** https://prometheus.io/docs/

### Alternativa de Implementación Específica

Grafana Mimir para almacenamiento long-term (reemplaza Thanos). Ofrece compresión, deduplicación multi-cluster, y query parallelization nativa.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Monitorización de infraestructura K8s, métricas de aplicación, alertas basadas en umbrales |
| **Cuándo evitar** | Tracing distribuido (OTel mejor), logs (Loki/ES mejor), sistemas que necesitan retención >1 año |
| **Alternativas** | Grafana Mimir (long-term), VictoriaMetrics (más eficiente), Datadog (SaaS, vendor lock-in) |
| **Coste/Complejidad** | Medio. Prometheus es intensivo en disco. La cardinalidad alta puede colapsar el servidor |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Prometheus OOM por alta cardinalidad

**¿Qué ocasionó el error?**
Un label con alta cardinalidad (ej: `user_id`, `request_id`) en la aplicación causó que Prometheus almacenara millones de series temporales.

**¿Cómo se solucionó?**
```yaml
metricRelabelings:
  - sourceLabels: [__name__]
    regex: 'http_request_duration.*'
    action: keep
  - sourceLabels: [user_id]
    action: labeldrop
```
Se eliminaron labels de alta cardinalidad y se filtraron métricas no relevantes.

**¿Por qué funciona esta técnica?**
Cada combinación única de labels crea una nueva serie temporal. Labels como `user_id` multiplican el cardinalidad exponencialmente.

### Caso: Alertas silenciosas que no se disparan

**¿Qué ocasionó el error?**
El tiempo `for:` (5m) era muy largo, y los picos de error de 2 minutos no alcanzaban el umbral.

**¿Cómo se solucionó?**
```yaml
for: 1m  # reducir tiempo de evaluación
```
Y se agregó una alerta separada con `for: 0` para picos instantáneos.

**¿Por qué funciona esta técnica?**
`for:` define cuánto tiempo debe persistir la condición antes de disparar. Reduce falsos positivos pero puede retrasar alertas reales.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~380 tokens al invocar este skill
- **Trigger de activación:** prometheus, metrics, promql, alertmanager, servicemonitor, grafana
- **Prioridad de carga:** Alta — skill central de observabilidad
- **Dependencias:** `09-log-aggregation-loki-elasticsearch`, `02-opentelemetry-distributed-tracing`

### Tool Integration

```json
{
  "tool_name": "monitoring-prometheus-metrics",
  "description": "Configuración de monitoreo con Prometheus, PromQL, AlertManager, y ServiceMonitor",
  "triggers": ["prometheus", "metrics", "monitoring", "alertmanager", "promql", "grafana"],
  "context_hint": "Inyectar cuando el usuario pregunte sobre métricas o alertas",
  "output_format": "markdown",
  "max_tokens": 1900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre monitoreo o métricas, carga el skill
monitoring-prometheus-metrics. Enfócate en ServiceMonitor/PodMonitor, PromQL queries
para dashboards, y configuración de AlertManager con routing y inhibition.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Prometheus UI
kubectl port-forward svc/prometheus-k8s 9090

# PromQL via CLI (promtool)
promtool query instant 'rate(http_requests_total[5m])'
promtool query range 'rate(http_requests_total[5m])' --start=-1h --end=now

# AlertManager
amtool alert list --alertmanager.url=http://localhost:9093
amtool silence add --comment="maintenance" --duration=2h alertname=HighErrorRate

# Ver targets de scrape
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'

# Config validation
promtool check rules rules/*.yaml
promtool check config prometheus.yaml
```

### GUI / Web

- **Prometheus UI**: `/graph` para query PromQL, `/targets` para estado de scrape, `/alerts` para alertas activas
- **Grafana**: Dashboards pre-construidos (Kubernetes, Node Exporter, API metrics), alerting UI
- **AlertManager UI**: Silenciamiento, grouping, routing tree visual

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Query instant | `promtool query instant <expr>` | Prometheus UI → Execute |
| Ver targets | `curl localhost:9090/api/v1/targets` | Prometheus UI → Targets |
| Silenciar alerta | `amtool silence add` | AlertManager → New Silence |

---

## 7. Cheatsheet Rápido

```yaml
# ServiceMonitor mínimo y alerta
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata: { name: app, labels: { release: prometheus } }
spec:
  selector: { matchLabels: { app: app } }
  endpoints: [{ port: metrics, interval: 15s }]
---
# PromQL común
rate(http_requests_total[5m])                              # QPS
histogram_quantile(0.99, rate(..._duration_seconds_bucket[5m]))  # P99
1 - (sum(rate(....{status=~"5.."}[5m])) / sum(rate(...[5m])))   # success rate
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `09-log-aggregation-loki-elasticsearch` | complementario (métricas + logs) | Sí |
| `02-opentelemetry-distributed-tracing` | complementario (métricas + trazas) | Sí |
| `23-slas-slis-slos-error-budgets` | dependiente (SLIs basados en métricas) | No |
| `07-progressive-delivery-canary` | dependiente (métricas para canary) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: monitoring-prometheus-metrics
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [prometheus, monitoring, promql, alertmanager, grafana, metrics, observability]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

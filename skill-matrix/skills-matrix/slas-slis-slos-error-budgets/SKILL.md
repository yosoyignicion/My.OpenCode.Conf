---
name: slas-slis-slos-error-budgets
description: "SLIs (Service Level Indicators) miden la salud del sistema — latencia, error rate, throughput, disponibilidad"
---
# SLAs / SLIs / SLOs & Error Budgets

## Semantic Triggers
```
sli slo sla, error budget, service level indicator, service level objective, availability slo, latency slo, sli metrics prometheus, burn rate alerting, error budget policy
```

---

## 1. Definición Teórica

SLIs (Service Level Indicators) miden la salud del sistema — latencia, error rate, throughput, disponibilidad. SLOs (Service Level Objectives) definen targets para SLIs (ej: "99.9% de requests < 200ms en 30 días"). Error budgets (1 - SLO) definen cuánta falta de confiabilidad es aceptable. Burn rate alerts detectan consumo rápido del error budget usando ventanas múltiples (1h + 6h).

---

## 2. Implementación de Referencia

Prometheus recording rules para SLIs, AlertManager para burn rate alerts. Google SRE Workbook como marco de trabajo.

### Ejemplo Práctico Avanzado

```yaml
groups:
  - name: slo-rules
    rules:
      # SLI: request latency p99 < 200ms
      - record: job:slo_latency_p99:rate1m
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket{job="api"}[1m])) by (le)
          )

      # SLI: success rate (requests with status < 500)
      - record: job:slo_success:ratio_rate1m
        expr: |
          sum(rate(http_requests_total{status!~"5..",job="api"}[1m]))
          /
          sum(rate(http_requests_total{job="api"}[1m]))

      # SLO: proportion of requests < 200ms over 30d
      - record: job:slo_latency_ok:ratio_rate30d
        expr: |
          sum(rate(http_request_duration_seconds_bucket{le="0.2",job="api"}[30d]))
          /
          sum(rate(http_request_duration_seconds_count{job="api"}[30d]))

      # Error budget remaining
      - record: job:error_budget_remaining
        expr: |
          1 - (1 - job:slo_latency_ok:ratio_rate30d) / (1 - 0.999)

      # Burn rate alerts
      - alert: BurnRateHigh
        expr: |
          (1 - job:slo_success:ratio_rate1m) > 0.002
          and
          (1 - job:slo_success:ratio_rate6m) > 0.001
        for: 5m
        labels:
          severity: critical
          slo: api-latency
        annotations:
          summary: "Error budget burning fast"
          description: "Burn rate {{ $value | humanizePercentage }} in last 1h"

  - name: policies
    rules:
      # Multi-window burn rate (1h + 6h)
      - alert: BurnRatePage
        expr: |
          (
            (1 - job:slo_success:ratio_rate1m) > 36 * (1 - 0.999)
          )
          or
          (
            (1 - job:slo_success:ratio_rate6m) > 6 * (1 - 0.999)
          )
        labels:
          severity: critical
        annotations:
          summary: "SLO burn rate page"
```

**Fuente oficial:** https://sre.google/workbook/alerting-on-slos/

### Alternativa de Implementación Específica

Google Cloud Monitoring SLO dashboard + Alert Policies para equipos en GCP. PyTorch + SLO predictor para forecasting de error budget.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos con SRE maturity, servicios críticos con SLA contractual |
| **Cuándo evitar** | Equipos pequeños sin capacidad de operar SLOs, servicios internos sin SLA |
| **Alternativas** | Google SRE Workbook (metodología), Nobl9 (SaaS SLO platform), SLICost (costo SLO) |
| **Coste/Complejidad** | Alto. Requiere instrumentación precisa, recording rules, y política de error budget |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Error budget falso negativo por latencia

**¿Qué ocasionó el error?**
El SLO de latencia usaba P50 en lugar de P99, dando falsa sensación de cumplimiento.

**¿Cómo se solucionó?**
```yaml
- record: job:slo_latency_p99:ratio_rate30d
  expr: histogram_quantile(0.99, ...) < 0.2
```

**¿Por qué funciona esta técnica?**
P50 esconde el tail latency. P99 captura el percentil real de experiencia de usuario.

### Caso: Burn rate alert nunca se dispara

**¿Qué ocasionó el error?**
Las ventanas de burn rate (1h multi-window) eran demasiado tolerantes, permitiendo consumo lento.

**¿Cómo se solucionó?**
```yaml
# Multi-window: short (1h) + long (6h)
expr: |
  (
    (1 - success_rate_1h) > 36 * (1 - 0.999)
  )
  or
  (
    (1 - success_rate_6h) > 6 * (1 - 0.999)
  )
```
Las constantes 36 y 6 representan multiplicadores para detectar consumo en 1h y 6h.

**¿Por qué funciona esta técnica?**
Multi-window captura tanto burns rápidos (1h) como lentos (6h). Sin ambas, un burn lento pasa desapercibido.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~420 tokens al invocar este skill
- **Trigger de activación:** slo, sli, sla, error budget, burn rate, service level, sre
- **Prioridad de carga:** Media — skill de SRE y operaciones
- **Dependencias:** `08-monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "slas-slis-slos-error-budgets",
  "description": "Definición de SLIs/SLOs, error budgets, burn rate alerting y políticas de fiabilidad",
  "triggers": ["slo", "sli", "sla", "error budget", "burn rate", "reliability"],
  "context_hint": "Activar cuando se discuta fiabilidad de servicios o SRE",
  "output_format": "markdown",
  "max_tokens": 2100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre SLOs o error budgets, carga el skill
slas-slis-slos-error-budgets. Proporciona recording rules Prometheus para SLIs,
burn rate alerting multi-window, y políticas de error budget.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# PromQL queries
promtool query instant 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))'
promtool query range 'job:slo_success:ratio_rate1m' --start=-7d
promtool query instant 'job:error_budget_remaining'

# Ver error budget
curl 'http://prometheus:9090/api/v1/query?query=job:error_budget_remaining'

# Grafana annotations para deploys
curl -X POST http://grafana:3000/api/annotations \
  -H "Content-Type: application/json" \
  -d '{"tags":["deploy"],"text":"v1.2.0 deploy"}'
```

### GUI / Web

- **Grafana SLO Dashboard**: SLI/SLO status, error budget remaining, burn rate alerts
- **Google Cloud Monitoring SLO**: SLO dashboard nativo para servicios GCP
- **Nobl9**: SaaS SLO platform con multi-backend (Prometheus, Datadog, CloudWatch)
- **Prometheus ALERTS UI**: Alertas activas de burn rate

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver SLO status | `curl 'http://prometheus:9090/api/v1/query?query=job:error_budget_remaining'` | Grafana → SLO Dashboard |
| Ver burn rate | `promtool query instant '...'` | Prometheus → ALERTS |
| Anotar deploy | `curl -X POST grafana:3000/api/annotations` | Grafana → Annotations |

---

## 7. Cheatsheet Rápido

```promql
# SLI success rate
sum(rate(http_requests_total{status!~"5.."}[1m])) / sum(rate(http_requests_total[1m]))

# SLO latency OK over 30d
sum(rate(http_request_duration_seconds_bucket{le="0.2"}[30d])) / sum(rate(http_request_duration_seconds_count[30d]))

# Error budget remaining
1 - (1 - slo_ok) / (1 - target)

# Burn rate alert
(1 - success_1h) > 36 * (1 - 0.999)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-monitoring-prometheus-metrics` | dependiente (métricas para SLIs) | Sí |
| `02-opentelemetry-distributed-tracing` | complementario (trazas para SLIs) | No |
| `07-progressive-delivery-canary` | complementario (canary + error budget) | No |
| `30-cost-optimization-finops-kubernetes` | complementario (error budget + cost) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: slas-slis-slos-error-budgets
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [slo, sli, sla, error-budget, burn-rate, sre, reliability, alerting]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: log-aggregation-loki-elasticsearch
description: "Loki (Grafana) usa indexación basada en labels (barata, rápida, nativa Grafana) mientras Elasticsearch ofrece búsqueda full-text con índices invertidos"
---
# Log Aggregation (Loki / Elasticsearch)

## Semantic Triggers
```
log aggregation, grafana loki, elasticsearch, elk stack, structured logging, label based indexing, logql, fluentbit, promtail sidecar
```

---

## 1. Definición Teórica

Loki (Grafana) usa indexación basada en labels (barata, rápida, nativa Grafana) mientras Elasticsearch ofrece búsqueda full-text con índices invertidos. Loki indexa solo labels (pod, namespace, app) y almacena el contenido como chunks comprimados. Elasticsearch indexa todo el contenido del log. Promtail (daemonset) lee logs de pods K8s, agrega labels y envía a Loki. Fluentbit es el procesador ligero universal.

---

## 2. Implementación de Referencia

Grafana Loki v3.2+ y Elasticsearch v8.15+ son las implementaciones estándar. Promtail v3.2+ para shipping K8s, Fluentbit v3+ para edge/VMs. Vector.dev como alternativa unificada.

### Ejemplo Práctico Avanzado

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - cri: {}
      - json:
          expressions:
            level: level
            trace_id: trace_id
            msg: msg
            duration_ms: duration_ms
      - labels:
          level: ""
      - drop:
          expression: ".*health.*"
      - replace:
          expression: "(.*)"
          replace: '{"app":"api","pod":"{{ .Pod }}","msg":"${1}"}'
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
        action: replace
        target_label: instance
---
# Grafana Loki Helm values
loki:
  commonConfig:
    replication_factor: 3
  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
  schemaConfig:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h
```

**Fuente oficial:** https://grafana.com/docs/loki/

### Alternativa de Implementación Específica

Elasticsearch + Kibana (ELK) para equipos que necesitan búsqueda full-text compleja, aggregations avanzadas, y machine learning nativo. Más recursos pero más capacidades analíticas.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | K8s nativo con Grafana (Loki), búsqueda full-text compleja (ES) |
| **Cuándo evitar** | Logs de baja cardinalidad sin necesidad de búsqueda (<10GB/día) |
| **Alternativas** | SigNoz (open-source unificado), Datadog Logs (SaaS), Vector.dev + ClickHouse (DIY) |
| **Coste/Complejidad** | Medio-alto. Loki es más barato (chunks comprimidos), ES es más caro (índices invertidos) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Loki OOM con alta cardinalidad de labels

**¿Qué ocasionó el error?**
Se agregó `trace_id` como label en Promtail, causando que Loki indexe miles de labels únicas por segundo.

**¿Cómo se solucionó?**
Se movió `trace_id` de label a contenido del log:
```yaml
pipeline_stages:
  - json:
      expressions:
        trace_id: trace_id  # queda en contenido, no como label
  - labels:
      level: ""  # solo level como label
```

**¿Por qué funciona esta técnica?**
Labels en Loki deben ser baja cardinalidad. `trace_id` es alta cardinalidad y debe ir en el contenido.

### Caso: Logs duplicados en Loki

**¿Qué ocasionó el error?**
Múltiples réplicas de Promtail scrapeando el mismo pod causaron logs duplicados.

**¿Cómo se solucionó?**
```yaml
kubernetes_sd_configs:
  - role: pod
    selectors:
      - role: pod
        fieldselector: "status.phase=Running"
```
Y se configuró `deduplicate: true` en Loki.

**¿Por qué funciona esta técnica?**
Promtail debe scrapper cada pod exactamente una vez. Los selectores y la deduplicación previenen duplicados.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~360 tokens al invocar este skill
- **Trigger de activación:** logging, loki, elasticsearch, promtail, fluentbit, log aggregation, logql
- **Prioridad de carga:** Media — observabilidad complementaria
- **Dependencias:** `08-monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "log-aggregation-loki-elasticsearch",
  "description": "Agregación de logs con Loki/Elasticsearch, shipping con Promtail/Fluentbit, LogQL queries",
  "triggers": ["logging", "loki", "elasticsearch", "promtail", "log aggregation"],
  "context_hint": "Activar cuando se discuta gestión de logs o debugging con logs",
  "output_format": "markdown",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre agregación de logs o Loki/Elasticsearch, carga el skill
log-aggregation-loki-elasticsearch. Proporciona configuración de Promtail, LogQL queries,
structured logging best practices, y troubleshooting de shipping.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Loki (logcli)
logcli query '{namespace="prod"} |= "error"'
logcli query --since=1h '{app="api"} | json | duration_ms > 1000'
logcli query --limit=50 '{namespace="prod"} | pattern "<ip> - - <_> \"<method> <path> <_>\"" 

# Elasticsearch
curl -X GET "localhost:9200/_search" -H 'Content-Type: application/json' -d '{
  "query": { "match": { "message": "error" } }
}'

# Promtail debugging
promtail --config.file=promtail.yaml --dry-run

# Fluentbit
fluent-bit -c fluentbit.conf --dry-run
```

### GUI / Web

- **Grafana Explore**: Logs panel con LogQL query builder, highlighting, y métricas derivadas
- **Kibana**: Dashboard ELK con search, visualizations, y machine learning
- **Grafana Loki Plugin**: dashboard pre-construido para logs por namespace/app
- **Promtail targets page**: Estado de scraping de cada pod K8s

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Query logs | `logcli query '{app="api"}'` | Grafana Explore → Logs |
| Ver targets | `promtail --dry-run` | Promtail → targets |
| ES search | `curl -X GET "localhost:9200/_search"` | Kibana → Discover |

---

## 7. Cheatsheet Rápido

```bash
# LogQL queries comunes
{app="api"} |= "error"                              # error en app api
{namespace="prod"} | json | level="error"           # logs JSON con nivel
{app="api"} | logfmt | duration > 1s                # logfmt parsing
rate({app="api"} |= "error"[5m])                     # errores por segundo

# Structured logging (JSON)
echo '{"level":"info","msg":"hello", "trace":"abc"}' | logfmt
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-monitoring-prometheus-metrics` | complementario (métricas + logs) | Sí |
| `02-opentelemetry-distributed-tracing` | complementario (trazas + logs) | Sí |
| `34-structured-logging-patterns` | dependiente (estructura de logs) | Sí |
| `23-slas-slis-slos-error-budgets` | complementario (SLOs con logs) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: log-aggregation-loki-elasticsearch
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [log-aggregation, loki, elasticsearch, promtail, fluentbit, logql, structured-logging]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

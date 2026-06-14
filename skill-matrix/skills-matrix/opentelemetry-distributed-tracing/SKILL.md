---
name: opentelemetry-distributed-tracing
description: "OpenTelemetry proporciona instrumentación vendor-agnostic para trazas (traces), métricas y logs"
---
# OpenTelemetry Distributed Tracing

## Semantic Triggers
```
opentelemetry, distributed tracing, otel, span trace metric, otlp collector, instrumentacion automatica, context propagation, sampling head tail, observabilidad distribuida
```

---

## 1. Definición Teórica

OpenTelemetry proporciona instrumentación vendor-agnostic para trazas (traces), métricas y logs. Los servicios exportan datos via OTLP al OpenTelemetry Collector, que maneja batching, retries, y enrutamiento a backends como Jaeger, Grafana Tempo, o Datadog. W3C TraceContext (`traceparent` header) asegura continuidad de trazas entre servicios. El sampling head-based (probabilístico en ingreso) con tail-based (errores + trazas lentas) balancea costo y cobertura.

---

## 2. Implementación de Referencia

OpenTelemetry SDK v1.30+ soporta Python, TypeScript, Go, Java, Rust y .NET. El Collector v0.115+ es el componente central para procesamiento y enrutamiento.

### Ejemplo Práctico Avanzado

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import Resource

provider = TracerProvider(
    resource=Resource.create({
        "service.name": "order-api",
        "deployment.environment": "production",
        "service.version": "1.2.0"
    })
)
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

async def process_order(order_id: str) -> None:
    with tracer.start_as_current_span("process_order",
            attributes={"order.id": order_id, "payment.method": "card"}) as span:
        try:
            result = await payment_service.charge(order_id)
            span.set_attribute("payment.success", True)
            span.add_event("payment.completed", {"amount": result.amount, "currency": "USD"})
        except PaymentError as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
```

**Fuente oficial:** https://opentelemetry.io/docs/

### Alternativa de Implementación Específica

OpenTelemetry Operator para Kubernetes inyecta auto-instrumentación via sidecar o init-container, eliminando la necesidad de modificar el código de la aplicación.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas distribuidos con múltiples servicios, necesidad de diagnóstico de latencia extrema |
| **Cuándo evitar** | Monolitos simples, equipos pequeños sin necesidad de tracing distribuido |
| **Alternativas** | Jaeger directo (sin collector), Datadog APM (vendor lock-in), New Relic (costo alto) |
| **Coste/Complejidad** | Medio. Instrumentación inicial + operación del Collector. Costo de almacenamiento de trazas |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Trazas desconectadas entre servicios

**¿Qué ocasionó el error?**
Context propagation no configurada — el header `traceparent` no se propagaba en llamadas HTTP entre servicios.

**¿Cómo se solucionó?**
```python
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.w3c import W3CTraceContextPropagator
set_global_textmap(W3CTraceContextPropagator())
```

**¿Por qué funciona esta técnica?**
W3C TraceContext es el estándar de la industria. Sin propagación, cada servicio crea una traza separada.

### Caso: Exceso de trazas satura el backend

**¿Qué ocasionó el error?**
Head-based sampling al 100% para todos los endpoints generaba ~10GB/hora de datos.

**¿Cómo se solucionó?**
```yaml
# otel-collector-config.yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10  # 10% de trazas
  tail_sampling:
    policies:
      - name: errors-only
        type: status_code
        status_code: { errors: true, sampling_percentage: 100 }
```

**¿Por qué funciona esta técnica?**
Muestrear 10% de trazas normales + 100% de errores reduce el volumen significativamente sin perder visibilidad de fallos.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~380 tokens al invocar este skill
- **Trigger de activación:** opentelemetry, tracing, span, collector, observabilidad distribuida
- **Prioridad de carga:** Media — skill especializado
- **Dependencias:** `08-monitoring-prometheus-metrics`, `09-log-aggregation-loki-elasticsearch`

### Tool Integration

```json
{
  "tool_name": "opentelemetry-distributed-tracing",
  "description": "Configuración y debugging de OpenTelemetry tracing, instrumentación automática y sampling",
  "triggers": ["opentelemetry", "otel", "tracing", "span", "collector"],
  "context_hint": "Activar cuando debug o diagnostique latencia entre servicios",
  "output_format": "markdown",
  "max_tokens": 1900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre tracing distribuido o OpenTelemetry, carga el skill
opentelemetry-distributed-tracing. Proporciona ejemplos de instrumentación en Python/TS,
configuración del Collector, y estrategias de sampling. Incluye W3C TraceContext.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# OpenTelemetry Collector
otelcol --config otel-collector-config.yaml

# Jaeger query
jaeger-query --query.port 16686

# cURL para verificar propagación
curl -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" http://localhost:8000/

# Ver spans en terminal
grpcurl -plaintext localhost:4317 opentelemetry.proto.collector.trace.v1.TraceService/Export

# Temporal: generar traza de prueba
tracetest run --definition test.yaml
```

### GUI / Web

- **Jaeger UI**: `http://localhost:16686` — búsqueda de trazas por servicio, duración, tags
- **Grafana Tempo**: `http://localhost:3000` — integración con Prometheus para trace-to-metrics
- **Honeycomb**: SaaS, soporta query basada en burndown de errores
- **VS Code**: OpenTelemetry extension para span visualization local

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Buscar traza por traceID | `j trace get <traceID>` | Search box en Jaeger |
| Exportar span | `curl -X POST ...` | Download JSON en detail |
| Ver dependencias | `dot -Tpng graph.dot` | DAG en Jaeger/Services |

---

## 7. Cheatsheet Rápido

```python
# Instrumentación mínima Python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter())
)
tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("op") as span:
    span.set_attribute("key", "value")
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-monitoring-prometheus-metrics` | complementario (métricas + trazas) | Sí |
| `09-log-aggregation-loki-elasticsearch` | complementario (logs + trazas) | Sí |
| `18-mesh-data-planes-control-planes` | complementario (mTLS + tracing mesh) | No |
| `23-slas-slis-slos-error-budgets` | complementario (SLOs basados en trazas) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: opentelemetry-distributed-tracing
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/opentelemetry
tags: [opentelemetry, tracing, observability, distributed-tracing, otel, jaeger, tempo]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

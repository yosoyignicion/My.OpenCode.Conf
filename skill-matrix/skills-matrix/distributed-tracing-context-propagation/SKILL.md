---
name: distributed-tracing-context-propagation
description: "Distributed tracing tracks requests across service boundaries by propagating a trace context"
---
# Distributed Tracing & Context Propagation

## Semantic Triggers
```
distributed tracing with opentelemetry and jaeger, w3c tracecontext and baggage headers, context propagation across microservices, span attributes events and status, distributed tracing sampling strategies head and tail, service mesh tracing with envoy and istio
```

---

## 1. Definición Teórica

Distributed tracing tracks requests across service boundaries by propagating a trace context. Each trace is a tree of spans representing work units. It solves the problem of debugging performance and failures in microservice architectures where a single user request traverses dozens of services. Key distinction: unlike metrics (aggregated) and logs (isolated per service), traces preserve the causal relationship between operations across services.

---

## 2. Implementación de Referencia

**OpenTelemetry** — the industry standard for distributed tracing, metrics, and logs. SDKs for all major languages. **Jaeger** for tracing backend and visualization. **W3C TraceContext** (`traceparent` + `tracestate` headers) for context propagation.

### Ejemplo Práctico Avanzado

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.propagate import extract, inject
from opentelemetry.trace import Status, StatusCode
import asyncio

# Setup
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://jaeger:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

# Manual instrumentation with context propagation
async def process_order(request):
    # Extract context from incoming request headers (W3C traceparent)
    ctx = extract(request.headers)
    with tracer.start_as_current_span("process_order", context=ctx, kind=trace.SpanKind.SERVER) as span:
        span.set_attribute("order.id", request.order_id)
        span.set_attribute("user.id", request.user_id)

        try:
            span.add_event("payment.started", {"amount": request.total})
            result = await process_payment(request)
            span.set_status(StatusCode.OK)
            return result
        except PaymentError as e:
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, str(e))
            # Propagate error status to parent
            raise
        finally:
            # Inject context for downstream calls
            headers = {}
            inject(headers)  # W3C traceparent + tracestate
            await downstream_service.call(headers)

# Async context propagation
async def process_payment(request):
    with tracer.start_as_current_span("charge_payment", kind=trace.SpanKind.CLIENT) as span:
        span.set_attribute("payment.method", request.payment_method)
        span.set_attribute("payment.amount", request.total)
        await asyncio.sleep(0.1)  # simulate payment gateway call
        return {"status": "success", "transaction_id": "txn_123"}
```

**Fuente oficial:** https://opentelemetry.io/docs/languages/python/

### Alternativa de Implementación Específica

For **service mesh-based tracing**, Istio with Envoy provides automatic trace generation without application code changes. Envoy generates spans for all inbound/outbound traffic and propagates trace context. Supports Zipkin, Jaeger, and OpenTelemetry backends.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Every microservice deployment with >3 services. Essential for debugging latency issues and understanding service dependencies |
| **Cuándo evitar** | Single-process applications (no service boundaries). Prototypes with trivial control flow |
| **Alternativas** | Request-scoped logging (manual correlation IDs without tracing SDK). Service mesh tracing (Envoy auto-instrumentation) |
| **Coste/Complejidad** | Medium — SDK instrumentation is lightweight (span creation < 1µs). Sampling reduces storage cost. Backend (Jaeger) requires infrastructure. Main cost is developer time for manual instrumentation of custom spans |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Trace context not propagated across message queue

**¿Qué ocasionó el error?**
A service publishes a message to Kafka. The consumer service creates a new trace instead of continuing the parent trace. The entire async flow is disconnected, making it impossible to track end-to-end.

**¿Cómo se solucionó?**
Serialize the trace context into the message headers before publishing. On the consumer side, extract the context before creating the consumer span.

**¿Por qué funciona esta técnica?**
Message queues typically lose HTTP headers. Explicit context propagation via message headers (or Kafka record headers) preserves the trace across async boundaries.

### Caso: Span explosion causing OOM in collector

**¿Qué ocasionó el error?**
A high-traffic service (100k req/s) with 100% sampling creates 500+ spans per request. The OpenTelemetry collector runs out of memory.

**¿Cómo se solucionó?**
Implement head-based probabilistic sampling (default 1%). Use tail-based sampling with Jaeger to ensure error traces are always captured at 100%. Set batch span processor limits.

**¿Por qué funciona esta técnica?**
Head-based sampling reduces the number of traces exported. Tail-based sampling enriches the sample with error traces. Proper debouncing limits memory usage.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "distributed tracing", "opentelemetry", "jaeger", "trace context", "w3c tracecontext"
- **Prioridad de carga:** Alta — esencial para observabilidad en microservicios
- **Dependencias:** `service-mesh-envoy-sidecars`, `message-brokers-kafka-internals`

### Tool Integration

```json
{
  "tool_name": "distributed-tracing-context-propagation",
  "description": "Distributed tracing with OpenTelemetry, W3C TraceContext propagation, and Jaeger for microservice observability",
  "triggers": ["distributed tracing", "opentelemetry", "jaeger", "trace context", "w3c traceparent"],
  "context_hint": "Load when user asks about observability, tracing, context propagation, or debugging microservices",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre distributed tracing u OpenTelemetry, carga el skill
distributed-tracing-context-propagation y responde siguiendo la sección de
implementación de referencia. Prioriza W3C TraceContext y propagación manual para message queues.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Jaeger query API
curl "http://jaeger:16686/api/traces?service=payment&limit=10"

# OpenTelemetry collector config check
otelcol --config /etc/otel/config.yaml --dry-run

# Manual trace injection with curl
curl -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" http://service/api

# View trace ID in logs
kubectl logs -l app=payment --tail=100 | grep trace_id
```

### GUI / Web

- **Jaeger UI** — search traces by service, operation, tags, time range. Flame graph and system architecture graph
- **Grafana Tempo** — trace exploration with service graph and metrics-to-traces linking
- **New Relic / Datadog** — APM traces integrated with logs and metrics
- **Kiali** (with Istio) — service graph with tracing integration, request breakdown per service

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Search traces | `curl jaeger:16686/api/traces?service=<svc>` | Jaeger UI → Search → Service |
| Trace context | `-H "traceparent: 00-<trace-id>-<span-id>-01"` | Kiali → Traces → Span Details |
| Collector status | `otelcol --dry-run` | Grafana → Explore → Tempo |

---

## 7. Cheatsheet Rápido

```python
# W3C TraceContext: traceparent = "00-traceId-spanId-01"
# traceId: 32 hex chars, spanId: 16 hex chars

# OpenTelemetry setup
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Manual span
with tracer.start_as_current_span("op", kind=SpanKind.SERVER) as span:
    span.set_attribute("key", "val")
    span.add_event("event")
    span.set_status(Status(StatusCode.OK))

# Propagate across async boundaries
headers = {}
inject(headers)  # into message headers
ctx = extract(headers)  # on consumer side
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `service-mesh-envoy-sidecars` | complementario — Istio provides auto-tracing via Envoy | Sí |
| `message-brokers-kafka-internals` | complementario — context propagation across async queues | No |
| `grpc-protobuf` | complementario — gRPC has built-in interceptors for tracing | No |
| `opentelemetry-distributed-tracing` | superconjunto — full observability with metrics + logs | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: distributed-tracing-context-propagation
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [distributed-tracing, opentelemetry, jaeger, w3c-tracecontext, observability, context-propagation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

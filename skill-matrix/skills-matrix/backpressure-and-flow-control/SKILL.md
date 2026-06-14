---
name: backpressure-and-flow-control
description: "Backpressure signals load upstream when a downstream component cannot keep up"
---
# Backpressure & Flow Control

## Semantic Triggers
```
backpressure in distributed async systems, flow control with reactive streams and rx, tcp flow control sliding window and congestion avoidance, backpressure in message queues and stream processing, circuit breaker as backpressure strategy, load shedding and graceful degradation under backpressure
```

---

## 1. Definición Teórica

Backpressure signals load upstream when a downstream component cannot keep up. It solves the problem of cascading failures in distributed systems when producers overwhelm consumers. Key distinction over rate limiting (which controls request rate from clients): backpressure is a feedback mechanism from consumer to producer within the system. Strategies include: bounded queues, reactive streams (demand signals), circuit breakers, load shedding, and graceful degradation.

---

## 2. Implementación de Referencia

**Reactive Streams** (Java: Project Reactor, RxJava; Akka Streams). **Python `asyncio.Queue`** with maxsize. **Go channels** with buffering. **RSocket** for network-level backpressure. **Kafka consumer** `max.poll.records` for pull-based backpressure.

### Ejemplo Práctico Avanzado

```python
import asyncio
import time
import logging
from asyncio import Queue, Semaphore
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"       # normal operation
    OPEN = "open"           # rejecting requests
    HALF_OPEN = "half_open" # testing recovery

# Backpressure worker pool with bounded queue
class BackpressureWorker:
    def __init__(self, max_queue: int = 100, concurrency: int = 10, name: str = "worker"):
        self.queue: Queue = Queue(maxsize=max_queue)
        self.sem = Semaphore(concurrency)
        self.name = name
        self.dropped = 0

    async def submit(self, item: dict) -> bool:
        """Submit item for processing. Returns False if queue is full."""
        try:
            await asyncio.wait_for(self.queue.put(item), timeout=1.0)
            return True
        except asyncio.TimeoutError:
            self.dropped += 1
            logging.warning(f"{self.name}: queue full, dropping item")
            return False

    async def process_loop(self):
        while True:
            item = await self.queue.get()
            self.queue.task_done()
            async with self.sem:
                try:
                    await self._process(item)
                except Exception:
                    logging.exception(f"{self.name}: processing failed")

    async def _process(self, item: dict):
        await asyncio.sleep(0.1)  # simulate work

# Circuit breaker with backpressure
class CircuitBreaker:
    def __init__(self, threshold: int = 5, recovery_timeout: float = 30.0, half_open_max: int = 3):
        self.threshold = threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max = half_open_max
        self.failures = 0
        self.successes = 0
        self.last_failure = 0.0
        self.state = CircuitState.CLOSED

    async def call(self, fn, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.monotonic() - self.last_failure > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.successes = 0
            else:
                raise CircuitBreakerOpen("Circuit breaker is OPEN")

        try:
            result = await fn(*args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self.successes += 1
                if self.successes >= self.half_open_max:
                    self.state = CircuitState.CLOSED
                    self.failures = 0
            else:
                self.failures = 0  # reset on success in closed state
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure = time.monotonic()
            if self.failures >= self.threshold:
                self.state = CircuitState.OPEN
            raise

# Load shedding middleware
class LoadShedder:
    def __init__(self, cpu_threshold: float = 80.0, queue_threshold: int = 1000):
        self.cpu_threshold = cpu_threshold
        self.queue_threshold = queue_threshold
        self.current_queue = 0

    async def should_accept(self) -> bool:
        cpu = await self._get_cpu_usage()
        if cpu > self.cpu_threshold or self.current_queue > self.queue_threshold:
            return False
        return True

    async def _get_cpu_usage(self) -> float:
        import psutil
        return psutil.cpu_percent(interval=0.1)

# HTTP middleware for load shedding
async def load_shed_middleware(request, call_next):
    if not await load_shedder.should_accept():
        return Response(status_code=503, content="Service Unavailable: load shedding")
    return await call_next(request)
```

**Fuente oficial:** https://www.reactive-streams.org/

### Alternativa de Implementación Específica

**Akka Streams** (JVM) provides full Reactive Streams implementation with backpressure at every stage. **Go channels** provide natural backpressure: unbuffered channels block the sender until the receiver is ready. **Kafka** implements pull-based backpressure via `max.poll.records` — the consumer controls how much it fetches.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Stream processing pipelines, async messaging systems, any producer-consumer pattern where rates can mismatch, HTTP services under variable load |
| **Cuándo evitar** | Simple request-response without streaming, systems where load is predictable and well-provisioned, batch processing (backpressure adds complexity) |
| **Alternativas** | Rate limiting (client-side control). Autoscaling (add capacity instead of shedding). Buffer overflow with monitoring (log and check) |
| **Coste/Complejidad** | Medium — bounded queues are simple; full Reactive Streams is complex. Circuit breakers are well-understood. Load shedding has business impact (dropped requests) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Thread pool exhaustion with unbounded queue

**¿Qué ocasionó el error?**
A microservice uses an unbounded work queue. Under high load, the queue grows to millions of items, consuming all available RAM. The process OOMs.

**¿Cómo se solucionó?**
Replace unbounded queue with `asyncio.Queue(maxsize=100)` or `LinkedBlockingQueue(capacity)`. When queue is full, the producer blocks or drops. Monitor queue depth and alert on >80% capacity.

**¿Por qué funciona esta técnica?**
Bounded queues prevent unbounded memory growth. The producer is forced to handle backpressure (wait, drop, or fail) instead of silently building memory.

### Caso: Circuit breaker never recovers

**¿Qué ocasionó el error?**
Circuit breaker trips due to a temporary database failure. Recovery timeout is 30s. After 30s, it transitions to half-open. The first test request also fails (database still recovering). It goes back to open immediately.

**¿Cómo se solucionó?**
Implement exponential backoff for recovery timeouts (30s, 60s, 120s). Require multiple successes in half-open state (e.g., 3 of 5 requests) before fully closing.

**¿Por qué funciona esta técnica?**
Exponential backoff prevents rapid cycling. Requiring multiple successes filters out transient failures, ensuring only sustained recovery closes the circuit.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "backpressure", "flow control", "circuit breaker", "load shedding", "reactive streams"
- **Prioridad de carga:** Alta — esencial para sistemas resilientes
- **Dependencias:** `rate-limiting-algorithms`, `bulkhead-circuit-breaker-resilience`

### Tool Integration

```json
{
  "tool_name": "backpressure-and-flow-control",
  "description": "Backpressure strategies: bounded queues, reactive streams, circuit breakers, load shedding, and graceful degradation",
  "triggers": ["backpressure", "flow control", "circuit breaker", "load shedding", "reactive streams"],
  "context_hint": "Load when user asks about resilience, backpressure, or flow control in distributed systems",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre backpressure o flow control, carga el skill
backpressure-and-flow-control. Prioriza bounded queues y circuit breakers
con ejemplos concretos sobre teoría de reactive streams.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Monitor queue depth
ss -tnp | grep 8080 | wc -l  # HTTP connection queue
curl http://localhost:8080/actuator/health | jq '.queueDepth'

# Linux network backpressure
netstat -s | grep -E "overflow|drop|backlog"
ss -lnt | grep 8080
ss -ltp | grep -c SYN_RECV

# Kafka consumer lag (pull-based backpressure)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group my-group --describe

# Envoy circuit breaker status
curl -s http://localhost:15000/stats | grep -E "upstream_rq_pending|upstream_cx"

# CPU load for load shedding
top -bn1 | grep "Cpu(s)" | awk '{print $2}'
```

### GUI / Web

- **Grafana** — circuit breaker state, queue depth, dropped request rate, CPU load dashboards
- **Hystrix Dashboard** (legacy) — circuit breaker visualization for JVM services
- **Resilience4j** UI — reactive circuit breaker and bulkhead metrics
- **Datadog APM** — backpressure propagation tracking across service boundaries
- **Kiali** — circuit breaker configuration for Istio/Envoy

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check queue | `ss -tnp \| grep 8080` | Grafana → Queue Depth |
| Circuit status | `curl :15000/stats \| grep circuit` | Resilience4j → Dashboard |
| CPU | `top -bn1 \| grep Cpu(s)` | Datadog → Dashboards |
| Kafka lag | `kafka-consumer-groups --describe` | Confluent Control Center |

---

## 7. Cheatsheet Rápido

```python
# Backpressure strategies (priority order):
# 1. Bounded queue: asyncio.Queue(maxsize=N) — blocks producer when full
# 2. Circuit breaker: trip on N failures, half-open after timeout
# 3. Load shedding: return 503 when CPU > 80% or queue > threshold
# 4. Graceful degradation: return partial results, disable expensive features

# Bounded queue sizing: rate × max_acceptable_latency
# Circuit breaker: threshold=5, recovery=30s, half-open_max=3
# Never use unbounded queues

# Reactive Streams: Publisher → Subscriber with demand signals
# Pull-based (Kafka consumer): consumer controls fetch rate
# Push-based (TCP): window-based flow control
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `rate-limiting-algorithms` | complementario — rate limiting (client-side) vs backpressure (system) | Sí |
| `bulkhead-circuit-breaker-resilience` | superconjunto — circuit breaker is a backpressure mechanism | Sí |
| `message-brokers-kafka-internals` | complementario — Kafka consumer lag as backpressure signal | No |
| `asynchronous-messaging-patterns` | contexto — queues enable backpressure | No |
| `concurrency-patterns-pipelines` | implementación — pipeline stages with backpressure | No |

---

## 9. Metadatos del Skill

```yaml
---
id: backpressure-and-flow-control
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [backpressure, flow-control, circuit-breaker, load-shedding, reactive-streams, resilience]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

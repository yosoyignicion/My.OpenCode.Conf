---
name: bulkhead-circuit-breaker-resilience
description: "Resilience patterns protect systems from cascading failures"
---
# Bulkhead, Circuit Breaker & Resilience

## Semantic Triggers
```
circuit breaker patrón resiliencia, bulkhead aislamiento recursos, resilience patterns fallos, circuit breaker open half open, bulkhead thread pool semaphore, resilience4j circuit breaker
```

---

## 1. Definición Teórica

Resilience patterns protect systems from cascading failures. Circuit Breaker monitors failure rates and opens the circuit to fail-fast instead of waiting for timeout, with half-open state for recovery testing. Bulkhead isolates resources into separate pools so failure in one pool doesn't exhaust all resources. Timeout prevents slow calls from hanging indefinitely. Retry with backoff handles transient failures. Fallback provides degraded behavior on failure. Together, these patterns implement the Stability pattern, ensuring partial failures don't cascade into system-wide outages.

---

## 2. Implementación de Referencia

TypeScript with full resilience patterns including Circuit Breaker, Bulkhead, Timeout, Retry, and Fallback.

### Ejemplo Práctico Avanzado

```typescript
// ===== CIRCUIT BREAKER =====
type CircuitState = 'closed' | 'open' | 'half_open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly threshold = 5,
    private readonly halfOpenTimeout = 30000,
    private readonly halfOpenMaxSuccess = 3,
    private readonly monitor?: (event: CircuitEvent) => void
  ) {}

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.halfOpenTimeout) {
        this.transitionTo('half_open');
      } else {
        this.monitor?.({ type: 'rejected', state: this.state });
        return this.executeFallback(fallback);
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err as Error);
      return this.executeFallback(fallback);
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new TimeoutError('Request timed out')), 10000)
      ),
    ]);
  }

  private onSuccess(): void {
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxSuccess) {
        this.transitionTo('closed');
        this.successCount = 0;
      }
    }
    this.failureCount = 0;
  }

  private onFailure(err: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.monitor?.({ type: 'failure', state: this.state, error: err.message });

    if (this.state === 'half_open' || this.failureCount >= this.threshold) {
      this.transitionTo('open');
      this.successCount = 0;
    }
  }

  private transitionTo(newState: CircuitState): void {
    const prev = this.state;
    this.state = newState;
    this.monitor?.({ type: 'transition', from: prev, to: newState });
  }

  private async executeFallback<T>(fallback?: () => Promise<T>): Promise<T> {
    if (fallback) return fallback();
    throw new CircuitBreakerOpenError('Circuit breaker is open');
  }

  getState(): CircuitState { return this.state; }
}

// ===== BULKHEAD =====
// Isolates resources per dependency

class BulkheadPool {
  private activeCount = 0;
  private queue: Array<{ resolve: (fn: () => Promise<any>) => void; reject: (err: Error) => void }> = [];

  constructor(
    private maxConcurrent: number,
    private queueCapacity: number = 100,
    private readonly name: string
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      if (this.queue.length >= this.queueCapacity) {
        throw new BulkheadRejectedError(`${this.name} bulkhead queue full`);
      }
      return new Promise((resolve, reject) => {
        this.queue.push({ resolve: () => resolve(this.executeWithTracking(fn)), reject });
      });
    }
    return this.executeWithTracking(fn);
  }

  private async executeWithTracking<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.queue.shift()!;
      next.resolve(() => {});  // triggers execution
    }
  }

  getActiveCount(): number { return this.activeCount; }
  getQueueSize(): number { return this.queue.length; }
}

// ===== RESILIENCE PATTERN COMBINED =====
class ResilientHttpClient {
  private circuitBreaker = new CircuitBreaker(5, 30000, 3, (event) => {
    console.log(`[CB] ${event.type}`, event);
    metrics.recordCircuitEvent(event);
  });

  private bulkhead = new BulkheadPool(10, 50, 'http-client');

  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    return this.bulkhead.run(() =>
      this.circuitBreaker.call(
        () => this.makeRequest<T>(path),
        () => this.getFallbackResponse<T>(path)
      )
    );
  }

  private async makeRequest<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new HttpError(response.status, response.statusText);
    return response.json();
  }

  private async getFallbackResponse<T>(path: string): Promise<T> {
    // Try cache
    const cached = await cache.get<T>(path);
    if (cached) return cached;

    // Return default empty response
    return { error: 'Service unavailable', cached: false } as any;
  }
}

// ===== RETRY WITH BACKOFF =====
class RetryHandler {
  async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      retryableErrors?: Array<new (...args: any[]) => Error>;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelayMs ?? 200;
    const maxDelay = options.maxDelayMs ?? 10000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;

        if (attempt === maxRetries) break;

        // Check if error is retryable
        if (options.retryableErrors && !this.isRetryable(err, options.retryableErrors)) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay,
          maxDelay
        );
        await sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryable(err: unknown, retryableTypes: Array<new (...args: any[]) => Error>): boolean {
    return retryableTypes.some(type => err instanceof type);
  }
}

// ===== RESILIENCE4J-STYLE ANNOTATIONS =====
// Decorator-based approach
function Resilient(options: { circuitBreaker?: boolean; bulkhead?: boolean; retry?: boolean }) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      let result = original.apply(this, args);
      if (options.circuitBreaker) result = circuitBreaker.call(() => result);
      if (options.bulkhead) result = bulkheadPool.run(() => result);
      if (options.retry) result = retryHandler.withRetry(() => result);
      return result;
    };
  };
}
```

**Fuente oficial:** https://resilience4j.readme.io/docs

### Alternativa de Implementación Específica

Python with `pybreaker` for circuit breaker, `asyncio.Semaphore` for bulkhead, and `tenacity` for retry with backoff.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Servicios que llaman a dependencias externas, sistemas con alta criticidad, prevención de fallos en cascada |
| **Cuándo evitar** | Servicios sin dependencias externas, sistemas tolerantes a fallos lentos (timeout suficiente), prototipos |
| **Alternativas** | Timeout simple (sin patrones), Load shedding (rechazar tráfico directamente), Fail-fast sin fallback (simplicidad) |
| **Coste/Complejidad** | Medio. Circuit Breaker y Bulkhead son fáciles de añadir. El retry con backoff puede enmascarar problemas. El monitoreo es esencial |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Circuit breaker oscilando entre open/half-open

**¿Qué ocasionó el error?**
El half-open timeout era demasiado corto, causando que el breaker abriera y cerrara constantemente.

**¿Cómo se solucionó?**
```typescript
// Añadir minimum number of successes in half-open
class StableCircuitBreaker {
  private halfOpenMaxSuccess = 5;  // require 5 consecutive successes
  private halfOpenSuccessCount = 0;

  private onSuccess(): void {
    if (this.state === 'half_open') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.halfOpenMaxSuccess) {
        this.transitionTo('closed');
        this.halfOpenSuccessCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(err: Error): void {
    if (this.state === 'half_open') {
      this.halfOpenSuccessCount = 0;  // reset on any failure
      this.transitionTo('open');       // go back to open
    }
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) this.transitionTo('open');
  }
}
```

**¿Por qué funciona esta técnica?**
Requerir múltiples éxitos consecutivos en half-open estabiliza la recuperación. Cualquier fallo reinicia el contador.

### Caso: Bulkhead queue overflow

**¿Qué ocasionó el error?**
Una burst de requests a un servicio lento llenó la cola del bulkhead, causando rejection de todas las requests.

**¿Cómo se solucionó?**
```typescript
// Bulkhead with dynamic sizing and rejection strategy
class AdaptiveBulkhead {
  private activeCount = 0;
  private maxActive: number;
  private rejectionCount = 0;

  constructor(initialMax: number, private maxRejectionRate: number = 0.1) {
    this.maxActive = initialMax;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxActive) {
      this.rejectionCount++;
      this.adaptSize();
      throw new BulkheadRejectedError('Bulkhead full');
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
    }
  }

  private adaptSize(): void {
    // Reduce max if rejection rate too high
    const totalRequests = this.activeCount + this.rejectionCount;
    const rate = this.rejectionCount / Math.max(totalRequests, 1);
    if (rate > this.maxRejectionRate) {
      this.maxActive = Math.max(1, this.maxActive - 1);
    } else if (rate < this.maxRejectionRate / 2 && this.activeCount < this.maxActive) {
      this.maxActive++;
    }
  }
}
```

**¿Por qué funciona esta técnica?**
Adaptive bulkhead ajusta dinámicamente su capacidad basado en tasas de rechazo, evitando saturación permanente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~820 tokens estimados al invocar este skill
- **Trigger de activación:** "circuit breaker", "bulkhead", "resilience pattern", "fault tolerance", "resilience4j", "stability pattern"
- **Prioridad de carga:** Alta — crítico para sistemas distribuidos
- **Dependencias:** `03-sistemas-distribuidos/25-backpressure-and-flow-control`, `03-sistemas-distribuidos/30-network-partitions-split-brain`

### Tool Integration

```json
{
  "tool_name": "bulkhead-circuit-breaker-resilience",
  "description": "Implements resilience patterns: Circuit Breaker, Bulkhead, Retry with backoff, Timeout, Fallback, adaptive sizing",
  "triggers": ["circuit breaker", "bulkhead", "resilience", "fault tolerance", "retry", "backoff", "stability"],
  "context_hint": "Inject when user asks about fault tolerance or resilience patterns",
  "output_format": "code examples with all resilience patterns combined",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre resiliencia o patrones de tolerancia a fallos, carga el skill bulkhead-circuit-breaker-resilience
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Monitor circuit breaker state
curl -s http://localhost:3000/actuator/health | jq '.circuitBreakers'
# Simulate failure
curl -X POST http://localhost:3000/test/fail

# Check bulkhead metrics
curl -s http://localhost:3000/metrics | grep bulkhead
```

### GUI / Web

- **Resilience4j Dashboard**: Monitoreo de circuit breakers y bulkheads
- **Hystrix Dashboard** (legacy): Streaming de métricas de resiliencia
- **Grafana + Micrometer**: Visualización de estados de circuit breaker

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check CB state | `curl -s /actuator/health | jq '.circuitBreakers'` | — |
| View bulkhead metrics | `curl -s /metrics | grep bulkhead` | — |

---

## 7. Cheatsheet Rápido

```typescript
// Circuit Breaker: closed → open (failures > threshold) → half_open (timeout) → closed (success)
// Bulkhead: limit concurrent calls per dependency
// Retry: exponential backoff + jitter
// Timeout: AbortSignal.timeout(ms)
// Fallback: cached/default response on failure
// Metrics: track state transitions, rejection rates, latency
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-sistemas-distribuidos/25-backpressure-and-flow-control` | Complementario | Sí |
| `03-sistemas-distribuidos/30-network-partitions-split-brain` | Complementario | No |
| `02-arquitectura-diseno/10-saga-orchestration-choreography` | Complementario | No |
| `02-arquitectura-diseno/12-concurrency-patterns-pipelines` | Complementario | No |
| `02-arquitectura-diseno/23-idempotency-keys-processing` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: bulkhead-circuit-breaker-resilience
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [circuit-breaker, bulkhead, resilience, fault-tolerance, retry, backoff, timeout, fallback, stability]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

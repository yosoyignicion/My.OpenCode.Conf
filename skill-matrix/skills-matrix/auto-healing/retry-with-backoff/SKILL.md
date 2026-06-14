# retry-with-backoff

## Semantic Triggers
```
retry, retries, exponential backoff, jitter, retry strategy, idempotency, transient failure, retry budget, polling backoff, decorrelated jitter
```

---

## 1. Definición Teórica

Retry-with-backoff resuelve el problema de los fallos transitorios en llamadas a servicios remotos (timeouts de red, errores 5xx intermitentes, throttling) reintentando la operación con esperas progresivamente crecientes entre intentos. El principio fundamental es el "Full Jitter" de AWS Architecture Blog: cada reintento espera un tiempo aleatorio entre 0 y el backoff calculado (`sleep = random(0, min(cap, base * 2^attempt))`), evitando el "thundering herd problem" donde miles de clientes reintentan sincronizadamente. Aplica en cualquier sistema con dependencias remotas (HTTP APIs, DB queries, message brokers). Existe como patrón diferenciado porque un retry naive (espera fija, reintentos ilimitados) puede amplificar el problema original: si la dependencia está sobrecargada, los reintentos sincronizados la hunden más profundo, extendiendo el outage (el "retry storm"). Combinado con idempotency keys, garantiza que el reintento no produce efectos secundarios duplicados.

---

## 2. Implementación de Referencia

Librería de referencia: AWS SDK内置 retryer (Java v2, Go v2, Python botocore), Resilience4j Retry, Polly (.NET), tenacity (Python), cenkalti/backoff (Go). Estándar: IETF draft "Retry-After Header".

### Ejemplo Práctico Avanzado

```java
// Resilience4j 2.2 + Spring Boot 3.2: retry con exponential backoff + jitter
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;

import java.time.Duration;
import java.util.function.Predicate;

public class OrderService {

    private final Retry retry;
    private final PaymentClient client;

    public OrderService(PaymentClient client) {
        this.client = client;
        this.retry = Retry.of("payment-retry",
            RetryConfig.custom()
                .maxAttempts(5)
                .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(
                    Duration.ofMillis(500),   // initialInterval
                    2.0,                       // multiplier
                    0.5,                       // randomization factor (jitter)
                    Duration.ofSeconds(30)     // maxInterval cap
                ))
                .retryOnException(throwable -> {
                    if (throwable instanceof PaymentException pe) {
                        // Solo reintentar 5xx, NO 4xx (errores del cliente)
                        return pe.getStatusCode() >= 500;
                    }
                    if (throwable instanceof java.net.SocketTimeoutException) {
                        return true;
                    }
                    return false;
                })
                .retryOnResult(response -> 
                    response.getStatus() == ResponseStatus.PENDING)
                .failAfterMaxAttempts(true)  // lanzar tras N intentos
                .build());
    }

    public PaymentResult processOrder(Order order) {
        IdempotencyKey key = IdempotencyKey.of(order.getId());
        return Retry.decorateCallable(retry, 
            () -> client.chargeWithIdempotencyKey(order, key)).call();
    }
}

// Backend: reintentos idempotentes con Polly v8 (C#)
public static ResiliencePipeline GetIdempotentRetryPipeline() {
    return new ResiliencePipelineBuilder()
        .AddRetry(new RetryStrategyOptions {
            ShouldHandle = new PredicateBuilder()
                .Handle<HttpRequestException>()
                .HandleResult<Response>(r => r.StatusCode == 503),
            MaxRetryAttempts = 4,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,  // CRÍTICO: previene thundering herd
            OnRetry = args => {
                Log.Warning("Retry {n} tras {delay}ms", 
                    args.AttemptNumber, args.RetryDelay.TotalMilliseconds);
                return ValueTask.CompletedTask;
            }
        })
        .Build();
}
```

**Fuente oficial:** [AWS Architecture Blog — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) · [Resilience4j Retry](https://resilience4j.readme.io/docs/retry) · [Idempotency Keys (Stripe)](https://stripe.com/docs/api/idempotent_requests)

### Alternativa de Implementación Específica

Go: `cenkalti/backoff` con `NewExponentialBackOff()` + `MaxElapsedTime`. Idiomático para proyectos que no usan Resilience4j.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Llamadas a APIs externas (HTTP/REST/gRPC), queries a DB remotas, operaciones de message broker publish/consume, cualquier dependencia con SLA < 99.99% |
| **Cuándo evitar** | Operaciones no-idempotentes sin mecanismo de deduplicación (cobra doble), escrituras en DB con constraints únicos que rompen en retry (usar upsert/ON CONFLICT), sistemas con time budgets estrictos |
| **Alternativas** | Circuit breaker (cortocircuitar tras N fallos), Dead letter queue (mover a cola de errores), Async/queue-based (desacoplar el cliente) |
| **Coste/Complejidad** | Coste bajo (config declarativa); mal aplicado agrava outages (retry storm); requiere idempotency keys para operaciones con side effects |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Retry storm que extiende el outage original

**¿Qué ocasionó el error?**
Un servicio downstream tuvo latencia elevada. Todos los clientes (100 microservicios, 10k instancias) reintentaron simultáneamente con backoff fijo. La dependencia, ya al límite, recibió un pico de requests multiplicado por 5 (5 reintentos), colapsando definitivamente.

**¿Cómo se solucionó?**
1. **Jitter obligatorio**: usar `ExponentialRandomBackoff` con `randomizationFactor=0.5` (mínimo AWS-recommended)
2. **Retry budget**: limitar retries globales al 10% del tráfico (Google SRE Workbook). Si budget agotado, fail-fast
3. **Circuit breaker** upstream: corta la cascada antes de que llegue al servicio degradado
4. **Bulkhead**: limita la concurrencia hacia la dependencia, evitando saturación

**¿Por qué funciona esta técnica?**
El jitter rompe la sincronización de los clientes reintentando en momentos distintos. El retry budget previene que los reintentos excedan una fracción del tráfico original. El circuit breaker corta la cadena antes del daño sistémico.

### Caso: Operación no-idempotente causa duplicación tras retry

**¿Qué ocasionó el error?**
Un cliente HTTP reintenta un POST a `/payments` tras un timeout. El servidor SÍ procesó el pago original, pero la respuesta se perdió. El reintento crea un segundo cargo al cliente.

**¿Cómo se solucionó?**
1. **Idempotency keys**: cliente genera UUID v4, lo envía en header `Idempotency-Key`. Servidor cachea la respuesta por 24h y la devuelve en duplicados.
2. **DB-level idempotencia**: usar `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING` o constraints únicos
3. **Stripe-style**: si header `Idempotency-Key` ya visto, devolver la respuesta cacheada con header `Idempotent-Replayed: true`
4. **Evitar retry en mutaciones no-idempotentes** sin protección previa (GET es safe, POST no lo es)

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "retry", "backoff", "jitter", "idempotency", "transient failure"
- **Prioridad de carga:** Alta — patrón transversal en sistemas distribuidos
- **Dependencias:** `circuit-breaker-pattern`, `idempotency-keys-processing`, `http-client-patterns`

### Tool Integration

```json
{
  "tool_name": "retry_with_backoff",
  "description": "Implementa retry con exponential backoff + jitter para fallos transitorios. Incluye idempotency keys para evitar duplicación en operaciones no-idempotentes.",
  "triggers": ["retry", "backoff", "jitter", "idempotency", "transient", "retry storm"],
  "context_hint": "Cargar cuando el usuario diseñe clientes HTTP, enfrente errores 5xx intermitentes, o implemente integraciones con APIs externas.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre retry strategies, backoff, jitter o
idempotency, carga el skill retry-with-backoff y prioriza exponential backoff
con jitter sobre backoff fijo. Advierte sobre retry storms.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar retry con curl y headers
curl -v -H "Idempotency-Key: $(uuidgen)" -X POST https://api.example.com/payments \
  -d '{"amount": 100, "currency": "USD"}'

# Ver retry attempts en logs (AWS SDK v2)
aws s3 cp large-file s3://bucket/key --cli-read-timeout 5 --cli-connect-timeout 5

# Generar tráfico con reintentos para testing
hey -n 1000 -c 10 -H "X-Force-Retry: 1" http://api.example.com/endpoint
```

### GUI / Web

- **AWS Console → X-Ray**: service map con anotaciones de retries, latency, faults
- **Grafana**: dashboard "Retry Stats" con p99 latency, retry count, success-after-retry
- **Postman**: collection runner con reintentos configurables y scripts de idempotency
- **Insomnia**: similar a Postman, con scripting pre-request para generar UUIDs

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar idempotency key | `uuidgen` | `Ctrl+Alt+I` (Postman pre-request) |
| Ver retry en logs | `grep "retry" app.log` | Filtro "retry" en CloudWatch Logs Insights |
| Probar reintento | `curl --retry 3` | Botón "Retry" en Postman Runner |

---

## 7. Cheatsheet Rápido

```python
# Python: tenacity con exponential backoff + jitter
from tenacity import retry, wait_exponential_jitter, stop_after_attempt

@retry(wait=wait_exponential_jitter(initial=0.5, max=30, jitter=0.5),
       stop=stop_after_attempt(5),
       retry=retry_if_exception_type((IOError, TimeoutError)))
def fetch_data(url): return requests.get(url, timeout=2).json()
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `circuit-breaker-pattern` | Complementario (CB corta el bucle) | Sí |
| `idempotency-keys-processing` | Dependiente (clave para no duplicar) | Sí |
| `http-client-patterns` | Dependiente (retry sobre HTTP) | Sí |
| `bulkhead-circuit-breaker-resilience` | Superconjunto (incluye retry) | Sí |
| `auto-healing-systems` | Complementario (recovery incluye retry) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: retry-with-backoff
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [retry, backoff, jitter, idempotency, resilience, thundering-herd, transient-failure]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

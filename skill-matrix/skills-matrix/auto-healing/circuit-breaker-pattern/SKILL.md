# circuit-breaker-pattern

## Semantic Triggers
```
circuit breaker, circuit-breaker, fail fast, cascading failure, resilience4j, hystrix, Polly, fault isolation, half-open state, bulkhead, fallback
```

---

## 1. Definición Teórica

El patrón Circuit Breaker resuelve el problema de las cascadas de fallos en arquitecturas distribuidas aislando llamadas a servicios remotos defectuosos para que un fallo no propague a todo el sistema. El principio fundamental es mimetizar un interruptor eléctrico: monitoriza la tasa de errores de una dependencia, y cuando supera un umbral (típicamente 50% en ventana de 10s), "abre" el circuito rechazando inmediatamente nuevas llamadas (fail-fast) durante un período de enfriamiento. Tras el timeout, transiciona a "half-open" permitiendo una llamada de prueba; si tiene éxito, cierra el circuito. Aplica en cualquier arquitectura con llamadas síncronas entre servicios (microservicios, APIs externas, DB remotas). Existe como patrón diferenciada porque sin él, los timeouts exponenciales degradan el sistema entero (efecto avalancha): un servicio lento bloquea threads, consume conexiones del pool, y eventualmente tumba el llamador.

---

## 2. Implementación de Referencia

Librería de referencia: Resilience4j 2.2+ (Java/Kotlin), replacement oficial de Hystrix (deprecado 2018). Alternativas: Polly (.NET), opossum (Node.js), sony/gobreaker (Go), pybreaker (Python). Spring Boot 3.x integra Resilience4j nativamente.

### Ejemplo Práctico Avanzado

```java
// Resilience4j 2.2 con Spring Boot 3.2, configuración programática
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;

import java.time.Duration;
import java.util.function.Supplier;

public class PaymentService {

    private final CircuitBreaker breaker;
    private final PaymentGateway gateway;

    public PaymentService(PaymentGateway gateway) {
        this.gateway = gateway;
        this.breaker = CircuitBreaker.of("payment-gateway",
            CircuitBreakerConfig.custom()
                .failureRateThreshold(50)              // 50% errores abre circuito
                .slowCallRateThreshold(50)             // 50% lentas también abre
                .slowCallDurationThreshold(Duration.ofSeconds(2))
                .slidingWindowSize(10)                 // ventana de 10 calls
                .minimumNumberOfCalls(5)               // mínimo 5 antes de evaluar
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)  // 2.2+ feature
                .recordExceptions(IOException.class, TimeoutException.class)
                .ignoreExceptions(BusinessException.class)  // 4xx no cuentan
                .build());
    }

    public PaymentResult processPayment(Order order) {
        return CircuitBreaker.decorateSupplier(breaker, () -> {
            return gateway.charge(order);
        }).get();  // si circuito abierto → CallNotPermittedException
    }

    // Fallback chain: CircuitBreaker → Retry → RateLimiter → Bulkhead → TimeLimiter
    public PaymentResult processPaymentWithFallback(Order order) {
        Supplier<PaymentResult> decorated = CircuitBreaker.decorateSupplier(breaker,
            () -> gateway.charge(order));

        return Try.ofSupplier(decorated)
            .recover(CallNotPermittedException.class, e -> 
                PaymentResult.deferred("queue", order))             // cola async
            .recover(IOException.class, e -> 
                PaymentResult.retry("exponential", order))         // retry
            .get();
    }

    // Métricas: exportar a Prometheus para dashboards
    public void exposeMetrics() {
        TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(registry)
            .bindTo(Metrics.globalRegistry);
    }
}
```

**Fuente oficial:** [Resilience4j Documentation](https://resilience4j.readme.io/docs/circuitbreaker) · [Martin Fowler — Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)

### Alternativa de Implementación Específica

.NET: Polly v8 con `ResiliencePipeline` API. Más idiomático en ecosistema Microsoft, mejor integración con `IHttpClientFactory` y System.Diagnostics.Metrics.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier llamada síncrona a servicio externo (HTTP, gRPC, DB remota, message broker), especialmente en cadenas de microservicios |
| **Cuándo evitar** | Llamadas locales in-process, operaciones idempotentes con retry ya configurado, sistemas donde el fallback es más caro que el fallo original |
| **Alternativas** | Bulkhead (aislamiento de pools), Timeout agresivo + retry, Service mesh sidecar (Envoy circuit breaker), Backpressure |
| **Coste/Complejidad** | Coste bajo (librería, 1-2 días setup); previene outages completos; requiere métricas para calibrar thresholds; cuidado con false positives en tráfico bajo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Circuit breaker se abre falsamente durante deploys

**¿Qué ocasionó el error?**
Durante un rolling deploy, las instancias nuevas tienen cold start (JVM warmup, connection pools vacíos). Las primeras N llamadas son lentas/fallidas y disparan la apertura del circuito, degradando el servicio innecesariamente.

**¿Cómo se solucionó?**
1. Configurar `permittedNumberOfCallsInHalfOpenState` ≥ número de instancias healthy
2. Aumentar `minimumNumberOfCalls` a un valor absoluto (no relativo) ≥ tráfico esperado en 10s
3. Usar `ignoreExceptions` para excluir excepciones de startup (ConnectionRefused, ConnectException)
4. Considerar warm-up pools: pre-abrir conexiones en `@PostConstruct`

**¿Por qué funciona esta técnica?**
El cold start es un estado transitorio conocido, no un fallo sistémico. Ignorarlo evita que el circuit breaker reaccione a eventos esperados, manteniendo disponibilidad durante deploys.

### Caso: Half-open state permite avalancha de llamadas de prueba

**¿Qué ocasionó el error?**
Tras el timeout en OPEN, el circuito pasa a HALF_OPEN y permite todas las llamadas concurrentes, no solo N de prueba. Si hay 1000 threads esperando, saturan la dependencia que aún no se ha recuperado.

**¿Cómo se solucionó?**
Limitar explícitamente `permittedNumberOfCallsInHalfOpenState=3` y combinar con `Bulkhead` (semáforo o thread-pool) que limite la concurrencia máxima hacia esa dependencia. Verificar que el timeout del half-open no sea menor que el P99 de la dependencia.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "circuit breaker", "fail fast", "cascading failure", "resilience4j", "fault isolation"
- **Prioridad de carga:** Alta — patrón fundamental en microservicios
- **Dependencias:** `bulkhead-circuit-breaker-resilience`, `http-client-patterns`, `monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "circuit_breaker_pattern",
  "description": "Implementa el patrón Circuit Breaker para aislar fallos en llamadas a servicios externos. Fail-fast cuando la tasa de errores supera el umbral, recupera vía half-open.",
  "triggers": ["circuit breaker", "fail fast", "resilience4j", "cascading failure", "fault isolation"],
  "context_hint": "Cargar cuando el usuario diseñe microservicios o enfrente caídas en cascada entre servicios.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre resilience, circuit breaker, o cascading
failures, carga el skill circuit-breaker-pattern y recomienda Resilience4j
sobre la deprecated Hystrix.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver estado de circuit breakers en Spring Boot Actuator
curl http://localhost:8080/actuator/circuitbreakers

# Métricas Prometheus
curl http://localhost:8080/actuator/prometheus | grep resilience4j_circuitbreaker_state

# Forzar apertura manual (testing)
curl -X POST http://localhost:8080/actuator/circuitbreakerevents/payment-gateway \
  -H "Content-Type: application/json" -d '{"type":"FORCED_TRANSITION_TO_OPEN"}'
```

### GUI / Web

- **Grafana**: dashboard "Resilience4j Circuit Breakers" con estado, failure rate, slow calls
- **Spring Boot Admin**: vista `/actuator/circuitbreakers` con colores por estado (CLOSED/HALF_OPEN/OPEN)
- **Resilience4j Visualizer**: pequeño dashboard standalone
- **VS Code**: extensión "Spring Boot Dashboard" muestra health y circuit breakers

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver estado del CB | `curl /actuator/circuitbreakers` | `Ctrl+Shift+A` en Spring Boot Admin |
| Forzar OPEN | `curl -X POST .../circuitbreakerevents` | Botón "Force Open" en Resilience4j UI |
| Reset a CLOSED | `curl -X POST .../circuitbreakerevents` | Botón "Reset" en dashboard |

---

## 7. Cheatsheet Rápido

```java
// Plantilla mínima Resilience4j
CircuitBreaker cb = CircuitBreaker.of("name",
    CircuitBreakerConfig.custom()
        .failureRateThreshold(50)
        .slidingWindowSize(10)
        .waitDurationInOpenState(Duration.ofSeconds(30))
        .build());
Supplier<T> decorated = CircuitBreaker.decorateSupplier(cb, supplier);
T result = Try.ofSupplier(decorated).recover(CallNotPermittedException.class, fallback).get();
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `bulkhead-circuit-breaker-resilience` | Superconjunto (incluye CB) | Sí |
| `http-client-patterns` | Dependiente (CB sobre HTTP) | Sí |
| `retries-with-backoff-strategies` | Complementario (CB + retry) | Sí |
| `service-mesh-envoy-sidecars` | Alternativa (CB en sidecar) | No |
| `monitoring-prometheus-metrics` | Dependiente (exportar estado) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: circuit-breaker-pattern
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [circuit-breaker, resilience4j, fail-fast, microservices, fault-isolation, Hystrix-alternative]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

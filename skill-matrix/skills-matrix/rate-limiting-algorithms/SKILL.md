---
name: rate-limiting-algorithms
description: "Rate limiting controls the rate of requests to protect system resources from abuse and overload"
---
# Rate Limiting Algorithms

## Semantic Triggers
```
token bucket rate limiting algorithm, sliding window log and counter, fixed window vs sliding window rate limit, distributed rate limiting with redis, gcra generic cell rate algorithm, rate limit headers x-ratelimit-remaining
```

---

## 1. Definición Teórica

Rate limiting controls the rate of requests to protect system resources from abuse and overload. The core problem is distinguishing between legitimate bursts and sustained high traffic. Key algorithms — Token Bucket (burst-bounded), Leaky Bucket (rate-smoothing), Fixed Window (simple but boundary spikes), Sliding Window Log (precise but memory-heavy), Sliding Window Counter (efficient, roughly accurate), and GCRA (Generic Cell Rate Algorithm used by API gateways). Each trades memory efficiency for accuracy.

---

## 2. Implementación de Referencia

**Redis** with `redis-cell` module (GCRA) or native Redis Sorted Sets for sliding window. For in-process rate limiting in Go: `golang.org/x/time/rate`. For Python: `limits` library.

### Ejemplo Práctico Avanzado

```python
import time
import redis.asyncio as redis

r = redis.Redis.from_url("redis://localhost:6379/0")

# Sliding window counter via Redis
async def check_rate_limit(user_id: str, max_requests: int = 100, window: int = 60) -> bool:
    key = f"ratelimit:{user_id}:{int(time.time() / window)}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, window + 1)
    return count <= max_requests

# Token bucket (GCRA via redis-cell module)
async def token_bucket_check(key: str, rate: float, burst: int) -> bool:
    result = await r.execute_command("CL.THROTTLE", key, burst, rate, 1, 1)
    return result[0] == 0  # 0 = allowed, 1 = denied

# Distributed sliding window with Sorted Set
async def sliding_window_check(user_id: str, max_req: int = 100, window: int = 60) -> tuple[bool, int]:
    key = f"ratelimit:sliding:{user_id}"
    now = time.time()
    window_start = now - window
    pipeline = r.pipeline()
    pipeline.zremrangebyscore(key, 0, window_start)  # remove old entries
    pipeline.zcard(key)  # current count
    count, = await pipeline.execute()
    if count >= max_req:
        return False, 0
    await r.zadd(key, {str(now): now})
    await r.expire(key, window + 1)
    return True, max_req - count - 1
```

**Fuente oficial:** https://redis.io/commands/cl.throttle/

### Alternativa de Implementación Específica

For environments without Redis, use in-process **Token Bucket** (Go: `x/time/rate`, Python: `limits`). For edge services, use **Envoy local rate limiting** or **NGINX `limit_req`** module. For high-scale distributed rate limiting, consider **Kong** or **Apache APISIX** gateway layer rate limiting.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | API protection, DDoS mitigation, tiered API plans, login brute-force prevention, resource fairness |
| **Cuándo evitar** | Internal service-to-service with trusted clients; real-time systems where rate limiting causes business failure |
| **Alternativas** | Circuit breaker for failure cascades (different goal). Backpressure for producer-consumer rate matching. Request queuing (Kafka) for async processing |
| **Coste/Complejidad** | Low — algorithm choice is simple; Redis makes distributed rate limiting easy. Track rate limit hit rates to tune parameters |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Rate limit boundary spikes with fixed window

**¿Qué ocasionó el error?**
Fixed window counter resets at clock boundaries (e.g., every minute). Clients can burst 2x the limit by sending requests just before and just after the boundary, causing backend overload.

**¿Cómo se solucionó?**
Switch to sliding window counter (logarithmic or Redis Sorted Set) or add a small random offset to window edges. Alternatively, use GCRA/Token Bucket which naturally smooths bursts.

**¿Por qué funciona esta técnica?**
Sliding window considers the last N seconds continuously rather than fixed intervals. GCRA enforces a minimum inter-arrival time, inherently limiting bursts to the burst parameter.

### Caso: Rate limiter becomes bottleneck

**¿Qué ocasionó el error?**
Distributed rate limiter using Redis for every request causes Redis CPU saturation at 100k+ requests/s. The rate limiter itself becomes the bottleneck.

**¿Cómo se solucionó?**
Implement **local token bucket** with periodic sync to Redis. Each node gets a quota (total / nodes) and refreshes every second. Use leaky bucket at the proxy layer (Envoy, NGINX) with Redis as fallback.

**¿Por qué funciona esta técnica?**
Local approximation removes Redis calls from the hot path. Periodic sync handles rebalancing when nodes join/leave. Proxy-level limiting adds a defense-in-depth layer.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "rate limiting", "rate limit algorithm", "token bucket", "sliding window", "gcra"
- **Prioridad de carga:** Media — común en APIs y sistemas de seguridad
- **Dependencias:** `distributed-cache-redis-cluster`, `bulkhead-circuit-breaker-resilience`

### Tool Integration

```json
{
  "tool_name": "rate-limiting-algorithms",
  "description": "Rate limiting algorithms (Token Bucket, Sliding Window, GCRA) and distributed implementation with Redis",
  "triggers": ["rate limiting", "rate limit", "token bucket", "throttle", "api limit"],
  "context_hint": "Load when user asks about API rate limiting, request throttling, or abuse prevention",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre rate limiting o throttling, carga el skill
rate-limiting-algorithms y responde siguiendo la sección de implementación de referencia.
Prioriza ejemplos con Redis y algoritmos concretos sobre teoría general.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Redis GCRA throttle test
redis-cli CL.THROTTLE user:42 100 100 60 1

# Measure rate limit using curl
for i in $(seq 1 120); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api
done | sort | uniq -c

# Envoy rate limit config check
curl -s http://localhost:8001/config_dump | jq '.configs[1].static_resources.listeners[0].filter_chains[0].filters[0].typed_config'

# NGINX rate limit test
ab -n 1000 -c 10 http://localhost/api/
```

### GUI / Web

- **RedisInsight** — visualize Redis rate limit keys and TTLs
- **Kong Manager** — rate limiting plugin configuration and analytics
- **Grafana** — rate limit hit/miss dashboard (redis-cell metrics)
- **Datadog** — rate limit counter metrics, throttle event tracking

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test throttle | `redis-cli CL.THROTTLE <key> ...` | RedisInsight → CLI |
| Check headers | `curl -sI <url> \| grep -i ratelimit` | DevTools → Network → Headers |
| View config | `envoy config_dump \| jq '...'` | Kong Manager → Plugins |

---

## 7. Cheatsheet Rápido

```bash
# Fixed window (simple, boundary spike risk)
INCR key; EXPIRE key window+1; check <= max

# Sliding window (Sorted Set)
ZREMRANGEBYSCORE key 0 (now-window)
ZCARD key; if < max: ZADD key now now; EXPIRE key window+1

# GCRA (token bucket via redis-cell)
CL.THROTTLE key burst rate per_unit 1 1
# response: [allowed(0/1), limit, remaining, retry_after, reset]

# Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
# Status: 429 Too Many Requests, Retry-After
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-cache-redis-cluster` | complementario — Redis for distributed rate limiting | Sí |
| `bulkhead-circuit-breaker-resilience` | complementario — different failure mode, same protection goal | No |
| `seguridad-defensiva-web` | superconjunto — rate limiting as security control | No |
| `api-idempotency-in-distributed-networks` | complementario — both use request identification | No |
| `backpressure-and-flow-control` | relacionado — flow control for producers, rate limiting for consumers | No |

---

## 9. Metadatos del Skill

```yaml
---
id: rate-limiting-algorithms
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [rate-limiting, token-bucket, sliding-window, gcra, redis, throttling, abuse-prevention]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

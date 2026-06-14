---
name: http-client-patterns
description: "HTTP client patterns for reliable API communication in distributed systems"
---
# HTTP Client Patterns

## Semantic Triggers
```
http client connection pooling and keep alive, http client retry with exponential backoff and jitter, http client circuit breaker for external apis, http client timeout and deadline configuration, http client streaming and large response handling, http client authentication bearer token and oauth2
```

---

## 1. Definición Teórica

HTTP client patterns for reliable API communication in distributed systems. They solve the problems of connection management, fault tolerance, and authentication in external API calls. Key patterns: connection pooling (reuse TCP connections), timeouts (connect, read, write), retry with exponential backoff and jitter, circuit breaker for fault isolation, and streaming for large responses.

---

## 2. Implementación de Referencia

**httpx** (Python) — modern async HTTP client with connection pooling, timeouts, and streaming. **undici** (Node.js) — fastest Node.js HTTP client. **OkHttp** (Java) — battle-tested with interceptors. **requests** (Python) — sync client with connection reuse.

### Ejemplo Práctico Avanzado

```python
import httpx
import time
import asyncio
import random
from dataclasses import dataclass

# Session with connection pooling
client = httpx.AsyncClient(
    base_url="https://api.example.com",
    timeout=httpx.Timeout(30.0, connect=5.0, read=30.0, write=30.0),
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10, keepalive_expiry=60),
    headers={"User-Agent": "my-service/1.0"},
)

# Retry with exponential backoff + jitter
async def retry_with_backoff(
    fn, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 30.0
):
    """Retry with exponential backoff and jitter. Only retry on 5xx or transport errors."""
    for attempt in range(max_retries):
        try:
            return await fn()
        except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.NetworkError) as e:
            if attempt == max_retries - 1:
                raise
            status = getattr(e, "response", None) and e.response.status_code
            if status and status < 500:  # Don't retry 4xx
                raise
            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, delay * 0.1)  # 10% jitter
            await asyncio.sleep(delay + jitter)

# Circuit breaker wrapper
class CircuitBreaker:
    def __init__(self, threshold: int = 5, recovery_timeout: float = 30.0):
        self.failures = 0
        self.threshold = threshold
        self.last_failure = 0.0
        self.state = "closed"

    async def request(self, method: str, url: str, **kwargs):
        if self.state == "open":
            if time.monotonic() - self.last_failure > 30.0:
                self.state = "half-open"
            else:
                raise CircuitBreakerOpen("Circuit breaker is open")
        try:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            self.failures = 0
            self.state = "closed"
            return response
        except (httpx.HTTPStatusError, httpx.TimeoutException, httpx.NetworkError) as e:
            self.failures += 1
            self.last_failure = time.monotonic()
            if self.failures >= self.threshold:
                self.state = "open"
            raise

# Streaming large responses
async def stream_large_file(url: str, output_path: str):
    async with client.stream("GET", url) as response:
        response.raise_for_status()
        with open(output_path, "wb") as f:
            async for chunk in response.aiter_bytes():
                f.write(chunk)

# Bearer token authentication with refresh
class TokenAuth(httpx.Auth):
    def __init__(self, token_url: str, client_id: str, client_secret: str):
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = None
        self.expires_at = 0

    async def async_auth_flow(self, request):
        if time.time() >= self.expires_at:
            await self._refresh_token()
        request.headers["Authorization"] = f"Bearer {self.token}"
        yield request

    async def _refresh_token(self):
        async with httpx.AsyncClient() as c:
            resp = await c.post(self.token_url, data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            })
            data = resp.json()
            self.token = data["access_token"]
            self.expires_at = time.time() + data.get("expires_in", 3600) - 60

# Usage
auth_client = httpx.AsyncClient(auth=TokenAuth("https://auth.example.com/token", "cid", "cs"))
```

**Fuente oficial:** https://www.python-httpx.org/advanced/

### Alternativa de Implementación Específica

**Node.js undici** — fastest HTTP client for Node.js. Use `undici.request()` with `Dispatcher`. **OkHttp** (Java) — with `RetryAndFollowUpInterceptor` and `EventListener` for observability.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | External API integrations, microservice communication, any service making HTTP requests to others |
| **Cuándo evitar** | gRPC-based services (use gRPC interceptors). Internal service mesh (Envoy handles retries/circuit breaking). Event-driven communication (use message queues) |
| **Alternativas** | gRPC for internal services (schema-based, streaming). Message queues for async. Service mesh for zero-code resilience |
| **Coste/Complejidad** | Low — httpx/undici are simple to use. Circuit breaker and retry logic add moderate complexity. Connection pooling requires one-time configuration |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Connection pool exhaustion

**¿Qué ocasionó el error?**
A service opens a new HTTP client for each request (thousands per second). The OS runs out of file descriptors. All HTTP requests fail.

**¿Cómo se solucionó?**
Use a single client instance (connection pool) for the entire application. Set `max_connections=10`, `max_keepalive_connections=5`. Use dependency injection to share the client.

**¿Por qué funciona esta técnica?**
Connection pooling reuses TCP connections. A single client manages the pool efficiently, avoiding socket leaks and FD exhaustion.

### Caso: Retries cause idempotency violation

**¿Qué ocasionó el error?**
A POST request to /api/charge times out. The client retries. Both requests succeed — the customer is charged twice.

**¿Cómo se solucionó?**
Only retry idempotent methods (GET, PUT, DELETE). For POST, require `Idempotency-Key` header. Alternatively, use automatic idempotency by embedding a unique idempotency key per request.

**¿Por qué funciona esta técnica?**
GET/PUT/DELETE are idempotent by design. Idempotency keys make POST operations safe for retry.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "http client", "httpx", "requests library", "undici", "retry pattern", "connection pooling"
- **Prioridad de carga:** Alta — esencial para cualquier servicio que haga peticiones HTTP
- **Dependencias:** `api-idempotency-in-distributed-networks`, `backpressure-and-flow-control`

### Tool Integration

```json
{
  "tool_name": "http-client-patterns",
  "description": "HTTP client patterns: connection pooling, retry with backoff, circuit breaker, streaming, auth, timeouts",
  "triggers": ["http client", "httpx", "undici", "retry", "connection pool", "circuit breaker http"],
  "context_hint": "Load when user asks about HTTP client configuration, external API integration, or resilience patterns",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre HTTP clients o integración de APIs, carga el skill
http-client-patterns. Prioriza ejemplos de httpx con connection pooling, retry
y circuit breaker sobre teoría de protocolo HTTP.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test connection reuse with httpx
python -c "import httpx; c=httpx.Client(); print(c.get('https://httpbin.org/get').status_code)"

# Check connection pool with netstat
ss -tnp | grep 443 | wc -l

# Test retry with curl
for i in 1 2 3; do
  curl --retry 3 --retry-delay 1 --retry-all-errors http://example.com/api
done

# Circuit breaker simulation (force 5xx)
curl -H "X-Fail: true" http://localhost:8000/api

# Measure connection time
curl -w "connect: %{time_connect} total: %{time_total}" -o /dev/null -s https://api.example.com
```

### GUI / Web

- **Chrome DevTools → Network** — request waterfall: DNS, TCP, TLS, TTFB
- **Datadog APM** — HTTP client spans, connection pool metrics, retry counts
- **Grafana** — HTTP client metrics: request duration, error rate, pool size, retry rate
- **Postman** — test HTTP requests with retry, auth, and timeout configurations

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo CLI |
|---|---|---|
| Test connection | `curl -w "connect: %{time_connect}" -o /dev/null -s <url>` | DevTools → Network |
| Check pool | `ss -tnp \| grep 443 \| wc -l` | Datadog → HTTP metrics |
| Retry test | `curl --retry 3 --retry-delay 1 <url>` | Postman → Pre-request script |

---

## 7. Cheatsheet Rápido

```python
# httpx essentials:
client = httpx.AsyncClient(
    base_url="https://api.example.com",
    timeout=httpx.Timeout(30.0, connect=5.0),
    limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
)

# Retry with backoff:
#   base_delay * 2^attempt + jitter(10%)
#   Retry on: 5xx, timeout, network error
#   Don't retry: 4xx (client error)

# Circuit breaker:
#   closed → failures >= threshold → open
#   open → recovery_timeout → half-open
#   half-open → success → closed | failure → open

# Timeouts:
#   Connect: 5s (network issues)
#   Read: 30s (slow response)
#   Write: 30s (slow upload)

# Connection pool: ONE instance per process, reuse
# Auth: httpx.Auth with automatic token refresh
# Streaming: client.stream("GET", url).aiter_bytes()
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `api-idempotency-in-distributed-networks` | complementario — idempotency for safe retries | Sí |
| `backpressure-and-flow-control` | complementario — circuit breaker as backpressure | Sí |
| `rest-api-design` | contexto — well-designed APIs improve client reliability | No |
| `rate-limiting-algorithms` | complementario — client respects rate limits | No |
| `oauth2-oidc-flows` | complementario — OAuth2 for client auth | No |

---

## 9. Metadatos del Skill

```yaml
---
id: http-client-patterns
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills
tags: [http-client, httpx, undici, retry, connection-pool, circuit-breaker, streaming, timeout, auth]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

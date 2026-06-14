---
name: rate-limiting-abuse-prevention
description: "Rate limiting previene el agotamiento de recursos y el abuso mediante la restricción de solicitudes en un período de tiempo"
---
# rate-limiting-abuse-prevention

## Semantic Triggers
```
rate limiting with token bucket and sliding window algorithms, API gateway rate limiting per user and per IP, Redis-based distributed rate limiting, abuse prevention with CAPTCHA and progressive challenges, DDoS mitigation with Cloudflare and AWS Shield, rate limiting in middleware for Express and FastAPI
```

---

## 1. Definición Teórica

Rate limiting previene el agotamiento de recursos y el abuso mediante la restricción de solicitudes en un período de tiempo. Algoritmos: Token Bucket (suave, permite ráfagas), Fixed Window (simple, picos en límites), Sliding Window Log (preciso, memoria intensiva), Sliding Window Counter (eficiente, Redis). Se aplica en múltiples capas: API gateway → middleware → aplicación. Las cabeceras estándar son `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 2. Implementación de Referencia

**Redis Sliding Window Counter** con **FastAPI + SlowAPI** es la implementación más eficiente. Slowapi v0.1.9+ provee decoradores para rate limiting distribuido con Redis como backend.

### Ejemplo Práctico Avanzado

```python
# Distributed rate limiter with Redis sliding window
import redis.asyncio as redis
import time
from fastapi import FastAPI, Request, HTTPException
from contextlib import asynccontextmanager

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

SLIDING_WINDOW = 60  # 60 seconds
MAX_REQUESTS = 100

async def sliding_window_check(key: str) -> bool:
    now = int(time.time())
    window_start = now - SLIDING_WINDOW

    # Remove old entries
    await r.zremrangebyscore(key, 0, window_start)

    # Count current window
    count = await r.zcard(key)

    if count >= MAX_REQUESTS:
        return False

    # Add current request + set expiry
    await r.zadd(key, {str(now): now})
    await r.expire(key, SLIDING_WINDOW * 2)
    return True

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await r.aclose()

app = FastAPI(lifespan=lifespan)

@app.get("/api")
async def api_endpoint(request: Request):
    client_key = f"ratelimit:{request.client.host}"
    if not await sliding_window_check(client_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return {"ok": True}

# Tiered limits
TIERS = {
    "free": {"rpm": 60, "rpd": 1000},
    "pro": {"rpm": 600, "rpd": 10000},
    "enterprise": {"rpm": 6000, "rpd": 100000},
}

async def get_tier_limit(api_key: str) -> dict:
    tier = await r.get(f"tier:{api_key}") or "free"
    return TIERS[tier]
```

**Fuente oficial:** https://redis.io/docs/latest/develop/use/rate-limiting/

### Alternativa de Implementación Específica

**Cloudflare Rate Limiting**: Para protección a nivel de edge. Configuración declarativa mediante WAF rules. Soporta rate limiting por IP, país, path, y headers personalizados. Ideal para DDoS mitigation sin modificar la aplicación.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier endpoint público expuesto a internet, especialmente login, registro, y APIs críticas |
| **Cuándo evitar** | Endpoints internos en redes confiables. WebSockets (usar message-level throttling) |
| **Alternativas** | Token Bucket (Golang net/http), Leaky Bucket (nginx limit_req), Fixed Window (simplicity) |
| **Coste/Complejidad** | Bajo-Medio. Redis necesario para distributed. Single-node puede usar memoria local (Simple Rate Limiter) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Rate limiting global afecta a usuarios legítimos

**¿Qué ocasionó el error?**
Rate limiting por IP global (100 req/min) bloqueaba usuarios detrás de NAT corporativo (500 empleados compartiendo IP).

**¿Cómo se solucionó?**
Implementar rate limiting híbrido: por IP (global) + por API key (usuario autenticado). Los usuarios autenticados tienen límites más altos y específicos por endpoint.

**¿Por qué funciona esta técnica?**
El rate limiting por API key identifica al usuario real, no la IP. Los límites por IP actúan como segunda capa de defensa.

### Caso: Redis failover causa rate limit reset

**¿Qué ocasionó el error?**
Al perder la conexión Redis (failover), el rate limiter permitía tráfico ilimitado hasta reconectar.

**¿Cómo se solucionó?**
Implementar circuit breaker con fallback a memoria local. Configurar `min_connections` y reintentar con backoff.

**¿Por qué funciona esta técnica?**
El fallback local mantiene una aproximación del rate limit durante la desconexión, evitando el bypass completo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "rate limiting" o "throttling" en la consulta
- **Prioridad de carga:** Alta — protección contra abuso es crítica en producción
- **Dependencias:** `04-owasp-top-10-mitigation`, `21-defensive-security-hardening`

### Tool Integration

```json
{
  "tool_name": "rate-limiting-abuse-prevention",
  "description": "Rate limiting con Redis sliding window, token bucket, y protección DDoS multi-capa",
  "triggers": ["rate limit", "throttling", "429", "DDoS", "abuse prevention", "sliding window"],
  "context_hint": "Inyectar secciones 1-2 cuando se necesite proteger endpoints contra abuso",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre rate limiting, carga el skill rate-limiting-abuse-prevention y responde
con ejemplos de sliding window counter en Redis.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test rate limiting with curl
for i in $(seq 1 120); do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/endpoint
done | sort | uniq -c

# Nginx rate limiting
echo "limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
limit_req zone=login burst=10 nodelay;" > /etc/nginx/conf.d/rate-limit.conf

# Redis monitoring
redis-cli --stat
redis-cli monitor | grep ratelimit

# iptables rate limiting
iptables -A INPUT -p tcp --dport 80 -m limit --limit 100/minute --limit-burst 200 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j DROP
```

### GUI / Web

- **Cloudflare Dashboard:** WAF rules, rate limiting, y analytics de tráfico bloqueado
- **NGINX Amplify:** Dashboard de rate limiting con alertas y métricas
- **RedisInsight:** Visualización de keys de rate limiting en Redis

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test rate limit | `for i in $(seq 1 120); do curl -w "%{http_code}" URL; done` | Cloudflare → Analytics |

---

## 7. Cheatsheet Rápido

```python
# Minimal Redis sliding window rate limiter
import redis, time
r = redis.Redis()

def check(key: str, limit: int = 100, window: int = 60) -> bool:
    now = time.time()
    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zcard(key)
    pipe.zadd(key, {now: now})
    pipe.expire(key, window * 2)
    _, count, _, _ = pipe.execute()
    return count < limit

# Usage
if check(f"ratelimit:{ip}"):
    handle_request()
else:
    return 429
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-owasp-top-10-mitigation` | Complementario — rate limiting mitiga A04 (Insecure Design) y A10 (SSRF) | Sí |
| `21-defensive-security-hardening` | Complementario — hardening incluye configuración de rate limiting en firewall | No |
| `30-bulkhead-circuit-breaker-resilience` | Complementario — circuit breaker complementa rate limiting en resiliencia | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 11-rate-limiting-abuse-prevention
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [rate-limiting, redis, sliding-window, ddos, throttling, api-gateway, abuse-prevention]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

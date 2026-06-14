---
name: api-idempotency-in-distributed-networks
description: "Idempotency ensures that applying the same request multiple times produces the same result as applying it once"
---
# API Idempotency in Distributed Networks

## Semantic Triggers
```
idempotency key based request deduplication, distributed idempotency with redis and database, idempotency key expiry and lock for concurrent requests, safe retry with idempotency key header, server side deduplication for payment and order apis, idempotency key storage and state machine
```

---

## 1. Definición Teórica

Idempotency ensures that applying the same request multiple times produces the same result as applying it once. It solves the problem of safe retries in unreliable networks. Key distinction from database idempotency (UPSERT): API idempotency uses client-generated keys (`Idempotency-Key` header) to deduplicate requests at the application layer, preserving the original response for retries.

---

## 2. Implementación de Referencia

**Stripe** popularized idempotency keys — their API is the reference implementation. Implement with **Redis** for fast storage + **PostgreSQL** for durability. **Stripe's approach**: store `(key, response_body, status_code, created_at)` with TTL = 24h.

### Ejemplo Práctico Avanzado

```python
import uuid
import time
import orjson
import redis.asyncio as redis
from dataclasses import dataclass
from enum import Enum

class IdempotencyStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class IdempotencyRecord:
    key: str
    status: IdempotencyStatus
    response_body: bytes | None = None
    status_code: int | None = None
    created_at: float = 0.0

class IdempotencyMiddleware:
    def __init__(self, r: redis.Redis, db_backend, ttl: int = 86400):
        self.r = r
        self.db = db_backend
        self.ttl = ttl

    async def process_request(self, method: str, path: str, key: str) -> dict | None:
        """Check if request has been processed. Returns stored response or None."""
        storage_key = f"idempotency:{method}:{path}:{key}"

        # Lock to prevent concurrent processing of same key
        lock_key = f"idempotency:lock:{key}"
        lock = await self.r.set(lock_key, "1", nx=True, ex=10)
        if not lock:
            raise ConflictError("Concurrent request for same idempotency key")

        stored = await self.r.get(storage_key)
        if stored:
            record = IdempotencyRecord(**orjson.loads(stored))
            # Check DB for durability (Redis could have stale data)
            db_record = await self.db.get_idempotency(key)
            if db_record:
                return {
                    "status_code": db_record["status_code"],
                    "body": db_record["response_body"],
                }

    async def store_response(self, method: str, path: str, key: str, status_code: int, body: bytes):
        """Store the response for future idempotency replay."""
        storage_key = f"idempotency:{method}:{path}:{key}"

        # Store in Redis for fast access
        record = IdempotencyRecord(
            key=key,
            status=IdempotencyStatus.COMPLETED,
            response_body=body,
            status_code=status_code,
            created_at=time.time(),
        )
        await self.r.setex(storage_key, self.ttl, orjson.dumps(record.__dict__))

        # Store in DB for durability
        await self.db.save_idempotency(
            key=key,
            method=method,
            path=path,
            status_code=status_code,
            response_body=body,
            expires_at=time.time() + self.ttl,
        )

    async def cleanup_expired(self):
        """Background job: delete expired idempotency records."""
        cutoff = time.time() - self.ttl
        await self.db.delete_expired_idempotency(cutoff)


# FastAPI integration
from fastapi import FastAPI, Request, Response, HTTPException

app = FastAPI()
idempotency = IdempotencyMiddleware(r=redis.Redis(), db_backend=some_db)

@app.post("/api/charge")
async def charge(request: Request):
    idempotency_key = request.headers.get("Idempotency-Key")
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header required")

    stored = await idempotency.process_request("POST", "/api/charge", idempotency_key)
    if stored:
        return Response(status_code=stored["status_code"], content=stored["body"])

    try:
        result = await process_charge(await request.json())
        response_body = orjson.dumps(result)
        await idempotency.store_response("POST", "/api/charge", idempotency_key, 200, response_body)
        return Response(content=response_body, status_code=200)
    except Exception as e:
        await idempotency.store_response("POST", "/api/charge", idempotency_key, 500, str(e).encode())
        raise
```

**Fuente oficial:** https://stripe.com/docs/api/idempotent_requests

### Alternativa de Implementación Específica

For simpler use cases, use **PostgreSQL unique constraint** on `(idempotency_key, method, path)` instead of Redis. The DB enforces uniqueness; the API returns the stored row on conflict. Use `INSERT ... ON CONFLICT DO NOTHING` for atomicity.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Payment processing, order creation, any mutating API where retries can cause duplicate side effects (charges, emails, shipments) |
| **Cuándo evitar** | Idempotent-by-nature operations (GET, PUT/DELETE where request contains the full state). Read-only endpoints |
| **Alternativas** | Database UPSERT (idempotent by key). Saga pattern compensating transactions. Event sourcing + deduplication |
| **Coste/Complejidad** | Low — middleware pattern is straightforward. Storage cost is minimal (keys expire after TTL). Main complexity is handling edge cases: concurrent requests, cleanup, and consistency between Redis and DB |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Concurrent requests with same idempotency key

**¿Qué ocasionó el error?**
Two identical requests arrive simultaneously (network retry + original). Both pass the idempotency check simultaneously (race condition). Both process the payment, causing double charge.

**¿Cómo se solucionó?**
Use a **distributed lock** (Redis SET NX EX) on the idempotency key before processing. The first request acquires the lock and processes; the second waits or returns 409 Conflict.

**¿Por qué funciona esta técnica?**
The lock ensures only one request processes for a given idempotency key. The lock has a short TTL (10s) so it releases even if the first request crashes.

### Caso: Idempotency key collision when old key is reused

**¿Qué ocasionó el error?**
A client reuses an old idempotency key after the TTL expires (24h later). The server doesn't find the old record (expired). It processes the new request as a fresh operation — the "idempotency guarantee" is broken.

**¿Cómo se solucionó?**
Clients must generate unique keys per request (UUIDv4). Server should reject keys that look like patterns (sequential IDs). Increase TTL to 7 days for payment keys.

**¿Por qué funciona esta técnica?**
UUIDv4 has negligible collision probability. Rejection of predictable keys prevents accidental reuse. Extended TTL covers the client's retry window.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "idempotency", "idempotency key", "request deduplication", "safe retry", "stripe idempotency"
- **Prioridad de carga:** Alta — crucial para APIs de mutación en sistemas distribuidos
- **Dependencias:** `distributed-locking-redlock`, `distributed-cache-redis-cluster`

### Tool Integration

```json
{
  "tool_name": "api-idempotency-in-distributed-networks",
  "description": "API idempotency with key-based deduplication, Redis + DB storage, concurrent request locking, and safe retry patterns",
  "triggers": ["idempotency", "idempotency key", "request deduplication", "safe retry", "stripe"],
  "context_hint": "Load when user asks about API idempotency, safe retries, or deduplication patterns",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre idempotency o safe retries, carga el skill
api-idempotency-in-distributed-networks. Prioriza el patrón Stripe-style con
Redis + DB storage y lock para concurrencia.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test idempotency with curl
KEY=$(uuidgen)
curl -X POST -H "Idempotency-Key: $KEY" -d '{"amount": 100}' http://localhost:8000/api/charge
curl -X POST -H "Idempotency-Key: $KEY" -d '{"amount": 100}' http://localhost:8000/api/charge
# Both should return same response

# Check stored key in Redis
redis-cli KEYS "idempotency:*"

# Check in PostgreSQL
psql -c "SELECT * FROM idempotency_keys WHERE key = '$KEY';"

# Concurrent request test
KEY=$(uuidgen)
curl -X POST -H "Idempotency-Key: $KEY" -d '{}' http://localhost:8000/api/charge &
curl -X POST -H "Idempotency-Key: $KEY" -d '{}' http://localhost:8000/api/charge &
wait
```

### GUI / Web

- **RedisInsight** — inspect idempotency keys and TTLs
- **Stripe Dashboard** — payment attempts by idempotency key (reference implementation)
- **Datadog** — idempotency hit/miss metrics, deduplication rate, lock contention
- **PostgreSQL pgAdmin** — idempotency_key table and unique constraint validation

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generate key | `KEY=$(uuidgen); curl -H "Idempotency-Key: $KEY"` | Stripe Dashboard → Payments |
| Test replay | `curl -H "Idempotency-Key: same-key" -X POST <url>` | RedisInsight → Browser |
| Check storage | `redis-cli KEYS "idempotency:*"` | pgAdmin → idempotency_keys |

---

## 7. Cheatsheet Rápido

```python
# Idempotency flow:
# 1. Client generates UUIDv4 → Idempotency-Key header
# 2. Server checks Redis/DB for existing key
# 3. If found: return original response (replay)
# 4. If not found: process, store response, return
# 5. TTL = 24h default (7d for payments)

# Locking (prevent concurrent processing):
lock = redis.SET key NX EX 10  # 10s lock
if not lock: return 409 Conflict

# Storage key: idempotency:{method}:{path}:{key}
# DB schema: idempotency_keys (key, method, path, status_code, response_body, expires_at)

# Headers:
#   Request: Idempotency-Key: <uuid>
#   Response: Idempotent-Replayed: true (if replayed)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-cache-redis-cluster` | complementario — Redis for idempotency storage | Sí |
| `distributed-locking-redlock` | complementario — lock for concurrent request protection | Sí |
| `saga-pattern-distributed-coordination` | complementario — idempotency in saga steps | No |
| `rate-limiting-algorithms` | complementario — rate limiting + idempotency for API protection | No |
| `outbox-inbox-patterns` | relacionado — outbox pattern uses idempotency for delivery | No |

---

## 9. Metadatos del Skill

```yaml
---
id: api-idempotency-in-distributed-networks
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [idempotency, idempotency-key, deduplication, safe-retry, stripe, redis, distributed-api]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

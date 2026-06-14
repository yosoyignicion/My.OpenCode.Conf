---
name: session-management-stateless-vs-stateful
description: "Stateful sessions store data on the server (memory or Redis); stateless sessions encode all data into a token (JWT) sent by the client"
---
# Session Management — Stateless vs Stateful

## Semantic Triggers
```
stateless session with jwt and token based auth, stateful session with redis or database storage, session affinity vs stateless scaling tradeoffs, session security rotation and invalidation, distributed session store with redis cluster, refresh token rotation and secure cookie practices
```

---

## 1. Definición Teórica

Stateful sessions store data on the server (memory or Redis); stateless sessions encode all data into a token (JWT) sent by the client. They solve the problem of maintaining user state across HTTP requests. Key distinction: stateful sessions can be explicitly revoked and support large payloads but require centralized storage; stateless sessions scale horizontally without storage but cannot be revoked and are limited to small payloads (~4KB).

---

## 2. Implementación de Referencia

**JWT** (JSON Web Tokens) for stateless sessions. **Redis** for stateful session stores. **Connect-Redis** (Express), **Django Session** with Redis cache, **AWS DynamoDB** for serverless session storage. **Auth0** and **Clerk** for managed auth with session management.

### Ejemplo Práctico Avanzado

```python
import jwt
import uuid
import time
import redis.asyncio as redis
from dataclasses import dataclass
from datetime import datetime, timedelta

# ========== JWT Stateless Session ==========
JWT_SECRET = "your-256-bit-secret"
JWT_ALGORITHM = "HS256"

def create_tokens(user_id: str, role: str) -> dict:
    """Create access + refresh token pair."""
    now = datetime.utcnow()
    access_payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=15),
        "type": "access",
        "jti": str(uuid.uuid4()),  # token ID for tracking
    }
    refresh_payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=7),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return {
        "access_token": jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM),
        "refresh_token": jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM),
        "expires_in": 900,  # 15 minutes
    }

def verify_token(token: str, expected_type: str = "access") -> dict | None:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def refresh_access_token(refresh_token: str) -> dict | None:
    """Rotate refresh token (old becomes invalid)."""
    payload = verify_token(refresh_token, "refresh")
    if not payload:
        return None
    # Create new token pair (rotation invalidates old refresh)
    return create_tokens(payload["sub"], payload.get("role", "user"))


# ========== Stateful Redis Session ==========
class RedisSessionStore:
    def __init__(self, r: redis.Redis, ttl: int = 3600):
        self.r = r
        self.ttl = ttl

    async def create(self, user_id: str, data: dict) -> str:
        """Create a new session and return session ID."""
        session_id = str(uuid.uuid4())
        key = f"session:{session_id}"
        session_data = {
            "user_id": user_id,
            "created_at": time.time(),
            **data,
        }
        await self.r.hset(key, mapping=session_data)
        await self.r.expire(key, self.ttl)
        return session_id

    async def get(self, session_id: str) -> dict | None:
        """Get session data."""
        key = f"session:{session_id}"
        data = await self.r.hgetall(key)
        if not data:
            return None
        # Extend TTL on access (sliding expiration)
        await self.r.expire(key, self.ttl)
        return data

    async def update(self, session_id: str, data: dict):
        """Update session data fields."""
        key = f"session:{session_id}"
        exists = await self.r.exists(key)
        if not exists:
            raise SessionNotFound()
        await self.r.hset(key, mapping=data)
        await self.r.expire(key, self.ttl)

    async def delete(self, session_id: str):
        """Explicitly invalidate session."""
        await self.r.delete(f"session:{session_id}")

    async def delete_all_for_user(self, user_id: str):
        """Invalidate all sessions for a user (e.g., password change)."""
        async for key in self.r.scan_iter(match="session:*"):
            if await self.r.hget(key, "user_id") == user_id:
                await self.r.delete(key)


# ========== Secure Cookie Configuration ==========
SECURE_COOKIE_CONFIG = {
    "httponly": True,    # Not accessible via JavaScript
    "secure": True,      # HTTPS only
    "samesite": "lax",   # CSRF protection
    "max_age": 900,      # 15 minutes
    "path": "/",
}
```

**Fuente oficial:** https://jwt.io/introduction

### Alternativa de Implementación Específica

**DynamoDB Sessions** — serverless session store with TTL. No Redis cluster needed. Use `aws-sdk` with `TableName=sessions` and `TTLAttributeName=ttl`. Auto-expires items. **PostgreSQL sessions** — for small deployments, session store via `CREATE TABLE sessions (id TEXT PRIMARY KEY, data JSONB, expires_at TIMESTAMPTZ)`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | JWT for stateless APIs, mobile apps, microservices (no session affinity). Redis sessions for server-rendered apps, large session data, or when revocation is required |
| **Cuándo evitar** | JWT for sensitive operations without refresh token rotation. Redis sessions for serverless (use DynamoDB). Stateful sessions for services that auto-scale without sticky sessions |
| **Alternativas** | DynamoDB session store (serverless). PostgreSQL session store (simple). Magic Link / OAuth (no session management). Clerk/Auth0 (managed) |
| **Coste/Complejidad** | Low — JWT is simple (but revocation requires a blocklist). Redis sessions require Redis cluster for HA. Cookie security configuration requires attention (HttpOnly, Secure, SameSite) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: JWT token stolen — cannot revoke

**¿Qué ocasionó el error?**
An attacker steals a user's JWT access token (via XSS or network interception). The token is valid for 15 minutes. The server cannot revoke it because JWTs are self-contained — no server-side state.

**¿Cómo se solucionó?**
Use short-lived access tokens (5-15 min) with refresh token rotation. Implement a blocklist in Redis for revoked tokens. Use refresh token rotation (old refresh becomes invalid on use).

**¿Por qué funciona esta técnica?**
Short TTL limits the damage window. Refresh token rotation ensures that even if the refresh token is stolen, the first legitimate use invalidates the stolen token. Blocklist adds server-side control for high-security scenarios.

### Caso: Redis session store overloaded

**¿Qué ocasionó el error?**
A flash sale causes 100x normal traffic. The Redis session store can't handle the connection surge. New sessions fail to create, users get logged out.

**¿Cómo se solucionó?**
Use Redis Cluster with read replicas. Set `max_connections=100` per process and use a connection pool. Implement circuit breaker for session operations — fall back to read-only mode or database-backed sessions.

**¿Por qué funciona esta técnica?**
Redis Cluster distributes load across shards. Connection pooling reuses connections. Circuit breaker prevents cascading failure by failing fast when Redis is overwhelmed.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "session management", "jwt", "stateful session", "stateless session", "session store"
- **Prioridad de carga:** Alta — fundamental para autenticación web
- **Dependencias:** `distributed-cache-redis-cluster`, `oauth2-oidc-flows`

### Tool Integration

```json
{
  "tool_name": "session-management-stateless-vs-stateful",
  "description": "Session management patterns: JWT stateless, Redis stateful, refresh token rotation, cookie security",
  "triggers": ["session management", "jwt", "stateful session", "stateless session", "refresh token"],
  "context_hint": "Load when user asks about session management, JWT, authentication patterns, or session storage",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre session management o JWT, carga el skill
session-management-stateless-vs-stateful. Prioriza la comparación JWT vs Redis sessions
y refresh token rotation sobre teoría de tokens.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Decode JWT without verification
echo "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNqPnd9cGQ_2lqT3k0vTg8" | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Check JWT expiration
python3 -c "import jwt; d=jwt.decode(open('token.txt').read(), options={\"verify_signature\":False}); print(d)"

# Redis session check
redis-cli KEYS "session:*" | head -5
redis-cli HGETALL "session:abc123"

# Check cookie attributes
curl -sI https://example.com | grep -i set-cookie

# Test session affinity
for i in $(seq 1 10); do curl -s -b "session=abc" http://localhost/api; done
```

### GUI / Web

- **jwt.io** — JWT debugger: decode, verify, and inspect token payload
- **RedisInsight** — session store inspection, key TTLs, memory usage
- **Chrome DevTools** → Application → Cookies — view cookie name, value, Secure, HttpOnly, SameSite attributes
- **Auth0 Dashboard** — session management, token lifetime, refresh token rotation configuration

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Decode JWT | `echo <token> \| cut -d. -f2 \| base64 -d` | jwt.io → Encoded → Decoded |
| Check cookie | `curl -sI <url> \| grep Set-Cookie` | DevTools → Application → Cookies |
| Redis session | `redis-cli HGETALL session:...` | RedisInsight → Browser → session:* |

---

## 7. Cheatsheet Rápido

```python
# JWT (stateless):
#   Access: 15min TTL, includes sub/exp/iat/type
#   Refresh: 7d TTL, rotation invalidates old
#   Cannot revoke (without blocklist)

# Redis session (stateful):
#   session:{id} → hset user_id, data, created_at
#   Sliding expiration: extend TTL on access
#   Can revoke: DELETE session:{id}

# Cookie config:
#   HttpOnly=true  (no JS access)
#   Secure=true    (HTTPS only)
#   SameSite=Lax   (CSRF protection)

# Security:
#   Rotate session ID on privilege escalation
#   Invalidate all user sessions on password change
#   Keep JWT < 4KB
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-cache-redis-cluster` | implementación — Redis as session store | Sí |
| `oauth2-oidc-flows` | superconjunto — OAuth2 uses tokens for session management | Sí |
| `api-idempotency-in-distributed-networks` | complementario — idempotency keys use similar storage | No |
| `data-encryption-in-transit-mtls` | complementario — HTTPS for cookie transport security | No |
| `seguridad-defensiva-web` | complementario — CSRF, XSS protection for sessions | No |

---

## 9. Metadatos del Skill

```yaml
---
id: session-management-stateless-vs-stateful
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [session-management, jwt, stateless, stateful, redis, cookies, refresh-token, auth]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

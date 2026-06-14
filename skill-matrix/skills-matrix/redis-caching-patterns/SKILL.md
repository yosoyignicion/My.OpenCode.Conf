---
name: redis-caching-patterns
description: "Redis resuelve el problema de acceso a datos con latencia sub-milisegundo mediante una base de datos en memoria con estructuras de datos ricas"
---
# redis-caching-patterns

## Semantic Triggers
```
Redis cache-aside lazy loading pattern, distributed lock SET NX EX redlock, rate limiter sliding window INCR EXPIRE, Redis Streams XADD XREADGROUP consumer group, pub/sub publish subscribe channel, pipelining SCAN cluster hash tags
```

---

## 1. Definición Teórica

Redis resuelve el problema de acceso a datos con latencia sub-milisegundo mediante una base de datos en memoria con estructuras de datos ricas. El principio fundamental es que los datos se almacenan en RAM como pares clave-valor con tipos avanzados (strings, hashes, lists, sets, sorted sets, streams), ofreciendo operaciones atómicas sobre esas estructuras. Arquitectónicamente, Redis se usa como capa de caché (cache-aside, write-through), coordinación distribuida (locks, rate limiters), colas de mensajes (streams, pub/sub) y sesiones. Existe como infraestructura crítica entre la aplicación y la base de datos persistente, absorbiendo picos de lectura y coordinando acceso concurrente.

## 2. Implementación de Referencia

La implementación recomendada usa `redis.asyncio` (Python) o `ioredis` (Node.js) con patrones: cache-aside (lazy load + TTL), distributed locks (`SET NX EX`), rate limiting (sliding window), streams (cola de mensajes fiable), pub/sub (notificaciones en tiempo real). Keys naming: `resource:id:field`. Siempre TTL. Nunca `KEYS` en producción — usar `SCAN`.

### Ejemplo Práctico Avanzado

```python
import redis.asyncio as redis
r = redis.Redis.from_url("redis://localhost:6379/0")

# Cache-aside (lazy loading)
async def get_user(user_id: int) -> dict | None:
    key = f"user:{user_id}"
    cached = await r.get(key)
    if cached: return orjson.loads(cached)
    user = await fetch_from_db(user_id)
    if user: await r.setex(key, 300, orjson.dumps(user))
    return user

# Distributed lock (prevent double-execution)
lock_key = f"lock:process:{order_id}"
locked = await r.set(lock_key, "1", nx=True, ex=30)
if not locked: raise AlreadyProcessingError()
try: await process_order(order_id)
finally: await r.delete(lock_key)

# Rate limiter — sliding window
async def check_rate_limit(user_id: str, max_req: int = 100, window: int = 60) -> bool:
    key = f"ratelimit:{user_id}:{int(time.time() / window)}"
    count = await r.incr(key)
    if count == 1: await r.expire(key, window + 1)
    return count <= max_req

# Redis Streams — reliable message queue
async def produce(stream: str, data: dict):
    await r.xadd(stream, data, maxlen=10000)
async def consume(stream: str, group: str, consumer: str):
    while True:
        msgs = await r.xreadgroup(group, consumer, {stream: ">"}, count=10, block=2000)
        for msg_id, fields in msgs:
            try: await process(fields); await r.xack(stream, group, msg_id)
            except TemporaryError: pass
```

**Fuente oficial:** https://redis.io/docs/ — https://redis.io/docs/data-types/streams/

### Alternativa de Implementación Específica

Para caché con invalidación automática por tiempo (TTL + maxmemory), usar `Redis` con política `allkeys-lru` o `volatile-lru`. Para colas de mensajes que requieren persistencia garantizada y re-procesamiento, Redis Streams es superior a pub/sub (no persistente). Para rate limiting con ventana deslizante precisa (no por bucket), usar Sorted Set con `ZREMRANGEBYSCORE` + `ZCOUNT`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Caché de consultas DB, rate limiting, locks distribuidos, colas temporales, sesiones de usuario, real-time pub/sub |
| **Cuándo evitar** | Almacenamiento primario de datos (Redis no es durable por defecto); colas que requieren garantías exactly-once; datos >50GB sin cluster (coste RAM); análisis complejos (usar base de datos dedicada) |
| **Alternativas** | Memcached: caché simple, multi-thread, sin persistencia ni tipos avanzados; RabbitMQ: colas con routing complejo, AMQP nativo; Dragonfly: Redis-compatible, multi-thread, mayor throughput; Valkey: fork open-source de Redis |
| **Coste/Complejidad** | Bajo para cache-aside simple; medio para streams (consumer groups, backoff); alto para cluster mode (cross-slot routing, resharding). RAM es cara — monitorear `used_memory` vs `maxmemory` |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Conexiones Redis se agotan en producción

**¿Qué ocasionó el error?**
Cada request abre una nueva conexión Redis sin pool. El límite `maxclients` de Redis (default 10000) se alcanza.

**¿Cómo se solucionó?**
Usar pool de conexiones:
```python
r = redis.Redis.from_url("redis://localhost:6379/0", max_connections=50)
# redis.asyncio usa pool interno automático
```

**¿Por qué funciona esta técnica?**
El pool reutiliza conexiones TCP en lugar de abrir una nueva por request. Redis asyncio tiene pool por defecto; redis-py (sync) requiere `ConnectionPool` explícito.

### Caso: Redis Stream consumer no recibe mensajes nuevos

**¿Qué ocasionó el error?**
El consumer group se creó pero el stream ya tenía mensajes anteriores. `XREADGROUP` con `>` devuelve solo mensajes nuevos, no históricos.

**¿Cómo se solucionó?**
```python
# Para leer mensajes pendientes (históricos) + nuevos
msgs = await r.xreadgroup(group, consumer, {stream: ">"}, count=10, block=2000)
# Para reclamar mensajes pendientes de otros consumers (timeout)
pending = await r.xpending(stream, group)
```

**¿Por qué funciona esta técnica?**
`>` indica "mensajes nunca entregados a ningún consumer". `xpending` recupera mensajes entregados pero no acknowledged para re-procesamiento.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** Caché Redis, rate limiting, distributed lock, message queue con streams
- **Prioridad de carga:** Alta — Redis es ubicuo en sistemas distribuidos
- **Dependencias:** Complementario con `background-jobs-queues` (Redis como broker de Celery/BullMQ)

### Tool Integration

```json
{
  "tool_name": "redis-caching-patterns",
  "description": "Implementa patrones Redis: cache-aside, distributed locks, rate limiting, streams y pub/sub",
  "triggers": ["redis", "cache", "rate limit", "distributed lock", "redis streams", "pub/sub"],
  "context_hint": "Inyectar ejemplos de cache-aside + streams cuando el usuario necesite caché o colas; FAQ para errores de conexión",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre caché o colas con Redis, carga el skill redis-caching-patterns y responde
siguiendo la sección de implementación de referencia con ejemplos concretos del patrón requerido.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Conectar y comandos básicos
redis-cli -h localhost -p 6379
redis-cli PING                              # → PONG
redis-cli SET user:1 '{"name":"alice"}' EX 300

# Monitoreo en tiempo real
redis-cli MONITOR                           # todas las operaciones
redis-cli --latency                         # latencia en vivo
redis-cli --stat                            # stats cada segundo

# Información de servidor
redis-cli INFO memory                       # used_memory, fragmentation
redis-cli INFO stats                        # hits, misses, commands
redis-cli SLOWLOG GET 10                    # slow queries > 10ms

# Keys scanning (nunca KEYS en prod)
redis-cli --scan --pattern 'user:*'
redis-cli SCAN 0 MATCH user:* COUNT 100

# Streams
redis-cli XADD mystream * field1 value1
redis-cli XREAD COUNT 5 STREAMS mystream 0

# Rate limiter test
redis-cli INCR ratelimit:test:$(date +%s)
```

### GUI / Web

- **RedisInsight:** GUI oficial de Redis — navegación de keys, visualización de streams, slowlog, CLI integrado
- **VSCode:** Redis extension (tree view de keys, publish/subscribe viewer)
- **Redis Stack:** Redis con módulos: JSON, Search (full-text), TimeSeries, Bloom
- **Redis Cloud:** Dashboard web con metrics, alerts, backup schedule, auto-failover
- **Medis (macOS):** cliente GUI nativo con tree view y consola

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Connect | `redis-cli` | Ctrl+Shift+P → Redis: Connect |
| Monitor | `redis-cli MONITOR` | RedisInsight CLI panel |
| Scan keys | `redis-cli --scan` | Tree view (RedisInsight) |
| Slowlog | `redis-cli SLOWLOG GET` | Performance tab |
| Flush DB | `redis-cli FLUSHDB` | Right-click → Flush |

---

## 7. Cheatsheet Rápido

```bash
redis-cli SET key value EX 300 NX          # set if not exists + TTL
redis-cli GET key && redis-cli DEL key     # get + delete
redis-cli INCR counter && redis-cli EXPIRE counter 60
redis-cli XADD stream * field val          # produce stream
redis-cli XREADGROUP group consumer STREAMS stream >
redis-cli --scan --pattern 'user:*'
```

```python
r.setex("key", 300, value)                 # cache-aside set
r.set("lock:key", "1", nx=True, ex=30)     # distributed lock
r.incr("counter"); r.expire("counter", 60) # rate limit
r.xadd("stream", data)                     # produce
r.xreadgroup(group, consumer, {s: ">"})    # consume
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `background-jobs-queues` | Dependiente — Celery/BullMQ usan Redis como broker por defecto | Sí |
| `postgresql-advanced` | Complementario — caché de consultas PostgreSQL pesadas | No |
| `async-python-concurrency` | Complementario — redis.asyncio para clientes async | Sí |
| `rate-limiting-algorithms` | Complementario — implementación con Redis INCR/EXPIRE | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: redis-caching-patterns
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/redis
tags: [redis, cache, caching, distributed-lock, rate-limiting, streams, pub-sub, redis-py]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

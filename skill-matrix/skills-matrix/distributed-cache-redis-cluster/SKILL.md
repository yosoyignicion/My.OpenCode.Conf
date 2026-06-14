---
name: distributed-cache-redis-cluster
description: "Redis Cluster automatically shards data across 16384 hash slots, each node owning a subset"
---
# Distributed Cache & Redis Cluster

## Semantic Triggers
```
redis cluster hash slots and cross slot commands, distributed caching cache aside and write through, redis sentinel vs cluster mode comparison, redis lua scripts for atomic operations, redis configuration connection pooling and pipelining, redis eviction policies lru lfu and ttl
```

---

## 1. Definición Teórica

Redis Cluster automatically shards data across 16384 hash slots, each node owning a subset. It solves the problem of scaling Redis beyond a single node's memory. Key distinction from Redis Sentinel: Cluster provides both sharding and availability (no single-node bottleneck), while Sentinel provides only availability for a single-node instance. Eviction policies (allkeys-lru, volatile-lru, allkeys-lfu) manage memory pressure when maxmemory is reached.

---

## 2. Implementación de Referencia

**Redis 7.4** — latest stable with Redis Cluster, ACLs, and Redis Functions. **Redis Stack** — includes RedisJSON, RedisSearch, RedisTimeSeries. **RedisInsight** — GUI for monitoring.

### Ejemplo Práctico Avanzado

```python
import redis.asyncio as redis
import orjson
import time

# Redis Cluster connection
async def create_cluster_client():
    r = redis.RedisCluster(
        host="localhost",
        port=6379,
        password="optional-password",
        decode_responses=True,
    )
    return r

r = redis.Redis.from_url("redis://localhost:6379/0", decode_responses=True)

# Cache-aside (lazy loading)
async def get_user(user_id: int) -> dict | None:
    key = f"user:{user_id}:profile"
    cached = await r.get(key)
    if cached:
        return orjson.loads(cached)
    user = await fetch_from_db(user_id)
    if user:
        await r.setex(key, 300, orjson.dumps(user))  # 5 min TTL
    return user

# Write-through cache
async def update_user(user_id: int, data: dict):
    # Write to DB first
    await update_db(user_id, data)
    # Update cache synchronously
    await r.setex(f"user:{user_id}:profile", 300, orjson.dumps(data))

# Distributed lock
async def acquire_lock(name: str, ttl: int = 30) -> bool:
    lock_key = f"lock:{name}:{int(time.time() // ttl)}"
    return bool(await r.set(lock_key, "1", nx=True, ex=ttl))

# Rate limiter — sliding window
async def check_rate_limit(user_id: str, max_req: int = 100, window: int = 60) -> bool:
    key = f"ratelimit:{user_id}:{int(time.time() / window)}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, window + 1)
    return count <= max_req

# Pipelining for batch operations
async def batch_get_users(user_ids: list[int]) -> dict[int, dict]:
    async with r.pipeline() as pipe:
        for uid in user_ids:
            await pipe.get(f"user:{uid}:profile")
        results = await pipe.execute()
    return {uid: orjson.loads(v) for uid, v in zip(user_ids, results) if v}

# Redis Streams for reliable message queue
async def produce(stream: str, data: dict):
    await r.xadd(stream, data, maxlen=10000)

async def consume(stream: str, group: str, consumer: str):
    try:
        await r.xgroup_create(stream, group, id="0", mkstream=True)
    except redis.ResponseError:
        pass  # group exists
    messages = await r.xreadgroup(group, consumer, {stream: ">"}, count=10, block=2000)
    for msg_id, data in messages:
        await process(data)
        await r.xack(stream, group, msg_id)

# Lua script for atomic counter with reset
SCRIPT = """
local key = KEYS[1]
local ttl = ARGV[1]
local max = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, ttl)
end
return {current, max}
"""
```

**Fuente oficial:** https://redis.io/docs/manual/cluster-tutorial/

### Alternativa de Implementación Específica

**Redis Sentinel** — for high-availability single-node Redis (<10GB, <200k ops/s). **Dragonfly** — Redis-compatible, multi-threaded, higher throughput. **KeyDB** — multi-threaded Redis fork with Active Replication.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Distributed caching of database queries, session stores, rate limiting, pub/sub, leaderboards, real-time counters |
| **Cuándo evitar** | Persistent storage (Redis is primarily in-memory cache), complex queries (use database), >100GB datasets (consider Dragonfly/KeyDB) |
| **Alternativas** | Memcached (simpler, no persistence/persistence). Dragonfly (higher throughput). Hazelcast (Java ecosystem cache). Local caching (caffeine, lru_cache) |
| **Coste/Complejidad** | Low — Redis is simple to operate. Cluster adds moderate complexity (cross-slot awareness, resharding). Memory cost is the main expense |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Cross-slot command failure in Cluster mode

**¿Qué ocasionó el error?**
A Lua script or pipeline accesses multiple keys that hash to different slots. Redis Cluster returns `CROSSSLOT` error. The operation fails entirely.

**¿Cómo se solucionó?**
Use hash tags to force keys into the same slot: `{user:42}:cart`, `{user:42}:orders`. Or iterate keys grouped by slot and execute separate operations per node.

**¿Por qué funciona esta técnica?**
Hash tags `{...}` are the only part of the key used for slot calculation. Keys with the same hash tag land on the same node, enabling multi-key operations.

### Caso: Redis memory saturation

**¿Qué ocasionó el error?**
Cache keys grow beyond `maxmemory` without proper eviction policy. Redis starts evicting aggressively, causing cache miss storms and database overload.

**¿Cómo se solucionó?**
Set `maxmemory` and `maxmemory-policy allkeys-lfu`. Monitor `evicted_keys` metric. Tune TTLs and implement size limits per key type.

**¿Por qué funciona esta técnica?**
`allkeys-lfu` evicts the least frequently used keys when memory is full. Combined with TTL-based expiration, this keeps hot data in cache while cold data is evicted.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "redis", "redis cluster", "caching", "cache aside", "redis sentinel", "lru eviction"
- **Prioridad de carga:** Alta — fundamental para rendimiento y escalado
- **Dependencias:** `consistent-hashing-topologies`, `rate-limiting-algorithms`

### Tool Integration

```json
{
  "tool_name": "distributed-cache-redis-cluster",
  "description": "Redis Cluster for distributed caching: cache-aside, write-through, pipelining, Lua scripting, eviction policies",
  "triggers": ["redis", "redis cluster", "caching", "cache aside", "redis sentinel", "lru", "lfu"],
  "context_hint": "Load when user asks about caching, Redis, or distributed data store patterns",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Redis, caching o Redis Cluster, carga el skill
distributed-cache-redis-cluster. Prioriza patrones de cache-aside, pipelining
y eviction policies sobre teoría de cluster.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Redis Cluster
redis-cli -c -p 6379
redis-cli CLUSTER INFO
redis-cli CLUSTER NODES
redis-cli CLUSTER KEYSLOT user:42

# Scan keys (never KEYS)
redis-cli --scan --pattern "user:*" | head -20

# Monitor & slow log
redis-cli MONITOR | grep "user:"
redis-cli SLOWLOG GET 10

# Memory info
redis-cli INFO memory | grep -E "used_memory|maxmemory|evicted"

# Pipelining with redis-cli
(echo "PING"; echo "GET user:42:profile"; echo "QUIT") | redis-cli --pipe -h localhost

# Sentinel
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

### GUI / Web

- **RedisInsight** — cluster topology, key browser, memory analysis, slow log, real-time monitor
- **Redis Enterprise Admin** — cluster management, shard rebalancing, active-passive geo-replication
- **Grafana** — Redis dashboard (ID 11835): hit rate, eviction rate, latency, memory fragmentation
- **Redis Commander** — simple web UI for key management and monitoring

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Cluster info | `redis-cli CLUSTER INFO` | RedisInsight → Cluster |
| Key scan | `redis-cli --scan --pattern "user:*"` | RedisInsight → Browser |
| Monitor | `redis-cli PING` | RedisInsight → CLI |
| Eviction | `redis-cli INFO memory \| grep evicted` | Grafana → Redis Dashboard |

---

## 7. Cheatsheet Rápido

```bash
# Redis key naming: resource:id:field (e.g., user:42:profile)
# Always set TTL: SETEX key ttl value or EXPIRE after SET

# Cache patterns:
#   Cache-aside: get → miss → DB → setex
#   Write-through: DB write → setex
#   Write-behind: setex → async DB write
#   Cache-aside + TTL is the most common

# Cluster: 16384 hash slots, cross-slot ops need hash tags {key}
#   SET {user:42}:cart  OK  # hash tag forces same slot

# Eviction: allkeys-lfu (default), volatile-lru, allkeys-lru
# Pipelining: batch independent commands, no atomicity
# Lua: EVAL "script" 1 key1 key2 arg1 arg2
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `consistent-hashing-topologies` | implementación — Redis Cluster uses hash slots | Sí |
| `rate-limiting-algorithms` | complementario — Redis for rate limiting counters | Sí |
| `distributed-locking-redlock` | complementario — Redis for distributed locks | No |
| `distributed-queues-rabbitmq-amqp` | alternativo — Redis Streams vs RabbitMQ | No |
| `session-management-stateless-vs-stateful` | complementario — Redis for session store | No |

---

## 9. Metadatos del Skill

```yaml
---
id: distributed-cache-redis-cluster
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills
tags: [redis, redis-cluster, caching, cache-aside, lru, lfu, pipelining, lua, distributed-cache]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

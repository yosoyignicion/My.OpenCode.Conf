---
name: distributed-locking-redlock
description: "Distributed locks coordinate access to shared resources across processes"
---
# Distributed Locking & Redlock

## Semantic Triggers
```
distributed lock with redis redlock algorithm, set nx ex vs redlock multi node fencing, distributed lock fencing tokens for safety, lease timeout and lock extension patterns, distributed lock with etcd or zookeeper, preventing split brain with distributed locks
```

---

## 1. Definición Teórica

Distributed locks coordinate access to shared resources across processes. Redlock uses N independent Redis nodes (N=5) to grant locks only if a majority agrees within a timeout. It solves the problem of mutual exclusion in distributed systems without a single point of failure. Key distinction over single-node locks: Redlock tolerates up to (N-1)/2 node failures while providing safety if clock drift is bounded and clients release locks gracefully.

---

## 2. Implementación de Referencia

**Redis** `SET NX EX` for single-node locks. **Redlock** via `redis-py` or **Redisson** (Java). For consensus-based locks, **etcd** with `concurrency/stm` or **ZooKeeper** with ephemeral sequential nodes. **Hashicorp consul** also provides distributed locking via sessions.

### Ejemplo Práctico Avanzado

```python
import uuid
import time
import redis.asyncio as redis
import asyncio

class Redlock:
    def __init__(self, nodes: list[redis.Redis], ttl: int = 10000, retry_delay: float = 0.2, retry_count: int = 3):
        self.nodes = nodes
        self.ttl = ttl  # ms
        self.retry_delay = retry_delay
        self.retry_count = retry_count
        self.quorum = len(nodes) // 2 + 1

    async def acquire(self, key: str, ttl: int | None = None) -> tuple[str | None, str | None]:
        """Returns (lock_id, lock_value) or (None, None) on failure."""
        val = str(uuid.uuid4())
        expiry = ttl or self.ttl
        for attempt in range(self.retry_count):
            n_ok = 0
            start = time.monotonic() * 1000
            for node in self.nodes:
                try:
                    if await node.set(key, val, nx=True, px=expiry):
                        n_ok += 1
                except (ConnectionError, TimeoutError):
                    pass
            elapsed = time.monotonic() * 1000 - start
            # Check quorum AND within validity time
            if n_ok >= self.quorum and elapsed < expiry:
                return (key, val)
            # Rollback
            await self.release(key, val)
            if attempt < self.retry_count - 1:
                await asyncio.sleep(self.retry_delay * (2 ** attempt))
        return (None, None)

    async def release(self, key: str, val: str):
        """Safe release using Lua script to check ownership."""
        script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """
        for node in self.nodes:
            try:
                await node.eval(script, 1, key, val)
            except ConnectionError:
                pass

    async def extend(self, key: str, val: str, new_ttl: int) -> bool:
        """Extend lock TTL (watchdog pattern)."""
        script = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('pexpire', KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        results = []
        for node in self.nodes:
            try:
                r = await node.eval(script, 1, key, val, new_ttl)
                results.append(r)
            except ConnectionError:
                pass
        return sum(results) >= self.quorum

# Usage with watchdog
async def critical_section(redlock: Redlock, key: str):
    lock_key, lock_val = await redlock.acquire(key, ttl=10000)
    if not lock_key:
        raise LockAcquisitionFailed()

    async def watchdog():
        while True:
            await asyncio.sleep(3)  # 1/3 of TTL
            if not await redlock.extend(lock_key, lock_val, 10000):
                break

    watchdog_task = asyncio.create_task(watchdog())
    try:
        await perform_critical_work()
    finally:
        watchdog_task.cancel()
        await redlock.release(lock_key, lock_val)
```

**Fuente oficial:** https://redis.io/docs/manual/patterns/distributed-locks/

### Alternativa de Implementación Específica

For **etcd-based locking**, use the `concurrency` package which provides `Mutex` with lease-based sessions. etcd locks are safer (linearizable consensus instead of approximate time) but slower (~20ms vs ~5ms for Redis).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Single-node SET NX EX for non-critical locks. Redlock only when you truly need multi-node fencing across domains |
| **Cuándo evitar** | Redlock's complexity is rarely justified. Single-node Redis with `min.insync.replicas=2` + `WAIT` covers 99% of cases. Never use Redlock for financial transactions requiring strict fencing |
| **Alternativas** | etcd/Consul locks (linearizable, safer). ZooKeeper (ephemeral sequential nodes). PostgreSQL advisory locks (for DB-level coordination) |
| **Coste/Complejidad** | Low for single-node (5 lines of code). High for Redlock: clock drift assumptions, 5 Redis nodes, watchdog, fencing token integration |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Lock not released on client crash

**¿Qué ocasionó el error?**
Client acquires a lock, then crashes (OOM, SIGKILL) without executing the release. The lock key remains indefinitely, blocking all other clients.

**¿Cómo se solucionó?**
Always set TTL (lock lease) on the key. Use a watchdog to extend the lease while the client is alive. On crash, the watchdog stops and the TTL expires naturally.

**¿Por qué funciona esta técnica?**
TTL acts as a lease. Even without explicit release, the lock auto-expires after the TTL. The watchdog extends the lease only while the client signals liveness.

### Caso: Fencing violation — double write

**¿Qué ocasionó el error?**
A slow client holds a lock past its TTL. Another client acquires the lock. The first client, still thinking it holds the lock, writes to the shared resource. Resource state is corrupted.

**¿Cómo se solucionó?**
Implement fencing tokens: the lock issuer provides a monotonically increasing token. Writes include the token; the shared resource rejects writes with stale tokens.

**¿Por qué funciona esta técnica?**
Fencing tokens guarantee that only the latest lock holder can write. Even if a client thinks it has the lock, its stale token is rejected by the resource.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "distributed lock", "redlock", "distributed mutex", "fencing token", "lock lease"
- **Prioridad de carga:** Media — importante pero aplicaciones limitadas
- **Dependencias:** `distributed-cache-redis-cluster`, `distributed-consensus-raft`

### Tool Integration

```json
{
  "tool_name": "distributed-locking-redlock",
  "description": "Distributed locking patterns: Redlock, single-node Redis locks, etcd/consensus locks with fencing tokens",
  "triggers": ["distributed lock", "redlock", "fencing token", "mutex", "lock lease"],
  "context_hint": "Load when user asks about mutual exclusion in distributed systems, lock patterns, or resource coordination",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre distributed locks o Redlock, carga el skill
distributed-locking-redlock. Prioriza la distinción entre SET NX EX single-node
y Redlock multi-node. Enfatiza fencing tokens para safety crítica.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Single-node Redis lock
redis-cli SET resource:lock "my-instance-id" NX EX 30

# Check lock owner
redis-cli GET resource:lock

# Manual release (if owner known)
redis-cli EVAL "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end" 1 resource:lock my-instance-id

# etcd lock
etcdctl lock mylock echo "locked"

# etcd lease-based lock
etcdctl lease grant 30
etcdctl put --lease=<lease-id> /mylock "value"
```

### GUI / Web

- **RedisInsight** — lock key inspection and TTL monitoring
- **etcd Dashboard** — lease and lock visualization
- **Consul UI** — session and lock management under Key/Value → Lock
- **Datadog** — lock acquisition latency, ownership, and contention metrics

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Acquire lock | `SET key val NX EX 30` | RedisInsight → CLI |
| Check lock | `GET key` | etcd Dashboard → KV → mylock |
| Release | `EVAL "del if owner" 1 key val` | Consul UI → Sessions |

---

## 7. Cheatsheet Rápido

```bash
# Single-node lock (99% of use cases)
SET resource:lock <uuid> NX EX 30
# Release (Lua script for safe release):
#   if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end

# Redlock: 5 Redis nodes, majority quorum (3/5)
# TTL (lease) = 10s, watchdog at 1/3 TTL
# Fencing token: monotonically increasing integer from lock service

# etcd lock: lease-based, linearizable
etcdctl lock /mylock echo "locked"

# Never use Redis locks for financial transactions
# Prefer etcd/consul when safety > performance
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-cache-redis-cluster` | complementario — Redis as lock backend | Sí |
| `distributed-consensus-raft` | alternativo — etcd Raft-based locking | No |
| `network-partitions-split-brain` | relacionado — locks prevent split-brain scenarios | No |
| `api-idempotency-in-distributed-networks` | complementario — both use unique identifiers | No |
| `database-replication-lag-strategies` | relacionado — locks for write coordination | No |

---

## 9. Metadatos del Skill

```yaml
---
id: distributed-locking-redlock
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [distributed-lock, redlock, redis, fencing, mutex, lease, etcd, coordination]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

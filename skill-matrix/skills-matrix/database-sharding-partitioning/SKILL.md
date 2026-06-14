---
name: database-sharding-partitioning
description: "Sharding horizontally partitions data across multiple database instances"
---
# Database Sharding & Partitioning

## Semantic Triggers
```
database sharding key selection and data distribution, range vs hash based sharding strategies, cross shard queries and distributed joins, resharding and data migration without downtime, shard splitting and merging strategies, maintaining global unique ids across shards
```

---

## 1. Definición Teórica

Sharding horizontally partitions data across multiple database instances. A shard key determines data placement. It solves the problem of scaling writes beyond a single database's capacity. Key distinction: range sharding (by time, ID range) enables efficient range queries but risks hot spots; hash sharding (consistent hash or modulo) provides uniform distribution but breaks range queries. Unlike replication (which duplicates data), sharding partitions it.

---

## 2. Implementación de Referencia

**Vitess** (Go) — the most mature sharding layer for MySQL, used by YouTube. **Citus** for PostgreSQL sharding. **MongoDB** built-in hashed sharding. **Cassandra** uses consistent hashing natively. **Spanner** (Cloud Spanner, CockroachDB) provides auto-sharding with transparent range splits.

### Ejemplo Práctico Avanzado

```python
import hashlib
import time
from dataclasses import dataclass
from typing import Any

@dataclass
class Shard:
    id: int
    host: str
    db: str
    weight: int = 1

class ShardRouter:
    """Routes queries to the correct shard based on shard key."""
    def __init__(self, shards: list[Shard], virtual_shards: int = 1024):
        self.shards = shards
        self.virtual_shards = virtual_shards
        self._build_ring()

    def _build_ring(self):
        """Map virtual shards to physical shards (consistent hashing)."""
        weighted_shards = []
        for s in self.shards:
            weighted_shards.extend([s] * s.weight)
        self.shard_map = {
            vs: weighted_shards[vs % len(weighted_shards)]
            for vs in range(self.virtual_shards)
        }

    def _hash_key(self, key: str) -> int:
        return int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) % self.virtual_shards

    def get_shard(self, shard_key: str) -> Shard:
        return self.shard_map[self._hash_key(shard_key)]

    def get_all_shards(self) -> list[Shard]:
        return self.shards

    # For range-based sharding (time-series)
    def range_shards(self, start_ts: int, end_ts: int) -> list[Shard]:
        """Return shards covering a time range."""
        shard_hour = 3600 * 24 * 30  # monthly shards
        start_shard = start_ts // shard_hour % len(self.shards)
        end_shard = end_ts // shard_hour % len(self.shards)
        if start_shard <= end_shard:
            return self.shards[start_shard:end_shard + 1]
        return self.shards[start_shard:] + self.shards[:end_shard + 1]

    # Scatter-gather query across all shards
    async def scatter_gather(self, query_fn, shard_key: str | None = None):
        """Execute query across all or specific shard, aggregate results."""
        if shard_key:
            shard = self.get_shard(shard_key)
            return await query_fn(shard)

        results = []
        for shard in self.shards:
            result = await query_fn(shard)
            results.extend(result)
        return results

# Global ID generation (Snowflake-style)
class SnowflakeID:
    def __init__(self, worker_id: int, datacenter_id: int = 0, epoch: int = 1700000000000):
        self.worker_id = worker_id & 0x1F  # 5 bits
        self.datacenter_id = datacenter_id & 0x1F  # 5 bits
        self.epoch = epoch
        self.sequence = 0
        self.last_ts = 0

    def next_id(self) -> int:
        ts = int(time.time() * 1000) - self.epoch
        if ts == self.last_ts:
            self.sequence = (self.sequence + 1) & 0xFFF  # 12 bits
            if self.sequence == 0:
                while ts <= self.last_ts:
                    ts = int(time.time() * 1000) - self.epoch
        else:
            self.sequence = 0
        self.last_ts = ts
        return (ts << 22) | (self.datacenter_id << 17) | (self.worker_id << 12) | self.sequence

# UUIDv7 (time-sortable)
import uuid
def uuid7() -> uuid.UUID:
    # RFC 9562 UUIDv7: Unix timestamp ms + random
    timestamp = int(time.time() * 1000)
    hex_str = f"{timestamp:012x}{uuid.uuid4().hex[12:]}"
    return uuid.UUID(hex=hex_str)
```

**Fuente oficial:** https://vitess.io/docs/overview/

### Alternativa de Implementación Específica

**Proxy-based sharding** with **ProxySQL** (MySQL) or **Pgpool-II** (PostgreSQL) provides transparent query routing without application changes. **Cassandra** uses consistent hashing natively with no proxy. For simpler needs, application-level sharding with a lightweight router is often cleaner.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Dataset exceeds single-node capacity (>1TB), write throughput exceeds single-node limit (>10k writes/s), geographical data distribution |
| **Cuándo evitar** | Most applications never need sharding. Start with read replicas and caching. Sharding adds significant operational complexity |
| **Alternativas** | Read replicas + caching (cheaper, simpler). Vertical scaling (add hardware). Vitess/Citus for managed sharding |
| **Coste/Complejidad** | Very high — cross-shard queries, distributed joins, resharding migrations, global IDs, and monitoring. Requires mature operations team |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Hot shard — one shard handles 80% of traffic

**¿Qué ocasionó el error?**
User ID-based sharding maps a popular tenant (100x more users) to a single shard. That shard is overloaded while others are idle.

**¿Cómo se solucionó?**
Re-shard with a composite key: `hash(tenant_id) + hash(user_id)`. Or split the hot tenant into sub-shards. Use virtual shards with higher weight for powerful nodes.

**¿Por qué funciona esta técnica?**
Composite keys spread a single entity's data across multiple shards. Virtual shards allow granular data movement without full resharding.

### Caso: Resharding downtime

**¿Qué ocasionó el error?**
The system outgrows its shard count (N=10 → N=20 needed). Resharding requires moving 50% of data. The naive approach shuts down all shards, migrates, and restarts — 6 hours of downtime.

**¿Cómo se solucionó?**
Use virtual shards (1024 mapped to 10 physical). Add new physical nodes (1024 mapped to 20). Gradually move virtual shards from old to new nodes with minimal data per migration step.

**¿Por qué funciona esta técnica?**
Virtual shards decouple logical partitioning from physical nodes. Moving small sets of virtual shards incrementally avoids bulk data migration and allows rollback.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "sharding", "database shard", "partitioning", "horizontal scaling", "vitess", "shard key"
- **Prioridad de carga:** Alta — crucial para escalado de bases de datos
- **Dependencias:** `consistent-hashing-topologies`, `database-replication-lag-strategies`

### Tool Integration

```json
{
  "tool_name": "database-sharding-partitioning",
  "description": "Database sharding and partitioning strategies: hash/range sharding, Vitess, resharding, global IDs, cross-shard queries",
  "triggers": ["sharding", "partitioning", "shard key", "horizontal scaling", "vitess", "citus"],
  "context_hint": "Load when user asks about database horizontal scaling, sharding, or data partitioning strategies",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre sharding o particionado de bases de datos, carga el skill
database-sharding-partitioning. Prioriza la selección de shard key y estrategias
de resharding consistente sobre implementaciones específicas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Vitess: shard management
vtctlclient ListShards test_keyspace
vtctlclient GetShard test_keyspace/0
vtctlclient Reshard test_keyspace.reshard_workflow

# MongoDB: enable sharding
mongosh --eval 'sh.enableSharding("mydb")'
mongosh --eval 'sh.shardCollection("mydb.users", {_id: "hashed"})'

# Citus: distribute table
psql -c "SELECT create_distributed_table('orders', 'user_id');"
psql -c "SELECT * FROM citus_shards;"

# Check shard distribution
vitess: vtctlclient ListShardTablets test_keyspace/0
mongo: db.users.getShardDistribution()
```

### GUI / Web

- **Vitess Dashboard** — shard status, tablet health, query distribution heatmap
- **MongoDB Atlas** — sharding visualization, chunk distribution, balancer status
- **Citus Manager** — shard rebalancer, colocation groups, distributed query plans
- **Datadog** — shard-level metrics (writes/read per shard, hot shard detection)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List shards | `vtctlclient ListShards` | Vitess Dashboard → Shards |
| Distribution | `sh.getShardDistribution()` | Atlas → Clusters → Sharding |
| Balancer status | `sh.status()` | Citus Manager → Shards |

---

## 7. Cheatsheet Rápido

```text
# Shard key selection: high cardinality, uniform distribution, query pattern
# Hash sharding: uniform, breaks range queries
# Range sharding: good for time-series, hot spots at range edges
# Virtual shards: 1024 virtual → N physical, decouples mapping

# Global IDs: Snowflake (64-bit), UUIDv7 (time-sortable)
#   Snowflake: timestamp(41) | dc(5) | worker(5) | sequence(12)
#   UUIDv7: timestamp(48) | random(74)

# Cross-shard queries: scatter-gather pattern
# Cross-shard transactions: 2PC or best-effort

# Never: auto-increment across shards
# Prefer: Vitess for MySQL, Citus for PostgreSQL
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `consistent-hashing-topologies` | implementación — consistent hashing for shard placement | Sí |
| `database-replication-lag-strategies` | complementario — replication within each shard | Sí |
| `distributed-transactions-2pc-3pc` | relacionado — cross-shard transaction coordination | No |
| `distributed-cache-redis-cluster` | complementario — Redis Cluster uses similar partitioning | No |
| `change-data-capture-cdc` | complementario — CDC for migrating between shards | No |

---

## 9. Metadatos del Skill

```yaml
---
id: database-sharding-partitioning
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [sharding, partitioning, vitess, citus, mongodb, shard-key, resharding, snowflake, uuid7]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

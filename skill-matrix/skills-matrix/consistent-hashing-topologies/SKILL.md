---
name: consistent-hashing-topologies
description: "Consistent hashing distributes keys across nodes with minimal redistribution when nodes join or leave"
---
# Consistent Hashing Topologies

## Semantic Triggers
```
consistent hashing ring and virtual nodes, consistent hashing for distributed caching, load balancing with consistent hashing, hash ring redistribution minimizing rehashing, rendezvous hashing vs consistent hashing, dynamo style consistent hashing with replication
```

---

## 1. Definición Teórica

Consistent hashing distributes keys across nodes with minimal redistribution when nodes join or leave. Each key maps to a position on a hash ring; each node claims arcs of the ring. Virtual nodes (vnodes) improve balance. Key distinction over modulo-N hashing: only 1/N of keys are remapped when a node changes, making it ideal for dynamic distributed systems like caching and data partitioning.

---

## 2. Implementación de Referencia

**Cassandra** uses consistent hashing with 256 vnodes per node by default. **DynamoDB** uses consistent hashing with replication factor 3. **Redis Cluster** uses hash slots (16384) as a form of consistent hashing. **Kong** gateway uses consistent hashing for upstream load balancing.

### Ejemplo Práctico Avanzado

```python
import hashlib
import bisect
from typing import Optional

class ConsistentHashRing:
    def __init__(self, vnodes: int = 150, replication_factor: int = 3):
        self.vnodes = vnodes
        self.replication_factor = replication_factor
        self.ring: dict[int, str] = {}
        self.sorted_keys: list[int] = []
        self.nodes: dict[str, int] = {}

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest()[:8], 16)

    def add_node(self, node: str, weight: int = 1):
        self.nodes[node] = weight
        for i in range(self.vnodes * weight):
            vnode_key = hashlib.md5(f"{node}:vnode:{i}".encode()).hexdigest()
            h = self._hash(vnode_key)
            self.ring[h] = node
        self._sort_ring()

    def remove_node(self, node: str):
        self.nodes.pop(node, None)
        self.ring = {h: n for h, n in self.ring.items() if n != node}
        self._sort_ring()

    def _sort_ring(self):
        self.sorted_keys = sorted(self.ring.keys())

    def get_node(self, key: str) -> Optional[str]:
        if not self.ring:
            return None
        h = self._hash(key)
        idx = bisect.bisect_left(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]

    def get_nodes(self, key: str, n: Optional[int] = None) -> list[str]:
        """Returns N distinct physical nodes for replication."""
        if n is None:
            n = self.replication_factor
        nodes = []
        h = self._hash(key)
        idx = bisect.bisect_left(self.sorted_keys, h) % len(self.sorted_keys)
        seen = set()
        for _ in range(len(self.sorted_keys)):
            node = self.ring[self.sorted_keys[idx]]
            if node not in seen:
                nodes.append(node)
                seen.add(node)
                if len(nodes) == n:
                    break
            idx = (idx + 1) % len(self.sorted_keys)
        return nodes

    def get_distribution(self) -> dict[str, int]:
        """Returns key count estimate per node (uniform distribution assumed)."""
        if not self.ring:
            return {}
        per_node = {n: 0 for n in self.nodes}
        for h, node in self.ring.items():
            per_node[node] = per_node.get(node, 0) + 1
        return per_node
```

**Fuente oficial:** https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html

### Alternativa de Implementación Específica

**Rendezvous hashing (HRW)** — each key is ranked against all nodes and the highest-ranked node wins. Better distribution than consistent hashing without vnodes, but O(N) lookup per key (vs O(log N) for consistent hashing). Good for small to medium clusters (< 100 nodes).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Distributed caching (Memcached, Redis Cluster), data partitioning (DynamoDB, Cassandra), sticky session routing, CDN edge caching |
| **Cuándo evitar** | Small static clusters (<5 nodes, modulo works fine). When keys are not uniformly distributed (hot spotting) |
| **Alternativas** | Modulo-N (simple, breaks on node change). Rendezvous hashing (better balance, O(N) lookup). Jump consistent hash (minimal memory, but no node removal) |
| **Coste/Complejidad** | Low — algorithm is well-understood. Virtual nodes add memory but improve balance. Monitor distribution skew |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Hot spotting despite consistent hashing

**¿Qué ocasionó el error?**
A few keys (e.g., `user:1`, `user:2`...) hash to the same region of the ring because the hash function does not distribute them uniformly. That region's node becomes saturated.

**¿Cómo se solucionó?**
Increase virtual nodes per physical node (256 instead of 150). Use a salt prefix (e.g., `{user}:1:42`) or add node weight to spread load. Use per-node `load` metric to trigger rebalancing.

**¿Por qué funciona esta técnica?**
More vnodes smooths the distribution curve. Weighted nodes allocate more ring arcs to powerful nodes. Salt prefixes change the hash input for better distribution.

### Caso: Cache avalanche on node removal

**¿Qué ocasionó el error?**
A large cache node fails. Consistent hashing reassigns its keys to other nodes. The sudden influx of cache misses causes a thundering herd on the database.

**¿Cómo se solucionó?**
Use **one-CR** (one consistent ring) with redundancy: each key is replicated to the next N nodes clockwise. On a single node failure, keys are already warm on the replica. Add jitter to rehydration to spread load.

**¿Por qué funciona esta técnica?**
Replication provides a fallback cache copy. The request is served from the replica while the new primary fills its cache. This avoids the thundering herd on the origin database.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "consistent hashing", "hash ring", "virtual nodes", "rendezvous hashing"
- **Prioridad de carga:** Media — importante para caching y data partitioning
- **Dependencias:** `distributed-cache-redis-cluster`, `database-sharding-partitioning`

### Tool Integration

```json
{
  "tool_name": "consistent-hashing-topologies",
  "description": "Consistent hashing with virtual nodes for distributed data partitioning and caching",
  "triggers": ["consistent hashing", "hash ring", "virtual nodes", "rendezvous hashing", "jump consistent hash"],
  "context_hint": "Load when user asks about data partitioning, distributed caching, or load balancing with minimal rehashing",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre consistent hashing o hash rings, carga el skill
consistent-hashing-topologies. Prioriza el ejemplo de implementación con vnodes
y discute la alternativa rendezvous para clusters pequeños.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Cassandra: check token distribution
nodetool ring
nodetool status | grep -E "^[UN]"

# Redis Cluster: hash slots distribution
redis-cli CLUSTER NODES
redis-cli CLUSTER SLOTS

# Kong: upstream consistent hashing config
curl -s http://localhost:8001/upstreams/ | jq '.data[].hash_on'

# Test hash distribution
python -c "from hashlib import md5; print([int(md5(f'key{i}'.encode()).hexdigest()[:8],16) % 1024 for i in range(10)])"
```

### GUI / Web

- **Cassandra nodetool** — `nodetool ring` shows token ranges per node
- **RedisInsight** — cluster topology visualization with slot distribution
- **Kong Manager** — upstream hashing configuration for consistent routing
- **DataStax Enterprise** — Cassandra cluster topology with vnode heatmap

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ring status | `nodetool ring` | DataStax OpsCenter → Ring View |
| Migration | `nodetool move <token>` | RedisInsight → Cluster → Reshard |
| Distribution | `nodetool status` | — |

---

## 7. Cheatsheet Rápido

```python
# Consistent hashing pattern: vnodes = 150 per node
# get_node(key): bisect on sorted ring keys
# Replication: to next N physical nodes on ring

# Hash: MD5 or SHA-1 for uniformity
# Vnodes: 150-256 per physical node
# Distribution target: <15% std deviation

# Cassandra: default 256 vnodes, RF=3
# Redis Cluster: 16384 hash slots, no vnodes
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-cache-redis-cluster` | implementación — Redis Cluster uses hash slots (consistent hashing variant) | Sí |
| `database-sharding-partitioning` | implementación — sharding uses consistent hashing for data distribution | Sí |
| `load-balancing-algorithms-l4-l7` | complementario — consistent hashing for session affinity | No |
| `gossip-protocols-membership` | complementario — ring management via gossip | No |
| `crdts-conflict-free-replicated` | complementario — Dynamo-style replication | No |

---

## 9. Metadatos del Skill

```yaml
---
id: consistent-hashing-topologies
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [consistent-hashing, hash-ring, vnodes, rendezvous-hashing, distributed-caching, partitioning]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

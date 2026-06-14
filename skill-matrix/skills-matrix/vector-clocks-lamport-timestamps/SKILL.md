---
name: vector-clocks-lamport-timestamps
description: "Lamport timestamps provide a logical clock for total ordering of events (one counter per process)"
---
# Vector Clocks & Lamport Timestamps

## Semantic Triggers
```
vector clock causality tracking and conflict detection, lamport logical clock happens before relation, vector clock size pruning and version vectors, causal consistency with vector clocks, lamport timestamp vs vector clock tradeoffs, conflict resolution with vector clocks in dynamo style databases
```

---

## 1. Definición Teórica

Lamport timestamps provide a logical clock for total ordering of events (one counter per process). Vector clocks extend this with an array of counters (one per node) to capture causality — enabling detection of concurrent updates. They solve the problem of ordering events in distributed systems without physical clock synchronization. Key distinction: Lamport timestamps provide total order but no causal information; vector clocks track causal history at the cost of size (O(N) per event).

---

## 2. Implementación de Referencia

**Cassandra** uses vector clocks (as version vectors) for conflict detection in Dynamo-style replication. **Riak** uses dotted version vectors (optimized vector clocks). **DynamoDB** uses last-writer-wins (LWW) with wall clocks as a pragmatic alternative. **CRDT** libraries (e.g., `crdt` in Rust, `pycrdt`) implement vector clocks internally.

### Ejemplo Práctico Avanzado

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class VectorClock:
    """Vector clock: mapping of node_id -> logical counter."""
    values: dict[str, int] = field(default_factory=dict)

    def tick(self, node: str):
        """Increment the clock for this node."""
        self.values[node] = self.values.get(node, 0) + 1

    def merge(self, other: "VectorClock"):
        """Merge two clocks by taking element-wise max."""
        for k, v in other.values.items():
            self.values[k] = max(self.values.get(k, 0), v)

    def __le__(self, other: "VectorClock") -> bool:
        """Check if self happens-before other (causal order)."""
        return all(self.values.get(k, 0) <= other.values.get(k, 0) for k in set(self.values) | set(other.values))

    def concurrent(self, other: "VectorClock") -> bool:
        """Two clocks are concurrent if neither happens-before the other."""
        return not (self <= other or other <= self)

    def __repr__(self) -> str:
        return f"VC({self.values})"


@dataclass
class LamportClock:
    """Lamport logical clock — single counter."""
    value: int = 0

    def tick(self):
        self.value += 1
        return self.value

    def recv(self, other: int):
        self.value = max(self.value, other) + 1


# Conflict resolution with vector clocks
@dataclass
class VersionedValue:
    """A value with its vector clock for conflict detection."""
    value: str
    clock: VectorClock = field(default_factory=VectorClock)

class KVStore:
    """Dynamo-style key-value store with vector clock conflict detection."""
    def __init__(self):
        self.store: dict[str, list[VersionedValue]] = {}

    def put(self, key: str, value: str, node: str):
        if key not in self.store:
            self.store[key] = [VersionedValue(value)]
        else:
            # Create new version
            new_vv = VersionedValue(value)
            latest = self.store[key][-1]
            new_vv.clock.merge(latest.clock)
            new_vv.clock.tick(node)
            self.store[key].append(new_vv)

    def get(self, key: str) -> list[VersionedValue]:
        return self.store.get(key, [])

    def resolve(self, key: str, resolver):
        """Resolve siblings via application-specific logic or LWW."""
        siblings = self.get(key)
        if len(siblings) <= 1:
            return siblings[0] if siblings else None
        # Check if one dominates
        for i, a in enumerate(siblings):
            for j, b in enumerate(siblings):
                if i != j and a.clock <= b.clock:
                    return b
        # Concurrent siblings — use application resolver
        return resolver(key, siblings)
```

**Fuente oficial:** https://en.wikipedia.org/wiki/Vector_clock

### Alternativa de Implementación Específica

**Dotted Version Vectors** (used by Riak) optimize vector clock size by pruning entries for inactive nodes. Each value carries a "dot" (single version identifier) rather than a full vector clock. **Hybrid Logical Clocks** (HLC) provide an alternative combining physical time with logical counters (see slot 31).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Causal consistency systems, conflict detection in AP databases (DynamoDB, Cassandra), collaborative applications |
| **Cuándo evitar** | Total ordering only (Lamport is simpler). Small systems where wall-clock ordering suffices. Systems requiring minimal metadata overhead |
| **Alternativas** | Lamport timestamps (smaller, total order only). Hybrid Logical Clocks (64-bit, near-physical). LWW with wall clocks (simpler, no causality) |
| **Coste/Complejidad** | Medium — size grows with number of active nodes. Requires pruning of dead nodes. Conflict resolution requires application logic |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Vector clock size explosion

**¿Qué ocasionó el error?**
A Cassandra cluster with dynamic node churn accumulates vector clock entries for many inactive nodes. The clock size grows linearly, increasing storage overhead and comparison time.

**¿Cómo se solucionó?**
Prune vector clock entries for nodes that have been inactive for >48h. Use version vectors with a bounded active node list. Cassandra's `max_hint_window_in_ms` controls related metadata retention.

**¿Por qué funciona esta técnica?**
Inactive nodes don't generate new causal relationships. Pruning their entries removes stale state without affecting causality for active nodes.

### Caso: Concurrent writes produce unbounded siblings

**¿Qué ocasionó el error?**
A Dynamo-style key-value store accumulates sibling values from concurrent writes. Application reads get an ever-growing list of siblings, causing slowdowns and confusing clients.

**¿Cómo se solucionó?**
Implement last-writer-wins (LWW) based on wall clock timestamp. When the application reads siblings, it picks the one with the highest timestamp as authoritative. Store the timestamp alongside the vector clock.

**¿Por qué funciona esta técnica?**
LWW provides a deterministic resolution rule. Combining wall-clock timestamps with UUID tiebreakers ensures unambiguous ordering while still detecting true concurrent updates via vector clocks.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "vector clock", "lamport timestamp", "logical clock", "causal consistency", "version vector"
- **Prioridad de carga:** Media — fundamental para sistemas AP y causal consistency
- **Dependencias:** `crdts-conflict-free-replicated`, `hybrid-logical-clocks`

### Tool Integration

```json
{
  "tool_name": "vector-clocks-lamport-timestamps",
  "description": "Vector clocks and Lamport timestamps for causal ordering, conflict detection, and logical time in distributed systems",
  "triggers": ["vector clock", "lamport timestamp", "logical clock", "causal consistency", "version vector"],
  "context_hint": "Load when user asks about logical time, causal ordering, or conflict detection in distributed systems",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre vector clocks o Lamport timestamps, carga el skill
vector-clocks-lamport-timestamps. Prioriza el ejemplo de Dynamo-style conflict detection
y discute pruning de version vectors para producción.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Cassandra: examine vector clock info
nodetool proxyhistograms

# Riak: inspect vector clock on a value
riak-admin bucket-type status <type>
curl -i http://localhost:8098/types/default/buckets/test/keys/mykey

# DynamoDB: view version info
aws dynamodb get-item --table-name users --key '{"id":{"S":"42"}}' --return-consumed-capacity TOTAL

# Simulate vector clock comparison
python -c "
vc1 = {'a': 3, 'b': 2}
vc2 = {'a': 2, 'b': 3}
# Concurrent: not (vc1 <= vc2) and not (vc2 <= vc1)
print('concurrent:', not all(vc1.get(k,0) <= vc2.get(k,0) for k in set(vc1)|set(vc2)) and not all(vc2.get(k,0) <= vc1.get(k,0) for k in set(vc1)|set(vc2)))
"
```

### GUI / Web

- **Riak Explorer** — key/value inspection with vector clock details and sibling count
- **Cassandra OpsCenter** — version vector statistics and conflict metrics
- **DynamoDB Console** — item version display (hidden, accessible via API)
- **Riak Control** — cluster data browser with sibling resolution

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Inspect clock | `curl -i <riak-url>` | Riak Explorer → Key Details |
| Version stats | `nodetool proxyhistograms` | OpsCenter → Key Metrics |
| Check siblings | `aws dynamodb get-item` | DynamoDB Console → Item |

---

## 7. Cheatsheet Rápido

```python
# Lamport: single counter, total order
clock.tick() → increment
clock.recv(other) → max(local, other) + 1

# Vector clock: per-node counters
vc1 <= vc2  iff  all(vc1[k] <= vc2[k] for k)
concurrent   iff  not (vc1 <= vc2) and not (vc2 <= vc1)

# Merge: element-wise max
# Prune: remove entries for nodes inactive >48h

# Dynamo-style: N=3, W=2, R=2
#   write: pick latest clock, merge, tick, store
#   read: if concurrent siblings → resolve via LWW or app logic
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `crdts-conflict-free-replicated` | implementación — CRDTs use vector clocks internally | Sí |
| `hybrid-logical-clocks` | alternativo — HLC combines physical + logical | Sí |
| `cap-theorem-tradeoffs` | contexto — AP systems need conflict detection | No |
| `pacelc-theorem-implications` | contexto — latency vs consistency normal operation | No |

---

## 9. Metadatos del Skill

```yaml
---
id: vector-clocks-lamport-timestamps
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [vector-clock, lamport-timestamp, logical-clock, causality, conflict-detection, version-vector]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

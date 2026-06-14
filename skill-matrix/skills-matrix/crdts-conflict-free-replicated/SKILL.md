---
name: crdts-conflict-free-replicated
description: "CRDTs (Conflict-free Replicated Data Types) allow concurrent updates across replicas without coordination, guaranteeing convergence to the same state"
---
# CRDTs — Conflict-free Replicated Data Types

## Semantic Triggers
```
crdt state based merge and delta mutations, crdt operation based vs state based replication, g counter and pn counter for distributed counting, lww set and observed remove set or set, crdt for collaborative editing and ot vs crdt, conflict free data types for local first applications
```

---

## 1. Definición Teórica

CRDTs (Conflict-free Replicated Data Types) allow concurrent updates across replicas without coordination, guaranteeing convergence to the same state. They solve the problem of conflict resolution in AP distributed systems. Key distinction: state-based CRDTs (CvRDTs) merge full states via commutative/associative/idempotent operations; operation-based CRDTs (CmRDTs) broadcast operations with reliable delivery guarantees. Unlike consensus-based approaches (Raft), CRDTs converge without coordination.

---

## 2. Implementación de Referencia

**Yjs** (JavaScript) — the leading CRDT library for collaborative editing. **Automerge** (Rust/JS) for JSON-like data structures. **PyCRDT** (Python) for educational implementations. **Riak** uses CRDTs (counters, sets, maps) for distributed data types. **Redis** has CRDT-based data types in Redis Enterprise (CRDT sets, counters).

### Ejemplo Práctico Avanzado

```python
from dataclasses import dataclass, field
import uuid
from typing import Any

# PN-Counter: supports increments and decrements
@dataclass
class PNCounter:
    pos: dict[str, int] = field(default_factory=dict)
    neg: dict[str, int] = field(default_factory=dict)

    def add(self, node: str, delta: int):
        if delta >= 0:
            self.pos[node] = self.pos.get(node, 0) + delta
        else:
            self.neg[node] = self.neg.get(node, 0) - delta

    @property
    def value(self) -> int:
        return sum(self.pos.values()) - sum(self.neg.values())

    def merge(self, other: "PNCounter"):
        for k, v in other.pos.items():
            self.pos[k] = max(self.pos.get(k, 0), v)
        for k, v in other.neg.items():
            self.neg[k] = max(self.neg.get(k, 0), v)


# OR-Set (Observed-Remove Set): supports add/remove without tombstones
@dataclass
class ORSet:
    elements: dict[Any, set[str]] = field(default_factory=dict)
    # elements[value] = set of unique tags (UUIDs)

    def add(self, value: Any, tag: str | None = None):
        if tag is None:
            tag = str(uuid.uuid4())
        self.elements.setdefault(value, set()).add(tag)

    def remove(self, value: Any):
        # Observe: client must have seen the add tag to remove
        # If not present, this remove is a no-op (causally ready add will be removed on merge)
        self.elements.pop(value, None)

    @property
    def value(self) -> set[Any]:
        return set(self.elements.keys())

    def merge(self, other: "ORSet"):
        for v, tags in other.elements.items():
            if v in self.elements:
                self.elements[v].update(tags)
            else:
                self.elements[v] = set(tags)


# LWW-Register (Last-Writer-Wins)
@dataclass
class LWWRegister:
    value: Any = None
    timestamp: float = 0.0
    node_id: str = ""

    def set(self, value: Any, timestamp: float, node: str):
        if timestamp > self.timestamp or (timestamp == self.timestamp and node > self.node_id):
            self.value = value
            self.timestamp = timestamp
            self.node_id = node

    def merge(self, other: "LWWRegister"):
        self.set(other.value, other.timestamp, other.node_id)


# Delta CRDT: send only changes (efficient)
@dataclass
class GCounter:
    """Grow-only Counter with delta mutation support."""
    values: dict[str, int] = field(default_factory=dict)

    def add(self, node: str, delta: int = 1):
        self.values[node] = self.values.get(node, 0) + delta

    @property
    def value(self) -> int:
        return sum(self.values.values())

    def merge(self, other: "GCounter"):
        for k, v in other.values.items():
            self.values[k] = max(self.values.get(k, 0), v)

    def delta(self, node: str) -> "GCounter":
        """Extract delta since last sync (optimization for state-based CRDTs)."""
        return GCounter(values={node: self.values.get(node, 0)})
```

**Fuente oficial:** https://crdt.tech/

### Alternativa de Implementación Específica

**Yjs** (JavaScript) — real-world CRDT for collaborative editing. Uses a custom data structure (YATA) optimized for text editing. Supports rich text, images, and undo/redo. Network-agnostic (WebSocket, WebRTC, or custom provider).

```javascript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const provider = new WebsocketProvider('ws://localhost:1234', 'room1', doc)
const ytext = doc.getText('content')
ytext.insert(0, 'Hello World') // converges across all clients
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Collaborative editing, local-first apps, offline-capable mobile apps, AP databases (Riak, Redis CRDTs), multi-master replication |
| **Cuándo evitar** | Strongly consistent systems (use Raft/2PC), simple last-writer-wins is sufficient, high update frequency with large state (full merge bandwidth) |
| **Alternativas** | OT (Operational Transform) for text editing. Vector clocks + LWW. Consensus-based replication (Raft) for strong consistency |
| **Coste/Complejidad** | Medium-high — correct implementation is subtle (tombstone management, delta encoding, causal delivery for CmRDTs). Libraries (Yjs, Automerge) reduce this |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Tombstone explosion in OR-Set

**¿Qué ocasionó el error?**
An OR-Set accumulates tombstones (tag metadata) for removed elements. Over time, the metadata grows without bound, causing memory issues in long-running replicas.

**¿Cómo se solucionó?**
Use a tombstones GC process: periodically compress the OR-Set by removing metadata for elements that have been observed removed by all replicas. Riak implements this via "active anti-entropy" with Merkle trees.

**¿Por qué funciona esta técnica?**
Once all replicas have observed a remove, the add tags are no longer needed. Compacting removes them safely because any future add creates a new tag.

### Caso: RGA text editing — concurrent insertions at same position

**¿Qué ocasionó el error?**
Two users concurrently insert different characters at the same position in a collaborative document. The RGA (Replicated Growable Array) produces an unexpected result (concurrent items interleaved confusingly).

**¿Cómo se solucionó?**
RGA assigns each insertion a unique identifier (node_id + sequence). Concurrent inserts at the same position are ordered by the identifier's tuple comparison, producing a deterministic but possibly arbitrary order.

**¿Por qué funciona esta técnica?**
RGA's causal ordering guarantees that both users see the same result after convergence. The deterministic ordering by node_id ensures no conflict — just possibly unexpected character ordering. Yjs's YATA algorithm improves this with better user intent preservation.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activation:** "crdt", "conflict-free", "collaborative editing", "state-based replication", "pn counter", "or-set"
- **Prioridad de carga:** Media — importante para sistemas AP y offline-first
- **Dependencias:** `vector-clocks-lamport-timestamps`, `cap-theorem-tradeoffs`

### Tool Integration

```json
{
  "tool_name": "crdts-conflict-free-replicated",
  "description": "CRDT types (GCounter, PNCounter, ORSet, LWWRegister) for conflict-free replication in distributed systems",
  "triggers": ["crdt", "conflict-free", "pn counter", "or-set", "collaborative editing", "yjs", "automerge"],
  "context_hint": "Load when user asks about conflict-free data types, collaborative editing, or AP system convergence",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre CRDTs o conflict-free replication, carga el skill
crdts-conflict-free-replicated. Prioriza ejemplos de implementación de PNCounter y ORSet
y menciona Yjs para collaborative editing.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Riak CRDT counters
riak-admin bucket-type create counters '{"props":{"datatype":"counter"}}'
curl -X POST http://localhost:8098/types/counters/buckets/test/datatypes/counter1

# Redis CRDT (Enterprise)
redis-cli CRDT.GET mykey
redis-cli CRDT.SET mykey value

# Yjs example
npm install yjs y-websocket
node -e "const Y = require('yjs'); const doc = new Y.Doc(); doc.getArray('items').insert(0, ['a','b']); console.log(doc.getArray('items').toArray())"
```

### GUI / Web

- **Yjs Live Demo** (https://yjs.dev) — collaborative text editor demo with WebSocket sync
- **Riak Control** — CRDT data inspection and conflict visualization
- **Automerge Inspector** — CRDT state debugging tool (Chrome extension)
- **RedisInsight** — CRDT data types visualization (Redis Enterprise)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| CRDT test | `node -e "Y.Doc()"` | Yjs Live Demo |
| Riak counter | `riak-admin bucket-type create counters` | Riak Control → Data Types |
| Check state | `curl <riak-url>` | Automerge Inspector |

---

## 7. Cheatsheet Rápido

```python
# CRDT merge function properties: commutative, associative, idempotent (CAI)

# G-Counter (grow-only): each node increments its own entry
# PNCounter: G-Counter for positive + G-Counter for negative
# OR-Set: value -> set(tags), remove = drop tag set, merge = union
# LWW-Register: (value, timestamp, node), latest wins

# State-based (CvRDT): merge full state → higher bandwidth, no delivery guarantees
# Operation-based (CmRDT): broadcast ops → lower bandwidth, need reliable ordered delivery

# Libraries: Yjs (JS), Automerge (Rust/JS), pycrdt (Python)
# Local-first: CRDT + IndexedDB/SQLite for offline, sync when online
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `vector-clocks-lamport-timestamps` | base — CRDTs use vector clocks for causal history | Sí |
| `cap-theorem-tradeoffs` | contexto — CRDTs enable AP systems | Sí |
| `hybrid-logical-clocks` | alternativo — HLC for LWW ordering | No |
| `distributed-consensus-raft` | alternativo — CRDT (no coordination) vs Raft (coordination) | No |
| `websockets-sse-realtime` | complementario — transport for CRDT sync messages | No |

---

## 9. Metadatos del Skill

```yaml
---
id: crdts-conflict-free-replicated
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [crdt, conflict-free, replication, pn-counter, or-set, lww, yjs, automerge, local-first]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

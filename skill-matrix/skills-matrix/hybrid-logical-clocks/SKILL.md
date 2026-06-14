---
name: hybrid-logical-clocks
description: "Hybrid Logical Clocks (HLC) combine physical wall clocks with a logical counter to provide causal ordering with bounded drift"
---
# Hybrid Logical Clocks

## Semantic Triggers
```
hybrid logical clock hlc for distributed systems, hlc combining physical and logical time, hlc to causal ordering and snapshot reads, cassandra hlc and last write wins conflict, hlc vs vector clock size and complexity, hlc for distributed transaction ordering
```

---

## 1. Definición Teórica

Hybrid Logical Clocks (HLC) combine physical wall clocks with a logical counter to provide causal ordering with bounded drift. They solve the problem of timestamp ordering in distributed systems without the size explosion of vector clocks. Key distinction: HLC is 64 bits (similarly sized to Lamport timestamps) but provides near-physical timestamp accuracy, enabling uses like snapshot reads and distributed transaction ordering that Lamport timestamps cannot support.

---

## 2. Implementación de Referencia

**Cassandra** uses HLC (implemented as `AtomicBoundedLocalTime`). **CockroachDB** uses HLC for transaction ordering and snapshot reads. **Google Spanner** uses TrueTime (GPS + atomic clocks) — a physical clock approach with bounded uncertainty. **MongoDB** uses a hybrid of logical and wall clock times.

### Ejemplo Práctico Avanzado

```python
import time
from dataclasses import dataclass
from typing import Optional

@dataclass
class HLCTimestamp:
    """48-bit physical (ms), 16-bit logical counter"""
    physical: int  # ms since epoch
    logical: int   # monotonic counter within same physical ms

    def pack(self) -> int:
        """Pack into 64-bit uint for storage efficiency."""
        return (self.physical << 16) | self.logical

    @staticmethod
    def unpack(packed: int) -> "HLCTimestamp":
        return HLCTimestamp(physical=packed >> 16, logical=packed & 0xFFFF)

    def __lt__(self, other: "HLCTimestamp") -> bool:
        return (self.physical, self.logical) < (other.physical, other.logical)

    def __le__(self, other: "HLCTimestamp") -> bool:
        return (self.physical, self.logical) <= (other.physical, other.logical)

    def __eq__(self, other: "HLCTimestamp") -> bool:
        return self.physical == other.physical and self.logical == other.logical


class HybridLogicalClock:
    """HLC implementation combining NTP-synced wall clock with logical counter."""
    def __init__(self, node_id: str = ""):
        self.pt = 0       # max physical time seen (ms)
        self.l = 0        # logical counter
        self.node_id = node_id

    def now(self) -> HLCTimestamp:
        """Generate a new timestamp for a local event."""
        wt = self._wall_time()
        if wt > self.pt:
            self.pt = wt
            self.l = 0
        else:
            self.l += 1
        return HLCTimestamp(self.pt, self.l)

    def recv(self, other: HLCTimestamp) -> HLCTimestamp:
        """Update clock upon receiving a message with a remote timestamp."""
        wt = self._wall_time()
        self.pt = max(wt, self.pt, other.physical)
        if self.pt == other.physical == self.pt:
            # All equal: advance logical by max + 1
            self.l = max(self.l, other.logical) + 1
        elif self.pt == wt:
            # Our wall clock is the max: increment logical
            self.l += 1
        else:
            # Other's physical is the max: reset logical
            self.l = 0
        return HLCTimestamp(self.pt, self.l)

    def _wall_time(self) -> int:
        """Get current wall time in milliseconds."""
        return int(time.time() * 1000)

    def sanity_check(self, max_drift_ms: int = 200):
        """Verify clock drift is within acceptable bounds."""
        drift = abs(self._wall_time() - self.pt)
        if drift > max_drift_ms:
            raise ClockDriftError(f"Clock drift {drift}ms exceeds {max_drift_ms}ms")

    def __lt__(self, other: "HybridLogicalClock") -> bool:
        return (self.pt, self.l) < (other.pt, other.l)


# Usage: distributed snapshot reads with HLC
class DistributedStorage:
    def __init__(self, clock: HybridLogicalClock):
        self.clock = clock
        self.store: dict[str, tuple[bytes, HLCTimestamp]] = {}

    def write(self, key: str, value: bytes) -> HLCTimestamp:
        ts = self.clock.now()
        self.store[key] = (value, ts)
        return ts

    def read_at(self, key: str, snapshot_ts: Optional[HLCTimestamp] = None) -> Optional[bytes]:
        """Read at a specific HLC timestamp (snapshot read)."""
        if key not in self.store:
            return None
        _, write_ts = self.store[key]
        if snapshot_ts and write_ts > snapshot_ts:
            return None  # Value written after snapshot time
        return self.store[key][0]

    def merge_write(self, key: str, value: bytes, ts: HLCTimestamp):
        """Handle writes from other replicas."""
        self.clock.recv(ts)
        if key not in self.store or self.store[key][1] < ts:
            self.store[key] = (value, ts)

    def conflict_resolve(self, key: str, local_ts: HLCTimestamp, remote_ts: HLCTimestamp,
                         local_val: bytes, remote_val: bytes) -> bytes:
        """LWW conflict resolution using HLC + node_id tiebreaker."""
        if local_ts > remote_ts:
            return local_val
        elif remote_ts > local_ts:
            return remote_val
        else:
            # Equal timestamps: use node_id tiebreaker
            return local_val if self.clock.node_id < "9" else remote_val
```

**Fuente oficial:** https://cse.buffalo.edu/tech-reports/2014-04.shtml

### Alternativa de Implementación Específica

**TrueTime API** (Google Spanner) uses GPS + atomic clocks with a bounded uncertainty interval (ε). Instead of a single timestamp, TrueTime returns `[earliest, latest]` and waits for `ε` before committing — providing external consistency without logical components.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Distributed databases needing causal consistency, snapshot reads, or total ordering; CockroachDB, Cassandra-like systems; geo-distributed transactions |
| **Cuándo evitar** | Single-node systems (wall clock is fine). Systems requiring external linearizability (use TrueTime/Spanner). Systems already using vector clocks (HLC lacks conflict detection) |
| **Alternativas** | Vector clocks (causal history + conflict detection). Lamport timestamps (simpler, no physical time). TrueTime (external consistency, requires special hardware) |
| **Coste/Complejidad** | Low — 64 bits per event, simple implementation. Requires NTP sync (10ms max drift). Clock drift monitoring essential |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: HLC clock drift exceeds maximum bound

**¿Qué ocasionó el error?**
A node's NTP service fails. Its wall clock drifts 500ms ahead of other nodes. The HLC clock follows, producing future timestamps that violate causal ordering across nodes.

**¿Cómo se solucionó?**
Monitor clock drift via `sanity_check()`. If drift exceeds max (200ms), put the node into read-only mode. Use NTP with multiple servers and `check_interval=30s`. Alert on drift > 100ms.

**¿Por qué funciona esta técnica?**
Read-only mode prevents writes with inaccurate timestamps. Other nodes detect the drift when receiving messages (HLC recv handles it correctly). NTP with multiple servers provides redundancy.

### Caso: HLC cannot detect concurrent updates

**¿Qué ocasionó el error?**
Two nodes concurrently update the same key. HLC timestamps are (100, 0) and (100, 1). The LWW (last-writer-wins) strategy picks (100, 1) — but they were concurrent, so data might be lost.

**¿Cómo se solucionó?**
Use HLC for total ordering + version vectors for conflict detection. Or accept LWW semantics (which HLC supports well). For CRDT-aware systems, use HLC for ordering and CRDTs for merging.

**¿Por qué funciona esta técnica?**
HLC provides a total order, not causal history. If concurrent updates are possible, add a vector clock component or accept LWW. HLC's total order is deterministic and consistent across all nodes.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "hybrid logical clock", "hlc", "logical clock physical", "causal ordering timestamp"
- **Prioridad de carga:** Media — especializado en ordenamiento temporal distribuido
- **Dependencias:** `vector-clocks-lamport-timestamps`, `distributed-transactions-2pc-3pc`

### Tool Integration

```json
{
  "tool_name": "hybrid-logical-clocks",
  "description": "Hybrid Logical Clocks combining physical wall clock and logical counter for causal ordering and snapshot reads",
  "triggers": ["hybrid logical clock", "hlc", "logical clock", "causal ordering", "snapshot read"],
  "context_hint": "Load when user asks about distributed time ordering, HLC, or timestamp-based snapshot reads",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Hybrid Logical Clocks o HLC, carga el skill
hybrid-logical-clocks. Prioriza la implementación de 64-bit HLC y su uso para
snapshot reads sobre teoría de relojes lógicos.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Check NTP sync (essential for HLC)
timedatectl status
ntpq -p
chronyc tracking

# Cassandra HLC status
nodetool gossipinfo | grep -i "clock"
nodetool proxyhistograms

# CockroachDB: HLC timestamp check
cockroach node status --insecure
cockroach sql --insecure -e "SELECT cluster_logical_timestamp(), now(), clock_timestamp()"

# Simulate NTP drift
chronyc makestep  # force sync
```

### GUI / Web

- **CockroachDB Console** — HLC timestamps in transaction details, clock offset dashboard
- **Cassandra OpsCenter** — node clock drift monitoring, HLC metrics
- **Grafana** — NTP offset per node, HLC vs wall clock drift dashboard
- **Datadog** — clock drift tracking, HLC logical counter rate

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check NTP | `timedatectl status` | Grafana → Clock Drift |
| HLC status | `SELECT cluster_logical_timestamp()` | CockroachDB Console → Transactions |
| Drift check | `chronyc tracking \| grep "System time"` | OpsCenter → Node Clocks |

---

## 7. Cheatsheet Rápido

```python
# HLC: 48-bit physical (ms) + 16-bit logical = 64 bits total

# Generate local event
def now():
    wt = wall_time_ms()
    if wt > pt:
        pt, l = wt, 0
    else:
        l += 1
    return (pt << 16) | l

# Receive remote timestamp
def recv(other_hlc):
    wt = wall_time_ms()
    pt = max(wt, pt, other_pt)
    if pt == other_pt == pt:
        l = max(l, other_l) + 1
    elif pt == wt:
        l += 1
    else:
        l = 0

# Key properties:
# - 64 bits total (same as Lamport)
# - Near-physical timestamp accuracy
# - Causal ordering: (physical, logical) tuple compare
# - Requires NTP sync (max drift < 200ms)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `vector-clocks-lamport-timestamps` | alternativo — HLC vs vector clock comparison | Sí |
| `distributed-transactions-2pc-3pc` | complementario — HLC for transaction ordering | No |
| `crdts-conflict-free-replicated` | alternativo — HLC for LWW, CRDTs for conflict detection | No |
| `cap-theorem-tradeoffs` | contexto — consistency models using HLC | No |
| `database-replication-lag-strategies` | complementario — HLC for read timestamps | No |

---

## 9. Metadatos del Skill

```yaml
---
id: hybrid-logical-clocks
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [hybrid-logical-clock, hlc, logical-clock, causal-ordering, snapshot-read, cockroachdb, cassandra]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

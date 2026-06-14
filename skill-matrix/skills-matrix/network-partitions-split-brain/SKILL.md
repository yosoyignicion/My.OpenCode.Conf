---
name: network-partitions-split-brain
description: "A network partition splits a distributed system into two or more groups that cannot communicate"
---
# Network Partitions & Split-Brain

## Semantic Triggers
```
network partition detection and fencing mechanisms, split brain prevention with quorum and lease, split brain in distributed databases and consensus, fencing with stonith and tenant isolation, partial partition tolerant systems with sloppy quorum, handling split brain with manual intervention procedures
```

---

## 1. Definición Teórica

A network partition splits a distributed system into two or more groups that cannot communicate. Split-brain occurs when both groups independently continue operating, leading to data divergence. It solves the problem of maintaining safety during network failures. Key distinction: partition prevention (redundant networks) vs partition tolerance (application-level handling through quorum, leases, or fencing).

---

## 2. Implementación de Referencia

**Raft** (embedded in etcd, Consul) handles partitions via majority quorum. **Cassandra** uses sloppy quorum + hinted handoff. **ZooKeeper** uses Zab with majority. **MongoDB** replica sets with majority write concern. **STONITH** (Shoot The Other Node In The Head) in HA clusters.

### Ejemplo Práctico Avanzado

```python
import asyncio
import time
from enum import Enum
from dataclasses import dataclass

class NodeState(Enum):
    ACTIVE = "active"
    SUSPECTED = "suspected"
    INACTIVE = "inactive"

@dataclass
class Node:
    id: str
    address: str
    state: NodeState = NodeState.ACTIVE
    last_seen: float = 0.0

class PartitionDetector:
    """Detect network partitions using gossip-based failure detection."""
    def __init__(self, self_node: Node, peers: list[Node], timeout: float = 5.0, suspicion_window: float = 2.0):
        self.self_node = self_node
        self.peers = {n.id: n for n in peers}
        self.timeout = timeout
        self.suspicion_window = suspicion_window
        self.in_quorum = True

    async def ping_loop(self):
        while True:
            for peer_id, peer in list(self.peers.items()):
                if peer.id == self.self_node.id:
                    continue
                try:
                    # Simulate ping
                    await asyncio.sleep(0.1)
                    peer.last_seen = time.monotonic()
                    peer.state = NodeState.ACTIVE
                except Exception:
                    if time.monotonic() - peer.last_seen > self.suspicion_window:
                        peer.state = NodeState.SUSPECTED
                    if time.monotonic() - peer.last_seen > self.timeout:
                        peer.state = NodeState.INACTIVE
            self._check_quorum()
            await asyncio.sleep(1.0)

    def _check_quorum(self):
        """Check if we have majority connectivity."""
        active = sum(1 for p in self.peers.values() if p.state == NodeState.ACTIVE)
        total = len(self.peers)
        self.in_quorum = active >= (total // 2 + 1)

    def should_yield_leadership(self, is_leader: bool) -> bool:
        """If I'm the leader but don't have quorum, I should step down."""
        return is_leader and not self.in_quorum


class FencingMechanism:
    """Prevents split-brain via fencing tokens."""
    def __init__(self):
        self._token = 0

    def acquire_token(self) -> int:
        """Monotonically increasing token. The store rejects writes with stale tokens."""
        self._token += 1
        return self._token

    def verify_token(self, token: int) -> bool:
        """Shared storage (e.g., etcd) verifies token is the latest."""
        return token >= self._token


# Quorum-based decision maker
class QuorumManager:
    def __init__(self, total_nodes: int):
        self.total_nodes = total_nodes
        self.majority = total_nodes // 2 + 1

    async def can_write(self, reachable_nodes: list[str]) -> bool:
        """Only allow writes if we have majority."""
        return len(reachable_nodes) >= self.majority

    async def read_with_quorum(self, reachable: list[str], read_fn, quorum_size: int = None):
        """Read from R replicas, return latest."""
        r = quorum_size or (self.total_nodes // 2 + 1)
        results = []
        for node in reachable:
            result = await read_fn(node)
            results.append(result)
            if len(results) >= r:
                break
        # Return latest timestamp among quorum reads
        return max(results, key=lambda x: x.get("timestamp", 0))

    async def auto_resolve(self, data_sets: list[dict]) -> dict:
        """Auto-resolve conflict via LWW or CRDT merge."""
        # Last-writer-wins by timestamp
        return max(data_sets, key=lambda d: d.get("timestamp", 0))
```

**Fuente oficial:** https://en.wikipedia.org/wiki/Split-brain_(computing)

### Alternativa de Implementación Específica

**STONITH** — hard reboot the node in the minority partition. In Kubernetes: `kubectl delete pod` (force delete). In cloud: terminate EC2 instance via AWS API. In bare-metal: IPMI power cycle. Reserve for last resort.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Distributed databases, consensus systems, HA clusters, any system where nodes must agree on state |
| **Cuándo evitar** | Stateless services (no mutable state), CRDT-based systems (converge automatically), systems that can tolerate inconsistency |
| **Alternativas** | CRDTs for automatic convergence. Single leader with lease (simpler). External consensus service (etcd) instead of self-managed |
| **Coste/Complejidad** | High — partition detection is subtle (false positives cause unnecessary failovers). Fencing requires shared storage or IPMI. Manual reconciliation procedures must be documented and tested |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: False partition detection causes unnecessary failover

**¿Qué ocasionó el error?**
A network congestion spike causes 1-second latency between nodes. The failure detector (3s timeout) marks nodes as dead. Leader steps down, new election triggers — all unnecessary.

**¿Cómo se solucionó?**
Use phi-accrual failure detector (Cassandra) that adapts to network variance. Set suspicion window (5s) before declaring death. Use redundant network paths (bonded NICs).

**¿Por qué funciona esta técnica?**
Phi-accrual models historical heartbeat variance. Brief congestion doesn't trigger suspicion; only sustained silence does. Redundant paths prevent single-link partitions.

### Caso: Split-brain causes data corruption in 2-node cluster

**¿Qué ocasionó el error?**
A 2-node PostgreSQL streaming replication cluster loses network connectivity. Both nodes promote to primary. Writes diverge — reconciliation is impossible.

**¿Cómo se solucionó?**
Use 3-node cluster with synchronous replication (`synchronous_standby_names`). For 2-node scenarios, use a witness/arbitrator node (e.g., etcd) or STONITH.

**¿Por qué funciona esta técnica?**
3 nodes require majority (2/3). A partition leaves one side with 1 node (no quorum) and the other with 2 (quorum). The side with quorum continues; the other stops writes, preventing split-brain.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "split brain", "network partition", "fencing", "stonith", "quorum", "split brain prevention"
- **Prioridad de carga:** Alta — fundamental para seguridad de sistemas distribuidos
- **Dependencias:** `distributed-consensus-raft`, `gossip-protocols-membership`

### Tool Integration

```json
{
  "tool_name": "network-partitions-split-brain",
  "description": "Network partition detection, split-brain prevention (quorum, fencing, STONITH), and recovery strategies",
  "triggers": ["split brain", "network partition", "fencing", "stonith", "quorum", "partition detection"],
  "context_hint": "Load when user asks about network partitions, split-brain scenarios, or cluster safety",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre split-brain o network partitions, carga el skill
network-partitions-split-brain. Prioriza quorum-based prevention y fencing tokens
sobre métodos manuales de recuperación.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Simulate partition with iptables
iptables -A INPUT -s <peer-ip> -j DROP
iptables -A OUTPUT -d <peer-ip> -j DROP
# Revert
iptables -D INPUT -s <peer-ip> -j DROP
iptables -D OUTPUT -d <peer-ip> -j DROP

# etcd: check quorum
etcdctl endpoint status --cluster -w table

# Kubernetes pod eviction (STONITH-like)
kubectl delete pod <pod> --force --grace-period=0

# MongoDB replica set status
rs.status()  # check if PRIMARY has majority

# Cassandra: check partition status
nodetool gossipinfo
nodetool status  # look for UN, UJ, UL, etc.

# Pacemaker fence test (HA clusters)
pcs stonith confirm <node>
```

### GUI / Web

- **Kiali** — service graph shows network health and connectivity between services
- **etcd Dashboard** — cluster health, leader visibility, quorum status
- **MongoDB Atlas** — replica set health, partition detection alerts
- **Datadog** — cluster health dashboard with partition event markers
- **HA Cluster Web UI** — STONITH status, fencing operations, cluster quorum view

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Simulate partition | `iptables -A INPUT -s <ip> -j DROP` | Chaos Mesh → Network Partition |
| Check quorum | `etcdctl endpoint status --cluster` | etcd Dashboard → Cluster |
| Fence node | `kubectl delete pod --force` | HA Cluster UI → Fencing |
| Recover | `iptables -D INPUT -s <ip> -j DROP` | — |

---

## 7. Cheatsheet Rápido

```text
# Split-brain prevention: quorum, fencing, leases

# Quorum: majority = floor(N/2) + 1
# 3 nodes: tolerate 1 failure | 5 nodes: tolerate 2 failures
# NEVER run 2-node cluster (no majority possible during partition)

# Fencing:
#   Fencing token: monotonically increasing, stored in shared storage
#   STONITH: hard reboot/terminate the node in minority partition
#   Lease: TTL-based leadership; minority cannot renew lease

# Detection:
#   Phi-accrual: adaptive to network variance
#   Suspicion window: 5s before marking as dead
#   Redundant paths: bonded NICs, multiple switches

# Recovery:
#   1. Stop ALL traffic to the data
#   2. Pick partition with most recent data
#   3. Reconcile diverged writes (LWW or manual)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-consensus-raft` | implementación — Raft handles partitions via quorum | Sí |
| `gossip-protocols-membership` | complementario — gossip for partition detection | Sí |
| `distributed-locking-redlock` | complementario — fencing tokens for safe locking | No |
| `cap-theorem-tradeoffs` | contexto — CAP during partitions | Sí |
| `fault-injection-chaos-engineering` | complementario — test partition handling via chaos | No |

---

## 9. Metadatos del Skill

```yaml
---
id: network-partitions-split-brain
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [split-brain, network-partition, quorum, fencing, stonith, partition-detection, cluster-safety]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

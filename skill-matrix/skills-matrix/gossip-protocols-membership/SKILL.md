---
name: gossip-protocols-membership
description: "Gossip protocols enable decentralized node discovery and failure detection"
---
# Gossip Protocols & Membership

## Semantic Triggers
```
gossip protocol for failure detection and membership, swim protocol and lifeguard enhancements, gossip based broadcast with infection style, gossip convergence time and fanout tuning, eventually consistent membership with suspicion mechanism, phi accrual failure detector for adaptive timeout
```

---

## 1. Definición Teórica

Gossip protocols enable decentralized node discovery and failure detection. Each node periodically exchanges state with a random subset of peers (fanout). They solve the problem of maintaining consistent cluster membership without a central registry. Key distinction over heartbeat-based detection: gossip is scalable (O(log N) convergence rounds), decentralized, and naturally handles partial failures via suspicion mechanisms (SWIM, phi-accrual).

---

## 2. Implementación de Referencia

**SWIM** (Scalable Weakly-consistent Infection-style Membership) protocol with **Lifeguard** enhancements — used by HashiCorp Serf, Consul, and **memberlist** (Go library). **Cassandra** uses a phi-accrual failure detector with gossip for membership. **DynamoDB** uses gossip for ring membership propagation.

### Ejemplo Práctico Avanzado

```python
import random
import asyncio
import time
import math

class GossipNode:
    def __init__(self, node_id: str, seed_nodes: list[str], fanout: int = 3):
        self.node_id = node_id
        self.seed_nodes = seed_nodes
        self.fanout = fanout
        self.members: dict[str, tuple[int, float, str]] = {}  # id -> (incarnation, last_seen, status)
        self.incarnation = 0
        self.failure_timeout = 5.0  # seconds
        self.suspicion_timeout = 15.0

    def start(self):
        asyncio.create_task(self._gossip_loop())
        asyncio.create_task(self._ping_loop())
        asyncio.create_task(self._cleanup_loop())

    async def _gossip_loop(self):
        while True:
            await asyncio.sleep(1.0)  # gossip period
            targets = random.sample(
                [n for n in self.members if n != self.node_id],
                min(self.fanout, len(self.members) - 1)
            )
            for target in targets:
                await self._send_sync(target)

    async def _ping_loop(self):
        while True:
            await asyncio.sleep(self.failure_timeout / 2)
            for member_id, (inc, last_seen, status) in list(self.members.items()):
                if member_id == self.node_id:
                    continue
                elapsed = time.monotonic() - last_seen
                if elapsed > self.failure_timeout and status == "alive":
                    # Suspect
                    self.members[member_id] = (inc, last_seen, "suspect")
                    print(f"Suspecting {member_id}")
                elif elapsed > self.suspicion_timeout and status == "suspect":
                    self.members[member_id] = (inc, last_seen, "dead")
                    print(f"Declaring {member_id} dead")

    async def _cleanup_loop(self):
        while True:
            await asyncio.sleep(60)
            now = time.monotonic()
            self.members = {
                mid: (inc, ts, st)
                for mid, (inc, ts, st) in self.members.items()
                if not (st == "dead" and now - ts > 300)
            }

    async def _send_sync(self, target: str):
        # Send membership delta (changes in last 30s)
        now = time.monotonic()
        synopsis = {
            mid: (inc, ts, st)
            for mid, (inc, ts, st) in self.members.items()
            if now - ts < 30
        }
        # In real implementation: send over UDP/TCP
        # Target node receives and merges
        await self._receive_sync(target, synopsis)

    async def _receive_sync(self, from_node: str, synopsis: dict):
        for node_id, (inc, ts, st) in synopsis.items():
            if node_id not in self.members:
                self.members[node_id] = (inc, ts, st)
            else:
                cur_inc, cur_ts, cur_st = self.members[node_id]
                if inc > cur_inc:
                    # Higher incarnation wins
                    self.members[node_id] = (inc, ts, st)
                elif inc == cur_inc and ts > cur_ts:
                    self.members[node_id] = (inc, ts, st)

    def phi(self, member_id: str) -> float:
        """Phi-accrual failure detector: returns suspicion level."""
        if member_id not in self.members:
            return float('inf')
        _, last_seen, _ = self.members[member_id]
        elapsed = time.monotonic() - last_seen
        if elapsed <= 0:
            return 0.0
        # Simplified: assume exponential distribution of inter-arrival times
        mean = 1.0  # estimated mean heartbeat interval
        return -math.log10(math.exp(-elapsed / mean))
```

**Fuente oficial:** https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf

### Alternativa de Implementación Específica

**Hashicorp memberlist** (Go) is the most widely deployed gossip library. Used by Consul, Serf, and Nomad. Provides SWIM protocol with Lifeguard, TCP/UDP ping, and conflict resolution. Integrate via `memberlist.Create()` with custom delegate for data broadcast.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cluster membership in decentralized systems (Cassandra, Consul, Serf), failure detection without central coordinator, data dissemination in large clusters |
| **Cuándo evitar** | Small clusters (<10 nodes, direct heartbeats are simpler). Systems requiring strong consistency (use Raft/ZK). Low-latency failure detection (gossip has convergence delay) |
| **Alternativas** | Central coordinator (etcd/ZK) for strong consistency. Heartbeat + leases for simpler failure detection |
| **Coste/Complejidad** | Medium — protocol tuning (fanout, suspicion windows, convergence speed). Low bandwidth but requires understanding of probabilistic convergence |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: False positives in failure detection on congested network

**¿Qué ocasionó el error?**
Network congestion causes intermittent packet loss. Gossip nodes mistake slow delivery for node failure, marking healthy nodes as dead and causing unnecessary state transfer.

**¿Cómo se solucionó?**
Implement phi-accrual failure detector (used by Cassandra). The phi value adapts to network conditions automatically. Only declare dead when phi > 8 (configurable).

**¿Por qué funciona esta técnica?**
Phi-accrual models historical heartbeat inter-arrival times. It adapts the suspicion threshold to current network variance — brief congestion doesn't trigger failures; sustained silence does.

### Caso: Slow convergence in large cluster

**¿Qué ocasionó el error?**
A 500-node cluster uses fanout=3 every 1s. After a node leaves, it takes ~20s for all nodes to detect the change because the gossip must propagate through O(log N) rounds.

**¿Cómo se solucionó?**
Increase fanout to `log(N)` (~9 for 500 nodes). Add direct pings to suspected nodes. For urgent changes (leader election), use a dedicated notification channel.

**¿Por qué funciona esta técnica?**
Gossip convergence requires O(log N) rounds at fanout = O(log N). Higher fanout reduces rounds but increases bandwidth — tradeoff tuned for cluster size.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "gossip protocol", "swim", "failure detection", "membership protocol", "phi accrual"
- **Prioridad de carga:** Media — importante para sistemas descentralizados
- **Dependencias:** `distributed-consensus-raft`, `network-partitions-split-brain`

### Tool Integration

```json
{
  "tool_name": "gossip-protocols-membership",
  "description": "Gossip protocols (SWIM) for decentralized cluster membership and failure detection with phi-accrual detector",
  "triggers": ["gossip protocol", "swim", "failure detection", "membership", "phi accrual", "serf"],
  "context_hint": "Load when user asks about cluster membership, decentralized failure detection, or gossip-based dissemination",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre gossip protocols o failure detection, carga el skill
gossip-protocols-membership. Prioriza el protocolo SWIM con phi-accrual detector
y menciona memberlist de Hashicorp como referencia principal.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Consul: member list via gossip
consul members
consul monitor -log-level=DEBUG | grep gossip

# Serf: standalone gossip tool
serf members
serf join <peer-ip>
serf monitor

# Cassandra: gossip info
nodetool gossipinfo
nodetool status

# Debug gossip protocol
tcpdump -i any udp port 7946  # Consul gossip port
```

### GUI / Web

- **Consul UI** — node topology, health status, service mesh visualization
- **Cassandra OpsCenter** — ring view with gossip propagation status
- **Serf Web UI** — cluster membership visualization (built-in web interface)
- **Datadog** — gossip latency metrics, membership change events

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Members | `consul members` | Consul UI → Nodes |
| Status | `nodetool status` | OpsCenter → Ring |
| Gossip info | `nodetool gossipinfo` | Serf UI → Members |

---

## 7. Cheatsheet Rápido

```text
# SWIM protocol: fanout, suspicion, indirect probing
# Gossip period: 1s, Fanout: 3-6 (log N for large clusters)
# Convergence: O(log N) rounds

# Phi-accrual detector: adaptive to network conditions
#   phi = -log10(P(likelihood of current gap))
#   phi < 1: alive | 1-8: suspect | > 8: dead

# memberlist (Go): Hashicorp's gossip library
#   Consul, Serf, Nomad all use it

# Seed nodes: 2-3 bootstrap peers
# TCP for membership sync, UDP for ping probes
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `distributed-consensus-raft` | complementario — gossip for discovery, Raft for consensus | Sí |
| `network-partitions-split-brain` | complementario — failure detection triggers partition handling | Sí |
| `consistent-hashing-topologies` | complementario — ring management via gossip | No |
| `service-discovery-dns-consul` | implementación — Consul uses gossip + Raft | No |
| `gossip-protocols-membership` | — | — |

---

## 9. Metadatos del Skill

```yaml
---
id: gossip-protocols-membership
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [gossip, swim, failure-detection, membership, phi-accrual, serf, consul, decentralized]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

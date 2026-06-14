---
name: distributed-consensus-raft
description: "Raft is a consensus algorithm designed for understandability, solving the problem of reaching agreement across a distributed cluster despite failures"
---
# Distributed Consensus — Raft

## Semantic Triggers
```
raft leader election mechanism, raft log replication and commit index, raft safety guarantees and quorum, raft cluster membership changes joint consensus, raft vs paxos comparison for practical systems, raft snapshot and log compaction
```

---

## 1. Definición Teórica

Raft is a consensus algorithm designed for understandability, solving the problem of reaching agreement across a distributed cluster despite failures. It elects a leader, replicates log entries via majority quorum, and guarantees safety under network partitions. Its key distinction over Paxos is the decomposition into leader election, log replication, and safety with a strong leader paradigm — making it significantly easier to implement correctly.

---

## 2. Implementación de Referencia

**etcd** (Go) — the most widely deployed Raft implementation, powering Kubernetes. Uses Raft for distributed key-value storage with watch, lease, and transaction support. **hashicorp/raft** (Go) is the standard library for embedding Raft into Go applications.

### Ejemplo Práctico Avanzado

```go
package raft

import (
    "sync"
    "time"
    "math/rand"
)

type State int
const (
    Follower State = iota
    Candidate
    Leader
)

type LogEntry struct {
    Term    int
    Command []byte
}

type Raft struct {
    mu        sync.Mutex
    id        string
    peers     []string
    state     State
    term      int
    votedFor  string
    log       []LogEntry
    commitIdx int
    lastApplied int
    nextIdx   []int
    matchIdx  []int
    electionTimeout time.Duration
    heartbeatInterval time.Duration
}

func NewRaft(id string, peers []string) *Raft {
    r := &Raft{
        id:        id,
        peers:     peers,
        state:     Follower,
        term:      0,
        log:       make([]LogEntry, 0),
        electionTimeout: time.Duration(150+rand.Intn(150)) * time.Millisecond,
        heartbeatInterval: 50 * time.Millisecond,
    }
    go r.runElectionTimer()
    return r
}

func (r *Raft) runElectionTimer() {
    for {
        r.mu.Lock()
        if r.state == Leader {
            r.mu.Unlock()
            time.Sleep(r.heartbeatInterval)
            continue
        }
        timeout := r.electionTimeout
        r.mu.Unlock()
        time.Sleep(timeout)
        r.mu.Lock()
        if r.state != Follower && r.state != Candidate { r.mu.Unlock(); continue }
        r.startElection()
        r.mu.Unlock()
    }
}

func (r *Raft) startElection() {
    r.state = Candidate
    r.term++
    r.votedFor = r.id
    votes := 1
    for _, peer := range r.peers {
        if peer == r.id { continue }
        go func(p string) {
            resp := r.requestVote(p)
            r.mu.Lock()
            if resp {
                votes++
                if votes > len(r.peers)/2 && r.state == Candidate {
                    r.state = Leader
                }
            }
            r.mu.Unlock()
        }(peer)
    }
}

func (r *Raft) requestVote(peer string) bool {
    // Simplified: send RequestVote RPC, check term and log
    return true
}
```

**Fuente oficial:** https://etcd.io/docs/v3.5/learning/raft/

### Alternativa de Implementación Específica

**Raft in Python** — `pyraft` or `asyncraft` for embedding in Python applications. **Rust** — `openraft` (production-ready, used in data infrastructure). For Java, **Raft** (Apache Ratis) provides a Hadoop-integrated Raft implementation.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Distributed coordination (leader election, config storage, service discovery), strongly consistent key-value stores, metadata management |
| **Cuándo evitar** | High write throughput (>10k writes/s single leader bottleneck), geo-distributed clusters (high latency between replicas), eventual consistency is acceptable |
| **Alternativas** | Paxos for maximum performance (but harder to implement). Zab (ZooKeeper) — similar to Raft. EPaxos for multi-leader scenarios |
| **Coste/Complejidad** | Medium — implement correctly requires understanding of term, election timeout tuning, and snapshot/compaction. Operational complexity grows with cluster size |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Leader election storm after network recovery

**¿Qué ocasionó el error?**
After a network partition heals, multiple nodes have stale terms and all attempt to become leader simultaneously. Repeated elections with no successful commit.

**¿Cómo se solucionó?**
Add randomized election timeout (150-300ms per node). Use pre-vote phase: a candidate first checks if it could win an election before incrementing its term.

**¿Por qué funciona esta técnica?**
Randomized timeouts ensure only one node's timer expires first in most cases. Pre-vote prevents a disconnected node from disrupting the established leader.

### Caso: Split-brain with 2-node cluster

**¿Qué ocasionó el error?**
A 2-node Raft cluster experiences a network partition. Both nodes think the other is dead, both become leader, and accept conflicting writes (no majority possible with 2 nodes).

**¿Cómo se solucionó?**
Never run 2-node Raft clusters. Minimum is 3 nodes for a single failure tolerance. For 2-node scenarios, use an external witness node or switch to a different coordination mechanism.

**¿Por qué funciona esta técnica?**
Raft requires majority (N/2 + 1). With 2 nodes, majority = 2 — any partition loses majority on both sides. With 3 nodes, majority = 2 — one side can still operate.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "raft consensus", "leader election", "distributed consensus", "etcd raft"
- **Prioridad de carga:** Alta — fundamental para coordinación de sistemas distribuidos
- **Dependencias:** `network-partitions-split-brain`, `vector-clocks-lamport-timestamps`

### Tool Integration

```json
{
  "tool_name": "distributed-consensus-raft",
  "description": "Raft consensus algorithm for distributed coordination, leader election, and log replication",
  "triggers": ["raft", "consensus", "leader election", "etcd", "log replication", "quorum"],
  "context_hint": "Load when user asks about distributed consensus, coordination services, or strongly consistent replication",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Raft consensus o distributed coordination, carga el skill
distributed-consensus-raft y responde siguiendo la sección de implementación de referencia.
Prioriza ejemplos de etcd o hashicorp/raft sobre teoría de protocolo.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# etcd cluster operations
etcdctl endpoint health --cluster
etcdctl endpoint status --cluster -w table

# Member management
etcdctl member list
etcdctl member add node3 --peer-urls=http://node3:2380

# Key operations
etcdctl put /config/database "primary"
etcdctl get /config/database

# Watch for changes
etcdctl watch /config/ --prefix

# Snapshot
etcdctl snapshot save snapshot.db
etcdctl snapshot restore snapshot.db --data-dir=/var/lib/etcd-restore
```

### GUI / Web

- **etcd Dashboard** — built-in web UI on port 2379 (`/dashboard`)
- **etcdkeeper** — open-source etcd browser with key/value tree view
- **Kubernetes Dashboard** — shows etcd cluster health in cluster info
- **Grafana** — etcd dashboard (ID 3070) for Raft proposals, leader changes, and disk sync latency

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Health check | `etcdctl endpoint health` | etcd Dashboard → Cluster |
| Member list | `etcdctl member list` | etcd Dashboard → Members |
| Snapshot | `etcdctl snapshot save <file>` | — |
| Watch key | `etcdctl watch <key>` | — |

---

## 7. Cheatsheet Rápido

```bash
# etcd cluster 3 nodes minimum
# Majority = floor(N/2)+1 → 3 tolerates 1 failure, 5 tolerates 2

# Election timeout: 150-300ms (randomized)
# Heartbeat interval: 50ms
# Snapshot at 10000 log entries

# Never run 2-node cluster
# Always use odd number of nodes
# Pre-vote prevents term disruption

etcdctl endpoint health -w table
etcdctl endpoint status -w table
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `network-partitions-split-brain` | complementario — Raft prevents split-brain via majority quorum | Sí |
| `distributed-locking-redlock` | alternativo — etcd-based locking vs Redis Redlock | No |
| `gossip-protocols-membership` | complementario — gossip for discovery, Raft for consensus | No |
| `distributed-transactions-2pc-3pc` | complementario — consensus for transaction coordination | No |
| `hybrid-logical-clocks` | complementario — clock ordering in distributed systems | No |

---

## 9. Metadatos del Skill

```yaml
---
id: distributed-consensus-raft
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [raft, consensus, leader-election, log-replication, etcd, quorum, safety, fault-tolerance]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: cap-theorem-tradeoffs
description: "CAP theorem states a distributed data store can only provide two of three guarantees: Consistency (C — all nodes see the same data), Availability (A — every request receives a response), and Partit..."
---
# CAP Theorem Tradeoffs

## Semantic Triggers
```
cap theorem consistency availability partition tolerance, cp vs ap system design choices, eventual consistency vs strong consistency in practice, cap theorem in nosql databases, tradeoffs between consistency and availability in partitions, cap theorem in real world distributed systems
```

---

## 1. Definición Teórica

CAP theorem states a distributed data store can only provide two of three guarantees: Consistency (C — all nodes see the same data), Availability (A — every request receives a response), and Partition Tolerance (P — system continues despite network failures). Since partitions are inevitable in distributed systems, the real tradeoff is between CP and AP during partitions. Key distinction: CAP governs behavior ONLY during partitions — in normal operation, both C and A are achievable.

---

## 2. Implementación de Referencia

Not a tool but a design framework. Applied in database selection: **etcd/ZooKeeper** (CP — consistent, unavailable during partition), **Cassandra/DynamoDB** (AP — available, eventually consistent), **Spanner/CockroachDB** (CP with high availability). Tunable consistency (like Cassandra's `QUORUM` vs `ONE`) lets you navigate CAP per operation.

### Ejemplo Práctico Avanzado

```python
# CAP-aware database router
from enum import Enum

class ConsistencyLevel(Enum):
    EVENTUAL = 1     # ONE — AP, fastest, stale reads
    LOCAL = 2        # TWO — local DC
    STRONG = "QUORUM"  # CP, majority, consistent

class CAPRouter:
    def __init__(self, db_pool):
        self.pool = db_pool

    def write_user(self, user_id: int, data: dict, level: ConsistencyLevel = ConsistencyLevel.STRONG):
        if level == ConsistencyLevel.STRONG:
            # Must be CP: wait for majority ack
            self.pool.execute("INSERT INTO users (id, data) VALUES (%s, %s)",
                              (user_id, data), consistency_level="QUORUM")
        else:
            # AP: write to local, return fast
            self.pool.execute("INSERT INTO users (id, data) VALUES (%s, %s)",
                              (user_id, data), consistency_level="ONE")

    def read_user(self, user_id: int, level: ConsistencyLevel = ConsistencyLevel.EVENTUAL) -> dict:
        if level == ConsistencyLevel.STRONG:
            # Read from majority to ensure latest
            rows = self.pool.execute("SELECT data FROM users WHERE id = %s",
                                     (user_id,), consistency_level="QUORUM")
        else:
            # Read from nearest replica, possibly stale
            rows = self.pool.execute("SELECT data FROM users WHERE id = %s",
                                     (user_id,), consistency_level="ONE")
        return rows[0] if rows else None

# Usage: strong for payments, eventual for profiles
router.write_user(user_id, data, ConsistencyLevel.STRONG)
profile = router.read_user(user_id, ConsistencyLevel.EVENTUAL)
```

**Fuente oficial:** https://www.allthingsdistributed.com/2023/04/pacelc-and-cap-theorem.html

### Alternativa de Implementación Específica

**CRDTs** (Conflict-free Replicated Data Types) provide an alternative approach: AP systems that converge to consistency without coordination. DynamoDB uses last-writer-wins (LWW); Riak uses vector clocks + CRDT merge.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | As a mental model for database selection and distributed system design, not as an absolute law |
| **Cuándo evitar** | As justification for poor design — most systems don't experience partitions frequently; latency vs consistency is often more relevant (PACELC) |
| **Alternativas** | PACELC theorem for normal operation behavior. FLP impossibility for consensus. CALM theorem for consistency as logical monotonicity |
| **Coste/Complejidad** | Conceptual — no direct cost. But choosing wrong pole leads to data loss (AP for billing) or downtime (CP for user profiles) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Believing CAP is always active

**¿Qué ocasionó el error?**
Engineer designs an AP system (Cassandra) believing consistency is never guaranteed. During normal operation (no partition), the system provides full consistency but the application doesn't use it, causing confusing behavior with stale reads.

**¿Cómo se solucionó?**
Use tunable consistency levels. For critical writes, use QUORUM. For reads after writes by the same user, use read-your-writes consistency (LOCAL_QUORUM). CAP only dictates behavior during partitions.

**¿Por qué funciona esta técnica?**
CAP describes a corner case (partition). Normal operation allows both C and A. Tunable consistency lets you choose between them at the operation level.

### Caso: CP system causes global outage

**¿Qué ocasionó el error?**
A ZooKeeper (CP) cluster manages leader election. During a network partition, both sides lose quorum. Both reject writes, making the entire system unavailable globally.

**¿Cómo se solucionó?**
Implement a fallback mode: when ZooKeeper is unavailable, services use a cached configuration with a lease (last-known-good). The cached config degrades gracefully rather than failing entirely.

**¿Por qué funciona esta técnica?**
CP systems reject writes during partition to ensure consistency. A cached configuration with lease allows read-only operation until the partition heals, maintaining availability at the cost of potential staleness.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "cap theorem", "cap tradeoffs", "consistency vs availability", "cp vs ap"
- **Prioridad de carga:** Alta — fundamental conceptual framework
- **Dependencias:** `pacelc-theorem-implications`, `crdts-conflict-free-replicated`

### Tool Integration

```json
{
  "tool_name": "cap-theorem-tradeoffs",
  "description": "CAP theorem — consistency, availability, partition tolerance tradeoffs for distributed system design",
  "triggers": ["cap theorem", "cp vs ap", "consistency availability", "database tradeoff"],
  "context_hint": "Load when user asks about distributed data consistency, database selection, or system design tradeoffs",
  "output_format": "markdown",
  "max_tokens": 850
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre CAP theorem o tradeoffs de consistencia, carga el skill
cap-theorem-tradeoffs y responde enfatizando que CAP solo aplica durante particiones.
Usa ejemplos de bases de datos reales (Cassandra, etcd, Spanner).
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Cassandra consistency level test
cqlsh -e "CONSISTENCY QUORUM; SELECT * FROM users WHERE id = 42;"

# etcd quorum check
etcdctl endpoint status --cluster -w table | awk '{print $4}' | grep -c "true"

# DynamoDB consistent read via CLI
aws dynamodb get-item --table-name users --key '{"id":{"S":"42"}}' --consistent-read

# Simulate partition (iptables)
iptables -A INPUT -s <peer-ip> -j DROP
```

### GUI / Web

- **Jepsen Analysis** — consistency verification reports for databases (https://jepsen.io/analyses)
- **Cassandra nodetool** — `nodetool proxyhistograms` shows consistency latency distribution
- **AWS Well-Architected Tool** — CAP decision documentation
- **Lucidchart** — architecture diagrams with CAP classification per service

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check consistency | `CONSISTENCY <level>` (cqlsh) | AWS Console → DynamoDB → Consistent Read |
| Cluster health | `etcdctl endpoint health` | Datadog → etcd Cluster |
| Simulate partition | `iptables -A INPUT -s <ip> -j DROP` | Chaos Mesh → Network Partition |

---

## 7. Cheatsheet Rápido

```text
CAP applies ONLY during network partitions.
Normal operation: both C and A are possible.

CP systems (partition → unavailable): etcd, ZooKeeper, HBase, Spanner
AP systems (partition → eventually consistent): Cassandra, DynamoDB, Riak, Scylla

Choose CP for: financial, locking, configuration, leader election
Choose AP for: user profiles, content feeds, analytics, IoT sensor data

Tunable consistency: QUORUM (strong), ONE (eventual), LOCAL_QUORUM (read-your-writes)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `pacelc-theorem-implications` | complementario — extends CAP for normal operation | Sí |
| `crdts-conflict-free-replicated` | solución — AP with eventual consistency via CRDTs | No |
| `distributed-consensus-raft` | CP — Raft implements strong consistency | No |
| `database-replication-lag-strategies` | complementario — handling AP staleness | No |

---

## 9. Metadatos del Skill

```yaml
---
id: cap-theorem-tradeoffs
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [cap-theorem, consistency, availability, partition-tolerance, cp, ap, distributed-systems]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

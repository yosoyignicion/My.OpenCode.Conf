---
name: pacelc-theorem-implications
description: "PACELC extends CAP: if a Partition (P) occurs, trade off Availability (A) vs Consistency (C); Else (E), trade off Latency (L) vs Consistency (C)"
---
# PACELC Theorem Implications

## Semantic Triggers
```
pacelc tradeoffs if partition else latency consistency, pacelc vs cap theorem differences, dynamo style eventually consistent vs paxos style strongly consistent, pacelc for cloud database selection, latency vs consistency tradeoffs in normal operation
```

---

## 1. Definición Teórica

PACELC extends CAP: if a Partition (P) occurs, trade off Availability (A) vs Consistency (C); Else (E), trade off Latency (L) vs Consistency (C). It solves CAP's limitation of only describing partition behavior. Key distinction: PACELC makes explicit that normal-operation latency vs consistency is often the more impactful design decision than the partition case, which is rare.

---

## 2. Implementación de Referencia

Not a tool but a decision framework. Applied to classify distributed databases and services into categories: **PA/EL** (Cassandra, DynamoDB — available during partition, low latency over consistency in normal ops), **PC/EC** (Spanner, etcd — consistent even at cost of latency), **PC/EL** (rare — consistent during partition but low latency in normal ops, e.g., MongoDB with majority write concern).

### Ejemplo Práctico Avanzado

```python
# PACELC decision framework
from dataclasses import dataclass
from enum import Enum

class PartitionBehavior(Enum):
    PA = "partition_available"     # Availability during partition
    PC = "partition_consistent"    # Consistency during partition

class NormalBehavior(Enum):
    EL = "normal_low_latency"      # Low latency over consistency
    EC = "normal_consistent"       # Consistency over low latency

@dataclass
class DatabaseClassification:
    name: str
    partition: PartitionBehavior
    normal: NormalBehavior
    example_use: str

DATABASES = [
    DatabaseClassification("Cassandra", PartitionBehavior.PA, NormalBehavior.EL, "User profiles, time-series"),
    DatabaseClassification("DynamoDB", PartitionBehavior.PA, NormalBehavior.EL, "Shopping carts, sessions"),
    DatabaseClassification("Spanner", PartitionBehavior.PC, NormalBehavior.EC, "Global ledger, inventory"),
    DatabaseClassification("etcd", PartitionBehavior.PC, NormalBehavior.EC, "Config, coordination"),
    DatabaseClassification("MongoDB", PartitionBehavior.PC, NormalBehavior.EL, "Catalogs, content (with write concern=1)"),
    DatabaseClassification("Riak", PartitionBehavior.PA, NormalBehavior.EL, "IoT, local data"),
]

def classify_service(requires_strong_consistency: bool, latency_sla_ms: float, partition_risk: str) -> str:
    if requires_strong_consistency:
        if latency_sla_ms > 50:  # can tolerate latency
            return "PC/EC — Spanner, CockroachDB, etcd"
        return "PC/EL — MongoDB (write concern majority)" if partition_risk == "low" else "PC/EC — Spanner"
    else:
        if latency_sla_ms < 10:  # latency-sensitive
            return "PA/EL — Cassandra, DynamoDB, Scylla"
        return "PA/EL — Riak, DynamoDB DAX"
```

**Fuente oficial:** https://www.cs.utexas.edu/users/dahlin/papers/pacelc.pdf

### Alternativa de Implementación Específica

**CALM Theorem** (Consistency As Logical Monotonicity) provides a related but distinct framework: a program is consistent if its logic is monotonic. **Bloom** language operationalizes CALM, letting developers write programs that are automatically eventually consistent.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Choosing databases, designing service SLOs, documenting architecture decisions with precision |
| **Cuándo evitar** | Simple apps with single database — CAP alone is sufficient for partition discussion |
| **Alternativas** | CAP theorem (partition-only). CALM theorem (monotonicity). CRDT approach (without coordination) |
| **Coste/Complejidad** | Conceptual — no implementation cost. Adds precision to architecture decision records |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: PA/EL database used for ledger — data loss

**¿Qué ocasionó el error?**
A team chose Cassandra (PA/EL) for a billing ledger because of its high availability. During a normal operation read-repair delay, a user's balance showed an old value and a duplicate charge was issued.

**¿Cómo se solucionó?**
Switch to PC/EC (Spanner) for ledger services. For ledger operations, ensure linearizability: use Cassandra with `SERIAL` consistency for lightweight transactions (LWT) and read with `QUORUM`.

**¿Por qué funciona esta técnica?**
PA/EL trades consistency for speed. Ledger requires strong consistency at all times. SERIAL consistency in Cassandra uses Paxos internally, providing linearizability at the cost of latency.

### Caso: PC/EC database causes slow page loads

**¿Qué ocasionó el error?**
A user profile service using etcd (PC/EC) for profile storage. Reads take 20-50ms due to quorum reads, making page load time exceed the 200ms SLO.

**¿Cómo se solucionó?**
Migrate user profiles to a PA/EL database (DynamoDB) for read performance. Keep only configuration and leader-election data in etcd. Use cache-aside (Redis) for profile reads.

**¿Por qué funciona esta técnica?**
PA/EL databases return responses from the nearest replica (single-digit ms). Combined with caching, profile reads become near-instant while critical coordination data remains strongly consistent.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "pacelc theorem", "pacelc tradeoffs", "latency vs consistency", "pacelc classification"
- **Prioridad de carga:** Media — especializado, complementa CAP theorem
- **Dependencias:** `cap-theorem-tradeoffs`

### Tool Integration

```json
{
  "tool_name": "pacelc-theorem-implications",
  "description": "PACELC theorem — partition behavior and normal operation latency vs consistency tradeoffs for database selection",
  "triggers": ["pacelc", "latency consistency tradeoff", "database classification", "pa/el", "pc/ec"],
  "context_hint": "Load when user asks about database selection, consistency model choice, or extending CAP analysis",
  "output_format": "markdown",
  "max_tokens": 800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre PACELC o tradeoffs de latencia vs consistencia, carga el skill
pacelc-theorem-implications. Usa la clasificación de bases de datos reales como ejemplo.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Cassandra: check consistency cost
nodetool proxyhistograms | head -20

# DynamoDB: measure read latency with/without consistent read
aws dynamodb get-item --table-name t --key '{}' --consistent-read
aws dynamodb get-item --table-name t --key '{}'

# Spanner: read timestamp bound
gcloud spanner databases execute-sql --instance=test --database=test \
  --sql="SELECT * FROM users WHERE id=1" --read-timestamp-bound=strong

# etcd: linearized vs serialized read
etcdctl get --consistency=l /config/key
etcdctl get --consistency=s /config/key
```

### GUI / Web

- **AWS Console DynamoDB** — toggle "Consistent read" checkbox to see latency difference
- **Google Cloud Spanner** — read timestamps and staleness configuration
- **DataGrip** — compare query latency across databases
- **Grafana** — query latency dashboards per database, categorized by PACELC class

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Consistent read | `aws dynamodb get-item --consistent-read` | DynamoDB Console → Consistent Read checkbox |
| Measure latency | `nodetool proxyhistograms` | CloudWatch → DynamoDB → SuccessfulRequestLatency |

---

## 7. Cheatsheet Rápido

```text
PACELC: If Partition (P) → Availability(A) vs Consistency(C);
         Else (E) → Latency(L) vs Consistency(C)

PA/EL: Cassandra, DynamoDB, Scylla, Riak — available, fast, eventual
PC/EC: Spanner, CockroachDB, etcd, ZooKeeper — consistent, slower
PC/EL: MongoDB (w=1), Azure Cosmos DB (eventual) — consistent in partition, fast normally

Choose: ledger, inventory → PC/EC | profiles, feeds → PA/EL
Document PACELC class in ADR per service
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `cap-theorem-tradeoffs` | superconjunto — PACELC extends CAP | Sí |
| `crdts-conflict-free-replicated` | solución — AP/EL systems use CRDTs for convergence | No |
| `database-replication-lag-strategies` | complementario — handling EL behavior | No |
| `distributed-consensus-raft` | PC/EC implementation | No |

---

## 9. Metadatos del Skill

```yaml
---
id: pacelc-theorem-implications
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [pacelc, cap-theorem, consistency, latency, availability, database-selection, distributed-systems]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

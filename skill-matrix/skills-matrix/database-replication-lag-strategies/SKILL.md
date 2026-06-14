---
name: database-replication-lag-strategies
description: "Replication lag occurs when data written to a primary has not yet propagated to replicas"
---
# Database Replication Lag Strategies

## Semantic Triggers
```
read replicas and replication lag handling, read your writes consistency after write, monotonic read consistency guarantee, causal consistency with version vectors, handling stale reads with read after write, replication lag monitoring and alerting
```

---

## 1. Definición Teórica

Replication lag occurs when data written to a primary has not yet propagated to replicas. It solves the problem of maintaining read scalability while tolerating temporary staleness. Key distinction from strong consistency: these strategies accept that replicas may serve stale data and provide application-level mitigations (read-your-writes, monotonic reads, bounded staleness, quorum reads) rather than forcing strong consistency at the database layer.

---

## 2. Implementación de Referencia

**PostgreSQL streaming replication** with `synchronous_standby_names` for zero-lag replicas. **MySQL Group Replication** (multi-primary). **MongoDB replica sets** with `readPreference` and `writeConcern`. **AWS Aurora** replicas with ~10ms typical lag.

### Ejemplo Práctico Avanzado

```python
import time
import random
from dataclasses import dataclass
from typing import Optional

@dataclass
class Replica:
    id: str
    lag_seconds: float  # measured lag

class ReplicationAwareRouter:
    """Routes reads based on staleness tolerance."""
    def __init__(self, primary_dsn: str, replica_dsns: list[str]):
        self.primary = primary_dsn
        self.replicas = replica_dsns
        self.write_timestamps: dict[str, float] = {}  # user_id -> last_write_time

    def after_write(self, user_id: str):
        """Called after a write to primary. User is 'dirty'."""
        self.write_timestamps[user_id] = time.monotonic()

    def get_read_connection(self, user_id: Optional[str] = None, staleness_ok: float = 2.0) -> str:
        """Returns appropriate read connection based on staleness tolerance."""
        if user_id:
            last_write = self.write_timestamps.get(user_id, 0)
            # If user wrote recently, read from primary for read-your-writes
            if time.monotonic() - last_write < staleness_ok:
                return self.primary

        # Check replica lag and return healthiest
        healthy_replicas = [
            r for r, lag in self._get_lags().items()
            if lag <= staleness_ok
        ]
        if healthy_replicas:
            return random.choice(healthy_replicas)
        # Fallback to primary if no healthy replicas
        return self.primary

    def _get_lags(self) -> dict[str, float]:
        """Query each replica's lag (simplified)."""
        return {r: self._measure_lag(r) for r in self.replicas}

    def _measure_lag(self, dsn: str) -> float:
        # Real impl: SELECT seconds_behind_master (MySQL) or pg_stat_replication (PG)
        return 0.0

    def monotonic_read_connection(self, user_id: str) -> str:
        """Return same replica for same user (monotonic read guarantee)."""
        replica_idx = hash(user_id) % len(self.replicas)
        return self.replicas[replica_idx]


# PostgreSQL lag monitoring
def check_pg_lag(conn) -> dict:
    cur = conn.cursor()
    cur.execute("""
        SELECT
            application_name,
            pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 AS lag_mb,
            state
        FROM pg_stat_replication;
    """)
    return {row[0]: {"lag_mb": row[1], "state": row[2]} for row in cur.fetchall()}


# MySQL lag monitoring
def check_mysql_lag(conn) -> dict:
    cur = conn.cursor()
    cur.execute("SHOW SLAVE STATUS;")
    row = cur.fetchone()
    return {
        "seconds_behind_master": row[32],  # field index
        "slave_io_running": row[10],
        "slave_sql_running": row[11],
    }
```

**Fuente oficial:** https://www.postgresql.org/docs/current/warm-standby.html

### Alternativa de Implementación Específica

**AWS Aurora Auto-Scaling Replicas** — Aurora replicas share the same storage volume (no Redo log replay). Lag is typically <10ms. Failover is <30s. For MySQL/PostgreSQL, use **ProxySQL** for read/write splitting with automatic lag-aware routing.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Read-heavy workloads, reporting queries, geographical read distribution, reducing primary load |
| **Cuándo evitar** | Systems requiring linearizable reads (financial ledgers), write-heavy workloads where replicas always lag |
| **Alternativas** | Read from primary (no lag, no scaling). Consistent hashing for distributed caches. Materialized views for analytical queries |
| **Coste/Complejidad** | Low-moderate — replication is built-in. Complexity in application-level consistency: read-your-writes routing, monotonic read enforcement, and lag monitoring |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Read-after-write inconsistency causes user confusion

**¿Qué ocasionó el error?**
User creates a profile (writes to primary), then immediately views it (reads from replica). The replica hasn't caught up — the user sees a 404 or stale data.

**¿Cómo se solucionó?**
Implement read-your-writes consistency. After a user's write, route all their reads to the primary for N seconds (usually 2-5s). Track last write timestamp per user.

**¿Por qué funciona esta técnica?**
By routing recently-modified entities to the primary, we guarantee the user sees their own writes. After the tracking window, the replica has caught up.

### Caso: Replica lag spike causes p99 latency SLO breach

**¿Qué ocasionó el error?**
A large batch job on the primary generates WAL, causing replicas to lag by 30+ seconds. Application routes stale data to users, violating the latency SLO for reads.

**¿Cómo se solucionó?**
Throttle the batch job to reduce WAL generation rate. Add `ALTER SYSTEM SET synchronous_standby_names` for one critical replica. Monitor `pg_stat_replication` and alert when lag > 10s.

**¿Por qué funciona esta técnica?**
Synchronous replication ensures at least one replica has zero lag. Monitoring enables proactive throttling. Batch scheduling during off-peak hours avoids conflict.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "replication lag", "read replicas", "read your writes", "monotonic read", "causal consistency"
- **Prioridad de carga:** Media — común en sistemas con escalado de lectura
- **Dependencias:** `database-sharding-partitioning`, `cap-theorem-tradeoffs`

### Tool Integration

```json
{
  "tool_name": "database-replication-lag-strategies",
  "description": "Strategies for handling database replication lag: read-your-writes, monotonic reads, bounded staleness, quorum reads",
  "triggers": ["replication lag", "read replicas", "read your writes", "staleness", "monotonic read"],
  "context_hint": "Load when user asks about read replica consistency, replication lag, or read scaling patterns",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre replication lag o read replicas, carga el skill
database-replication-lag-strategies. Prioriza patrones prácticos: read-your-writes,
monotonic reads, y bounded staleness con ejemplos de PostgreSQL/MySQL.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# PostgreSQL: check replication lag
psql -c "SELECT application_name, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 AS lag_mb, state FROM pg_stat_replication;"

# MySQL: check lag
mysql -e "SHOW SLAVE STATUS\G" | grep -E "Seconds_Behind_Master|Slave_IO_Running|Slave_SQL_Running"

# MongoDB: read preference
mongosh --eval 'db.getMongo().setReadPref("secondaryPreferred")'

# ProxySQL: monitor query routing
mysql -h127.0.0.1 -P6032 -uadmin -padmin -e "SELECT hostgroup, srv_host, status, ConnUsed, ConnFree FROM stats_mysql_connection_pool;"
```

### GUI / Web

- **pgAdmin** — replication slot visualization and lag metrics
- **MySQL Workbench** — replication status dashboard
- **MongoDB Atlas** — replica set lag monitoring with alerting
- **Datadog** — database replication dashboards with lag anomaly detection
- **Percona Monitoring** — detailed replication health, GTID tracking

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check PG lag | `psql -c "SELECT * FROM pg_stat_replication"` | pgAdmin → Dashboard → Replication |
| Check MySQL lag | `mysql -e "SHOW SLAVE STATUS\G"` | Workbench → Replication → Status |
| Read preference | `db.getMongo().setReadPref("primary")` | Atlas → Clusters → Metrics |

---

## 7. Cheatsheet Rápido

```sql
-- PostgreSQL replication lag monitoring
SELECT application_name,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
       state
FROM pg_stat_replication;

-- MySQL replication lag
SHOW SLAVE STATUS;
-- Seconds_Behind_Master = lag in seconds
-- Slave_IO_Running = Yes (receiving), Slave_SQL_Running = Yes (applying)

-- Read-your-writes: route writes user to primary for N seconds
-- Monotonic reads: same replica for same user (session affinity)
-- Bounded staleness: accept read if lag < 5s
-- Quorum reads: R + W > N for strong consistency
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `database-sharding-partitioning` | complementario — sharding + replication = distributed database | Sí |
| `cap-theorem-tradeoffs` | contexto — replication lag is the AP tradeoff | Sí |
| `pacelc-theorem-implications` | contexto — EL (else latency) tradeoff | No |
| `change-data-capture-cdc` | complementario — CDC as alternative to replication | No |
| `distributed-cache-redis-cluster` | alternativo — caching reduces read load on replicas | No |

---

## 9. Metadatos del Skill

```yaml
---
id: database-replication-lag-strategies
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [replication-lag, read-replicas, read-your-writes, monotonic-read, staleness, postgresql, mysql]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

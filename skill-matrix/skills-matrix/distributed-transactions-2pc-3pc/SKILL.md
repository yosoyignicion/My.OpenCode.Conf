---
name: distributed-transactions-2pc-3pc
description: "Two-Phase Commit (2PC) ensures atomicity across multiple resources via a coordinator: Phase 1 (prepare) asks all participants if they can commit; Phase 2 (commit/abort) finalizes"
---
# Distributed Transactions — 2PC / 3PC

## Semantic Triggers
```
two phase commit prepare and commit protocol, three phase commit timeout and recovery, two phase commit coordinator failure and blocking, distributed transactions with xa protocol, saga pattern vs 2pc for distributed coordination, compensating transactions and rollback strategies
---

## 1. Definición Teórica

Two-Phase Commit (2PC) ensures atomicity across multiple resources via a coordinator: Phase 1 (prepare) asks all participants if they can commit; Phase 2 (commit/abort) finalizes. It solves the problem of atomic distributed writes. Key distinction: 2PC is blocking (coordinator failure blocks participants indefinitely), while 3PC adds a pre-commit phase to avoid blocking at the cost of one additional round trip.

---

## 2. Implementación de Referencia

**Java Transaction API (JTA)** with **Atomikos** or **Bitronix** for XA transactions. **PostgreSQL** `PREPARE TRANSACTION` for 2PC. **etcd** `concurrency/stm` for coordination. For practical distributed transactions, **Google Spanner** (TrueTime + 2PC) and **CockroachDB** (parallel commits) are the production references.

### Ejemplo Práctico Avanzado

```python
import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum

class ParticipantStatus(Enum):
    INITIAL = 0
    PREPARED = 1
    COMMITTED = 2
    ABORTED = 3

@dataclass
class Participant:
    id: str
    status: ParticipantStatus = ParticipantStatus.INITIAL

    async def prepare(self, tx_data: dict) -> bool:
        """Validate and prepare for commit. Write-ahead log before responding."""
        try:
            await self._write_ahead_log(tx_data)
            self.status = ParticipantStatus.PREPARED
            return True
        except Exception as e:
            logging.error(f"Prepare failed for {self.id}: {e}")
            await self._rollback_log()
            return False

    async def commit(self) -> bool:
        """Finalize the transaction."""
        try:
            await self._apply_commit()
            self.status = ParticipantStatus.COMMITTED
            return True
        except Exception:
            return False

    async def abort(self):
        await self._rollback_log()
        self.status = ParticipantStatus.ABORTED

    async def _write_ahead_log(self, data): pass
    async def _apply_commit(self): pass
    async def _rollback_log(self): pass

class TwoPC:
    def __init__(self, participants: list[Participant], timeout: float = 10.0):
        self.participants = participants
        self.timeout = timeout
        self.log: list[dict] = []

    async def execute(self, tx_data: dict) -> bool:
        # Phase 1: Prepare
        prepared = []
        for p in self.participants:
            try:
                ok = await asyncio.wait_for(p.prepare(tx_data), timeout=self.timeout)
                if not ok:
                    raise PrepareFailed(p.id)
                prepared.append(p)
            except (asyncio.TimeoutError, PrepareFailed):
                await self._rollback(prepared)
                return False
        self.log.append({"phase": "prepare", "participants": [p.id for p in prepared]})

        # Phase 2: Commit
        for p in prepared:
            try:
                await asyncio.wait_for(p.commit(), timeout=self.timeout)
            except (asyncio.TimeoutError, Exception):
                # Commit failed — inconsistent state, requires manual recovery
                logging.critical(f"Commit failed for {p.id} after prepare!")
                return False
        self.log.append({"phase": "commit"})
        return True

    async def _rollback(self, prepared: list[Participant]):
        for p in prepared:
            try:
                await asyncio.wait_for(p.abort(), timeout=5.0)
            except Exception:
                logging.error(f"Abort failed for {p.id}")

# Usage
participants = [Participant("db:orders"), Participant("db:inventory"), Participant("queue:notifications")]
coordinator = TwoPC(participants, timeout=10.0)
success = await coordinator.execute({"order_id": "123", "items": [...]})
```

**Fuente oficial:** https://en.wikipedia.org/wiki/Two-phase_commit_protocol

### Alternativa de Implementación Específica

**3PC** adds a `canCommit` pre-phase and a `preCommit` phase before `doCommit`. Participants can timeout and abort independently if the coordinator fails during the pre-commit phase, avoiding the blocking problem. Practically, 3PC is rarely used; **Saga** pattern is the preferred alternative in microservices.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | When strong atomicity is required across <5 participants within same datacenter and you accept blocking risk |
| **Cuándo evitar** | Cross-service microservices (use Saga). High latency networks. >5 participants (failure probability grows). Any system where blocking is unacceptable |
| **Alternativas** | Saga pattern (compensating transactions). Outbox pattern (CDC-based eventual consistency). Spanner-style true-time 2PC |
| **Coste/Complejidad** | High — coordinator is a SPOF, blocking during failure, requires write-ahead logging and recovery procedures. Preferred alternatives exist for most use cases |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Coordinator crashes during Phase 2 commit

**¿Qué ocasionó el error?**
2PC coordinator sends "commit" to participant A, then crashes. Participants B and C never receive the commit. A is committed, B and C are in prepared state — blocking indefinitely.

**¿Cómo se solucionó?**
Use a highly available coordinator (etcd-based). The coordinator writes transaction state to a durable log before each phase. On restart, it reads the log and resumes the commit/abort for in-progress transactions.

**¿Por qué funciona esta técnica?**
The coordinator's write-ahead log provides recovery information. The new coordinator instance picks up from the last logged state and completes the protocol.

### Caso: Participant timeout during prepare phase

**¿Qué ocasionó el error?**
A database participant is under heavy load and does not respond to the prepare request within the timeout. The coordinator aborts the transaction after other participants already prepared.

**¿Cómo se solucionó?**
Increase the prepare timeout (30s instead of 10s). Monitor database load before starting 2PC. Use pessimistic locking with short timeouts to prevent lock escalation.

**¿Por qué funciona esta técnica?**
2PC assumes participants are responsive within the timeout. Sufficient timeout and resource monitoring prevent premature aborts. Pessimistic locking ensures the participant can prepare when asked.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "2pc", "two phase commit", "distributed transaction", "xa transaction", "3pc"
- **Prioridad de carga:** Baja — 2PC is rarely recommended for modern microservices
- **Dependencias:** `saga-pattern-distributed-coordination`, `outbox-inbox-patterns`

### Tool Integration

```json
{
  "tool_name": "distributed-transactions-2pc-3pc",
  "description": "Two-Phase Commit (2PC) and Three-Phase Commit (3PC) protocols for distributed transaction atomicity",
  "triggers": ["2pc", "two phase commit", "3pc", "distributed transaction", "xa"],
  "context_hint": "Load when user asks about distributed transaction atomicity across multiple databases or services",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre 2PC o distributed transactions, carga el skill
distributed-transactions-2pc-3pc. Enfatiza las limitaciones (blocking, SPOF) y
recomienda Saga como alternativa para microservicios.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# PostgreSQL 2PC
BEGIN;
PREPARE TRANSACTION 'tx_order_123';
COMMIT PREPARED 'tx_order_123';
-- or
ROLLBACK PREPARED 'tx_order_123';

# List prepared transactions
SELECT gid, prepared, owner, database FROM pg_prepared_xacts;

# MySQL XA
XA START 'tx1';
XA END 'tx1';
XA PREPARE 'tx1';
XA COMMIT 'tx1';

# CockroachDB: distributed transactions are automatic
cockroach sql --execute="BEGIN; UPDATE accounts SET balance=100 WHERE id=1; UPDATE accounts SET balance=50 WHERE id=2; COMMIT;"
```

### GUI / Web

- **PostgreSQL pgAdmin** — view prepared transactions under `pg_prepared_xacts`
- **Atomikos Dashboard** — JTA transaction management and recovery console
- **CockroachDB Console** — distributed transaction metrics, contention heatmap
- **Jaeger** — trace 2PC coordinator and participant spans

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Prepare tx | `PREPARE TRANSACTION 'gid'` | pgAdmin → Tools → Transaction |
| List prepared | `SELECT * FROM pg_prepared_xacts` | CockroachDB Console → Transactions |
| Recover | `COMMIT PREPARED 'gid'` | Atomikos → Recovery tab |

---

## 7. Cheatsheet Rápido

```sql
-- PostgreSQL 2PC workflow:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
PREPARE TRANSACTION 'tx_order_123';  -- Phase 1
-- If ok:
COMMIT PREPARED 'tx_order_123';      -- Phase 2
-- If fail:
ROLLBACK PREPARED 'tx_order_123';    -- Rollback

-- Monitor:
SELECT * FROM pg_prepared_xacts;

-- 2PC blocking problem: coordinator crash leaves tx in prepared state
-- Remedy: Saga pattern for microservices (preferred)
-- 2PC only for <5 nodes, same DC, <1s transactions
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `saga-pattern-distributed-coordination` | alternativo — Saga replaces 2PC in microservices | Sí |
| `outbox-inbox-patterns` | alternativo — outbox for eventual consistency | Sí |
| `change-data-capture-cdc` | alternativo — CDC-based cross-service consistency | No |
| `distributed-consensus-raft` | base — consensus for coordinator HA | No |

---

## 9. Metadatos del Skill

```yaml
---
id: distributed-transactions-2pc-3pc
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [2pc, 3pc, distributed-transactions, xa, coordinator, atomicity, write-ahead-log]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

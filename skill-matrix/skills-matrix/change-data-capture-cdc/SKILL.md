---
name: change-data-capture-cdc
description: "Change Data Capture captures database row-level changes (INSERT, UPDATE, DELETE) in real-time"
---
# Change Data Capture (CDC)

## Semantic Triggers
```
change data capture with postgres logical replication, debezium kafka connect for streaming cdc, cdc for cache invalidation and search indexing, cdc outbox pattern for reliable event publishing, cdc vs dual writes for data synchronization, cdc schema evolution and data format changes
```

---

## 1. Definición Teórica

Change Data Capture captures database row-level changes (INSERT, UPDATE, DELETE) in real-time. It solves the problem of reliably propagating data changes across systems without dual-write complexity. Key distinction: CDC reads the database transaction log (WAL) — it's non-invasive, has no impact on application code, and provides exactly-once delivery semantics when combined with Kafka.

---

## 2. Implementación de Referencia

**Debezium** — the standard CDC platform, built on Kafka Connect. **PostgreSQL logical replication** (`pgoutput` plugin, `wal_level=logical`). **Datomic** — database with built-in immutable event log. **AWS DMS** for managed CDC to S3/Kinesis.

### Ejemplo Práctico Avanzado

```sql
-- PostgreSQL: set up logical replication
-- In postgresql.conf:
-- wal_level = logical
-- max_replication_slots = 10
-- max_wal_senders = 10

-- Create publication for CDC
CREATE PUBLICATION orders_pub FOR TABLE orders, outbox;

-- Outbox table for reliable event publishing
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    trace_id TEXT,
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;

-- Insert in same transaction as business operation
BEGIN;
INSERT INTO orders (id, user_id, status, total) VALUES ('order123', 42, 'confirmed', 99.99);
INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
VALUES ('order', 'order123', 'OrderConfirmed', '{"order_id": "order123", "total": 99.99}');
COMMIT;
```

```python
# Debezium CDC consumer (using confluent_kafka)
from confluent_kafka import Consumer, KafkaError
import json

# Debezium emits change events in a structured format
def handle_cdc_event(msg):
    payload = json.loads(msg.value())
    schema = payload["schema"]
    op = payload["payload"]["op"]  # c=create, u=update, d=delete, r=read
    before = payload["payload"].get("before")
    after = payload["payload"].get("after")
    source = payload["payload"]["source"]
    
    if op == "c":
        print(f"CREATE: {after}")
        # Sync to cache
        cache.set(f"order:{after['id']}", after)
        # Sync to search
        search.index("orders", after)
    elif op == "u":
        print(f"UPDATE: {before} → {after}")
        cache.set(f"order:{after['id']}", after)
        search.update("orders", after["id"], after)
    elif op == "d":
        print(f"DELETE: {before}")
        cache.delete(f"order:{before['id']}")
        search.delete("orders", before["id"])

# Consume CDC events from Kafka topic
c = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "cdc-consumer",
    "auto.offset.reset": "earliest",
})
c.subscribe(["dbserver1.public.orders"])

while True:
    msg = c.poll(1.0)
    if msg and not msg.error():
        handle_cdc_event(msg)
```

```yaml
# Debezium connector configuration (Kafka Connect REST API)
POST /connectors HTTP/1.1
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "debezium",
    "database.dbname": "orders_db",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_orders_slot",
    "publication.name": "debezium_orders_pub",
    "table.include.list": "public.orders,public.outbox",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "topic.creation.default.replication.factor": 3,
    "topic.creation.default.partitions": 6,
    "snapshot.mode": "initial"
  }
}
```

**Fuente oficial:** https://debezium.io/documentation/reference/stable/

### Alternativa de Implementación Específica

**Supabase Realtime** — managed PostgreSQL CDC via logical replication with WebSocket subscriptions (no Kafka needed). **Prisma Pulse** — managed CDC service with type-safe event consumption. For simpler use cases, **PostgreSQL triggers** with `NOTIFY/LISTEN` provide lightweight CDC without external dependencies.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cache invalidation, search indexing, data replication to analytics stores, outbox pattern, event sourcing, data lake ingestion |
| **Cuándo evitar** | Simple event publishing (use application-level events). Real-time requirements <10ms (CDC adds decoding latency). Low-write databases where polling is simpler |
| **Alternativas** | Application-level dual-write (risk of inconsistency). Polling (higher latency, DB load). Outbox pattern in application code (manual, reliable) |
| **Coste/Complejidad** | Medium-high — Debezium + Kafka Connect + Kafka cluster is significant infrastructure. Monitoring replication slots (disk full risk), schema evolution, and connector health requires dedicated ops |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Replication slot disk full

**¿Qué ocasionó el error?**
A CDC consumer is down for 2 hours. The replication slot retains WAL files, consuming disk space. PostgreSQL runs out of disk and stops accepting writes.

**¿Cómo se solucionó?**
Set `max_slot_wal_keep_size` to limit WAL retention (e.g., 10GB). Monitor `pg_replication_slots` lag in megabytes. Alert if slot lag > 5GB or consumer not connected for > 30 minutes.

**¿Por qué funciona esta técnica?**
`max_slot_wal_keep_size` prevents unbounded WAL growth. Monitoring ensures proactive intervention before disk fills.

### Caso: Schema change breaks CDC stream

**¿Qué ocasionó el error?**
An ALTER TABLE adds a NOT NULL column without a default value. Debezium captures the new schema and tries to deserialize old events that don't have the column. Deserialization fails.

**¿Cómo se solucionó?**
Use Avro with Schema Registry for CDC events. Schema Registry handles backward/forward compatibility. For PostgreSQL, Debezium uses the `column.blacklist` to exclude volatile columns during schema migration.

**¿Por qué funciona esta técnica?**
Schema Registry stores versioned schemas. Backward-compatible schema evolution ensures old events can still be deserialized. Connectors can pause during DDL and resume with the new schema.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "cdc", "change data capture", "debezium", "logical replication", "wal", "outbox pattern"
- **Prioridad de carga:** Alta — crucial para sincronización de datos en tiempo real
- **Dependencias:** `message-brokers-kafka-internals`, `outbox-inbox-patterns`

### Tool Integration

```json
{
  "tool_name": "change-data-capture-cdc",
  "description": "Change Data Capture with Debezium and PostgreSQL logical replication for real-time data synchronization",
  "triggers": ["cdc", "change data capture", "debezium", "logical replication", "wal", "outbox"],
  "context_hint": "Load when user asks about database change streaming, reliable event publishing, or data synchronization",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre CDC o Change Data Capture, carga el skill
change-data-capture-cdc. Prioriza Debezium con PostgreSQL logical replication
y el patrón outbox sobre teoría de WAL.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# PostgreSQL: check replication slots
SELECT slot_name, plugin, slot_type, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;

# Debezium: connector status
curl -s http://localhost:8083/connectors/orders-connector/status | jq
curl -s http://localhost:8083/connectors/orders-connector | jq '.config'

# Kafka: consume CDC topic
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic dbserver1.public.orders --from-beginning | head -5

# Check WAL size
SELECT pg_size_pretty(SUM(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))) AS total_lag FROM pg_replication_slots;

# Debezium: view connector offset
curl -s http://localhost:8083/connectors/orders-connector/offsets | jq
```

### GUI / Web

- **Kafka Connect UI** — connector management, task status, error logs, restart/stop
- **PostgreSQL pgAdmin** — replication slot visualization, WAL usage monitoring
- **Debezium UI** — connector health, schema history, event inspection
- **Confluent Control Center** — Kafka topic throughput, consumer lag, schema evolution
- **Grafana** — replication slot lag, WAL size, CDC event throughput, deserialization errors

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Slot status | `SELECT * FROM pg_replication_slots;` | pgAdmin → Replication Slots |
| Connector state | `curl <kafka-connect>/connectors/<name>/status` | Kafka Connect UI → Connector |
| CDC events | `kafka-console-consumer.sh --topic <topic>` | Control Center → Topics → Messages |

---

## 7. Cheatsheet Rápido

```sql
-- PostgreSQL logical replication setup
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

CREATE PUBLICATION mypub FOR TABLE orders, outbox;

-- Monitor slot lag
SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;

-- Debezium schema evolution: always add columns, never remove
-- Use Avro + Schema Registry for compatibility

-- Outbox pattern: write to outbox in same DB tx
BEGIN;
  INSERT INTO orders ...;
  INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
  VALUES ('order', 'order_123', 'OrderCreated', '{"id": "order_123"}');
COMMIT;

-- Dead letter queue: handle deserialization errors gracefully
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `message-brokers-kafka-internals` | complementario — Kafka as CDC event transport | Sí |
| `outbox-inbox-patterns` | complementario — outbox pattern with CDC | Sí |
| `event-driven-cqrs` | superconjunto — CDC enables CQRS with event sourcing | Sí |
| `database-replication-lag-strategies` | alternativo — CDC vs async replication | No |
| `data-lakehouses-parquet-iceberg` | complementario — CDC → Iceberg for data lake | No |

---

## 9. Metadatos del Skill

```yaml
---
id: change-data-capture-cdc
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [cdc, change-data-capture, debezium, kafka-connect, postgresql, logical-replication, wal, outbox]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: message-brokers-kafka-internals
description: "Apache Kafka is a distributed event store with publish-subscribe semantics"
---
# Message Brokers & Kafka Internals

## Semantic Triggers
```
kafka partition assignment and consumer group rebalancing, kafka log compaction and retention policies, kafka producer acks idempotence and exactly once semantics, kafka replication isr and leader failover, message ordering guarantees with partitions and keys, kafka vs rabbitmq use case comparison
```

---

## 1. Definición Teórica

Apache Kafka is a distributed event store with publish-subscribe semantics. Topics are split into partitions, each an ordered, immutable log. Messages are assigned offsets, replicated across brokers, and retained based on time/size policies. Key distinction over traditional message queues (RabbitMQ, ActiveMQ): Kafka provides replayable logs, strong ordering per partition, and high throughput via sequential I/O and zero-copy.

---

## 2. Implementación de Referencia

**Apache Kafka** — latest stable version 3.9.x. **Confluent Kafka** for enterprise features. **Redpanda** — Kafka-compatible, zero-JVM, C++ based alternative. Use **confluent_kafka** (Python) or **kafka-node** (Node.js) for client SDKs.

### Ejemplo Práctico Avanzado

```python
from confluent_kafka import Producer, Consumer, KafkaException, KafkaError
import json, signal, sys

# Producer with idempotence and delivery callback
producer_config = {
    "bootstrap.servers": "broker1:9092,broker2:9092",
    "acks": "all",
    "enable.idempotence": True,
    "compression.type": "snappy",
    "linger.ms": 5,
    "batch.size": 65536,
}
p = Producer(producer_config)

def delivery_report(err, msg):
    if err:
        print(f"Delivery failed: {err}")
        # Handle: log to DLQ topic, alert, etc.
    else:
        print(f"Delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}")

def produce_event(order_id: str, event_type: str, data: dict):
    p.produce(
        "orders.events",
        key=order_id,  # ensures ordering per order_id
        value=json.dumps({"type": event_type, "data": data, "ts": time.time()}),
        callback=delivery_report,
    )
    p.poll(0)  # trigger delivery callbacks

# Consumer with manual commit and rebalance handling
consumer_config = {
    "bootstrap.servers": "broker1:9092",
    "group.id": "order-processor",
    "enable.auto.commit": False,
    "auto.offset.reset": "earliest",
    "max.poll.interval.ms": 300000,
}
c = Consumer(consumer_config)

def on_assign(consumer, partitions):
    """Rebalance hook: commit current offsets before rebalance."""
    for p in partitions:
        print(f"Assigned {p.topic} [{p.partition}]")
    consumer.assign(partitions)

c.subscribe(["orders.events"], on_assign=on_assign)
try:
    while True:
        msg = c.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            raise KafkaException(msg.error())
        try:
            process_event(msg.value())
            c.commit(msg)  # manual commit after processing
        except Exception as e:
            # Route to DLQ
            p.produce("orders.events.dlq", key=msg.key(), value=msg.value())
            c.commit(msg)  # commit original msg to avoid reprocessing
except KeyboardInterrupt:
    pass
finally:
    c.close()
```

**Fuente oficial:** https://docs.confluent.io/kafka-clients/python/current/overview.html

### Alternativa de Implementación Específica

**Redpanda** is a Kafka-compatible event streaming platform written in C++. It eliminates ZooKeeper, provides faster leader elections, and has lower resource usage. Use the same Kafka API. For simpler use cases, **RabbitMQ** (see slot 29) is easier to operate.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Event sourcing, stream processing (Kafka Streams, ksqlDB), high-throughput messaging (>100k msg/s), replayable event log, log compaction for keyed data |
| **Cuándo evitar** | Simple task queues, request-response patterns, low-latency (<5ms) messaging, small deployments (<3 brokers) |
| **Alternativas** | RabbitMQ for flexible routing. Redpanda for Kafka API with less ops. Pulsar for geo-replication and multi-tenancy |
| **Coste/Complejidad** | High — ZooKeeper/kraft quorum, partition tuning, monitoring (lag, ISR, retention). Requires dedicated ops team for large clusters |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Consumer lag grows indefinitely

**¿Qué ocasionó el error?**
Consumer processes a message but takes too long (>5 min). The consumer group rebalances, assigning partitions to other consumers. Those consumers continue from the committed offset, but the slow processor was holding the offset.

**¿Cómo se solucionó?**
Increase `max.poll.interval.ms` to 10 minutes. Increase `max.poll.records` to match processing speed. Use `enable.auto.commit=false` and commit after each successful batch.

**¿Por qué funciona esta técnica?**
Kafka considers consumers "dead" if they don't poll within `max.poll.interval.ms`. Tuning this value and reducing `max.poll.records` ensures consumers stay in the group and commit frequently enough.

### Caso: Out of order messages in same partition

**¿Qué ocasionó el error?**
Producer config has `max.in.flight.requests.per.connection=5` without idempotence. A batch sent to partition 5 is retried and arrives after the next batch, breaking order.

**¿Cómo se solucionó?**
Set `enable.idempotence=true` (automatically sets `max.in.flight=5` with guaranteed ordering). Or set `max.in.flight.requests.per.connection=1` (reduces throughput).

**¿Por qué funciona esta técnica?**
Idempotent producers use a producer ID (PID) and sequence number per partition. Brokers deduplicate and sequence messages, ensuring exactly-once delivery even with retries.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1150 tokens estimados al invocar este skill
- **Trigger de activación:** "kafka", "message broker", "event streaming", "consumer group", "kafka topic"
- **Prioridad de carga:** Alta — clave en arquitecturas event-driven y streaming
- **Dependencias:** `change-data-capture-cdc`, `event-driven-cqrs`, `saga-pattern-distributed-coordination`

### Tool Integration

```json
{
  "tool_name": "message-brokers-kafka-internals",
  "description": "Apache Kafka internals: partitioning, replication, consumer groups, exactly-once semantics, and stream processing",
  "triggers": ["kafka", "message broker", "event streaming", "consumer group", "kafka topic", "redpanda"],
  "context_hint": "Load when user asks about event-driven architecture, message queues, stream processing, or Kafka-specific patterns",
  "output_format": "markdown",
  "max_tokens": 1150
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Kafka o message brokers, carga el skill
message-brokers-kafka-internals. Prioriza producer/consumer configuration idempotente
y patrones de consumer lag sobre teoría general.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Topic operations
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders --partitions 6 --replication-factor 3
kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders

# Console producer/consumer
kafka-console-producer.sh --topic orders --property "parse.key=true" --property "key.separator=:"
kafka-console-consumer.sh --topic orders --from-beginning --group my-group --property "print.key=true"

# Consumer group status
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group order-processor --describe

# Lag monitoring
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group order-processor --describe | grep -E "LAG|TOPIC"
```

### GUI / Web

- **Confluent Control Center** — cluster health, consumer lag, message view, topic schema evolution
- **Kafka UI** (provectus) — lightweight web UI for topics, consumer groups, broker config
- **AKHQ** — Kafka GUI with topic creation, message browsing, schema registry integration
- **Redpanda Console** — Kafka-compatible UI with message viewer, schema registry, and consumer group management

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Topic status | `kafka-topics.sh --describe` | Control Center → Topics → Details |
| Consumer lag | `kafka-consumer-groups.sh --describe` | Kafka UI → Consumers → Lag |
| Produce message | `kafka-console-producer.sh` | AKHQ → Topic → Produce |
| Consume | `kafka-console-consumer.sh --from-beginning` | Redpanda Console → Messages |

---

## 7. Cheatsheet Rápido

```bash
# Topic naming: domain.service.event_type (e.g., orders.payment.processed)
# Partitions: 3-6 per topic per 10k msg/s. Power of 2 for even distribution

# Producer essentials
acks=all, enable.idempotence=true, compression.type=snappy, linger.ms=5

# Consumer essentials
enable.auto.commit=false, auto.offset.reset=earliest, max.poll.interval.ms=300000

# Monitoring: consumer lag, ISR, under-replicated partitions
# Retention: 7 days default. Compacted topics for keyed data.
# Replication: min.insync.replicas=2, replication.factor=3
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `change-data-capture-cdc` | complementario — Debezium + Kafka for CDC | Sí |
| `saga-pattern-distributed-coordination` | complementario — Kafka for choreography-based saga | Sí |
| `distributed-queues-rabbitmq-amqp` | alternativo — Kafka vs RabbitMQ comparison | No |
| `event-driven-cqrs` | superconjunto — Kafka as event store for CQRS | Sí |
| `data-serialization-formats` | complementario — Avro/Protobuf with Schema Registry | No |

---

## 9. Metadatos del Skill

```yaml
---
id: message-brokers-kafka-internals
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [kafka, event-streaming, message-broker, consumer-group, partition, replication, exactly-once]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

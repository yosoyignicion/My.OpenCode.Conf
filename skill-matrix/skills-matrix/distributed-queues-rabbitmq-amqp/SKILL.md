---
name: distributed-queues-rabbitmq-amqp
description: "RabbitMQ implements the AMQP 0-9-1 protocol with exchanges routing messages to queues based on bindings"
---
# Distributed Queues — RabbitMQ & AMQP

## Semantic Triggers
```
rabbitmq exchanges queues and bindings, amqp 0-9-1 protocol and message acknowledgments, rabbitmq publisher confirms and mandatory flag, dead letter exchanges and message ttl, rabbitmq clustering and quorum queues, rabbitmq vs kafka use case comparison
```

---

## 1. Definición Teórica

RabbitMQ implements the AMQP 0-9-1 protocol with exchanges routing messages to queues based on bindings. It solves the problem of reliable message delivery with flexible routing. Key distinction from Kafka: RabbitMQ is a message broker (push-based, removes messages after consumption) while Kafka is an event store (pull-based, retains messages). RabbitMQ excels at complex routing (direct, topic, fanout, headers exchanges) and RPC patterns.

---

## 2. Implementación de Referencia

**RabbitMQ** — latest stable: 4.1.x. **aio-pika** (Python) — async AMQP client. **amqplib** (Node.js) — callback-based. **RabbitMQ Java client** for JVM.

### Ejemplo Práctico Avanzado

```python
import asyncio
import aio_pika
import orjson
from dataclasses import dataclass

RABBITMQ_URL = "amqp://guest:guest@localhost/"

@dataclass
class OrderEvent:
    order_id: str
    event_type: str
    data: dict

class RabbitMQService:
    def __init__(self):
        self.connection: aio_pika.RobustConnection = None
        self.channel: aio_pika.Channel = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(RABBITMQ_URL)
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=10)

    async def declare_topology(self):
        """Declare exchanges, queues, and bindings."""
        # Topic exchange for order events
        self.order_exchange = await self.channel.declare_exchange(
            "orders", type=aio_pika.ExchangeType.TOPIC, durable=True,
        )
        # Dead letter exchange for failed messages
        self.dlx = await self.channel.declare_exchange(
            "orders.dlx", type=aio_pika.ExchangeType.FANOUT, durable=True,
        )
        # Main queue with DLX
        self.order_queue = await self.channel.declare_queue(
            "order_processor",
            durable=True,
            arguments={
                "x-dead-letter-exchange": "orders.dlx",
                "x-dead-letter-routing-key": "order.failed",
                "x-message-ttl": 300000,  # 5 min
                "x-max-length": 10000,
            },
        )
        # Bind queue to exchange
        await self.order_queue.bind(self.order_exchange, routing_key="order.#")
        # Dead letter queue
        self.dlq = await self.channel.declare_queue("orders.dlq", durable=True)
        await self.dlq.bind(self.dlx, routing_key="order.failed")

    async def publish_order_event(self, event: OrderEvent, priority: int = 0):
        """Publish with publisher confirms."""
        message = aio_pika.Message(
            body=orjson.dumps({"order_id": event.order_id, "type": event.event_type, "data": event.data}),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            priority=priority,
            timestamp=asyncio.get_event_loop().time(),
            headers={"event_type": event.event_type},
        )
        async with self.channel.transaction():  # publisher confirms
            await self.order_exchange.publish(
                message,
                routing_key=f"order.{event.event_type}",
                mandatory=True,  # return if no queue bound
            )

    async def consume(self):
        """Consume with manual ack and dead lettering."""
        async with self.order_queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False):
                    try:
                        event = orjson.loads(message.body)
                        await self.process_event(event)
                    except Exception as e:
                        # Will be routed to DLX automatically (requeue=False)
                        print(f"Failed: {e}, sent to DLQ")
                        # Manual nack if not using process context
                        # await message.nack(requeue=False)

    async def process_event(self, event: dict):
        event_type = event["type"]
        if event_type == "order.created":
            await handle_order_created(event["data"])
        elif event_type == "order.payment":
            await handle_order_payment(event["data"])

    async def close(self):
        await self.connection.close()

# RPC pattern with RabbitMQ
async def rpc_call(channel: aio_pika.Channel, routing_key: str, payload: dict) -> dict:
    """RPC-style request-response over RabbitMQ."""
    callback_queue = await channel.declare_queue(exclusive=True)
    correlation_id = str(uuid.uuid4())

    await channel.default_exchange.publish(
        aio_pika.Message(
            body=orjson.dumps(payload),
            reply_to=callback_queue.name,
            correlation_id=correlation_id,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        ),
        routing_key=routing_key,
    )

    async with callback_queue.iterator() as queue_iter:
        async for message in queue_iter:
            if message.correlation_id == correlation_id:
                return orjson.loads(message.body)
```

**Fuente oficial:** https://www.rabbitmq.com/getstarted.html

### Alternativa de Implementación Específica

**RabbitMQ quorum queues** — replicated queues using Raft consensus (replaces mirrored queues). **Stream plugin** — for Kafka-like log-based consumption with offset tracking. Use quorum queues for HA, classic queues for maximum throughput.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Complex routing (topic/fanout/direct), task distribution with competing consumers, RPC patterns, <100k msg/s throughput |
| **Cuándo evitar** | Event sourcing / replayable log (use Kafka). >100k msg/s sustained throughput (use Kafka). Very large message retention (use Kafka) |
| **Alternativas** | Kafka for event log and high throughput. Redis Streams for simpler queue needs. NATS for ultra-low latency |
| **Coste/Complejidad** | Low-medium — RabbitMQ is easier to operate than Kafka. Quorum queues add operational overhead. Monitoring queue depth, consumer ack rate, and dead letter count is essential |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Unbounded queue growth with slow consumer

**¿Qué ocasionó el error?**
A consumer processes messages slowly. The queue grows unboundedly, consuming all available disk space. RabbitMQ blocks publishers due to `disk_free_limit`.

**¿Cómo se solucionó?**
Set queue `x-max-length` (max messages) and `x-max-length-bytes` (max size). Use `x-overflow: reject-publish` to reject new messages when the queue is full. Monitor queue depth and alert on > 80% capacity.

**¿Por qué funciona esta técnica?**
Queue limits prevent unbounded growth. `reject-publish` returns an error to the producer, enabling backpressure. Monitoring alerts the ops team before the situation escalates.

### Caso: Poison message keeps redelivering

**¿Qué ocasionó el error?**
A malformed message causes the consumer to throw an exception. The message is nacked with `requeue=true`, redelivered immediately, and fails again — infinite loop consuming all CPU.

**¿Cómo se solucionó?**
After N delivery attempts, nack with `requeue=false`. Configure Dead Letter Exchange (DLX) to route poison messages to a DLQ for manual inspection. Use `x-delivery-count` header to track retries.

**¿Por qué funciona esta técnica?**
`requeue=false` removes the message from the queue. DLX routes it to a separate queue for analysis. The consumer avoids processing the same invalid message indefinitely.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "rabbitmq", "amqp", "message queue", "task queue", "pub sub", "dead letter"
- **Prioridad de carga:** Alta — esencial para comunicación asíncrona
- **Dependencias:** `message-brokers-kafka-internals`, `asynchronous-messaging-patterns`

### Tool Integration

```json
{
  "tool_name": "distributed-queues-rabbitmq-amqp",
  "description": "RabbitMQ and AMQP 0-9-1: exchanges, queues, bindings, publisher confirms, dead letter queues, clustering",
  "triggers": ["rabbitmq", "amqp", "message queue", "task queue", "pub sub", "dead letter"],
  "context_hint": "Load when user asks about RabbitMQ, AMQP, message queuing, or task distribution patterns",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre RabbitMQ o AMQP, carga el skill
distributed-queues-rabbitmq-amqp. Prioriza ejemplos de topology declaration,
publisher confirms y dead letter queues sobre teoría de exchanges.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# RabbitMQ management CLI
rabbitmqadmin list queues name messages consumers
rabbitmqadmin list exchanges name type
rabbitmqadmin list bindings source destination routing_key

# Check queue depth
rabbitmqctl list_queues name messages consumers memory
rabbitmqctl list_queues -p /vhost name messages_ready messages_unacknowledged

# Declare queue
rabbitmqadmin declare queue name=order_processor durable=true

# Publish message
rabbitmqadmin publish exchange=orders routing_key=order.created payload='{"id": "123"}'
```

### GUI / Web

- **RabbitMQ Management UI** (port 15672) — queues, exchanges, bindings, message rates, connection status
- **Datadog** — RabbitMQ integration: queue depth, publish/consume rates, unacknowledged messages
- **Prometheus RabbitMQ Exporter** — queue metrics, node health, erlang VM stats
- **RabbitMQ PerfTest** — load testing tool for throughput benchmarking

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List queues | `rabbitmqctl list_queues` | Management UI → Queues |
| Check depth | `rabbitmqctl list_queues messages` | Management UI → Queues → Message count |
| Declare | `rabbitmqadmin declare queue ...` | Management UI → Queues → Add |
| Publish | `rabbitmqadmin publish exchange=...` | Management UI → Exchanges → Publish |

---

## 7. Cheatsheet Rápido

```bash
# Exchange types:
#   direct: exact routing_key match
#   topic: pattern match (order.#, order.created.*)
#   fanout: broadcast to all bound queues
#   headers: match on header attributes

# Queue durability: durable=true + persistent delivery_mode=2
# Prefetch: prefetch_count=1 (slow), 10-100 (fast)

# Dead letter pattern:
#   Declare queue with x-dead-letter-exchange=my_dlx
#   nack with requeue=false → DLX → DLQ

# Quorum queues: replicated, Raft-based (HA)
#   rabbitmqctl add_queue --quorum queues/my-queue

# Naming: exchanges = domain.event, queues = service.function
# Monitoring: queue depth, consumer count, unacked messages
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `message-brokers-kafka-internals` | alternativo — RabbitMQ vs Kafka comparison | Sí |
| `asynchronous-messaging-patterns` | superconjunto — general messaging patterns | Sí |
| `distributed-cache-redis-cluster` | alternativo — Redis Streams as queue | No |
| `websockets-sse-realtime` | complementario — message queue for real-time delivery | No |
| `saga-pattern-distributed-coordination` | complementario — RabbitMQ for choreography | No |

---

## 9. Metadatos del Skill

```yaml
---
id: distributed-queues-rabbitmq-amqp
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [rabbitmq, amqp, message-queue, exchange, dead-letter, quorum-queue, pub-sub, task-queue]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

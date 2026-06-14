---
name: asynchronous-messaging-patterns
description: "Asynchronous Messaging decouples producers from consumers via a message broker"
---
# Asynchronous Messaging Patterns

## Semantic Triggers
```
message broker queue topic, pub sub messaging patrón, asynchronous messaging desacoplamiento, message queue vs event bus, competing consumers pattern, message routing exchange topic
```

---

## 1. Definición Teórica

Asynchronous Messaging decouples producers from consumers via a message broker. Point-to-Point uses queues where one message is consumed by exactly one consumer (competing consumers pattern). Pub/Sub uses topics where each message is delivered to all subscribers. Request/Reply uses correlation IDs to pair requests with responses. Dead Letter Queues hold messages that failed processing. Messaging enables load leveling, resilience (messages persist if consumer is down), and independent deployment of services.

---

## 2. Implementación de Referencia

TypeScript with RabbitMQ (AMQP) implementing Point-to-Point, Pub/Sub, Request/Reply, and Dead Letter patterns.

### Ejemplo Práctico Avanzado

```typescript
import amqp from 'amqplib';

type Connection = amqp.Connection;
type Channel = amqp.Channel;

// ===== CONNECTION MANAGER =====
class MessageBroker {
  private conn!: Connection;
  private channel!: Channel;

  async connect(url = 'amqp://localhost'): Promise<void> {
    this.conn = await amqp.connect(url);
    this.channel = await this.conn.createChannel();
    // Prefetch: only send one message at a time per consumer
    this.channel.prefetch(1);
  }

  async close(): Promise<void> {
    await this.channel.close();
    await this.conn.close();
  }

  // ===== POINT-TO-POINT (Queue) =====
  // Producer
  async sendToQueue(queue: string, message: object): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,  // survive broker restart
      contentType: 'application/json',
    });
  }

  // Consumer — competing consumers pattern
  async consumeQueue(queue: string, handler: (msg: object, ack: () => void) => Promise<void>): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.consume(queue, async (raw) => {
      if (!raw) return;
      const message = JSON.parse(raw.content.toString());
      try {
        await handler(message, () => this.channel.ack(raw));
      } catch (err) {
        // Reject and requeue if transient, dead-letter if not
        if (this.isTransient(err)) {
          this.channel.nack(raw, false, true);  // requeue
        } else {
          this.channel.nack(raw, false, false);  // dead-letter
        }
      }
    });
  }

  // ===== PUB/SUB (Topic) =====
  async publishToExchange(exchange: string, routingKey: string, message: object): Promise<void> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
  }

  async subscribeToExchange(
    exchange: string,
    routingKey: string,
    handler: (msg: object) => Promise<void>
  ): Promise<string> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    const queue = await this.channel.assertQueue('', { exclusive: true });  // auto-generated queue
    await this.channel.bindQueue(queue.queue, exchange, routingKey);

    await this.channel.consume(queue.queue, async (raw) => {
      if (!raw) return;
      const message = JSON.parse(raw.content.toString());
      await handler(message);
      this.channel.ack(raw);
    });

    return queue.queue;
  }

  // ===== REQUEST/REPLY =====
  async request<T>(queue: string, message: object, timeoutMs = 5000): Promise<T> {
    const correlationId = crypto.randomUUID();
    const replyQueue = await this.channel.assertQueue('', { exclusive: true });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.channel.deleteQueue(replyQueue.queue);
        reject(new Error('Request timeout'));
      }, timeoutMs);

      this.channel.consume(replyQueue.queue, (raw) => {
        if (!raw || raw.properties.correlationId !== correlationId) return;
        clearTimeout(timer);
        resolve(JSON.parse(raw.content.toString()) as T);
      }, { noAck: true });

      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        correlationId,
        replyTo: replyQueue.queue,
        persistent: true,
      });
    });
  }

  // ===== DEAD LETTER QUEUE =====
  async setupDeadLetterQueue(mainQueue: string, dlq: string): Promise<void> {
    // Main queue with DLQ argument
    await this.channel.assertQueue(mainQueue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': dlq },
    });
    await this.channel.assertQueue(dlq, { durable: true });
  }

  private isTransient(err: unknown): boolean {
    return err instanceof TransientError || err instanceof NetworkError;
  }
}
```

**Fuente oficial:** https://www.rabbitmq.com/getstarted.html

### Alternativa de Implementación Específica

Python with `aio-pika` for async RabbitMQ or `confluent-kafka` for Kafka. Redis Pub/Sub for simpler, lower-latency use cases.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Desacoplamiento entre servicios, load leveling, procesamiento asíncrono, broadcast de eventos, integración entre sistemas heterogéneos |
| **Cuándo evitar** | Comunicación síncrona requerida, latencia ultra-baja (in-process es más rápido), sistemas simples sin necesidad de broker |
| **Alternativas** | HTTP/REST (síncrono, simple), gRPC streaming (bidireccional, tipado), Redis Pub/Sub (ligero, sin persistencia), Kafka (alto throughput, retención) |
| **Coste/Complejidad** | Medio. Broker es un punto adicional de fallo (HA requerido). Mayor resiliencia. Debugging distribuido más complejo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Mensajes perdidos en reinicio del broker

**¿Qué ocasionó el error?**
Mensajes en colas no-durables se perdían cuando RabbitMQ se reiniciaba.

**¿Cómo se solucionó?**
```typescript
// Asegurar durabilidad en todos los niveles
await channel.assertQueue('orders', { durable: true });           // cola durable
channel.sendToQueue('orders', Buffer.from(msg), { persistent: true });  // mensaje persistente

// Confirmaciones de publicación (publisher confirms)
await channel.confirmSelect();
channel.sendToQueue('orders', Buffer.from(msg), { persistent: true });
await channel.waitForConfirms();  // espera confirmación del broker
```

**¿Por qué funciona esta técnica?**
Colas durables sobreviven reinicios del broker. Mensajes persistentes se guardan en disco. Publisher confirms garantizan que el broker recibió el mensaje.

### Caso: Consumidor lento bloquea la cola

**¿Qué ocasionó el error?**
Un consumidor lento acumulaba mensajes sin acknowledge, bloqueando el procesamiento de otros consumidores.

**¿Cómo se solucionó?**
```typescript
// Configurar prefetch count
await channel.prefetch(5);  // solo 5 mensajes sin ack por consumidor

// TTL en mensajes para evitar acumulación
channel.publish('orders', 'new', Buffer.from(msg), {
  expiration: '60000',  // 1 minuto TTL
});

// Dead letter para mensajes expirados
await channel.assertQueue('orders.input', {
  arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': 'orders.dlq' },
});
```

**¿Por qué funciona esta técnica?**
Prefetch limita mensajes en proceso. TTL evita acumulación infinita. DLQ captura mensajes fallidos para análisis.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~820 tokens estimados al invocar este skill
- **Trigger de activación:** "message broker", "message queue", "pub sub", "rabbitmq", "amqp", "competing consumers", "dead letter"
- **Prioridad de carga:** Alta — patrón fundamental para sistemas distribuidos
- **Dependencias:** `02-arquitectura-diseno/02-event-driven-cqrs`, `03-sistemas-distribuidos/10-message-brokers-kafka-internals`

### Tool Integration

```json
{
  "tool_name": "asynchronous-messaging-patterns",
  "description": "Implements async messaging: Point-to-Point, Pub/Sub, Request/Reply, Dead Letter, competing consumers",
  "triggers": ["message broker", "message queue", "pub sub", "rabbitmq", "amqp", "competing consumers"],
  "context_hint": "Inject when user asks about message brokers or async communication",
  "output_format": "code examples with RabbitMQ patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre mensajería asíncrona o brokers de mensajes, carga el skill asynchronous-messaging-patterns
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# RabbitMQ management
rabbitmqctl list_queues name messages consumers
rabbitmqctl list_exchanges name type
rabbitmqctl list_bindings source destination routing_key

# Publish test message
rabbitmqadmin publish exchange=orders routing_key=new payload='{"test":true}'

# Get messages from queue
rabbitmqadmin get queue=orders.input count=5
```

### GUI / Web

- **RabbitMQ Management UI**: http://localhost:15672 — colas, exchanges, conexiones
- **Kafka UI**: Dashboard para clusters Kafka
- **Redpanda Console**: GUI para Kafka/Redpanda

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List queues | `rabbitmqctl list_queues` | RabbitMQ UI → Queues |
| Purge queue | `rabbitmqctl purge_queue orders` | RabbitMQ UI → Queue → Purge |

---

## 7. Cheatsheet Rápido

```typescript
// Queue (P2P): assertQueue → sendToQueue / consume → ack
// Topic (Pub/Sub): assertExchange → publish / assertQueue → bindQueue → consume
// Request/Reply: correlationId + replyTo queue
// DLQ: x-dead-letter-exchange argument on queue
// Durable: queue { durable: true }, message { persistent: true }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-sistemas-distribuidos/10-message-brokers-kafka-internals` | Alternativa | No |
| `02-arquitectura-diseno/02-event-driven-cqrs` | Complementario | Sí |
| `02-arquitectura-diseno/11-outbox-inbox-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/23-idempotency-keys-processing` | Complementario | Sí |
| `03-sistemas-distribuidos/29-distributed-queues-rabbitmq-amqp` | Dependiente | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: asynchronous-messaging-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [messaging, rabbitmq, amqp, pub-sub, queue, dead-letter, competing-consumers, async]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

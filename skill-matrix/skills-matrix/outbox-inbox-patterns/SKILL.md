---
name: outbox-inbox-patterns
description: "The Outbox pattern ensures reliable message publication by writing events to an outbox table in the same database transaction as the business operation, then publishing asynchronously via a poller"
---
# Outbox & Inbox Patterns

## Semantic Triggers
```
transactional outbox mensajes fiables, inbox pattern deduplicación eventos, outbox poller publicación mensajes, garantía entrega eventos outbox, idempotent consumer inbox, process manager outbox inbox
```

---

## 1. Definición Teórica

The Outbox pattern ensures reliable message publication by writing events to an outbox table in the same database transaction as the business operation, then publishing asynchronously via a poller. The Inbox pattern ensures idempotent message consumption by tracking processed message IDs in an inbox table, preventing duplicate processing. Together they guarantee at-least-once delivery with exactly-once processing semantics across distributed systems without distributed transactions.

---

## 2. Implementación de Referencia

TypeScript with PostgreSQL outbox/inbox tables. Uses a poller process for the outbox and a deduplication check for the inbox.

### Ejemplo Práctico Avanzado

```typescript
// ===== OUTBOX PATTERN =====
// Write event in the same transaction as the business operation

interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  published: boolean;
  createdAt: Date;
}

class OrderService {
  constructor(
    private db: Database,
    private outbox: OutboxRepository
  ) {}

  async placeOrder(items: OrderItem[]): Promise<Order> {
    return this.db.transaction(async (tx) => {
      // 1. Business operation
      const order = await tx.insertInto('orders')
        .values({ items: JSON.stringify(items), status: 'placed', created_at: new Date() })
        .returningAll()
        .executeTakeFirstOrThrow();

      // 2. Write event to outbox in same transaction
      await tx.insertInto('outbox').values({
        id: crypto.randomUUID(),
        aggregate_type: 'order',
        aggregate_id: order.id,
        event_type: 'OrderPlaced',
        payload: JSON.stringify({ orderId: order.id, items }),
        published: false,
        created_at: new Date(),
      }).execute();

      return order;
    });
  }
}

// Outbox Poller — separate process
class OutboxPoller {
  constructor(
    private db: Database,
    private broker: MessageBroker,
    private options = { batchSize: 100, pollIntervalMs: 1000 }
  ) {}

  start(): void {
    setInterval(() => this.poll(), this.options.pollIntervalMs);
  }

  private async poll(): Promise<void> {
    const events = await this.db
      .selectFrom('outbox')
      .where('published', '=', false)
      .orderBy('created_at', 'asc')
      .limit(this.options.batchSize)
      .selectAll()
      .execute();

    for (const event of events) {
      try {
        await this.broker.publish(event.event_type, JSON.parse(event.payload));
        await this.db
          .updateTable('outbox')
          .set({ published: true, published_at: new Date() })
          .where('id', '=', event.id)
          .execute();
      } catch (err) {
        console.error(`Failed to publish event ${event.id}:`, err);
        // Mark for retry — increment attempt count
        await this.db
          .updateTable('outbox')
          .set({ attempts: sql`attempts + 1`, last_error: (err as Error).message })
          .where('id', '=', event.id)
          .execute();
      }
    }
  }
}

// ===== INBOX PATTERN =====
// Idempotent message consumer

interface InboxMessage {
  id: string;  // same as message ID from broker
  message_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at?: Date;
}

class InboxConsumer {
  constructor(private db: Database) {}

  async handleMessage(messageType: string, payload: Record<string, unknown>, messageId: string): Promise<void> {
    // Check if already processed
    const existing = await this.db
      .selectFrom('inbox')
      .where('id', '=', messageId)
      .executeTakeFirst();

    if (existing?.processed) {
      console.log(`Message ${messageId} already processed, skipping`);
      return;
    }

    // Process in transaction
    await this.db.transaction(async (tx) => {
      // Insert inbox record first (for idempotency)
      await tx.insertInto('inbox').values({
        id: messageId,
        message_type: messageType,
        payload: JSON.stringify(payload),
        processed: false,
        received_at: new Date(),
      }).onConflict((oc) => oc.doNothing()).execute();

      // Business logic
      await this.processBusinessLogic(tx, messageType, payload);

      // Mark as processed
      await tx
        .updateTable('inbox')
        .set({ processed: true, processed_at: new Date() })
        .where('id', '=', messageId)
        .execute();
    });
  }

  private async processBusinessLogic(tx: Transaction, type: string, payload: Record<string, unknown>): Promise<void> {
    switch (type) {
      case 'OrderPlaced':
        await tx.insertInto('order_summary')
          .values({ id: payload.orderId, status: 'placed' })
          .execute();
        break;
      // ... more handlers
    }
  }
}
```

**Fuente oficial:** https://microservices.io/patterns/data/transactional-outbox.html

### Alternativa de Implementación Específica

Python with `SQLAlchemy` for transactional outbox and `Celery` for the poller. Use Redis for idempotency keys with TTL.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas que requieren entrega garantizada de eventos, integración con message brokers donde la atomicidad es crítica, consumidores que necesitan idempotencia |
| **Cuándo evitar** | Sistemas sin message broker, eventos no críticos donde la pérdida ocasional es aceptable, alto throughput donde el poller añade latencia |
| **Alternativas** | Kafka con exactly-once semantics (menos overhead operativo), Change Data Capture (CDC) con Debezium (sin outbox separate), Event Sourcing (auditoría completa) |
| **Coste/Complejidad** | Medio. Requiere tabla adicional y poller. Latencia adicional (polling interval). Excelente confiabilidad |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Outbox events publicados dos veces

**¿Qué ocasionó el error?**
El poller falló después de publicar pero antes de marcar `published: true`, causando republicación.

**¿Cómo se solucionó?**
```typescript
// Idempotent publishing usando message deduplication en el broker
class DeduplicatingOutboxPoller {
  async publishEvent(event: OutboxEvent): Promise<void> {
    try {
      // Use event ID as Kafka key for deduplication
      await this.broker.publish(event.event_type, event.payload, {
        key: event.id,  // ensures same partition, Kafka dedup
        headers: { 'event-id': event.id }
      });

      await this.db
        .updateTable('outbox')
        .set({ published: true, published_at: new Date() })
        .where('id', '=', event.id)
        .execute();
    } catch (err) {
      // If publish succeeded but DB update failed, consumer deduplicates via inbox
      throw err;
    }
  }
}
```

**¿Por qué funciona esta técnica?**
Combinar outbox (para publicación) con inbox (para consumo) da exactly-once processing incluso con publicaciones duplicadas.

### Caso: Outbox table crece sin límite

**¿Qué ocasionó el error?**
Eventos publicados nunca se limpiaban, causando que la tabla outbox creciera millones de filas.

**¿Cómo se solucionó?**
```typescript
// Cleanup job para eventos publicados viejos
class OutboxCleanup {
  async cleanPublishedEvents(): Promise<void> {
    await this.db
      .deleteFrom('outbox')
      .where('published', '=', true)
      .where('published_at', '<', sql`NOW() - INTERVAL '7 days'`)
      .execute();
  }
}

// O particionamiento por fecha
// CREATE TABLE outbox (...) PARTITION BY RANGE (created_at);
// Crear particiones mensuales y dropear las viejas
```

**¿Por qué funciona esta técnica?**
Cleanup periódico o particionamiento evita crecimiento infinito. 7 días de retención es suficiente para debugging.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "outbox pattern", "inbox pattern", "transactional outbox", "idempotent consumer", "message deduplication"
- **Prioridad de carga:** Alta — patrón esencial para mensajería confiable
- **Dependencias:** `02-arquitectura-diseno/20-asynchronous-messaging-patterns`, `02-arquitectura-diseno/23-idempotency-keys-processing`

### Tool Integration

```json
{
  "tool_name": "outbox-inbox-patterns",
  "description": "Implements Transactional Outbox and Inbox patterns: reliable event publishing, idempotent consumer, poller-based delivery",
  "triggers": ["outbox", "inbox", "transactional outbox", "idempotent consumer", "message deduplication"],
  "context_hint": "Inject when user asks about reliable message delivery or exactly-once processing",
  "output_format": "code examples with outbox poller and inbox consumer",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre entrega confiable de eventos o idempotencia, carga el skill outbox-inbox-patterns
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# SQL queries for outbox monitoring
psql -c "SELECT count(*) FROM outbox WHERE published = false;"  # pending
psql -c "SELECT count(*) FROM outbox WHERE published = true AND published_at < NOW() - INTERVAL '1h';"  # recent

# Inbox deduplication stats
psql -c "SELECT count(*), message_type FROM inbox WHERE processed = true GROUP BY message_type;"
```

### GUI / Web

- **Outbox Monitor**: Dashboard custom para monitorear eventos pendientes
- **Datadog / Grafana**: Métricas de outbox lag, inbox throughput, errores de publicación
- **Kafka UI / RabbitMQ Management**: Monitoreo de mensajes publicados

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check pending events | `psql -c "SELECT count(*) FROM outbox WHERE published=false"` | — |
| Check inbox duplicates | `psql -c "SELECT id, count(*) FROM inbox GROUP BY id HAVING count(*) > 1"` | — |

---

## 7. Cheatsheet Rápido

```sql
-- Outbox: write in same TX as business op
INSERT INTO outbox (id, event_type, payload, published) VALUES ($1, $2, $3, false);
-- Inbox: check before processing
SELECT id FROM inbox WHERE id = $1 AND processed = true;  -- skip if exists
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/20-asynchronous-messaging-patterns` | Dependiente | Sí |
| `02-arquitectura-diseno/23-idempotency-keys-processing` | Complementario | Sí |
| `02-arquitectura-diseno/02-event-driven-cqrs` | Complementario | Sí |
| `02-arquitectura-diseno/09-event-sourcing-eventstore` | Alternativa | No |
| `03-sistemas-distribuidos/28-change-data-capture-cdc` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: outbox-inbox-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [outbox, inbox, transactional-outbox, idempotent-consumer, message-deduplication, reliable-messaging]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

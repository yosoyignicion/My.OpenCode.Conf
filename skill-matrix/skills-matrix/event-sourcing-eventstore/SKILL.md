---
name: event-sourcing-eventstore
description: "Event Sourcing persists state as an ordered sequence of immutable events rather than current state"
---
# Event Sourcing & Event Store

## Semantic Triggers
```
event sourcing almacenamiento eventos, event store append only, aggregate stream eventos, rebuilding state from events, snapshot event store, event versioning schema evolution
```

---

## 1. Definición Teórica

Event Sourcing persists state as an ordered sequence of immutable events rather than current state. The current state is derived by replaying events (projection). An Event Store is a purpose-built database for append-only event storage with stream-based reads and optimistic concurrency. This provides a complete audit trail, temporal queries (past states), and the ability to rebuild read models from scratch. Events are never mutated or deleted — new events correct past mistakes.

---

## 2. Implementación de Referencia

TypeScript with a custom Event Store over PostgreSQL. Uses append-only event table with optimistic concurrency via version numbers.

### Ejemplo Práctico Avanzado

```typescript
// Domain Event — immutable, versioned
interface DomainEvent {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
  data: Record<string, unknown>;
  metadata: { occurredAt: Date; correlationId: string; causationId?: string };
}

// Event Store — append-only with optimistic concurrency
class PostgresEventStore {
  constructor(private db: Database) {}

  async appendToStream(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const current = await tx
        .selectFrom('event_store')
        .where('stream_id', '=', streamId)
        .select(tx.fn.max('version').as('max_version'))
        .executeTakeFirst();

      const maxVersion = current?.max_version ?? 0;
      if (maxVersion !== expectedVersion) {
        throw new ConcurrencyError(
          `Expected version ${expectedVersion} but current is ${maxVersion}`
        );
      }

      for (let i = 0; i < events.length; i++) {
        await tx.insertInto('event_store').values({
          stream_id: streamId,
          version: expectedVersion + i + 1,
          event_type: events[i].eventType,
          data: JSON.stringify(events[i].data),
          metadata: JSON.stringify(events[i].metadata),
          occurred_at: events[i].metadata.occurredAt,
        }).execute();
      }
    });
  }

  async readStream(streamId: string): Promise<DomainEvent[]> {
    return this.db
      .selectFrom('event_store')
      .where('stream_id', '=', streamId)
      .orderBy('version', 'asc')
      .selectAll()
      .execute();
  }

  async readStreamSince(streamId: string, sinceVersion: number): Promise<DomainEvent[]> {
    return this.db
      .selectFrom('event_store')
      .where('stream_id', '=', streamId)
      .where('version', '>', sinceVersion)
      .orderBy('version', 'asc')
      .selectAll()
      .execute();
  }
}

// Aggregate reconstruction from events
abstract class EventSourcedAggregate {
  private version = 0;
  private changes: DomainEvent[] = [];

  protected abstract applyEvent(event: DomainEvent): void;

  protected addEvent(eventType: string, data: Record<string, unknown>): void {
    const event: DomainEvent = {
      aggregateId: this.id,
      aggregateType: this.constructor.name,
      eventType,
      version: this.version + this.changes.length + 1,
      data,
      metadata: { occurredAt: new Date(), correlationId: crypto.randomUUID() },
    };
    this.applyEvent(event);
    this.changes.push(event);
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this.version = event.version;
    }
  }

  getChanges(): DomainEvent[] { return [...this.changes]; }
  clearChanges(): void { this.changes = []; }
  getVersion(): number { return this.version; }
}

// Concrete aggregate
class Order extends EventSourcedAggregate {
  id: string;
  private status: string = 'draft';
  private items: OrderItem[] = [];

  constructor(id: string) {
    super();
    this.id = id;
  }

  static create(items: OrderItem[]): Order {
    const order = new Order(crypto.randomUUID());
    order.addEvent('OrderCreated', { items });
    return order;
  }

  confirm(): void {
    if (this.status !== 'draft') throw new Error('Cannot confirm non-draft order');
    this.addEvent('OrderConfirmed', { confirmedAt: new Date().toISOString() });
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.items = (event.data as any).items;
        this.status = 'draft';
        break;
      case 'OrderConfirmed':
        this.status = 'confirmed';
        break;
    }
  }
}
```

**Fuente oficial:** https://martinfowler.com/eaaDev/EventSourcing.html

### Alternativa de Implementación Específica

Python with `eventsourcing` library for built-in Event Store, snapshots, and projections. Use SQLAlchemy for persistence.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas que requieren auditoría completa, proyecciones múltiples, análisis temporal, orígenes de datos complejos |
| **Cuándo evitar** | CRUD simple, dominios sin eventos significativos, equipos sin experiencia, requerimientos de baja latencia de escritura |
| **Alternativas** | CQRS sin Event Sourcing (solo separación read/write), Tablas de auditoría (más simple, menos flexible), Snapshot-only (pierde historial) |
| **Coste/Complejidad** | Alta complejidad operativa y cognitiva. Gestión de esquemas de eventos. Almacenamiento creciente. Proyecciones eventualmente consistentes |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Concurrency error en escritura simultánea

**¿Qué ocasionó el error?**
Dos comandos concurrentes intentaron modificar el mismo aggregate con la misma versión esperada.

**¿Cómo se solucionó?**
```typescript
// Optimistic concurrency con retry
async function placeOrder(items: OrderItem[]): Promise<Order> {
  let retries = 3;
  while (retries > 0) {
    try {
      const streamId = `order-${orderId}`;
      const existingEvents = await store.readStream(streamId);
      const existingVersion = existingEvents.length;

      const order = new Order(orderId);
      order.loadFromHistory(existingEvents);
      order.confirm();

      await store.appendToStream(streamId, order.getChanges(), existingVersion);
      return order;
    } catch (err) {
      if (err instanceof ConcurrencyError && retries > 0) {
        retries--;
        await sleep(50 * (3 - retries)); // incremental backoff
      } else throw err;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**¿Por qué funciona esta técnica?**
El versionado optimista y retry permiten manejar concurrencia sin locks pesados.

### Caso: Rebuild de proyección tarda demasiado

**¿Qué ocasionó el error?**
Reproducir 1M+ eventos para reconstruir una proyección tomaba horas.

**¿Cómo se solucionó?**
```typescript
// Snapshot cada N eventos
interface Snapshot { aggregateId: string; version: number; state: Record<string, unknown>; }
class SnapshotStore {
  async saveSnapshot(aggregate: EventSourcedAggregate): Promise<void> {
    const snapshot = {
      aggregateId: aggregate.id,
      version: aggregate.getVersion(),
      state: { status: aggregate.status, items: aggregate.items },
    };
    await this.db.insertInto('snapshots').values(snapshot).execute();
  }

  async loadWithSnapshots(aggregateId: string): Promise<{ snapshot: Snapshot | null; events: DomainEvent[] }> {
    const snapshot = await this.db
      .selectFrom('snapshots')
      .where('aggregate_id', '=', aggregateId)
      .orderBy('version', 'desc')
      .limit(1)
      .executeTakeFirst();

    const sinceVersion = snapshot?.version ?? 0;
    const events = await store.readStreamSince(aggregateId, sinceVersion);
    return { snapshot, events };
  }
}
```

**¿Por qué funciona esta técnica?**
Snapshots periodicos evitan reprocesar toda la historia. Se guarda cada 100 eventos y se carga desde el último snapshot.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "event sourcing", "event store", "append only", "event stream", "projection rebuild", "snapshot"
- **Prioridad de carga:** Alta — patrón arquitectónico para sistemas auditables
- **Dependencias:** `02-arquitectura-diseno/02-event-driven-cqrs`, `02-arquitectura-diseno/13-domain-events-dispatching`

### Tool Integration

```json
{
  "tool_name": "event-sourcing-eventstore",
  "description": "Implements Event Sourcing with Event Store: append-only streams, projections, snapshots, optimistic concurrency",
  "triggers": ["event sourcing", "event store", "append only", "projection", "snapshot", "replay events"],
  "context_hint": "Inject when user asks about audit trails or event-persisted state",
  "output_format": "code examples with Event Store implementation and aggregate reconstruction",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Event Sourcing o almacenamiento de eventos, carga el skill event-sourcing-eventstore
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Event Store commands (via EventStoreDB CLI)
evg --stream order-123 list
evg --stream order-123 replay --to projection=order_summary
evg --stream order-123 snapshot

# SQL queries for debugging
psql -c "SELECT count(*) FROM event_store WHERE stream_id = 'order-123';"
psql -c "SELECT event_type, count(*) FROM event_store GROUP BY event_type;"
```

### GUI / Web

- **EventStoreDB UI**: Dashboard de streams, eventos y proyecciones
- **Event Store Explorer**: Visualización de streams y eventos
- **Kafka UI**: Para event stores basados en Kafka

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List stream events | `evg --stream {id} list` | — |
| Take snapshot | `evg --stream {id} snapshot` | — |

---

## 7. Cheatsheet Rápido

```sql
CREATE TABLE event_store (
  stream_id UUID NOT NULL,
  version INT NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (stream_id, version)
);
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/02-event-driven-cqrs` | Complementario | Sí |
| `02-arquitectura-diseno/13-domain-events-dispatching` | Dependiente | Sí |
| `02-arquitectura-diseno/11-outbox-inbox-patterns` | Complementario | No |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/10-saga-orchestration-choreography` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: event-sourcing-eventstore
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [event-sourcing, event-store, append-only, projection, snapshot, concurrency, audit-trail]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

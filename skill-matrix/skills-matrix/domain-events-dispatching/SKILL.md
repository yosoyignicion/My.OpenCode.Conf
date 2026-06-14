---
name: domain-events-dispatching
description: "Domain Events capture significant business occurrences within the domain — past-tense, domain-specific, and meaningful to domain experts"
---
# Domain Events & Dispatching

## Semantic Triggers
```
domain event dispatch publicación, event handler dominio, domain event after commit, unit of work event dispatch, event publisher aggregate, domain event listener integración
```

---

## 1. Definición Teórica

Domain Events capture significant business occurrences within the domain — past-tense, domain-specific, and meaningful to domain experts. Aggregates collect events during operations and dispatch them after the unit of work completes. Dispatching strategies include immediate inline dispatch (within transaction), after-commit dispatch (after DB transaction succeeds), and integration event publication to external message brokers. Handlers must be idempotent and can trigger cross-aggregate logic or external integrations.

---

## 2. Implementación de Referencia

TypeScript with aggregate-collected events and after-commit dispatching via Unit of Work pattern.

### Ejemplo Práctico Avanzado

```typescript
// Domain Event — past-tense, domain-specific
abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(readonly aggregateId: string) {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }

  abstract eventType(): string;
}

class OrderSubmitted extends DomainEvent {
  constructor(aggregateId: string, readonly items: OrderItem[], readonly total: Money) {
    super(aggregateId);
  }
  eventType(): string { return 'order.submitted'; }
}

class OrderConfirmed extends DomainEvent {
  constructor(aggregateId: string, readonly transactionId: string) {
    super(aggregateId);
  }
  eventType(): string { return 'order.confirmed'; }
}

// Aggregate collecting domain events
class Order {
  private events: DomainEvent[] = [];
  constructor(readonly id: string, private items: OrderItem[] = [], private status: string = 'draft') {}

  submit(): void {
    if (this.status !== 'draft') throw new Error('Order already submitted');
    if (this.items.length === 0) throw new Error('Cannot submit empty order');
    this.status = 'submitted';
    this.events.push(new OrderSubmitted(this.id, this.items, this.calculateTotal()));
  }

  confirm(transactionId: string): void {
    if (this.status !== 'submitted') throw new Error('Order not submitted');
    this.status = 'confirmed';
    this.events.push(new OrderConfirmed(this.id, transactionId));
  }

  collectEvents(): DomainEvent[] {
    const collected = [...this.events];
    this.events = [];
    return collected;
  }

  private calculateTotal(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal()), new Money(0, 'USD'));
  }
}

// Unit of Work — manages transaction and event dispatch
class UnitOfWork {
  private events: DomainEvent[] = [];

  constructor(
    private db: Database,
    private dispatcher: DomainEventDispatcher
  ) {}

  async run<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const result = await fn();
      await this.flushEvents(tx);
      return result;
    });
  }

  addEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  private async flushEvents(tx: Transaction): Promise<void> {
    const events = [...this.events];
    this.events = [];

    // Persist events for audit
    for (const event of events) {
      await tx.insertInto('domain_events').values({
        id: event.eventId,
        aggregate_id: event.aggregateId,
        event_type: event.eventType(),
        data: JSON.stringify(event),
        occurred_at: event.occurredAt,
      }).execute();
    }

    // Dispatch after DB commit (at end of transaction)
    tx.afterCommit(async () => {
      await this.dispatcher.dispatch(events);
    });
  }
}

// Domain Event Dispatcher
interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

class DomainEventDispatcher {
  private handlers = new Map<string, DomainEventHandler[]>();

  register(eventType: string, handler: DomainEventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventType()) || [];
      await Promise.all(handlers.map(h => h.handle(event).catch(err => {
        console.error(`Handler failed for ${event.eventType()}:`, err);
        // Enqueue to DLQ for retry
      })));
    }
  }
}

// Concrete handler
class SendOrderConfirmationHandler implements DomainEventHandler<OrderConfirmed> {
  constructor(private emailService: EmailService) {}
  async handle(event: OrderConfirmed): Promise<void> {
    await this.emailService.sendTemplate('order-confirmed', {
      orderId: event.aggregateId,
      transactionId: event.transactionId,
    });
  }
}

// Usage
const order = new Order('order-123');
order.submit();
order.confirm('txn-456');
const events = order.collectEvents();
await unitOfWork.run(async () => {
  await orderRepo.save(order);
  events.forEach(e => unitOfWork.addEvent(e));
});
```

**Fuente oficial:** https://martinfowler.com/eaaDev/DomainEvent.html

### Alternativa de Implementación Específica

Python with `dataclasses` for events and `contextlib.contextmanager` for Unit of Work. Use `asyncio.Queue` for in-process dispatching.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas con lógica de dominio rica que requiere efectos secundarios, arquitectura basada en eventos, desacoplamiento entre agregados |
| **Cuándo evitar** | CRUD simple, cuando no hay efectos secundarios significativos, handlers que deben ser síncronos y dentro de la transacción |
| **Alternativas** | Publicación directa (menos desacoplado), Event Sourcing (auditoría completa), Integration events (para comunicación entre servicios) |
| **Coste/Complejidad** | Medio. After-commit dispatch evita problemas de transacciones fallidas. Gestión de handlers e idempotencia añade complejidad |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Handler ejecutado en transacción fallida

**¿Qué ocasionó el error?**
Eventos se despachaban inline dentro de la transacción, causando que handlers se ejecutaran incluso cuando la transacción rollbackeaba.

**¿Cómo se solucionó?**
```typescript
class SafeUnitOfWork {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const result = await fn();
      // Registrar eventos para despachar después del commit
      tx.afterCommit(() => this.dispatcher.dispatch(this.pendingEvents));
      return result;
    });
  }
}
```

**¿Por qué funciona esta técnica?**
Despachar after-commit garantiza que los handlers solo se ejecutan si la transacción fue exitosa.

### Caso: Handler que falla interrumpe otros handlers

**¿Qué ocasionó el error?**
Promise.all con un handler que fallaba causaba que todos los handlers abortaran.

**¿Cómo se solucionó?**
```typescript
class ResilientDispatcher {
  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventType()) || [];
      // Ejecutar handlers en paralelo pero capturar errores individualmente
      await Promise.allSettled(handlers.map(h =>
        h.handle(event).catch(err => {
          console.error(`Handler failed for ${event.eventType()}:`, err);
          // No relanzar — handler individual falla sin afectar a otros
          this.enqueueDeadLetter(event, err);
        })
      ));
    }
  }

  private async enqueueDeadLetter(event: DomainEvent, err: Error): Promise<void> {
    await this.db.insertInto('dead_letter_queue').values({
      event_id: event.eventId,
      event_type: event.eventType(),
      error: err.message,
      failed_at: new Date(),
    }).execute();
  }
}
```

**¿Por qué funciona esta técnica?**
Promise.allSettled ejecuta todos los handlers sin que uno falle cancele a los demás. Dead letter queue preserva fallos para retry manual.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "domain event", "event dispatch", "unit of work", "event handler", "after commit dispatch"
- **Prioridad de carga:** Alta — patrón fundamental para sistemas DDD y event-driven
- **Dependencias:** `02-arquitectura-diseno/01-ddd-tactical-patterns`, `02-arquitectura-diseno/02-event-driven-cqrs`

### Tool Integration

```json
{
  "tool_name": "domain-events-dispatching",
  "description": "Implements Domain Events with collection in aggregates, Unit of Work, and after-commit dispatching",
  "triggers": ["domain event", "event dispatch", "unit of work", "event handler", "after commit"],
  "context_hint": "Inject when user asks about event collection and dispatch in domain-driven systems",
  "output_format": "code examples with aggregate events and dispatcher",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre eventos de dominio o dispatch, carga el skill domain-events-dispatching y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Query domain_events table
psql -c "SELECT event_type, count(*) FROM domain_events WHERE occurred_at > NOW() - INTERVAL '1h' GROUP BY event_type;"
psql -c "SELECT * FROM dead_letter_queue ORDER BY failed_at DESC LIMIT 10;"
```

### GUI / Web

- **Event monitoring dashboard**: Visualización de eventos despachados, handlers ejecutados, fallos
- **Datadog / Grafana**: Métricas de latencia de dispatch, tasa de errores
- **Dead letter queue UI**: Interfaz para retry manual de eventos fallidos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check event counts | `psql -c "SELECT event_type, count(*) FROM domain_events..."` | — |
| View DLQ | `psql -c "SELECT * FROM dead_letter_queue LIMIT 10"` | — |

---

## 7. Cheatsheet Rápido

```typescript
class Aggregate { private events: DomainEvent[] = []; collectEvents(): DomainEvent[] { const e = [...this.events]; this.events = []; return e; } }
class UoW { async run<T>(fn) { return db.transaction(tx => { const r = fn(); tx.afterCommit(() => dispatcher.dispatch(events)); return r; }); } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Dependiente | Sí |
| `02-arquitectura-diseno/02-event-driven-cqrs` | Complementario | Sí |
| `02-arquitectura-diseno/11-outbox-inbox-patterns` | Complementario | No |
| `02-arquitectura-diseno/09-event-sourcing-eventstore` | Complementario | No |
| `02-arquitectura-diseno/20-asynchronous-messaging-patterns` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: domain-events-dispatching
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [domain-events, event-dispatch, unit-of-work, event-handler, after-commit, ddd]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: event-driven-cqrs
description: "CQRS separates write (commands) from read (queries) models, each optimized for its workload — commands validate business rules and produce events, queries return denormalized data without side effects"
---
# Event-Driven & CQRS

## Semantic Triggers
```
command query responsibility segregation, event sourcing proyecciones, write model vs read model, event bus desacoplamiento, eventual consistencia cqrs, separación commandos consultas
```

---

## 1. Definición Teórica

CQRS separates write (commands) from read (queries) models, each optimized for its workload — commands validate business rules and produce events, queries return denormalized data without side effects. Event-driven architecture propagates state changes via immutable events through a bus or broker. Together, they enable scalable, auditable systems where the write model can differ entirely from the read model in structure and technology.

---

## 2. Implementación de Referencia

TypeScript with in-process event bus for monolith CQRS. Commands are imperative, events are past-tense and immutable.

### Ejemplo Práctico Avanzado

```typescript
// Command — imperative, Ubiquitous Language
class PlaceOrderCommand {
  constructor(readonly orderId: string, readonly customerId: string, readonly items: OrderItem[]) {}
}

// Event — past-tense, immutable
class OrderPlaced {
  readonly occurredAt: Date;
  constructor(readonly orderId: string, readonly customerId: string) {
    this.occurredAt = new Date();
  }
}

// Command Handler (Write Model)
class PlaceOrderHandler {
  constructor(
    private orderRepo: OrderRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: PlaceOrderCommand): Promise<void> {
    const order = Order.create(command.items);
    await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderPlaced(command.orderId, command.customerId));
  }
}

// Query Handler (Read Model) — separate projection
class OrderSummaryQueryHandler {
  constructor(private db: Database) {}

  async handle(query: GetOrderSummaryQuery): Promise<OrderSummary> {
    return this.db
      .selectFrom('order_summary')
      .where('id', '=', query.orderId)
      .selectAll()
      .executeTakeFirstOrThrow();
  }
}

// Projection — subscribes to events, updates read model
class OrderProjection {
  constructor(private db: Database) {}

  async handle(event: OrderPlaced): Promise<void> {
    await this.db
      .insertInto('order_summary')
      .values({ id: event.orderId, customer_id: event.customerId, status: 'placed' })
      .execute();
  }
}

// Event Bus — in-process mediator
class EventBus {
  private handlers = new Map<string, Function[]>();
  subscribe(eventType: string, handler: Function): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.constructor.name) || [];
    await Promise.all(handlers.map(h => h(event)));
  }
}
```

**Fuente oficial:** https://martinfowler.com/bliki/CQRS.html

### Alternativa de Implementación Específica

Python with `pydantic` for commands/events and `asyncio.Queue` for in-process bus. Use `SQLModel` for write model and raw SQL for read model projections.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas donde read y write tienen diferentes patrones de carga, equipos grandes que escalan separadamente, necesidad de auditoría completa |
| **Cuándo evitar** | CRUD simple sin diferencias de rendimiento entre lectura/escritura, equipos pequeños, dominios triviales |
| **Alternativas** | CRUD tradicional (simplicidad), Event Sourcing puro (auditoría completa sin separación de modelos), Read-optimized replicas (eventual consistency sin cambiar write model) |
| **Coste/Complejidad** | Complejidad añadida por consistencia eventual y dos modelos. Mayor escalabilidad. Curva de aprendizaje significativa |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Inconsistencia entre read y write models

**¿Qué ocasionó el error?**
La proyección del read model no se actualizó porque el manejador de eventos falló silenciosamente.

**¿Cómo se solucionó?**
```typescript
// Añadir idempotencia + retry con DLQ
class ResilientProjection {
  async handle(event: OrderPlaced): Promise<void> {
    try {
      await this.db.insertInto('order_summary')
        .values({ id: event.orderId, customer_id: event.customerId })
        .onConflict((oc) => oc.doNothing()) // idempotente
        .execute();
    } catch (err) {
      await this.delayedRetry(event, 3, 1000); // 3 retries con backoff
    }
  }
}
```

**¿Por qué funciona esta técnica?**
Idempotencia garantiza que reprocesar el mismo evento no cause duplicados. Retry con backoff maneja fallos transitorios.

### Caso: Comandos que retornan datos

**¿Qué ocasionó el error?**
Handler de comando retornaba datos para la UI, violando la separación CQRS.

**¿Cómo se solucionó?**
```typescript
// Antes — comando retornaba datos
class PlaceOrderHandler {
  async handle(cmd: PlaceOrderCommand): Promise<OrderDTO> { /* ... */ }
}

// Después — comando retorna void, query separada
class PlaceOrderHandler {
  async handle(cmd: PlaceOrderCommand): Promise<void> { /* ... */ }
}
class GetOrderQueryHandler {
  async handle(query: GetOrderQuery): Promise<OrderDTO> { /* ... */ }
}
```

**¿Por qué funciona esta técnica?**
La separación estricta command/query permite optimizar cada lado independientemente y evita side effects en las queries.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "cqrs", "command query segregation", "event driven architecture", "write model read model"
- **Prioridad de carga:** Alta — patrón arquitectónico fundamental para sistemas escalables
- **Dependencias:** `02-arquitectura-diseno/13-domain-events-dispatching`, `02-arquitectura-diseno/20-asynchronous-messaging-patterns`

### Tool Integration

```json
{
  "tool_name": "event-driven-cqrs",
  "description": "Implements CQRS and event-driven architecture: commands, queries, events, projections, event bus",
  "triggers": ["cqrs", "command query", "event driven", "write model", "read model", "projection"],
  "context_hint": "Inject when user mentions separating read/write concerns or event-based communication",
  "output_format": "code examples with command handlers and event projections",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre CQRS o arquitectura event-driven, carga el skill event-driven-cqrs y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Event store management
evg --stream order-123 list  # list events for stream
evg --stream order-123 replay  # replay events to rebuild projection

# Projection rebuild
npm run projection:rebuild -- --stream order-123
```

### GUI / Web

- **Event Store UI**: Dashboard para visualizar streams, eventos y proyecciones
- **Kafka UI**: Interfaz web para tópicos, particiones y consumo de eventos
- **Axon Dashboard**: Monitoreo de comandos, eventos y sagas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Rebuild projection | `npm run projection:rebuild` | — |
| List event stream | `evg --stream {id} list` | — |

---

## 7. Cheatsheet Rápido

```typescript
class Command<T> { constructor(readonly payload: T) {} }
class Event<T> { constructor(readonly data: T, readonly occurredAt = new Date()) {} }
interface Query<T> { execute(): Promise<T>; }
interface Projection { handle(event: Event<unknown>): Promise<void>; }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/13-domain-events-dispatching` | Dependiente | Sí |
| `02-arquitectura-diseno/09-event-sourcing-eventstore` | Complementario | Sí |
| `02-arquitectura-diseno/10-saga-orchestration-choreography` | Complementario | Sí |
| `02-arquitectura-diseno/11-outbox-inbox-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/20-asynchronous-messaging-patterns` | Dependiente | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: event-driven-cqrs
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [cqrs, event-driven, command-query, projection, event-bus, eventual-consistency]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

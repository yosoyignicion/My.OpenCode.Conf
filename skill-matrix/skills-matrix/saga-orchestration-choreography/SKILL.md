---
name: saga-orchestration-choreography
description: "A Saga manages distributed transactions across multiple services without two-phase commit, ensuring eventual consistency"
---
# Saga: Orchestration & Choreography

## Semantic Triggers
```
saga orchestration coordinador central, saga choreography eventos descentralizados, compensating transaction rollback, saga patrón transacciones distribuidas, long running saga estado, saga failure handling
```

---

## 1. Definición Teórica

A Saga manages distributed transactions across multiple services without two-phase commit, ensuring eventual consistency. Orchestration uses a central coordinator (saga orchestrator) that tells each service what to do and handles compensating transactions on failure. Choreography distributes coordination where each service listens for events and responds, with compensating events for rollback. Orchestration provides centralized visibility but tighter coupling; choreography offers loose coupling but distributed complexity.

---

## 2. Implementación de Referencia

TypeScript implementing both orchestration and choreography sagas for an order processing workflow.

### Ejemplo Práctico Avanzado

```typescript
// ===== ORCHESTRATION SAGA =====
// Central coordinator that manages the saga state

interface SagaStep<T> {
  name: string;
  execute(context: T): Promise<void>;
  compensate(context: T): Promise<void>;
}

class SagaOrchestrator<T> {
  private steps: SagaStep<T>[] = [];
  private executedSteps: SagaStep<T>[] = [];
  private state: 'running' | 'completed' | 'compensating' = 'running';

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  async execute(context: T): Promise<void> {
    try {
      for (const step of this.steps) {
        await step.execute(context);
        this.executedSteps.push(step);
      }
      this.state = 'completed';
    } catch (err) {
      this.state = 'compensating';
      await this.compensate(context);
      throw err;
    }
  }

  private async compensate(context: T): Promise<void> {
    // Compensate in reverse order
    for (const step of [...this.executedSteps].reverse()) {
      try {
        await step.compensate(context);
      } catch (err) {
        console.error(`Compensation failed for step ${step.name}:`, err);
        // Log failure for manual intervention
      }
    }
  }
}

// Concrete saga steps
class ReserveInventoryStep implements SagaStep<OrderContext> {
  name = 'reserve-inventory';
  async execute(ctx: OrderContext): Promise<void> {
    ctx.inventoryReservation = await inventoryService.reserve(ctx.items);
  }
  async compensate(ctx: OrderContext): Promise<void> {
    if (ctx.inventoryReservation) {
      await inventoryService.release(ctx.inventoryReservation);
    }
  }
}

class ChargePaymentStep implements SagaStep<OrderContext> {
  name = 'charge-payment';
  async execute(ctx: OrderContext): Promise<void> {
    ctx.paymentCharge = await paymentService.charge(ctx.amount, ctx.paymentToken);
  }
  async compensate(ctx: OrderContext): Promise<void> {
    if (ctx.paymentCharge) {
      await paymentService.refund(ctx.paymentCharge.transactionId);
    }
  }
}

class ScheduleShippingStep implements SagaStep<OrderContext> {
  name = 'schedule-shipping';
  async execute(ctx: OrderContext): Promise<void> {
    ctx.shipmentId = await shippingService.schedule(ctx.items, ctx.address);
  }
  async compensate(ctx: OrderContext): Promise<void> {
    if (ctx.shipmentId) {
      await shippingService.cancel(ctx.shipmentId);
    }
  }
}

// Usage
const saga = new SagaOrchestrator<OrderContext>();
saga
  .addStep(new ReserveInventoryStep())
  .addStep(new ChargePaymentStep())
  .addStep(new ScheduleShippingStep());

try {
  await saga.execute(context);
} catch (err) {
  // All steps compensated in reverse order
  console.error('Saga failed, compensating transactions completed');
}

// ===== CHOREOGRAPHY SAGA =====
// Each service listens and responds to events

// After OrderCreated, InventoryService reserves and emits InventoryReserved
// After InventoryReserved, PaymentService charges and emits PaymentCharged
// After PaymentCharged, ShippingService schedules and emits Shipped

// PaymentService listens for events
class PaymentService {
  async handleInventoryReserved(event: InventoryReserved): Promise<void> {
    try {
      await this.charge(event.orderId, event.amount);
      await this.eventBus.publish(new PaymentCharged(event.orderId));
    } catch (err) {
      // Publish failure event for compensation
      await this.eventBus.publish(new PaymentFailed(event.orderId));
    }
  }

  // InventoryService listens for PaymentFailed to compensate
  async handlePaymentFailed(event: PaymentFailed): Promise<void> {
    await this.inventoryService.release(event.orderId);
  }
}
```

**Fuente oficial:** https://microservices.io/patterns/data/saga.html

### Alternativa de Implementación Específica

Python with temporal.io for workflow-based saga orchestration, or using `saga-python` library for lightweight sagas.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Transacciones distribuidas en microservicios, flujos multi-paso que requieren rollback, operaciones que abarcan múltiples bounded contexts |
| **Cuándo evitar** | Operaciones dentro de un solo servicio (usar transacciones ACID), flujos simples de 2 pasos, sistemas donde la consistencia fuerte es mandatory |
| **Alternativas** | Two-Phase Commit (consistencia fuerte, pero bloqueante), Transacciones ACID (dentro de un servicio), Eventual consistency sin saga (para flujos no críticos) |
| **Coste/Complejidad** | Alta. Gestión de estado de saga, compensaciones, idempotencia. Orchestration: más fácil de monitorear. Choreography: más desacoplado pero complejo de trazar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Compensación fallida

**¿Qué ocasionó el error?**
Una compensación (refund) falló porque el servicio de pagos estaba caído, dejando el sistema en estado inconsistente.

**¿Cómo se solucionó?**
```typescript
// Retry con backoff exponencial para compensaciones
class ResilientCompensation {
  async compensate(context: OrderContext): Promise<void> {
    let retries = 5;
    let delay = 100;
    while (retries > 0) {
      try {
        await paymentService.refund(context.transactionId);
        return;
      } catch (err) {
        retries--;
        if (retries === 0) {
          // Log para intervención manual
          await deadLetterQueue.enqueue({
            type: 'failed-compensation',
            context: context.id,
            error: err,
          });
          throw err;
        }
        await sleep(delay);
        delay *= 2; // exponential backoff
      }
    }
  }
}
```

**¿Por qué funciona esta técnica?**
Las compensaciones deben ser resilientes. Si tras retries fallan, se persisten en DLQ para intervención manual.

### Caso: Saga sin idempotencia causa duplicados

**¿Qué ocasionó el error?**
Un paso de saga se ejecutó dos veces por un retry del message broker, cargando el pago dos veces.

**¿Cómo se solucionó?**
```typescript
// Idempotency key en cada paso
class ChargePaymentStep implements SagaStep<OrderContext> {
  async execute(ctx: OrderContext): Promise<void> {
    const idempotencyKey = `saga-${ctx.sagaId}-step-charge`;
    const existing = await idempotencyStore.get(idempotencyKey);
    if (existing) {
      ctx.paymentCharge = existing; // reuse previous result
      return;
    }
    ctx.paymentCharge = await paymentService.charge(ctx.amount, ctx.paymentToken, idempotencyKey);
    await idempotencyStore.set(idempotencyKey, ctx.paymentCharge, 86400);
  }
}
```

**¿Por qué funciona esta técnica?**
Idempotencia en cada paso permite retry seguro sin efectos secundarios duplicados.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~820 tokens estimados al invocar este skill
- **Trigger de activación:** "saga pattern", "orchestration saga", "choreography saga", "compensating transaction", "distributed transaction"
- **Prioridad de carga:** Alta — patrón crítico para microservicios
- **Dependencias:** `02-arquitectura-diseno/02-event-driven-cqrs`, `02-arquitectura-diseno/20-asynchronous-messaging-patterns`

### Tool Integration

```json
{
  "tool_name": "saga-orchestration-choreography",
  "description": "Implements Saga pattern for distributed transactions: orchestration with central coordinator and choreography with events",
  "triggers": ["saga", "orchestration", "choreography", "compensating transaction", "distributed transaction"],
  "context_hint": "Inject when user asks about multi-service transactions or rollback patterns",
  "output_format": "code examples with orchestrator and event-driven saga",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre sagas o transacciones distribuidas, carga el skill saga-orchestration-choreography
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Debug saga state
curl -X GET http://localhost:3000/sagas/order-123/state
# Retry failed saga
curl -X POST http://localhost:3000/sagas/order-123/retry

# Monitor sagas en ejecución
curl -s http://localhost:3000/sagas?status=running | jq '.'
```

### GUI / Web

- **Temporal UI**: Dashboard de workflows y sagas
- **Camunda BPM**: Modelado y monitoreo de procesos/sagas
- **Axon Dashboard**: Monitoreo de sagas en Axon Framework

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check saga state | `curl /sagas/{id}/state` | — |
| Retry saga | `curl -X POST /sagas/{id}/retry` | — |

---

## 7. Cheatsheet Rápido

```typescript
class SagaOrchestrator<T> {
  steps: SagaStep<T>[] = [];
  addStep(s: SagaStep<T>) { this.steps.push(s); }
  async execute(ctx: T) {
    for (const step of this.steps) { try { await step.execute(ctx); } catch { await this.compensate(ctx); throw; } }
  }
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/02-event-driven-cqrs` | Complementario | Sí |
| `02-arquitectura-diseno/20-asynchronous-messaging-patterns` | Dependiente | Sí |
| `02-arquitectura-diseno/11-outbox-inbox-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/23-idempotency-keys-processing` | Dependiente | Sí |
| `02-arquitectura-diseno/13-distributed-transactions-2pc-3pc` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: saga-orchestration-choreography
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [saga, orchestration, choreography, compensating-transaction, distributed-transaction, eventual-consistency]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: saga-pattern-distributed-coordination
description: "The Saga pattern manages distributed transactions by breaking them into a sequence of local transactions with compensating actions for rollback"
---
# Saga Pattern & Distributed Coordination

## Semantic Triggers
```
saga pattern choreography vs orchestration, compensating transactions and rollback in saga, saga orchestration with temporal or camunda, saga choreography with event driven coordination, saga failure handling and retry with idempotency, saga pattern for distributed transaction alternatives
```

---

## 1. Definición Teórica

The Saga pattern manages distributed transactions by breaking them into a sequence of local transactions with compensating actions for rollback. It solves the problem of maintaining data consistency across microservices without distributed transactions (2PC). Key distinction: Sagas are "compensating" not "rolling back" — compensations are semantic undo operations (e.g., a refund compensates a charge) rather than state restoration.

---

## 2. Implementación de Referencia

**Temporal** — workflow engine for saga orchestration (durable execution, retries, timeouts). **Camunda** (BPMN) for business-process sagas. **Акka** with Akka Persistence for event-sourced sagas. **Eventuate Tram** for choreography-based sagas.

### Ejemplo Práctico Avanzado

```python
from dataclasses import dataclass, field
from enum import auto, Enum
import asyncio
import uuid
import logging

class SagaStepStatus(Enum):
    PENDING = auto()
    COMPLETED = auto()
    FAILED = auto()
    COMPENSATING = auto()
    COMPENSATED = auto()

@dataclass
class SagaStep:
    name: str
    action: callable
    compensate: callable
    status: SagaStepStatus = SagaStepStatus.PENDING

class SagaOrchestrator:
    """Orchestration-based saga coordinator."""
    def __init__(self, saga_id: str = None):
        self.saga_id = saga_id or str(uuid.uuid4())
        self.steps: list[SagaStep] = []
        self.completed_steps: list[SagaStep] = []
        self.failed = False

    def add_step(self, action, compensate, name: str):
        self.steps.append(SagaStep(name=name, action=action, compensate=compensate))

    async def execute(self):
        for step in self.steps:
            try:
                await step.action()
                step.status = SagaStepStatus.COMPLETED
                self.completed_steps.append(step)
                logging.info(f"Saga {self.saga_id}: step {step.name} completed")
            except Exception as e:
                step.status = SagaStepStatus.FAILED
                self.failed = True
                logging.error(f"Saga {self.saga_id}: step {step.name} failed: {e}")
                await self.compensate()
                raise SagaFailedException(self.saga_id, step.name, str(e))
        return self.saga_id

    async def compensate(self):
        for step in reversed(self.completed_steps):
            step.status = SagaStepStatus.COMPENSATING
            try:
                await step.compensate()
                step.status = SagaStepStatus.COMPENSATED
                logging.info(f"Saga {self.saga_id}: compensation for {step.name} succeeded")
            except Exception as e:
                logging.critical(f"Saga {self.saga_id}: compensation for {step.name} failed: {e}")
                # Continue compensating other steps; log for manual intervention

# Concrete saga example: Order Placement
async def create_order_saga(order_id: str, user_id: str, items: list, amount: float):
    saga = SagaOrchestrator(saga_id=f"order-{order_id}")

    async def reserve_inventory():
        if not await inventory_service.reserve(order_id, items):
            raise ValueError("Insufficient inventory")

    async def unreserve_inventory():
        await inventory_service.unreserve(order_id, items)

    async def charge_payment():
        payment = await payment_service.charge(user_id, amount)
        if not payment.success:
            raise ValueError(payment.error)

    async def refund_payment():
        await payment_service.refund(user_id, amount)

    async def send_confirmation():
        await notification_service.send_order_confirmation(user_id, order_id)

    async def cancel_confirmation():
        await notification_service.send_order_cancelled(user_id, order_id)

    saga.add_step(charge_payment, refund_payment, "charge_payment")
    saga.add_step(reserve_inventory, unreserve_inventory, "reserve_inventory")
    saga.add_step(send_confirmation, cancel_confirmation, "send_confirmation")

    return await saga.execute()
```

**Fuente oficial:** https://microservices.io/patterns/data/saga.html

### Alternativa de Implementación Específica

**Choreography-based saga**: Each service emits events and reacts to others' events. No central coordinator. Simpler for linear workflows but harder to debug. Use Kafka or RabbitMQ for event transport. Each step is idempotent and has a compensating event.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Multi-service write operations (order-to-shipment, booking workflows), when 2PC is too heavy, eventual consistency is acceptable |
| **Cuándo evitar** | Single-service transactions (use local ACID). Strongly consistent requirements (use 2PC or Spanner). Simple operations that don't compensate well |
| **Alternativas** | 2PC/3PC for strong consistency. Outbox pattern for eventual consistency. Event sourcing for audit trail. Temporal for complex workflows |
| **Coste/Complejidad** | Medium-high — compensating logic doubles implementation effort. Idempotency required. Orchestration adds a coordinator (SPOF risk). Choreography is harder to trace |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Compensation fails — partial saga stuck

**¿Qué ocasionó el error?**
A saga charges payment and reserves inventory. Payment succeeds but inventory fails. The payment refund compensation also fails (payment gateway unreachable). The saga is stuck — money charged, no inventory.

**¿Cómo se solucionó?**
Implement retry with exponential backoff for compensations. Log failed compensations in a dead letter queue. Alert on-call for manual resolution. Temporal's retry mechanism handles this automatically.

**¿Por qué funciona esta técnica?**
Retries handle transient failures (network blips). DLQ ensures no compensation is silently lost. Manual intervention provides a last resort for permanent failures.

### Caso: Idempotency violation — double charge

**¿Qué ocasionó el error?**
A saga step "charge payment" is retried due to timeout. The first request actually succeeded but the response was lost. The retry charges again — double charge.

**¿Cómo se solucionó?**
Every saga step must be idempotent. Use idempotency keys per step. Before executing any step, check if it has already succeeded using the saga ID and step name.

**¿Por qué funciona esta técnica?**
Idempotency ensures that retries produce the same result as the original. The payment provider deduplicates based on the idempotency key, returning the original result instead of processing a new charge.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "saga pattern", "distributed transaction", "compensating transaction", "temporal", "choreography saga"
- **Prioridad de carga:** Alta — fundamental para consistencia en microservicios
- **Dependencias:** `event-driven-cqrs`, `outbox-inbox-patterns`, `api-idempotency-in-distributed-networks`

### Tool Integration

```json
{
  "tool_name": "saga-pattern-distributed-coordination",
  "description": "Saga pattern for distributed transactions: orchestration and choreography, compensating actions, idempotency, recovery",
  "triggers": ["saga pattern", "compensating transaction", "orchestration saga", "choreography saga", "temporal"],
  "context_hint": "Load when user asks about distributed transactions in microservices, sagas, or compensation patterns",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre saga pattern o distributed transactions en microservicios,
carga el skill saga-pattern-distributed-coordination. Prioriza el ejemplo de orquestación
con compensaciones y enfatiza idempotencia en cada step.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Temporal: start and query workflow
temporal workflow start --task-queue order-saga --workflow-id order-123 --type OrderSaga --input '{}'
temporal workflow describe --workflow-id order-123
temporal workflow show --workflow-id order-123

# Camunda: deploy and start process
curl -X POST http://localhost:8080/engine-rest/deployment/create -F "deployment-name=saga.bpmn" -F "file=@saga.bpmn"
curl -X POST http://localhost:8080/engine-rest/process-definition/key/order-saga/start -H "Content-Type: application/json" -d '{"variables": {}}'

# Kafka choreography events
kafka-console-consumer.sh --topic order.saga --from-beginning --property print.key=true
kafka-console-producer.sh --topic order.saga --property "key.separator=:"
```

### GUI / Web

- **Temporal Web UI** — workflow list, execution history, pending activities, stack traces, retry status
- **Camunda Cockpit** — process instance view, BPMN diagram with active/inactive nodes, failure detection
- **Kafka UI** — saga event streams, consumer group progress
- **Datadog** — saga duration, step failure rate, compensation rate, stuck saga alerts

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Start saga | `temporal workflow start --workflow-id ...` | Temporal UI → Start Workflow |
| Check status | `temporal workflow describe` | Camunda Cockpit → Process |
| View history | `temporal workflow show` | Temporal UI → Execution |
| Retry step | `temporal workflow reset --workflow-id` | Temporal UI → Reset |

---

## 7. Cheatsheet Rápido

```python
# Saga patterns:
#   Orchestration: central coordinator (Temporal, Camunda)
#   Choreography: events between services (Kafka, RabbitMQ)

# Every action must have a compensating action:
#   charge_payment ↔ refund_payment
#   reserve_inventory ↔ unreserve_inventory
#   send_confirmation ↔ cancel_notification

# Compensations are semantic undo (not state rollback)

# Idempotency: every step must be idempotent
# Use saga_id + step_name as idempotency key

# Recovery: retry compensations with backoff
# DLQ for failed compensations → manual intervention

# Never use saga without compensating actions for mutating steps
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `event-driven-cqrs` | complementario — CQRS with saga coordination | Sí |
| `outbox-inbox-patterns` | complementario — outbox for reliable saga events | Sí |
| `api-idempotency-in-distributed-networks` | requisito — idempotency for saga step safety | Sí |
| `distributed-transactions-2pc-3pc` | alternativo — 2PC for strong consistency | No |
| `message-brokers-kafka-internals` | complementario — Kafka for choreography transport | No |

---

## 9. Metadatos del Skill

```yaml
---
id: saga-pattern-distributed-coordination
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [saga-pattern, distributed-transaction, compensation, orchestration, choreography, temporal, camunda]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

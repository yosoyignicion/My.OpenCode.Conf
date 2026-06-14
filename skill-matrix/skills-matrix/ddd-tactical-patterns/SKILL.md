---
name: ddd-tactical-patterns
description: "Domain-Driven Design tactical patterns provide building blocks for domain modeling"
---
# DDD Tactical Patterns

## Semantic Triggers
```
agregado raíz agregado, value object inmutabilidad, domain service lógica dominio, repository patrón colección, factory creación agregados, specification consultas dominio
```

---

## 1. Definición Teórica

Domain-Driven Design tactical patterns provide building blocks for domain modeling. Aggregates enforce consistency boundaries by ensuring all changes to a cluster of objects go through the root. Value Objects encapsulate immutable concepts with equality-by-value semantics. Domain Services orchestrate cross-entity logic that doesn't naturally fit in an entity. Repositories abstract persistence behind a collection-like interface per aggregate root.

---

## 2. Implementación de Referencia

TypeScript with DDD tactical patterns. The implementation uses plain classes without framework coupling — the domain layer should be pure.

### Ejemplo Práctico Avanzado

```typescript
// Aggregate Root — consistency boundary
class Order {
  private items: OrderItem[] = [];
  private status: OrderStatus = 'draft';
  private domainEvents: DomainEvent[] = [];

  addItem(product: Product, qty: number): void {
    if (this.status !== 'draft') throw new Error('Can only modify draft orders');
    if (qty > 10) throw new Error('Max 10 per order');
    this.items.push(new OrderItem(product, qty));
    this.total = this.items.reduce((s, i) => s + i.subtotal(), 0);
  }

  submit(): void {
    if (this.items.length === 0) throw new Error('Cannot submit empty order');
    this.status = 'submitted';
    this.domainEvents.push(new OrderSubmitted(this.id, new Date()));
  }

  clearEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}

// Value Object — immutable, self-validating
class Money {
  constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new Error('Amount must be positive');
  }
  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }
}

// Repository interface — collection-like abstraction
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
}

// Domain Service — stateless, cross-aggregate logic
class PricingService {
  calculateDiscount(order: Order, customer: Customer): Money {
    if (customer.isVIP() && order.total.amount > 1000) {
      return new Money(order.total.amount * 0.1, order.total.currency);
    }
    return new Money(0, order.total.currency);
  }
}
```

**Fuente oficial:** https://www.domainlanguage.com/ddd/

### Alternativa de Implementación Específica

Python with `dataclasses` and `ABC` for DDD patterns. Use frozen dataclasses for Value Objects and ABC for Repository interfaces.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Dominios complejos con lógica de negocio rica, equipos que entienden el lenguaje ubicuo, sistemas donde la integridad de datos es crítica |
| **Cuándo evitar** | CRUD simple sin lógica de dominio, prototipos rápidos, sistemas donde el modelo de datos es trivial |
| **Alternativas** | Transaction Script (simplicidad, perdiendo expresividad de dominio), Active Record (menos capas, acoplando modelo a persistencia), Anemic Domain Model (más fácil pero pierde encapsulación) |
| **Coste/Complejidad** | Alta curva de aprendizaje inicial. Mayor mantenibilidad a largo plazo. Overhead de mapeo entre capas |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Aggregate granulometría incorrecta

**¿Qué ocasionó el error?**
Agregados demasiado grandes causaban contención de concurrencia — múltiples usuarios modificando diferentes partes del mismo aggregate forzaban conflictos de versión.

**¿Cómo se solucionó?**
```typescript
// Antes: Order contenía OrderItems, Payments, ShippingDetails
class Order { /* demasiado grande */ }

// Después: separar en aggregates más pequeños
// Order (items y estado), Payment (transacciones), Shipment (logística)
// Cada uno con su propio repositorio y边界
class Order { /* solo items + status */ }
class Payment { /* transacciones */ }
class Shipment { /* tracking */ }
```

**¿Por qué funciona esta técnica?**
Aggregates más pequeños reducen la contención de escritura y permiten escalar la persistencia. Cada aggregate mantiene su propia versión de concurrencia optimista.

### Caso: Value Object vs Entity confusion

**¿Qué ocasionó el error?**
Dirección modelada como Entity cuando debería ser Value Object, causando duplicación y problemas de igualdad.

**¿Cómo se solucionó?**
```typescript
// Antes: Dirección como Entity con ID
class Address { id: string; street: string; city: string; }

// Después: Value Object inmutable sin ID
class Address {
  constructor(readonly street: string, readonly city: string) {}
  equals(other: Address): boolean {
    return this.street === other.street && this.city === other.city;
  }
}
```

**¿Por qué funciona esta técnica?**
Identificar conceptos del dominio que son intercambiables por valor y no tienen identidad propia. La regla: si dos objetos son iguales cuando sus atributos son iguales, es un Value Object.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "aggregate", "value object", "domain service", "repository pattern", "ddd tactical"
- **Prioridad de carga:** Alta — conceptos fundacionales para cualquier sistema con lógica de dominio
- **Dependencias:** `02-arquitectura-diseno/08-solid-deep-dive`, `02-arquitectura-diseno/17-dependency-injection-inversion`

### Tool Integration

```json
{
  "tool_name": "ddd-tactical-patterns",
  "description": "Implements DDD tactical patterns: Aggregates, Value Objects, Domain Services, Repositories, Factories, Specifications",
  "triggers": ["aggregate root", "value object", "domain service", "repository", "ddd", "tactical pattern"],
  "context_hint": "Inject after identifying domain complexity in the user's system description",
  "output_format": "code examples with domain modeling patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre modelado de dominio con DDD, carga el skill ddd-tactical-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# TypeScript project setup with DDD structure
mkdir -p src/domain/{aggregates,value-objects,services,repositories}
mkdir -p src/infrastructure/{persistence,adapters}
mkdir -p src/application/{use-cases,commands,queries}

# Python project setup
mkdir -p domain/{entities,value_objects,services,repositories}
mkdir -p infrastructure/{persistence,adapters}
```

### GUI / Web

- **Visual Paradigm**: Diseño de diagramas de dominio UML con estereotipos DDD
- **Context Mapper**: Herramienta web para modelado táctico y estratégico DDD
- **Miro / Lucidchart**: Colaboración en mapas de contexto y event storming

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Scaffold aggregate | `mkdir -p src/domain/aggregates` | — |
| New value object | `touch src/domain/value-objects/{name}.ts` | — |

---

## 7. Cheatsheet Rápido

```typescript
interface Repository<T> { save(t: T): Promise<void>; findById(id: string): Promise<T | null>; }
abstract class ValueObject { abstract equals(other: this): boolean; }
class Aggregate { private events: DomainEvent[] = []; protected addEvent(e: DomainEvent) { this.events.push(e); } clearEvents() { const es = [...this.events]; this.events = []; return es; } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/08-solid-deep-dive` | Complementario | Sí |
| `02-arquitectura-diseno/03-hexagonal-architecture` | Complementario | Sí |
| `02-arquitectura-diseno/13-domain-events-dispatching` | Dependiente | Sí |
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Complementario | Sí |
| `02-arquitectura-diseno/09-event-sourcing-eventstore` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: ddd-tactical-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [ddd, domain-driven-design, tactical-patterns, aggregate, value-object, domain-service, repository]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

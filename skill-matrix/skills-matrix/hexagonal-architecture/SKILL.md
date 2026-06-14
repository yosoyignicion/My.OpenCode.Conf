---
name: hexagonal-architecture
description: "Hexagonal Architecture (Ports & Adapters) isolates the domain core from infrastructure by defining ports (interfaces in the domain) and adapters (implementations in infrastructure)"
---
# Hexagonal Architecture (Ports & Adapters)

## Semantic Triggers
```
puertos adaptadores arquitectura, hexagonal ports adapters, inversión dependencias infraestructura, core dominio aislado, driven adapters repositorios, driving adapters controladores
```

---

## 1. Definición Teórica

Hexagonal Architecture (Ports & Adapters) isolates the domain core from infrastructure by defining ports (interfaces in the domain) and adapters (implementations in infrastructure). The domain core has zero imports from frameworks, databases, or external libraries. Driving adapters (controllers, CLI) initiate calls into the core; driven adapters (repositories, message producers) are called by the core. The Dependency Inversion Principle is its foundation — high-level policy does not depend on low-level details.

---

## 2. Implementación de Referencia

TypeScript with strict separation between domain core and infrastructure adapters. Ports are TypeScript interfaces; adapters are implementations.

### Ejemplo Práctico Avanzado

```typescript
// ===== DOMAIN CORE =====
// Port — contract defined in domain layer
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

interface PaymentGateway {
  charge(amount: Money, token: string): Promise<PaymentResult>;
}

// Use Case — pure business logic
class PlaceOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private paymentGateway: PaymentGateway
  ) {}

  async execute(items: OrderItem[], paymentToken: string): Promise<Order> {
    const order = Order.create(items);
    const total = order.calculateTotal();

    const payment = await this.paymentGateway.charge(total, paymentToken);
    if (!payment.success) throw new PaymentFailedError(payment.message);

    order.confirm(payment.transactionId);
    await this.orderRepo.save(order);
    return order;
  }
}

// Domain Types — no infrastructure dependency
class Order {
  constructor(
    readonly id: string,
    readonly items: OrderItem[],
    private status: OrderStatus = 'pending',
    private transactionId?: string
  ) {}

  static create(items: OrderItem[]): Order {
    if (items.length === 0) throw new Error('Cannot create empty order');
    return new Order(crypto.randomUUID(), items);
  }

  confirm(transactionId: string): void {
    if (this.status !== 'pending') throw new Error('Order already confirmed');
    this.status = 'confirmed';
    this.transactionId = transactionId;
  }

  calculateTotal(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal()), new Money(0, 'USD'));
  }
}

// ===== INFRASTRUCTURE =====
// Driven Adapter — implements port
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    await db.insertInto('orders')
      .values({ id: order.id, status: order.status, items: JSON.stringify(order.items) })
      .onConflict((oc) => oc.doUpdateSet({ status: order.status }))
      .execute();
  }

  async findById(id: string): Promise<Order | null> {
    const row = await db.selectFrom('orders').where('id', '=', id).executeTakeFirst();
    return row ? new Order(row.id, JSON.parse(row.items)) : null;
  }
}

// Driving Adapter — REST controller
class OrderController {
  constructor(private placeOrder: PlaceOrderUseCase) {}

  async post(req: Request, res: Response): Promise<void> {
    try {
      const order = await this.placeOrder.execute(req.body.items, req.body.paymentToken);
      res.status(201).json({ id: order.id, status: 'confirmed' });
    } catch (err) {
      if (err instanceof PaymentFailedError) {
        res.status(402).json({ error: err.message });
      } else throw err;
    }
  }
}
```

**Fuente oficial:** https://alistair.cockburn.us/hexagonal-architecture/

### Alternativa de Implementación Específica

Go with interfaces for ports and struct implementations for adapters. Use Google wire for dependency injection at the composition root.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas con múltiples adaptadores (varios DB, varios proveedores cloud), necesidad de testear dominio sin infraestructura, alta mantenibilidad requerida |
| **Cuándo evitar** | Prototipos, sistemas simples CRUD con un solo adaptador, equipos sin experiencia en DIP |
| **Alternativas** | Clean Architecture (capas concéntricas más explícitas), MVC tradicional (menos abstracciones), Vertical Slices (organización por feature en vez de capas) |
| **Coste/Complejidad** | Mayor número de interfaces y archivos. Excelente testabilidad. Curva de aprendizaje media |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Puerto que filtra a infraestructura

**¿Qué ocasionó el error?**
El puerto OrderRepository exponía tipos de la base de datos (QueryBuilder, Row) en su interfaz, violando el aislamiento.

**¿Cómo se solucionó?**
```typescript
// Antes — puerto contaminado con tipos de infraestructura
interface OrderRepository {
  save(order: QueryBuilder): Promise<void>;
}

// Después — puerto puro del dominio
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}
```

**¿Por qué funciona esta técnica?**
El puerto debe usar solo tipos del dominio. El adaptador es responsable de mapear entre tipos de dominio y de infraestructura.

### Caso: Adaptador que crea dependencia cíclica

**¿Qué ocasionó el error?**
El adaptador de repositorio importaba tipos del core del dominio, que a su vez importaba el adaptador para instanciación.

**¿Cómo se solucionó?**
```typescript
// Composition Root — único lugar donde se instancia todo
const orderRepo: OrderRepository = new PostgresOrderRepository();
const paymentGateway: PaymentGateway = new StripeGateway();
const placeOrder = new PlaceOrderUseCase(orderRepo, paymentGateway);

// El dominio nunca importa infraestructura
// La infraestructura importa y implementa puertos del dominio
```

**¿Por qué funciona esta técnica?**
La Composition Root invierte el flujo de dependencias: todo se instancia en el punto de entrada, resolviendo el ciclo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "hexagonal architecture", "ports and adapters", "driven adapter", "driving adapter", "core isolation"
- **Prioridad de carga:** Alta — patrón arquitectónico fundamental
- **Dependencias:** `02-arquitectura-diseno/08-solid-deep-dive`, `02-arquitectura-diseno/17-dependency-injection-inversion`

### Tool Integration

```json
{
  "tool_name": "hexagonal-architecture",
  "description": "Implements Ports & Adapters pattern: domain core isolation, port interfaces, driven/driving adapters, composition root",
  "triggers": ["hexagonal", "ports adapters", "core isolation", "clean architecture", "adapter pattern"],
  "context_hint": "Inject when user asks about decoupling infrastructure from business logic",
  "output_format": "code examples showing port definitions and adapter implementations",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre arquitectura hexagonal o puertos y adaptadores, carga el skill hexagonal-architecture
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Scaffold hexagonal structure
mkdir -p {domain,application,infrastructure}/{ports,adapters}
mkdir -p {domain,application,infrastructure}/{models,services}

# Verify no infrastructure imports in domain
grep -r "from.*infrastructure" domain/ && echo "Violation found!"
```

### GUI / Web

- **Structurizr**: Diagramas C4 con enfoque hexagonal
- **Context Mapper**: Soporte para modelado hexagonal
- **Archi**: Herramienta open-source de modelado arquitectónico

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Verify domain purity | `grep -r "import.*db" domain/` | — |
| Scaffold adapter | `mkdir -p infrastructure/adapters/{in,out}` | — |

---

## 7. Cheatsheet Rápido

```typescript
interface Port { /* domain interface */ }
class Adapter implements Port { /* infrastructure impl */ }
// Composition Root: const port: Port = new Adapter();
// Core never imports infrastructure
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/04-clean-architecture-principles` | Complementario | Sí |
| `02-arquitectura-diseno/08-solid-deep-dive` | Dependiente | Sí |
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Complementario | Sí |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/19-data-mapper-active-record` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: hexagonal-architecture
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [hexagonal, ports-adapters, clean-architecture, dependency-inversion, core-isolation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

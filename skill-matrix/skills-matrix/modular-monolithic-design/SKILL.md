---
name: modular-monolithic-design
description: "A Modular Monolith organizes code into well-defined modules (bounded contexts) within a single deployment unit"
---
# Modular Monolithic Design

## Semantic Triggers
```
modular monolith módulos boundaries, monolito modular vs microservicios, module boundaries contexto acotado, layered modules dependencias, modular monolith vertical slices, module communication events interface
```

---

## 1. Definición Teórica

A Modular Monolith organizes code into well-defined modules (bounded contexts) within a single deployment unit. Each module has its own domain logic, data access (separate schema/table prefix), and explicit public interface. Modules communicate through interfaces (sync) or events (async), never through direct internal class access. This architecture offers microservices-level modularity without distributed system complexity — teams can work independently, modules can be extracted to services later, and deployment remains simple.

---

## 2. Implementación de Referencia

TypeScript with module boundaries enforced by directory structure and dependency rules. Module public API via explicit exports.

### Ejemplo Práctico Avanzado

```typescript
// ===== Module: Billing =====
// public/index.ts — explicit public API
export interface BillingService {
  invoice(orderId: string): Promise<Invoice>;
  processRefund(transactionId: string): Promise<void>;
}

export class InvoiceCreated {
  constructor(
    readonly invoiceId: string,
    readonly orderId: string,
    readonly amount: Money,
    readonly issuedAt: Date = new Date()
  ) {}
}

// internal/domain.ts — private to billing module
class Invoice {
  constructor(
    readonly id: string,
    readonly orderId: string,
    readonly amount: Money,
    private status: InvoiceStatus = 'pending'
  ) {}

  markPaid(): void {
    if (this.status !== 'pending') throw new Error('Invoice not pending');
    this.status = 'paid';
  }

  markOverdue(): void {
    if (this.status !== 'pending') throw new Error('Invoice not pending');
    this.status = 'overdue';
  }
}

// internal/repository.ts — private to billing module
class PostgresInvoiceRepository {
  async save(invoice: Invoice): Promise<void> {
    await db.insertInto('billing.invoices').values({
      id: invoice.id,
      order_id: invoice.orderId,
      amount: invoice.amount.toNumber(),
      status: invoice.status,
    }).execute();
  }
}

// internal/billing-service.ts — implements public interface
class BillingServiceImpl implements BillingService {
  constructor(
    private repo: PostgresInvoiceRepository,
    private eventBus: EventBus
  ) {}

  async invoice(orderId: string): Promise<Invoice> {
    const invoice = new Invoice(crypto.randomUUID(), orderId, new Money(100, 'USD'));
    await this.repo.save(invoice);
    await this.eventBus.publish(new InvoiceCreated(invoice.id, orderId, invoice.amount));
    return invoice;
  }
}

// ===== Module: Orders =====
// public/index.ts
export interface OrderService {
  place(items: OrderItem[]): Promise<Order>;
  cancel(orderId: string): Promise<void>;
}

export class OrderPlaced {
  constructor(readonly orderId: string, readonly items: OrderItem[]) {}
}

// internal/order-service.ts
class OrderServiceImpl implements OrderService {
  constructor(
    private billing: BillingService,  // from other module via interface
    private orderRepo: PostgresOrderRepository
  ) {}

  async place(items: OrderItem[]): Promise<Order> {
    const order = Order.create(items);
    await this.orderRepo.save(order);
    const invoice = await this.billing.invoice(order.id);  // cross-module via interface
    return order;
  }
}

// ===== Module Registration (Composition Root) =====
class ModuleRegistry {
  private modules = new Map<string, any>();

  register(moduleName: string, publicApi: any): void {
    this.modules.set(moduleName, publicApi);
  }

  resolve<T>(moduleName: string): T {
    return this.modules.get(moduleName) as T;
  }
}

// App bootstrap
const registry = new ModuleRegistry();
registry.register('billing', new BillingServiceImpl(new PostgresInvoiceRepository(), eventBus));
registry.register('orders', new OrderServiceImpl(registry.resolve('billing'), new PostgresOrderRepository()));
```

**Fuente oficial:** https://microservices.io/patterns/monolithic/modular-monolith.html

### Alternativa de Implementación Específica

Python with namespace packages for modules and explicit `__all__` for public API. Use dependency injection for cross-module communication.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos medianos, sistemas con bounded contexts claros pero sin necesidad de despliegue independiente, paso intermedio antes de migrar a microservicios |
| **Cuándo evitar** | Equipos muy pequeños (el overhead de módulos no compensa), sistemas que ya requieren escalado independiente por servicio, prototipos |
| **Alternativas** | Microservicios (despliegue independiente, complejidad distribuida), Monolito en capas (más simple pero menos modular), Vertical Slices (modularidad por feature no por capa) |
| **Coste/Complejidad** | Medio. Buen balance entre modularidad y simplicidad operativa. Fácil migración a microservicios. Requiere disciplina de boundaries |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Módulo accede directamente a DB de otro módulo

**¿Qué ocasionó el error?**
Orders module importaba directamente el repositorio de Billing, violando el boundary del módulo.

**¿Cómo se solucionó?**
```typescript
// 🚫 Violación — acceso directo a DB de otro módulo
import { PostgresInvoiceRepo } from '../billing/internal/repository';
const invoices = await PostgresInvoiceRepo.findByOrder(orderId);

// ✅ Correcto — a través de interfaz pública
import { BillingService } from '../billing/public';
const invoice = await billingService.invoice(orderId);  // solo interfaz pública
```

**¿Por qué funciona esta técnica?**
Cada módulo expone solo su API pública. El acceso a datos internos está encapsulado. Esto permite cambiar implementaciones sin afectar consumidores.

### Caso: Módulos con dependencia cíclica

**¿Qué ocasionó el error?**
Orders llamaba a Billing, que emitía eventos que Orders escuchaba, y en el handler llamaba de vuelta a Billing.

**¿Cómo se solucionó?**
```typescript
// Romper ciclo con eventos asíncronos
// Orders → Billing.invoice() → emite InvoiceCreated
// Orders escucha InvoiceCreated y continúa su flujo
// Billing NUNCA depende de Orders — solo emite eventos

// Si se necesita comunicación síncrona bidireccional, extraer a un tercer módulo
// orchestration/public/index.ts
export class OrderBillingOrchestrator {
  constructor(private orders: OrderService, private billing: BillingService) {}
  async placeAndInvoice(items: OrderItem[]): Promise<OrderResult> { /* orquestación */ }
}
```

**¿Por qué funciona esta técnica?**
Eventos asíncronos rompen dependencias circulares. Si se requiere síncrono, un tercer módulo de orquestación gestiona el flujo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~790 tokens estimados al invocar este skill
- **Trigger de activación:** "modular monolith", "module boundary", "bounded context monolith", "vertical slice", "module communication"
- **Prioridad de carga:** Alta — alternativa práctica a microservicios
- **Dependencias:** `02-arquitectura-diseno/01-ddd-tactical-patterns`, `02-arquitectura-diseno/15-microservices-decomposition`

### Tool Integration

```json
{
  "tool_name": "modular-monolithic-design",
  "description": "Implements Modular Monolith: module boundaries, public API, cross-module communication, composition root",
  "triggers": ["modular monolith", "module boundary", "bounded context", "vertical slice", "module facade"],
  "context_hint": "Inject when user asks about organizing code within a single deployment unit",
  "output_format": "code examples with module structure and interfaces",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre organización modular en un monolito, carga el skill modular-monolithic-design
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Verificar boundaries de módulos — no imports de internal
grep -r "from.*/internal" src/modules/ --include="*.ts" | grep -v "module-name/internal"
# Ver dependencias entre módulos
npx madge --extensions ts src/ --image graph.png
```

### GUI / Web

- **Structure101**: Visualización y enforcement de dependencias entre módulos
- **Madge**: Generación de gráficos de dependencias
- **SonarQube**: Reglas de arquitectura para boundaries

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check module boundaries | `grep -r "from.*internal" src/modules/` | — |
| View dependency graph | `npx madge --extensions ts src/ --image graph.png` | — |

---

## 7. Cheatsheet Rápido

```typescript
// Module structure:
// module/public/index.ts  -> export interface XService
// module/internal/*.ts     -> implementation, repos, domain
// Cross-module: via interfaces from public, never direct internal imports
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/15-microservices-decomposition` | Complementario | Sí |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Dependiente | Sí |
| `02-arquitectura-diseno/04-clean-architecture-principles` | Complementario | Sí |
| `02-arquitectura-diseno/16-api-gateway-bff-patterns` | Alternativa | No |
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: modular-monolithic-design
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [modular-monolith, module-boundary, bounded-context, vertical-slice, monolith, modularity]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

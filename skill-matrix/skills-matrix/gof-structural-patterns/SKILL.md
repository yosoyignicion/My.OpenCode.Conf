---
name: gof-structural-patterns
description: "Structural patterns compose classes and objects into larger structures while keeping them flexible and efficient"
---
# GoF Structural Patterns

## Semantic Triggers
```
adapter patrón interfaz incompatible, decorator responsabilidades dinámicas, proxy control acceso, facade subsistema simplificar, composite árbol jerarquía, bridge abstracción implementación separar
```

---

## 1. Definición Teórica

Structural patterns compose classes and objects into larger structures while keeping them flexible and efficient. Adapter bridges incompatible interfaces by wrapping an existing class with a new interface. Decorator attaches additional responsibilities dynamically without modifying the original class. Proxy controls access or defers cost by standing in for another object. Facade provides a unified interface to a complex subsystem. Composite composes objects into tree structures representing hierarchies. Bridge decouples an abstraction from its implementation so both can evolve independently.

---

## 2. Implementación de Referencia

TypeScript implementing all six GoF structural patterns with real-world scenarios.

### Ejemplo Práctico Avanzado

```typescript
// Adapter — makes third-party library compatible with existing interface
interface NotificationSender { send(message: string): void; }

class EmailSender implements NotificationSender {
  send(msg: string): void { console.log(`Email: ${msg}`); }
}

// Third-party Slack API with incompatible interface
class SlackAPI {
  postMessage(channel: string, text: string): void { /* Slack native */ }
}

// Adapter makes SlackAPI compatible with NotificationSender
class SlackAdapter implements NotificationSender {
  constructor(private slack: SlackAPI, private channel: string) {}
  send(msg: string): void {
    this.slack.postMessage(this.channel, msg);
  }
}

// Decorator — adds behavior dynamically
abstract class NotifierDecorator implements NotificationSender {
  constructor(protected wrapped: NotificationSender) {}
  abstract send(msg: string): void;
}

class LoggingDecorator extends NotifierDecorator {
  send(msg: string): void {
    console.log(`[LOG] Sending: ${msg}`);
    this.wrapped.send(msg);
  }
}

class RateLimitDecorator extends NotifierDecorator {
  private lastSent = 0;
  send(msg: string): void {
    const now = Date.now();
    if (now - this.lastSent < 1000) throw new Error('Rate limited');
    this.lastSent = now;
    this.wrapped.send(msg);
  }
}

// Proxy — controls access
class CachedUserRepository implements UserRepository {
  private cache = new Map<string, User>();
  constructor(private realRepo: UserRepository) {}
  async findById(id: string): Promise<User | null> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const user = await this.realRepo.findById(id);
    if (user) this.cache.set(id, user);
    return user;
  }
}

// Facade — simplifies complex subsystem
class OrderFacade {
  constructor(
    private inventory: InventoryService,
    private payment: PaymentService,
    private shipping: ShippingService,
    private notification: NotificationSender
  ) {}

  async placeOrder(items: OrderItem[], paymentInfo: PaymentInfo): Promise<OrderResult> {
    await this.inventory.reserve(items);
    const payment = await this.payment.charge(paymentInfo);
    const shipment = await this.shipping.schedule(items);
    this.notification.send(`Order placed: ${payment.transactionId}`);
    return { payment, shipment };
  }
}

// Composite — tree structure
interface FileSystemNode { getName(): string; getSize(): number; }
class File implements FileSystemNode {
  constructor(private name: string, private size: number) {}
  getName(): string { return this.name; }
  getSize(): number { return this.size; }
}
class Directory implements FileSystemNode {
  private children: FileSystemNode[] = [];
  constructor(private name: string) {}
  add(node: FileSystemNode): void { this.children.push(node); }
  getName(): string { return this.name; }
  getSize(): number { return this.children.reduce((s, c) => s + c.getSize(), 0); }
}
```

**Fuente oficial:** https://refactoring.guru/design-patterns/structural-patterns

### Alternativa de Implementación Específica

Python with `__call__` for decorators, `abc.ABC` for adapters, and context managers for proxy patterns.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas que requieren extensibilidad sin modificación, integración con librerías third-party, control de acceso o logging transversal |
| **Cuándo evitar** | Sistemas simples sin variación, cuando el patrón añade indirección sin beneficio real, Decorator excesivo puede complicar debugging |
| **Alternativas** | Inheritance (menos flexible que Decorator), Middleware (alternativa moderna a Chain/Decorator), AOP (programación aspectual para concerns transversales) |
| **Coste/Complejidad** | Medio. Aumenta número de clases. Decorator y Proxy son fáciles de mantener. Adapter esencial para integración |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Decorator con pérdida de tipo

**¿Qué ocasionó el error?**
Decorator no preservaba la interfaz exacta del wrapped object, causando TypeScript errors en propiedades específicas.

**¿Cómo se solucionó?**
```typescript
// Decorator genérico con preservación de tipo
function Loggable<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      console.log(`Created instance of ${constructor.name}`);
    }
  };
}

// O con interface explícita
interface Notifier { send(msg: string): void; }
class BaseDecorator implements Notifier {
  constructor(protected wrapped: Notifier) {}
  send(msg: string): void { this.wrapped.send(msg); }
}
```

**¿Por qué funciona esta técnica?**
Implementar la misma interfaz que el wrapped object garantiza compatibilidad de tipos y transparencia.

### Caso: Facade que filtra complejidad

**¿Qué ocasionó el error?**
Facade exponía métodos de los subsistemas internos, rompiendo el encapsulamiento.

**¿Cómo se solucionó?**
```typescript
// Facade correcto — solo expone operaciones de alto nivel
class CheckoutFacade {
  async checkout(cart: Cart): Promise<OrderConfirmation> {
    // Internamente orquesta inventory, payment, shipping
    return { orderId, total, estimatedDelivery };
  }
  // NO exponer: reserveInventory, chargePayment, scheduleShipping
}
```

**¿Por qué funciona esta técnica?**
Facade debe simplificar, no filtrar. Cada operación de alto nivel orquesta múltiples subsistemas internamente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "adapter pattern", "decorator", "proxy", "facade", "composite", "bridge", "structural pattern"
- **Prioridad de carga:** Alta — patrones esenciales para diseño extensible
- **Dependencias:** `02-arquitectura-diseno/05-gof-creational-patterns`, `02-arquitectura-diseno/07-gof-behavioral-patterns`

### Tool Integration

```json
{
  "tool_name": "gof-structural-patterns",
  "description": "Implements GoF structural patterns: Adapter, Decorator, Proxy, Facade, Composite, Bridge",
  "triggers": ["adapter", "decorator", "proxy", "facade", "composite", "bridge", "structural pattern"],
  "context_hint": "Inject when user asks about composing classes or object structure patterns",
  "output_format": "code examples with all six structural patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre patrones estructurales GoF, carga el skill gof-structural-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Find adapter implementations
grep -r "implements.*Adapter" src/ --include="*.ts"
# Find decorators
grep -r "extends.*Decorator" src/ --include="*.ts"
```

### GUI / Web

- **Refactoring Guru**: Diagramas interactivos de patrones estructurales
- **IntelliJ IDEA**: Inspección de dependencias y patrones
- **TypeScript AST Viewer**: Visualización de decoradores

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Find all adapters | `grep -r "implements.*Adapter"` | `Ctrl+Shift+F` "Adapter" |
| Find decorators | `grep -r "extends.*Decorator"` | `Ctrl+Shift+F` "Decorator" |

---

## 7. Cheatsheet Rápido

```typescript
// Adapter: implements Target { constructor(private adaptee) {} method() { adaptee.otherMethod() } }
// Decorator: extends Base { constructor(wrapped) {} send() { log(); wrapped.send() } }
// Proxy: implements Subject { constructor(realSubject) {} method() { checkAccess(); realSubject.method() } }
// Facade: high-level methods { complexOp() { sub1.do(); sub2.do() } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/05-gof-creational-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/07-gof-behavioral-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/29-command-pattern-undo-redo` | Complementario | No |
| `02-arquitectura-diseno/26-plugins-and-extensibility-architectures` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: gof-structural-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [gof, structural-patterns, adapter, decorator, proxy, facade, composite, bridge]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

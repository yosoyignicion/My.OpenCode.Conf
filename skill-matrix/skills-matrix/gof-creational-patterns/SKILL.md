---
name: gof-creational-patterns
description: "Creational patterns abstract object instantiation, making systems independent of how objects are created, composed, and represented"
---
# GoF Creational Patterns

## Semantic Triggers
```
factory method creación objetos, abstract factory familias objetos, singleton instancia única, builder construcción compleja, prototype clonación objetos, creational patterns gof
```

---

## 1. Definición Teórica

Creational patterns abstract object instantiation, making systems independent of how objects are created, composed, and represented. Factory Method defines an interface for creating an object but lets subclasses decide which class to instantiate. Abstract Factory produces families of related objects without specifying concrete classes. Builder separates the construction of a complex object from its representation. Singleton ensures a class has exactly one instance. Prototype creates new objects by cloning a prototype instance.

---

## 2. Implementación de Referencia

TypeScript implementing all five GoF creational patterns with modern idioms.

### Ejemplo Práctico Avanzado

```typescript
// Factory Method
interface PaymentGateway { charge(amount: number): Promise<PaymentResult>; }
class StripeGateway implements PaymentGateway { /* stripe impl */ }
class PayPalGateway implements PaymentGateway { /* paypal impl */ }

class PaymentGatewayFactory {
  static create(type: 'stripe' | 'paypal'): PaymentGateway {
    switch (type) {
      case 'stripe': return new StripeGateway();
      case 'paypal': return new PayPalGateway();
      default: throw new Error(`Unknown gateway: ${type}`);
    }
  }
}

// Abstract Factory
interface UIFactory {
  createButton(): Button;
  createDialog(): Dialog;
}

class MaterialUIFactory implements UIFactory {
  createButton(): Button { return new MaterialButton(); }
  createDialog(): Dialog { return new MaterialDialog(); }
}

class CupertinoUIFactory implements UIFactory {
  createButton(): Button { return new CupertinoButton(); }
  createDialog(): Dialog { return new CupertinoDialog(); }
}

// Builder — fluent interface for complex construction
class OrderBuilder {
  private items: OrderItem[] = [];
  private customerId?: string;
  private shippingAddress?: Address;

  addItem(product: Product, qty: number): this {
    this.items.push(new OrderItem(product, qty));
    return this;
  }

  forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  shipTo(address: Address): this {
    this.shippingAddress = address;
    return this;
  }

  build(): Order {
    if (this.items.length === 0) throw new Error('Cannot build empty order');
    return new Order(this.items, this.customerId!, this.shippingAddress);
  }
}

// Usage
const order = new OrderBuilder()
  .addItem(product1, 2)
  .addItem(product2, 1)
  .forCustomer('cust-123')
  .shipTo(address)
  .build();

// Singleton
class DatabasePool {
  private static instance: DatabasePool;
  private connections: Connection[] = [];

  private constructor() { /* initialize pool */ }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  getConnection(): Connection { /* return from pool */ }
}

// Prototype
interface Prototype<T> { clone(): T; }

class ShoppingCart implements Prototype<ShoppingCart> {
  constructor(public items: CartItem[]) {}

  clone(): ShoppingCart {
    return new ShoppingCart(this.items.map(item => ({ ...item })));
  }
}
```

**Fuente oficial:** https://refactoring.guru/design-patterns/creational-patterns

### Alternativa de Implementación Específica

Python with `@dataclass`, `@classmethod` factories, and module-level singletons. Abstract Factory via Protocol ABC.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas que requieren flexibilidad en creación de objetos, bibliotecas que deben soportar múltiples implementaciones, objetos complejos con muchas variantes |
| **Cuándo evitar** | Creación simple con `new`, sistemas sin variación en tipos de objetos, cuando Factory añade complejidad innecesaria |
| **Alternativas** | Inyección de dependencias (Dependency Injection para creación), Service Locator (menos explícito), POJO creation directa |
| **Coste/Complejidad** | Bajo/medio. Fácil de testear. Añade número de clases. Builder y Abstract Factory incrementan complejidad |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Singleton considerado anti-patrón en tests

**¿Qué ocasionó el error?**
Singleton global dificultaba tests unitarios porque el estado persistía entre tests.

**¿Cómo se solucionó?**
```typescript
// Singleton con reseteo para tests
class DatabasePool {
  private static instance: DatabasePool;

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) DatabasePool.instance = new DatabasePool();
    return DatabasePool.instance;
  }

  static resetForTesting(): void {
    DatabasePool.instance = undefined as unknown as DatabasePool;
  }
}

// En test:
beforeEach(() => DatabasePool.resetForTesting());
```

**¿Por qué funciona esta técnica?**
Permite inyectar instancia limpia en cada test, manteniendo el Singleton para producción.

### Caso: Builder con estado inconsistente

**¿Qué ocasionó el error?**
Builder permitía llamar `build()` sin campos requeridos, creando objetos inválidos.

**¿Cómo se solucionó?**
```typescript
// Builder con validación en build()
class OrderBuilder {
  private requiredFields: (keyof this)[] = ['customerId'];
  build(): Order {
    // Validate all required fields set
    for (const field of this.requiredFields) {
      if (!this[field]) throw new Error(`${String(field)} is required`);
    }
    return new Order(this.items, this.customerId!);
  }
}
```

**¿Por qué funciona esta técnica?**
Validar en `build()` garantiza que el Builder produce objetos consistentes en lugar de depender del llamante.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "factory pattern", "singleton", "builder pattern", "abstract factory", "creational pattern", "gof"
- **Prioridad de carga:** Alta — patrones fundamentales para diseño de software
- **Dependencias:** `02-arquitectura-diseno/06-gof-structural-patterns`, `02-arquitectura-diseno/07-gof-behavioral-patterns`

### Tool Integration

```json
{
  "tool_name": "gof-creational-patterns",
  "description": "Implements GoF creational patterns: Factory Method, Abstract Factory, Builder, Singleton, Prototype",
  "triggers": ["factory", "singleton", "builder", "prototype", "creational", "gof"],
  "context_hint": "Inject when user asks about object creation patterns or instantiation strategies",
  "output_format": "code examples with all five creational patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre patrones de creación GoF, carga el skill gof-creational-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Visualizar patrones de creación
grep -r "new " src/ --include="*.ts" | wc -l  # count direct instantiations
grep -r "Factory" src/ --include="*.ts" | wc -l  # count factories
```

### GUI / Web

- **Refactoring Guru**: Referencia visual de todos los patrones GoF
- **Draw.io / Diagrams.net**: Diagramas UML para patrones
- **IntelliJ IDEA**: Diagramas de clases y detección de patrones

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Find all factories | `grep -r "Factory" src/` | `Ctrl+Shift+F` "Factory" |
| Find singletons | `grep -r "getInstance" src/` | `Ctrl+Shift+F` "getInstance" |

---

## 7. Cheatsheet Rápido

```typescript
// Factory: static create(type): Product
// Builder: obj.withX(x).withY(y).build()
// Singleton: class { static getInstance() }
// Prototype: interface { clone(): T }
// Abstract Factory: createButton(), createDialog() per theme
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/06-gof-structural-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/07-gof-behavioral-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Alternativa | No |
| `02-arquitectura-diseno/19-data-mapper-active-record` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: gof-creational-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [gof, creational-patterns, factory-method, abstract-factory, builder, singleton, prototype]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

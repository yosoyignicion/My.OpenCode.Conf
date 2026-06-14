---
name: gof-behavioral-patterns
description: "Behavioral patterns focus on communication between objects — how responsibilities are assigned and algorithms are encapsulated"
---
# GoF Behavioral Patterns

## Semantic Triggers
```
observer patrón eventos notificación, strategy algoritmos intercambiables, command solicitud encapsulada, chain of responsibility cadena manejo, state máquina estados, template method algoritmo esqueleto
```

---

## 1. Definición Teórica

Behavioral patterns focus on communication between objects — how responsibilities are assigned and algorithms are encapsulated. Observer defines a one-to-many dependency where state changes notify all dependents automatically. Strategy encapsulates interchangeable algorithms behind a common interface. Command parameterizes requests as objects enabling queuing, logging, and undo. Chain of Responsibility passes requests along a handler chain until one processes it. State alters object behavior when internal state changes. Template Method defines the skeleton of an algorithm with overridable steps.

---

## 2. Implementación de Referencia

TypeScript implementing all six GoF behavioral patterns with real-world use cases.

### Ejemplo Práctico Avanzado

```typescript
// Strategy — interchangeable algorithms
interface PricingStrategy {
  calculate(basePrice: number): number;
}

class RegularPricing implements PricingStrategy {
  calculate(base: number): number { return base; }
}

class PremiumDiscount implements PricingStrategy {
  calculate(base: number): number { return base * 0.8; }
}

class SeasonalPricing implements PricingStrategy {
  constructor(private multiplier: number) {}
  calculate(base: number): number { return base * this.multiplier; }
}

class OrderService {
  constructor(private pricing: PricingStrategy) {}
  checkout(order: Order): number {
    return this.pricing.calculate(order.total());
  }
}

// Observer — event notification
interface Observer<T> { update(event: T): void; }

class Subject<T> {
  private observers: Set<Observer<T>> = new Set();
  attach(observer: Observer<T>): void { this.observers.add(observer); }
  detach(observer: Observer<T>): void { this.observers.delete(observer); }
  notify(event: T): void { this.observers.forEach(o => o.update(event)); }
}

// Concrete use: Order status changes
class OrderNotifier extends Subject<OrderEvent> {
  constructor() { super(); }
}

// Command — encapsulate request
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
}

class UpdateOrderCommand implements Command {
  constructor(
    private orderId: string,
    private newStatus: string,
    private previousStatus: string
  ) {}
  async execute(): Promise<void> { /* update to newStatus */ }
  async undo(): Promise<void> { /* revert to previousStatus */ }
}

// Chain of Responsibility — middleware pattern
interface Handler {
  setNext(handler: Handler): Handler;
  handle(request: HttpRequest): Promise<HttpResponse | null>;
}

class AuthHandler implements Handler {
  private next?: Handler;
  setNext(h: Handler): Handler { this.next = h; return h; }
  async handle(req: HttpRequest): Promise<HttpResponse | null> {
    if (!req.headers.authorization) return { status: 401, body: 'Unauthorized' };
    return this.next?.handle(req) ?? null;
  }
}

class RateLimitHandler implements Handler {
  private next?: Handler;
  setNext(h: Handler): Handler { this.next = h; return h; }
  async handle(req: HttpRequest): Promise<HttpResponse | null> {
    if (this.isRateLimited(req.ip)) return { status: 429, body: 'Too Many Requests' };
    return this.next?.handle(req) ?? null;
  }
}

// State — behavior changes with state
interface OrderState {
  next(order: OrderContext): void;
  cancel(order: OrderContext): void;
  status(): string;
}

class PendingState implements OrderState {
  next(ctx: OrderContext): void { ctx.setState(new ConfirmedState()); }
  cancel(ctx: OrderContext): void { ctx.setState(new CancelledState()); }
  status(): string { return 'pending'; }
}

class ConfirmedState implements OrderState {
  next(ctx: OrderContext): void { ctx.setState(new ShippedState()); }
  cancel(ctx: OrderContext): void { ctx.setState(new CancelledState()); }
  status(): string { return 'confirmed'; }
}

class OrderContext {
  private state: OrderState = new PendingState();
  setState(state: OrderState): void { this.state = state; }
  next(): void { this.state.next(this); }
  cancel(): void { this.state.cancel(this); }
  status(): string { return this.state.status(); }
}
```

**Fuente oficial:** https://refactoring.guru/design-patterns/behavioral-patterns

### Alternativa de Implementación Específica

Python with Protocol for Strategy, asyncio.Event for Observer, and __call__ for Command patterns.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas con algoritmos intercambiables, necesidad de notificar múltiples componentes, flujos de control complejos con estados |
| **Cuándo evitar** | Lógica simple que no requiere extensibilidad, observer innecesario cuando un callback basta, Chain con pocos handlers |
| **Alternativas** | Middleware (Chain moderno), EventEmitter (Observer nativo en Node), switch/if (simplicidad, menos mantenible) |
| **Coste/Complejidad** | Medio. Strategy y Command son muy reutilizables. State reduce condicionales. Observer puede complicar debugging con muchos listeners |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Strategy con demasiadas variantes

**¿Qué ocasionó el error?**
Nuevas estrategias requerían modificar el factory, violando Open-Closed.

**¿Cómo se solucionó?**
```typescript
// Registry pattern para estrategias
class PricingRegistry {
  private strategies = new Map<string, PricingStrategy>();
  register(name: string, strategy: PricingStrategy): void {
    this.strategies.set(name, strategy);
  }
  get(name: string): PricingStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) throw new Error(`Unknown strategy: ${name}`);
    return strategy;
  }
}
```

**¿Por qué funciona esta técnica?**
Registry permite añadir estrategias sin modificar código existente, cumpliendo OCP.

### Caso: Observer con memory leaks

**¿Qué ocasionó el error?**
Observers no se desuscribían al destruirse, causando fugas de memoria.

**¿Cómo se solucionó?**
```typescript
// WeakRef-based observer o cleanup obligatorio
class SafeObserver<T> implements Observer<T> {
  private subscription: () => void;
  constructor(subject: Subject<T>, private handler: (event: T) => void) {
    this.subscription = subject.attach(this);
  }
  update(event: T): void { this.handler(event); }
  unsubscribe(): void { this.subscription(); }
}
```

**¿Por qué funciona esta técnica?**
Encapsular la suscripción y devolver una función de cleanup garantiza que los observers se limpien correctamente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~820 tokens estimados al invocar este skill
- **Trigger de activación:** "observer", "strategy", "command pattern", "chain of responsibility", "state pattern", "template method"
- **Prioridad de carga:** Alta — patrones fundamentales para interacción entre objetos
- **Dependencias:** `02-arquitectura-diseno/05-gof-creational-patterns`, `02-arquitectura-diseno/06-gof-structural-patterns`

### Tool Integration

```json
{
  "tool_name": "gof-behavioral-patterns",
  "description": "Implements GoF behavioral patterns: Observer, Strategy, Command, Chain of Responsibility, State, Template Method",
  "triggers": ["observer", "strategy", "command", "chain of responsibility", "state", "template", "behavioral"],
  "context_hint": "Inject when user asks about object communication or algorithm encapsulation",
  "output_format": "code examples with all six behavioral patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre patrones de comportamiento GoF, carga el skill gof-behavioral-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Find command implementations
grep -r "implements Command" src/ --include="*.ts"
# Find strategy usage
grep -r "PricingStrategy\|Strategy" src/ --include="*.ts"
```

### GUI / Web

- **Refactoring Guru**: Diagramas interactivos de patrones de comportamiento
- **XState Visualizer**: Visualización de state machines
- **RxJS Marble Diagrams**: Visualización de streams reactivos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Find observers | `grep -r "attach\|subscribe" src/` | `Ctrl+Shift+F` "subscribe" |
| Find strategies | `grep -r "Strategy" src/` | `Ctrl+Shift+F` "Strategy" |

---

## 7. Cheatsheet Rápido

```typescript
// Strategy: interface { algo() }; class Concrete implements Strategy
// Observer: Subject { attach(o) } -> Observer { update(e) }
// Command: interface { execute(), undo() }
// Chain: Handler { setNext(h), handle(req) }
// State: Context { setState(s) }; each State impl { next(), cancel() }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/05-gof-creational-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/06-gof-structural-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/29-command-pattern-undo-redo` | Complementario | No |
| `02-arquitectura-diseno/24-state-machine-workflows` | Dependiente | Sí |
| `02-arquitectura-diseno/13-domain-events-dispatching` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: gof-behavioral-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [gof, behavioral-patterns, observer, strategy, command, chain-of-responsibility, state, template-method]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

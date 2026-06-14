---
name: dependency-injection-inversion
description: "Dependency Injection implements Inversion of Control by injecting dependencies into a class (via constructor, setter, or interface) rather than having the class create them"
---
# Dependency Injection & Inversion of Control

## Semantic Triggers
```
dependency injection contenedor ioc, inversión control constructor injection, service locator anti pattern, dependency injection container modules, constructor injection vs setter, ioc container lifetime scoped singleton
```

---

## 1. Definición Teórica

Dependency Injection implements Inversion of Control by injecting dependencies into a class (via constructor, setter, or interface) rather than having the class create them. IoC containers manage dependency resolution, lifetimes, and wiring automatically. Constructor injection is preferred for required dependencies, setter injection for optional ones. The Composition Root is where all dependencies are wired together — it should be the only place where the container is referenced.

---

## 2. Implementación de Referencia

TypeScript with a lightweight DI container implementing registration, resolution, and lifetime management.

### Ejemplo Práctico Avanzado

```typescript
// ===== WITHOUT DI — tight coupling (AVOID) =====
class OrderService {
  private repo = new PostgresOrderRepository();  // hardcoded!
  private email = new SmtpEmailService();         // hardcoded!
  async place(items: OrderItem[]): Promise<Order> {
    const order = await this.repo.save(items);
    await this.email.send('order@shop.com', `Order ${order.id} placed`);
    return order;
  }
}

// ===== WITH DI — decoupled =====
class OrderService {
  constructor(
    private repo: OrderRepository,      // injected abstraction
    private email: EmailService          // injected abstraction
  ) {}

  async place(items: OrderItem[]): Promise<Order> {
    const order = await this.repo.save(items);
    await this.email.send('order@shop.com', `Order ${order.id} placed`);
    return order;
  }
}

// Abstractions
interface OrderRepository { save(items: OrderItem[]): Promise<Order>; }
interface EmailService { send(to: string, message: string): Promise<void>; }

// ===== DI CONTAINER =====
type Lifetime = 'singleton' | 'scoped' | 'transient';

interface Registration<T> {
  implementation: new (...args: any[]) => T;
  lifetime: Lifetime;
  instance?: T;
}

class Container {
  private registrations = new Map<string, Registration<any>>();
  private scopedInstances = new Map<string, any>();

  register<T>(token: string, implementation: new (...args: any[]) => T, lifetime: Lifetime = 'transient'): void {
    this.registrations.set(token, { implementation, lifetime });
  }

  resolve<T>(token: string): T {
    const registration = this.registrations.get(token);
    if (!registration) throw new Error(`No registration for ${token}`);

    // Singleton: return cached instance
    if (registration.lifetime === 'singleton' && registration.instance) {
      return registration.instance as T;
    }

    // Resolve constructor dependencies
    const paramTypes = Reflect.getMetadata('design:paramtypes', registration.implementation) || [];
    const dependencies = paramTypes.map((param: any) => {
      const paramToken = this.getTokenForType(param);
      return this.resolve(paramToken);
    });

    const instance = new registration.implementation(...dependencies) as T;

    // Cache for singleton
    if (registration.lifetime === 'singleton') {
      registration.instance = instance;
    }

    return instance;
  }

  createScope(): Container {
    const scope = new Container();
    scope.registrations = this.registrations;
    return scope;
  }

  private getTokenForType(type: Function): string {
    // Use class name as token
    return type.name;
  }
}

// ===== COMPOSITION ROOT =====
// The only place where container is configured
function createContainer(): Container {
  const container = new Container();

  // Infrastructure
  container.register('PostgresOrderRepository', PostgresOrderRepository, 'singleton');
  container.register('SmtpEmailService', SmtpEmailService, 'singleton');

  // Abstractions → implementations
  container.register('OrderRepository', PostgresOrderRepository, 'singleton');
  container.register('EmailService', SmtpEmailService, 'singleton');

  // Application Services
  container.register('OrderService', OrderService, 'transient');

  return container;
}

// ===== USAGE =====
const container = createContainer();
const orderService = container.resolve<OrderService>('OrderService');
await orderService.place(items);
```

**Fuente oficial:** https://martinfowler.com/articles/injection.html

### Alternativa de Implementación Específica

Python with `dependency-injector` library for declarative DI. Use `inject` decorator for automatic resolution.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas medianos-grandes con múltiples dependencias, testing unitario extensivo, necesidad de intercambiar implementaciones |
| **Cuándo evitar** | Scripts pequeños, prototipos, sistemas con mínimas dependencias, donde la indirección no justifica el beneficio |
| **Alternativas** | Service Locator (más simple pero oculta dependencias), Factory (control explícito de creación), Manual DI (sin container, solo constructor injection) |
| **Coste/Complejidad** | Bajo/medio. Constructor injection es simple. El container añade complejidad pero centraliza wiring. Testing se beneficia enormemente |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Service Locator camuflado como DI

**¿Qué ocasionó el error?**
Se pasaba el container a las clases (Service Locator) en lugar de inyectar dependencias específicas.

**¿Cómo se solucionó?**
```typescript
// 🚫 Service Locator — dependencies hidden
class OrderService {
  async place(items: OrderItem[]): Promise<Order> {
    const repo = container.resolve<OrderRepository>('OrderRepository'); // oculto!
    return repo.save(items);
  }
}

// ✅ Constructor injection — dependencies explicit
class OrderService {
  constructor(private repo: OrderRepository) {}
  async place(items: OrderItem[]): Promise<Order> {
    return this.repo.save(items);
  }
}
```

**¿Por qué funciona esta técnica?**
Constructor injection hace las dependencias explícitas en la firma del constructor. Service Locator las oculta, dificultando testing y comprensión.

### Caso: Scoped dependencies liberadas incorrectamente

**¿Qué ocasionó el error?**
Servicios Scoped (por request) se mantenían en memoria porque el container no los limpiaba.

**¿Cómo se solucionó?**
```typescript
class ScopedContainer {
  private instances = new Map<string, any>();

  resolve<T>(token: string): T {
    if (this.instances.has(token)) return this.instances.get(token) as T;
    const instance = this.parent.resolve<T>(token);
    this.instances.set(token, instance);
    return instance;
  }

  dispose(): void {
    // Liberar recursos de scoped instances
    for (const instance of this.instances.values()) {
      if (typeof instance.dispose === 'function') instance.dispose();
    }
    this.instances.clear();
  }
}

// Usage per HTTP request
app.use(async (req, res, next) => {
  const scope = container.createScope();
  req.container = scope;
  res.on('finish', () => scope.dispose());
  next();
});
```

**¿Por qué funciona esta técnica?**
Dispose explícito del scope libera recursos. Los servicios IDisposable/AsyncDisposable se limpian automáticamente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "dependency injection", "ioc container", "inversion of control", "constructor injection", "composition root"
- **Prioridad de carga:** Alta — patrón fundamental para desacoplamiento
- **Dependencias:** `02-arquitectura-diseno/08-solid-deep-dive`, `02-arquitectura-diseno/03-hexagonal-architecture`

### Tool Integration

```json
{
  "tool_name": "dependency-injection-inversion",
  "description": "Implements DI/IoC: constructor injection, container with lifetimes (singleton/scoped/transient), composition root",
  "triggers": ["dependency injection", "ioc", "inversion of control", "container", "composition root"],
  "context_hint": "Inject when user asks about DI containers or dependency management",
  "output_format": "code examples with container implementation and composition root",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre inyección de dependencias o contenedores IoC, carga el skill dependency-injection-inversion
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Visualizar grafo de dependencias
npx madge --extensions ts --image deps.png src/
# Analizar usos de `new` que deberían ser DI
grep -r "= new " src/ --include="*.ts" | grep -v "Error\|Test\|Mock\|Date\|Map\|Set\|Array"
```

### GUI / Web

- **dotnet-graph**: Visualización de dependencias .NET
- **Spring Boot Actuator**: Endpoint /beans para ver beans gestionados
- **Angular DevTools**: Árbol de proveedores e inyectores

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Find direct `new` | `grep -r "= new " src/` | `Ctrl+Shift+F` "= new " |
| View dependency graph | `npx madge --image deps.png src/` | — |

---

## 7. Cheatsheet Rápido

```typescript
// DI: dependencies via constructor (explicit, testable)
// Container: register('Token', Impl, 'singleton|scoped|transient')
// Composition Root: only place container is configured
// NEVER: container inside classes (Service Locator anti-pattern)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/08-solid-deep-dive` | Dependiente | Sí |
| `02-arquitectura-diseno/03-hexagonal-architecture` | Complementario | Sí |
| `02-arquitectura-diseno/04-clean-architecture-principles` | Complementario | Sí |
| `02-arquitectura-diseno/05-gof-creational-patterns` | Alternativa | No |
| `02-arquitectura-diseno/19-data-mapper-active-record` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: dependency-injection-inversion
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [dependency-injection, ioc, inversion-of-control, constructor-injection, composition-root, container]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

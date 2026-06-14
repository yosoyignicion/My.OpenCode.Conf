---
name: solid-deep-dive
description: "SOLID are five design principles for maintainable object-oriented systems"
---
# SOLID Deep Dive

## Semantic Triggers
```
single responsibility principio, open closed extensión sin modificación, liskov substitution subtipos, interface segregation específicas, dependency inversion abstracciones, solid principios diseño
```

---

## 1. Definición Teórica

SOLID are five design principles for maintainable object-oriented systems. Single Responsibility: a class should have only one reason to change. Open-Closed: classes should be open for extension but closed for modification. Liskov Substitution: subtypes must be substitutable for their base types without altering correctness. Interface Segregation: many client-specific interfaces are better than one general-purpose interface. Dependency Inversion: high-level modules should not depend on low-level modules; both should depend on abstractions.

---

## 2. Implementación de Referencia

TypeScript examples demonstrating each SOLID principle with violations and corrected versions.

### Ejemplo Práctico Avanzado

```typescript
// 🚫 SRP VIOLATION — God class with multiple responsibilities
class UserService {
  async createUser(email: string) { /* DB */ }
  async sendEmail(template: string) { /* email */ }
  generateReport() { /* report */ }
}

// ✅ SRP — one class, one responsibility
class UserCreator { async create(email: string): Promise<User> { /* DB */ } }
class EmailService { async send(template: string, to: string): Promise<void> { /* email */ } }
class ReportGenerator { generate(users: User[]): Report { /* report */ } }

// 🚫 OCP VIOLATION — switch statement for new types
class PaymentProcessor {
  process(type: string, amount: number): void {
    if (type === 'stripe') { /* stripe logic */ }
    else if (type === 'paypal') { /* paypal logic */ }
    // Adding new type requires modifying this class
  }
}

// ✅ OCP — extend via interface implementation
interface PaymentGateway { charge(amount: number): Promise<PaymentResult>; }
class StripeGateway implements PaymentGateway { /* stripe */ }
class PayPalGateway implements PaymentGateway { /* paypal */ }
class PaymentProcessor {
  constructor(private gateway: PaymentGateway) {}
  async process(amount: number): Promise<PaymentResult> {
    return this.gateway.charge(amount);
  }
}

// 🚫 LSP VIOLATION — subclass weakens precondition
class Bird { fly(): void { console.log('flying'); } }
class Penguin extends Bird {
  fly(): void { throw new Error('Cannot fly'); } // breaks LSP
}
// ✅ LSP — restructure instead of inheriting incorrectly
abstract class Bird { abstract move(): void; }
class FlyingBird extends Bird { move(): void { console.log('flying'); } }
class Penguin extends Bird { move(): void { console.log('swimming'); } }

// 🚫 ISP VIOLATION — fat interface
interface Worker { work(): void; eat(): void; sleep(): void; }
class Robot implements Worker {
  eat(): void { throw new Error('Robots do not eat'); }
  sleep(): void { throw new Error('Robots do not sleep'); }
}
// ✅ ISP — segregated interfaces
interface Workable { work(): void; }
interface Eatable { eat(): void; }
interface Sleepable { sleep(): void; }
class HumanWorker implements Workable, Eatable, Sleepable { /* all three */ }
class RobotWorker implements Workable { /* only work */ }

// 🚫 DIP VIOLATION — high-level depends on low-level
class OrderService {
  private repo = new PostgresOrderRepository(); // hardcoded
}
// ✅ DIP — both depend on abstraction
interface OrderRepository { save(order: Order): Promise<void>; }
class PostgresOrderRepository implements OrderRepository { /* impl */ }
class OrderService {
  constructor(private repo: OrderRepository) {} // abstraction
}
```

**Fuente oficial:** https://en.wikipedia.org/wiki/SOLID

### Alternativa de Implementación Específica

Python with ABC for DIP and Protocols for ISP. Use @abstractmethod pour definir contratos.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas OO que requieren mantenibilidad a largo plazo, equipos que crecen, código que evoluciona con nuevos requerimientos |
| **Cuándo evitar** | Scripts pequeños, prototipos desechables, lenguajes no-OO, cuando la abstracción excesiva no justifica el costo |
| **Alternativas** | Composición sobre herencia (menos rígido), TypeScript structural typing (ISP implícito), Functional programming (evita problemas de OO) |
| **Coste/Complejidad** | Bajo/medio. Los principios reducen deuda técnica a largo plazo. Curva de aprendizaje inicial. SRP y OCP son fáciles de aplicar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: LSP violado por null returns

**¿Qué ocasionó el error?**
Una subclase de Repository retornaba null donde la clase base nunca retornaba null.

**¿Cómo se solucionó?**
```typescript
// Base contract — never returns null
interface UserRepository {
  findById(id: string): Promise<User>; // throws if not found
  findOptional(id: string): Promise<User | null>;
}

// Subclass must respect the contract
class RedisUserRepository implements UserRepository {
  async findById(id: string): Promise<User> {
    const user = await this.cache.get(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
  async findOptional(id: string): Promise<User | null> {
    return this.cache.get(id) ?? null;
  }
}
```

**¿Por qué funciona esta técnica?**
La subclase no debilita las precondiciones ni fortalece las postcondiciones de la clase base.

### Caso: ISP con interfaces demasiado granulares

**¿Qué ocasionó el error?**
Demasiadas interfaces pequeñas causaban fragmentación y dificultaban encontrar implementaciones.

**¿Cómo se solucionó?**
```typescript
// Agrupar interfaces relacionadas sin violar ISP
interface UserWriteRepository { save(user: User): Promise<void>; delete(id: string): Promise<void>; }
interface UserReadRepository { findById(id: string): Promise<User | null>; findAll(): Promise<User[]>; }
// En lugar de: UserSaveRepository, UserDeleteRepository, UserFindRepository, UserFindAllRepository
```

**¿Por qué funciona esta técnica?**
ISP busca interfaces específicas para el cliente, no necesariamente una interfaz por método. Agrupar operaciones relacionadas.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "solid", "single responsibility", "open closed", "liskov substitution", "interface segregation", "dependency inversion"
- **Prioridad de carga:** Alta — principios fundacionales para diseño OO
- **Dependencias:** `02-arquitectura-diseno/05-gof-creational-patterns`, `02-arquitectura-diseno/17-dependency-injection-inversion`

### Tool Integration

```json
{
  "tool_name": "solid-deep-dive",
  "description": "Implements SOLID principles: SRP, OCP, LSP, ISP, DIP with examples of violations and corrections",
  "triggers": ["solid", "srp", "ocp", "lsp", "isp", "dip", "single responsibility", "open closed"],
  "context_hint": "Inject when user asks about OO design principles or code quality",
  "output_format": "code examples with before/after for each principle",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre principios SOLID o diseño orientado a objetos, carga el skill solid-deep-dive
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Detect SRP violations (god classes)
grep -l "class .*Service" src/**/*.ts | xargs wc -l | sort -rn | head -5
# Detect DIP violations (new concreto en constructor)
grep -r "= new " src/ --include="*.ts" | grep -v "Test\|Mock"
```

### GUI / Web

- **SonarQube**: Análisis de adherencia a SOLID
- **CodeClimate**: Calidad de código con detección de code smells
- **IntelliJ IDEA**: Inspecciones de diseño OO

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Find god classes | `wc -l src/**/*.ts | sort -rn` | `Ctrl+Shift+A` "Class size" |
| Find `new` violations | `grep -r "= new " src/` | `Ctrl+Shift+F` "new " |

---

## 7. Cheatsheet Rápido

```typescript
// SRP: one class = one responsibility
// OCP: extend via interface, not modify
// LSP: subtype can replace base without breaking
// ISP: many specific interfaces > one fat
// DIP: depend on abstractions, not concretions
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Dependiente | Sí |
| `02-arquitectura-diseno/05-gof-creational-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/03-hexagonal-architecture` | Complementario | Sí |
| `02-arquitectura-diseno/04-clean-architecture-principles` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: solid-deep-dive
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [solid, srp, ocp, lsp, isp, dip, oo-design, principles]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: clean-architecture-principles
description: "Clean Architecture enforces concentric layers: Entities (enterprise-wide business rules), Use Cases (application-specific rules), Interface Adapters (controllers, presenters, gateways), and Framewo..."
---
# Clean Architecture Principles

## Semantic Triggers
```
clean architecture capas dependencias, regla dependencia inward pointing, entities casos uso adaptadores, separación concerns arquitectura limpia, dependency rule outward, boundary crossing interfaces
```

---

## 1. Definición Teórica

Clean Architecture enforces concentric layers: Entities (enterprise-wide business rules), Use Cases (application-specific rules), Interface Adapters (controllers, presenters, gateways), and Frameworks & Drivers (DB, web, UI). The Dependency Rule states that source code dependencies point inward — nothing in an inner circle can know about something in an outer circle. Boundaries are crossed using interfaces: the inner layer defines the interface, the outer layer implements it. This produces systems that are testable, framework-independent, and UI-independent.

---

## 2. Implementación de Referencia

TypeScript with strict layer separation following Uncle Bob's Clean Architecture. Each layer is in its own directory with explicit dependency direction.

### Ejemplo Práctico Avanzado

```typescript
// ===== Layer 1: Entities (Enterprise Business Rules) =====
// No framework imports. Pure domain logic.
class User {
  constructor(
    readonly id: string,
    readonly email: string,
    private role: UserRole = 'user'
  ) {}

  isAdmin(): boolean { return this.role === 'admin'; }
  canAccess(resource: string): boolean {
    if (this.role === 'admin') return true;
    return resource.startsWith('/user/') && resource.endsWith(this.id);
  }
}

class Order {
  constructor(
    readonly id: string,
    readonly items: OrderItem[],
    private status: OrderStatus = 'draft'
  ) {}

  submit(): void {
    if (this.items.length === 0) throw new OrderValidationError('No items');
    this.status = 'submitted';
  }
}

// ===== Layer 2: Use Cases (Application-Specific Rules) =====
// Depends on Entities. Defines ports for outer layers.
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface EmailService {
  sendWelcome(user: User): Promise<void>;
}

class RegisterUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}

  async execute(email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');
    const user = new User(crypto.randomUUID(), email);
    await this.userRepo.save(user);
    await this.emailService.sendWelcome(user);
    return user;
  }
}

// ===== Layer 3: Interface Adapters =====
// Converts between use cases and external formats.
class UserController {
  constructor(private registerUser: RegisterUserUseCase) {}

  async post(request: HttpRequest): Promise<HttpResponse> {
    try {
      const user = await this.registerUser.execute(
        request.body.email,
        request.body.password
      );
      return { status: 201, body: { id: user.id, email: user.email } };
    } catch (err) {
      if (err instanceof ConflictError) {
        return { status: 409, body: { error: err.message } };
      }
      throw err;
    }
  }
}

// ===== Layer 4: Frameworks & Drivers =====
// Express, Postgres, etc. Implements adapters.
class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return row.rows[0] ? new User(row.rows[0].id, row.rows[0].email) : null;
  }
}
```

**Fuente oficial:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

### Alternativa de Implementación Específica

Python with ABC for use case interfaces and FastAPI for the adapter layer. Use dependency_overrides for testing.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas longevos con alta complejidad de negocio, múltiples interfaces (web, API, CLI), equipos grandes con separación de concerns |
| **Cuándo evitar** | Prototipos, CRUD simples, aplicaciones pequeñas donde el overhead de capas no justifica el beneficio |
| **Alternativas** | Hexagonal (similar pero sin capas concéntricas explícitas), MVC (menos capas, framework-coupling), Vertical Slices (organización por funcionalidad) |
| **Coste/Complejidad** | Alta estructura de archivos y directorios. Excelente testabilidad y mantenibilidad a largo plazo. Overhead inicial significativo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Capa de framework filtrándose al dominio

**¿Qué ocasionó el error?**
La entidad User tenía decoradores de TypeORM (Entity, Column, PrimaryGeneratedColumn), acoplando el core al framework.

**¿Cómo se solucionó?**
```typescript
// Antes — entidad contaminada con ORM
@Entity()
class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() email: string;
}

// Después — entidad pura, ORM mapping en adapter
class User { constructor(readonly id: string, readonly email: string) {} }
// En infrastructure/orm: UserEntity con decoradores y mapper a User
```

**¿Por qué funciona esta técnica?**
La entidad debe ser pura. El mapeo ORM se hace en la capa de Frameworks & Drivers, con un mapper que traduce entre UserEntity y User.

### Caso: Use case demasiado específico

**¿Qué ocasionó el error?**
Use case contenía lógica de validación HTTP y formateo de respuesta, violando la separación de capas.

**¿Cómo se solucionó?**
```typescript
// Use case puro — solo lógica de aplicación
class SubmitOrderUseCase {
  async execute(items: OrderItem[]): Promise<Order> { /* business logic */ }
}
// Adapter — HTTP concern
class OrderController {
  async post(req: Request): Promise<Response> {
    const order = await this.submitOrder.execute(req.body.items);
    return res.status(201).json(order.toResponse());
  }
}
```

**¿Por qué funciona esta técnica?**
Los use cases no deben conocer HTTP, JSON serialization, o el formato de respuesta. Los adapters manejan la conversión.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~820 tokens estimados al invocar este skill
- **Trigger de activación:** "clean architecture", "dependency rule", "uncle bob", "concentric layers", "entities use cases"
- **Prioridad de carga:** Alta — marco arquitectónico integral
- **Dependencias:** `02-arquitectura-diseno/08-solid-deep-dive`, `02-arquitectura-diseno/03-hexagonal-architecture`

### Tool Integration

```json
{
  "tool_name": "clean-architecture-principles",
  "description": "Implements Clean Architecture with layer separation: Entities, Use Cases, Interface Adapters, Frameworks",
  "triggers": ["clean architecture", "dependency rule", "uncle bob", "layer separation", "use case"],
  "context_hint": "Inject when user asks about layered architecture or system structuring",
  "output_format": "code examples with strict layer boundary enforcement",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Clean Architecture o estructuración de capas, carga el skill clean-architecture-principles
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Scaffold clean architecture layers
mkdir -p src/{entities,use-cases,adapters,infrastructure}
mkdir -p src/entities/{models,exceptions}
mkdir -p src/use-cases/{ports,interactors,dtos}
mkdir -p src/adapters/{controllers,presenters,gateways}

# Verify dependency rule (no inward violations)
grep -r "from.*adapters" src/entities/ && echo "VIOLATION"
grep -r "from.*infrastructure" src/use-cases/ && echo "VIOLATION"
```

### GUI / Web

- **Clean Architecture Diagram Tool**: Visualización de capas y dependencias
- **NDepend / SonarQube**: Análisis de dependencias entre capas
- **Structure101**: Gestión de arquitectura y boundaries

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Verify layer purity | `grep -r "from.*outer" src/inner/` | — |
| Check use case isolation | `npx madge --circular src/` | — |

---

## 7. Cheatsheet Rápido

```typescript
// Entity: pure domain { id, email }
// Use Case: application rule { execute(): Promise<Entity> }
// Adapter: converts HTTP <-> UseCase { post(req): Response }
// Infrastructure: DB, framework impl
// Dependency Rule: inner never imports outer
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/03-hexagonal-architecture` | Complementario | Sí |
| `02-arquitectura-diseno/08-solid-deep-dive` | Dependiente | Sí |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Complementario | Sí |
| `02-arquitectura-diseno/14-modular-monolithic-design` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: clean-architecture-principles
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [clean-architecture, layered-architecture, dependency-rule, entities, use-cases, boundaries]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

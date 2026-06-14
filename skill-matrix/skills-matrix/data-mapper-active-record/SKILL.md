---
name: data-mapper-active-record
description: "Active Record combines business logic and data access in a single class — each database row maps directly to an object that knows how to save and load itself"
---
# Data Mapper & Active Record

## Semantic Triggers
```
active record pattern modelo datos, data mapper pattern separación modelo persistencia, orm active record vs data mapper, repository pattern data mapper, active record row gateway, transaction script vs active record
```

---

## 1. Definición Teórica

Active Record combines business logic and data access in a single class — each database row maps directly to an object that knows how to save and load itself. Data Mapper separates in-memory objects from persistence, using a separate mapper/repository layer that translates between domain objects and database rows. Active Record is simpler for CRUD-heavy applications with straightforward domain logic. Data Mapper scales better for complex domains with rich behavior and multiple persistence strategies.

---

## 2. Implementación de Referencia

TypeScript comparing both patterns with implementations in Prisma (Active Record-style) and a custom Data Mapper.

### Ejemplo Práctico Avanzado

```typescript
// ===== ACTIVE RECORD PATTERN =====
// Each model combines data + persistence logic
// Prisma is Active Record-inspired (though technically hybrid)

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Active Record style — model handles its own persistence
class UserRecord {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    private _role: UserRole = 'user'
  ) {}

  get role(): UserRole { return this._role; }

  async save(): Promise<void> {
    await prisma.user.upsert({
      where: { id: this.id },
      update: { email: this.email, name: this.name, role: this._role },
      create: { id: this.id, email: this.email, name: this.name, role: this._role },
    });
  }

  async delete(): Promise<void> {
    await prisma.user.delete({ where: { id: this.id } });
  }

  static async findById(id: string): Promise<UserRecord | null> {
    const data = await prisma.user.findUnique({ where: { id } });
    if (!data) return null;
    return new UserRecord(data.id, data.email, data.name, data.role as UserRole);
  }

  static async findByEmail(email: string): Promise<UserRecord | null> {
    const data = await prisma.user.findUnique({ where: { email } });
    if (!data) return null;
    return new UserRecord(data.id, data.email, data.name, data.role as UserRole);
  }

  promote(): void {
    if (this._role === 'admin') throw new Error('Already admin');
    this._role = 'admin';
  }
}

// Usage
const user = new UserRecord('123', 'alice@example.com', 'Alice');
user.promote();
await user.save();  // model saves itself

// ===== DATA MAPPER PATTERN =====
// Domain model is pure — no persistence logic

class User {
  constructor(
    readonly id: string,
    readonly email: string,
    public name: string,
    private _role: UserRole = 'user'
  ) {}

  get role(): UserRole { return this._role; }
  promote(): void { this._role = 'admin'; }
  isAdmin(): boolean { return this._role === 'admin'; }
}

// Separate Mapper — handles persistence
interface UserMapper {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(id: string): Promise<void>;
}

class PostgresUserMapper implements UserMapper {
  async save(user: User): Promise<void> {
    const exists = await this.findById(user.id);
    if (exists) {
      await db.query(
        'UPDATE users SET email = $1, name = $2, role = $3 WHERE id = $4',
        [user.email, user.name, user.role, user.id]
      );
    } else {
      await db.query(
        'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4)',
        [user.id, user.email, user.name, user.role]
      );
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (row.rows.length === 0) return null;
    const r = row.rows[0];
    return new User(r.id, r.email, r.name, r.role);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (row.rows.length === 0) return null;
    const r = row.rows[0];
    return new User(r.id, r.email, r.name, r.role);
  }
}

// Repository wraps mapper with domain-specific queries
class UserRepository {
  constructor(private mapper: UserMapper) {}

  async save(user: User): Promise<void> { return this.mapper.save(user); }
  async findById(id: string): Promise<User | null> { return this.mapper.findById(id); }

  async findActiveUsers(): Promise<User[]> {
    const rows = await db.query('SELECT * FROM users WHERE deleted_at IS NULL');
    return rows.rows.map((r: any) => new User(r.id, r.email, r.name, r.role));
  }
}

// Usage — domain focus, persistence is separate
const user = new User(crypto.randomUUID(), 'bob@example.com', 'Bob');
user.promote();
await userRepo.save(user);  // persistence managed by mapper
```

**Fuente oficial:** https://martinfowler.com/eaaCatalog/activeRecord.html

### Alternativa de Implementación Específica

Python with SQLAlchemy: `declarative_base()` for Active Record style, `SQLAlchemy Core` for Data Mapper. SQLAlchemy 2.0 supports both natively.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar AR** | CRUD simple, prototipos, modelos con poca lógica de negocio, Rails/Django-style development |
| **Cuándo usar DM** | Dominios complejos con rica lógica de negocio, múltiples fuentes de datos, testing extensivo, necesidad de persistencia polimórfica |
| **Alternativas** | Table Gateway (una clase por tabla), Row Data Gateway (una instancia por fila, sin lógica de negocio), Repository + Query Object (más granular) |
| **Coste/Complejidad** | AR: bajo, rápido de desarrollar. DM: medio, más boilerplate pero mejor separación. AR puede llevar a violaciones SRP con lógica creciente |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Active Record con lógica de negocio compleja

**¿Qué ocasionó el error?**
Clase Active Record creció a 2000+ líneas mezclando persistencia, validación, notificaciones y lógica de negocio.

**¿Cómo se solucionó?**
```typescript
// Migrar a Data Mapper cuando AR crece demasiado
// 1. Extraer lógica de negocio a objetos de dominio puros
class OrderDomain {
  // pure business logic, no DB
  constructor(public items: OrderItem[]) {}
  calculateTotal(): Money { /* ... */ }
  applyDiscount(coupon: Coupon): void { /* ... */ }
}

// 2. Mapper maneja persistencia por separado
class OrderMapper {
  async save(order: OrderDomain): Promise<void> { /* DB */ }
}

// 3. Service coordina dominio + persistencia
class OrderService {
  async placeOrder(items: OrderItem[]): Promise<void> {
    const order = new OrderDomain(items);
    order.applyDiscount(coupon);
    await this.mapper.save(order);
    await this.eventBus.publish(new OrderPlaced(order));
  }
}
```

**¿Por qué funciona esta técnica?**
Separar dominio de persistencia (Data Mapper) permite que la lógica de negocio crezca sin acoplamiento a la DB.

### Caso: Active Record difícil de testear

**¿Qué ocasionó el error?**
Tests unitarios requerían DB real porque los modelos Active Record guardaban automáticamente.

**¿Cómo se solucionó?**
```typescript
// Añadir modo "test" al Active Record
class UserRecord {
  private _testMode = false;

  constructor(data: any, testMode = false) {
    Object.assign(this, data);
    this._testMode = testMode;
  }

  async save(): Promise<void> {
    if (this._testMode) return;  // skip DB in tests
    await prisma.user.update({ where: { id: this.id }, data: { name: this.name } });
  }
}

// O mejor: inyectar dependencia de persistencia
class User {
  constructor(private persistence?: PersistenceLayer) {}
  async save(): Promise<void> {
    if (this.persistence) await this.persistence.save(this);
  }
}
```

**¿Por qué funciona esta técnica?**
Hacer la persistencia opcional o inyectable permite testear la lógica de negocio sin DB, manteniendo la comodidad de Active Record.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "active record", "data mapper", "repository pattern", "orm pattern", "persistence pattern"
- **Prioridad de carga:** Alta — decisión arquitectónica al elegir ORM
- **Dependencias:** `02-arquitectura-diseno/01-ddd-tactical-patterns`, `02-arquitectura-diseno/08-solid-deep-dive`

### Tool Integration

```json
{
  "tool_name": "data-mapper-active-record",
  "description": "Compares Active Record and Data Mapper patterns: implementation, trade-offs, migration strategies",
  "triggers": ["active record", "data mapper", "repository", "orm pattern", "persistence"],
  "context_hint": "Inject when user asks about ORM patterns or persistence strategies",
  "output_format": "code examples comparing both patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre patrones de persistencia (Active Record vs Data Mapper), carga el skill data-mapper-active-record
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Analyze AR vs DM in project
grep -c "\.save()\|extends Model" src/**/*.ts  # count AR patterns
grep -c "interface.*Repository\|class.*Mapper" src/**/*.ts  # count DM patterns
```

### GUI / Web

- **Prisma Studio**: GUI para modelos Active Record-style
- **SQLAlchemy Inspector**: Inspección de mapeos
- **Hibernate Tools**: Generación de mapeos Data Mapper

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Count AR models | `grep -c "extends Model" src/` | — |
| Count repositories | `grep -c "Repository" src/` | — |

---

## 7. Cheatsheet Rápido

```typescript
// AR: class User { save() { db.update(...) }; static findById(id) { ... } }
// DM: class User { /* pure domain */ }; class UserMapper { save(user) { ... } }
// AR: simple CRUD, menos archivos, acoplado a DB
// DM: dominio puro, más boilerplate, testable, flexible
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/08-solid-deep-dive` | Dependiente | Sí |
| `02-arquitectura-diseno/03-hexagonal-architecture` | Complementario | Sí |
| `08-ingenieria-herramientas/09-prisma-orm-database` | Herramienta | Sí |
| `02-arquitectura-diseno/04-clean-architecture-principles` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: data-mapper-active-record
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [active-record, data-mapper, repository, persistence, orm, domain-model]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

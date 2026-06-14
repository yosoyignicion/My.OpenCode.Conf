---
name: multi-tenant-data-isolation
description: "Multi-tenancy shares a single application instance among multiple tenants while isolating their data"
---
# Multi-Tenant Data Isolation

## Semantic Triggers
```
multi tenant aislamiento datos, database per tenant isolation, shared database shared schema tenant, multi tenant row level security, tenant context middleware, multi tenant migration strategy
```

---

## 1. Definición Teórica

Multi-tenancy shares a single application instance among multiple tenants while isolating their data. Three primary strategies: Database per Tenant (strongest isolation, each tenant has own DB), Schema per Tenant (shared DB, separate schemas), and Shared Schema with Tenant ID (cheapest, least isolated, row-level). Isolation level determines compliance capability, operational complexity, and cost. Consider tenant tier (enterprise vs SMB), regulatory requirements, and scaling patterns when choosing. Row-Level Security (RLS) in PostgreSQL can enforce tenant isolation at the database level.

---

## 2. Implementación de Referencia

TypeScript with three strategies: shared schema with tenant ID, database per tenant connection resolver, and PostgreSQL Row-Level Security.

### Ejemplo Práctico Avanzado

```typescript
// ===== TENANT CONTEXT =====
interface TenantContext {
  tenantId: string;
  tenantTier: 'enterprise' | 'standard' | 'free';
}

// Middleware to extract tenant context
function tenantMiddleware(headerName = 'x-tenant-id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers[headerName] as string;
    if (!tenantId) return res.status(400).json({ error: `${headerName} header required` });
    req.tenant = { tenantId, tenantTier: 'standard' };
    next();
  };
}

// ===== STRATEGY 1: SHARED SCHEMA WITH TENANT ID =====
// Cheapest, row-level isolation, works for most B2B SaaS

interface TenantAwareQueryBuilder {
  from<T>(table: string): {
    whereTenant(): any;
    // other query methods
  };
}

class TenantAwareRepository<T extends { tenant_id: string }> {
  constructor(
    private db: Database,
    private table: string
  ) {}

  async findById(id: string, tenantId: string): Promise<T | null> {
    return this.db
      .selectFrom(this.table)
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)  // always filter by tenant
      .executeTakeFirst();
  }

  async findAll(tenantId: string, filters?: Partial<T>): Promise<T[]> {
    let query = this.db
      .selectFrom(this.table)
      .where('tenant_id', '=', tenantId);

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.where(key as any, '=', value);
        }
      }
    }
    return query.execute();
  }

  async create(data: Omit<T, 'id' | 'tenant_id'>, tenantId: string): Promise<T> {
    return this.db
      .insertInto(this.table)
      .values({ ...data, tenant_id: tenantId } as any)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}

// ===== STRATEGY 2: DATABASE PER TENANT =====
// Strongest isolation, best for enterprise tenants with compliance needs

class TenantDatabaseResolver {
  private connections = new Map<string, Database>();
  private configs: Record<string, { url: string; maxConnections: number }>;

  constructor(configs: Record<string, { url: string; maxConnections: number }>) {
    this.configs = configs;
  }

  async getConnection(tenantId: string): Promise<Database> {
    let conn = this.connections.get(tenantId);
    if (conn) return conn;

    const config = this.configs[tenantId];
    if (!config) throw new Error(`No database config for tenant ${tenantId}`);

    conn = new Database({ url: config.url, max: config.maxConnections });
    this.connections.set(tenantId, conn);
    return conn;
  }

  async runOnTenantDb<T>(tenantId: string, fn: (db: Database) => Promise<T>): Promise<T> {
    const db = await this.getConnection(tenantId);
    return fn(db);
  }

  async runOnAllTenants<T>(fn: (db: Database, tenantId: string) => Promise<T>): Promise<T[]> {
    const results: T[] = [];
    for (const tenantId of Object.keys(this.configs)) {
      const db = await this.getConnection(tenantId);
      results.push(await fn(db, tenantId));
    }
    return results;
  }
}

// ===== STRATEGY 3: POSTGRESQL ROW-LEVEL SECURITY =====
// Enforce tenant isolation at database level — no way to forget the filter

class RLSDatabase {
  async enableRLS(table: string): Promise<void> {
    await db.execute(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
    `);
  }

  async createTenantPolicy(table: string): Promise<void> {
    await db.execute(`
      CREATE POLICY tenant_isolation ON ${table}
        USING (tenant_id = current_setting('app.tenant_id')::uuid);
    `);
  }

  async runAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.execute(
        `SELECT set_config('app.tenant_id', $1, true)`,
        [tenantId]
      );
      // All queries in this transaction automatically filter by tenant_id
      return fn();
    });
  }
}

// ===== HYBRID STRATEGY =====
// Enterprise tenants get dedicated DB, standard tenants share schema

class HybridTenantStrategy {
  constructor(
    private sharedRepo: TenantAwareRepository<any>,
    private dedicatedResolver: TenantDatabaseResolver,
    private enterpriseTenants: Set<string>
  ) {}

  async findUser(tenantId: string, userId: string): Promise<User | null> {
    if (this.enterpriseTenants.has(tenantId)) {
      return this.dedicatedResolver.runOnTenantDb(tenantId, async (db) => {
        return db.selectFrom('users').where('id', '=', userId).executeTakeFirst();
      });
    }
    return this.sharedRepo.findById(userId, tenantId);
  }
}

// ===== TENANT-AWARE MIGRATIONS =====
class TenantMigrationRunner {
  async runMigrationsForTenant(tenantId: string, migrations: string[]): Promise<void> {
    const db = await tenantDbResolver.getConnection(tenantId);
    for (const migration of migrations) {
      await db.execute(migration);
    }
  }

  async runSharedMigrations(migrations: string[]): Promise<void> {
    // Add tenant_id column if not present
    for (const migration of migrations) {
      await sharedDb.execute(migration);
    }
  }
}
```

**Fuente oficial:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

### Alternativa de Implementación Específica

Python with SQLAlchemy and Flask middleware for tenant context. Use SQLAlchemy's `session.info` for tenant propagation.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | B2B SaaS con múltiples clientes, aplicaciones con datos sensibles por cliente, sistemas con compliance por tenant |
| **Cuándo evitar** | B2C donde todos los usuarios son iguales, prototipos, sistemas pequeños sin diferenciación de tenants |
| **Alternativas** | Shared schema (más simple), DB per tenant (aislamiento máximo), Schema per tenant (balance), PostgreSQL RLS (enforcement automático) |
| **Coste/Complejidad** | Medio/alto. Shared schema: simple pero riesgo de fuga de datos. DB per tenant: operación costosa. RLS: potente pero complejo de configurar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Data leak por olvido de filtro tenant

**¿Qué ocasionó el error?**
Un desarrollador olvidó añadir `WHERE tenant_id = ?` en una query, exponiendo datos de todos los tenants.

**¿Cómo se solucionó?**
```typescript
// PostgreSQL RLS enforcement
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

// Application code — RLS filtra automáticamente
await db.transaction(async (tx) => {
  await tx.execute(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
  // Esta query automáticamente solo ve datos del tenant
  const orders = await tx.selectFrom('orders').selectAll().execute();
});
```

**¿Por qué funciona esta técnica?**
RLS garantiza que todas las queries dentro de la transacción filtren por tenant, incluso si el código olvida el WHERE.

### Caso: DB per tenant — conexiones excesivas

**¿Qué ocasionó el error?**
Cada tenant tenía un pool de conexiones, saturando la base de datos con 1000+ conexiones.

**¿Cómo se solucionó?**
```typescript
// Connection pooling con límite global
class PooledTenantResolver {
  private globalPool = new Database({
    poolSize: 50,  // límite global
    // Usar schemas en lugar de DBs separadas
  });

  getSchemaForTenant(tenantId: string): string {
    return `tenant_${tenantId.replace(/-/g, '_')}`;
  }

  async query<T>(tenantId: string, query: string, params: unknown[]): Promise<T> {
    const schema = this.getSchemaForTenant(tenantId);
    await this.globalPool.execute(`SET search_path TO ${schema}`);
    return this.globalPool.query(query, params);
  }
}
```

**¿Por qué funciona esta técnica?**
Schema per tenant con pool global comparte conexiones mientras aísla datos. Mejor balance entre aislamiento y uso de recursos.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "multi tenant", "data isolation", "database per tenant", "shared schema", "row level security", "tenant aware"
- **Prioridad de carga:** Alta — esencial para SaaS
- **Dependencias:** `02-arquitectura-diseno/28-multi-tenant-data-isolation`, `08-ingenieria-herramientas/08-postgresql-advanced`

### Tool Integration

```json
{
  "tool_name": "multi-tenant-data-isolation",
  "description": "Implements multi-tenancy: shared schema with tenant ID, database per tenant, PostgreSQL RLS, hybrid strategy, tenant-aware migrations",
  "triggers": ["multi tenant", "data isolation", "saas", "tenant isolation", "row level security"],
  "context_hint": "Inject when user asks about multi-tenant architectures or SaaS data isolation",
  "output_format": "code examples with all isolation strategies",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre multi-tenancy o aislamiento de datos por tenant, carga el skill multi-tenant-data-isolation
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# PostgreSQL RLS
psql -c "SELECT * FROM pg_policies WHERE tablename = 'orders';"
psql -c "ALTER TABLE orders ENABLE ROW LEVEL SECURITY;"

# Tenant migration
npm run tenant:migrate -- --tenant-id=tenant-123
npm run tenant:create -- --id=tenant-456 --tier=enterprise
```

### GUI / Web

- **pgAdmin**: Gestión de políticas RLS y schemas
- **Prisma Studio**: Visualización de datos multi-tenant
- **Grafana + postgres_exporter**: Métricas por tenant

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List RLS policies | `psql -c "SELECT * FROM pg_policies"` | pgAdmin → Policies |
| Create tenant | `npm run tenant:create -- --id={id}` | — |

---

## 7. Cheatsheet Rápido

```sql
-- Shared schema: SELECT * FROM orders WHERE tenant_id = $1;
-- RLS: ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- RLS policy: CREATE POLICY tenant_isolation ON orders USING (tenant_id = current_setting('app.tenant_id'));
-- DB per tenant: new Database({ url: configs[tenantId].url })
-- Schema per tenant: SET search_path TO tenant_{id};
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/28-multi-tenant-data-isolation` | — | — |
| `08-ingenieria-herramientas/08-postgresql-advanced` | Herramienta | Sí |
| `06-seguridad-sdlc/13-identity-access-management-rbac-abac` | Complementario | Sí |
| `02-arquitectura-diseno/31-rest-api-design` | Complementario | No |
| `03-sistemas-distribuidos/17-database-sharding-partitioning` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: multi-tenant-data-isolation
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [multi-tenant, data-isolation, saas, row-level-security, database-per-tenant, schema-per-tenant, tenant-aware]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

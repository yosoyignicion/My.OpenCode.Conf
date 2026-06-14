---
name: prisma-orm-database
description: "Prisma ORM resuelve el problema de acceder a bases de datos relacionales desde TypeScript/JavaScript con type-safety total y latencia mínima. Covers PostgreSQL 17, Supabase, Prisma 7, Drizzle ORM, migrations, schema design, SQL, type-safe database, serverless database, connection pooling, pgvector"
---
# prisma-orm-database

## Semantic Triggers
```
Prisma schema model datasource generator, migrations prisma migrate dev deploy, relations one-to-many many-to-many @relation, cursor pagination findMany skip take, interactive transactions $transaction, Prisma extensions $extends middleware soft delete
```

---

## 1. Definición Teórica

Prisma ORM resuelve el problema de acceder a bases de datos relacionales desde TypeScript/JavaScript con type-safety total y latencia mínima. El principio fundamental es *schema-first*: un único archivo `schema.prisma` define modelos, relaciones, índices y generadores, del cual se genera un cliente TypeScript con tipos completos. A diferencia de ORMs tradicionales (TypeORM, Sequelize), Prisma no usa decoradores ni classes de entidad — el schema es la única fuente de verdad. Arquitectónicamente, Prisma consta de tres capas: el schema (DSL declarativo), el migrator (gestión de cambios DB) y el cliente (generado, type-safe, con query engine en Rust). Existe como reemplazo idiomático para el stack TypeScript+PostgreSQL que valora seguridad de tipos sobre flexibilidad de query.

## 2. Implementación de Referencia

La implementación recomendada usa schema-first con `prisma.schema`. Auto-generated TypeScript client. Migraciones: `prisma migrate dev` (dev), `prisma migrate deploy` (CI). Relations con `@relation`. Cursor pagination para performance. Interactive transactions para atomicidad multi-step. Extensions para cross-cutting concerns (soft delete, logging).

### Ejemplo Práctico Avanzado

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String   @map("author_id")
  tags      String[]
  @@index([authorId])
  @@map("posts")
}
```

```typescript
// Cursor pagination
const posts = await prisma.post.findMany({
  take: 20, skip: 1, cursor: { id: cursor },
  orderBy: { createdAt: "desc" },
  where: { published: true, title: { contains: query, mode: "insensitive" } },
  include: { author: { select: { name: true } } },
})

// Interactive transaction
await prisma.$transaction(async (tx) => {
  await tx.user.update({ where: { id }, data: { balance: { increment: -amount } } })
  await tx.log.create({ data: { userId: id, amount } })
})
```

**Fuente oficial:** https://www.prisma.io/docs — https://www.prisma.io/docs/orm/prisma-client

### Alternativa de Implementación Específica

Para proyectos que prefieren SQL explícito sobre query builder, usar `Drizzle ORM` (SQL-like, schema inferido de TypeScript, bundle pequeño). Para proyectos legacy con esquemas existentes, TypeORM con decorators y active record pattern puede ser más natural. Para proyectos que necesitan multi-tenancy complejo con schemas separados, Prisma raw queries con `$queryRaw` permiten control total.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Proyectos TypeScript/React/Next.js con PostgreSQL, equipos que priorizan type-safety, APIs que requieren tipado fuerte desde DB hasta UI, proyectos nuevos sin esquemas legacy |
| **Cuándo evitar** | Tablas con nombres dinámicos (multi-tenancy por schema); queries extremadamente complejas (JSON anidado, window functions, FTS) — usar raw SQL; equipos que prefieren SQL directo sobre abstracciones |
| **Alternativas** | Drizzle ORM: SQL-first, schema inferido de TS, bundle pequeño; TypeORM: decoradores, active record, maduro pero verboso; Kysely: query builder type-safe sin ORM pesado; Prisma + PgTyped: raw SQL con tipos generados |
| **Coste/Complejidad** | Bajo para CRUD simple; medio para relaciones anidadas y cursor pagination; alto para migrations en equipos grandes (merge conflicts en schema.prisma) y queries raw que pierden type-safety |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: N+1 query problem con include anidados

**¿Qué ocasionó el error?**
`prisma.user.findMany({ include: { posts: true } })` genera 1 + N queries (N = usuarios). Prisma no hace JOIN — hace fetch separado por relación.

**¿Cómo se solucionó?**
Usar `include` directamente (Prisma optimiza automáticamente a través del query engine con batching). El query engine de Prisma usa DataLoader internamente para batching. Alternativamente, usar `join` raw SQL para relaciones específicas.

**¿Por qué funciona esta técnica?**
El query engine de Prisma en Rust ejecuta las queries hijas en batch, no en secuencia. Para la mayoría de los casos, `include` es suficientemente eficiente.

### Caso: prisma migrate dev — conflicto en migrations al hacer rebase

**¿Qué ocasionó el error?**
Dos desarrolladores crearon migrations en paralelo con timestamps similares. Al hacer rebase, `prisma migrate dev` detecta un hueco en la secuencia.

**¿Cómo se solucionó?**
```bash
# Resetear migrations locales y regenerar desde schema actual
prisma migrate reset --force
prisma migrate dev --name init
```

**¿Por qué funciona esta técnica?**
`prisma migrate reset` recrea la DB desde cero aplicando todas las migrations. Al regenerar, Prisma crea una única migration que refleja el schema actual.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** Prisma schema, modelo, migración, query con relaciones
- **Prioridad de carga:** Alta — Prisma es el ORM TypeScript dominante en 2026
- **Dependencias:** Cargar junto con `postgresql-advanced` si se necesitan queries raw o índices personalizados

### Tool Integration

```json
{
  "tool_name": "prisma-orm-database",
  "description": "Define modelos Prisma, migraciones, queries type-safe y transacciones para TypeScript",
  "triggers": ["prisma", "orm", "database schema", "migration", "type-safe database", "schema.prisma"],
  "context_hint": "Inyectar schema ejemplo + queries findMany/transaction cuando el usuario necesite acceso a DB",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre acceso a base de datos desde TypeScript, carga el skill prisma-orm-database
y responde siguiendo la sección de implementación de referencia con schema + queries type-safe.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Inicializar Prisma en proyecto existente
npx prisma init

# Schema change → migration + apply
npx prisma migrate dev --name add-user-table

# En CI: aplicar migrations sin generar nuevas
npx prisma migrate deploy

# Regenerar cliente (tras schema change sin migrate)
npx prisma generate

# Abrir Prisma Studio (GUI web local)
npx prisma studio

# Seed data
npx prisma db seed

# Reset DB (borra datos + re-aplica migrations)
npx prisma migrate reset --force

# Ver migrations status
npx prisma migrate status

# Formatear schema.prisma
npx prisma format
```

### GUI / Web

- **Prisma Studio:** `npx prisma studio` — GUI web local para navegar y editar datos con relaciones
- **VSCode:** Prisma extension (syntax highlighting, autocomplete, lint, format-on-save)
- **Prisma Data Platform:** Cloud dashboard, query profiling, connection pooling (accelerate)
- **Prisma Pulse:** CDC (Change Data Capture) — eventos en tiempo real desde PostgreSQL logical replication

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Create migration | `prisma migrate dev` | Ctrl+Shift+P → Prisma: Create Migration |
| Open Studio | `prisma studio` | Ctrl+Shift+P → Prisma: Open Studio |
| Format schema | `prisma format` | Shift+Alt+F (VSCode + extension) |
| Generate client | `prisma generate` | Save file → auto-generate |
| Deploy migrations | `prisma migrate deploy` | CI pipeline step |

---

## 7. Cheatsheet Rápido

```prisma
model User {
  id    String @id @default(uuid()) @db.Uuid
  email String @unique
  posts Post[]
  @@map("users")
}
model Post {
  id       Int  @id @default(autoincrement())
  authorId String @map("author_id")
  author   User @relation(fields: [authorId], references: [id])
  @@index([authorId])
  @@map("posts")
}
```

```typescript
const user = await prisma.user.findUnique({ where: { email }, include: { posts: true } })
await prisma.$transaction(async (tx) => { /* atomic */ })
```

```bash
prisma init && prisma migrate dev --name init && prisma studio
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `postgresql-advanced` | Dependiente — Prisma usa PostgreSQL como datasource primario | Sí |
| `fastapi-rest-development` | Alternativa — FastAPI usa SQLAlchemy + Pydantic (Python vs TS) | No |
| `sqlite-sqlalchemy-persistence` | Alternativa — SQLAlchemy para Python, Prisma para TypeScript | No |
| `dotenv-environment-vars` | Complementario — DATABASE_URL en .env | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: prisma-orm-database
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/prisma
tags: [prisma, orm, typescript, database, postgresql, schema, migration, type-safe]
---
```

---

## Comparativa 2026 / Ecosystem

### Panorama de Capa de Datos Moderna

| Componente | Versión | Bundle | Caso de uso |
|-----------|---------|--------|-------------|
| PostgreSQL | 17 | ~50MB server | Base de datos primaria relacional + vector |
| Supabase | 2025.06 | API calls | BaaS con Realtime + Auth + Storage |
| Prisma | 7.x | ~15MB CLI | Apps full-stack tradicionales |
| Drizzle ORM | 0.40 | ~200KB | Edge/serverless, rendimiento crítico |

### PostgreSQL 17 — Novedades (Lanzado Sep 2024)

- **JSON_TABLE (SQL/JSON constructor):** Convierte JSON a filas relacionales. JOINs directos sobre JSON.
- **MERGE SQL (UPSERT):** `MERGE INTO target USING source ON match WHEN MATCHED THEN UPDATE...` — reemplaza `INSERT ... ON CONFLICT DO UPDATE`.
- **Incremental Backup:** `pg_basebackup --incremental` — WAL summarization detecta páginas modificadas, respaldos de terabytes a MB.
- **pgvector 0.8+:** HNSW index para búsqueda semántica. `USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200)`.
- **LISTEN/NOTIFY con payload binario:** Hasta 8000 bytes (antes solo texto). Ideal para CDC.
- **Performance PG17 vs PG16:** Parallel query 2x, BRIN indexes 10x, B-tree deduplication 20% menos espacio, IN clauses más rápido.

### Supabase (BaaS Open Source)

```
Supabase Stack: PostgreSQL 15/16/17 + GoTrue Auth + Realtime (Go) + Storage S3-compatible + Edge Functions (Deno 2) + pgvector + Dashboard
```

- **Realtime 3 modos:** Broadcast (chat, cursor), Presence (online users), Postgres Changes (CDC con RLS).
- **Row Level Security:** `CREATE POLICY "users_see_own" ON tareas FOR SELECT USING (auth.uid() = usuario_id)`. Realtime respeta RLS.
- **Edge Functions (Deno 2):** `serve(async (req) => { ... })` para lógica serverless con acceso a Supabase via service_role.
- **Storage Vectors + pgvector:** Upload con embeddings auto-generados (`text-embedding-3-small`, chunk_size 512). Search semántico built-in.
- **Supabase.ai:** Embeddings API built-in (modelo `gte-small` 784 dim, optimizado para eficiencia).

### Prisma 7 — `prisma.config.ts` con `defineConfig()`

```typescript
// prisma.config.ts
import { defineConfig } from "prisma/config"
export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  output: { client: "./node_modules/.prisma/client", typegen: "./src/generated/prisma" },
  engine: { type: "library", bundler: "esbuild" }
})
```

- **Prisma Accelerate:** Connection pooling + caching global vía CDN. `cacheStrategy: { ttl: 60, swr: 300 }`.
- **Prisma Pulse (CDC):** Stream cambios vía PostgreSQL logical replication. `prisma.tarea.stream({ create: true, update: true, delete: true })` → eventos `create`/`update`/`delete` con `before`/`after`.
- **Queries con relations:** `prisma.usuario.create({ data: { email, tareas: { create: [...] }, perfil: { create: {...} } }, include: { tareas: true, perfil: true } })`.

### Drizzle ORM 0.40 — SQL-First, Zero-Dep

```typescript
// db/schema.ts
import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const roleEnum = pgEnum("role", ["user", "admin"])
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const tareasRelations = relations(tareas, ({ one }) => ({
  usuario: one(usuarios, { fields: [tareas.usuarioId], references: [usuarios.id] })
}))
```

- **SQL-like queries:** `db.select().from(usuarios).where(eq(usuarios.role, "admin")).orderBy(desc(usuarios.createdAt)).limit(10)`.
- **Relational queries con `with`:** `db.query.usuarios.findFirst({ where: eq(usuarios.id, 1), with: { tareas: { where: eq(tareas.completado, false), limit: 5 } } })`. Tipado automático.
- **LATERAL JOIN optimization:** `db.select().from(usuarios).leftJoin(lateral(db.select().from(tareas).where(eq(tareas.usuarioId, usuarios.id)).limit(3), "ultimas_tareas"))`.
- **Driver-agnostic:** node-postgres, neon (serverless), mysql2, libsql (Turso SQLite). Misma API con diferentes drivers.

### Prisma 7 vs Drizzle 0.40

| Característica | Prisma 7 | Drizzle ORM 0.40 |
|---------------|----------|-----------------|
| Bundle size deploy | ~12MB (engine binario) | ~200KB (zero-dep) |
| Edge/Serverless | Via Accelerate (proxy) | Nativo (sin engine) |
| Schema language | Declarativo (`schema.prisma`) | Código TypeScript |
| Migrations | `prisma migrate` con engine | `drizzle-kit` (SQL) |
| Relational queries | `include`, `select` anidados | `db.query.*` con `with` |
| Raw SQL queries | `$queryRaw` | `db.run(sql\`...\`)` |
| SQL-like API | No (solo object API) | Sí (API dual) |
| CDC / Real-time | Pulse (pago) | No nativo |
| Multi-provider | PG, MySQL, SQLite, Mongo | PG, MySQL, SQLite, Turso, Neon |
| SELECT simple (100 rows) | ~8ms | ~2ms |
| Bundle time cold start | ~300ms | ~15ms |

### Cuándo usar cada uno

- **Prisma 7:** Schema complejo, full-stack tradicional, Prisma Studio (GUI), Prisma Accelerate, schema declarativo separado.
- **Drizzle 0.40:** Edge Functions (Cloudflare Workers, Deno, Vercel Edge), rendimiento crítico, SQL explícito y predecible, bundle mínimo, sin engine binario.
- **Supabase:** Apps que necesitan Auth + Storage + Realtime + RLS out-of-the-box. Ideal para MVPs y equipos pequeños.
- **PostgreSQL 17 vanilla:** Máximo control, JSON_TABLE, MERGE, pgvector, custom partitioning.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with capa-datos-orm)*

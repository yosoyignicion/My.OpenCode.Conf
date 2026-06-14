---
name: postgresql-advanced
description: "PostgreSQL avanzado resuelve problemas de consulta y modelado de datos que van más allá del CRUD básico: concurrencia sin colisiones (upsert), jerarquías y árboles (recursive CTE), agregaciones ana..."
---
# postgresql-advanced

## Semantic Triggers
```
PostgreSQL upsert INSERT ON CONFLICT, recursive CTE tree traversal query, window functions RANK LAG SUM OVER PARTITION, full-text search tsvector GIN index, keyset pagination vs OFFSET, index strategy B-tree partial covering GIN BRIN
```

---

## 1. Definición Teórica

PostgreSQL avanzado resuelve problemas de consulta y modelado de datos que van más allá del CRUD básico: concurrencia sin colisiones (upsert), jerarquías y árboles (recursive CTE), agregaciones analíticas (window functions), búsqueda textual (full-text search) y paginación eficiente (keyset). El principio fundamental es que PostgreSQL ofrece *primitivas de base de datos* que evitan traer datos a la aplicación para procesarlos — la lógica vive cerca de los datos. Arquitectónicamente, estas técnicas permiten que una sola base de datos relacional maneje cargas de trabajo que de otro modo requerirían motores especializados (Elasticsearch para búsqueda, Redis para ranking).

## 2. Implementación de Referencia

La implementación recomendada usa PostgreSQL con patrones avanzados: upsert (`INSERT ON CONFLICT DO UPDATE`), recursive CTEs para árboles, window functions para analytics, full-text search via `tsvector`/`GIN`, keyset pagination (sin OFFSET), y estrategias de indexación (partial, covering, GIN, BRIN).

### Ejemplo Práctico Avanzado

```sql
-- Upsert
INSERT INTO users (email, name) VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
RETURNING *;

-- Recursive CTE
WITH RECURSIVE org_tree AS (
  SELECT id, name, parent_id, 1 AS depth FROM org WHERE parent_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.parent_id, ot.depth + 1
  FROM org e JOIN org_tree ot ON e.parent_id = ot.id
) SELECT * FROM org_tree ORDER BY depth, name;

-- Window functions
SELECT name, dept, salary,
  rank()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rank,
  lag(salary)  OVER (PARTITION BY dept ORDER BY salary)     AS prev_salary,
  sum(salary)  OVER (PARTITION BY dept)                     AS dept_total
FROM employees;

-- Full-text search
ALTER TABLE articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;
CREATE INDEX articles_search_idx ON articles USING GIN(search_vector);
SELECT * FROM articles WHERE search_vector @@ plainto_tsquery('english', $1);

-- Keyset pagination
SELECT * FROM orders WHERE (created_at, id) < ($1, $2)
ORDER BY created_at DESC, id DESC LIMIT 50;

-- Index strategy
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);
CREATE INDEX idx_active_users ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_covering ON orders(user_id) INCLUDE (status, total);
CREATE INDEX idx_tags ON documents USING GIN(tags);
CREATE INDEX idx_logs_ts ON logs USING BRIN(created_at) WITH (pages_per_range = 32);
```

**Fuente oficial:** https://www.postgresql.org/docs/current/queries-with.html — https://www.postgresql.org/docs/current/textsearch.html

### Alternativa de Implementación Específica

Para búsqueda full-text avanzada con ranking BM25, facets y typo-tolerance, usar `pg_search` (Diesel/Rails) o PostgreSQL + `pg_trgm` para trigram similarity. Para consultas geoespaciales, PostGIS es la extensión canónica. Para OLAP pesado (aggregaciones masivas), considerar `ClickHouse` o `TimescaleDB` como especialistas en series temporales.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Datos relacionales con concurrencia, jerarquías, analytics en tiempo real, búsqueda textual moderada (<10M docs), paginación eficiente en tablas grandes |
| **Cuándo evitar** | Búsqueda full-text pesada (>100M docs con typo-tolerance → Elasticsearch); OLAP masivo (ClickHouse); series temporales high-cardinality (TimescaleDB); datos no estructurados (MongoDB) |
| **Alternativas** | Elasticsearch: búsqueda full-text avanzada; ClickHouse: analytics OLAP 100x más rápido; MongoDB: datos no relacionales con schemas flexibles; Supabase: PostgreSQL como servicio con APIs auto-generadas |
| **Coste/Complejidad** | Bajo para upsert y keyset pagination; medio para recursive CTE (riesgo de loops infinitos) y FTS (configuración de diccionarios); alto para tuning de consultas con EXPLAIN ANALYZE |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Consulta con OFFSET se vuelve lenta en tablas grandes

**¿Qué ocasionó el error?**
`OFFSET 10000 LIMIT 50` escanea y descarta 10000 filas. Peor mientras más páginas se avanza.

**¿Cómo se solucionó?**
Migrar a keyset pagination: `SELECT * FROM orders WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 50`. Usar `(created_at, id)` como cursor compuesto.

**¿Por qué funciona esta técnica?**
El índice B-tree en `(created_at, id)` permite seek directo a la posición del cursor, evitando escanear filas descartadas.

### Caso: VACUUM no recupera espacio en tablas grandes

**¿Qué ocasionó el error?**
`VACUUM FULL` requiere lock exclusivo. `autovacuum` no se ejecuta por configuraciones agresivas de `autovacuum_naptime` o `autovacuum_vacuum_scale_factor` muy alto.

**¿Cómo se solucionó?**
- Ajustar `autovacuum_vacuum_scale_factor = 0.01` (1% de tuplas muertas)
- Usar `pg_repack` para reclaim espacio sin downtime
- Monitorear con `SELECT schemaname, relname, n_dead_tup FROM pg_stat_user_tables`

**¿Por qué funciona esta técnica?**
`autovacuum` con scale factor bajo detecta pronto tuplas muertas. `pg_repack` recrea la tabla sin bloqueos usando triggers.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~750 tokens estimados al invocar este skill
- **Trigger de activación:** Consulta PostgreSQL compleja, optimización de query, upsert, CTE recursivo
- **Prioridad de carga:** Alta — PostgreSQL es la base de datos relacional dominante
- **Dependencias:** Cargar junto con `prisma-orm-database` o `sqlite-sqlalchemy-persistence` si se usa ORM

### Tool Integration

```json
{
  "tool_name": "postgresql-advanced",
  "description": "Implementa consultas PostgreSQL avanzadas: upsert, CTE recursivos, window functions, FTS, keyset pagination, indexing",
  "triggers": ["postgresql", "sql", "upsert", "cte", "window function", "full-text search", "pagination", "index"],
  "context_hint": "Inyectar ejemplos SQL (sección 2) cuando el usuario necesite una consulta concreta; FAQ para problemas de rendimiento",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre consultas SQL avanzadas, carga el skill postgresql-advanced y responde
siguiendo la sección de implementación de referencia con ejemplos específicos para el problema.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Conectar y ejecutar consulta
psql -h localhost -U postgres -d mydb -c "SELECT * FROM users LIMIT 5"
psql postgresql://user:pass@localhost:5432/mydb

# Modo interactivo
psql -d mydb
mydb=# \dt                    # list tables
mydb=# \di                    # list indexes
mydb=# \d+ users              # table detail + indexes

# EXPLAIN ANALYZE (crítico para tuning)
EXPLAIN (ANALYZE, BUFFERS, TIMING) SELECT * FROM big_table WHERE condition;

# Vacuum + Analyze
VACUUM (VERBOSE, ANALYZE) my_table;

# Conexión SSL/TLS
psql "sslmode=verify-full sslrootcert=ca.pem host=..."
```

### GUI / Web

- **pgAdmin 4:** Dashboard web con query tool, explain visual, statistics, backup/restore
- **DBeaver:** Cliente universal con editor SQL, ER diagrams, data export
- **VSCode:** PostgreSQL extension (query runner, schema browser, explain plan)
- **TablePlus:** nativo macOS, fast, multi-engine incl PostgreSQL
- **PostgREST:** API REST automática desde el schema PostgreSQL
- **Supabase Studio:** UI web para PostgreSQL con SQL editor, autocomplete, row-level security

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Execute query | `psql -c "..."` | Ctrl+Enter (pgAdmin/DBeaver) |
| Explain plan | `EXPLAIN ANALYZE ...` | Ctrl+Shift+E (pgAdmin) |
| Format SQL | `pg_format query.sql` | Shift+Alt+F (VSCode) |
| List tables | `\dt` | Schema browser tree |
| Toggle auto-commit | `\set AUTOCOMMIT off` | Settings → Transactions |

---

## 7. Cheatsheet Rápido

```sql
-- Upsert
INSERT INTO t (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v;
-- Recursive CTE
WITH RECURSIVE cte AS (SELECT ... UNION ALL SELECT ... FROM cte JOIN ...) SELECT *;
-- Window
SELECT rank() OVER (PARTITION BY g ORDER BY v DESC) FROM t;
-- FTS
ALTER TABLE t ADD COLUMN sv tsvector GENERATED ALWAYS AS (to_tsvector('english', c)) STORED;
CREATE INDEX ON t USING GIN(sv);
SELECT * FROM t WHERE sv @@ plainto_tsquery('english', $1);
-- Keyset
SELECT * FROM t WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC LIMIT 50;
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `prisma-orm-database` | Complementario — acceso tipado a PostgreSQL desde TypeScript | Sí |
| `sqlite-sqlalchemy-persistence` | Alternativa — SQLite para desarrollo/testing local | No |
| `redis-caching-patterns` | Complementario — caché de consultas PostgreSQL pesadas | No |
| `background-jobs-queues` | Complementario — workers que consultan PostgreSQL | No |

---

## 9. Metadatos del Skill

```yaml
---
id: postgresql-advanced
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/postgresql
tags: [postgresql, sql, upsert, cte, window-functions, full-text-search, indexing, pagination]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

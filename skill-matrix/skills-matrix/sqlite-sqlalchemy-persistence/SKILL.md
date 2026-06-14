---
name: sqlite-sqlalchemy-persistence
description: "SQLite + SQLAlchemy resuelve el problema de persistencia local con cero configuración de infraestructura, ideal para aplicaciones desktop, móviles, herramientas CLI y prototipos"
---
# sqlite-sqlalchemy-persistence

## Semantic Triggers
```
SQLite SQLAlchemy 2.0 mapped_column ORM, Repository generic CRUD soft delete, TimestampMixin created_at updated_at, SoftDeleteMixin deleted_at, db_manager engine session init_db, Alembic migrations pending setup
```

---

## 1. Definición Teórica

SQLite + SQLAlchemy resuelve el problema de persistencia local con cero configuración de infraestructura, ideal para aplicaciones desktop, móviles, herramientas CLI y prototipos. El principio fundamental es que SQLite es una base de datos embebida (sin servidor, sin configuración) que almacena todo en un único archivo `.db`, mientras SQLAlchemy proporciona una capa de abstracción ORM que permite cambiar de motor (SQLite → PostgreSQL) sin reescribir queries. Arquitectónicamente, SQLAlchemy 2.0 con `mapped_column()` (estilo declarativo moderno) reemplaza el legacy `Column()` de 1.x. Los mixins reutilizables (`TimestampMixin`, `SoftDeleteMixin`) y el patrón Repository genérico (`Repository[T]`) estandarizan el acceso a datos.

## 2. Implementación de Referencia

La implementación recomendada usa SQLAlchemy 2.0 declarative con `mapped_column()`, `TimestampMixin` (created_at, updated_at), `SoftDeleteMixin` (deleted_at), `Repository[T]` genérico para CRUD con soft delete, y `db_manager.py` para engine/session management con `init_db()` idempotente.

### Ejemplo Práctico Avanzado

```python
from backend.database.db_manager import get_engine, get_session, init_db
from backend.database.queries import Repository
from backend.database.models import User, Project, Canvas, Shape, Export, CommandHistory

# Init (idempotent — create_all skips existing)
init_db()

# CRUD via Repository
session = get_session()
repo = Repository(session, User)
user = repo.create(username="alice", email="a@b.com")
repo.update(user, username="bob")
repo.delete(user, soft=True)                  # sets deleted_at
active_users = [u for u in repo.list() if u.deleted_at is None]
session.close()
```

**Fuente oficial:** https://docs.sqlalchemy.org/en/20/ — https://www.sqlite.org/docs.html

### Alternativa de Implementación Específica

Para proyectos TypeScript/Node.js, usar `better-sqlite3` (síncrono, rápido) con `Drizzle ORM` (type-safe, SQL-like). Para persistencia efímera o prototipos muy simples, usar `sqlite3` nativo (módulo built-in Python) sin ORM. Para aplicaciones que necesitan migraciones y multi-engine, SQLAlchemy + Alembic es la combinación canónica; si solo se usa SQLite, `sqlite-utils` (CLI + Python API) es una alternativa ligera.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones desktop (Qt, Tauri, Electron), herramientas CLI, prototipos, caché local persistente, testing con base de datos temporal (`:memory:`) |
| **Cuándo evitar** | Concurrencia de escritura pesada (>100 writes/s) — SQLite lockea a nivel de archivo; aplicaciones distribuidas con múltiples servidores — PostgreSQL; datasets > 100GB — SQLite escala mal en escritura concurrente |
| **Alternativas** | PostgreSQL: concurrencia superior, red, features avanzados; DuckDB: OLAP embebida, columnar, mejor para analytics; LiteFS: SQLite distribuido con replication tipo Raft; LibSQL: fork de SQLite con más features de concurrencia |
| **Coste/Complejidad** | Bajo: SQLite es zero-config; medio: SQLAlchemy ORM añade abstracción y concepts que requieren aprendizaje; bajo: Repository pattern reduce duplicación de CRUD. Alembic añade complejidad de migraciones si se escala a producción |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: database is locked — SQLite lanza error en escritura concurrente

**¿Qué ocasionó el error?**
Dos sesiones o procesos intentan escribir en SQLite simultáneamente. SQLite lockea el archivo completo durante escritura (WAL mode mejora pero no elimina).

**¿Cómo se solucionó?**
```python
# WAL mode para mejor concurrencia
engine = create_engine("sqlite:///data.db", connect_args={"check_same_thread": False})
with engine.connect() as conn:
    conn.execute(text("PRAGMA journal_mode=WAL"))
    conn.execute(text("PRAGMA busy_timeout=5000"))
```

**¿Por qué funciona esta técnica?**
WAL (Write-Ahead Logging) permite lecturas concurrentes durante escritura. `busy_timeout` hace que SQLite espere hasta 5 segundos antes de lanzar "database is locked".

### Caso: Session is closed al intentar acceder a objeto persistido

**¿Qué ocasionó el error?**
SQLAlchemy session se cerró (session.close()) pero el código intenta acceder a un atributo lazy-loaded del objeto. SQLAlchemy no puede cargar datos relacionados sin session activa.

**¿Cómo se solucionó?**
Usar `session.expire_on_commit = False` o cargar relaciones eager antes de cerrar la session:
```python
user = session.query(User).options(joinedload(User.posts)).first()
session.close()
print(user.posts)  # ya cargado
```

**¿Por qué funciona esta técnica?**
`joinedload` o `selectinload` cargan las relaciones en la misma query (eager loading). Los datos ya están en memoria cuando la session se cierra.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** Persistencia SQLite con SQLAlchemy ORM, Repository pattern, modelo de datos
- **Prioridad de carga:** Alta — persistencia es requisito común en aplicaciones de herramientas y desktop
- **Dependencias:** Cargar junto con `fastapi-rest-development` si se expone via API; junto con `postgresql-advanced` para migración a PostgreSQL

### Tool Integration

```json
{
  "tool_name": "sqlite-sqlalchemy-persistence",
  "description": "Implementa persistencia con SQLite + SQLAlchemy 2.0: modelos, Repository CRUD, mixins y db_manager",
  "triggers": ["sqlite", "sqlalchemy", "orm", "persistence", "database", "repository", "crud"],
  "context_hint": "Inyectar definiciones de modelos + Repository + db_manager cuando el usuario necesite persistencia local",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre persistencia SQLite con ORM, carga el skill sqlite-sqlalchemy-persistence
y responde siguiendo la sección de implementación de referencia con modelos y Repository pattern.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Inicializar DB
python -c "from backend.database.db_manager import init_db; init_db()"

# SQLite CLI — inspeccionar datos
sqlite3 data.db
.tables
.schema users
SELECT * FROM users;
PRAGMA journal_mode;            # verificar WAL mode

# Alembic — setup de migraciones (si se añade)
alembic init migrations
alembic revision --autogenerate -m "add users"
alembic upgrade head

# Backup SQLite
sqlite3 data.db ".backup backup.db"
sqlite3 data.db ".dump" > dump.sql

# Estadísticas de DB
sqlite3 data.db "PRAGMA page_count; PRAGMA page_size;"
sqlite3 data.db "SELECT count(*) FROM users;"
```

### GUI / Web

- **DB Browser for SQLite:** GUI multiplataforma — browse tablas, ejecutar SQL, import/export CSV, editar datos
- **SQLite Viewer (VSCode):** Extensión para visualizar tablas SQLite inline
- **Datasette:** Herramienta web para explorar bases de datos SQLite — API JSON automática
- **Beekeeper Studio:** Cliente SQL moderno con soporte SQLite (también PostgreSQL, MySQL)
- **SQLAlchemy Debug:** `echo=True` en engine muestra todas las queries SQL en consola: `engine = create_engine("sqlite:///data.db", echo=True)`

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Init DB | `python -c "..."` | Script runner |
| Inspeccionar | `sqlite3 data.db` | DB Browser → Browse Data |
| Backup | `sqlite3 data.db ".backup bak.db"` | File → Export |
| Run SQL | `sqlite3 data.db "SELECT * FROM users;"` | Execute SQL tab |
| Debug SQL | `create_engine(..., echo=True)` | SQLAlchemy echo flag |

---

## 7. Cheatsheet Rápido

```python
from sqlalchemy import create_engine, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)

engine = create_engine("sqlite:///data.db", echo=True)
Base.metadata.create_all(engine)

with Session(engine) as session:
    session.add(User(username="alice"))
    session.commit()
```

```bash
python -c "from db_manager import init_db; init_db()" && sqlite3 data.db ".tables"
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `fastapi-rest-development` | Complementario — exponer modelos SQLite via API REST | Sí |
| `postgresql-advanced` | Alternativa — migración de SQLite a PostgreSQL en producción | No |
| `python-packaging-pyproject` | Complementario — SQLAlchemy como dependencia | Sí |
| `async-python-concurrency` | Complementario — async-sqlalchemy para acceso asíncrono | No |

---

## 9. Metadatos del Skill

```yaml
---
id: sqlite-sqlalchemy-persistence
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/database
tags: [sqlite, sqlalchemy, orm, persistence, repository, crud, database, python, alembic]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

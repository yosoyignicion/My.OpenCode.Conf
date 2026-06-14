---
name: engram-memory-system
description: "Sistema de memoria tipada persistente basado en SQLite + FTS5 que almacena conocimiento del agente en 8 tipos (architecture, error_solution, learned_pattern, config, preference, command, conversati..."
---
# engram-memory-system

## Semantic Triggers
```
engram memory, typed memory sqlite, fts5 memory retrieval, memory importance decay, memory persistence, engram entry, memory types, scope isolation
```

---

## 1. Definición Teórica

Sistema de memoria tipada persistente basado en SQLite + FTS5 que almacena conocimiento del agente en 8 tipos (architecture, error_solution, learned_pattern, config, preference, command, conversation, general) con scoring de importancia (0.0-1.0), decay temporal, y aislamiento por scope (global/project). Resuelve el problema de que los agentes no tienen memoria permanente entre sesiones, obligando a repetir información y perdiendo conocimiento aprendido.

---

## 2. Implementación de Referencia

Implementación: SQLite3 + FTS5 (SQLite virtual table). Python 3.12+ nativo, sin dependencias externas. Sistema usado por OCS (Open Center Space) v2.1.

### Ejemplo Práctico Avanzado

```python
import sqlite3, json, hashlib
from datetime import datetime, timedelta
from typing import Optional, Literal

MemoryType = Literal["general", "config", "architecture", "error_solution",
                     "preference", "learned_pattern", "conversation", "command"]

class EngramSystem:
    def __init__(self, db_path: str = "engram.db"):
        self.db = sqlite3.connect(db_path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=NORMAL")
        self._init_schema()

    def _init_schema(self):
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS engram_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('general','config','architecture',
                    'error_solution','preference','learned_pattern','conversation','command')),
                importance REAL DEFAULT 0.7 CHECK(importance >= 0 AND importance <= 1),
                scope TEXT DEFAULT 'project' CHECK(scope IN ('global','project')),
                source TEXT DEFAULT 'manual',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(title, scope)
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS engram_fts USING fts5(
                title, content, content=engram_entries, content_rowid=id, tokenize='porter unicode61'
            );
            CREATE TRIGGER IF NOT EXISTS engram_ai AFTER INSERT ON engram_entries BEGIN
                INSERT INTO engram_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
            END;
            CREATE TRIGGER IF NOT EXISTS engram_ad AFTER DELETE ON engram_entries BEGIN
                INSERT INTO engram_fts(engram_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
            END;
            CREATE TRIGGER IF NOT EXISTS engram_au AFTER UPDATE ON engram_entries BEGIN
                INSERT INTO engram_fts(engram_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
                INSERT INTO engram_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
            END;
        """)
        self.db.commit()

    def save(self, title: str, content: str, type: MemoryType = "general",
             importance: float = 0.7, scope: str = "project") -> int:
        self.db.execute("""
            INSERT INTO engram_entries (title, content, type, importance, scope)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(title, scope) DO UPDATE SET
                content=excluded.content, importance=excluded.importance,
                type=excluded.type, updated_at=CURRENT_TIMESTAMP
        """, (title, content, type, importance, scope))
        self.db.commit()
        return self.db.lastrowid

    def search(self, query: str, types: list[str] = None, limit: int = 10,
               min_importance: float = 0.0) -> list[dict]:
        sql = """
            SELECT e.id, e.title, e.content, e.type, e.importance, e.scope, e.created_at,
                   rank as relevance
            FROM engram_fts f
            JOIN engram_entries e ON f.rowid = e.id
            WHERE engram_fts MATCH ?
        """
        params: list = [query]

        if types:
            placeholders = ",".join("?" for _ in types)
            sql += f" AND e.type IN ({placeholders})"
            params.extend(types)
        if min_importance > 0:
            sql += " AND e.importance >= ?"
            params.append(min_importance)

        sql += " ORDER BY e.importance * rank DESC LIMIT ?"
        params.append(limit)

        return [dict(row) for row in self.db.execute(sql, params).fetchall()]

    def retrieve_context(self, query: str, max_tokens: int = 1500) -> str:
        """Get context for prompt injection with decay scoring"""
        results = self.db.execute("""
            SELECT title, content, type, importance,
                   importance * (1.0 / (1.0 + (julianday('now') - julianday(updated_at)) * 24.0)) as decay_score
            FROM engram_entries
            WHERE engram_fts MATCH ?
            ORDER BY decay_score DESC
            LIMIT 15
        """, (query,)).fetchall()

        context_parts = []
        token_count = 0
        for r in results:
            entry = f"[{r[2]}] {r[0]}: {r[1][:500]}"
            tokens = len(entry.split())
            if token_count + tokens > max_tokens:
                break
            context_parts.append(entry)
            token_count += tokens

        return "\n".join(context_parts)

    def forget(self, id: int = None, title: str = None, scope: str = "project"):
        if id:
            self.db.execute("DELETE FROM engram_entries WHERE id = ?", (id,))
        elif title:
            self.db.execute("DELETE FROM engram_entries WHERE title = ? AND scope = ?", (title, scope))
        self.db.commit()

    def status(self) -> dict:
        counts = self.db.execute("""
            SELECT type, COUNT(*) FROM engram_entries GROUP BY type
        """).fetchall()
        return {
            "total": sum(c[1] for c in counts),
            "by_type": dict(counts),
            "db_size_mb": self.db.execute("SELECT page_count * page_size / 1048576.0 FROM pragma_page_count, pragma_page_size").fetchone()[0],
        }
```

**Fuente oficial:** Sistema Engram de OCS v2.1. Implementación nativa SQLite+FTS5.

### Alternativa de Implementación Específica

Usar PostgreSQL + pgvector para escalar a millones de entradas con búsqueda híbrida (FTS + vector). Engram es óptimo para <100K entradas.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que necesitan memoria persistente entre sesiones, sistemas de conocimiento acumulativo, personalización por usuario. |
| **Cuándo evitar** | Agentes stateless, memoria volátil por sesión (usar contexto del LLM), datasets >1M entradas. |
| **Alternativas** | 1) Engram (SQLite+FTS5, ligero, auto-contenido). 2) Mem0 (gestionado). 3) PostgreSQL + pgvector (escalable). |
| **Coste/Complejidad** | Bajo: SQLite no requiere servidor, FTS5 es nativo. El decay scoring y triggers son simples. La mayor complejidad es elegir qué memorizar. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: FTS5 no encuentra términos con acentos (español)

**¿Qué ocasionó el error?**
FTS5 con tokenizer `porter` no maneja caracteres acentuados, tratando "acción" y "accion" como términos diferentes.

**¿Cómo se solucionó?**
Usar `tokenize='unicode61'` que normaliza caracteres Unicode, y aplicar `iconv -f utf-8 -t utf-8//IGNORE` antes de guardar para eliminar caracteres no imprimibles.

**¿Por qué funciona esta técnica?**
Unicode61 tokenizer normaliza diferencias Unicode como acentos, making "acción" match "accion". El pre-filtro IGNORE elimina caracteres de control que rompen FTS5.

### Caso: La importancia decayente elimina memorias útiles demasiado rápido

**¿Qué ocasionó el error?**
La fórmula de decay `importance * (1 / (1 + hours_since_update))` reduce drásticamente el score en 24h, haciendo que memorias importantes pero no accedidas recientemente desaparezcan del contexto.

**¿Cómo se solucionó?**
Añadir un boost de importancia por accesos recurrentes: cada vez que una memoria es recuperada, su importancia aumenta en +0.05 (max 1.0). Memorias con importancia >0.9 son "persistentes" y no decaen.

**¿Por qué funciona esta técnica?**
El refuerzo por acceso implementa el principio de "use it or lose it": las memorias útiles se refuerzan naturalmente. El pinning de importancia alta preserva conocimiento fundamental.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1400 tokens estimados al invocar este skill
- **Trigger de activación:** "engram" "memoria del agente" "guardar conocimiento" "fts5" "recuperar memoria"
- **Prioridad de carga:** Alta — INFRAESTRUCTURA CRÍTICA del agente
- **Dependencias:** `07-agent-memory-persistence-episodic`, `38-bridge-mcp-engram-sync`, `30-zero-token-optimization`

### Tool Integration

```json
{
  "tool_name": "engram-memory-system",
  "description": "Sistema de memoria tipada con SQLite+FTS5. 8 tipos de memoria, importancia (0-1), decay temporal, scope global/project, búsqueda full-text con ranking. Sistema nativo de OCS.",
  "triggers": ["engram", "memory persistence", "fts5", "typed memory", "save memory", "search memory"],
  "context_hint": "Inyectar secciones 1-2 para implementación completa; sección 5 para integración con el agente.",
  "output_format": "markdown",
  "max_tokens": 1400
}
```

### Prompt Snippet (carga rápida)

```
Cuando necesites guardar o recuperar memoria persistente del agente, carga
engram-memory-system. Usa EngramSystem.save() para almacenar con tipo e importancia,
EngramSystem.search() para FTS5, y EngramSystem.retrieve_context() para inyectar
en el prompt del LLM con decay scoring.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver estado de Engram
python -c "from engram import EngramSystem; print(EngramSystem().status())"

# Buscar memorias
python -c "from engram import EngramSystem; e=EngramSystem(); print(e.search('architecture', limit=5))"

# Guardar memoria
python -c "from engram import EngramSystem; EngramSystem().save('test', 'content', 'general', 0.8)"

# Ver tabla FTS
sqlite3 engram.db "SELECT title, substr(content,1,50), type, importance FROM engram_entries LIMIT 10"
```

### GUI / Web

- **Engram Dashboard**: Interfaz web SQLite Browser para navegar memorias por tipo, importancia, y fecha
- **FTS5 Debug**: Consultas directas SQLite para ver ranking y decay scores
- **Memory Graph**: Visualización de relaciones entre memorias por tipo y acceso

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Guardar memoria | `python -c "EngramSystem().save(...)"` | Engram Dashboard "New entry" |
| Buscar | `python -c "EngramSystem().search('query')"` | Search bar |
| Ver estado | `python -c "EngramSystem().status()"` | Dashboard "Status" |

---

## 7. Cheatsheet Rápido

```python
from engram import EngramSystem
e = EngramSystem("engram.db")
e.save("title", "content", type="architecture", importance=0.9, scope="project")
results = e.search("query", types=["architecture"], limit=5, min_importance=0.5)
ctx = e.retrieve_context("query", max_tokens=1500)
# Tipos: general|config|architecture|error_solution|preference|learned_pattern|conversation|command
# Decay: importance * (1 / (1 + hours_ since_update))
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-agent-memory-persistence-episodic` | Complementario (memoria episódica + engram) | Sí |
| `38-bridge-mcp-engram-sync` | Dependiente (sincroniza procesos a Engram) | Sí |
| `30-zero-token-optimization` | Complementario (Engram search antes de preguntar) | Sí |
| `32-ocs-identity-charter` | Superconjunto (Engram es capa 3 del pipeline) | No |
| `27-mcp-tools-protocol` | Complementario (tools de engram vía MCP) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: engram-memory-system
domain: 05-ia-agentica-datos
version: 2.1.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/engram-memory-system.md
tags: [engram, memory, fts5, sqlite, typed-memory, importance-scoring, decay, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

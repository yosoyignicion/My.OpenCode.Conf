---
name: ai-agent-state-recovery-checkpoints
description: "Mecanismo de persistencia del estado interno de un agente (historial de mensajes, resultados de tools, variables de contexto) en puntos de control (checkpoints) para permitir recuperación ante fallos"
---
# ai-agent-state-recovery-checkpoints

## Semantic Triggers
```
agent checkpoint, state recovery, agent state persistence, fault tolerant agent, checkpoint restore, long running agent, state serialization, idempotency keys
```

---

## 1. Definición Teórica

Mecanismo de persistencia del estado interno de un agente (historial de mensajes, resultados de tools, variables de contexto) en puntos de control (checkpoints) para permitir recuperación ante fallos. Serializa el estado completo o diferencial a SQLite/JSON en cada turno significativo. Resuelve el problema de que los agentes ejecutan tareas largas (minutos-horas) donde un fallo del servidor, timeout de API, o error de red perdería todo el progreso sin checkpointing.

---

## 2. Implementación de Referencia

Implementación: SQLite + JSON. Frameworks: LangGraph checkpointing, OpenAI `vector_store` para persistencia. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
import sqlite3
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import asyncio

class AgentCheckpointer:
    def __init__(self, db_path: str = "agent_state.db", ttl_hours: int = 24):
        self.db = sqlite3.connect(db_path)
        self.ttl = timedelta(hours=ttl_hours)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS checkpoints (
                agent_id TEXT NOT NULL,
                checkpoint_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                parent_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ttl TIMESTAMP,
                metadata TEXT
            )
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS idempotency_keys (
                key TEXT PRIMARY KEY,
                result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_agent ON checkpoints(agent_id, created_at DESC)")

    async def save_checkpoint(self, agent_id: str, state: dict, parent_id: str = None) -> str:
        cid = hashlib.sha256(f"{agent_id}:{datetime.now().isoformat()}".encode()).hexdigest()[:16]
        expiry = datetime.now() + self.ttl
        self.db.execute(
            "INSERT OR REPLACE INTO checkpoints (agent_id, checkpoint_id, state, parent_id, ttl, metadata) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (agent_id, cid, json.dumps(state), parent_id, expiry.isoformat(),
             json.dumps({"saved_at": datetime.now().isoformat(), "state_size": len(json.dumps(state))}))
        )
        self.db.commit()
        return cid

    async def restore(self, agent_id: str, checkpoint_id: str = None) -> Optional[dict]:
        if checkpoint_id:
            row = self.db.execute(
                "SELECT state, parent_id FROM checkpoints WHERE checkpoint_id = ? AND agent_id = ?",
                (checkpoint_id, agent_id)
            ).fetchone()
        else:
            # Latest checkpoint
            row = self.db.execute(
                "SELECT state, parent_id FROM checkpoints WHERE agent_id = ? "
                "AND ttl > datetime('now') ORDER BY created_at DESC LIMIT 1",
                (agent_id,)
            ).fetchone()
        return json.loads(row[0]) if row else None

    async def with_idempotency(self, key: str, func, *args, **kwargs):
        """Ensure a tool call is only executed once"""
        existing = self.db.execute(
            "SELECT result FROM idempotency_keys WHERE key = ?", (key,)
        ).fetchone()
        if existing:
            return json.loads(existing[0])

        result = await func(*args, **kwargs)
        self.db.execute(
            "INSERT OR REPLACE INTO idempotency_keys (key, result) VALUES (?, ?)",
            (key, json.dumps(result))
        )
        self.db.commit()
        return result

    def cleanup_expired(self):
        self.db.execute("DELETE FROM checkpoints WHERE ttl < datetime('now')")
        self.db.execute("DELETE FROM idempotency_keys WHERE created_at < datetime('now', '-24 hours')")
        self.db.commit()

    async def save_diff_checkpoint(self, agent_id: str, prev_state: dict, new_state: dict, parent_id: str):
        """Save only the diff between states for efficiency"""
        diff = {k: v for k, v in new_state.items() if k not in prev_state or prev_state[k] != v}
        diff["_deleted"] = [k for k in prev_state if k not in new_state]
        return await self.save_checkpoint(agent_id, {"_diff": True, "data": diff}, parent_id)
```

**Fuente oficial:** https://langchain-ai.github.io/langgraph/concepts/persistence/

### Alternativa de Implementación Específica

LangGraph tiene checkpointing integrado con soporte para SQLite, Postgres, o S3. Usar `MemorySaver` para desarrollo y `PostgresSaver` para producción.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes con tareas largas (>1 minuto), sistemas críticos donde el fallo no puede perder progreso, tareas multi-paso con side effects. |
| **Cuándo evitar** | Agentes stateless, tareas de un solo turno, prototipos rápidos donde la complejidad no se justifica. |
| **Alternativas** | 1) LangGraph persistence (framework). 2) SQLite manual (simple). 3) Redis (rápido, volátil). |
| **Coste/Complejidad** | Medio: el diseño de qué serializar y la gestión de TTL añade complejidad. Las claves de idempotencia son críticas pero simples. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Al restaurar, el agente ejecuta acciones ya realizadas (duplicación)

**¿Qué ocasionó el error?**
El checkpoint guarda el estado antes de ejecutar la tool, pero no registra que la tool ya se ejecutó. Al restaurar, el agente re-ejecuta la misma tool.

**¿Cómo se solucionó?**
Implementar idempotency keys: cada tool call recibe un ID único. Antes de ejecutar, se verifica si ese ID ya tiene resultado almacenado. Si sí, se devuelve el resultado sin ejecutar.

**¿Por qué funciona esta técnica?**
La clave de idempotencia convierte las tools en operaciones idempotentes: ejecutarlas N veces produce el mismo resultado que ejecutarlas una vez.

### Caso: Los checkpoints ocupan demasiado espacio en disco

**¿Qué ocasionó el error?**
Guardar el estado completo en cada turno (mensajes, resultados de tools, contexto) crea checkpoints de MB cada uno, acumulándose rápidamente.

**¿Cómo se solucionó?**
Implementar checkpoints diferenciales: guardar solo las diferencias entre el estado anterior y el nuevo, y aplicar TTL de 24h con limpieza automática.

**¿Por qué funciona esta técnica?**
Los diffs son típicamente 10-100x más pequeños que el estado completo. TTL evita acumulación infinita. Para restauración, se replayan los diffs desde el checkpoint completo más reciente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "checkpoint" "state recovery" "agente tolerante a fallos" "persistencia de estado"
- **Prioridad de carga:** Alta — infraestructura crítica para agentes de producción
- **Dependencias:** `26-engram-memory-system`, `07-agent-memory-persistence-episodic`

### Tool Integration

```json
{
  "tool_name": "ai-agent-state-recovery-checkpoints",
  "description": "Checkpointing de estado de agente con SQLite, idempotency keys, checkpoints diferenciales, TTL, y restauración. LangGraph persistence como alternativa.",
  "triggers": ["checkpoint", "state recovery", "fault tolerant agent", "agent persistence", "long running agent"],
  "context_hint": "Inyectar sección 2 para AgentCheckpointer; sección 4 para duplicación y espacio en disco.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario necesite persistencia de estado de agente o recuperación ante fallos, carga
ai-agent-state-recovery-checkpoints. Implementa SQLite + diffs + idempotency keys.
Para producción, considera LangGraph con PostgresSaver.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver checkpoints activos
sqlite3 agent_state.db "SELECT agent_id, checkpoint_id, created_at FROM checkpoints WHERE ttl > datetime('now') ORDER BY created_at LIMIT 10"

# Limpiar expirados
python -c "import asyncio; from checkpointer import AgentCheckpointer; asyncio.run(AgentCheckpointer().cleanup_expired())"

# Ver claves de idempotencia
sqlite3 agent_state.db "SELECT key, substr(result,1,50) FROM idempotency_keys LIMIT 10"
```

### GUI / Web

- **SQLite Browser**: Navegación visual de tablas de checkpoints
- **LangGraph Studio**: Visualización de historial de checkpoints con opción de restore
- **LangSmith**: Trazas con puntos de restauración y marcas de checkpoint

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver checkpoints | `sqlite3 db "SELECT * FROM checkpoints LIMIT 5"` | SQLite Browser |
| Restaurar estado | `python -c "asyncio.run(checkpointer.restore('agent1'))"` | LangGraph Studio "Restore" |

---

## 7. Cheatsheet Rápido

```python
# Checkpoints: SQLite, TTL=24h, diffs para ahorrar espacio
# Idempotency: key único por tool call, verificar antes de ejecutar
# Restauración: último checkpoint activo, o especificar ID
# Limpieza: cleanup_expired() periódico
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Complementario (memoria persistente del agente) | Sí |
| `07-agent-memory-persistence-episodic` | Complementario (memoria episódica) | No |
| `01-agentic-multiloop-orchestration` | Complementario (loops largos necesitan checkpoints) | Sí |
| `04-tool-use-function-calling` | Complementario (idempotencia en tool calls) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: ai-agent-state-recovery-checkpoints
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [checkpoint, state-recovery, fault-tolerance, idempotency, sqlite, langgraph-persistence]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

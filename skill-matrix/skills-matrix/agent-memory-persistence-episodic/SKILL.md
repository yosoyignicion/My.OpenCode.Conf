---
name: agent-memory-persistence-episodic
description: "Sistema de memoria episódica para agentes de IA que almacena, recupera y consolida interacciones pasadas usando vectores semánticos para relevancia, timestamps para recencia, y puntuaciones de impo..."
---
# agent-memory-persistence-episodic

## Semantic Triggers
```
episodic memory, agent memory persistence, memory retrieval, conversation memory, long term memory agent, memory consolidation, importance scoring, memory decay, hybrid retrieval memory
```

---

## 1. Definición Teórica

Sistema de memoria episódica para agentes de IA que almacena, recupera y consolida interacciones pasadas usando vectores semánticos para relevancia, timestamps para recencia, y puntuaciones de importancia (0-1) para retención selectiva. Resuelve el problema fundamental de que los LLM son sin estado: sin memoria externa, cada interacción empieza desde cero, perdiendo contexto de sesiones anteriores.

---

## 2. Implementación de Referencia

Implementación: SQLite + embeddings + FTS5. Python 3.12+. Alternativa: LangChain Memory, Mem0, o Engram System.

### Ejemplo Práctico Avanzado

```python
import sqlite3
import numpy as np
from sentence_transformers import SentenceTransformer
from datetime import datetime, timedelta

class EpisodicMemory:
    def __init__(self, db_path: str, model_name: str = "all-MiniLM-L6-v2"):
        self.encoder = SentenceTransformer(model_name)
        self.db = sqlite3.connect(db_path)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS episodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                embedding BLOB,
                importance REAL DEFAULT 0.5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes(importance)")

    async def add(self, content: str, importance: float = 0.5):
        emb = self.encoder.encode(content).astype(np.float32).tobytes()
        self.db.execute(
            "INSERT INTO episodes (content, embedding, importance) VALUES (?, ?, ?)",
            (content, emb, importance)
        )
        self.db.commit()

    async def retrieve(self, query: str, k: int = 5, decay_hours: int = 24):
        q_emb = self.encoder.encode(query).astype(np.float32)
        # Hybrid scoring: relevance (cosine) + recency + importance
        rows = self.db.execute(
            "SELECT id, content, embedding, importance, created_at, last_accessed FROM episodes"
        ).fetchall()

        scores = []
        for row in rows:
            emb = np.frombuffer(row[2], dtype=np.float32)
            cos_sim = np.dot(q_emb, emb) / (np.linalg.norm(q_emb) * np.linalg.norm(emb))
            hours_since = (datetime.now() - datetime.fromisoformat(row[4])).total_seconds() / 3600
            recency = 1.0 / (1.0 + hours_since)
            importance = row[3]
            score = 0.5 * cos_sim + 0.3 * recency + 0.2 * importance
            scores.append((score, row[1], row[3]))

        scores.sort(reverse=True, key=lambda x: x[0])
        return [{"content": s[1], "importance": s[2], "score": s[0]} for s in scores[:k]]

    async def consolidate(self, older_than_hours: int = 48):
        """Summarize old episodes into semantic memory"""
        old = self.db.execute(
            "SELECT content FROM episodes WHERE created_at < datetime('now', ?)",
            (f"-{older_than_hours} hours",)
        ).fetchall()
        if len(old) > 5:
            summary = await llm_summarize([o[0] for o in old])
            self.db.execute("DELETE FROM episodes WHERE created_at < datetime('now', ?)",
                          (f"-{older_than_hours} hours",))
            await self.add(summary, importance=0.8)
```

**Fuente oficial:** https://github.com/ggerganov/llama.cpp/blob/master/examples/memory

### Alternativa de Implementación Específica

Usar Mem0 (https://mem0.ai) como servicio gestionado de memoria episódica con API REST, ideal para no querer gestionar infraestructura.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que interactúan con usuarios humanos y necesitan recordar preferencias, contexto, o historial entre sesiones. |
| **Cuándo evitar** | Agentes stateless (APIs, procesamiento batch); la memoria añade latencia y complejidad. |
| **Alternativas** | 1) Engram System (SQLite+FTS5, ligero). 2) Mem0 (gestionado). 3) LangChain Memory (framework). |
| **Coste/Complejidad** | Medio: requiere gestión de base de datos, embeddings, y decay. La consolidación consume tokens de LLM. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: La memoria recupera información irrelevante que contamina el contexto

**¿Qué ocasionó el error?**
El peso de relevancia semántica (cosine similarity) es demasiado bajo comparado con recencia, recuperando memorias recientes pero no relevantes.

**¿Cómo se solucionó?**
Ajustar pesos híbridos a `0.6 * relevance + 0.2 * recency + 0.2 * importance` y añadir un umbral mínimo de similitud (cosine >0.3).

**¿Por qué funciona esta técnica?**
El umbral filtra ruido. Dar más peso a relevancia semántica alinea la memoria recuperada con la consulta actual.

### Caso: La memoria crece indefinidamente y las consultas se vuelven lentas

**¿Qué ocasionó el error?**
No hay política de consolidación ni límite de tamaño. Millones de episodios ralentizan el escaneo lineal.

**¿Cómo se solucionó?**
Implementar consolidación diaria: episodios >48h se resumen en un único episodio semántico. Además, añadir un límite de 1000 episodios con evicción LRU.

**¿Por qué funciona esta técnica?**
La consolidación comprime información redundante. LRU mantiene el tamaño acotado. El índice por importancia acelera consultas.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "memoria del agente" "recordar conversación" "persistencia episódica"
- **Prioridad de carga:** Alta — infraestructura crítica para agentes conversacionales
- **Dependencias:** `26-engram-memory-system`, `14-embeddings-similarity-metrics`

### Tool Integration

```json
{
  "tool_name": "agent-memory-persistence-episodic",
  "description": "Implementación de memoria episódica con SQLite, embeddings, importancia scoring y consolidación. Híbrido relevancia+recencia+importancia.",
  "triggers": ["episodic memory", "memory persistence", "long term memory", "agent memory"],
  "context_hint": "Inyectar sección 2 para la clase EpisodicMemory; sección 4 para errores de recuperación.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte cómo dar memoria persistente a un agente, carga
agent-memory-persistence-episodic e implementa la clase EpisodicMemory con
SQLite + SentenceTransformer. Si menciona "memoria tipada", refiere a engram-memory-system.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver episodios en DB
sqlite3 memory.db "SELECT id, substr(content,1,50), importance, created_at FROM episodes ORDER BY created_at DESC LIMIT 10"

# Consolidar manualmente
python -c "from memory import EpisodicMemory; import asyncio; asyncio.run(EpisodicMemory('memory.db').consolidate())"
```

### GUI / Web

- **SQLite Browser**: Navegación visual de tablas de episodios
- **LangSmith**: Trazas de retrievals de memoria con scores
- **Mem0 Dashboard**: Interfaz web de memoria gestionada

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver episodios recientes | `sqlite3 db "SELECT * FROM episodes ORDER BY id DESC LIMIT 5"` | SQLite Browser "Browse Data" |
| Consolidar | `python consolidate.py` | N/A |

---

## 7. Cheatsheet Rápido

```python
# Score híbrido: 0.6*relevancia + 0.2*recencia + 0.2*importancia
# Consolidación: episodios >48h → resumen semántico
# Límite: 1000 episodios con evicción LRU
# Importancia: 0.9 (arquitectura), 0.7 (patrón), 0.5 (conversación)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Complementario (sistema de memoria tipada FTS5) | Sí |
| `14-embeddings-similarity-metrics` | Complementario (métricas para retrieval) | Sí |
| `03-context-token-budgeting` | Complementario (gestión de tokens al inyectar memorias) | No |
| `21-ai-agent-state-recovery-checkpoints` | Complementario (checkpoint de estado incluyendo memoria) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: agent-memory-persistence-episodic
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [episodic-memory, memory-persistence, sqlite, embedding, importance-scoring, memory-consolidation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

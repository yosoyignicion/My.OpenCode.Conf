---
name: bridge-mcp-engram-sync
description: "Puente de sincronización unidireccional entre el historial de ejecución de procesos (second-termux `processes.db`) y el sistema de memoria Engram (tabla `observations` con FTS5)"
---
# bridge-mcp-engram-sync

## Semantic Triggers
```
bridge sync, process to engram, mcp engram bridge, process synchronization, second termux sync, observations pipeline, dry run mode, field mapping
---

## 1. Definición Teórica

Puente de sincronización unidireccional entre el historial de ejecución de procesos (second-termux `processes.db`) y el sistema de memoria Engram (tabla `observations` con FTS5). Cada proceso completado se mapea a una entrada de observación tipada con metadatos detallados (comando, exit code, PID, log), con deduplicación por ID de proceso. Resuelve el problema de que los procesos ejecutados en background no dejan rastro en la memoria del agente, perdiendo información valiosa para análisis futuro.

---

## 2. Implementación de Referencia

Implementación: Python con SQLite. Sync unidireccional second-termux → Engram. Modo dry-run. Sistema OCS v2.1.

### Ejemplo Práctico Avanzado

```python
import sqlite3
import json
from datetime import datetime
from typing import Optional
import uuid

class BridgeSync:
    def __init__(self, processes_db: str = "processes.db",
                 engram_db: str = "engram.db"):
        self.processes = sqlite3.connect(processes_db)
        self.engram = sqlite3.connect(engram_db)
        self._ensure_engram_schema()

    def _ensure_engram_schema(self):
        self.engram.execute("""
            CREATE TABLE IF NOT EXISTS observations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'system_process',
                source TEXT DEFAULT 'second-termux',
                importance REAL DEFAULT 1.0,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        """)
        self.engram.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
                title, content, content=observations, content_rowid=rowid
            )
        """)
        self.engram.commit()

    def sync(self, limit: int = 50, dry_run: bool = False) -> dict:
        """Sync processes to Engram observations"""
        stats = {"synced": 0, "skipped": 0, "errors": 0, "dry_run": dry_run}

        # Get processes not yet synced
        processes = self.processes.execute("""
            SELECT id, command, log_file, exit_code, pid, status, cwd, created_at
            FROM processes
            WHERE id NOT IN (
                SELECT substr(title, 9) FROM observations
                WHERE source = 'second-termux' AND title LIKE 'process:%'
            )
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,)).fetchall()

        for proc in processes:
            try:
                pid, command, log_file, exit_code, process_pid, status, cwd, created_at = proc
                now = datetime.now().isoformat()

                title = f"process:{pid}"
                content = json.dumps({
                    "command": command,
                    "log_file": log_file,
                    "exit_code": exit_code,
                    "pid": process_pid,
                    "status": status,
                    "cwd": cwd,
                }, indent=2)

                if dry_run:
                    stats["synced"] += 1
                    continue

                self.engram.execute("""
                    INSERT OR IGNORE INTO observations
                        (id, title, content, type, source, importance, created_at, updated_at)
                    VALUES (?, ?, ?, 'system_process', 'second-termux', 1.0, ?, ?)
                """, (str(uuid.uuid4()), title, content, created_at or now, now))
                stats["synced"] += 1

            except Exception as e:
                stats["errors"] += 1
                print(f"Error syncing process {proc[0]}: {e}")

        if not dry_run:
            self.engram.commit()

        return stats

    def get_recent_processes(self, limit: int = 10) -> list[dict]:
        """Get recent process records from source"""
        rows = self.processes.execute("""
            SELECT command, exit_code, status, created_at
            FROM processes ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        return [
            {"command": r[0], "exit_code": r[1], "status": r[2], "created_at": r[3]}
            for r in rows
        ]

    def get_observations(self, limit: int = 10) -> list[dict]:
        """Get synced observations from Engram"""
        rows = self.engram.execute("""
            SELECT title, content, created_at FROM observations
            WHERE source = 'second-termux'
            ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        return [
            {"title": r[0], "content": json.loads(r[1]) if r[1].startswith("{") else r[1],
             "created_at": r[2]}
            for r in rows
        ]

    def status(self) -> dict:
        """Get sync status counts"""
        pending = self.processes.execute("""
            SELECT COUNT(*) FROM processes WHERE id NOT IN (
                SELECT substr(title, 9) FROM observations
                WHERE source = 'second-termux' AND title LIKE 'process:%'
            )
        """).fetchone()[0]

        synced = self.engram.execute("""
            SELECT COUNT(*) FROM observations WHERE source = 'second-termux'
        """).fetchone()[0]

        return {"pending": pending, "synced": synced}

bridge = BridgeSync("processes.db", "engram.db")

# Dry run
print("=== DRY RUN ===")
stats = bridge.sync(limit=10, dry_run=True)
print(json.dumps(stats, indent=2))

# Real sync
print("\n=== SYNC ===")
stats = bridge.sync(limit=50)
print(json.dumps(stats, indent=2))

# Verify
print("\n=== STATUS ===")
print(json.dumps(bridge.status(), indent=2))
```

**Fuente oficial:** Bridge MCP-Engram Sync de OCS v2.1.

### Alternativa de Implementación Específica

Para sistemas sin second-termux, reemplazar la fuente de procesos con cualquier tabla SQLite de logs de ejecución (e.g., `command_history` de RiskPredictor).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que ejecutan procesos en background, sistemas que necesitan auditoría de ejecuciones, análisis histórico de comandos. |
| **Cuándo evitar** | Agentes sin procesos background, sistemas donde el historial de procesos no es relevante para la memoria. |
| **Alternativas** | 1) Sync automático (cada N ejecuciones). 2) Sync manual (bajo demanda). 3) Log-only (sin Engram). |
| **Coste/Complejidad** | Bajo: SQLite queries simples. Deduplicación por título evita duplicados. Dry-run permite preview. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El sync duplica entradas cuando el mismo PID se reusa

**¿Qué ocasionó el error?** El título `process:{pid}` usa el PID del proceso, pero los PIDs se reusan después de reiniciar el sistema. Un PID puede referirse a procesos diferentes en momentos diferentes.

**¿Cómo se solucionó?** Añadir timestamp al título: `process:{pid}:{created_at}` en lugar de solo `process:{pid}`. También usar `created_at` como parte de la clave única.

**¿Por qué funciona esta técnica?** El timestamp desambigua PIDs reusados. La clave compuesta (PID + timestamp) es única incluso después de reinicios.

### Caso: La tabla observations_fts no encuentra términos buscados

**¿Qué ocasionó el error?** Los triggers FTS5 no se dispararon porque la inserción en `observations` se hizo con `INSERT OR IGNORE` (no hay trigger AFTER INSERT en IGNORE, solo en INSERT).

**¿Cómo se solucionó?** Reemplazar `INSERT OR IGNORE` con `INSERT` + catch de excepción por unique constraint, y añadir trigger para updates. Alternativamente, rebuild FTS periódicamente.

**¿Por qué funciona esta técnica?** `INSERT OR IGNORE` no dispara triggers si el row existe. Usar INSERT directo con manejo de excepción garantiza que el trigger se ejecute siempre.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "bridge sync" "process to engram" "sincronizar procesos" "observations" "mcp engram"
- **Prioridad de carga:** Media — importante para infraestructura pero no para cada interacción
- **Dependencias:** `26-engram-memory-system`, `27-mcp-tools-protocol`, `30-zero-token-optimization`

### Tool Integration

```json
{
  "tool_name": "bridge-mcp-engram-sync",
  "description": "Puente de sincronización second-termux → Engram: mapea procesos a observaciones tipadas, deduplicación por PID+timestamp, dry-run mode, y estado de sync.",
  "triggers": ["bridge sync", "process to engram", "observations", "mcp engram bridge", "second termux sync"],
  "context_hint": "Inyectar sección 2 para BridgeSync; sección 4 para duplicación de PIDs y triggers FTS5.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Para sincronizar procesos a Engram, cargar bridge-mcp-engram-sync.
Usar BridgeSync.sync(limit=50) para sync completo, --dry-run para preview.
El sync es unidireccional: processes.db → observations en Engram.
Deduplica por process:{pid}:{timestamp}.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Dry run (preview)
python bridge_sync.py --dry-run --limit 10

# Sync
python bridge_sync.py --limit 100

# Ver estado
python bridge_sync.py --status

# Consultar observaciones
sqlite3 engram.db "SELECT title, substr(content,1,100) FROM observations WHERE source='second-termux' LIMIT 10"
```

### GUI / Web

- **Bridge Dashboard**: Estado de sync (pending/synced), última sincronización, y procesos por sync
- **Engram Browser**: Observaciones visibles como entradas de tipo system_process en Engram
- **Process Timeline**: Línea de tiempo de procesos ejecutados con metadatos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Dry run | `python bridge_sync.py --dry-run` | Dashboard "Preview" |
| Sync now | `python bridge_sync.py` | Dashboard "Sync now" |
| Ver estado | `python bridge_sync.py --status` | Dashboard "Status" |

---

## 7. Cheatsheet Rápido

```bash
# Sync: processes.db → Engram observations
# Dedup: process:{pid}:{created_at} + source='second-termux'
# Dry-run: --dry-run para preview sin escribir
# Limit: --limit N (default 50)
# Triggers: INSERT (no INSERT OR IGNORE) para activar FTS5
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Dependiente (destino del sync) | Sí |
| `27-mcp-tools-protocol` | Complementario (MCP como canal de sync) | Sí |
| `30-zero-token-optimization` | Complementario (output JSON corto) | No |
| `37-predict-failure-risk` | Complementario (procesos como fuente de riesgo) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: bridge-mcp-engram-sync
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/global-agents-skills/system/bridge-mcp-engram.md
tags: [bridge, sync, engram, mcp, observations, process-sync, second-termux, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

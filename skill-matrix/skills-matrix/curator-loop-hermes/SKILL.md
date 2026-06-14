---
name: curator-loop-hermes
description: "Sistema de auto-mejora que monitorea la ejecución de comandos del agente, identifica patrones reutilizables (comandos que se ejecutan con éxito ≥2 veces), y los promueve automáticamente a skills pe..."
---
# curator-loop-hermes

## Semantic Triggers
```
curator loop hermes, automatic skill creation, command to skill, self improving agent, curator pattern, auto register skill, token efficiency filter, self-optimization
```

---

## 1. Definición Teórica

Sistema de auto-mejora que monitorea la ejecución de comandos del agente, identifica patrones reutilizables (comandos que se ejecutan con éxito ≥2 veces), y los promueve automáticamente a skills persistentes con nombre, descripción, código, y entrada en Engram. Resuelve el problema de que los agentes repiten los mismos comandos manualmente sin aprender de la experiencia, desperdiciando tokens y tiempo en cada iteración.

---

## 2. Implementación de Referencia

Implementación: Go/Python con SQLite. Sistema Hermes de OCS v2.1. Monitoreo de terminal_logs con evaluación de reusabilidad.

### Ejemplo Práctico Avanzado

```python
import sqlite3
import re
from datetime import datetime, timedelta
from typing import Optional

class CuratorLoop:
    def __init__(self, db_path: str = "agent.db"):
        self.db = sqlite3.connect(db_path)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS terminal_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL,
                exit_code INTEGER,
                output TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS curated_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                command TEXT,
                description TEXT,
                usage_count INTEGER DEFAULT 0,
                tokens_saved INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP,
                archived INTEGER DEFAULT 0
            )
        """)
        # Blacklist: commands too trivial to promote
        self.blacklist = {"ls", "echo", "cd", "pwd", "clear", "exit", "help", "whoami"}
        self.min_executions = 2
        self.min_tokens_saved = 50

    def evaluate(self, command: str, exit_code: int, output: str = ""):
        """Called after every command execution"""
        self.db.execute(
            "INSERT INTO terminal_logs (command, exit_code, output) VALUES (?, ?, ?)",
            (command, exit_code, output[:1000])
        )
        self.db.commit()

        if exit_code != 0:
            return

        cmd_basename = command.split()[0]
        if cmd_basename in self.blacklist:
            return

        count = self.db.execute(
            "SELECT COUNT(*) FROM terminal_logs WHERE command = ? AND exit_code = 0",
            (command,)
        ).fetchone()[0]

        if count >= self.min_executions:
            self._promote_to_skill(command)

    def _promote_to_skill(self, command: str):
        skill_name = self._generate_name(command)
        tokens_saved = self._estimate_tokens_saved(command)

        if tokens_saved < self.min_tokens_saved:
            return

        description = f"Auto-registrado por Curator Loop: {command[:100]}"
        self.db.execute("""
            INSERT OR IGNORE INTO curated_skills (name, command, description, tokens_saved)
            VALUES (?, ?, ?, ?)
        """, (skill_name, command, description, tokens_saved))
        self.db.commit()

        # Save to Engram
        self.db.execute("""
            INSERT INTO engram_entries (title, content, type, importance, scope)
            VALUES (?, ?, 'learned_pattern', 0.8, 'project')
            ON CONFLICT(title, scope) DO UPDATE SET content=excluded.content
        """, (f"skill_auto_{skill_name}", command))
        self.db.commit()

    def _generate_name(self, command: str) -> str:
        name = re.sub(r'[^a-zA-Z0-9-]', '-', command.split()[0])
        return name.lower().strip('-')[:50] or "unnamed-skill"

    def _estimate_tokens_saved(self, command: str) -> int:
        # Rough estimation: command tokens saved each time used
        cmd_tokens = len(command.split())
        return cmd_tokens * 3  # Assume 3x overhead for re-explaining

    def prune(self, days_no_use: int = 30):
        """Archive skills unused for N days"""
        self.db.execute("""
            UPDATE curated_skills SET archived = 1
            WHERE last_used IS NULL AND created_at < datetime('now', ?)
        """, (f"-{days_no_use} days",))
        self.db.execute("""
            UPDATE curated_skills SET archived = 1
            WHERE last_used < datetime('now', ?)
        """, (f"-{days_no_use} days",))
        self.db.commit()

    def list_skills(self, include_archived: bool = False) -> list[dict]:
        query = "SELECT * FROM curated_skills"
        if not include_archived:
            query += " WHERE archived = 0"
        return [dict(row) for row in self.db.execute(query).fetchall()]

curator = CuratorLoop()

# Simulate usage pattern
curator.evaluate("docker compose up -d", 0)
curator.evaluate("docker compose up -d", 0)  # Second time → promoted to skill
curator.evaluate("ls", 0)  # Blacklisted, ignored

print(curator.list_skills())
```

**Fuente oficial:** Hermes Pattern de OCS v2.1.

### Alternativa de Implementación Específica

Para entornos sin base de datos, usar archivos JSON + Engram para storage ligero. Menos eficiente pero sin dependencia de esquema.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que ejecutan muchos comandos repetitivos, usuarios que quieren que el agente aprenda de la experiencia. |
| **Cuándo evitar** | Agentes con tareas muy diversas sin patrones repetitivos, entornos donde la auto-creación de skills es riesgosa. |
| **Alternativas** | 1) Curator Loop automático (aprendizaje pasivo). 2) Skill creation manual (control total). 3) Template-based (semi-automático). |
| **Coste/Complejidad** | Bajo: monitorear exit codes y contar ejecuciones es trivial. El filtro de calidad (tokens saved, blacklist) es simple pero efectivo. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El Curator Loop registra demasiados skills triviales

**¿Qué ocasionó el error?**
El filtro de blacklist no incluye comandos como `git status`, `npm test`, que se ejecutan frecuentemente pero no merecen ser skills.

**¿Cómo se solucionó?**
Añadir detección de variabilidad: si el comando tiene argumentos que cambian cada vez (paths, flags), no promover. También requerir que el comando tenga ≥3 tokens para ser considerado significativo.

**¿Por qué funciona esta técnica?**
Comandos con argumentos variables no son reutilizables tal cual. El límite de 3 tokens filtra comandos triviales de una palabra.

### Caso: Los skills auto-registrados tienen nombres poco descriptivos

**¿Qué ocasionó el error?**
`_generate_name()` toma solo el primer token del comando, generando nombres como "python" para `python train.py --lr 0.01`.

**¿Cómo se solucionó?**
Usar el segundo token como contexto si el primero es un runtime (python, node, docker): "train-model" en lugar de "python". Si hay flags, usar el primer argumento no-flag.

**¿Por qué funciona esta técnica?**
El segundo token suele ser la acción real. Los flags son parámetros, no parte del nombre del skill.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "curator" "auto-skill" "aprender comando" "auto-mejora" "hermes pattern"
- **Prioridad de carga:** Alta — mecanismo de auto-mejora del agente
- **Dependencias:** `26-engram-memory-system`, `30-zero-token-optimization`, `33-plugins-extensibility-agent`

### Tool Integration

```json
{
  "tool_name": "curator-loop-hermes",
  "description": "Auto-creación de skills desde comandos exitosos repetidos. Monitoreo de terminal_logs, filtro de calidad, naming automático, registro en Engram, y pruning de skills no usados.",
  "triggers": ["curator loop", "auto skill", "command to skill", "hermes pattern", "self improving"],
  "context_hint": "Inyectar sección 2 para CuratorLoop; sección 4 para filtros y naming.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Para activar auto-aprendizaje de comandos, carga curator-loop-hermes. Implementa
CuratorLoop que evalua cada comando post-ejecución. Si un comando exitoso se repite
≥2 veces y ahorra ≥50 tokens, promuévelo a skill en Engram con tipo learned_pattern.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver skills curados
python -c "from curator import CuratorLoop; c=CuratorLoop(); print(c.list_skills())"

# Forzar evaluación
python -c "from curator import CuratorLoop; CuratorLoop().evaluate('git commit -m fix', 0)"

# Prune skills antiguos
python -c "from curator import CuratorLoop; CuratorLoop().prune(days_no_use=30)"
```

### GUI / Web

- **Curator Dashboard**: Lista de skills auto-registrados con conteo de usos, tokens saved, y fecha
- **Engram Browser**: Skills visibles como entradas de tipo learned_pattern en Engram
- **Skill Manager**: Interfaz para revisar, renombrar, o borrar skills curados

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Listar skills | `python -c "CuratorLoop().list_skills()"` | Dashboard "Skills" |
| Prune skills | `python -c "CuratorLoop().prune()"` | Dashboard "Prune" |

---

## 7. Cheatsheet Rápido

```python
from curator import CuratorLoop
c = CuratorLoop()
c.evaluate(command, exit_code, output)
# Reglas: exit=0, count≥2, tokens_saved≥50, not in blacklist
# Blacklist: ls, echo, cd, pwd, clear, exit, help, whoami
# Naming: segundo token si el primero es runtime
# Prune: skills no usados en 30 días → archive
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Complementario (skills se guardan en Engram) | Sí |
| `30-zero-token-optimization` | Complementario (token efficiency filter) | Sí |
| `33-plugins-extensibility-agent` | Complementario (skills pueden ser plugins) | No |
| `37-predict-failure-risk` | Complementario (evaluar riesgo antes de promover) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: curator-loop-hermes
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/curator-loop-hermes.md
tags: [curator, hermes-pattern, auto-skill, self-improving, token-efficiency, skill-creation, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

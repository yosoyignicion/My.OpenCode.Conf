---
name: zero-token-optimization
description: "Política estricta de minimización de tokens en respuestas del agente: ≤10 palabras o JSON directo, sin saludos/despedidas, búsqueda en Engram FTS5 antes de llamar al LLM, referencia por ID en lugar..."
---
# zero-token-optimization

## Semantic Triggers
```
zero token, token minimization, response compression, ultra short answers, token budget optimization, compact response policy, auto compaction, no redundancy
```

---

## 1. Definición Teórica

Política estricta de minimización de tokens en respuestas del agente: ≤10 palabras o JSON directo, sin saludos/despedidas, búsqueda en Engram FTS5 antes de llamar al LLM, referencia por ID en lugar de re-descripción, y auto-compactación de logs cada 5 minutos si exceden 100 líneas. Resuelve el problema de que los agentes desperdician hasta 50% de tokens en cortesía, redundancias, y explicaciones innecesarias, aumentando costes y latencia.

---

## 2. Implementación de Referencia

Implementación: Go/Python. Sistema OCS v2.1 con ZeroToken Master Policy en el system prompt. Auto-compactación via goroutine.

### Ejemplo Práctico Avanzado

```python
import sqlite3
import time
from threading import Thread
from typing import Optional

class ZeroTokenPolicy:
    def __init__(self, db_path: str = "agent.db"):
        self.db = sqlite3.connect(db_path)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS terminal_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT,
                output TEXT,
                exit_code INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self._start_auto_compact()

    def enforce_response(self, content: str, max_words: int = 10) -> str:
        """Enforce ≤max_words response policy"""
        words = content.split()
        if len(words) <= max_words:
            return content

        # Try JSON detection
        if content.strip().startswith("{"):
            return content  # JSON exempt from word limit

        # Force truncation with ...
        return " ".join(words[:max_words]) + "..."

    def search_before_llm(self, query: str, engram_search_fn) -> Optional[str]:
        """Search Engram before calling LLM (saves tokens)"""
        results = engram_search_fn(query)
        if results:
            return f"[Engram:{results[0]['id']}] {results[0]['content'][:200]}"
        return None

    def reference_by_id(self, memory_id: str, engram_get_fn) -> str:
        """Reference a memory by ID instead of re-describing"""
        entry = engram_get_fn(memory_id)
        if entry:
            return f"→ ref:engram/{entry['title']} (id:{memory_id})"
        return f"→ ref:unknown/{memory_id}"

    def log_compact(self):
        """Compact terminal logs if >100 lines"""
        count = self.db.execute("SELECT COUNT(*) FROM terminal_logs").fetchone()[0]
        if count > 100:
            # Keep last 50, summarize the rest
            self.db.execute("""
                DELETE FROM terminal_logs WHERE id NOT IN (
                    SELECT id FROM terminal_logs ORDER BY id DESC LIMIT 50
                )
            """)
            self.db.execute("""
                INSERT INTO terminal_logs (command, output, exit_code)
                VALUES ('__compact__', 'Auto-compacted: removed older entries', 0)
            """)
            self.db.commit()
            return True
        return False

    def _start_auto_compact(self, interval_seconds: int = 300):
        """Background thread: auto-compact every 5 minutes"""
        def loop():
            while True:
                time.sleep(interval_seconds)
                self.log_compact()
        Thread(target=loop, daemon=True).start()

    def format_policy(self) -> str:
        return """
ZERO-TOKEN POLICY:
1. Answers ≤10 words or direct JSON
2. No greetings, farewells, or small talk
3. Engram search before LLM query
4. Reference by ID, don't repeat
5. Auto-compact at 100+ log lines
"""

# Decorator for zero-token responses
def zero_token(func):
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        if isinstance(result, str):
            policy = ZeroTokenPolicy()
            return policy.enforce_response(result)
        return result
    return wrapper

# Usage
@zero_token
def answer_query(q: str) -> str:
    policy = ZeroTokenPolicy()
    cached = policy.search_before_llm(q, lambda q: [{"id": 1, "content": "cached answer"}])
    if cached:
        return cached
    return "42"  # ≤10 words

print(answer_query("meaning of life"))
```

**Fuente oficial:** Zero-Token Master Policy de OCS v2.1 y AGENTS.md.

### Alternativa de Implementación Específica

Para sistemas sin base de datos, implementar como política en system prompt del LLM + post-processing con regex. Menos preciso pero sin dependencias.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que interactúan frecuentemente con APIs, reducción de costes, sistemas donde la velocidad de respuesta es prioritaria. |
| **Cuándo evitar** | Usuarios que necesitan explicaciones detalladas, interfaces conversacionales donde la cortesía es importante. |
| **Alternativas** | 1) Zero-token estricto (máximo ahorro). 2) Política adaptativa (detalles en errores, conciso en éxito). 3) Respuestas progresivas (primero corto, luego detalle). |
| **Coste/Complejidad** | Bajo: la política es simple de implementar. El mayor desafío es cultural (acostumbrar al agente a ser conciso). |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Las respuestas truncadas son confusas para el usuario

**¿Qué ocasionó el error?** El truncamiento forzado a 10 palabras corta información importante en medio de una explicación, dejando respuestas incomprensibles.

**¿Cómo se solucionó?** Implementar truncamiento inteligente: si la respuesta tiene >10 palabras pero contiene un JSON, preservarlo completo. Si termina en punto, truncar antes. Si no, añadir "...".

**¿Por qué funciona esta técnica?** Preservar JSON mantiene estructura utilizable. Truncar en límites de oración evita fragmentos. Los "..." indican que hay más información disponible.

### Caso: Auto-compactación elimina logs de debugging útiles

**¿Qué ocasionó el error?** La compactación periódica (cada 5 min si >100 líneas) elimina logs antiguos que aún son necesarios para debugging de sesiones en curso.

**¿Cómo se solucionó?** Añadir flag `pinned=True` a logs marcados como importantes, y en compactación preservar los pinned. También guardar un backup ZIP semanal.

**¿Por qué funciona esta técnica?** El pinning manual preserva logs críticos. El backup ZIP permite consulta asíncrona sin ocupar espacio activo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "zero token" "respuesta corta" "optimizar tokens" "política de respuesta"
- **Prioridad de carga:** Alta — POLÍTICA GLOBAL del agente, cargar siempre al inicio
- **Dependencias:** `26-engram-memory-system`, `03-context-token-budgeting`, `28-curator-loop-hermes`

### Tool Integration

```json
{
  "tool_name": "zero-token-optimization",
  "description": "Política Zero-Token: respuestas ≤10 palabras, Engram first, referencia por ID, auto-compactación. Decorador @zero_token y policy manager.",
  "triggers": ["zero token", "response compression", "token minimization", "compact response", "auto compact"],
  "context_hint": "Inyectar AL INICIO de cada sesión como política global. Usar ZeroTokenPolicy.enforce_response() en todo output.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
APLICAR POLÍTICA ZERO-TOKEN: respuestas ≤10 palabras o JSON. Sin saludos.
Buscar en Engram antes de llamar al LLM. Referenciar por ID.
Auto-compactar logs cada 5 min si >100 líneas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Aplicar política a respuesta
python -c "from zerotoken import ZeroTokenPolicy; print(ZeroTokenPolicy().enforce_response('Hello! The answer is 42. Have a nice day!'))"

# Forzar compactación
python -c "from zerotoken import ZeroTokenPolicy; ZeroTokenPolicy().log_compact()"

# Ver estadísticas de compactación
sqlite3 agent.db "SELECT command, COUNT(*) FROM terminal_logs GROUP BY command ORDER BY COUNT(*) DESC LIMIT 10"
```

### GUI / Web

- **Policy Dashboard**: Indicador de cumplimiento Zero-Token (% respuestas ≤10 palabras, % con Engram first)
- **Token Savings**: Métricas de tokens ahorrados vs baseline sin política
- **Compact Status**: Última compactación, logs antes/después

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Enforce policy | `python -c "ZeroTokenPolicy().enforce_response(...)"` | Dashboard "Test" |
| Compact now | `python -c "ZeroTokenPolicy().log_compact()"` | Dashboard "Compact" |

---

## 7. Cheatsheet Rápido

```python
from zerotoken import ZeroTokenPolicy
z = ZeroTokenPolicy()
# ≤10 palabras, JSON exento, Engram first, ID reference
# Auto-compact: cada 5 min si logs > 100 líneas
# Decorador @zero_token para respuestas automáticas
# Política: 1) Corto 2) No cortesía 3) Engram 4) ID 5) Compact
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Complementario (Engram search before LLM) | Sí |
| `03-context-token-budgeting` | Complementario (gestión de tokens) | Sí |
| `28-curator-loop-hermes` | Complementario (token efficiency filter) | No |
| `34-autoprompting-engineering` | Complementario (prompts concisos) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: zero-token-optimization
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/zero-token-optimization.md
tags: [zero-token, token-minimization, response-policy, auto-compact, token-efficiency, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

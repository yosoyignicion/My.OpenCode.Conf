---
name: subagents-parallelism
description: "Patrón de ejecución concurrente donde un orquestador distribuye tareas independientes entre sub-agentes especializados (build, plan, general) que se ejecutan en paralelo mediante goroutines/asyncio..."
---
# subagents-parallelism

## Semantic Triggers
```
subagent delegation, parallel agent execution, goroutine agent, fan out tasks, multi role agent, concurrent agent dispatch, parallel execution, result aggregation
```

---

## 1. Definición Teórica

Patrón de ejecución concurrente donde un orquestador distribuye tareas independientes entre sub-agentes especializados (build, plan, general) que se ejecutan en paralelo mediante goroutines/asyncio, con timeouts configurables y agregación de resultados parciales. Resuelve el problema de que la ejecución secuencial de tareas independientes desperdicia tiempo y recursos; el paralelismo reduce la latencia total al tiempo del sub-agente más lento.

---

## 2. Implementación de Referencia

Implementación: Go goroutines o Python asyncio. Sistema OCS v2.1 con roles build/plan/general. SQLite para inyección de skills por sub-agente.

### Ejemplo Práctico Avanzado

```python
import asyncio
from dataclasses import dataclass, field
from typing import Callable, Any
import time

@dataclass
class SubAgentResult:
    role: str
    output: str
    error: str | None = None
    latency_ms: float = 0
    tokens_used: int = 0

class SubAgent:
    def __init__(self, role: str, system_prompt: str, llm_call: Callable):
        self.role = role
        self.system_prompt = system_prompt
        self.llm = llm_call

    async def run(self, task: str, skills: list[str] = None, timeout: int = 30) -> SubAgentResult:
        start = time.time()
        try:
            prompt = f"{self.system_prompt}\n\nRelevant skills: {skills or []}\n\nTask: {task}"
            result = await asyncio.wait_for(
                self.llm(prompt),
                timeout=timeout
            )
            return SubAgentResult(
                role=self.role,
                output=result,
                latency_ms=(time.time() - start) * 1000,
            )
        except asyncio.TimeoutError:
            return SubAgentResult(
                role=self.role,
                output="",
                error=f"Timeout after {timeout}s",
                latency_ms=(time.time() - start) * 1000,
            )
        except Exception as e:
            return SubAgentResult(
                role=self.role,
                output="",
                error=str(e),
                latency_ms=(time.time() - start) * 1000,
            )

class SubAgentOrchestrator:
    def __init__(self, llm_call: Callable):
        self.agents = {
            "plan": SubAgent("plan", "You are a senior architect. Analyze and plan.",
                            llm_call),
            "build": SubAgent("build", "You are a senior engineer. Implement solutions.",
                             llm_call),
            "general": SubAgent("general", "You are a helpful assistant.", llm_call),
        }

    async def delegate(self, tasks: dict[str, str], timeouts: dict[str, int] = None) -> dict[str, SubAgentResult]:
        """tasks: {role: task_description}"""
        timeouts = timeouts or {}

        async def run_agent(role: str, task: str):
            agent = self.agents.get(role)
            if not agent:
                return SubAgentResult(role=role, output="", error=f"Unknown role: {role}")
            return await agent.run(task, timeout=timeouts.get(role, 30))

        # Fan-out: all tasks run concurrently
        tasks_coro = {role: run_agent(role, task) for role, task in tasks.items()}
        results = await asyncio.gather(*tasks_coro.values())

        return {r.role: r for r in results}

    async def delegate_with_skills(self, tasks: dict[str, str],
                                    skill_db: Callable = None) -> dict[str, SubAgentResult]:
        """Enhanced: inject skills per task via FTS5 search"""
        enriched = {}
        for role, task in tasks.items():
            skills = []
            if skill_db:
                skill_results = skill_db(task, limit=3)
                skills = [s["name"] for s in skill_results]
            enriched[role] = {"task": task, "skills": skills}

        async def run_enriched(role: str, info: dict):
            agent = self.agents.get(role)
            if not agent:
                return SubAgentResult(role=role, output="", error=f"Unknown role: {role}")
            return await agent.run(info["task"], skills=info["skills"])

        results = await asyncio.gather(*[
            run_enriched(role, info) for role, info in enriched.items()
        ])
        return {r.role: r for r in results}

# Usage
orchestrator = SubAgentOrchestrator(lambda p: f"Output for: {p[:50]}...")
results = asyncio.run(orchestrator.delegate({
    "plan": "Analyze project structure",
    "build": "Implement the solution",
    "general": "Summarize instructions",
}))
for role, result in results.items():
    print(f"[{role}] {result.latency_ms:.0f}ms: {result.output[:60]}...")
```

**Fuente oficial:** OCS v2.1 SubAgent system.

### Alternativa de Implementación Específica

En Go, usar goroutines con channels (como en OCS Go orchestrator). Más eficiente en CPU-bound tasks pero más verboso que asyncio.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Tareas independientes que pueden ejecutarse en paralelo (análisis+implementación+documentación). |
| **Cuándo evitar** | Tareas con dependencias secuenciales (output de una es input de otra); el paralelismo no ayuda. |
| **Alternativas** | 1) Fan-out paralelo (independiente). 2) Pipeline secuencial (dependiente). 3) Híbrido (paralelo dentro de etapa). |
| **Coste/Complejidad** | Medio: el manejo de timeouts, errores parciales, y agregación de resultados añade complejidad. La inyección de skills por agente requiere búsqueda FTS5. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Un sub-agente lento retrasa todo el resultado

**¿Qué ocasionó el error?** Aunque los sub-agentes se ejecutan en paralelo, el orquestador espera a que todos terminen antes de devolver resultados. Un agente lento (e.g., "general" con tarea compleja) retrasa la respuesta completa.

**¿Cómo se solucionó?** Implementar devolución parcial: usar `asyncio.as_completed` para procesar resultados a medida que llegan, y un timeout global que devuelva resultados parciales si algún agente excede el límite.

**¿Por qué funciona esta técnica?** `as_completed` permite consumir resultados tempranos inmediatamente. Timeout parcial evita bloqueos.

### Caso: Los sub-agentes reciben skills incorrectos para su tarea

**¿Qué ocasionó el error?** La búsqueda FTS5 para inyección de skills usa el texto de la tarea como query, pero términos genéricos ("implement the code") devuelven skills irrelevantes.

**¿Cómo se solucionó?** Extraer dominios del task antes de buscar skills: usar un clasificador rápido (regex + keywords) para identificar dominio (python, docker, database) y filtrar skills por tipo.

**¿Por qué funciona esta técnica?** El clasificador de dominio reduce el espacio de búsqueda de skills, mejorando la relevancia de los resultados FTS5.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "sub-agentes" "paralelismo" "fan-out" "ejecución concurrente" "delegar tareas"
- **Prioridad de carga:** Alta — mejora significativa de eficiencia
- **Dependencias:** `01-agentic-multiloop-orchestration`, `13-multi-agent-collaboration-protocols`, `26-engram-memory-system`

### Tool Integration

```json
{
  "tool_name": "subagents-parallelism",
  "description": "Ejecución paralela de sub-agentes especializados (build/plan/general). Fan-out con asyncio/gouroutines, timeouts configurables, inyección de skills por rol, y agregación de resultados parciales.",
  "triggers": ["subagent", "parallel execution", "fan out", "concurrent", "delegate tasks", "goroutine agent"],
  "context_hint": "Inyectar sección 2 para SubAgentOrchestrator; sección 4 para resultados parciales y skills incorrectos.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Para ejecutar tareas en paralelo con sub-agentes, carga subagents-parallelism.
Usa SubAgentOrchestrator con roles plan/build/general. Tasks independientes
se ejecutan concurrentemente. Usa as_completed para resultados parciales.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ejecutar sub-agentes
python -c "
import asyncio; from subagents import SubAgentOrchestrator
o = SubAgentOrchestrator(lambda p: 'ok')
r = asyncio.run(o.delegate({'plan':'analyze','build':'code'}))
for role, res in r.items(): print(f'{role}: {res.latency_ms:.0f}ms')
"

# Ver timeouts por rol
python -c "asyncio.run(o.delegate({'build':'slow task'}, timeouts={'build':5}))"
```

### GUI / Web

- **Orchestrator Dashboard**: Visualización de sub-agentes en ejecución con barras de progreso y latencia
- **OCS Sandbox Logs**: Trazas de sub-agentes con timestamps de inicio/fin por rol
- **LangSmith**: Tracing de llamadas paralelas con spans independientes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Delegar tareas | `python -c "..."` | Dashboard "Run" |
| Ver tiempos | N/A | Dashboard "Latency chart" |

---

## 7. Cheatsheet Rápido

```python
# Roles: plan (análisis), build (implementación), general (asistencia)
# Tasks independientes → paralelo (asyncio.gather)
# Tasks dependientes → pipeline secuencial
# Timeout: configurable por rol, default 30s
# Resultados parciales: as_completed para consumir temprano
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `01-agentic-multiloop-orchestration` | Complementario (orquestación de loops) | Sí |
| `13-multi-agent-collaboration-protocols` | Complementario (colaboración entre sub-agentes) | Sí |
| `26-engram-memory-system` | Complementario (inyección de skills FTS5) | Sí |
| `04-tool-use-function-calling` | Complementario (sub-agentes usan tools) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: subagents-parallelism
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/subagents-parallelism.md
tags: [subagents, parallelism, fan-out, concurrency, goroutines, asyncio, multi-role, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

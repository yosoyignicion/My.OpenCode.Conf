---
name: agent-benchmarking-evaluation
description: "Proceso sistemático de medir el rendimiento de agentes de IA mediante métricas cuantitativas (tasa de éxito, eficiencia de tokens, latencia) y cualitativas (auto-evaluación, revisión humana), usand..."
---
# agent-benchmarking-evaluation

## Semantic Triggers
```
agent benchmark, llm evaluation, agent evaluation, benchmark dataset, task oriented evaluation, agent performance metric, success rate, token efficiency, hallucination rate
```

---

## 1. Definición Teórica

Proceso sistemático de medir el rendimiento de agentes de IA mediante métricas cuantitativas (tasa de éxito, eficiencia de tokens, latencia) y cualitativas (auto-evaluación, revisión humana), usando benchmarks estandarizados como AgentBench, GAIA, SWE-bench, y ToolBench. Resuelve el problema de que los agentes son sistemas complejos cuyo rendimiento no puede evaluarse con métricas simples de LLM (perplejidad, accuracy); necesitan evaluación orientada a tareas.

---

## 2. Implementación de Referencia

Benchmarks: AgentBench (web agents), GAIA (general assistants), SWE-bench (software engineering), ToolBench (tool use). Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from pydantic import BaseModel, Field
from typing import Callable, Any
import json, time, asyncio

class EvalResult(BaseModel):
    task_id: str
    success: bool
    tokens_used: int
    latency_ms: float
    self_score: float = Field(ge=0, le=5)
    error: str | None = None

class AgentBenchmark:
    def __init__(self, agent: Any):
        self.agent = agent
        self.results: list[EvalResult] = []

    async def run_task(self, task: dict) -> EvalResult:
        start = time.time()
        try:
            response = await self.agent.run(task["prompt"])
            latency = (time.time() - start) * 1000
            tokens = response.get("usage", {}).get("total_tokens", 0)

            # Auto-evaluation
            self_score = await self._self_evaluate(response["content"])

            # Assert-based success
            success = task["assert_fn"](response["content"]) if "assert_fn" in task else True

            return EvalResult(
                task_id=task["id"],
                success=success,
                tokens_used=tokens,
                latency_ms=latency,
                self_score=self_score,
            )
        except Exception as e:
            return EvalResult(task_id=task["id"], success=False, tokens_used=0,
                            latency_ms=(time.time() - start) * 1000, self_score=0, error=str(e))

    async def _self_evaluate(self, output: str, max_score: int = 5) -> float:
        resp = await self.agent.llm.chat(
            messages=[{"role": "user", "content":
                f"Rate this output 1-{max_score} based on quality, completeness, and correctness:\n{output}"}]
        )
        try:
            return min(float(resp.content.strip()), max_score)
        except ValueError:
            return 3.0  # Default

    async def evaluate(self, benchmark: list[dict], parallel: bool = True) -> dict:
        tasks = [self.run_task(task) for task in benchmark]
        if parallel:
            self.results = await asyncio.gather(*tasks)
        else:
            self.results = [await t for t in tasks]

        total = len(self.results)
        success_rate = sum(1 for r in self.results if r.success) / total
        avg_tokens = sum(r.tokens_used for r in self.results) / total
        avg_latency = sum(r.latency_ms for r in self.results) / total
        avg_self_score = sum(r.self_score for r in self.results) / total

        return {
            "success_rate": success_rate,
            "avg_tokens_per_task": avg_tokens,
            "avg_latency_ms": avg_latency,
            "avg_self_score": avg_self_score,
            "total_tasks": total,
            "failed_tasks": [r.task_id for r in self.results if not r.success],
        }
```

**Fuente oficial:** https://github.com/THUDM/AgentBench

### Alternativa de Implementación Específica

Usar `langchain.evaluation` con `QAEvalChain` para evaluación automatizada de calidad de respuesta sin necesidad de asserts manuales.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Antes de desplegar un agente, después de cambios significativos, para comparar configuraciones (A/B testing). |
| **Cuándo evitar** | Durante desarrollo iterativo rápido; la evaluación es lenta y costosa. |
| **Alternativas** | 1) Auto-evaluación por LLM (barata, menos precisa). 2) Asserts programáticos (precisa, requiere diseño). 3) Evaluación humana (cara, gold standard). |
| **Coste/Complejidad** | Medio-Alto: ejecutar benchmarks consume tokens. Diseñar buenos asserts y datasets de evaluación es laborioso. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Auto-evaluación por LLM es demasiado optimista

**¿Qué ocasionó el error?**
El LLM tiende a puntuar su propio output más alto de lo que merece (sesgo de autoevaluación), dando falsa sensación de calidad.

**¿Cómo se solucionó?**
Usar un modelo diferente para la evaluación (gpt-4o-mini evalúa a gpt-4o), y pedir justificación por cada punto perdido: "Explain why this is not a 5."

**¿Por qué funciona esta técnica?**
Modelos diferentes tienen sesgos diferentes. Exigir justificación fuerza al evaluador a ser más crítico y específico.

### Caso: El benchmark no refleja el rendimiento en producción

**¿Qué ocasionó el error?**
Los benchmarks son demasiado específicos (AgentBench mide navegación web) o demasiado genéricos, no representando el dominio real del agente.

**¿Cómo se solucionó?**
Crear un benchmark custom con 20-50 tareas extraídas de logs de producción real, usando las primeras 5 interacciones de cada sesión como casos de prueba.

**¿Por qué funciona esta técnica?**
Tareas reales de producción capturan la distribución real de complejidad, dominios, y edge cases que el agente enfrentará.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "evaluar agente" "benchmark" "métricas de rendimiento" "test de agente"
- **Prioridad de carga:** Media — importante para releases pero no para desarrollo diario
- **Dependencias:** `01-agentic-multiloop-orchestration`, `17-agent-benchmarking-evaluation` (recursivo)

### Tool Integration

```json
{
  "tool_name": "agent-benchmarking-evaluation",
  "description": "Evaluación sistemática de agentes: benchmarks estandarizados, auto-evaluación, asserts programáticos, y creación de benchmarks custom desde logs de producción.",
  "triggers": ["agent benchmark", "evaluation", "success rate", "performance metric", "test agent"],
  "context_hint": "Inyectar sección 2 para AgentBenchmark class; sección 4 para sesgo de autoevaluación y benchmarks custom.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera evaluar el rendimiento de un agente, carga
agent-benchmarking-evaluation. Implementa AgentBenchmark con auto-evaluación
usando modelo separado y asserts programáticos. Para producción, crea benchmark
custom desde logs reales.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ejecutar benchmark
python evaluate_agent.py --benchmark ./tasks.json --agent my_agent

# Ver resultados
python evaluate_agent.py --report results.json

# SWE-bench CLI
pip install swebench && swebench run --agent my_agent
```

### GUI / Web

- **LangSmith**: Dashboard de evaluación con comparativas por commit, métricas por tarea, y trazas de fallos
- **Weights & Biases**: Comparativa de configuraciones de agente con tablas de resultados
- **AgentBench Leaderboard**: Ranking público de agentes por benchmark

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar benchmark | `python evaluate_agent.py` | LangSmith "Run evaluation" |
| Ver reporte | `python -c "print(json.load(open('results.json')))"` | W&B dashboard |

---

## 7. Cheatsheet Rápido

```python
# Métricas clave: success_rate, avg_tokens, avg_latency, self_score
# Auto-evaluación: usar modelo DIFERENTE al del agente
# Benchmark custom: 20-50 tareas de logs de producción
# Asserts: programáticos para verificaciones objetivas
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `01-agentic-multiloop-orchestration` | Complementario (evaluar loops agénticos) | Sí |
| `09-self-reflection-corrective-agents` | Complementario (auto-evaluación como reflexión) | No |
| `13-multi-agent-collaboration-protocols` | Complementario (evaluar sistemas multi-agente) | No |
| `35-llm-integration-patterns` | Complementario (evaluar integración proveedores) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: agent-benchmarking-evaluation
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [benchmark, evaluation, success-rate, token-efficiency, agentbench, gaia, swe-bench, ab-testing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

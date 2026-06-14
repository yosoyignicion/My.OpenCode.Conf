---
name: agentic-multiloop-orchestration
description: "Patrón arquitectónico donde un agente de IA ejecuta ciclos iterativos de razonamiento-acción-observación (ReAct) para resolver tareas complejas mediante descomposición"
---
# agentic-multiloop-orchestration

## Semantic Triggers
```
agentic loop, multi-agent orchestration, cognitive cycle, reflection loop, task decomposition, iterative execution, ReAct pattern, plan-and-execute, tree-of-thought, OODA loop
```

---

## 1. Definición Teórica

Patrón arquitectónico donde un agente de IA ejecuta ciclos iterativos de razonamiento-acción-observación (ReAct) para resolver tareas complejas mediante descomposición. El orquestador central gestiona sub-agentes especializados, aplica bucles de reflexión para auto-corrección, y decide cuándo terminar basado en auto-evaluación o límites de iteración. Resuelve el problema de que los LLM no pueden ejecutar tareas multi-paso sin estructura de control explícita.

---

## 2. Implementación de Referencia

Framework recomendado: LangGraph (LangChain) o CrewAI para orquestación multi-agente. Python 3.12+, OpenAI/Anthropic API.

### Ejemplo Práctico Avanzado

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Literal, Annotated
import operator

class AgentState(TypedDict):
    task: str
    steps: Annotated[list[str], operator.add]
    current_step: int
    max_steps: int
    result: str | None

def reflect(state: AgentState) -> AgentState:
    critique = llm.invoke(f"Task: {state['task']}\nProgress: {state['steps']}\nCritique:")
    if "complete" in critique.content.lower():
        state["result"] = state["steps"][-1]
        return state
    state["current_step"] += 1
    return state

def should_continue(state: AgentState) -> Literal["reflect", "end"]:
    if state["result"] or state["current_step"] >= state["max_steps"]:
        return "end"
    return "reflect"

graph = StateGraph(AgentState)
graph.add_node("reflect", reflect)
graph.set_entry_point("reflect")
graph.add_conditional_edges("reflect", should_continue)
app = graph.compile()

result = app.invoke({
    "task": "Analyze system performance",
    "steps": [], "current_step": 0, "max_steps": 5, "result": None
})
```

**Fuente oficial:** https://langchain-ai.github.io/langgraph/

### Alternativa de Implementación Específica

Para equipos pequeños sin necesidad de grafos complejos: usar `asyncio` + OpenAI tool calls directas. Más simple pero sin persistencia ni bifurcación condicional.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Tareas multi-paso que requieren planificación, herramientas externas, y auto-corrección. |
| **Cuándo evitar** | Tareas simples de una sola respuesta; el overhead del bucle añade latencia y coste. |
| **Alternativas** | 1) ReAct manual con tool calls (simple, sin framework). 2) Plan-and-Execute fijo (predecible). 3) Single-shot con contexto completo (rápido, menos preciso). |
| **Coste/Complejidad** | Alto: requiere diseño de estado, manejo de errores, timeouts, y presupuesto de tokens. La curva de aprendizaje de LangGraph es pronunciada. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Bucle infinito por auto-evaluación que nunca dice "complete"

**¿Qué ocasionó el error?**
El agente nunca alcanza su criterio de completitud porque la auto-evaluación es demasiado estricta o el prompt de reflexión no define claramente qué constituye "complete".

**¿Cómo se solucionó?**
Añadir un límite máximo de iteraciones (`max_steps=10`) como cortocircuito y definir criterios explícitos en el prompt: "Mark complete only when the task objective stated in the first user message is fully satisfied."

**¿Por qué funciona esta técnica?**
El límite duro evita loops infinitos por consumo de tokens. Los criterios explícitos alinean la auto-evaluación del LLM con la intención humana.

### Caso: El orquestador pierde el estado entre pasos

**¿Qué ocasionó el error?**
Usar variables globales mutables compartidas entre sub-agentes concurrentes causa condiciones de carrera o estado inconsistente.

**¿Cómo se solucionó?**
Implementar un `AgentState` inmutable (TypedDict con `Annotated[operator.add]` para merges) y usar LangGraph para gestión de estado transaccional.

**¿Por qué funciona esta técnica?**
La inmutabilidad previene efectos secundarios entre agentes. Los merges por reducer garantizan consistencia incluso con ejecución paralela.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "implementa un agente multi-paso" "orquestación de loops"
- **Prioridad de carga:** Alta — es la base de cualquier agente que ejecute tareas complejas
- **Dependencias:** `04-tool-use-function-calling`, `09-self-reflection-corrective-agents`, `29-subagents-parallelism`

### Tool Integration

```json
{
  "tool_name": "agentic-multiloop-orchestration",
  "description": "Guía para implementar bucles agénticos ReAct, orquestación multi-agente, y ciclos cognitivos con LangGraph o implementación manual.",
  "triggers": ["agentic loop", "multi-agent orchestration", "cognitive cycle", "reflection loop"],
  "context_hint": "Inyectar secciones 1-2 y 5 para implementación; sección 8 para skills relacionados.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre implementar un agente con loops o ciclo cognitivo, carga el skill
agentic-multiloop-orchestration y sigue la sección de implementación de referencia con LangGraph.
Prioriza el ejemplo práctico sobre teoría. Aplica la alternativa si el usuario pide algo simple.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# LangGraph Studio CLI para debugging visual de grafos
npx langgraph-cli dev

# Test de un agente ReAct
python -c "from agent import app; print(app.invoke({'task': 'test'}))"
```

### GUI / Web

- **LangGraph Studio**: Interfaz web para visualizar y depurar grafos de agentes en tiempo real
- **LangSmith**: Dashboard de tracing para monitorear ejecuciones, latencia por paso, y coste de tokens
- **CrewAI Dashboard**: Visualización de jerarquía de crew, tareas asignadas, y outputs de cada agente

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar servidor LangGraph | `langgraph-cli dev` | `Ctrl+Shift+D` (VSCode) |
| Debug paso a paso | `python -m langgraph.debug` | `F10` (LangGraph Studio) |

---

## 7. Cheatsheet Rápido

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Literal

class S(TypedDict): task: str; result: str | None; step: int
def node(s: S) -> S: return {"step": s["step"] + 1, **s}
def cond(s: S) -> Literal["node", "end"]: return "end" if s["step"] >= 5 else "node"

g = StateGraph(S)
g.add_node("node", node); g.set_entry_point("node")
g.add_conditional_edges("node", cond)
app = g.compile()
print(app.invoke({"task": "x", "result": None, "step": 0}))
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-tool-use-function-calling` | Complementario (los agentes llaman tools en cada paso) | Sí |
| `09-self-reflection-corrective-agents` | Complementario (reflection loop es un tipo de bucle) | Sí |
| `29-subagents-parallelism` | Complementario (orquestación de sub-agentes) | Sí |
| `13-multi-agent-collaboration-protocols` | Superconjunto (protocolos de comunicación entre agentes) | No |
| `07-agent-memory-persistence-episodic` | Complementario (persistencia de estado entre loops) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: agentic-multiloop-orchestration
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [agent-loop, orchestration, react, langgraph, multi-agent, cognitive-cycle]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

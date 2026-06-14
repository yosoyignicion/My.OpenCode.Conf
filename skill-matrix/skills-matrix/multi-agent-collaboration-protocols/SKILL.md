---
name: multi-agent-collaboration-protocols
description: "Protocolos y patrones arquitectónicos que permiten a múltiples agentes de IA coordinarse para resolver tareas complejas mediante roles especializados, paso de mensajes estructurado, memoria compart..."
---
# multi-agent-collaboration-protocols

## Semantic Triggers
```
multi agent protocol, agent collaboration, agent communication, swarm agent, agent negotiation, agent role assignment, debate protocol, blackboard pattern, orchestrator pattern
```

---

## 1. Definición Teórica

Protocolos y patrones arquitectónicos que permiten a múltiples agentes de IA coordinarse para resolver tareas complejas mediante roles especializados, paso de mensajes estructurado, memoria compartida (blackboard), y mecanismos de consenso/votación. Resuelve el problema de que un solo agente tiene capacidades limitadas; la especialización y colaboración multi-agente permite abordar problemas que requieren perspectivas múltiples o habilidades diversas.

---

## 2. Implementación de Referencia

Frameworks: CrewAI, AutoGen (Microsoft), LangGraph, OpenAI Swarm. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from crewai import Agent, Task, Crew, Process
from pydantic import BaseModel
from typing import List
import asyncio

class ResearchReport(BaseModel):
    findings: List[str]
    methodology: str
    confidence: float

# Specialized agents
researcher = Agent(
    role="Research Analyst",
    goal="Find relevant information and data about the topic",
    backstory="Expert in research methodology and data gathering",
    tools=[],  # Add search tools
    llm_config={"model": "gpt-4o"},
    allow_delegation=False,
)

critic = Agent(
    role="Quality Critic",
    goal="Review findings for accuracy, gaps, and biases",
    backstory="Former editor with expertise in fact-checking",
    llm_config={"model": "gpt-4o"},
)

writer = Agent(
    role="Report Writer",
    goal="Synthesize findings into a coherent report",
    backstory="Technical writer specializing in clear communication",
    llm_config={"model": "gpt-4o-mini"},  # Cheaper model for writing
)

# Define tasks
research_task = Task(
    description="Research the impact of AI on healthcare",
    agent=researcher,
    expected_output="List of key findings with sources",
)

review_task = Task(
    description="Review findings for accuracy and completeness",
    agent=critic,
    expected_output="Critique with improvement suggestions",
    context=[research_task],  # Depends on research
)

write_task = Task(
    description="Write final report synthesizing all findings",
    agent=writer,
    expected_output="Final report in markdown",
    context=[research_task, review_task],
)

# Assembly
crew = Crew(
    agents=[researcher, critic, writer],
    tasks=[research_task, review_task, write_task],
    process=Process.sequential,  # Or Process.hierarchical
    verbose=True,
)

# Execute
result = crew.kickoff()
print(result)
```

**Fuente oficial:** https://docs.crewai.com/

### Alternativa de Implementación Específica

Para protocolo de debate (fact-checking multi-perspectiva), usar AutoGen con `GroupChat` donde agentes debaten y un moderador sintetiza.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Tareas complejas que requieren perspectivas múltiples, verificación cruzada, o flujos de trabajo con roles definidos. |
| **Cuándo evitar** | Tareas que un solo agente puede resolver bien; el overhead de comunicación entre agentes es significativo (latencia, coste, complejidad). |
| **Alternativas** | 1) Orchestrator centralizado (LangGraph). 2) Swarm descentralizado (AutoGen). 3) Pipeline secuencial de agentes. |
| **Coste/Complejidad** | Alto: cada agente consume tokens. La coordinación requiere manejo de estados compartidos, deadlocks, y consistencia. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Agentes entran en bucles de debate sin converger

**¿Qué ocasionó el error?**
Protocolo de debate sin moderador: dos agentes con posturas opuestas argumentan indefinidamente sin mecanismo para alcanzar consenso.

**¿Cómo se solucionó?**
Añadir un agente moderador con el rol explícito de "synthesizer" que detecta convergencia (cuando los argumentos dejan de cambiar) y produce una síntesis, con max_rounds=5.

**¿Por qué funciona esta técnica?**
El moderador externaliza la función de convergencia. El límite de rondas evita loops infinitos. La síntesis fuerza una decisión.

### Caso: Un agente consume todo el presupuesto de tokens

**¿Qué ocasionó el error?**
El agente "researcher" recupera demasiados documentos, llenando el contexto compartido y dejando sin presupuesto a los demás agentes.

**¿Cómo se solucionó?**
Implementar un presupuesto de tokens por agente en el blackboard compartido, y un límite de contexto máximo (ej. 50% del total para el primer agente).

**¿Por qué funciona esta técnica?**
El presupuesto por agente garantiza distribución equitativa del contexto. El límite por agente evita que uno acapare todo el espacio disponible.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimados al invocar este skill
- **Trigger de activación:** "multi-agente" "colaboración entre agentes" "crewai" "swarm"
- **Prioridad de carga:** Alta — patrón avanzado para sistemas complejos
- **Dependencias:** `01-agentic-multiloop-orchestration`, `29-subagents-parallelism`, `04-tool-use-function-calling`

### Tool Integration

```json
{
  "tool_name": "multi-agent-collaboration-protocols",
  "description": "Protocolos de colaboración multi-agente: CrewAI, AutoGen, blackboard, debate, orchestrator vs swarm. Roles, comunicación, consenso y presupuesto de tokens.",
  "triggers": ["multi agent", "agent collaboration", "swarm", "crewai", "autogen"],
  "context_hint": "Inyectar sección 2 para CrewAI; sección 4 para bucles de debate y presupuesto de tokens.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera implementar múltiples agentes colaborando, carga
multi-agent-collaboration-protocols y usa CrewAI con Process.sequential si
hay dependencias lineales, o AutoGen GroupChat para debate. Define roles claros
(researcher, critic, writer) y límites de rondas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# CrewAI ejecución
python crew.py

# AutoGen CLI
autogen groupchat --config ./agents.yaml --task "Research AI safety"

# Visualizar grafo de agentes
crewai draw --output crew_graph.png
```

### GUI / Web

- **CrewAI Dashboard**: Visualización de agentes, tareas asignadas, progreso y outputs de cada agente en tiempo real
- **AutoGen Studio**: Interfaz web para diseñar y depurar flujos multi-agente
- **LangSmith**: Tracing de llamadas entre agentes con dependencias y tiempos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar crew | `python crew.py` | CrewAI Dashboard "Run" |
| Ver grafo | `crewai draw` | AutoGen Studio graph view |

---

## 7. Cheatsheet Rápido

```python
from crewai import Agent, Task, Crew, Process
# Define roles: researcher, critic, writer
# Tasks con context para dependencias
# Crew(agents, tasks, process=Process.sequential)
# Límite: max_rounds=5 para debates, presupuesto de tokens por agente
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `01-agentic-multiloop-orchestration` | Complementario (orquestación de loops multi-agente) | Sí |
| `29-subagents-parallelism` | Complementario (ejecución paralela de sub-agentes) | Sí |
| `04-tool-use-function-calling` | Complementario (agentes llaman tools) | No |
| `09-self-reflection-corrective-agents` | Complementario (reflexión como agente interno) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: multi-agent-collaboration-protocols
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [multi-agent, crewai, autogen, swarm, collaboration, debate, blackboard, orchestration]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

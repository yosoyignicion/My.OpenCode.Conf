---
name: self-reflection-corrective-agents
description: "Patrón donde el agente critica su propia salida usando un prompt de reflexión específico, identifica errores o mejoras, y genera una versión corregida en un bucle iterativo"
---
# self-reflection-corrective-agents

## Semantic Triggers
```
self reflection agent, self correction llm, reflective agent, corrective feedback loop, self critique, refinement loop, CRITIC framework, verification step
```

---

## 1. Definición Teórica

Patrón donde el agente critica su propia salida usando un prompt de reflexión específico, identifica errores o mejoras, y genera una versión corregida en un bucle iterativo. Resuelve el problema de que los LLM producen respuestas con alta confianza incluso cuando están equivocados; la reflexión estructurada reduce alucinaciones y mejora la calidad mediante auto-verificación sin necesidad de feedback externo.

---

## 2. Implementación de Referencia

API OpenAI/Anthropic con prompting de doble paso. Python 3.12+. Frameworks: LangChain `ReflectionAgent`, CrewAI `ReviewAgent`.

### Ejemplo Práctico Avanzado

```python
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from typing import Literal
import instructor

client = instructor.from_openai(AsyncOpenAI())

class Critique(BaseModel):
    has_issues: bool
    issues: list[str] = Field(default_factory=list)
    missing_elements: list[str] = Field(default_factory=list)
    confidence_score: float = Field(ge=0, le=1)

async def reflect_and_refine(task: str, max_rounds: int = 3) -> str:
    result = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": task}],
    )
    current = result.choices[0].message.content

    for round_num in range(max_rounds):
        critique = await client.chat.completions.create(
            model="gpt-4o",
            response_model=Critique,
            messages=[{
                "role": "user",
                "content": f"Original task: {task}\n\nCurrent answer:\n{current}\n\n"
                           f"Analyze this answer. Identify specific errors, gaps, "
                           f"inaccuracies, or missing elements. Be critical and precise. "
                           f"If perfect, set has_issues=false."
            }],
        )

        if not critique.has_issues or critique.confidence_score > 0.9:
            return current

        current = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"Original task: {task}\n\n"
                           f"Previous answer:\n{current}\n\n"
                           f"Critique received:\n"
                           f"Issues: {', '.join(critique.issues)}\n"
                           f"Missing: {', '.join(critique.missing_elements)}\n\n"
                           f"Please provide a corrected, improved version."
            }],
        )
        current = current.choices[0].message.content

    return current
```

**Fuente oficial:** https://arxiv.org/abs/2303.17651 (Self-Refine paper)

### Alternativa de Implementación Específica

Usar `instructor` con `max_retries` para auto-corrección sobre validación de esquema. Cuando la salida no valida contra Pydantic, el agente recibe el error y se auto-corrige.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Tareas donde la precisión es crítica (código, SQL, matemáticas, documentos legales). |
| **Cuándo evitar** | Tareas creativas donde la espontaneidad es valiosa (poesía, brainstorming); la reflexión puede homogeneizar. |
| **Alternativas** | 1) Single-shot con CoT (simple, sin iteración). 2) Verificación externa (tests, validadores). 3) Múltiples agentes debatiendo. |
| **Coste/Complejidad** | Medio-Alto: cada ronda de reflexión duplica el coste de tokens. La calidad depende mucho del prompt de crítica. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: La reflexión no encuentra errores obvios (falso positivo de corrección)

**¿Qué ocasionó el error?**
El prompt de crítica pide "identificar errores" pero el LLM a menudo confirma su propio trabajo en lugar de criticarlo objetivamente (sesgo de confirmación).

**¿Cómo se solucionó?**
Utilizar un modelo diferente para la crítica (gpt-4o-mini critique a gpt-4o) y reformular como "Eres un revisor estricto. Tu trabajo es encontrar fallos. Si no encuentras ninguno, explica por qué la respuesta es perfecta."

**¿Por qué funciona esta técnica?**
Modelos diferentes tienen diferentes patrones de error. El prompt adversarial ("encuentra fallos") activa el rol de crítico en lugar de colaborador.

### Caso: El agente entra en un bucle de refinamiento sin mejorar

**¿Qué ocasionó el error?**
El prompt de refinamiento recibe la crítica y genera una nueva versión, pero la crítica sobre la nueva versión encuentra nuevos problemas (reales o artificiales), causando un ciclo infinito.

**¿Cómo se solucionó?**
Añadir max_rounds=3 como cortocircuito y una métrica de mejora: si la diferencia entre la versión anterior y la nueva es trivial (<10 tokens diferentes), terminar el bucle.

**¿Por qué funciona esta técnica?**
El límite duro previene loops infinitos. Detectar convergencia temprana (cambios mínimos) indica que el refinamiento ha alcanzado una meseta.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "self-reflection" "auto-corrección" "refinar respuesta" "crítica del agente"
- **Prioridad de carga:** Alta — patrón fundamental para calidad de output
- **Dependencias:** `18-structured-outputs-json-schema`, `01-agentic-multiloop-orchestration`

### Tool Integration

```json
{
  "tool_name": "self-reflection-corrective-agents",
  "description": "Implementación de auto-reflexión y corrección para agentes LLM: crítica estructurada, refinamiento iterativo, detección de convergencia, y prevención de bucles infinitos.",
  "triggers": ["self reflection", "self correction", "reflective agent", "refinement loop", "critique"],
  "context_hint": "Inyectar sección 2 para el patrón reflect_and_refine; sección 4 para errores de bucle y falso positivo.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera que el agente se auto-corrija o refine sus respuestas, carga
self-reflection-corrective-agents y usa el patrón de crítica estructurada con
response_model de Pydantic. Limita a 3 rondas máximas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar auto-reflexión
python -c "
import asyncio; from agent import reflect_and_refine
print(asyncio.run(reflect_and_refine('Write a Python quicksort')))
"

# Evaluar convergencia
python -c "
from difflib import SequenceMatcher
a, b = 'answer v1', 'answer v2'
print(SequenceMatcher(None, a, b).ratio())
"
```

### GUI / Web

- **LangSmith**: Trazas de ciclos de reflexión con versiones de respuesta y scores
- **Weights & Biases**: Comparación de versiones refineadas con métricas de calidad
- **Anthropic Console**: Historial de mensajes con versiones de respuestas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Refinar respuesta | `python -c "reflect_and_refine('task')"` | N/A |
| Comparar versiones | `python -c "SequenceMatcher(...)"` | LangSmith diff view |

---

## 7. Cheatsheet Rápido

```python
# Patrón: task → generate → critique (modelo separado) → refine → repeat
# Límite: 3 rondas o convergencia (<10 tokens de diferencia)
# Crítica efectiva: modelo diferente, rol adversarial, métricas específicas
# Coste: 2-4x tokens de single-shot, pero 30-50% menos errores
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `18-structured-outputs-json-schema` | Complementario (crítica tipada con Pydantic) | Sí |
| `01-agentic-multiloop-orchestration` | Complementario (reflection es un tipo de loop) | Sí |
| `13-multi-agent-collaboration-protocols` | Complementario (debate entre agentes como reflexión externa) | No |
| `04-tool-use-function-calling` | Complementario (verificación mediante tools) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: self-reflection-corrective-agents
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [self-reflection, self-correction, critique, refinement, hallucination-reduction, self-refine]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

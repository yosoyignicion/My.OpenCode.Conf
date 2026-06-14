---
name: autoprompting-engineering
description: "Ingeniería sistemática de prompts para LLMs: diseño persona-first (definir QUIÉN antes del QUÉ), presupuesto de contexto (system prompt <25% de la ventana), formato few-shot con patrones concretos,..."
---
# autoprompting-engineering

## Semantic Triggers
```
autoprompting, prompt engineering, system prompt design, chain of thought, persona crafting, self prompting loop, few-shot formatting, token density, context budget
```

---

## 1. Definición Teórica

Ingeniería sistemática de prompts para LLMs: diseño persona-first (definir QUIÉN antes del QUÉ), presupuesto de contexto (system prompt <25% de la ventana), formato few-shot con patrones concretos, chain-of-thought adaptativo según complejidad, y auto-prompting (el agente genera sus propios sub-prompts para descomposición de tareas). Resuelve el problema de que los prompts mal diseñados producen respuestas inconsistentes, costosas, y difíciles de depurar.

---

## 2. Implementación de Referencia

Frameworks: LangChain prompt templates, Instructor para structured prompting. Python 3.12+. Basado en principios de Anthropic y OpenAI.

### Ejemplo Práctico Avanzado

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import instructor
from openai import AsyncOpenAI

client = instructor.from_openai(AsyncOpenAI())

class PromptBlueprint(BaseModel):
    persona: str = Field(description="Who the agent is")
    rules: List[str] = Field(description="≤7 core rules", max_length=7)
    workflow: List[str] = Field(description="Step-by-step workflow")
    conventions: List[str] = Field(description="Code/style conventions")
    examples: List[dict] = Field(description="≤3 few-shot examples", max_length=3)

class PromptEngineer:
    def __init__(self):
        self.structures = {
            "simple": "PERSONA → RULES → WORKFLOW → CONVENTIONS → EXAMPLES",
            "cot": "PERSONA → RULES → CoT_STEPS → CONVENTIONS → VERIFICATION",
            "agent": "PERSONA → TOOLS → MEMORY → SKILLS → WORKSPACE → METADATA",
        }

    def design_persona_first(self, role: str, context: str) -> PromptBlueprint:
        """Design prompt starting with WHO, then WHAT"""
        return PromptBlueprint(
            persona=f"Eres un {role} senior con experiencia en {context}",
            rules=[
                "Responde en ≤10 palabras o JSON directo",
                "Usa herramientas antes de asumir conocimiento",
                "Verifica hechos con fuentes oficiales",
            ],
            workflow=[
                "1. Analiza la solicitud y determina dominio",
                "2. Carga el skill relevante del registro",
                "3. Ejecuta siguiendo la implementación de referencia",
                "4. Reflexiona y corrige si es necesario",
            ],
            conventions=[
                "Código idiomático, no genérico",
                "Manejo de errores explícito",
                "Type hints siempre",
            ],
            examples=[
                {"input": "Crea un endpoint", "output": "POST /api/v1/resource → 201"},
            ]
        )

    async def self_prompting_loop(self, task: str, max_depth: int = 3) -> str:
        """Agent generates its own sub-prompts"""
        depth = 0
        current_task = task
        sub_prompts = []

        while depth < max_depth:
            # Step 1: Determine domain
            domain = await client.chat.completions.create(
                model="gpt-4o-mini",
                response_model=dict,
                messages=[{"role": "user",
                          "content": f"What domain/skills does this task need? {current_task}"}],
            )

            # Step 2: Load skill
            skill_ref = f"→ Skill needed: {domain.get('domain', 'general')}"
            sub_prompts.append(skill_ref)

            # Step 3: Execute
            result = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": f"You are a {domain.get('domain', 'helpful')} expert."},
                          {"role": "user", "content": current_task}],
            )
            sub_prompts.append(f"→ Result: {result.choices[0].message.content[:100]}")

            # Step 4: Am I stuck?
            check = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user",
                          "content": f"Is this complete? {result.choices[0].message.content[:200]}"}],
            )
            if "yes" in check.choices[0].message.content.lower():
                return result.choices[0].message.content

            # Step 5: Refine
            current_task = f"Refine: {current_task}. Previous: {result.choices[0].message.content[:100]}"
            depth += 1

        return "Max depth reached"

engineer = PromptEngineer()
blueprint = engineer.design_persona_first("arquitecto API", "REST y GraphQL")
print(f"Persona: {blueprint.persona}")
print(f"Rules: {len(blueprint.rules)}")
```

**Fuente oficial:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering

### Alternativa de Implementación Específica

Usar `dspy` para optimización automática de prompts con bootstrapping de ejemplos y búsqueda de mejor combinación.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier sistema que use LLMs; el diseño de prompts impacta directamente calidad, coste y consistencia. |
| **Cuándo evitar** | Prompts extremadamente simples de un solo turno donde el diseño estructurado es overkill. |
| **Alternativas** | 1) DSPy (optimización automática). 2) Prompt templates (manual). 3) Auto-prompting loop (adaptativo). |
| **Coste/Complejidad** | Bajo: diseñar prompts es barato. El auto-prompting loop consume tokens adicionales pero mejora calidad. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Few-shot examples causan overfitting en el LLM

**¿Qué ocasionó el error?** Los ejemplos few-shot son demasiado específicos, causando que el LLM los repita exactamente en lugar de generalizar el patrón.

**¿Cómo se solucionó?** Usar ejemplos diversos que muestren el patrón pero con diferentes dominios. Limitado a 3 ejemplos máximo. Añadir nota: "Follow the pattern, not the content."

**¿Por qué funciona esta técnica?** La diversidad de ejemplos entrena al modelo a generalizar el patrón. La nota explícita refuerza el comportamiento deseado.

### Caso: System prompt demasiado largo ignora reglas importantes

**¿Qué ocasionó el error?** El system prompt tiene 20+ reglas; el LLM atiende solo las primeras 5-7 (atención decreciente).

**¿Cómo se solucionó?** Limitar a ≤7 reglas, ordenadas por importancia. Usar el principio de "menos es más": cada regla adicional reduce el cumplimiento de todas. Agrupar reglas relacionadas.

**¿Por qué funciona esta técnica?** La atención del LLM decae con la longitud. 7 reglas es el límite práctico. Orden por importancia asegura que las críticas se atiendan primero.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "prompt engineering" "system prompt" "persona" "few-shot" "auto-prompting"
- **Prioridad de carga:** Alta — aplica a cualquier interacción con LLM
- **Dependencias:** `32-ocs-identity-charter`, `03-context-token-budgeting`, `30-zero-token-optimization`

### Tool Integration

```json
{
  "tool_name": "autoprompting-engineering",
  "description": "Ingeniería de prompts: persona-first, presupuesto de contexto, few-shot efectivo, CoT adaptativo, y auto-prompting loop para descomposición de tareas. ≤7 reglas, ejemplos diversos.",
  "triggers": ["prompt engineering", "system prompt", "persona", "few-shot", "chain of thought", "autoprompting"],
  "context_hint": "Inyectar al diseñar cualquier prompt. Usar PromptBlueprint para estructura consistente.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Para diseñar prompts efectivos: 1) Define persona first. 2) ≤7 reglas por orden
de importancia. 3) ≤3 ejemplos diversos. 4) System prompt ≤25% del contexto.
5) Auto-prompting loop si tarea compleja.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generar blueprint
python -c "from prompt_engineer import PromptEngineer; e=PromptEngineer(); b=e.design_persona_first('dev','Python'); print(b.model_dump_json(indent=2))"

# Self-prompting loop
python -c "import asyncio; from prompt_engineer import PromptEngineer; print(asyncio.run(PromptEngineer().self_prompting_loop('Build API')))"
```

### GUI / Web

- **Anthropic Console**: Playground de prompts con comparativa de versiones
- **OpenAI Playground**: Editor de prompts con vista de tokens y role assignment
- **LangSmith**: Prompt versionado con evaluación A/B

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar blueprint | `python -c "PromptEngineer().design_persona_first(...)"` | Playground "New prompt" |
| Probar prompt | N/A | Anthropic Console "Run" |

---

## 7. Cheatsheet Rápido

```python
# System prompt: PERSONA → RULES (≤7) → WORKFLOW → CONVENTIONS → EXAMPLES (≤3)
# Presupuesto: system ≤25% del contexto
# Few-shot: diversos, mostrar patrón no contenido
# CoT: direct (simple) | step-back (complejo) | verification (crítico)
# Auto-loop: Task→Domain→Skill→Execute→Check→Refine
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `32-ocs-identity-charter` | Complementario (identity es parte del system prompt) | Sí |
| `03-context-token-budgeting` | Complementario (presupuesto de tokens) | Sí |
| `30-zero-token-optimization` | Complementario (política de respuesta concisa) | Sí |
| `09-self-reflection-corrective-agents` | Complementario (reflexión como extensión de CoT) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: autoprompting-engineering
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/autoprompting
tags: [prompt-engineering, system-prompt, persona, few-shot, chain-of-thought, auto-prompting, dspy]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

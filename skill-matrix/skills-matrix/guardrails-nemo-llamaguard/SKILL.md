---
name: guardrails-nemo-llamaguard
description: "Sistema de seguridad en múltiples capas que filtra entradas y salidas del LLM para prevenir toxicidad, PII, jailbreaks, y contenido fuera de dominio"
---
# guardrails-nemo-llamaguard

## Semantic Triggers
```
nemo guardrails, llamaguard, llm safety, content moderation, guardrails configuration, output validation guardrails, jailbreak detection, input guard, output guard, topic fencing
```

---

## 1. Definición Teórica

Sistema de seguridad en múltiples capas que filtra entradas y salidas del LLM para prevenir toxicidad, PII, jailbreaks, y contenido fuera de dominio. Combina modelos especializados (LlamaGuard para moderación), motores de reglas (NeMo Colang), y clasificadores heurísticos. Resuelve el problema de que los LLM por sí solos no pueden auto-regularse de forma fiable contra usos maliciosos o accidentales.

---

## 2. Implementación de Referencia

Frameworks: NVIDIA NeMo Guardrails (Python), Meta LlamaGuard 3 (modelo fine-tuneado), Guardrails AI. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from nemoguardrails import LLMRails, RailsConfig
from typing import Optional
import asyncio

# Colang guardrails configuration
colang_content = """
define user express greeting
    "hello" "hi" "hey" "hola"

define user ask about politics
    "what do you think about {topic}"
    "tell me about {topic}" (topic includes "politics" "election" "president")

define user request PII
    "what is my SSN" "give me personal data"

define bot express greeting
    "Hello! How can I help you today?"

define bot politely decline
    "I'm not able to answer questions about politics. Let me help with something else."

define bot warn PII
    "I cannot share or request personal information. Please keep the conversation general."

define flow greeting
    user express greeting
    bot express greeting

define flow politics
    user ask about politics
    bot politely decline

define flow PII request
    user request PII
    bot warn PII
"""

config = RailsConfig.from_content(
    colang_content=colang_content,
    yaml_content="""
models:
  - type: main
    engine: openai
    model: gpt-4o
  - type: guardrails
    engine: openai
    model: gpt-4o-mini  # Cheaper model for guardrails
"""
)

rails = LLMRails(config)

async def safe_chat(user_input: str) -> str:
    # Input guard checks
    info = await rails.detect_jailbreak(user_input)
    if info.score > 0.7:
        return "I cannot process this request."

    # Generate with guardrails
    response = await rails.generate_async(
        messages=[{"role": "user", "content": user_input}]
    )

    # Output guard checks
    safety = await rails.detect_toxicity(response)
    if safety.is_toxic:
        return "I apologize, but my response was flagged. Let me rephrase."

    return response["content"]

# Usage
response = asyncio.run(safe_chat("What do you think about the election?"))
```

**Fuente oficial:** https://github.com/NVIDIA/NeMo-Guardrails

### Alternativa de Implementación Específica

Usar LlamaGuard 3 directamente como modelo de clasificación binaria (safe/unsafe) en 13 categorías de riesgo. Más simple que NeMo pero menos configurable.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones customer-facing, sistemas con usuarios no autenticados, cualquier LLM expuesto a entrada pública. |
| **Cuándo evitar** | Sistemas internos con usuarios conocidos y de confianza; el overhead de latencia puede no justificarse. |
| **Alternativas** | 1) LlamaGuard 3 (modelo directo, simple). 2) OpenAI Moderation API (gestionado). 3) Guardrails AI (multi-proveedor). |
| **Coste/Complejidad** | Medio: NeMo requiere definir flujos Colang. LlamaGuard necesita GPU para baja latencia. La moderación de OpenAI es simple pero por demanda. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Guardrails bloquean contenido legítimo por falsos positivos

**¿Qué ocasionó el error?**
El clasificador de toxicidad es demasiado sensible y marca discusiones técnicas sobre temas sensibles (ej. "discute los efectos secundarios de la vacuna") como contenido peligroso.

**¿Cómo se solucionó?**
Implementar un sistema de umbrales por categoría: educación/medicina/science tienen umbral más alto (0.85) que hate/harassment (0.5). Además, añadir un override contextual: si el usuario es authenticated y el dominio es educativo, reducir sensibilidad.

**¿Por qué funciona esta técnica?**
Los umbrales por categoría reconocen que no todos los temas sensibles son igualmente riesgosos. El override contextual alinea la seguridad con el caso de uso.

### Caso: Jailbreak exitoso pasa los guardrails

**¿Qué ocasionó el error?**
Un jailbreak con codificación (Base64, ROT13, emoji substitution) ofusca el prompt malicioso, evadiendo los patrones de detección.

**¿Cómo se solucionó?**
Añadir un paso de preprocesamiento que normalice el input antes del guardrail: decodificar Base64, unificar caracteres Unicode, expandir emojis a texto.

**¿Por qué funciona esta técnica?**
La normalización deshace la ofuscación antes de que el guardrail analice el contenido, exponiendo la intención maliciosa al clasificador.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "guardrails" "seguridad del LLM" "content moderation" "jailbreak prevention"
- **Prioridad de carga:** Alta — crítica para cualquier agente expuesto al usuario
- **Dependencias:** `05-seguridad-sdlc/04-owasp-top-10-mitigation`, `35-llm-integration-patterns`

### Tool Integration

```json
{
  "tool_name": "guardrails-nemo-llamaguard",
  "description": "Implementación de guardrails de seguridad para LLMs: NeMo Guardrails con Colang, LlamaGuard 3, detección de jailbreak, moderación de contenido multi-capa.",
  "triggers": ["guardrails", "llm safety", "content moderation", "jailbreak detection", "nemo"],
  "context_hint": "Inyectar sección 2 para implementación NeMo; sección 4 para falsos positivos y jailbreak.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte por seguridad, guardrails, o moderación de contenido en LLMs,
carga guardrails-nemo-llamaguard. Usa NeMo Guardrails con Colang para flujos complejos,
LlamaGuard 3 para moderación directa. Prioriza la prevención de jailbreak por ofuscación.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# NeMo Guardrails CLI
nemoguardrails server --config ./config/

# Probar guardrail
nemoguardrails evaluate --input "What do you think about..." --config ./config/

# LlamaGuard inference
python -c "
from transformers import pipeline
pipe = pipeline('text-classification', model='meta-llama/LlamaGuard-3-8B')
print(pipe('User: harmful text'))
"
```

### GUI / Web

- **NeMo Guardrails Toolkit**: Interfaz web para diseñar y probar flujos Colang visualmente
- **LlamaGuard Playground**: (huggingface.co/spaces) Probar moderación interactivamente
- **OpenAI Dashboard**: Métricas de moderación por categoría y umbral

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar servidor NeMo | `nemoguardrails server` | NeMo Toolkit "Run" |
| Probar input | `nemoguardrails evaluate ...` | Playground |

---

## 7. Cheatsheet Rápido

```python
from nemoguardrails import LLMRails, RailsConfig
config = RailsConfig.from_content(colang_content=colang, yaml_content=yaml)
rails = LLMRails(config)
resp = await rails.generate_async(messages=[{"role": "user", "content": input}])
# LlamaGuard: pipeline('text-classification', model='meta-llama/LlamaGuard-3-8B')
# Umbrales por categoría: hate=0.5, medical=0.85, politics=0.7
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-tool-use-function-calling` | Complementario (tools también necesitan guardrails) | No |
| `35-llm-integration-patterns` | Complementario (seguridad es parte de la integración) | Sí |
| `24-agent-human-in-the-loop-hitl` | Complementario (HITL como capa de seguridad) | No |
| `37-predict-failure-risk` | Complementario (predicción de riesgo antes de ejecución) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: guardrails-nemo-llamaguard
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [guardrails, nemo, llamaguard, safety, jailbreak-detection, content-moderation, colang]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

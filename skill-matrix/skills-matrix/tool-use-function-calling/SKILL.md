---
name: tool-use-function-calling
description: "Mecanismo por el cual un LLM invoca funciones externas definidas mediante JSON Schema, generando argumentos estructurados que el runtime ejecuta y cuyos resultados devuelve al modelo para continuar..."
---
# tool-use-function-calling

## Semantic Triggers
```
tool calling, function calling, tool use, json schema tools, tool description, parallel tool calls, tool error recovery, tool schema design
```

---

## 1. Definición Teórica

Mecanismo por el cual un LLM invoca funciones externas definidas mediante JSON Schema, generando argumentos estructurados que el runtime ejecuta y cuyos resultados devuelve al modelo para continuar el razonamiento. Resuelve la limitación fundamental de los LLM de no poder interactuar con el mundo exterior (APIs, sistemas de archivos, bases de datos) excepto a través de texto generado.

---

## 2. Implementación de Referencia

APIs oficiales: OpenAI `tools` parameter, Anthropic `tool_use`, `instructor` para outputs estructurados tipados. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from openai import AsyncOpenAI
import instructor
from pydantic import BaseModel, Field
from typing import Literal
import json

client = instructor.from_openai(AsyncOpenAI())

class Weather(BaseModel):
    location: str = Field(description="City name")
    unit: Literal["celsius", "fahrenheit"] = "celsius"

class Response(BaseModel):
    temperature: float
    conditions: str
    recommendation: str

async def get_weather(location: str, unit: str = "celsius") -> dict:
    # Simulated - replace with real API call
    return {"temperature": 22 if unit == "celsius" else 72, "conditions": "sunny"}

async def main():
    # Step 1: Extract tool parameters via structured output
    weather_params = await client.chat.completions.create(
        model="gpt-4o",
        response_model=Weather,
        messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    )
    # Step 2: Execute tool
    result = await get_weather(weather_params.location, weather_params.unit)
    # Step 3: Structured final response
    final = await client.chat.completions.create(
        model="gpt-4o",
        response_model=Response,
        messages=[
            {"role": "user", "content": f"Weather in {weather_params.location}: {json.dumps(result)}. Give advice."}
        ],
    )
    return final
```

**Fuente oficial:** https://platform.openai.com/docs/guides/function-calling

### Alternativa de Implementación Específica

Usar `anthropic` SDK con `tool_use` nativo. Similar a OpenAI pero con formato de herramientas ligeramente diferente y sin necesidad de instructor.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier agente que necesite interactuar con APIs, sistemas de archivos, bases de datos, o ejecutar comandos. |
| **Cuándo evitar** | Tareas puramente generativas (escritura creativa) donde las tools añaden overhead innecesario. |
| **Alternativas** | 1) `instructor` (tipado fuerte, retries). 2) OpenAI `parallel_tool_calls` (múltiples tools simultáneas). 3) Anthropic `tool_use` (nativo, sin librerías extra). |
| **Coste/Complejidad** | Bajo-Medio: la API es madura y bien documentada. La complejidad está en diseñar buenos schemas y manejar errores de ejecución. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El LLM ignora las tools y responde directamente

**¿Qué ocasionó el error?**
El `tool_choice` no estaba configurado como `"required"` o las descripciones de las herramientas eran insuficientes para que el modelo entendiera cuándo usarlas.

**¿Cómo se solucionó?**
Establecer `tool_choice="required"` para forzar el uso de herramientas en cada turno, y mejorar las descripciones incluyendo ejemplos de cuándo invocar cada tool.

**¿Por qué funciona esta técnica?**
Forzar tool_choice elimina la ambigüedad. Descripciones detalladas (incluyendo "call this when...") alinean el comportamiento del modelo con la intención del desarrollador.

### Caso: Tool call falla por argumentos malformados

**¿Qué ocasionó el error?**
El modelo generó argumentos JSON válidos pero semánticamente incorrectos (e.g., fecha en formato equivocado, ID que no existe).

**¿Cómo se solucionó?**
Implementar un validador post-tool-call que verifique argumentos contra reglas de negocio antes de ejecutar, y devuelva un error estructurado al modelo para que se auto-corrija.

**¿Por qué funciona esta técnica?**
El LLM puede auto-corregirse si recibe feedback estructurado del error. El validador actúa como guard rail sin necesidad de re-prompting manual.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "function calling" "tool use" "llamar API desde el LLM"
- **Prioridad de carga:** Alta — fundamento de cualquier agente que ejecute acciones
- **Dependencias:** `18-structured-outputs-json-schema`, `27-mcp-tools-protocol`

### Tool Integration

```json
{
  "tool_name": "tool-use-function-calling",
  "description": "Definición e invocación de tools desde LLMs: schemas JSON, ejecución paralela, manejo de errores, y validación de argumentos con instructor.",
  "triggers": ["tool calling", "function calling", "tool use", "json schema tools"],
  "context_hint": "Inyectar sección 2 para implementación con instructor; sección 4 para errores comunes.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre function calling o tool use con LLMs, carga
tool-use-function-calling y usa el patrón instructor + response_model para
extracción tipada de argumentos antes de ejecutar la tool.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar tool calling con OpenAI
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"weather in London"}],"tools":[{"type":"function","function":{"name":"get_weather","parameters":{"type":"object","properties":{"location":{"type":"string"}}}}}]}'

# instructor CLI
instructor messages --model gpt-4o --response-model Weather "weather in Paris"
```

### GUI / Web

- **OpenAI Playground**: Interfaz para probar function calling con edición visual de parámetros
- **LangSmith**: Tracing de tool calls con tiempos de ejecución, argumentos, y resultados
- **Anthropic Console**: Muestra tool calls en la interfaz de chat con formato estructurado

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Probar tool call | `curl ...` | Playground "Add function" |
| Debug tool trace | N/A | LangSmith "View trace" |

---

## 7. Cheatsheet Rápido

```python
from openai import AsyncOpenAI
client = AsyncOpenAI()
resp = await client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "query"}],
    tools=[{"type": "function", "function": {"name": "fn", "description": "...", "parameters": {...}}}],
    tool_choice="auto"
)
# resp.choices[0].message.tool_calls → ejecutar, devolver resultado como "role":"tool"
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `18-structured-outputs-json-schema` | Complementario (misma tecnología, diferente uso) | Sí |
| `27-mcp-tools-protocol` | Superconjunto (MCP estandariza tool calling) | No |
| `01-agentic-multiloop-orchestration` | Complementario (tools se usan dentro de loops) | Sí |
| `35-llm-integration-patterns` | Complementario (patrones de integración multi-provider) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: tool-use-function-calling
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [function-calling, tool-use, json-schema, instructor, openai, anthropic]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

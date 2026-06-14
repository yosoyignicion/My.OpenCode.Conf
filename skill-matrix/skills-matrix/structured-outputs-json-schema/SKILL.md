---
name: structured-outputs-json-schema
description: "Técnica para generar datos estructurados desde LLMs con garantías de formato, usando JSON Schema, gramáticas formales (Outlines) o validación post-hoc con reintentos (Instructor)"
---
# structured-outputs-json-schema

## Semantic Triggers
```
structured output, json schema generation, constrained decoding, json mode llm, outlines grammar, instructor library, pydantic structured output, json validation
```

---

## 1. Definición Teórica

Técnica para generar datos estructurados desde LLMs con garantías de formato, usando JSON Schema, gramáticas formales (Outlines) o validación post-hoc con reintentos (Instructor). Resuelve el problema de que los LLM generan texto libre en formato JSON inconsistente (nombres de campo incorrectos, tipos equivocados, JSON malformado), haciendo imposible el consumo directo por sistemas de tipado fuerte sin validación y parseo complejo.

---

## 2. Implementación de Referencia

Librerías: Instructor (Python, Pydantic), Outlines (grammar-guided), Zod (TypeScript), OpenAI `response_format`. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
import instructor
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from datetime import datetime

client = instructor.from_openai(AsyncOpenAI())

class Address(BaseModel):
    street: str
    city: str
    country: str
    zip_code: str

    @field_validator("zip_code")
    @classmethod
    def validate_zip(cls, v: str) -> str:
        if not v.replace("-", "").isdigit():
            raise ValueError("ZIP must contain only digits and hyphens")
        return v

class Person(BaseModel):
    """Schema for person extraction"""
    name: str = Field(description="Full name of the person")
    age: int = Field(description="Age in years", ge=0, le=150)
    email: Optional[str] = Field(None, description="Email address if present")
    role: Literal["engineer", "manager", "designer", "other"] = "other"
    address: Optional[Address] = None
    tags: List[str] = Field(default_factory=list, max_length=5)

class BatchExtraction(BaseModel):
    people: List[Person] = Field(description="List of extracted people")
    errors: List[str] = Field(default_factory=list, description="Extraction issues")

async def extract_structured(text: str) -> BatchExtraction:
    return await client.chat.completions.create(
        model="gpt-4o",
        response_model=BatchExtraction,
        max_retries=3,  # Auto-retry on validation failure
        messages=[
            {"role": "system", "content": "Extract all people mentioned in the text."},
            {"role": "user", "content": text},
        ],
    )

# Alternative: Outlines for 100% grammar guarantee
"""
import outlines

model = outlines.models.transformers("microsoft/phi-3-mini-4k-instruct")
generator = outlines.generate.json(model, Person)
result = generator("Extract: Alice is 30, alice@b.com")
"""

result = await extract_structured("John (35, engineer from NYC) and Bob (28, designer)")
print(f"Extracted {len(result.people)} people")
for p in result.people:
    print(f"  - {p.name}: {p.role}, {p.age}")
```

**Fuente oficial:** https://python.useinstructor.com/

### Alternativa de Implementación Específica

Para TypeScript, usar `instructor-js` o Zod + OpenAI `response_format: {type: "json_schema", json_schema: {...}}` para validación nativa.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Extracción de datos, generación de configuraciones, APIs que devuelven JSON, pipeline ETL con LLM. |
| **Cuándo evitar** | Texto libre creativo (historias, poesía) donde forzar estructura reduce calidad. |
| **Alternativas** | 1) Instructor (validación + retry). 2) Outlines (garantía gramatical 100%). 3) OpenAI JSON mode (sin schema). |
| **Coste/Complejidad** | Bajo: instructor añade ~10% overhead. Outlines requiere GPU. La validación Pydantic es casi cero-coste. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El LLM genera JSON válido pero semánticamente incorrecto

**¿Qué ocasionó el error?**
OpenAI JSON mode garantiza JSON válido pero no que cumpla el schema (campos faltantes, tipos incorrectos). El LLM omite campos requeridos o usa strings donde se esperan números.

**¿Cómo se solucionó?**
Usar Instructor con Pydantic + `max_retries=3`. Cuando la validación falla, Instructor re-promptea al LLM con el error de validación para auto-corrección.

**¿Por qué funciona esta técnica?**
El LLM recibe feedback estructurado del error ("field 'age' expected int, got string") y puede corregir su output en el siguiente intento, aprendiendo del error de schema.

### Caso: Outlines falla con modelos grandes (70B+)

**¿Qué ocasionó el error?**
Outlines usa máquinas de estados finitos (FSM) para guiar la generación token a token, pero algunos modelos grandes tienen tokenizers incompatibles con la FSM de Outlines.

**¿Cómo se solucionó?**
Usar `outlines.generate.json` con `model="microsoft/phi-3-medium-4k-instruct"` (modelo pequeño) y luego validar con Instructor + LLM grande para corrección.

**¿Por qué funciona esta técnica?**
Outlines funciona mejor con modelos pequeños y tokenizers estándar. La validación cruzada con Instructor sobre el LLM grande garantiza calidad semántica.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "structured output" "json schema" "extraer datos" "validación pydantic"
- **Prioridad de carga:** Alta — fundamental para integraciones tipo API
- **Dependencias:** `04-tool-use-function-calling`, `35-llm-integration-patterns`

### Tool Integration

```json
{
  "tool_name": "structured-outputs-json-schema",
  "description": "Generación de datos estructurados desde LLMs con Instructor, Outlines, y JSON Schema. Validación Pydantic, retry automático, y gramáticas FSM.",
  "triggers": ["structured output", "json schema", "instructor", "outlines", "pydantic", "json mode"],
  "context_hint": "Inyectar sección 2 para Instructor con Pydantic; sección 4 para errores de validación y FSM.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario necesite extraer datos estructurados del LLM o generar JSON validado,
carga structured-outputs-json-schema. Usa Instructor con Pydantic response_model y
max_retries=3. Para garantía 100% de formato, combinar Outlines + Instructor.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar Instructor
python -c "
import asyncio; from app import extract_structured
print(asyncio.run(extract_structured('Alice is 30')))
"

# Outlines CLI
python -m outlines.generate.json --model microsoft/phi-3-mini --schema person.json "Extract: John 25"
```

### GUI / Web

- **Instructor Hub**: Interfaz web para probar extracción estructurada con diferentes modelos y schemas
- **OpenAI Playground**: "JSON mode" toggle para probar generation estructurada
- **Pydantic Validation Dashboard**: Visualización de errores de validación y retries

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Extraer estructurado | `python -c "extract(text)"` | Instructor Hub "Extract" |
| Validar JSON | `python -c "Person.model_validate_json(data)"` | N/A |

---

## 7. Cheatsheet Rápido

```python
from pydantic import BaseModel, Field
import instructor
client = instructor.from_openai(AsyncOpenAI())
class User(BaseModel): name: str; age: int = Field(ge=0, le=150)
u = await client.chat.completions.create(model="gpt-4o", response_model=User,
    messages=[{"role":"user","content":"Extract: John 30"}])
# max_retries=3 para auto-corrección en validación
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-tool-use-function-calling` | Complementario (misma tecnología, differente uso) | Sí |
| `35-llm-integration-patterns` | Complementario (parte de la integración) | Sí |
| `34-autoprompting-engineering` | Complementario (diseño de prompts para extracción) | No |
| `09-self-reflection-corrective-agents` | Complementario (auto-corrección en retry) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: structured-outputs-json-schema
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [structured-output, json-schema, instructor, outlines, pydantic, constrained-decoding, extraction]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

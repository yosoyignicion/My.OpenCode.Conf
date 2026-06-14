---
name: synthetic-data-generation-pipelines
description: "Pipeline que usa LLMs para generar datos de entrenamiento sintéticos, partiendo de semillas (seed tasks) y aplicando técnicas como Self-Instruct (generar instrucción + input + output), Evol-Instruc..."
---
# synthetic-data-generation-pipelines

## Semantic Triggers
```
synthetic data generation, data augmentation llm, synthetic dataset, llm data generation, data pipeline generation, synthetic training data, self-instruct, evol-instruct
```

---

## 1. Definición Teórica

Pipeline que usa LLMs para generar datos de entrenamiento sintéticos, partiendo de semillas (seed tasks) y aplicando técnicas como Self-Instruct (generar instrucción + input + output), Evol-Instruct (hacer las instrucciones progresivamente más complejas), y back-translation (parafrasear datos existentes). Resuelve el problema de que los datasets anotados por humanos son caros, lentos de producir, y limitados en escala; los datos sintéticos permiten generar millones de ejemplos a coste marginal reducido.

---

## 2. Implementación de Referencia

Librerías: `distilabel` (Argilla), `datasets` (HuggingFace), `lm-sys` (FastChat). APIs: OpenAI, Anthropic. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio, json
from openai import AsyncOpenAI
import instructor

client = instructor.from_openai(AsyncOpenAI())

class InstructionExample(BaseModel):
    instruction: str = Field(description="Task instruction")
    input: str = Field(description="Input context or empty string")
    output: str = Field(description="Expected output")
    difficulty: int = Field(ge=1, le=5, description="Difficulty level")
    domain: str = Field(description="Knowledge domain")

class SyntheticDataPipeline:
    def __init__(self, seed_tasks: List[str], model: str = "gpt-4o"):
        self.seed = seed_tasks
        self.model = model
        self.generated: List[InstructionExample] = []

    async def self_instruct(self, n: int = 100) -> List[InstructionExample]:
        """Generate instruction-output pairs from seed tasks"""
        while len(self.generated) < n:
            prompt = f"""Generate a new instruction example. 
Seed tasks for inspiration: {self.seed}
The example must be from a different domain than the seeds.
Include: instruction, input context, expected output."""
            
            example = await client.chat.completions.create(
                model=self.model,
                response_model=InstructionExample,
                messages=[{"role": "user", "content": prompt}],
            )
            
            if self._pass_quality_filter(example):
                self.generated.append(example)
        return self.generated

    async def evol_instruct(self, base: InstructionExample, depth: int = 1) -> InstructionExample:
        """Evolve an instruction to be more complex"""
        evolution_prompts = {
            "add_constraints": f"Add 2-3 specific constraints to: '{base.instruction}'",
            "deepen": f"Make this require multi-step reasoning: '{base.instruction}'",
            "concretize": f"Replace generic terms with specific entities: '{base.instruction}'",
            "increase_difficulty": f"Make this significantly harder: '{base.instruction}'",
        }
        
        evolved = await client.chat.completions.create(
            model=self.model,
            response_model=InstructionExample,
            messages=[{
                "role": "user",
                "content": evolution_prompts["add_constraints"]
            }],
        )
        return evolved

    def _pass_quality_filter(self, example: InstructionExample) -> bool:
        # Deduplication check
        for existing in self.generated:
            if existing.instruction == example.instruction:
                return False
        # Quality heuristics
        if len(example.output.split()) < 5:
            return False
        if any(bad in example.instruction.lower() for bad in ["sexual", "violent", "illegal"]):
            return False
        return True

    async def generate_diverse(self, n_per_domain: int = 20, domains: List[str] = None) -> List[InstructionExample]:
        """Generate diverse data across specified domains"""
        domains = domains or ["code", "science", "writing", "math", "analysis"]
        results = []
        for domain in domains:
            self.seed = [f"Domain: {domain}"]
            domain_data = await self.self_instruct(n_per_domain)
            results.extend(domain_data)
        return results

pipeline = SyntheticDataPipeline(
    seed_tasks=["Write a Python function", "Explain gravity", "Summarize this article"]
)
data = asyncio.run(pipeline.self_instruct(n=5))
print(f"Generated {len(data)} examples")
```

**Fuente oficial:** https://github.com/argilla-io/distilabel

### Alternativa de Implementación Específica

Usar `datasets` + `fastchat` para reprocesar datasets existentes (ShareGPT, OpenAssistant) en formatos sintéticos diversos, sin necesidad de API calls adicionales.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Fine-tuning de LLM con datos de dominio específico, aumentar datasets pequeños, crear benchmarks custom. |
| **Cuándo evitar** | El modelo ya funciona bien con prompting; los datos sintéticos pueden introducir sesgos del modelo generador. |
| **Alternativas** | 1) Self-Instruct (simple, general). 2) Evol-Instruct (complejidad progresiva). 3) Back-translation (paráfrasis). |
| **Coste/Complejidad** | Medio: generar datos con GPT-4o cuesta ~$0.01/ejemplo. El filtrado de calidad y deduplicación es crítico. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Los datos sintéticos son demasiado genéricos y no mejoran el fine-tuning

**¿Qué ocasionó el error?**
Self-Instruct sin diversidad: todas las instrucciones generadas son variaciones de las semillas, sin cubrir el espacio de dominio necesario.

**¿Cómo se solucionó?**
Implementar muestreo por dominio: forzar la generación equitativa entre categorías (código, ciencia, escritura) y usar Evol-Instruct para incrementar complejidad progresivamente.

**¿Por qué funciona esta técnica?**
El muestreo por dominio garantiza cobertura del espacio de tareas. Evol-Instruct añade variedad dentro de cada dominio.

### Caso: El modelo fine-tuneado con datos sintéticos alucina más

**¿Qué ocasionó el error?**
El LLM generador (GPT-4o) produce outputs de alta calidad pero introduce información factual no verificada. El modelo fine-tuneado aprende a alucinar como estilo.

**¿Cómo se solucionó?**
Añadir verificación factual: para cada output, pedir a un segundo LLM que verifique hechos y marque outputs no verificables como "unknown". Filtrar ejemplos con baja verificabilidad.

**¿Por qué funciona esta técnica?**
La verificación cruzada elimina datos con información no contrastada. Marcar como "unknown" entrena al modelo a ser honesto sobre incertidumbre.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "synthetic data" "generar datos de entrenamiento" "self-instruct" "evol-instruct"
- **Prioridad de carga:** Media — tarea especializada pero valiosa
- **Dependencias:** `06-llm-fine-tuning-lora-qlora`, `35-llm-integration-patterns`

### Tool Integration

```json
{
  "tool_name": "synthetic-data-generation-pipelines",
  "description": "Pipeline de generación de datos sintéticos con Self-Instruct y Evol-Instruct: seed tasks, filtrado de calidad, diversidad por dominio, verificación factual.",
  "triggers": ["synthetic data", "data augmentation", "self-instruct", "evol-instruct", "training data generation"],
  "context_hint": "Inyectar sección 2 para SyntheticDataPipeline; sección 4 para genéricos y alucinación.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera generar datos sintéticos para fine-tuning, carga
synthetic-data-generation-pipelines. Usa Self-Instruct con seed tasks diversas
y filtrado de calidad. Para mayor complejidad, aplica Evol-Instruct.
Verifica factibilidad con segundo LLM.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generar con distilabel
python -m distilabel pipeline --config pipeline.yaml --output ./dataset

# Ver dataset
python -c "from datasets import load_dataset; ds = load_dataset('json', data_files='data.jsonl'); print(ds)"

# Filtrar calidad
python filter_dataset.py --input data.jsonl --min-length 50 --dedup
```

### GUI / Web

- **Argilla**: Interfaz web para anotación, curado, y revisión de datos sintéticos
- **HuggingFace Dataset Viewer**: Visualización y filtrado de datasets
- **Distilabel Dashboard**: Monitoreo de pipeline de generación

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar datos | `python generate.py --n 1000` | Argilla "Generate" |
| Revisar calidad | N/A | Argilla "Review queue" |

---

## 7. Cheatsheet Rápido

```python
# Self-Instruct: seed tasks → LLM genera instruction+input+output
# Evol-Instruct: añadir constraints, deepen, concretize
# Filtros: dedup, min_length=5, evitar toxicidad
# Diversidad: muestreo por dominio (code, science, writing)
# Verificación: segundo LLM chequea factibilidad
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-llm-fine-tuning-lora-qlora` | Complementario (datos sintéticos para fine-tuning) | Sí |
| `35-llm-integration-patterns` | Complementario (uso de API para generación) | Sí |
| `18-structured-outputs-json-schema` | Complementario (estructurar outputs generados) | No |
| `22-reinforcement-learning-human-feedback` | Complementario (preferencias sintéticas) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: synthetic-data-generation-pipelines
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [synthetic-data, self-instruct, evol-instruct, data-augmentation, distilabel, training-data]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

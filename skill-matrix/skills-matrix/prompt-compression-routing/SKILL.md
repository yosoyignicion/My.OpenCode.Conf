---
name: prompt-compression-routing
description: "Sistema que optimiza el uso de LLMs mediante dos mecanismos: compresión de prompts (eliminar tokens no esenciales usando modelos pequeños como LLMLingua) y enrutamiento de consultas (clasificar la ..."
---
# prompt-compression-routing

## Semantic Triggers
```
prompt compression, llm routing, prompt routing, query classification, prompt optimization, inference routing, LLMLingua, Selective Context, budget-aware routing
```

---

## 1. Definición Teórica

Sistema que optimiza el uso de LLMs mediante dos mecanismos: compresión de prompts (eliminar tokens no esenciales usando modelos pequeños como LLMLingua) y enrutamiento de consultas (clasificar la consulta y dirigirla al modelo óptimo según complejidad, dominio y presupuesto). Resuelve el dilema coste-calidad-latencia: las consultas simples no necesitan el modelo más caro, y los prompts largos pueden comprimirse 2-5x con mínima pérdida de calidad.

---

## 2. Implementación de Referencia

Librerías: LLMLingua (Microsoft), LangChain Router, LiteLLM para routing multi-provider. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from llmlingua import PromptCompressor
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import RandomForestClassifier
import numpy as np

class SmartRouter:
    def __init__(self):
        self.compressor = PromptCompressor(
            model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank"
        )
        self.classifier = self._train_classifier()
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
        self.model_tiers = {
            "simple": {"model": "gpt-4o-mini", "cost_per_1k": 0.00015, "max_tokens": 128000},
            "medium": {"model": "gpt-4o", "cost_per_1k": 0.0025, "max_tokens": 128000},
            "complex": {"model": "claude-sonnet-4-20250514", "cost_per_1k": 0.003, "max_tokens": 200000},
            "creative": {"model": "claude-sonnet-4-20250514", "cost_per_1k": 0.003, "max_tokens": 200000},
        }

    def _train_classifier(self):
        # In production: train on labeled query logs
        return RandomForestClassifier(n_estimators=100)

    def classify(self, query: str) -> str:
        emb = self.encoder.encode(query)
        # Simple rule-based router (in production: use classifier predict)
        if len(query.split()) < 10:
            return "simple"
        if any(kw in query.lower() for kw in ["code", "debug", "implement", "fix"]):
            return "complex"
        if any(kw in query.lower() for kw in ["poem", "story", "creative"]):
            return "creative"
        return "medium"

    async def route(self, query: str, context: str | None = None) -> dict:
        tier = self.classify(query)
        model_config = self.model_tiers[tier]

        # Compress context if present
        if context and len(context) > 2000:
            compressed = self.compressor.compress_prompt(
                context=[context],
                instruction=query,
                ratio=0.5,
                condition_compare=True,
                condition_instruct=True,
            )
            context = compressed["compressed_prompt"]

        return {
            "model": model_config["model"],
            "tier": tier,
            "estimated_cost": len(query.split()) * model_config["cost_per_1k"] / 1000,
            "compressed": context is not None and len(context) < len(context or ""),
        }

router = SmartRouter()
result = await router.route("Write a Python function to sort a list", context=long_context)
print(f"Routing to {result['model']} (tier: {result['tier']})")
```

**Fuente oficial:** https://github.com/microsoft/LLMLingua

### Alternativa de Implementación Específica

Usar LiteLLM con `Router` para failover automático entre proveedores (OpenAI → Anthropic → OpenRouter) en lugar de routing por coste.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas con alta variabilidad de consultas (desde "hola" hasta "implementa un kernel Linux"), equipos con presupuesto ajustado de API. |
| **Cuándo evitar** | Sistemas con un solo tipo de consulta (siempre código, siempre chat simple); el router añade latencia sin beneficio. |
| **Alternativas** | 1) LLMLingua (compresión). 2) LiteLLM Router (failover). 3) Clasificador simple por reglas. |
| **Coste/Complejidad** | Medio: el clasificador necesita datos etiquetados. LLMLingua requiere GPU para velocidad. El ahorro en API puede ser 40-60%. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: La compresión elimina información crítica del contexto

**¿Qué ocasionó el error?**
LLMLingua con ratio 0.3 (eliminar 70%) en un prompt con código Python donde cada línea es importante.

**¿Cómo se solucionó?**
Usar `condition_instruct=True` y `condition_compare=True` para preservar tokens relevantes a la instrucción. Además, establecer un ratio mínimo de 0.5 para prompts con código.

**¿Por qué funciona esta técnica?**
LLMLingua puede condicionar la compresión a la instrucción, preservando tokens relacionados semánticamente. Los ratios conservadores para código evitan pérdida de sintaxis.

### Caso: El router envía consultas complejas al modelo barato

**¿Qué ocasionó el error?**
El clasificador de reglas no detectó una consulta compleja porque usaba palabras simples ("haz un sitio web completo con auth y base de datos" clasificado como "simple").

**¿Cómo se solucionó?**
Añadir un clasificador de embeddings con RandomForest entrenado en logs históricos de éxito/fracaso por modelo, y un fallback: si el modelo barato falla, re-enrutar al caro.

**¿Por qué funciona esta técnica?**
El embedding captura complejidad semántica que las palabras clave no detectan. El fallback con re-ruteo es tolerante a errores de clasificación.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "compresión de prompts" "routing de consultas" "optimizar coste LLM"
- **Prioridad de carga:** Alta — impacto directo en coste operativo del agente
- **Dependencias:** `03-context-token-budgeting`, `35-llm-integration-patterns`

### Tool Integration

```json
{
  "tool_name": "prompt-compression-routing",
  "description": "Compresión de prompts con LLMLingua y enrutamiento inteligente de consultas al modelo óptimo según complejidad, dominio y coste.",
  "triggers": ["prompt compression", "llm routing", "prompt optimization", "query classification"],
  "context_hint": "Inyectar sección 2 para la clase SmartRouter; sección 4 para errores de compresión y routing.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera optimizar costes de LLM o comprimir prompts, carga
prompt-compression-routing. Usa LLMLingua con condition_instruct=True para compresión
segura, y clasificador por embeddings para routing. Ratio mínimo 0.5 para código.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# LLMLingua CLI
llmlingua-compress --input prompt.txt --ratio 0.5 --condition-instruct --output compressed.txt

# LiteLLM proxy con routing
litellm --model gpt-4o-mini --fallbacks anthropic/claude-sonnet-4 --num_retries 2
```

### GUI / Web

- **LiteLLM Dashboard**: Monitor de rutas, costes por modelo, latencia, y fallbacks
- **LangSmith**: Trazas de compresión con ratio, tokens ahorrados, y calidad percibida
- **LLMLingua Web**: (huggingface.co/spaces) Probar compresión interactivamente

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Comprimir prompt | `llmlingua-compress ...` | LLMLingua Web "Compress" |
| Ver costes por ruta | `litellm --cost` | LiteLLM Dashboard |

---

## 7. Cheatsheet Rápido

```python
from llmlingua import PromptCompressor
c = PromptCompressor()
compressed = c.compress_prompt(context=[text], instruction=query, ratio=0.5,
                               condition_compare=True, condition_instruct=True)
# Routing: simple→gpt-4o-mini, medium→gpt-4o, complex→claude-sonnet-4
# Fallback: si falla modelo barato → re-enrutar a caro
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-context-token-budgeting` | Complementario (gestión de presupuesto de tokens) | Sí |
| `35-llm-integration-patterns` | Complementario (integración multi-provider) | Sí |
| `30-zero-token-optimization` | Complementario (política de respuesta mínima) | No |
| `34-autoprompting-engineering` | Complementario (diseño de prompts comprimibles) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: prompt-compression-routing
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [prompt-compression, llm-routing, llmlingua, cost-optimization, query-classification, litellm]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: llm-inference-engines-vllm
description: "Motor de inferencia optimizado para servir LLMs en producción, implementando PagedAttention (gestión de memoria KV-cache mediante páginas no contiguas para eliminar fragmentación) y continuous batc..."
---
# llm-inference-engines-vllm

## Semantic Triggers
```
vllm, llm inference engine, continuous batching, pagedattention, llm serving, inference optimization, speculative decoding, tensorrt-llm, tgi
```

---

## 1. Definición Teórica

Motor de inferencia optimizado para servir LLMs en producción, implementando PagedAttention (gestión de memoria KV-cache mediante páginas no contiguas para eliminar fragmentación) y continuous batching (añadir/remover peticiones dinámicamente por paso de decodificación). Resuelve el problema de que la inferencia ingenua de LLMs es ineficiente: la KV-cache fragmentada desperdicia memoria y el batching estático deja GPUs infrautilizadas.

---

## 2. Implementación de Referencia

vLLM (estándar de facto), TensorRT-LLM (NVIDIA, máximo throughput), TGI (HuggingFace). Python 3.12+, GPU NVIDIA A100/H100 o AMD MI300.

### Ejemplo Práctico Avanzado

```python
# vLLM server (CLI)
# vllm serve meta-llama/Llama-3.1-8B-Instruct \
#   --dtype bfloat16 \
#   --max-model-len 8192 \
#   --gpu-memory-utilization 0.90 \
#   --tensor-parallel-size 2 \
#   --api-key token-abc123

from openai import AsyncOpenAI
import asyncio

client = AsyncOpenAI(
    base_url="http://localhost:8000/v1",
    api_key="token-abc123"
)

async def batch_inference(prompts: list[str]):
    tasks = []
    for prompt in prompts:
        task = client.chat.completions.create(
            model="meta-llama/Llama-3.1-8B-Instruct",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
            temperature=0.7,
        )
        tasks.append(task)

    # vLLM handles continuous batching internally
    responses = await asyncio.gather(*tasks)
    return [r.choices[0].message.content for r in responses]

# Speculative decoding with vLLM
async def speculative_generate(prompt: str):
    response = await client.completions.create(
        model="meta-llama/Llama-3.1-8B-Instruct",
        prompt=prompt,
        max_tokens=256,
        extra_body={
            "speculative_model": "google/gemma-2-2b-it",
            "num_speculative_tokens": 5,
        }
    )
    return response.choices[0].text

results = asyncio.run(batch_inference([
    "Explain quantum computing",
    "Write a haiku",
    "What is Python?",
]))
```

**Fuente oficial:** https://docs.vllm.ai/en/latest/

### Alternativa de Implementación Específica

Usar Ollama para despliegue local simplificado. Menos throughput pero configuración trivial: `ollama run llama3.1:8b`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Serving de LLM en producción, APIs con alta concurrencia, fine-tuning seguido de despliegue. |
| **Cuándo evitar** | Prototipos rápidos (usa Ollama), un solo usuario (usa inferencia directa con transformers). |
| **Alternativas** | 1) vLLM (mejor ecosistema). 2) TensorRT-LLM (máximo throughput NVIDIA). 3) TGI (HuggingFace, fácil integración). |
| **Coste/Complejidad** | Alto: requiere GPU dedicada (≥24GB VRAM para 8B). vLLM añade overhead operativo (monitoreo, escalado). |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: vLLM OOM incluso con modelo pequeño (7B)

**¿Qué ocasionó el error?**
`gpu-memory-utilization=0.95` deja muy poca memoria para la KV-cache de PagedAttention cuando hay muchas peticiones concurrentes.

**¿Cómo se solucionó?**
Reducir `gpu-memory-utilization` a 0.80-0.85, limitar `max-num-seqs` a 128, y habilitar `--swap-space 16` para usar CPU RAM como swap de KV-cache.

**¿Por qué funciona esta técnica?**
PagedAttention necesita memoria para sus page tables y bloques físicos. Reservar menos memoria para el modelo deja más espacio para el planificador de batching. El swap-space permite overflow a RAM.

### Caso: La latencia por token es alta (30+ ms/token)

**¿Qué ocasionó el error?**
`tensor-parallel-size=1` para un modelo 70B en GPU A100 80GB. Sin paralelismo entre GPUs, la inferencia de modelos grandes es lenta.

**¿Cómo se solucionó?**
Configurar `--tensor-parallel-size 4` (4 GPUs) para distribuir capas del transformer, y `--pipeline-parallel-size 2` para paralelismo de pipeline.

**¿Por qué funciona esta técnica?**
Tensor parallelism divide los pesos entre GPUs, reduciendo el cómputo por GPU. Pipeline parallelism solapa cómputo y comunicación.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimados al invocar este skill
- **Trigger de activación:** "vllm" "inferencia LLM" "servir modelo" "despliegue LLM en producción"
- **Prioridad de carga:** Alta — infraestructura crítica para servir modelos propios
- **Dependencias:** `25-quantization-gguf-awq-gptq`, `06-llm-fine-tuning-lora-qlora`

### Tool Integration

```json
{
  "tool_name": "llm-inference-engines-vllm",
  "description": "Despliegue y serving de LLMs con vLLM: PagedAttention, continuous batching, speculative decoding, tensor parallelism. Incluye benchmark de alternativas TGI y TRT-LLM.",
  "triggers": ["vllm", "inference engine", "llm serving", "continuous batching", "pagedattention"],
  "context_hint": "Inyectar sección 2 para despliegue; sección 4 para OOM y latencia alta.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera servir un LLM propio en producción, carga llm-inference-engines-vllm
y usa vLLM con bfloat16, gpu-memory-utilization=0.85, y tensor-parallel-size=2
para modelos 8B. Para modelos 70B+, añadir pipeline-parallel-size.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Iniciar servidor vLLM
vllm serve meta-llama/Llama-3.1-8B-Instruct --dtype bfloat16 --port 8000

# Probar inferencia
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/Llama-3.1-8B-Instruct","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'

# Ver métricas
curl http://localhost:8000/metrics  # Prometheus format
```

### GUI / Web

- **vLLM Dashboard**: http://localhost:8000/docs (Swagger) + /metrics (Prometheus)
- **Grafana**: Dashboard pre-construido para métricas vLLM (throughput, latencia p50/p99, utilización GPU)
- **Ollama WebUI**: Interfaz tipo ChatGPT para Ollama

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar servidor | `vllm serve ...` | Ollama "Start" |
| Ver métricas | `curl /metrics` | Grafana dashboard |

---

## 7. Cheatsheet Rápido

```bash
# vLLM serve: bfloat16, gpu-memory-utilization=0.85, tensor-parallel-size=N
# OOM fix: reducir max-num-seqs, --swap-space 16
# Latencia alta: aumentar tensor-parallel-size
# Especulación: --speculative-model gemma-2-2b --num-speculative-tokens 5
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `25-quantization-gguf-awq-gptq` | Complementario (modelos cuantizados para inferencia) | Sí |
| `06-llm-fine-tuning-lora-qlora` | Complementario (servir modelos fine-tuned) | Sí |
| `16-streaming-llm-outputs-sse` | Complementario (streaming desde vLLM) | No |
| `35-llm-integration-patterns` | Complementario (cliente para vLLM) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: llm-inference-engines-vllm
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [vllm, inference-engine, pagedattention, continuous-batching, speculative-decoding, tensorrt-llm]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

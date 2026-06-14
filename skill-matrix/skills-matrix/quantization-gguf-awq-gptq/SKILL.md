---
name: quantization-gguf-awq-gptq
description: "Técnicas de compresión de modelos LLM reduciendo la precisión numérica de sus pesos (FP16→INT4/INT8), disminuyendo el uso de memoria 2-6x con mínima pérdida de calidad"
---
# quantization-gguf-awq-gptq

## Semantic Triggers
```
gguf quantization, awq quantization, gptq quantization, model compression, llm quantization, weight quantization, bitsandbytes, nf4, int4, int8 calibration dataset
```

---

## 1. Definición Teórica

Técnicas de compresión de modelos LLM reduciendo la precisión numérica de sus pesos (FP16→INT4/INT8), disminuyendo el uso de memoria 2-6x con mínima pérdida de calidad. GGUF (CPU/GPU híbrido via llama.cpp), AWQ (activación-aware, INT4), GPTQ (Hessian-based, INT3/INT4), y NF4 (4-bit NormalFloat para QLoRA). Resuelve el problema de que los LLM requieren VRAM proporcional a su tamaño (80GB+ para 70B en FP16), haciendo inviable su ejecución en hardware de consumo.

---

## 2. Implementación de Referencia

Librerías: `llama.cpp` (GGUF), `autoawq` (AWQ), `autogptq` (GPTQ), `bitsandbytes` (NF4). Python 3.12+. Soporte CPU y GPU.

### Ejemplo Práctico Avanzado

```python
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer
import torch

# === AWQ Quantization ===
model_name = "meta-llama/Llama-3.1-8B"
model = AutoAWQForCausalLM.from_pretrained(model_name, device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(model_name)

quant_config = {
    "zero_point": True,       # Enable zero-point quantization
    "q_group_size": 128,      # Group size for quantization (128 = default)
    "w_bit": 4,               # Bits per weight (4 = INT4)
    "version": "GEMM",        # GEMM (GPU) or GEMV (CPU)
    "calib_dataset": "c4",    # Calibration dataset
    "calib_samples": 128,     # Number of calibration samples
}

model.quantize(tokenizer, quant_config=quant_config)
model.save_quantized("./llama-8b-awq")

# === GGUF Conversion (CLI) ===
# python -m llama_cpp.quantize ./llama-8b-fp16.gguf ./llama-8b-q4.gguf q4_K_M
# Quantization types: q2_K, q3_K_M, q4_K_M, q5_K_M, q8_0

# === Inference with quantized model ===
from awq import AutoAWQForCausalLM
model = AutoAWQForCausalLM.from_quantized("./llama-8b-awq", device="cuda:0")
inputs = tokenizer("Quantum computing is", return_tensors="pt").to("cuda:0")
outputs = model.generate(**inputs, max_new_tokens=50)
print(tokenizer.decode(outputs[0]))

# Compare memory usage
def memory_usage():
    allocated = torch.cuda.memory_allocated() / 1024**3
    reserved = torch.cuda.memory_reserved() / 1024**3
    return f"Allocated: {allocated:.2f}GB, Reserved: {reserved:.2f}GB"

# FP16: ~16GB for 8B, INT4 AWQ: ~5GB, Q4_K_M GGUF: ~4.5GB
```

**Fuente oficial:** https://github.com/casper-hansen/AutoAWQ

### Alternativa de Implementación Específica

Para CPU-only o edge devices, usar `llama.cpp` con GGUF Q4_K_M: mejor equilibrio entre tamaño (4.5GB para 8B) y calidad (perplejidad +0.2 vs FP16). Usar Ollama para gestión simplificada.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Despliegue en hardware limitado (GPUs ≤24GB, CPU, edge), servir múltiples modelos simultáneamente. |
| **Cuándo evitar** | Investigación que requiere precisión máxima (pérdida de perplejidad <0.1 puede ser relevante). |
| **Alternativas** | 1) AWQ (mejor calidad INT4 para GPU). 2) GGUF Q4_K_M (mejor balance CPU/GPU). 3) GPTQ (batch inference GPU). |
| **Coste/Complejidad** | Bajo-Medio: la cuantización es un proceso único (1-4h). AWQ/GPTQ requieren dataset de calibración (128 muestras). |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: AWQ da error de CUDA OOM durante la calibración

**¿Qué ocasionó el error?**
El dataset de calibración (128 muestras de 2048 tokens) en modelo 8B supera la VRAM de GPU de 8GB durante el forward pass de calibración.

**¿Cómo se solucionó?**
Reducir `calib_samples=64`, `calib_seq_len=1024`, y usar `device_map="sequential"` para distribuir capas entre CPU y GPU.

**¿Por qué funciona esta técnica?**
Menos muestras y secuencias más cortas reducen la memoria de activaciones. Sequential device map permite overflow a RAM sistema.

### Caso: El modelo cuantizado (Q4_K_M) pierde precisión en tareas de código

**¿Qué ocasionó el error?**
La cuantización simétrica de GGUF Q4_K_M elimina información de pesos pequeños que son críticos para tareas de razonamiento preciso como código o matemáticas.

**¿Cómo se solucionó?**
Usar Q5_K_M (5 bits) para tareas de precisión, o AWQ INT4 que preserva mejor pesos importantes mediante scaling por activación.

**¿Por qué funciona esta técnica?**
Más bits preservan más información. AWQ escala pesos basado en distribuciones de activación, protegiendo los pesos más impactados para la salida.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "cuantizar modelo" "gguf" "awq" "gptq" "reducir tamaño modelo"
- **Prioridad de carga:** Alta — necesario para ejecutar modelos localmente
- **Dependencias:** `06-llm-fine-tuning-lora-qlora`, `12-llm-inference-engines-vllm`

### Tool Integration

```json
{
  "tool_name": "quantization-gguf-awq-gptq",
  "description": "Cuantización de LLMs: AWQ (GPU), GGUF (CPU/GPU híbrido), GPTQ (batch). Calibración, comparativa de calidad, y troubleshooting de OOM.",
  "triggers": ["quantization", "gguf", "awq", "gptq", "model compression", "4bit", "8bit"],
  "context_hint": "Inyectar sección 2 para AWQ; sección 4 para OOM y pérdida de precisión.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera reducir el tamaño de un LLM para ejecutarlo localmente, carga
quantization-gguf-awq-gptq. Para GPU recomienda AWQ INT4, para CPU GGUF Q4_K_M.
Para tareas de código, usa Q5_K_M o AWQ en lugar de Q4_K_M.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# AWQ quantization
python -m awq.quantize --model_path meta-llama/Llama-3.1-8B --quant_path ./awq-8b

# GGUF quantization (via llama.cpp)
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
python convert.py ./llama-8b-fp16/ --outfile llama-8b.gguf
./quantize llama-8b.gguf llama-8b-q4.gguf q4_K_M

# Probar modelo cuantizado
ollama run llama3.1:8b-q4_K_M
```

### GUI / Web

- **Ollama Library** (ollama.com/library): Modelos GGUF pre-cuantizados listos para usar
- **HuggingFace Model Hub**: Filtro por quantization "awq", "gptq", "gguf"
- **LM Studio**: GUI para descargar y probar modelos GGUF cuantizados

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Cuantizar AWQ | `python -m awq.quantize ...` | LM Studio "Quantize" |
| Probar modelo | `ollama run llama3.1:8b` | LM Studio "Start server" |

---

## 7. Cheatsheet Rápido

```bash
# AWQ: mejor calidad GPU INT4. Uso: python -m awq.quantize ...
# GGUF: CPU/GPU híbrido. q4_K_M = mejor balance calidad/tamaño
# GPTQ: batch GPU, requiere calibración
# Memoria: FP16=16GB, INT4=5GB, Q4_K_M=4.5GB (para 8B)
# Precisión: AWQ ≈ Q5_K_M > Q4_K_M > Q3_K_M > Q2_K
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-llm-fine-tuning-lora-qlora` | Complementario (QLoRA usa NF4 quantization) | Sí |
| `12-llm-inference-engines-vllm` | Complementario (vLLM soporta AWQ/GPTQ) | Sí |
| `05-vector-db-indexing-hnsw` | No relacionado | No |
| `30-zero-token-optimization` | No relacionado | No |

---

## 9. Metadatos del Skill

```yaml
---
id: quantization-gguf-awq-gptq
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [quantization, gguf, awq, gptq, bitsandbytes, nf4, model-compression, llama-cpp]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

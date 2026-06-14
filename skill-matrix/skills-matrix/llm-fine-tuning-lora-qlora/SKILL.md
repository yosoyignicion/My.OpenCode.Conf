---
name: llm-fine-tuning-lora-qlora
description: "Parameter-Efficient Fine-Tuning (PEFT) actualiza solo un pequeño subconjunto de parámetros del LLM mediante matrices de bajo rango (LoRA) o versiones cuantizadas (QLoRA)"
---
# llm-fine-tuning-lora-qlora

## Semantic Triggers
```
lora finetuning, qlora, parameter efficient fine tuning, peft, llm adaptation, fine tuning strategy, rank selection, target modules, nf4 quantization, peft lora config
```

---

## 1. Definición Teórica

Parameter-Efficient Fine-Tuning (PEFT) actualiza solo un pequeño subconjunto de parámetros del LLM mediante matrices de bajo rango (LoRA) o versiones cuantizadas (QLoRA). LoRA descompone la actualización de pesos en matrices A (d×r) y B (r×k) donde r<<min(d,k), reduciendo los parámetros entrenables de miles de millones a millones. Resuelve el problema de que el fine-tuning completo de modelos grandes (70B+) requiere GPUs múltiples inaccesibles para la mayoría de equipos.

---

## 2. Implementación de Referencia

Librerías: HuggingFace `peft` + `transformers` + `bitsandbytes`. Python 3.12+, GPU con ≥8GB VRAM para QLoRA 8B.

### Ejemplo Práctico Avanzado

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import Dataset
import torch

model_name = "meta-llama/Llama-3.1-8B"
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

# QLoRA: 4-bit NF4 quantization
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config={"load_in_4bit": True, "bnb_4bit_quant_type": "nf4"},
    device_map="auto",
    torch_dtype=torch.bfloat16,
)
model = prepare_model_for_kbit_training(model)

# LoRA config
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~0.5% of parameters

# Format dataset as ChatML
def format_chat(example):
    return {
        "text": tokenizer.apply_chat_template(
            [{"role": "user", "content": example["instruction"]},
             {"role": "assistant", "content": example["output"]}],
            tokenize=False
        )
    }

dataset = Dataset.from_list([{"instruction": "Say hello", "output": "Hello!"}])
dataset = dataset.map(format_chat)

# Train
training_args = TrainingArguments(
    output_dir="./lora-out",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=3,
)
model.train()
trainer = TrainingArguments()  # Use SFTTrainer in practice
```

**Fuente oficial:** https://huggingface.co/docs/peft/en/developer_guides/lora

### Alternativa de Implementación Específica

Usar `unsloth` para 2x velocidad de entrenamiento con kernels optimizados, manteniendo compatibilidad con LoRA/QLoRA de peft.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Adaptar modelo a dominio específico, nuevo estilo de salida, o conocimiento especializado. |
| **Cuándo evitar** | El modelo base ya funciona bien; prefiera prompting o RAG antes que fine-tuning. |
| **Alternativas** | 1) Prompt engineering (sin entrenamiento). 2) RAG + in-context learning. 3) Fine-tuning completo (máxima calidad, mínimo 8x GPUs). |
| **Coste/Complejidad** | Medio: requiere GPU con ≥8GB VRAM. La preparación del dataset es el cuello de botella principal. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El modelo fine-tuneado olvida cómo seguir instrucciones generales

**¿Qué ocasionó el error?**
Catastrophic forgetting: el fine-tuning en un dataset muy específico (ej. solo SQL) hace que el modelo pierda la capacidad de seguir instrucciones genéricas.

**¿Cómo se solucionó?**
Mezclar datos de entrenamiento: 70% dominio-específico + 30% datos de instrucción general (OpenAssistant, Dolly). Además, usar LoRA con rank bajo (r=8) para limitar el espacio de actualización.

**¿Por qué funciona esta técnica?**
El rank bajo limita cuánto pueden desviarse los pesos del modelo base. La mezcla de datos preserva las capacidades generales mientras aprende las específicas.

### Caso: QLoRA da OOM en GPU de 8GB con modelo 8B

**¿Qué ocasionó el error?**
El tamaño de batch (4) sumado al gradiente accumulation (4) y al sequence length (2048) excede la VRAM disponible.

**¿Cómo se solucionó?**
Reducir `per_device_train_batch_size=1`, `gradient_accumulation_steps=8`, activar `gradient_checkpointing=True`, y usar `torch.compile`.

**¿Por qué funciona esta técnica?**
Gradient checkpointing intercambia memoria por cómputo (recalcula activaciones en lugar de almacenarlas). Batch pequeño + accumulation mantiene el batch efectivo sin pico de VRAM.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimados al invocar este skill
- **Trigger de activación:** "fine tuning" "lora" "qlora" "adaptar modelo"
- **Prioridad de carga:** Alta — tarea común de personalización de LLMs
- **Dependencias:** `25-quantization-gguf-awq-gptq`, `23-synthetic-data-generation-pipelines`

### Tool Integration

```json
{
  "tool_name": "llm-fine-tuning-lora-qlora",
  "description": "Fine-tuning eficiente de LLMs con LoRA y QLoRA usando HuggingFace PEFT, bitsandbytes, y datasets. Configuración de rank, target modules, y prevención de catastrophic forgetting.",
  "triggers": ["lora", "qlora", "fine tuning", "peft", "parameter efficient fine tuning"],
  "context_hint": "Inyectar sección 2 para código de entrenamiento; sección 4 para troubleshooting de OOM y forgetting.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte cómo fine-tunear un LLM, carga llm-fine-tuning-lora-qlora
y usa QLoRA con bitsandbytes 4-bit + LoRA rank=16 como configuración inicial.
Si menciona "8GB GPU", prioriza gradient_checkpointing y batch_size=1.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Entrenar con PeFT + HuggingFace
python train_lora.py --model meta-llama/Llama-3.1-8B --dataset ./data.jsonl --output ./lora-adapter

# Unsloth (2x velocidad)
python -m unsloth.train --model unsloth/llama-3-8b --dataset alpaca --lora r=16

# Evaluar adaptador
python evaluate_lora.py --base-model meta-llama/Llama-3.1-8B --adapter ./lora-adapter
```

### GUI / Web

- **HuggingFace AutoTrain**: Interfaz web para fine-tuning sin código
- **Weights & Biases**: Dashboard de métricas de entrenamiento (loss, grad norms, learning rate)
- **Axolotl UI**: Interfaz YAML-based para configurar fine-tuning

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Entrenar | `python train_lora.py` | AutoTrain "Start training" |
| Ver métricas | N/A | W&B dashboard |

---

## 7. Cheatsheet Rápido

```python
from peft import LoraConfig, get_peft_model
# r=16, alpha=32, dropout=0.05 → ~0.5% params
# target_modules: q_proj+v_proj (default), añadir k_proj+o_proj para más capacidad
# QLoRA: load_in_4bit=True, bnb_4bit_quant_type="nf4"
# LR: 1e-4 a 5e-4. Dataset: 70% domain + 30% general
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `25-quantization-gguf-awq-gptq` | Complementario (cuantización para inferencia post-tuning) | Sí |
| `23-synthetic-data-generation-pipelines` | Complementario (generar datos de entrenamiento) | Sí |
| `12-llm-inference-engines-vllm` | Complementario (servir modelo fine-tuneado) | No |
| `22-reinforcement-learning-human-feedback` | Superconjunto (RLHF usa LoRA como base) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: llm-fine-tuning-lora-qlora
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [lora, qlora, peft, fine-tuning, huggingface, bitsandbytes, nf4, sft]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: reinforcement-learning-human-feedback
description: "Pipeline de alineación de LLMs que usa preferencias humanas para ajustar el comportamiento del modelo: primero se entrena un Reward Model (RM) que predice la preferencia humana entre dos respuestas..."
---
# reinforcement-learning-human-feedback

## Semantic Triggers
```
rlhf, reinforcement learning human feedback, dpo, ppo alignment, preference optimization, human feedback training, reward model, kta, orpo
```

---

## 1. Definición Teórica

Pipeline de alineación de LLMs que usa preferencias humanas para ajustar el comportamiento del modelo: primero se entrena un Reward Model (RM) que predice la preferencia humana entre dos respuestas, luego se optimiza el LLM mediante PPO para maximizar la recompensa predicha mientras se minimiza la divergencia KL con el modelo base. DPO simplifica esto eliminando el RM explícito y optimizando directamente sobre pares de preferencias. Resuelve el problema de que el fine-tuning supervisado (SFT) no captura preferencias humanas sutiles como estilo, seguridad, o utilidad relativa.

---

## 2. Implementación de Referencia

Librerías: TRL (HuggingFace), Axolotl, Unsloth. Modelos: Llama 3.1, Qwen 2.5. Python 3.12+, GPU ≥24GB.

### Ejemplo Práctico Avanzado

```python
from datasets import Dataset
from trl import DPOTrainer, DPOConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Prepare preference dataset
pref_data = [
    {
        "prompt": "Explain quantum computing",
        "chosen": "Quantum computing uses qubits... [detailed correct answer]",
        "rejected": "It's like magic computers. [vague incorrect answer]",
    },
    # ... more examples
]
dataset = Dataset.from_list(pref_data)

model_name = "meta-llama/Llama-3.1-8B"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "left"

# DPO training
dpo_config = DPOConfig(
    output_dir="./dpo-llama",
    beta=0.1,  # KL penalty strength
    learning_rate=5e-7,  # Lower LR than SFT
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    max_length=2048,
    max_prompt_length=1024,
    num_train_epochs=1,
    logging_steps=10,
    save_steps=500,
)

trainer = DPOTrainer(
    model=model,
    ref_model=None,  # Auto-loaded reference model for KL divergence
    args=dpo_config,
    train_dataset=dataset,
    tokenizer=tokenizer,
    max_length=2048,
    max_prompt_length=1024,
)

trainer.train()
trainer.save_model("./dpo-llama-final")

# Evaluate alignment
def test_alignment(prompt: str) -> dict:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=100, do_sample=True, temperature=0.7)
    return {"response": tokenizer.decode(outputs[0], skip_special_tokens=True)}
```

**Fuente oficial:** https://huggingface.co/docs/trl/en/dpo_trainer

### Alternativa de Implementación Específica

ORPO (Odds Ratio Preference Optimization): integra SFT y alineación en un solo paso, sin necesidad de modelo de referencia separado. Más simple pero menos probado que DPO.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Alinear modelo con valores humanos, reducir toxicidad, mejorar estilo de respuesta, ajustar a preferencias de marca. |
| **Cuándo evitar** | El modelo base ya está alineado (GPT-4o, Claude); el fine-tuning adicional puede degradar. |
| **Alternativas** | 1) PPO (tradicional, requiere RM). 2) DPO (simple, sin RM). 3) KTO (sin pares, solo preferencia binaria). |
| **Coste/Complejidad** | Alto: requiere dataset de preferencias (costoso de crear), GPU para entrenamiento, y evaluación cuidadosa de regresión. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: DPO degrada la capacidad del modelo en tareas generales

**¿Qué ocasionó el error?**
Over-optimization: el modelo aprende a maximizar la preferencia a costa de perder capacidad general, especialmente si el dataset de preferencias es pequeño o sesgado.

**¿Cómo se solucionó?**
Usar un beta (KL penalty) más alto (0.2-0.5) para restringir la desviación del modelo base, y mezclar datos de SFT general (30%) con los datos de preferencias (70%).

**¿Por qué funciona esta técnica?**
Beta alto penaliza la divergencia KL, manteniendo el modelo cerca del base. Los datos de SFT mixtos preservan capacidades generales.

### Caso: El Reward Model da scores inconsistentes

**¿Qué ocasionó el error?**
El Reward Model fue entrenado con pocos datos (500 pares) y no generaliza bien, dando rewards ruidosos que desestabilizan PPO.

**¿Cómo se solucionó?**
Cambiar a DPO (elimina el RM), o mejorar el RM con 5000+ pares, regularización (label smoothing), y ensemble de 3 RMs para reducir varianza.

**¿Por qué funciona esta técnica?**
DPO elimina la dependencia del RM ruidoso. El ensemble de RMs promedia el error. Más datos mejoran la generalización del RM.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimados al invocar este skill
- **Trigger de activación:** "rlhf" "dpo" "alineación de LLM" "preference optimization" "human feedback"
- **Prioridad de carga:** Media — importante pero costoso, no para uso diario
- **Dependencias:** `06-llm-fine-tuning-lora-qlora`, `23-synthetic-data-generation-pipelines`

### Tool Integration

```json
{
  "tool_name": "reinforcement-learning-human-feedback",
  "description": "Alineación de LLMs con RLHF/DPO: dataset de preferencias, DPO trainer con TRL, KL penalty, evaluación de regresión. PPO como alternativa avanzada.",
  "triggers": ["rlhf", "dpo", "preference optimization", "alignment", "human feedback"],
  "context_hint": "Inyectar sección 2 para DPO con TRL; sección 4 para degradación y RM inconsistente.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera alinear un LLM con preferencias humanas, carga
reinforcement-learning-human-feedback. Usa DPO con TRL, beta=0.1-0.2,
y mezcla 30% datos SFT. Para datasets pequeños, prefiere DPO sobre PPO.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# DPO training
python train_dpo.py --model meta-llama/Llama-3.1-8B --dataset preferences.jsonl --beta 0.1

# Evaluar alignment
python eval_alignment.py --model ./dpo-final --test-set test.jsonl

# Generar preferencias sintéticas
python generate_preferences.py --model gpt-4o --seed-tasks tasks.json --output pref.jsonl
```

### GUI / Web

- **Weights & Biases**: Dashboard de entrenamiento con reward scores, KL divergence, y accuracy del RM
- **HuggingFace AutoTrain**: Interfaz web para RLHF/DPO sin código
- **Argilla**: UI web para anotación de preferencias humanas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Entrenar DPO | `python train_dpo.py` | AutoTrain "Start DPO" |
| Ver recompensa | N/A | W&B "Reward chart" |

---

## 7. Cheatsheet Rápido

```python
from trl import DPOTrainer
# Dataset: {prompt, chosen, rejected}
# DPOConfig: beta=0.1, lr=5e-7, batch=2, grad_acc=8
# KL penalty: beta↑ = menos desviación del base
# Evaluar: test_loss, reward accuracy, comparar con baseline
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-llm-fine-tuning-lora-qlora` | Complementario (base para entrenamiento) | Sí |
| `23-synthetic-data-generation-pipelines` | Complementario (generar preferencias sintéticas) | Sí |
| `25-quantization-gguf-awq-gptq` | Complementario (cuantizar modelo alineado) | No |
| `17-agent-benchmarking-evaluation` | Complementario (evaluar calidad de alineación) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: reinforcement-learning-human-feedback
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [rlhf, dpo, ppo, alignment, preference-optimization, trl, reward-model, kta]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

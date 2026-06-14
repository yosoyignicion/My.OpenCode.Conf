---
name: context-token-budgeting
description: "Sistema de gestión del presupuesto de tokens en la ventana de contexto del LLM, asignando porcentajes fijos a cada componente (system prompt, historial, retrieved context) con prioridades de evicción"
---
# context-token-budgeting

## Semantic Triggers
```
token budget, context window management, token allocation, prompt compression, context pruning, token optimization strategy, sliding window, priority ring
```

---

## 1. Definición Teórica

Sistema de gestión del presupuesto de tokens en la ventana de contexto del LLM, asignando porcentajes fijos a cada componente (system prompt, historial, retrieved context) con prioridades de evicción. Resuelve el problema de que las ventanas de contexto son finitas (128K-200K tokens) pero los agentes generan mucha más información de la que cabe, requiriendo sumarización, compresión y descarte estratégico.

---

## 2. Implementación de Referencia

Librerías recomendadas: `tiktoken` para conteo, `LLMLingua` para compresión, implementación manual para lógica de presupuesto. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
import tiktoken
from dataclasses import dataclass, field

@dataclass
class ContextBudget:
    max_tokens: int = 128_000
    usage: dict = field(default_factory=lambda: {"system": 0, "retrieval": 0, "history": 0, "scratchpad": 0})
    limits: dict = field(default_factory=lambda: {"system": 0.25, "retrieval": 0.40, "history": 0.25, "scratchpad": 0.10})

    def can_fit(self, tokens: int, slot: str) -> bool:
        return self.usage[slot] + tokens <= self.max_tokens * self.limits[slot]

    def allocate(self, text: str, slot: str) -> str | None:
        tokens = len(tiktoken.encoding_for_model("gpt-4o").encode(text))
        if self.can_fit(tokens, slot):
            self.usage[slot] += tokens
            return text
        return None

    def compress_slot(self, slot: str, ratio: float = 0.5):
        from llmlingua import PromptCompressor
        compressor = PromptCompressor()
        while self.usage[slot] > self.max_tokens * self.limits[slot]:
            compressed = compressor.compress_prompt(
                context=[f"token_budget:{self.usage[slot]}"],
                ratio=ratio
            )
            self.usage[slot] = int(self.usage[slot] * ratio)

    def priority_evict(self, keep_slots: list[str] | None = None):
        keep = keep_slots or ["system"]
        order = ["scratchpad", "history", "retrieval", "system"]
        for slot in order:
            if slot not in keep and self.usage[slot] > 0:
                self.usage[slot] = 0
```

**Fuente oficial:** https://github.com/microsoft/LLMLingua

### Alternativa de Implementación Específica

Para entornos sin GPU, usar compresión basada en reglas: eliminar líneas duplicadas, acortar rutas de archivos, truncar logs a últimas N líneas. Menos eficaz pero sin dependencias.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes con múltiples turnos de conversación, retrievals grandes, o ventanas de contexto limitadas (modelos antiguos). |
| **Cuándo evitar** | Modelos con contexto muy grande (>200K) donde el coste de compresión supera el beneficio; tareas de un solo turno. |
| **Alternativas** | 1) Sliding window simple (olvidar lo más antiguo). 2) Sumarización periódica. 3) Priority ring (nunca evictar ciertos slots). |
| **Coste/Complejidad** | Medio: LLMLingua requiere GPU para rendimiento. La lógica de presupuesto es simple de implementar pero difícil de afinar. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El agente pierde información crítica por evicción agresiva

**¿Qué ocasionó el error?**
El sistema de prioridad evictó el historial reciente porque el límite de `history` estaba en 25%, pero el usuario acababa de dar una instrucción importante.

**¿Cómo se solucionó?**
Implementar `priority_evict` que nunca toca el slot `system` y añade un flag `pinned=True` en mensajes críticos del usuario.

**¿Por qué funciona esta técnica?**
El pinning por contenido (instrucciones del usuario, confirmaciones) garantiza que la información no se pierda incluso bajo presión de tokens.

### Caso: LLMLingua comprime demasiado y pierde precisión semántica

**¿Qué ocasionó el error?**
Ratio de compresión >0.7 (eliminar 70% de tokens) con contexto técnico donde cada token importa (código, números).

**¿Cómo se solucionó?**
Usar compresión selectiva por slot: comprimir solo `history` y `scratchpad` (ratio 0.5), nunca `retrieval` o `system`. Además, para código usar ratio máximo 0.3.

**¿Por qué funciona esta técnica?**
Los slots de razonamiento (retrieval, system) contienen información densa donde cada token es significativo. El historial de conversación tiene más redundancia natural.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "gestión de tokens" "token budget" "context window full"
- **Prioridad de carga:** Alta — todo agente con múltiples turnos necesita esto
- **Dependencias:** `11-prompt-compression-routing`, `30-zero-token-optimization`

### Tool Integration

```json
{
  "tool_name": "context-token-budgeting",
  "description": "Gestión de presupuesto de tokens en ventana de contexto: asignación por slots, compresión con LLMLingua, evicción prioritaria, y sliding window.",
  "triggers": ["token budget", "context full", "ventana de contexto", "prompt too long"],
  "context_hint": "Inyectar sección 2 para implementación del budget manager; sección 4 para errores de evicción.",
  "output_format": "markdown",
  "max_tokens": 800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte cómo gestionar tokens o la ventana de contexto del LLM, carga
context-token-budgeting y aplica la clase ContextBudget con slots system/retrieval/history/scratchpad.
Prioriza implementación manual simple sobre LLMLingua.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Contar tokens de un archivo
python -c "import tiktoken; enc = tiktoken.encoding_for_model('gpt-4o'); print(len(enc.encode(open('file.txt').read())))"

# Probar compresión LLMLingua
llmlingua-compress --input prompt.txt --ratio 0.5 --output compressed.txt
```

### GUI / Web

- **OpenAI Tokenizer** (platform.openai.com/tokenizer): Visualizar cómo se tokeniza el texto
- **LangSmith Trace**: Monitor de tokens usados por llamada, por turno, y por sesión
- **Anthropic Console**: Dashboard de uso de contexto con advertencias de límite

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Contar tokens | `python -c "..."` | N/A |
| Comprimir prompt | `llmlingua-compress ...` | N/A |

---

## 7. Cheatsheet Rápido

```python
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4o")
tokens = len(enc.encode("text"))
# Budget: sys≤25%, ret≤40%, hist≤25%, scratch≤10%
# Si >100K → evict scratch, luego hist, luego comprimir ret
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `11-prompt-compression-routing` | Complementario (técnicas de compresión) | Sí |
| `30-zero-token-optimization` | Complementario (política de respuesta mínima) | Sí |
| `34-autoprompting-engineering` | Complementario (diseño de prompts eficientes) | No |
| `07-agent-memory-persistence-episodic` | Complementario (persistencia fuera de contexto) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: context-token-budgeting
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [token-budget, context-window, llmlingua, compression, sliding-window, tiktoken]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

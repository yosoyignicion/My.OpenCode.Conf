# Zero-Token Policy: Plan de Reducción Máxima de Tokens

> **Contexto:** opencode GO · DeepSeek V4 Flash · modo low (non-thinking)
> **Meta:** reducir consumo de tokens a ~0 netos por sesión recurrente

---

## 1. Filosofía Zero-Token

No existe el costo 0 absoluto — el *overflow* de KV cache, tool definitions y system prompt siempre pagan algo.  
Pero sí podemos operar en **régimen asintótico a 0**: tras la primera request en un tema, el cache de DeepSeek absorbe casi todo el input recurrente.

**Ecuación de costo por request:**

```
costo_total = input_fresco * $0.14/M + input_cacheado * $0.0028/M + output * $0.28/M
```

El plan ataca los 3 términos:

| Término | Peso | Estrategia |
|---------|------|------------|
| input_fresco | Alto (1.ª request) | Minimizar system prompt + tool definitions |
| input_cacheado | Bajo (~50× menos) | Maximizar reuso vía KV cache |
| output | Medio | Control de verbosidad + structured output |

Tras la 1.ª request, el costo marginal por request → **$0.0028/M (input) + $0.28/M (output)**.  
Reduciendo output a ~10 tokens/respuesta, el costo converge a **$0.0000028/request** — prácticamente 0.

---

## 2. Arquitectura de Capas de Ahorro

```
┌─────────────────────────────────────────────────┐
│  Capa 0: Infraestructura (automático)           │
│  DeepSeek KV cache · WAL → DELETE · .engram.db  │
├─────────────────────────────────────────────────┤
│  Capa 1: System Prompt (paga siempre,           │
│           pero se cachea tras 2+ requests)       │
├─────────────────────────────────────────────────┤
│  Capa 2: Tool Definitions (paga siempre)        │
├─────────────────────────────────────────────────┤
│  Capa 3: Input del usuario (cachable si        │
│           repite prefijo)                       │
├─────────────────────────────────────────────────┤
│  Capa 4: Output del agente (controlable)        │
├─────────────────────────────────────────────────┤
│  Capa 5: Memoria Persistente (Engram)           │
│           evita reinyectar historial completo   │
└─────────────────────────────────────────────────┘
```

---

## 3. Plan de Implementación por Capas

### Capa 0 — Infraestructura ✅ (Ya implementado)

| Acción | Impacto |
|--------|---------|
| `journal_mode = DELETE` | Elimina archivos `-shm`/`-wal` |
| DB file `.engram.db` (dotfile) | Unifica en 1 archivo oculto |
| KV cache automático (DeepSeek) | ~50× menos en input recurrente |

### Capa 1 — System Prompt Óptimo

**Principio:** El system prompt se paga en cada request, pero DeepSeek lo cachea tras 2+ requests.  
Sin embargo, un system prompt inflado *reduce el espacio para el cache prefix*, así que debe ser mínimo.

**Target: < 200 tokens**

```
Eres un ingeniero senior. Opera bajo política Zero-Token:
- Responde en ≤15 palabras
- Sin saludos, despedidas ni explicaciones
- Usa JSON cuando sea posible
- Prefiere comandos directos sobre narrativa
```

vs. versiones verbosas típicas (~400-800 tokens). **Ahorro: 200-600 tokens/request.**

### Capa 2 — Tool Definitions Mínimas

Opencode inyecta 13 tools base (~50-150 tokens c/u ≈ 650-2600 tokens).  
**Estrategia:**

1. **Deshabilitar herramientas no usadas** vía `allow`/`deny` en `opencode.json`
2. **Consolidar tool descriptions**: usar descripciones de 1 línea
3. **Evitar MCP servers** salvo necesidad crítica

Ejemplo de `opencode.json` optimizado:

```json
{
  "tool": {
    "bash": { "allow": true },
    "read": { "allow": true },
    "write": { "allow": true },
    "edit": { "allow": true },
    "grep": { "allow": false },
    "glob": { "allow": false },
    "webfetch": { "allow": false },
    "question": { "allow": false },
    "skill": { "allow": false },
    "todowrite": { "allow": false }
  }
}
```

**Ahorro: ~500-1500 tokens/request** (según cuántas se inhabiliten).

### Capa 3 — Input Cachable

DeepSeek cachea el **system prompt + prefijo del mensaje**.  
Para maximizar cache hits:

- Misma estructura de mensaje siempre (mismo formato de tool calls)
- Prefijo de user message constante: `"#task:"` + variable
- Evitar UUIDs/random en el prefijo (rompen el cache)

**Ahorro: variable, pero el cache hit reduce input de $0.14/M → $0.0028/M**

### Capa 4 — Output Controlado

El output de DeepSeek V4 Flash cuesta **$0.28/M tokens** — el doble que el input.  

**Técnicas:**

| Técnica | Ahorro | Implementación |
|---------|--------|----------------|
| Verbosidad: "responde en ≤10 palabras" | 40-60% | system prompt |
| JSON mode `response_format: json_object` | 30-50% vs narrativa | parámetro API |
| Sin tool calls redundantes | variable | think tool antes de actuar |
| `max_tokens` ajustado por tarea | 10-30% | configurable por prompt |

**Target output:** ~10-30 tokens/respuesta para tareas simples (vs. ~100-300 típico)  
**Ahorro: 70-90% en output.**

### Capa 5 — Memoria Persistente (Engram)

Engram evita reinyectar historial completo.  
En lugar de pasar el contexto completo de la sesión, inyecta solo **top-k memorias relevantes**.

| Escenario | Sin Engram | Con Engram | Ahorro |
|-----------|-----------|------------|--------|
| Sesión día 1 (historial 10K tokens) | 10K tokens | ~300 tokens (3 memorias) | 97% |
| Sesión día 2 (historial 50K tokens) | 50K tokens | ~500 tokens (5 memorias) | 99% |
| Sesión día 30 (historial 1M tokens) | 1M tokens | ~800 tokens | 99.9% |

**Además:** Engram guarda resúmenes de sesión en `session.compacted`, inyectándolos en vez del raw history.

---

## 4. Configuración Recomendada para tu Stack

### `opencode.json`

```json
{
  "model": "deepseek-v4-flash",
  "mode": "low",
  "maxTokens": {
    "default": 100,
    "bash": 20,
    "edit": 50
  },
  "tool": {
    "deny": ["grep", "glob", "webfetch", "question", "skill", "todowrite"]
  },
  "plugin": [
    ["./src/engram.ts", {
      "auto_save": { "keywords": true, "error_fix": true, "compaction": true, "architecture": true },
      "injection": { "enabled": true, "max_memories": 2, "max_tokens": 600 }
    }]
  ]
}
```

### `AGENTS.md` (proyecto)

Instrucciones de sistema a nivel proyecto, inyectadas 1 vez:

```markdown
## Zero-Token Policy
- Respuestas ≤10 palabras o JSON directo
- Sin explicaciones, saludos ni despedidas
- Prefiere comandos edit/write/bash directos
- Usa engram_search antes de preguntar
- No repitas info ya en memorias Engram
```

---

## 5. Proyección de Ahorro Cuantitativo

Simulación para una sesión de 100 requests en un mismo tema:

| Componente | Sin optimizar | Con Zero-Token Policy | Ahorro |
|------------|---------------|----------------------|--------|
| System prompt (100×) | 40K tokens ($5.60) | 4K tokens ($0.56) | 90% |
| Tool definitions (100×) | 100K tokens ($14.00) | 30K tokens ($4.20) | 70% |
| Input usuario (100×) | 500K tokens ($70.00) | 100K tokens ($14.00) | 80% |
| Output agente (100×) | 200K tokens ($56.00) | 20K tokens ($5.60) | 90% |
| **Total** | **840K tokens ($145.60)** | **154K tokens ($24.36)** | **82%** |

**Costo marginal por request tras cache warm:**
- Sin optimizar: ~$1.46/request  
- Con Zero-Token: ~$0.24/request (83% menos)

**Régimen asintótico** (cache caliente, misma sesión/tema):
- Input cacheado: ~$0.0028/M → insignificante
- Output: ~20 tokens × $0.28/M = $0.0000056/request
- **Costo marginal: ~$0.000006/request** → prácticamente 0

---

## 6. Roadmap de Implementación

| Fase | Acción | Estado |
|------|--------|--------|
| **Fase 0** | `journal_mode = DELETE` + `.engram.db` dotfile | ✅ Hecho |
| **Fase 1** | System prompt mínimo (< 200 tokens) | ⬜ Pendiente |
| **Fase 2** | Deshabilitar tools no esenciales | ⬜ Pendiente |
| **Fase 3** | `max_tokens` por tipo de tarea | ⬜ Pendiente |
| **Fase 4** | AGENTS.md con Zero-Token Policy | ⬜ Pendiente |
| **Fase 5** | Engram injection optimizado (2 memorias, 600 tokens) | ⬜ Pendiente |
| **Fase 6** | JSON mode para tareas estructuradas | ⬜ Pendiente |
| **Fase 7** | Monitoreo + ajuste fino por tipo de tarea | ⬜ Pendiente |

---

## 7. Limitaciones y Riesgos Conocidos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Cache DeepSeek best-effort (horas) | Pérdida de ahorro en sesiones separadas | Agrupar requests relacionados |
| Respuestas muy cortas pierden matiz | Calidad subjetiva | JSON mode + validación posterior |
| Demasiados tools deshabilitados | Agente no puede completar tareas | Revisar permisos por proyecto |
| Engram inyecta memorias irrelevantes | Ruido en contexto | Ajustar `min_importance` y `max_memories` |
| Modo "low" puede alucinar más | Precisión reducida | Tareas críticas: validar output |

---

## 8. Referencias

- DeepSeek KV Cache: https://api-docs.deepseek.com/guides/kv_cache
- DeepSeek Pricing: https://api-docs.deepseek.com/quick_start/pricing
- Anthropic Think Tool: https://www.anthropic.com/engineering/claude-think-tool
- LongLLMLingua (prompt compression): https://arxiv.org/abs/2310.06839
- LongNet (dilated attention): https://arxiv.org/abs/2307.02486
- Lost in the Middle (Liu et al. 2023): https://arxiv.org/abs/2307.03172
- Generative Agents (Park et al. 2023): https://arxiv.org/abs/2304.03442
- Opencode Docs: https://opencode.ai/docs

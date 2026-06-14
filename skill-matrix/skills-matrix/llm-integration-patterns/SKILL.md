---
name: llm-integration-patterns
description: "Patrones de integración con LLMs multi-proveedor: abstracción tras interfaz común (LLMClient), manejo de system prompts versionados, structured output con instructor/Zod, streaming con SSE, semanti..."
---
# llm-integration-patterns

## Semantic Triggers
```
llm integration, openai api, anthropic api, multi provider llm, llm client abstraction, provider fallback, semantic cache, rate limiting, structured output, streaming
```

---

## 1. Definición Teórica

Patrones de integración con LLMs multi-proveedor: abstracción tras interfaz común (LLMClient), manejo de system prompts versionados, structured output con instructor/Zod, streaming con SSE, semantic cache para reducir costes, rate limiting con exponential backoff, y RAG pipeline. Resuelve el problema de que cada proveedor de LLM tiene APIs, formatos y capacidades diferentes, y cambiar de proveedor requiere reescribir toda la integración.

---

## 2. Implementación de Referencia

Librerías: LiteLLM (multi-provider), Instructor (structured), Anthropic/OpenAI SDK. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import instructor
from pydantic import BaseModel
import asyncio, time, hashlib, json

class LLMResponse(BaseModel):
    content: str
    model: str
    provider: str
    latency_ms: float
    tokens: int

class LLMClient(ABC):
    @abstractmethod
    async def generate(self, messages: list, **kwargs) -> LLMResponse: ...
    @abstractmethod
    async def stream(self, messages: list, **kwargs) -> AsyncIterator[str]: ...
    @abstractmethod
    async def structured(self, messages: list, response_model: type, **kwargs) -> BaseModel: ...

class OpenAIClient(LLMClient):
    def __init__(self, model: str = "gpt-4o"):
        self.client = instructor.from_openai(AsyncOpenAI())
        self.model = model

    async def generate(self, messages: list, **kwargs) -> LLMResponse:
        start = time.time()
        resp = await self.client.chat.completions.create(
            model=self.model, messages=messages, **kwargs
        )
        return LLMResponse(
            content=resp.choices[0].message.content,
            model=self.model, provider="openai",
            latency_ms=(time.time() - start) * 1000,
            tokens=resp.usage.total_tokens if resp.usage else 0,
        )

    async def structured(self, messages: list, response_model: type, **kwargs) -> BaseModel:
        return await self.client.chat.completions.create(
            model=self.model, messages=messages,
            response_model=response_model, **kwargs
        )

    async def stream(self, messages: list, **kwargs) -> AsyncIterator[str]:
        resp = await self.client.chat.completions.create(
            model=self.model, messages=messages, stream=True, **kwargs
        )
        async for chunk in resp:
            if text := chunk.choices[0].delta.content:
                yield text

class MultiProviderRouter:
    def __init__(self):
        self.providers = {
            "openai": OpenAIClient("gpt-4o"),
            "openai-cheap": OpenAIClient("gpt-4o-mini"),
            "anthropic": AnthropicClient("claude-sonnet-4-20250514"),
        }
        self.cache = {}  # Semantic cache

    async def route(self, messages: list, prefer: str = "openai",
                    fallbacks: list[str] = None) -> LLMResponse:
        fallbacks = fallbacks or ["anthropic", "openai-cheap"]

        # Cache check
        cache_key = hashlib.md5(json.dumps(messages).encode()).hexdigest()
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            cached.content = "[CACHED] " + cached.content
            return cached

        for provider_name in [prefer] + fallbacks:
            provider = self.providers.get(provider_name)
            if not provider:
                continue
            try:
                result = await provider.generate(messages)
                if result.content:
                    # Cache result
                    self.cache[cache_key] = result
                    return result
            except Exception as e:
                print(f"Provider {provider_name} failed: {e}")
                continue

        raise Exception("All providers failed")

router = MultiProviderRouter()
result = await router.route(
    [{"role": "user", "content": "Hello"}],
    prefer="openai",
    fallbacks=["anthropic", "openai-cheap"]
)
print(f"{result.provider} ({result.latency_ms:.0f}ms): {result.content}")
```

**Fuente oficial:** https://docs.litellm.ai/docs/providers

### Alternativa de Implementación Específica

Usar LiteLLM directamente para routing y fallback automático sin necesidad de implementar la abstracción manualmente.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas que usan múltiples LLMs, necesitan failover, o quieren evitar vendor lock-in. |
| **Cuándo evitar** | Un solo proveedor, caso de uso simple; la abstracción añade complejidad innecesaria. |
| **Alternativas** | 1) Abstracción propia (control total). 2) LiteLLM (gestionado, multi-provider). 3) Provider directo (simple, lock-in). |
| **Coste/Complejidad** | Medio: la abstracción es simple pero probar todos los proveedores requiere cuentas y claves. Semantic cache y rate limiting añaden complejidad operativa. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El semantic cache devuelve respuestas obsoletas

**¿Qué ocasionó el error?** El cache no tiene TTL: una respuesta sobre el precio de un producto se cachea y se sirve días después, cuando el precio cambió.

**¿Cómo se solucionó?** Implementar TTL por tipo de consulta: precios=5min, facts=24h, código=7d. Además invalidar cache cuando el usuario dice "actualiza" o "refresh".

**¿Por qué funciona esta técnica?** TTL por dominio alinea la frescura del cache con la volatilidad de la información. Invalidación explícita da control al usuario.

### Caso: El rate limiter bloquea peticiones legítimas

**¿Qué ocasionó el error?** El burst queue permite ráfagas de 10 peticiones, pero el límite sostenido es 5/min. Una ráfaga legítima de 8 peticiones en 10s bloquea las siguientes.

**¿Cómo se solucionó?** Usar algoritmo token bucket: 10 tokens de burst, refill de 1 token cada 12s. Priorizar peticiones por usuario (authenticated > anonymous).

**¿Por qué funciona esta técnica?** Token bucket permite ráfagas sin exceder el promedio. Priorización garantiza que usuarios críticos no sean bloqueados.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "llm integration" "openai" "anthropic" "multi-provider" "api key" "rate limiting"
- **Prioridad de carga:** Alta — infraestructura base para cualquier agente
- **Dependencias:** `04-tool-use-function-calling`, `16-streaming-llm-outputs-sse`, `18-structured-outputs-json-schema`

### Tool Integration

```json
{
  "tool_name": "llm-integration-patterns",
  "description": "Patrones de integración multi-proveedor LLM: abstracción LLMClient, failover, semantic cache con TTL, rate limiting token bucket, structured output con instructor, streaming.",
  "triggers": ["llm integration", "openai api", "anthropic api", "multi provider", "provider fallback"],
  "context_hint": "Inyectar sección 2 para MultiProviderRouter; sección 4 para cache y rate limiting.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Para integrar LLMs en el agente, carga llm-integration-patterns. Usa
MultiProviderRouter con OpenAI como primary, Anthropic como fallback.
Implementa semantic cache con TTL por dominio y rate limiting token bucket.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar multi-provider
python -c "import asyncio; from llm_client import MultiProviderRouter; r=MultiProviderRouter(); print(asyncio.run(r.route([{'role':'user','content':'Hi'}])))"

# Ver cache
python -c "from llm_client import MultiProviderRouter; r=MultiProviderRouter(); print(len(r.cache), 'cached entries')"
```

### GUI / Web

- **LiteLLM Dashboard**: Monitor de proveedores, costes, latencia, y fallbacks
- **LangSmith**: Trazas de llamadas multi-provider con tiempos y costes
- **OpenRouter Dashboard**: Routing entre 100+ modelos con coste transparente

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Probar proveedor | `python -c "asyncio.run(router.route(...))"` | LiteLLM Dashboard "Test" |
| Ver costes | N/A | Dashboard "Costs" |

---

## 7. Cheatsheet Rápido

```python
from abc import ABC, abstractmethod
class LLMClient(ABC):
    async def generate(self, messages, **kwargs) -> LLMResponse: ...
    async def stream(self, messages, **kwargs) -> AsyncIterator[str]: ...
    async def structured(self, messages, response_model, **kwargs) -> BaseModel: ...
# Proveedores: OpenAI (primary), Anthropic (fallback), cheap (3rd)
# Cache: TTL por dominio (5min-7d), invalidación explícita
# Rate limit: token bucket, burst=10, refill=1/12s
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-tool-use-function-calling` | Complementario (tools dentro de integración) | Sí |
| `16-streaming-llm-outputs-sse` | Complementario (streaming provider) | Sí |
| `18-structured-outputs-json-schema` | Complementario (structured output provider) | Sí |
| `11-prompt-compression-routing` | Complementario (routing como parte de integración) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: llm-integration-patterns
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/llm-integration
tags: [llm-integration, multi-provider, openai, anthropic, semantic-cache, rate-limiting, litellm]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

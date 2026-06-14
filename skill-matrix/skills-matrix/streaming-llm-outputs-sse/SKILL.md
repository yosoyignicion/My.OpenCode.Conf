---
name: streaming-llm-outputs-sse
description: "Protocolo Server-Sent Events (SSE) para transmitir tokens generados por LLM desde el servidor al cliente en tiempo real, usando `Content-Type: text/event-stream` y eventos `data:` por cada token o ..."
---
# streaming-llm-outputs-sse

## Semantic Triggers
```
streaming llm, server sent events, sse streaming, token streaming, async llm generation, streaming response, text streaming, streaming with backpressure
```

---

## 1. Definición Teórica

Protocolo Server-Sent Events (SSE) para transmitir tokens generados por LLM desde el servidor al cliente en tiempo real, usando `Content-Type: text/event-stream` y eventos `data:` por cada token o fragmento. Resuelve el problema de latencia percibida: esperar a que el LLM genere la respuesta completa (5-30s) es inaceptable para UX; el streaming muestra tokens incrementalmente, reduciendo la latencia percibida a <500ms.

---

## 2. Implementación de Referencia

APIs: Anthropic `stream` nativo, OpenAI `stream=True`, FastAPI `StreamingResponse`. Python 3.12+, cliente JavaScript nativo EventSource.

### Ejemplo Práctico Avanzado

```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
import asyncio
import json

app = FastAPI()
anthropic = AsyncAnthropic()
openai = AsyncOpenAI()

async def generate_stream(prompt: str, provider: str = "anthropic"):
    if provider == "anthropic":
        async with anthropic.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

    elif provider == "openai":
        resp = await openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        async for chunk in resp:
            if text := chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"

@app.post("/chat/stream")
async def chat_stream(request: Request):
    body = await request.json()
    return StreamingResponse(
        generate_stream(body["prompt"], body.get("provider", "anthropic")),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )

# Client side (JavaScript)
"""
const eventSource = new EventSource('/chat/stream?prompt=Hello');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'done') { eventSource.close(); return; }
    document.getElementById('output').textContent += data.content;
};
"""
```

**Fuente oficial:** https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

### Alternativa de Implementación Específica

WebSockets para comunicación bidireccional (necesaria si el cliente necesita enviar datos mientras recibe streaming, e.g., cancelación). SSE es más simple pero unidireccional servidor→cliente.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Chat interfaces, asistentes en tiempo real, cualquier UI que muestre respuestas incrementalmente. |
| **Cuándo evitar** | Procesamiento batch, APIs que solo necesitan la respuesta final, clientes que no soportan EventSource (IE). |
| **Alternativas** | 1) SSE (más simple, unidireccional). 2) WebSockets (bidireccional, más control). 3) Chunked transfer encoding (HTTP básico). |
| **Coste/Complejidad** | Bajo: SSE es parte del estándar HTTP. El manejo de cancelación y errores añade complejidad moderada. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El streaming se corta antes de completar la respuesta

**¿Qué ocasionó el error?**
Proxy reverso (nginx, Cloudflare) bufferiza la respuesta SSE y la envía toda junta, o timeout por defecto de 60s mata la conexión.

**¿Cómo se solucionó?**
Añadir `X-Accel-Buffering: no` para nginx, `proxy_buffering off;` en configuración de proxy, y enviar heartbeats cada 15s: `data: {"type":"heartbeat"}\n\n`.

**¿Por qué funciona esta técnica?**
Deshabilitar buffering permite que cada evento SSE llegue inmediatamente al cliente. Los heartbeats mantienen viva la conexión TCP y previenen timeouts de proxy.

### Caso: El cliente no recibe eventos correctamente en HTTP/2

**¿Qué ocasionó el error?**
Algunos navegadores limitan conexiones SSE simultáneas a 6 por dominio en HTTP/1.1. HTTP/2 no tiene este límite pero requiere configuración adicional.

**¿Cómo se solucionó?**
Usar HTTP/2 (que multiplexa conexiones sin límite de 6) y verificar que el servidor (uvicorn + httptools) soporte HTTP/2.

**¿Por qué funciona esta técnica?**
HTTP/2 multiplexación elimina el límite de conexiones simultáneas. Cada stream SSE usa un stream HTTP/2 independiente sin bloqueo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "streaming" "SSE" "tiempo real LLM" "token streaming"
- **Prioridad de carga:** Alta — mejora significativa de UX
- **Dependencias:** `35-llm-integration-patterns`, `01-agentic-multiloop-orchestration`

### Tool Integration

```json
{
  "tool_name": "streaming-llm-outputs-sse",
  "description": "Implementación de streaming de LLMs vía SSE: FastAPI StreamingResponse, Anthropic/OpenAI streaming, heartbeats, anti-buffering para proxies.",
  "triggers": ["streaming llm", "sse", "token streaming", "streaming response", "text event stream"],
  "context_hint": "Inyectar sección 2 para FastAPI + Anthropic; sección 4 para cortes de stream y HTTP/2.",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario necesite streaming de respuestas LLM en tiempo real, carga
streaming-llm-outputs-sse. Usa FastAPI StreamingResponse con Anthropic stream para
SSE. Añade header X-Accel-Buffering: no y heartbeats cada 15s para proxies.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar SSE con curl
curl -N http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'

# Ver heartbeats
curl -N http://localhost:8000/chat/stream 2>&1 | grep heartbeat
```

### GUI / Web

- **FastAPI /docs**: Swagger UI con botón "Try it out" para probar streaming
- **Browser DevTools**: Network tab → filter "event-stream" para ver eventos SSE
- **Postman**: Soporte SSE con visualización en tiempo real (v10+)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Probar SSE | `curl -N ...` | FastAPI /docs "Execute" |
| Ver eventos | N/A | DevTools Network → EventStream |

---

## 7. Cheatsheet Rápido

```python
from fastapi.responses import StreamingResponse
async def gen(): yield f"data: {json.dumps({'token': t})}\n\n"
StreamingResponse(gen(), media_type="text/event-stream",
    headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})
# Heartbeat cada 15s para mantener conexión viva
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `35-llm-integration-patterns` | Complementario (patrones de cliente LLM) | Sí |
| `01-agentic-multiloop-orchestration` | Complementario (agentes con streaming) | No |
| `04-tool-use-function-calling` | Complementario (tool calls en streaming) | No |
| `12-llm-inference-engines-vllm` | Complementario (vLLM soporta streaming nativo) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: streaming-llm-outputs-sse
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [streaming, sse, server-sent-events, fastapi, anthropic-stream, openai-stream, real-time]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: mcp-tools-protocol
description: "Model Context Protocol (MCP) es un protocolo JSON-RPC 2.0 que estandariza la exposición de capacidades del agente como herramientas invocables. Covers Vercel AI SDK 6, MCP 2025, LangChain, AI agents, LLM integration, streaming AI, generative UI, Edge AI, AI SDK, tool calling, RAG, AI agent orchestration"
---
# mcp-tools-protocol

## Semantic Triggers
```
mcp protocol, json rpc tools, mcp tool definition, tool server endpoint, model context protocol, mcp proxy unix socket, tool list, tool call
```

---

## 1. Definición Teórica

Model Context Protocol (MCP) es un protocolo JSON-RPC 2.0 que estandariza la exposición de capacidades del agente como herramientas invocables: cada tool tiene nombre, descripción, y schema JSON de entrada. El servidor MCP lista tools disponibles y ejecuta calls, con soporte para proxy vía Unix sockets hacia servicios del host. Resuelve el problema de que cada agente define sus herramientas de forma ad-hoc, sin interoperabilidad ni descubrimiento estándar.

---

## 2. Implementación de Referencia

Implementación: JSON-RPC 2.0 sobre HTTP/Unix sockets. Go/Python. Servidor MCP de OCS v2.1 con 6 herramientas core.

### Ejemplo Práctico Avanzado

```python
import json
import socket
import asyncio
from typing import Any, Callable

class MCPTool:
    def __init__(self, name: str, description: str, handler: Callable,
                 input_schema: dict = None):
        self.name = name
        self.description = description
        self.handler = handler
        self.input_schema = input_schema or {"type": "object", "properties": {}}

class MCPServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8932):
        self.host = host
        self.port = port
        self.tools: dict[str, MCPTool] = {}

    def register(self, tool: MCPTool):
        self.tools[tool.name] = tool

    async def handle_request(self, request: dict) -> dict:
        req_id = request.get("id", 0)
        method = request.get("method", "")
        params = request.get("params", {})

        if method == "tools/list":
            return {
                "jsonrpc": "2.0", "id": req_id,
                "result": [{
                    "name": t.name, "description": t.description,
                    "inputSchema": t.input_schema
                } for t in self.tools.values()]
            }

        elif method == "tools/call":
            name = params.get("name", "")
            arguments = params.get("arguments", {})
            if name not in self.tools:
                return {"jsonrpc": "2.0", "id": req_id,
                        "error": {"code": -32601, "message": f"Tool {name} not found"}}
            try:
                result = await self.tools[name].handler(**arguments)
                return {"jsonrpc": "2.0", "id": req_id, "result": result}
            except Exception as e:
                return {"jsonrpc": "2.0", "id": req_id,
                        "error": {"code": -32000, "message": str(e)}}

        return {"jsonrpc": "2.0", "id": req_id,
                "error": {"code": -32601, "message": f"Method {method} not found"}}

    async def start(self):
        server = await asyncio.start_server(
            self._handle_connection, self.host, self.port
        )
        async with server:
            await server.serve_forever()

    async def _handle_connection(self, reader, writer):
        data = await reader.read(8192)
        request = json.loads(data.decode())
        response = await self.handle_request(request)
        writer.write(json.dumps(response).encode())
        await writer.drain()
        writer.close()

# Unix socket proxy
async def call_unix_socket(socket_path: str, request: dict) -> dict:
    reader, writer = await asyncio.open_unix_connection(socket_path)
    writer.write(json.dumps(request).encode())
    await writer.drain()
    data = await reader.read(8192)
    writer.close()
    return json.loads(data.decode())

# Usage
server = MCPServer()
server.register(MCPTool(
    name="engram_search",
    description="Search the engram memory system using FTS5",
    handler=lambda q, limit=10: {"results": f"searching for {q}"},
    input_schema={
        "type": "object",
        "properties": {
            "q": {"type": "string", "description": "Search query"},
            "limit": {"type": "integer", "default": 10}
        },
        "required": ["q"]
    }
))
```

**Fuente oficial:** https://modelcontextprotocol.io/

### Alternativa de Implementación Específica

Para integración con OpenCode, usar el sistema de `opencode.json` con `mcpServers` configurados como subprocessos que hablan JSON-RPC por stdin/stdout.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas multi-agente que necesitan exponer herramientas de forma estándar, integración con IDEs (VS Code MCP). |
| **Cuándo evitar** | Agente único con herramientas hardcodeadas; MCP añade overhead de serialización/deserialización. |
| **Alternativas** | 1) MCP JSON-RPC (estándar). 2) OpenAI tool format (propietario). 3) gRPC (tipado fuerte, más pesado). |
| **Coste/Complejidad** | Bajo-Medio: JSON-RPC es simple. El proxy Unix socket requiere manejo de conexiones. La validación de schemas es crítica. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Tool call falla con "timeout" en Unix socket proxy

**¿Qué ocasionó el error?**
El socket Unix es síncrono y el manejador de la tool tarda >30s en responder, causando timeout del lado del cliente.

**¿Cómo se solucionó?**
Implementar timeout en el proxy: `asyncio.wait_for(handler(), timeout=10)`. Si timeout, devolver error con código -32001 y permitir retry.

**¿Por qué funciona esta técnica?**
Timeout explícito evita sockets colgados. El código de error específico permite al cliente decidir si reintentar.

### Caso: El servidor MCP registra tools pero el cliente no las ve

**¿Qué ocasionó el error?**
El método `tools/list` no se implementó correctamente: devuelve la lista pero el formato no coincide con lo que espera el cliente (falta `inputSchema` correcto).

**¿Cómo se solucionó?**
Usar el esquema exacto de respuesta MCP: cada tool debe tener `name`, `description`, y `inputSchema` con `type: "object"`. Validar con JSON Schema antes de responder.

**¿Por qué funciona esta técnica?**
MCP tiene un contrato estricto de respuesta. Validar contra el schema antes de enviar garantiza cumplimiento.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "mcp" "tool protocol" "json-rpc" "registrar herramienta" "unix socket"
- **Prioridad de carga:** Alta — INFRAESTRUCTURA CRÍTICA para exponer capacidades
- **Dependencias:** `04-tool-use-function-calling`, `26-engram-memory-system`, `33-plugins-extensibility-agent`

### Tool Integration

```json
{
  "tool_name": "mcp-tools-protocol",
  "description": "Protocolo MCP JSON-RPC 2.0 para exponer herramientas del agente. Listado, llamado, proxy Unix socket, validación de schemas, y manejo de errores.",
  "triggers": ["mcp", "json-rpc", "tool protocol", "unix socket", "tool server"],
  "context_hint": "Inyectar sección 2 para MCPServer; sección 4 para timeouts y visibilidad.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando necesites exponer herramientas del agente vía MCP, carga mcp-tools-protocol.
Implementa MCPServer con tools/list y tools/call. Cada tool necesita name, description,
e inputSchema. Para comunicación con procesos externos, usa Unix socket proxy.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Listar tools vía MCP
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | nc localhost 8932

# Llamar una tool
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"engram_search","arguments":{"q":"architecture"}}}' | nc localhost 8932

# Probar Unix socket
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc -U /tmp/mcp.sock
```

### GUI / Web

- **MCP Inspector**: Herramienta oficial para inspeccionar servidores MCP (npx @modelcontextprotocol/inspector)
- **OpenCode Config**: `opencode.json` con `mcpServers` para registrar servidores MCP
- **VS Code MCP Extension**: Cliente MCP integrado en VS Code

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Listar tools | `echo '...' | nc localhost 8932` | MCP Inspector "List tools" |
| Llamar tool | `echo '...' | nc localhost 8932` | VS Code MCP "Call tool" |

---

## 7. Cheatsheet Rápido

```python
# MCP request: {"jsonrpc":"2.0","id":N,"method":"tools/list"|"tools/call","params":{...}}
# Tool schema: {"name":"str","description":"str","inputSchema":{"type":"object","properties":{}}}
# Errores: -32601 (not found), -32000 (execution error), -32001 (timeout)
# Proxy: Unix socket path en /tmp/mcp.sock
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-tool-use-function-calling` | Complementario (tools definidas por MCP) | Sí |
| `26-engram-memory-system` | Complementario (Engram expuesto como tool MCP) | Sí |
| `33-plugins-extensibility-agent` | Complementario (plugins como tools MCP) | Sí |
| `38-bridge-mcp-engram-sync` | Complementario (bridge usa MCP) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: mcp-tools-protocol
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/mcp-tools-protocol.md
tags: [mcp, json-rpc, tool-protocol, unix-socket, tool-server, model-context-protocol, ocs-core]
---
```

---

## Comparativa 2026 / Ecosystem

### Ecosistema de Integración IA 2025-2026

| Característica | Vercel AI SDK 6 | LangChain/LangGraph | MCP |
|---------------|----------------|---------------------|-----|
| Lenguaje primario | TypeScript | Python, TS | Multi-SDK |
| Provider agnostic | OpenRouter (100+) | LangChain providers | Cualquier host compatible |
| Streaming | Nativo SSE | Callbacks | Transport-dependent |
| UI components | streamUI, useChat | No nativo | No nativo |
| Tool calling | Multi-step integrado | Tool abstraction | JSON-RPC exec |
| Agentes | Agent loop simple | LangGraph DAG avanzado | Host-side orchestration |
| RAG | Embeddings + retrieval | Pipelines completos | Resource-based |
| Ideal para | Chat UI, Next.js | Agentes, Python | Tool integration |

### Vercel AI SDK 6 — Provider-Agnostic

```typescript
import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@ai-sdk/openrouter'

const model = openai('gpt-4o') // o anthropic('claude-sonnet-4-20250514'), google('gemini-2.5-flash')
```

- **Core API:** `generateText`, `streamText`, `generateObject` (structured output con Zod schema), `generateImage` (DALL-E), `embed`/`embedMany`.
- **Multi-step tool calling:** `maxSteps: 10` permite ciclos automáticos. `onStepFinish({ step, text })` para observabilidad.
- **UI Hooks React:** `useChat` (chat streaming + multi-step), `useCompletion` (non-chat generation), `useObject` (structured data streaming con Zod).
- **Data Stream Protocol (DSP):** Eventos SSE tipados: `text-delta`, `reasoning`, `tool-call`, `tool-result`, `source`, `error`, `finish`.
- **Generative UI con streamUI:** `ai/rsc` renderiza componentes React directamente desde IA con `tools: { showCard: { generate: async ({...}) => <Component /> } }`.
- **Server Actions Pattern (Next.js):** `result.toDataStreamResponse({ getErrorMessage, headers: { 'X-Provider': model.modelId } })`.

### Model Context Protocol (MCP) — Especificación 2025

- **Arquitectura:** Host (Claude, IDE) ↔ Server (filesystem, github, sql) vía JSON-RPC 2.0 (stdio/HTTP/SSE/Streamable HTTP).
- **Primitivas:**
  - **Resources:** Datos externos lectura/subscripción. URI templates dinámicos.
  - **Tools:** Funciones ejecutables. Schema JSON de input.
  - **Prompts:** Templates reutilizables con arguments.
- **Capability Negotiation:** Handshake inicial con `protocolVersion: "2025-03-26"`, `capabilities: { roots, sampling }`, `clientInfo`.
- **Transportes:** stdio (local servers), HTTP+SSE (remotos), **Streamable HTTP (2025+)** unificado con auth Bearer.
- **Seguridad:** OAuth 2.0 con user consent, `requiredScopes: ["files:write"]`.
- **Servidores oficiales:** filesystem, github, sqlite, memory (knowledge graph), puppeteer, brave-search.
- **SDKs:** TypeScript, Python, Go, Rust, Java, Kotlin, C#.

### LangChain / LangGraph — Orquestación de Agentes

- **LangGraph (DAG-Based):** Modela agentes como grafos acíclicos con `StateGraph`, `MessagesAnnotation`, `addNode`, `addConditionalEdges`. Compila a runtime ejecutable.
- **Multi-Agent Supervisor Pattern:** `createSupervisor({ agents: [codeAgent, searchAgent, dataAgent], llm, prompt: "delegar a especialistas" })`.
- **RAG Pipelines:** `RecursiveCharacterTextSplitter` (chunkSize 1000, chunkOverlap 200) → `OpenAIEmbeddings` (text-embedding-3-small) → `MemoryVectorStore` → `createRetrievalChain` con retriever `k: 5`.
- **LangSmith Observability:** Tracing automático con `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_PROJECT=my-agent`. Evaluación con `client.evaluate({ datasetName, evaluators: [correctness, relevance] })`.

### Edge AI / AI at the Edge

- **Cloudflare Workers AI:** 300+ modelos GPU. `env.AI.run("@cf/meta/llama-3.3-70b-instruct", { messages, stream: true })`.
- **Vercel Edge Functions:** `export const runtime = 'edge'` + `streamText({...}).toDataStreamResponse()`. ~50ms cold starts.
- **AI Gateway:** Capa de abstracción multi-provider con caching (`AI_GATEWAY_CACHE_TTL=300`) y rate limiting (`AI_GATEWAY_RATE_LIMIT=100/min`).

### Cuándo Usar Qué

| Necesidad | Herramienta |
|-----------|-------------|
| Chat UI con streaming en Next.js | Vercel AI SDK + useChat |
| Componentes UI generados por IA | AI SDK streamUI |
| Agentes complejos multi-paso | LangChain + LangGraph |
| RAG con documentos | LangChain (load → split → embed → retrieve) |
| Integrar herramientas en Claude Desktop | MCP |
| Exponer tools propias a cualquier IA | MCP Server |
| Plugins de IDE con IA | MCP (VS Code, JetBrains, Cursor nativos) |

### Stack Recomendado

```
Frontend Chat UI → Vercel AI SDK (useChat + streamText)
  ├─→ Tool Execution → MCP Servers (filesystem, sqlite, custom)
  └─→ Complex Agents → LangChain + LangGraph
                          └─→ Observability → LangSmith
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with integracion-ia-web)*

---
name: context7-mcp-docs
description: "Uso de las herramientas MCP de Context7 para obtener documentación actualizada de librerías y frameworks: `resolve-library-id` encuentra el ID Context7 correcto para una librería, y `query-docs` re..."
---
# context7-mcp-docs

## Semantic Triggers
```
context7 documentation, library docs fetch, api reference lookup, code example retrieval, framework documentation, context7 resolve library, version-aware docs, library resolution
```

---

## 1. Definición Teórica

Uso de las herramientas MCP de Context7 para obtener documentación actualizada de librerías y frameworks: `resolve-library-id` encuentra el ID Context7 correcto para una librería, y `query-docs` recupera ejemplos de código y referencias de API. Resuelve el problema de que la documentación de librerías cambia rápidamente y los LLM tienen conocimiento desactualizado (corte de entrenamiento), causando ejemplos obsoletos o incorrectos.

---

## 2. Implementación de Referencia

Herramientas MCP: `context7_resolve-library-id`, `context7_query-docs`. Integrable en cualquier agente que use OpenCode MCP.

### Ejemplo Práctico Avanzado

```python
import json, hashlib
from typing import Optional

class Context7Client:
    """Client for Context7 MCP tools"""

    def __init__(self, mcp_call_fn):
        """mcp_call_fn: function to call MCP tools (name, args) -> result"""
        self.mcp = mcp_call_fn
        self.cache = {}

    async def resolve_library(self, name: str, query: str) -> Optional[str]:
        """Resolve library name to Context7 ID"""
        cache_key = f"resolve:{name}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            result = await self.mcp("context7_resolve-library-id", {
                "libraryName": name,
                "query": query,
            })
            # Select best match: prefer official, high benchmark
            if result and len(result) > 0:
                best = result[0]  # Most relevant
                lib_id = best.get("libraryId")
                self.cache[cache_key] = lib_id
                return lib_id
        except Exception as e:
            print(f"Resolve failed: {e}")
        return None

    async def query_docs(self, lib_id: str, query: str) -> list[dict]:
        """Fetch documentation for a library"""
        cache_key = f"docs:{lib_id}:{hashlib.md5(query.encode()).hexdigest()[:8]}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            results = await self.mcp("context7_query-docs", {
                "libraryId": lib_id,
                "query": query,
            })
            self.cache[cache_key] = results
            return results
        except Exception as e:
            print(f"Query docs failed: {e}")
        return []

    async def get_docs(self, library_name: str, query: str,
                       version: str = None) -> list[dict]:
        """One-shot: resolve + query"""
        lib_id = await self.resolve_library(library_name, query)
        if not lib_id:
            return []

        # If version specified, append to lib_id
        if version:
            lib_id = f"{lib_id}/{version}"

        return await self.query_docs(lib_id, query)

# Usage with OpenCode MCP
"""
async def mcp_call(name: str, args: dict):
    # In OpenCode, tools are called directly
    # e.g., result = await context7_resolve_library_id(...)
    pass

client = Context7Client(mcp_call)
docs = await client.get_docs("Next.js", "How to use Server Actions", "v15.1.0")
for d in docs:
    print(f"Code example: {d['code'][:100]}...")
"""
```

**Fuente oficial:** https://opencode.ai/docs (Context7 MCP integration)

### Alternativa de Implementación Específica

Usar el CLI de Context7 directamente: `npx context7 resolve next.js` y `npx context7 query next.js "server actions"`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Preguntas sobre APIs de librerías, necesidad de ejemplos actualizados, código que usa frameworks específicos. |
| **Cuándo evitar** | Preguntas conceptuales que no necesitan código exacto, librerías muy niche no indexadas en Context7. |
| **Alternativas** | 1) Context7 MCP (más preciso, versionado). 2) Web search (más general, menos preciso). 3) Conocimiento interno del LLM (desactualizado). |
| **Coste/Complejidad** | Bajo: Context7 es un servicio MCP gratuito. Cachear resultados evita consultas repetidas. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Context7 devuelve documentación de una versión incorrecta

**¿Qué ocasionó el error?** No se especificó versión: `query-docs` devuelve la última, pero el usuario usa una versión anterior incompatible.

**¿Cómo se solucionó?** Preguntar al usuario qué versión usa antes de consultar: "¿Qué versión de Next.js usas?" y pasar `version` a `get_docs()`.

**¿Por qué funciona esta técnica?** La versión explícita elimina ambigüedad. Context7 soporta versiones específicas si están disponibles.

### Caso: Context7 no encuentra una librería niche

**¿Qué ocasionó el error?** La librería no está indexada en Context7 (demasiado pequeña o reciente).

**¿Cómo se solucionó?** Cachear el fallo para no reintentar, y usar búsqueda web como fallback. Registrar la librería en Context7 si es posible.

**¿Por qué funciona esta técnica?** El cache de fallos evita consultas inútiles repetidas. Web search es un respaldo universal.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "context7" "documentación" "api reference" "código ejemplo" "librería"
- **Prioridad de carga:** Alta — mejora precisión de respuestas técnicas
- **Dependencias:** `27-mcp-tools-protocol`, `35-llm-integration-patterns`

### Tool Integration

```json
{
  "tool_name": "context7-mcp-docs",
  "description": "Uso de Context7 MCP para obtener documentación actualizada de librerías: resolve-library-id + query-docs. Cache, versionado, y fallback a web search.",
  "triggers": ["context7", "library docs", "api reference", "code example", "documentation", "framework docs"],
  "context_hint": "Inyectar sección 2 para Context7Client; sección 4 para versiones y librerías niche.",
  "output_format": "markdown",
  "max_tokens": 800
}
```

### Prompt Snippet (carga rápida)

```
Cuando necesites documentación actualizada de una librería, carga context7-mcp-docs.
Usa Context7Client.get_docs(nombre, query, version) para obtener ejemplos
con la versión correcta. Cachea resultados para evitar consultas repetidas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# CLI de Context7
npx context7 resolve next.js
npx context7 query next.js "server actions" --version v15.1.0

# Ver cache
cat ~/.context7/cache.json | python -m json.tool
```

### GUI / Web

- **OpenCode UI**: Integración directa de Context7 en el panel de herramientas
- **Context7 Web**: Interfaz web para buscar documentación sin CLI
- **VS Code Extension**: Context7 dentro del editor

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Buscar docs | `npx context7 query ...` | OpenCode "Docs" panel |
| Resolve lib | `npx context7 resolve ...` | Context7 web search |

---

## 7. Cheatsheet Rápido

```python
# 1. resolve_library_id(name, query) → lib_id
# 2. query_docs(lib_id, query) → [docs]
# Version: lib_id + "/v15.1.0"
# Cache: md5(query) como key, TTL 24h
# Fallback: web search si no encontrado
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `27-mcp-tools-protocol` | Complementario (Context7 usa MCP) | Sí |
| `35-llm-integration-patterns` | Complementario (Context7 como fuente de datos) | No |
| `04-tool-use-function-calling` | Complementario (tools de Context7) | No |
| `36-context7-mcp-docs` | (recursivo) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: context7-mcp-docs
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/global-agents-skills/context7-mcp
tags: [context7, mcp, documentation, library-docs, api-reference, code-examples, version-aware]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

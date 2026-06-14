---
name: plugins-extensibility-agent
description: "Sistema de plugins que extiende las capacidades del agente mediante scripts externos ejecutables en cualquier lenguaje, comunicándose vía JSON por stdin/stdout"
---
# plugins-extensibility-agent

## Semantic Triggers
```
agent plugin system, plugin protocol json, extensibility agent, script plugin, plugin integration, external tool plugin, plugin directory, run.sh plugin
```

---

## 1. Definición Teórica

Sistema de plugins que extiende las capacidades del agente mediante scripts externos ejecutables en cualquier lenguaje, comunicándose vía JSON por stdin/stdout. Cada plugin tiene un directorio con `plugin.json` (metadatos y schema) y `run.sh` (ejecutable), accesible también vía HTTP `/api/plugins/<name>`. Resuelve el problema de que el core del agente no puede cubrir todos los casos de uso; los plugins permiten extensibilidad sin modificar el núcleo.

---

## 2. Implementación de Referencia

Implementación: Go/Python. Sistema OCS v2.1 con plugins en `/app/shared/plugins/`. Protocolo JSON stdin/stdout.

### Ejemplo Práctico Avanzado

```python
import json, os, subprocess, asyncio
from pathlib import Path
from typing import Any, Optional
import hashlib

class Plugin:
    def __init__(self, name: str, base_dir: str = "/app/shared/plugins"):
        self.name = name
        self.plugin_dir = Path(base_dir) / name
        self.metadata = self._load_metadata()
        self.executable = self.plugin_dir / "run.sh"

    def _load_metadata(self) -> dict:
        meta_file = self.plugin_dir / "plugin.json"
        if meta_file.exists():
            return json.loads(meta_file.read_text())
        return {"name": self.name, "version": "1.0.0", "description": ""}

    def is_valid(self) -> bool:
        return self.executable.exists() and os.access(self.executable, os.X_OK)

    async def execute(self, params: dict) -> dict:
        """Execute plugin via stdin/stdout JSON protocol"""
        request = json.dumps({"action": "execute", "params": params})
        try:
            proc = await asyncio.create_subprocess_exec(
                "bash", str(self.executable),
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate(request.encode(), timeout=30)

            if proc.returncode != 0:
                return {"status": "error", "error": stderr.decode()[:500]}

            response = json.loads(stdout.decode())
            # Track token savings
            response.setdefault("tokens_saved", 0)
            return response

        except asyncio.TimeoutError:
            return {"status": "error", "error": "Plugin timeout (30s)"}
        except json.JSONDecodeError:
            return {"status": "error", "error": "Invalid JSON response from plugin"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

class PluginManager:
    def __init__(self, base_dir: str = "/app/shared/plugins"):
        self.base = Path(base_dir)
        self.plugins: dict[str, Plugin] = {}

    def discover(self) -> list[str]:
        """Scan plugin directory for valid plugins"""
        self.plugins = {}
        for d in self.base.iterdir():
            if d.is_dir():
                plugin = Plugin(d.name, str(self.base))
                if plugin.is_valid():
                    self.plugins[d.name] = plugin
        return list(self.plugins.keys())

    def get(self, name: str) -> Optional[Plugin]:
        return self.plugins.get(name)

    async def call(self, name: str, params: dict) -> dict:
        plugin = self.get(name)
        if not plugin:
            return {"status": "error", "error": f"Plugin '{name}' not found"}
        return await plugin.execute(params)

    def list_all(self) -> list[dict]:
        return [
            {
                "name": name,
                "description": p.metadata.get("description", ""),
                "version": p.metadata.get("version", "1.0.0"),
                "valid": p.is_valid(),
            }
            for name, p in self.plugins.items()
        ]

# Example plugin: plugin.json
"""
{
    "name": "text-stats",
    "version": "1.0.0",
    "description": "Calculate text statistics (word count, reading time)",
    "input_schema": {
        "type": "object",
        "properties": {
            "text": {"type": "string"}
        },
        "required": ["text"]
    }
}
"""

# Example plugin: run.sh
"""
#!/bin/bash
read INPUT
TEXT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['params']['text'])")
WORDS=$(echo "$TEXT" | wc -w)
CHARS=$(echo "$TEXT" | wc -c)
echo "{\"status\":\"ok\",\"result\":{\"words\":$WORDS,\"chars\":$CHARS},\"tokens_saved\":30}"
"""

manager = PluginManager()
plugins = manager.discover()
print(f"Discovered: {plugins}")

result = await manager.call("text-stats", {"text": "Hello world"})
print(f"Plugin: {result}")
```

**Fuente oficial:** Plugin System de OCS v2.1.

### Alternativa de Implementación Específica

Para plugins más ligeros, usar funciones Python registradas dinámicamente (entry points) en lugar de subprocessos. Menos aislado pero más rápido.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Necesidad de extender el agente con funcionalidades específicas sin modificar el core, integraciones con APIs externas. |
| **Cuándo evitar** | Funcionalidades core del agente (file I/O, memory); deben estar en el núcleo por seguridad y eficiencia. |
| **Alternativas** | 1) Plugin subprocess (aislado, cualquier lenguaje). 2) Plugin Python entry point (rápido, mismo runtime). 3) MCP tool (si el plugin necesita ser tool). |
| **Coste/Complejidad** | Bajo: el protocolo JSON stdin/stdout es trivial. La gestión de errores (timeout, JSON inválido) es lo más complejo. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Plugin cuelga el agente por ejecución infinita

**¿Qué ocasionó el error?** El `run.sh` del plugin contiene un bucle infinito o espera input que nunca llega, colgando al agente.

**¿Cómo se solucionó?** Implementar timeout de 30s en `asyncio.wait_for` y matar el subprocess si excede. Añadir log de alerta para plugins que frecuentemente hacen timeout.

**¿Por qué funciona esta técnica?** Timeout duro + SIGKILL garantiza que el plugin no bloquee al agente. El monitoreo de timeouts identifica plugins problemáticos.

### Caso: Plugin retorna tokens_saved incorrectos

**¿Qué ocasionó el error?** El plugin declara `tokens_saved: 9999` en su respuesta para parecer más útil, pero en realidad no ahorra tokens.

**¿Cómo se solucionó?** Validar `tokens_saved` contra el tamaño real del input: no puede exceder 3x el número de tokens de entrada del plugin. Si excede, ignorar y loguear advertencia.

**¿Por qué funciona esta técnica?** El límite de 3x es un heuristic razonable (input tokens * 3 de overhead). Validación evita inflación artificial.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "plugin" "extensibilidad" "script plugin" "run.sh" "plugin.json"
- **Prioridad de carga:** Media — importante pero no siempre necesario
- **Dependencias:** `27-mcp-tools-protocol`, `04-tool-use-function-calling`, `28-curator-loop-hermes`

### Tool Integration

```json
{
  "tool_name": "plugins-extensibility-agent",
  "description": "Sistema de plugins para agente: JSON stdin/stdout, subprocess execution, discovery automático, plugin.json metadata, y HTTP endpoint. Cualquier lenguaje ejecutable.",
  "triggers": ["plugin", "extensibility", "script plugin", "plugin system", "run.sh"],
  "context_hint": "Inyectar sección 2 para PluginManager; sección 4 para timeouts y validación.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Para extender capacidades del agente, cargar plugins-extensibility-agent.
Usar PluginManager.discover() para listar plugins, PluginManager.call() para
ejecutar. Cada plugin en /plugins/<name>/ con plugin.json + run.sh.
Timeout: 30s por defecto.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Listar plugins
python -c "from plugin import PluginManager; m=PluginManager(); m.discover(); print(m.list_all())"

# Ejecutar plugin
python -c "import asyncio; from plugin import PluginManager; m=PluginManager(); m.discover(); print(asyncio.run(m.call('text-stats', {'text':'hello'})))"

# Ver estructura
ls -la /app/shared/plugins/*/
```

### GUI / Web

- **Plugin Dashboard**: Lista de plugins instalados con estado, versión, y última ejecución
- **Plugin Editor**: Editor web para crear/editar plugin.json y run.sh
- **HTTP Gateway**: `GET /api/plugins/list`, `POST /api/plugins/<name>` para ejecutar plugins vía HTTP

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Listar plugins | `python -c "PluginManager().discover()"` | Dashboard "Plugins" |
| Ejecutar plugin | `python -c "asyncio.run(m.call('name',{}))"` | Dashboard "Run" |

---

## 7. Cheatsheet Rápido

```python
from plugin import PluginManager
m = PluginManager()
m.discover()  # Escanea /app/shared/plugins/
await m.call("name", {"param": "value"})
# Plugin: /plugins/<name>/plugin.json + run.sh (executable)
# Protocolo: JSON stdin → JSON stdout {"status":"ok","result":...,"tokens_saved":N}
# Timeout: 30s, auto-kill si excede
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `27-mcp-tools-protocol` | Complementario (plugins como tools MCP) | Sí |
| `04-tool-use-function-calling` | Complementario (plugins pueden ser tools) | Sí |
| `28-curator-loop-hermes` | Complementario (skills promovidos a plugins) | No |
| `33-plugins-extensibility-agent` | (recursivo) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: plugins-extensibility-agent
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/plugins-extensions.md
tags: [plugin, extensibility, script-plugin, subprocess, json-protocol, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: plugins-extensions
description: "OCS-specific plugin protocol: external scripts that communicate with the OCS orchestrator via JSON over stdin/stdout. Lightweight alternative to MCP for sandboxed extensions."
---
# plugins-extensions

## Semantic Triggers
```
OCS plugin protocol, plugin json stdin stdout, extension script OCS, OCS plugin manager, bash plugin JSON, plugin manifest, plugin.json, run.sh OCS, JSON RPC plugin, OCS extension
```

---

## 1. Definición Teórica

OCS plugin protocol is a **lightweight, language-agnostic extension mechanism** for the Open Center Space orchestrator. Each plugin is a standalone script (bash, Python, Node, Go) living under `/app/shared/plugins/<name>/` that receives a JSON request on `stdin` and writes a JSON response on `stdout`. The orchestrator invokes plugins via `exec.Command` and pipes the body. This solves the problem of letting users extend OCS without modifying its Go core, recompiling, or going through the heavier MCP/RPC stack. The trade-off vs MCP: simpler, faster, sandbox-friendlier, but no streaming, no bidirectional channels, no native schema validation.

---

## 2. Implementación de Referencia

Default reference: OCS v2.1 `/app/shared/plugins/` directory layout, with a Go HTTP handler at `/api/plugins/<name>` that dispatches to the script.

### Ejemplo Práctico Avanzado

Directory layout:

```
/app/shared/plugins/
├── file-organizer/
│   ├── plugin.json     ← metadata
│   └── run.sh          ← executable, JSON-in/JSON-out
└── ...
```

`plugin.json`:
```json
{
  "name": "file-organizer",
  "version": "1.0.0",
  "description": "Organiza archivos en /app/shared/ por extensión",
  "author": "ignicion",
  "entrypoint": "run.sh",
  "actions": ["organize", "list"]
}
```

`run.sh` (bash + python JSON parser):
```bash
#!/bin/bash
# run.sh — Organizador de archivos por extensión
# Protocol: lee JSON de stdin, escribe JSON a stdout
set -euo pipefail

INPUT=$(cat)
ACTION=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['action'])")

case "$ACTION" in
  organize)
    cd /app/shared || exit 1
    for f in *.md; do [ -f "$f" ] && mkdir -p docs && mv "$f" docs/; done
    for f in *.py; do [ -f "$f" ] && mkdir -p scripts && mv "$f" scripts/; done
    echo '{"status":"ok","result":"Archivos organizados por extensión","tokens_saved":50}'
    ;;
  list)
    ls -la /app/shared/ | python3 -c "
import json, sys
lines = sys.stdin.read().splitlines()
print(json.dumps({'status':'ok','files': lines[1:]}, ensure_ascii=False))
"
    ;;
  *)
    echo '{"status":"error","result":"Acción no soportada"}'
    exit 1
    ;;
esac
```

Host-side invocation (Go HTTP handler):
```go
func (h *HTTPServer) handlePlugin(w http.ResponseWriter, r *http.Request) {
    name := strings.TrimPrefix(r.URL.Path, "/api/plugins/", "")
    pluginPath := filepath.Join("/app/shared/plugins", name, "run.sh")

    if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
        http.Error(w, "Plugin no encontrado", 404)
        return
    }

    body, _ := io.ReadAll(r.Body)
    cmd := exec.Command("bash", pluginPath)
    cmd.Stdin = bytes.NewReader(body)
    output, err := cmd.Output()
    if err != nil {
        http.Error(w, fmt.Sprintf("Plugin error: %v", err), 500)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(output)
}
```

**Fuente oficial:** OCS source — `/home/ignicion/Documentos/open-center-space/`

### Alternativa de Implementación: Python Plugin con Args tipados

```python
#!/usr/bin/env python3
"""plugin.py — Plugin OCS en Python puro con validación"""
import json, sys
from pathlib import Path

def main():
    try:
        req = json.loads(sys.stdin.read())
        action = req.get("action")
        params = req.get("params", {})

        if action == "count":
            ext = params.get("extension", "*")
            base = Path(params.get("path", "/app/shared"))
            count = sum(1 for _ in base.rglob(f"*.{ext}"))
            print(json.dumps({"status": "ok", "count": count}))
        elif action == "echo":
            print(json.dumps({"status": "ok", "echo": params}))
        else:
            print(json.dumps({"status": "error", "result": f"unknown action: {action}"}))
            sys.exit(1)
    except json.JSONDecodeError as e:
        print(json.dumps({"status": "error", "result": f"invalid JSON: {e}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Extensiones OCS-scope, scripts rápidos en bash/python, herramientas one-off, integraciones con CLIs externos (jq, ffmpeg, imagemagick) |
| **Cuándo evitar** | Lógica de negocio con estado compartido, streaming, sub-ms latency, alta concurrencia. Para esos casos usar **MCP** (`mcp-tools-protocol`) o un microservicio dedicado |
| **Alternativas** | MCP JSON-RPC 2.0 (más estándar, schema-validated, streaming-capable) · Sidecar process (más rápido, IPC nativo) · In-process Go plugin (compilado, máxima velocidad, pero requiere recompilar OCS) |
| **Coste/Complejidad** | Bajo: cualquier lenguaje, sin SDK, sin schema registry. Coste: 1 fork+exec por invocación (~5-15ms en Linux) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Plugin devuelve 500 con `exit status 1`

**¿Qué ocasionó el error?**
El `run.sh` salió con código no-cero (típicamente `set -e` + comando que falla). El handler Go trata cualquier `err != nil` como 500.

**¿Cómo se solucionó?**
1. Ejecutar el plugin manualmente: `echo '{"action":"organize"}' | bash /app/shared/plugins/mi-plugin/run.sh`
2. Capturar stderr además de stdout: `output, err := cmd.CombinedOutput()` (en vez de `cmd.Output()`)
3. Envolver la lógica en un `trap` que capture el exit code real:
   ```bash
   trap 'echo "{\"status\":\"error\",\"exit\":$?,\"line\":$LINENO}"; exit 0' ERR
   ```

**¿Por qué funciona esta técnica?**
El protocolo JSON-in/JSON-out asume que **stdout = respuesta válida** y **exit code ≠ 0 = error de transporte**, no de lógica. Si la lógica falla, debes emitir el JSON de error y `exit 0`, para que el handler Go lo parsee y devuelva 200 con `status: "error"`.

### Caso: Caracteres UTF-8 rotos en respuestas JSON

**¿Qué ocasionó el error?**
El plugin emite `{"result": "Organización completa"}` pero el handler Go lo lee como bytes Latin-1 y el frontend muestra `OrganizaciÃ³n completa`.

**¿Cómo se solucionó?**
1. Forzar UTF-8 en el script: `export LANG=C.UTF-8 LC_ALL=C.UTF-8` al inicio
2. En Python: `print(json.dumps(data, ensure_ascii=False))` para que los caracteres no-ASCII viajen literales (no escapados)
3. Validar con `file -i` o `jq .` que el JSON parsea como UTF-8

**¿Por qué funciona esta técnica?**
JSON RFC 8259 requiere UTF-8. Si el script corre en una locale `C` o `POSIX`, los caracteres multibyte se serializan como bytes crudos que el parser interpreta como Latin-1.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens al invocar este skill (definición + ejemplo + 2 FAQ)
- **Trigger de activación:** "plugin OCS", "extensión OCS", "como añadir un plugin", "bash plugin JSON"
- **Prioridad de carga:** Media — solo cuando el usuario menciona OCS explícitamente o quiere añadir funcionalidad externa al orquestador
- **Dependencias:** `mcp-tools-protocol` (para entender la alternativa más pesada) · `bash-scripting-advanced` (si el plugin es bash)

### Tool Integration

```json
{
  "tool_name": "plugins-extensions",
  "description": "Cómo añadir y consumir plugins OCS mediante el protocolo JSON-stdin/stdout",
  "triggers": ["OCS plugin", "extension script", "plugin.json", "JSON stdin stdout OCS"],
  "context_hint": "Cargar cuando el usuario quiera extender OCS sin recompilar. NO confundir con MCP (más estándar pero más pesado).",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre cómo añadir una extensión o plugin a OCS, carga el
skill plugins-extensions y explica el protocolo JSON-stdin/stdout con el ejemplo de
file-organizer. Si el usuario necesita streaming o sub-ms latency, recomienda MCP
(mcp-tools-protocol) en su lugar.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Listar plugins disponibles
ls /app/shared/plugins/

# Ver metadata de un plugin
cat /app/shared/plugins/file-organizer/plugin.json | jq

# Invocar un plugin manualmente (modo debug)
echo '{"action":"list"}' | bash /app/shared/plugins/file-organizer/run.sh | jq

# Llamar vía API HTTP
curl -X POST http://localhost:8080/api/plugins/file-organizer \
  -H "Content-Type: application/json" \
  -d '{"action":"organize"}' | jq

# Crear nuevo plugin (estructura mínima)
mkdir -p /app/shared/plugins/mi-nuevo-plugin
cat > /app/shared/plugins/mi-nuevo-plugin/plugin.json <<'EOF'
{
  "name": "mi-nuevo-plugin",
  "version": "1.0.0",
  "description": "...",
  "entrypoint": "run.sh"
}
EOF
chmod +x /app/shared/plugins/mi-nuevo-plugin/run.sh
```

### GUI / Web

- **OCS Dashboard**: panel `/plugins` lista los plugins instalados con su `plugin.json` parseado
- **Plugin Test Runner**: botón "Test" que invoca cada acción declarada y muestra el JSON de respuesta en un modal
- **No IDE específico** — los plugins son scripts planos, editables con cualquier editor

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Listar plugins | `ls /app/shared/plugins/` | Dashboard → Plugins |
| Probar plugin | `echo '{}' \| bash <path>/run.sh` | Dashboard → Plugin → Test |
| Ver logs | `tail -f /app/shared/logs/plugins.log` | Dashboard → Logs |
| Recargar plugin | `systemctl restart ocs-daemon` | Dashboard → Reload |

---

## 7. Cheatsheet Rápido

```bash
# Crear plugin mínimo
mkdir -p /app/shared/plugins/hello/{, && cd $_ && \
  echo '{"name":"hello","version":"1.0.0","entrypoint":"run.sh"}' > plugin.json && \
  printf '#!/bin/bash\nread INPUT\necho "{\"status\":\"ok\",\"echo\":$INPUT}"\n' > run.sh && \
  chmod +x run.sh
# Probar: echo '{}' | bash run.sh
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `mcp-tools-protocol` | Alternativa más estándar pero más pesada. Útil cuando el usuario duda entre MCP y plugin JSON | Sí |
| `bash-scripting-advanced` | Complementario si el plugin es bash (mejores prácticas: `set -euo pipefail`, traps, logging) | Sí |
| `openclaw-isolation` | Complementario: el plugin corre en sandbox; openclaw valida que no escape | No |
| `plugins-and-extensibility-architectures` | **Superconjunto genérico**: este skill es la instanciación OCS-específica de esa arquitectura | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: plugins-extensions
domain: opencode-architecture
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13  # 60 días sin uso
source: old-skills/open-center-space/shared/skills/plugins-extensions.md
tags: [ocs, plugin, json-rpc, extension, bash, python, sandbox]
---
```

---

*Skill curado a partir de `open-center-space/shared/skills/plugins-extensions.md` (87 líneas) usando el template de 9 secciones.*

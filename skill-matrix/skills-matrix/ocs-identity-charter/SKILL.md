---
name: ocs-identity-charter
description: "Arquitectura de identidad del agente definida por un pipeline de 6 capas de system prompt inyectadas secuencialmente: Identidad (reglas core), Herramientas (MCP specs), Memoria (Engram entries), Sk..."
---
# ocs-identity-charter

## Semantic Triggers
```
agent identity, system prompt layering, cognitive architecture, identity charter, system prompt pipeline, agent constitution, instructions.md, scaffold.md, 6-layer pipeline
```

---

## 1. Definición Teórica

Arquitectura de identidad del agente definida por un pipeline de 6 capas de system prompt inyectadas secuencialmente: Identidad (reglas core), Herramientas (MCP specs), Memoria (Engram entries), Skills (FTS5 index), Workspace (árbol de directorios), y Metadatos (timestamp/env). El charter se materializa en INSTRUCTIONS.md (identidad + guía) y SCAFFOLD.md (constitución + ADRs). Resuelve el problema de que los agentes no tienen una identidad coherente ni un marco de decisión consistente entre sesiones.

---

## 2. Implementación de Referencia

Implementación: Go/Python. Sistema OCS v2.1 con pipeline de carga de 6 capas. Archivos: INSTRUCTIONS.md, SCAFFOLD.md, AGENTS.md.

### Ejemplo Práctico Avanzado

```python
from dataclasses import dataclass, field
from typing import List, Optional
import json
import os
from pathlib import Path

@dataclass
class SystemPromptPipeline:
    identity: str = ""
    tool_guidance: str = ""
    memory_context: str = ""
    skills_context: str = ""
    workspace_context: str = ""
    metadata: str = ""

    def build(self) -> str:
        layers = [
            ("IDENTITY", self.identity),
            ("TOOL GUIDANCE", self.tool_guidance),
            ("MEMORY", self.memory_context),
            ("SKILLS", self.skills_context),
            ("WORKSPACE", self.workspace_context),
            ("METADATA", self.metadata),
        ]
        return "\n\n---\n".join(
            f"## {name}\n{content}" for name, content in layers if content
        )

class IdentityCharter:
    def __init__(self, base_dir: str = "."):
        self.base = Path(base_dir)
        self.pipeline = SystemPromptPipeline()

    def load_identity(self):
        """Layer 1: Core identity from INSTRUCTIONS.md"""
        instructions = self.base / "INSTRUCTIONS.md"
        if instructions.exists():
            self.pipeline.identity = instructions.read_text()

    def load_tool_guidance(self):
        """Layer 2: Tool specifications from MCP"""
        tools_file = self.base / "opencode.json"
        if tools_file.exists():
            config = json.loads(tools_file.read_text())
            mcp = config.get("mcpServers", {})
            self.pipeline.tool_guidance = json.dumps(mcp, indent=2)

    def load_memory(self, engram_context_fn):
        """Layer 3: Memory from Engram"""
        context = engram_context_fn(max_tokens=1500)
        if context:
            self.pipeline.memory_context = context

    def load_skills(self, skill_db_fn, query: str):
        """Layer 4: Skills from FTS5 index"""
        skills = skill_db_fn(query, limit=5)
        if skills:
            self.pipeline.skills_context = "\n".join(
                f"- {s['name']}: {s['description']}" for s in skills
            )

    def load_workspace(self):
        """Layer 5: Workspace tree"""
        tree = []
        for path in Path("/app/shared").rglob("*"):
            if path.is_file() and not path.name.startswith("."):
                rel = path.relative_to("/app/shared")
                tree.append(f"  {rel}")
        self.pipeline.workspace_context = "\n".join(tree[:30])  # Limit to 30 files

    def load_metadata(self):
        """Layer 6: Session metadata"""
        import datetime, platform
        self.pipeline.metadata = json.dumps({
            "timestamp": datetime.datetime.now().isoformat(),
            "platform": platform.platform(),
            "cwd": os.getcwd(),
            "session_id": os.environ.get("SESSION_ID", "unknown"),
        }, indent=2)

    def build_prompt(self, engram_context_fn=None, skill_db_fn=None) -> str:
        self.load_identity()
        self.load_tool_guidance()
        if engram_context_fn:
            self.load_memory(engram_context_fn)
        if skill_db_fn:
            self.load_skills(skill_db_fn, "general")
        self.load_workspace()
        self.load_metadata()
        return self.pipeline.build()

    def get_charter_files(self) -> dict:
        """Read constitution files"""
        files = {}
        for fname in ["INSTRUCTIONS.md", "SCAFFOLD.md", "AGENTS.md"]:
            path = self.base / fname
            if path.exists():
                files[fname] = path.read_text()
        return files

charter = IdentityCharter("/home/user/project")
prompt = charter.build_prompt()
print(f"Total prompt length: {len(prompt)} chars")
print(f"Layers loaded: {sum(1 for l in [charter.pipeline.identity, charter.pipeline.memory_context] if l)}")
```

**Fuente oficial:** OCS v2.1 Identity Charter y 6-Layer Pipeline.

### Alternativa de Implementación Específica

Para sistemas sin sistema de archivos estructurado, definir identidad directamente en Python como dataclass con defaults. Menos flexible pero autocontenido.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que necesitan identidad persistente entre sesiones, sistemas multi-agente con diferentes personalidades. |
| **Cuándo evitar** | Agentes de un solo propósito sin necesidad de personalidad; el pipeline de 6 capas añade overhead. |
| **Alternativas** | 1) 6-layer pipeline (completo). 2) System prompt único (simple). 3) Identity por archivo modular (flexible). |
| **Coste/Complejidad** | Medio: cargar 6 capas consume tokens (~2-4K solo para identidad). La gestión de archivos charter requiere convenciones claras. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: La identidad del agente cambia entre sesiones

**¿Qué ocasionó el error?** INSTRUCTIONS.md se modifica sin control de versiones, o diferentes entornos tienen diferentes versiones del charter.

**¿Cómo se solucionó?** Versionar INSTRUCTIONS.md y SCAFFOLD.md en git, con CI que verifica cambios no autorizados. Incluir el commit hash en la capa de metadatos.

**¿Por qué funciona esta técnica?** El versionado garantiza trazabilidad. El commit hash en metadatos permite identificar exactamente qué identidad se usó en cada sesión.

### Caso: El pipeline de 6 capas excede el límite de contexto

**¿Qué ocasionó el error?** La suma de las 6 capas (especialmente memoria y workspace) puede exceder 25K tokens, dejando poco espacio para la conversación.

**¿Cómo se solucionó?** Aplicar compresión por capa: identity y tool guidance son fijas (~2K cada una), memory se limita a 1500 tokens, skills a 500, workspace a 30 archivos. Metadata es <200 tokens.

**¿Por qué funciona esta técnica?** Los límites por capa garantizan que el pipeline total quepa en <25% del contexto, dejando el 75% para interacción.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1500 tokens estimados al invocar este skill
- **Trigger de activación:** "identidad del agente" "system prompt" "charter" "instrucciones" "personalidad"
- **Prioridad de carga:** Alta — ES LA IDENTIDAD del agente, cargar siempre al inicio
- **Dependencias:** `26-engram-memory-system`, `27-mcp-tools-protocol`, `30-zero-token-optimization`

### Tool Integration

```json
{
  "tool_name": "ocs-identity-charter",
  "description": "Pipeline de 6 capas para identidad del agente: Identity→Tools→Memory→Skills→Workspace→Metadata. Charter via INSTRUCTIONS.md y SCAFFOLD.md. Compresión por capa para límite de contexto.",
  "triggers": ["identity charter", "system prompt", "agent identity", "instructions.md", "6-layer pipeline"],
  "context_hint": "INYECTAR SIEMPRE AL INICIO. Usar IdentityCharter.build_prompt() para generar el system prompt completo.",
  "output_format": "markdown",
  "max_tokens": 1500
}
```

### Prompt Snippet (carga rápida)

```
AL INICIO DE CADA SESIÓN: cargar ocs-identity-charter. Construir system prompt
con IdentityCharter.build_prompt(). Capa 1 (identidad) siempre, capa 3 (memoria)
y capa 4 (skills) condicionales. Limitar a <25% del contexto total.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generar system prompt
python -c "from identity import IdentityCharter; c=IdentityCharter(); print(c.build_prompt()[:500])"

# Ver archivos charter
python -c "from identity import IdentityCharter; print(list(IdentityCharter().get_charter_files().keys()))"

# Ver pipeline capas
python -c "from identity import IdentityCharter; c=IdentityCharter(); c.load_identity(); print('Identity loaded:', bool(c.pipeline.identity))"
```

### GUI / Web

- **Charter Editor**: Interfaz web para editar INSTRUCTIONS.md y SCAFFOLD.md con preview del pipeline
- **Layer Inspector**: Visualización de las 6 capas con tamaño en tokens y ratio de contexto
- **Identity Dashboard**: Estado actual de la identidad con versionado git

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Build prompt | `python -c "IdentityCharter().build_prompt()"` | Charter Editor "Build" |
| Ver capas | N/A | Layer Inspector |

---

## 7. Cheatsheet Rápido

```python
from identity import IdentityCharter
c = IdentityCharter()
prompt = c.build_prompt()
# 6 capas: Identity (2K), Tools (2K), Memory (1.5K), Skills (0.5K), Workspace (1K), Metadata (0.2K)
# Total ~7.2K tokens = ~6% de contexto 128K
# Límite: cada capa ≤ 25% del contexto total
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Complementario (capa 3 del pipeline) | Sí |
| `27-mcp-tools-protocol` | Complementario (capa 2 del pipeline) | Sí |
| `30-zero-token-optimization` | Complementario (política global en identidad) | Sí |
| `34-autoprompting-engineering` | Complementario (diseño del system prompt) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: ocs-identity-charter
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/ocs-identity-charter.md
tags: [identity-charter, system-prompt, 6-layer-pipeline, cognitive-architecture, instructions, scaffold, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

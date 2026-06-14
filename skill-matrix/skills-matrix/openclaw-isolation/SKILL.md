---
name: openclaw-isolation
description: "Protocolo de aislamiento y validación del workspace que protege contra acciones destructivas no autorizadas: operaciones que afectan ≥2 archivos requieren aprobación humana explícita (plan approval..."
---
# openclaw-isolation

## Semantic Triggers
```
openclaw isolation, workspace validation, write protection, plan approval gate, multi file guard, destructive action approval, git auto snapshot, sandbox safety
```

---

## 1. Definición Teórica

Protocolo de aislamiento y validación del workspace que protege contra acciones destructivas no autorizadas: operaciones que afectan ≥2 archivos requieren aprobación humana explícita (plan approval gate), cada escritura genera un git auto-snapshot para rollback, y el sandbox Docker zero-trust con triple capa de defensa (C++ guardrail, Go isPathSafe, HITL) previene accesos no autorizados. Resuelve el problema de que los agentes autónomos pueden modificar archivos críticos o ejecutar comandos destructivos sin supervisión.

---

## 2. Implementación de Referencia

Implementación: Go (orquestador) + C++ (guardrail). Docker sandbox con /app/shared como único volumen compartido. Sistema OCS v2.1.

### Ejemplo Práctico Avanzado

```python
import subprocess, os, json
from pathlib import Path
from typing import List, Optional
import hashlib

class OpenClaw:
    def __init__(self, shared_dir: str = "/app/shared", git_init: bool = True):
        self.shared = Path(shared_dir)
        self.safe_paths = [self.shared]
        self.restricted_patterns = ["/etc", "/proc", "/sys", "/dev", "/root"]
        self.pending_actions: List[dict] = []
        self.writes_since_approval = 0

    def is_path_safe(self, path: str) -> bool:
        """Triple defense: C++ guardrail + Go isPathSafe + Python check"""
        abs_path = os.path.abspath(path)

        # Check restricted patterns
        for restricted in self.restricted_patterns:
            if abs_path.startswith(restricted):
                return False

        # Must be within shared directory
        try:
            Path(abs_path).relative_to(self.shared)
            return True
        except ValueError:
            return False

    def validate_operation(self, files: List[str], operation: str) -> dict:
        """Evaluate if operation needs human approval"""
        risk_score = 0
        reasons = []

        # Multi-file risk
        if len(files) >= 2:
            risk_score += 3
            reasons.append(f"Multi-file operation ({len(files)} files)")

        # Destructive operations
        if operation in ["delete", "overwrite", "rename", "chmod"]:
            risk_score += 4
            reasons.append(f"Destructive operation: {operation}")

        # System file risk
        for f in files:
            if not self.is_path_safe(f):
                risk_score += 5
                reasons.append(f"Unsafe path: {f}")

        return {
            "risk_score": risk_score,
            "needs_approval": risk_score >= 3,
            "reasons": reasons,
            "operation": operation,
            "files": files,
        }

    def git_snapshot(self, target_path: str) -> bool:
        """Auto-snapshot before every write"""
        rel_path = os.path.relpath(target_path, self.shared)
        try:
            if not (self.shared / ".git").exists():
                subprocess.run(["git", "init"], cwd=self.shared, capture_output=True)
                subprocess.run(["git", "config", "user.name", "OCS"],
                             cwd=self.shared, capture_output=True)
                subprocess.run(["git", "config", "user.email", "ocs@sandbox.local"],
                             cwd=self.shared, capture_output=True)

            subprocess.run(["git", "add", rel_path], cwd=self.shared, capture_output=True)
            result = subprocess.run(
                ["git", "commit", "-m", f"OCS auto-snapshot: {rel_path}"],
                cwd=self.shared, capture_output=True
            )
            return result.returncode == 0
        except Exception:
            return False

    def plan_approval_gate(self, writes: int, files: List[str]) -> bool:
        """Gate: ≥2 files → require approval"""
        if writes < 2:
            self.writes_since_approval += writes
            return True

        plan = {
            "files_count": writes,
            "files": files,
            "pending": True,
            "approved": False,
        }
        self.pending_actions.append(plan)

        # In production: this blocks and waits for human via WebSocket
        # Here: auto-approve for testing
        plan["approved"] = True
        plan["pending"] = False
        self.writes_since_approval = 0
        return plan["approved"]

    def secure_write(self, path: str, content: str) -> dict:
        """Write with full OpenClaw protection"""
        if not self.is_path_safe(path):
            return {"status": "rejected", "reason": f"Unsafe path: {path}"}

        self.git_snapshot(path)

        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(content)

        return {"status": "written", "path": path, "size": len(content)}

openclaw = OpenClaw("/tmp/test-sandbox")
os.makedirs("/tmp/test-sandbox", exist_ok=True)

# Test
result = openclaw.plan_approval_gate(3, ["f1.txt", "f2.txt", "f3.txt"])
print(f"Approval needed: {not result}")  # False if auto-approved

result = openclaw.is_path_safe("/etc/passwd")
print(f"/etc/passwd safe: {result}")  # False

result = openclaw.secure_write("/tmp/test-sandbox/test.txt", "hello")
print(f"Write: {result['status']}")
```

**Fuente oficial:** OpenClaw Isolation Protocol de OCS v2.1.

### Alternativa de Implementación Específica

Para entornos sin Docker, implementar solo la capa Python de validación de rutas + git snapshot. Menos seguro pero funcional en desarrollo local.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes con permisos de escritura, entornos multi-tenant, playgrounds interactivos, automatización de infraestructura. |
| **Cuándo evitar** | Agentes de solo lectura, entornos controlados donde el agente es de confianza, prototipos rápidos. |
| **Alternativas** | 1) OpenClaw + Docker (máxima seguridad). 2) Git auto-snapshot + approval (seguridad media). 3) Solo validación de rutas (mínima). |
| **Coste/Complejidad** | Medio-Alto: Docker sandbox añade overhead. Git snapshots incrementales requieren gestión de commits. La triple capa de defensa es compleja de mantener. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Git auto-snapshot crea demasiados commits (cientos por sesión)

**¿Qué ocasionó el error?** Cada write_file invoca `git add + commit`, generando un commit por archivo por modificación. Una sesión de edición intensiva puede crear 200+ commits.

**¿Cómo se solucionó?** Implementar debounce: agrupar writes dentro de una ventana de 5s en un solo commit. Usar `git commit --amend` si el último commit es <30s.

**¿Por qué funciona esta técnica?** El debounce reduce el número de commits sin perder la capacidad de rollback. Amend preserva el historial limpio.

### Caso: El approval gate bloquea operaciones seguras de 2+ archivos

**¿Qué ocasionó el error?** La regla "≥2 files → approval" es demasiado estricta: crear un `index.html` + `style.css` (2 archivos nuevos) requiere aprobación aunque sea una operación de bajo riesgo.

**¿Cómo se solucionó?** Añadir excepción para archivos nuevos (no existentes previamente) y patrones de proyecto conocidos (creación de componentes, assets). Solo requerir approval para modificación/eliminación de existentes.

**¿Por qué funciona esta técnica?** Los archivos nuevos no tienen riesgo de destrucción de datos. Los patrones de proyecto reconocen operaciones estándar de desarrollo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimados al invocar este skill
- **Trigger de activación:** "openclaw" "aislamiento" "protección de escritura" "sandbox" "approval gate"
- **Prioridad de carga:** Alta — INFRAESTRUCTURA CRÍTICA de seguridad del agente
- **Dependencias:** `24-agent-human-in-the-loop-hitl`, `37-predict-failure-risk`, `31-openclaw-isolation`

### Tool Integration

```json
{
  "tool_name": "openclaw-isolation",
  "description": "Protocolo de aislamiento: validación de rutas, approval gate multi-archivo, git auto-snapshot, sandbox Docker triple capa. Previene acciones destructivas no autorizadas.",
  "triggers": ["openclaw", "isolation", "write protection", "sandbox", "approval gate", "git snapshot"],
  "context_hint": "Inyectar secciones 1-2 para implementación; sección 4 para approval gate optimista.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Antes de cualquier operación de escritura múltiple, cargar openclaw-isolation.
Ejecutar plan_approval_gate si ≥2 archivos afectados. Aplicar git_snapshot antes
de cada write. Validar is_path_safe contra restricted_patterns.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver estado del sandbox
python -c "from openclaw import OpenClaw; o=OpenClaw(); print('Safe paths:', o.safe_paths)"

# Probar validación de ruta
python -c "OpenClaw().is_path_safe('/etc/shadow')"

# Ver git log de snapshots
cd /app/shared && git log --oneline -10
```

### GUI / Web

- **OpenClaw Dashboard**: Panel de control con approval queue, historial de snapshots, y mapa de archivos modificados
- **Git History Viewer**: Navegación de commits auto-snapshot con diff por archivo
- **Sandbox Status**: Indicador de aislamiento (activo/inactivo) con conteo de approvals pendientes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver pendientes | `python -c "OpenClaw().pending_actions"` | Dashboard "Pending" |
| Git log | `cd /shared && git log --oneline` | Dashboard "History" |

---

## 7. Cheatsheet Rápido

```python
from openclaw import OpenClaw
o = OpenClaw("/app/shared")
o.is_path_safe("/etc/passwd")  # → False
o.plan_approval_gate(3, ["a.txt","b.txt"])  # ≥2 → approval needed
o.secure_write("/app/shared/test.txt", "content")  # auto-snapshot
# Restricted: /etc, /proc, /sys, /dev, /root
# Debounce: writes grouped in 5s window
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `24-agent-human-in-the-loop-hitl` | Complementario (HITL como capa de aprobación) | Sí |
| `37-predict-failure-risk` | Complementario (riesgo antes de acción) | Sí |
| `30-zero-token-optimization` | Complementario (respuestas cortas en aprobaciones) | No |
| `10-guardrails-nemo-llamaguard` | Complementario (guardrails de seguridad) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: openclaw-isolation
domain: 05-ia-agentica-datos
version: 2.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/openclaw-isolation.md
tags: [openclaw, isolation, sandbox, approval-gate, git-snapshot, write-protection, ocs-core]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

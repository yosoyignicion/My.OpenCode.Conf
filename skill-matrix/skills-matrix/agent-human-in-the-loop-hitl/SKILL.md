---
name: agent-human-in-the-loop-hitl
description: "Patrón de diseño donde el agente de IA ejecuta tareas de forma autónoma hasta que encuentra puntos de decisión crítica (acciones destructivas, baja confianza, ambigüedad) donde pausa y solicita int..."
---
# agent-human-in-the-loop-hitl

## Semantic Triggers
```
human in the loop, hitl agent, human approval, agent intervention, human oversight, human agent collaboration, approval gates, escalation path, shadow mode
```

---

## 1. Definición Teórica

Patrón de diseño donde el agente de IA ejecuta tareas de forma autónoma hasta que encuentra puntos de decisión crítica (acciones destructivas, baja confianza, ambigüedad) donde pausa y solicita intervención humana. Las compuertas de aprobación (approval gates) bloquean acciones hasta recibir confirmación explícita, y los caminos de escalación estructuran el handoff con contexto y recomendaciones. Resuelve el problema de que los agentes autónomos pueden tomar acciones irreversibles o incorrectas sin supervisión humana.

---

## 2. Implementación de Referencia

Implementación: asyncio.Queue + WebSocket para aprobación en tiempo real. Frameworks: LangGraph `interrupt`, CrewAI `human_input`. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from pydantic import BaseModel, Field
from typing import Callable, Optional, Literal
import asyncio
import uuid

class ApprovalRequest(BaseModel):
    id: str
    action: str
    description: str
    context: dict
    risk_level: Literal["low", "medium", "high", "critical"]
    pending_since: float = 0.0

class HumanInTheLoop:
    def __init__(self, notify_fn: Callable = None):
        self.pending_queue: dict[str, ApprovalRequest] = {}
        self.response_queue = asyncio.Queue()
        self.notify = notify_fn or (lambda r: print(f"Approval needed: {r.action}"))
        self.confidence_threshold = 0.8
        self.auto_approve_patterns: list[str] = []

    async def request_approval(self, action: str, context: dict, 
                               risk_level: str = "medium") -> ApprovalRequest:
        req = ApprovalRequest(
            id=str(uuid.uuid4())[:8],
            action=action,
            description=self._describe_action(action, context),
            context=context,
            risk_level=risk_level,
        )
        self.pending_queue[req.id] = req
        self.notify(req)

        if await self._can_auto_approve(req):
            return self._approve(req.id)
        if risk_level == "critical":
            return await self._wait_human(req, timeout=300)
        return await self._wait_human(req, timeout=60)

    async def _wait_human(self, req: ApprovalRequest, timeout: int) -> ApprovalRequest:
        try:
            response = await asyncio.wait_for(self.response_queue.get(), timeout=timeout)
            if response["id"] == req.id and response["approved"]:
                return self._approve(req.id)
            return self._reject(req.id, response.get("reason", "No reason given"))
        except asyncio.TimeoutError:
            return self._reject(req.id, "Timeout - auto-rejected")

    async def _can_auto_approve(self, req: ApprovalRequest) -> bool:
        # Auto-approve if action matches safe pattern
        for pattern in self.auto_approve_patterns:
            if pattern in req.action:
                return True
        # Auto-approve if low confidence threshold is met
        if req.risk_level == "low" and len(self.pending_queue) < 5:
            return True
        return False

    def _approve(self, req_id: str) -> ApprovalRequest:
        req = self.pending_queue.pop(req_id, None)
        return req

    def _reject(self, req_id: str, reason: str) -> ApprovalRequest:
        req = self.pending_queue.pop(req_id, None)
        return req

    def _describe_action(self, action: str, context: dict) -> str:
        return f"{action} with params: {context}"

    async def shadow_mode(self, agent_func, *args, **kwargs):
        """Execute in shadow mode: run + log, but don't commit"""
        result = await agent_func(*args, **kwargs)
        log = {"action": str(agent_func), "args": args, "result": str(result), "approved": False}
        return log

hitl = HumanInTheLoop()
result = await hitl.request_approval("delete_file", {"path": "/data/tmp.txt"}, "high")
```

**Fuente oficial:** https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/

### Alternativa de Implementación Específica

Usar LangGraph `interrupt` para pausar el grafo del agente y esperar input humano en cualquier nodo, con reanudación automática al recibir aprobación.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Acciones destructivas (delete, write, deploy), alta incertidumbre, primeros despliegues de agentes autónomos. |
| **Cuándo evitar** | Agentes completamente autónomos con bajo riesgo (lectura, búsqueda); el HITL añade latencia significativa. |
| **Alternativas** | 1) Approval gates por tipo de acción. 2) Shadow mode (ejecuta pero no commitea). 3) Confidence threshold (auto-decision). |
| **Coste/Complejidad** | Medio: requiere infraestructura de notificación al humano (WebSocket, email, UI). La gestión de timeouts es crítica. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El humano no responde y el agente se bloquea indefinidamente

**¿Qué ocasionó el error?**
La cola de aprobación bloquea la ejecución del agente hasta respuesta humana. Si el humano está ausente (dormido, fuera), el agente se detiene permanentemente.

**¿Cómo se solucionó?**
Implementar timeout por nivel de riesgo: critical=300s, high=120s, medium=60s, low=auto-approve. Timeout → auto-rechazar con log para revisión posterior.

**¿Por qué funciona esta técnica?**
Timeouts escalonados garantizan que el agente nunca se bloquee permanentemente. El auto-rechazo con log preserva la traza para revisión asíncrona.

### Caso: Demasiadas solicitudes de aprobación abruman al humano

**¿Qué ocasionó el error?**
Cada tool call del agente requiere aprobación, incluso las de bajo riesgo (lectura de archivos, búsquedas), creando fatiga de notificaciones.

**¿Cómo se solucionó?**
Implementar auto-approve para acciones de bajo riesgo, confianza alta, y patrones conocidos. Solo solicitar aprobación para acciones destructivas (write, delete, deploy) o riesgo >0.7.

**¿Por qué funciona esta técnica?**
El filtrado por nivel de riesgo reduce el volumen de notificaciones 10x. La auto-aprobación de patrones conocidos (como commits frecuentes) elimina ruido.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "human in the loop" "aprobación humana" "hitl" "supervisión de agente"
- **Prioridad de carga:** Alta — crítico para agentes con acciones destructivas
- **Dependencias:** `31-openclaw-isolation`, `37-predict-failure-risk`

### Tool Integration

```json
{
  "tool_name": "agent-human-in-the-loop-hitl",
  "description": "Patrón Human-in-the-Loop para agentes: approval gates, escalación, shadow mode, timeouts por riesgo, auto-approve para acciones seguras.",
  "triggers": ["human in the loop", "approval", "hitl", "human oversight", "agent intervention"],
  "context_hint": "Inyectar sección 2 para HumanInTheLoop class; sección 4 para bloqueos y fatiga de aprobación.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario necesite supervisión humana sobre acciones del agente, carga
agent-human-in-the-loop-hitl. Implementa approval gates con timeout por nivel de riesgo:
critical=300s, high=120s, medium=60s, low=auto-approve.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver solicitudes pendientes
python -c "from hitl import HITL; h = HITL(); [print(r) for r in h.pending_queue.values()]"

# Aprobar desde CLI
python -c "from hitl import HITL; HITL().response_queue.put({'id':'abc123','approved':True})"
```

### GUI / Web

- **OpenClaw Dashboard**: Interfaz de aprobación con detalles de acción, contexto, y riesgo
- **LangGraph Studio**: Nodos de interrupt con botón "Approve/Reject"
- **Slack/Webhook**: Notificaciones de aprobación con botones de acción

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver pendientes | `python -c "HITL().pending_queue"` | Dashboard "Pending" |
| Aprobar último | `python -c "..."` | `Ctrl+A` (custom) |

---

## 7. Cheatsheet Rápido

```python
# Approval gates: timeout por riesgo (critical=300s, high=120s, medium=60s, low=auto)
# Shadow mode: ejecuta sin commitar, log para revisión
# Auto-approve: patrones conocidos, baja confianza
# Timeout → auto-reject + log
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `31-openclaw-isolation` | Complementario (OpenClaw como implementación de HITL) | Sí |
| `37-predict-failure-risk` | Complementario (riesgo para decidir aprobación automática) | Sí |
| `10-guardrails-nemo-llamaguard` | Complementario (guardrails como HITL automático) | No |
| `04-tool-use-function-calling` | Complementario (tools sujetas a aprobación) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: agent-human-in-the-loop-hitl
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [human-in-the-loop, hitl, approval-gate, shadow-mode, escalation, oversight, langgraph-interrupt]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

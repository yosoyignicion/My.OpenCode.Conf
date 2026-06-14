---
name: predict-failure-risk
description: "Algoritmo tríadico de evaluación de riesgo que analiza historial de comandos en Engram FTS5 + detección de bucles temporales (consecutive failures) + consulta a Context7 para calcular un score de r..."
---
# predict-failure-risk

## Semantic Triggers
```
failure prediction, risk assessment agent, temporal loop detection, command risk scoring, novikov risk, predictive blocking, consecutive failure detection, engram risk reduction
```

---

## 1. Definición Teórica

Algoritmo tríadico de evaluación de riesgo que analiza historial de comandos en Engram FTS5 + detección de bucles temporales (consecutive failures) + consulta a Context7 para calcular un score de riesgo (0.0-1.0) antes de ejecutar un comando. Si riesgo >0.8, el comando se bloquea automáticamente. Resuelve el problema de que los agentes repiten comandos que fallaron, desperdiciando tiempo y tokens sin aprender del error.

---

## 2. Implementación de Referencia

Implementación: Python/Go con SQLite. Sistema OCS v2.1. Triada: Engram + Loop Detection + Context7 fallback.

### Ejemplo Práctico Avanzado

```python
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Optional

class RiskPredictor:
    def __init__(self, db_path: str = "agent.db", context7_fn=None):
        self.db = sqlite3.connect(db_path)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS command_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL,
                exit_code INTEGER,
                error_output TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.context7 = context7_fn  # Optional: Context7 lookup

    def record_execution(self, command: str, exit_code: int, error: str = ""):
        self.db.execute(
            "INSERT INTO command_history (command, exit_code, error_output) VALUES (?, ?, ?)",
            (command, exit_code, error[:500])
        )
        self.db.commit()

    def assess_risk(self, command: str, engram_search_fn=None) -> dict:
        risk = 0.0
        reasons = []
        fix = None

        # Factor 1: Consecutive failures
        n_failures = self._count_consecutive_failures(command)
        if n_failures >= 3:
            risk = max(risk, 0.95)
            reasons.append(f"{n_failures} consecutive failures")
        elif n_failures >= 2:
            risk = max(risk, 0.85)
            reasons.append(f"{n_failures} consecutive failures")
        elif n_failures >= 1:
            risk = max(risk, 0.50)
            reasons.append(f"1 previous failure")

        # Factor 2: Similar error patterns in Engram
        if engram_search_fn:
            memory = engram_search_fn(command, types=["error_solution"], limit=1)
            if memory:
                fix = memory[0].get("content", "")
                risk = max(0, risk - 0.30)  # Found fix reduces risk
                reasons.append(f"Fix found in Engram (-0.30)")

        # Factor 3: Temporal pattern (same failure at same time of day)
        temporal_risk = self._check_temporal_pattern(command)
        if temporal_risk > 0.5:
            risk = max(risk, temporal_risk)
            reasons.append("Temporal pattern detected")

        # Apply thresholds
        action = "blocked" if risk > 0.8 else "allowed"
        if action == "blocked" and not fix and self.context7:
            fix = self._context7_fallback(command)

        return {
            "status": action,
            "risk": round(risk, 2),
            "reason": "; ".join(reasons) if reasons else "No risk factors detected",
            "fix": fix[:200] if fix else None,
            "n_failures": n_failures,
        }

    def _count_consecutive_failures(self, command: str) -> int:
        rows = self.db.execute("""
            SELECT exit_code FROM command_history
            WHERE command = ?
            ORDER BY id DESC LIMIT 5
        """, (command,)).fetchall()
        count = 0
        for row in rows:
            if row[0] != 0:
                count += 1
            else:
                break
        return count

    def _check_temporal_pattern(self, command: str) -> float:
        """Check if same command failed at similar time"""
        current_hour = datetime.now().hour
        rows = self.db.execute("""
            SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as cnt
            FROM command_history
            WHERE command = ? AND exit_code != 0
            GROUP BY hour
        """, (command,)).fetchall()
        for row in rows:
            if abs(row[0] - current_hour) <= 1 and row[1] >= 2:
                return 0.6
        return 0.0

    def _context7_fallback(self, command: str) -> Optional[str]:
        if not self.context7:
            return None
        return self.context7(command)

predictor = RiskPredictor()
predictor.record_execution("docker compose up", 1, "port in use")
predictor.record_execution("docker compose up", 1, "port in use")

risk = predictor.assess_risk("docker compose up")
print(f"Risk: {risk['risk']}, Action: {risk['status']}")
print(f"Reason: {risk['reason']}")
```

**Fuente oficial:** Risk Prediction System de OCS v2.1 (Novikov Triadic Algorithm).

### Alternativa de Implementación Específica

Para sistemas sin Engram, usar solo detección de bucles temporales (factor 1) + blacklist de comandos que fallaron >3 veces.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Agentes que ejecutan muchos comandos, especialmente en entornos impredecibles donde los fallos son comunes. |
| **Cuándo evitar** | Entornos estables donde los comandos raramente fallan; el overhead de evaluación no se justifica. |
| **Alternativas** | 1) Tríada completa (más preciso). 2) Solo loop detection (simple). 3) Blacklist manual (control total). |
| **Coste/Complejidad** | Bajo: consultas SQL simples. Engram search añade latencia mínima. Context7 fallback solo si riesgo alto. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El predictor bloquea comandos que antes fallaban pero ahora funcionan

**¿Qué ocasionó el error?** El comando falló 3 veces por un error de red temporal (DNS timeout), pero ahora la red funciona. El predictor lo bloquea por el historial.

**¿Cómo se solucionó?** Añadir decay temporal: si el último fallo fue hace >1h, reducir el contador de fallos consecutivos en 1. Si >24h, resetear contador.

**¿Por qué funciona esta técnica?** El decay temporal reconoce que los fallos antiguos pueden no ser relevantes para el estado actual del sistema.

### Caso: Engram tiene un fix pero el comando sigue fallando

**¿Qué ocasionó el error?** Engram almacenó un fix incorrecto o parcial que el agente aplicó sin éxito, pero el predictor reduce el riesgo por tener "fix en Engram".

**¿Cómo se solucionó?** Verificar el fix antes de aplicarlo: si el comando falla después de aplicar el fix de Engram, marcar ese fix como ineficaz (reducir su importancia en -0.2).

**¿Por qué funciona esta técnica?** El feedback loop (fallo post-fix) permite que el sistema aprenda qué fixes son efectivos y cuáles no, mejorando la calidad de las sugerencias.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "risk assessment" "failure prediction" "bloquear comando" "riesgo" "loop detection"
- **Prioridad de carga:** Alta — previene fallos repetitivos y ahorra tokens
- **Dependencias:** `26-engram-memory-system`, `36-context7-mcp-docs`, `31-openclaw-isolation`

### Tool Integration

```json
{
  "tool_name": "predict-failure-risk",
  "description": "Predicción de riesgo de fallo de comandos: triada Engram + loop detection + Context7. Risk scoring (0-1), bloqueo automático si >0.8, reducción de riesgo por fix encontrado.",
  "triggers": ["failure prediction", "risk assessment", "predictive blocking", "loop detection", "command risk"],
  "context_hint": "Inyectar antes de ejecutar comandos. Usar assess_risk() para obtener score; bloquear si >0.8.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
ANTES DE EJECUTAR CUALQUIER COMANDO: cargar predict-failure-risk. Ejecutar
assess_risk(command). Si risk > 0.8: BLOQUEAR y mostrar fix de Engram o Context7.
Si risk 0.5-0.8: ALERTAR pero permitir. Registrar resultado post-ejecución.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Evaluar riesgo de comando
python -c "from risk import RiskPredictor; r=RiskPredictor(); print(r.assess_risk('docker compose up'))"

# Ver historial de fallos
sqlite3 agent.db "SELECT command, COUNT(*) as failures FROM command_history WHERE exit_code != 0 GROUP BY command ORDER BY failures DESC LIMIT 10"

# Resetear contador de fallos
python -c "from risk import RiskPredictor; r=RiskPredictor(); r.db.execute('DELETE FROM command_history WHERE command=?', ('bad_command',)); r.db.commit()"
```

### GUI / Web

- **Risk Dashboard**: Score de riesgo en tiempo real, historial de bloqueos, y fixes disponibles
- **Command History**: Tabla de comandos con exit code, frecuencia, y último fallo
- **Engram Fix Browser**: Navegación de fixes almacenados por tipo error_solution

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Evaluar riesgo | `python -c "RiskPredictor().assess_risk('cmd')"` | Dashboard "Assess" |
| Ver historial | `sqlite3 db "SELECT * FROM command_history"` | Command History table |

---

## 7. Cheatsheet Rápido

```python
from risk import RiskPredictor
r = RiskPredictor()
r.record_execution("cmd", exit_code, error)
risk = r.assess_risk("cmd", engram_search_fn)
# Risk > 0.8 → blocked, 0.5-0.8 → warned, < 0.5 → allowed
# Reducción: fix en Engram = -0.30
# Decay: fallo >1h = -1 count, >24h = reset
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `26-engram-memory-system` | Complementario (buscar fixes en Engram) | Sí |
| `36-context7-mcp-docs` | Complementario (Context7 fallback) | Sí |
| `31-openclaw-isolation` | Complementario (bloquear + OpenClaw) | Sí |
| `30-zero-token-optimization` | Complementario (respuesta corta: blocked/allowed) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: predict-failure-risk
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/global-agents-skills/system/predict_failure.skill.md
tags: [risk-assessment, failure-prediction, loop-detection, predictive-blocking, engram, context7]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

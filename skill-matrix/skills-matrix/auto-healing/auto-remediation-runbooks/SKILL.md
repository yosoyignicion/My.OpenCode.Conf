# auto-remediation-runbooks

## Semantic Triggers
```
auto remediation, runbook automation, runbook execution, incident automation, AWS SSM, Azure Automation, Ansible, StackStorm, incident response automation, OpsGenie, AIOps remediation
```

---

## 1. Definición Teórica

Auto-remediation runbooks resuelven el problema de la respuesta manual a incidentes recurrentes mediante la codificación de procedimientos operacionales como scripts ejecutables, testeables y auditables, que se disparan automáticamente ante alertas o manualmente con un click. El principio fundamental es "codificar el conocimiento tribal del equipo on-call": cada vez que un humano soluciona un problema conocido (ej: "reiniciar el cluster de Redis si la memoria > 90%"), se captura el procedimiento como un runbook versionado en Git. Aplica en operaciones de producción (DevOps/SRE) donde el tiempo de respuesta humano (MTTR) se acumula. Existe como categoría diferenciada del simple scripting porque añade: idempotencia (ejecutable N veces con el mismo resultado), guard rails (no ejecutar si las precondiciones no se cumplen), audit log (quién-qué-cuándo), rollback (deshacer la acción), y aprobación humana (HITL) para acciones de alto riesgo.

---

## 2. Implementación de Referencia

Tooling de referencia: AWS Systems Manager (SSM) Automation Documents, Azure Automation Runbooks, Ansible 8.x (AWX/Tower), StackStorm 3.x (event-driven automation), Netflix Blanket. Lenguajes: Python (boto3, ansible), YAML declarativo, Go.

### Ejemplo Práctico Avanzado

```yaml
# AWS SSM Automation Document: remediate high memory on Redis cluster
# Disparador: CloudWatch alarm cuando MemoryUsage > 90% en ElastiCache
schemaVersion: "0.3"
description: |
  Remedia uso elevado de memoria en ElastiCache Redis cluster.
  Acciones: scale-up vertical (cambiar node type) si está cerca del máximo,
  o limpieza de keys expiradas si no.
assumeRole: "{{ AutomationAssumeRole }}"
parameters:
  ClusterId:
    type: String
    description: "ID del cluster ElastiCache"
  MemoryThreshold:
    type: Integer
    default: 90
    description: "Threshold % memoria para activar remediación"
  MaxNodeType:
    type: String
    default: "cache.r6g.4xlarge"
    description: "Node type máximo permitido (guard rail de coste)"

mainSteps:
  # Step 1: Verificar guard rails (HITL si excede)
  - name: CheckMemoryUsage
    action: aws:executeAwsApi
    inputs:
      Service: cloudwatch
      Api: GetMetricStatistics
      Namespace: AWS/ElastiCache
      MetricName: DatabaseMemoryUsagePercentage
      Dimensions: [{ Name: CacheClusterId, Values: ["{{ ClusterId }}"] }]
      StartTime: "{{ global:DATE_TIME_MINUS_5M }}"
      EndTime: "{{ global:DATE_TIME }}"
      Period: 60
      Statistics: [Average]
    outputs:
      - Name: CurrentMemory
        Selector: "$.Datapoints[0].Average"
        Type: Double

  # Step 2: Determinar acción (branching)
  - name: ChooseAction
    action: aws:branch
    inputs:
      Choices:
        # Si memoria < 95%, ejecutar cleanup de keys
        - NextStep: CleanupExpiredKeys
          Variable: "{{ CheckMemoryUsage.CurrentMemory }}"
          NumericLess: 95
        # Si 95% < memoria < 99% y se puede escalar, pedir aprobación
        - NextStep: RequestScaleUpApproval
          Variable: "{{ CheckMemoryUsage.CurrentMemory }}"
          NumericGreater: 95
          NumericLess: 99
        # Si > 99% = emergencia, escalar sin aprobación
        - NextStep: EmergencyScaleUp
          Variable: "{{ CheckMemoryUsage.CurrentMemory }}"
          NumericGreater: 99
    Default: NotifyOnly

  # Step 3a: Limpieza (segura, sin aprobación)
  - name: CleanupExpiredKeys
    action: aws:executeAwsApi
    inputs:
      Service: elasticache
      Api: ModifyReplicationGroup
      ReplicationGroupId: "{{ ClusterId }}"
      ApplyImmediately: true
      # Forzar eviction policy LRU en lugar de no-eviction
      CacheParameterGroupName: "default.redis6.x.lru-on"
    onFailure: Abort

  # Step 3b: Scale-up con HITL
  - name: RequestScaleUpApproval
    action: aws:approve
    inputs:
      NotificationArn: "arn:aws:sns:us-east-1:111:ops-approvals"
      Message: "Redis {{ ClusterId }} en {{ CheckMemoryUsage.CurrentMemory }}% memoria. Aprobar scale-up?"
      MinRequiredApprovals: 1
      Approvers: ["sre-team"]

  # Step 3c: Scale-up de emergencia
  - name: EmergencyScaleUp
    action: aws:executeAwsApi
    inputs:
      Service: elasticache
      Api: ModifyReplicationGroup
      ReplicationGroupId: "{{ ClusterId }}"
      ApplyImmediately: true
      NodeGroupConfiguration:
        - NodeId: "0001"
          NewReplicaCount: 1
    onFailure: step:NotifyOnly

  - name: NotifyOnly
    action: aws:executeAwsApi
    inputs:
      Service: sns
      Api: Publish
      TopicArn: "arn:aws:sns:us-east-1:111:ops-critical"
      Message: "ElastiCache {{ ClusterId }} no pudo remediarse automáticamente. Intervención manual requerida."

outputs:
  - ActionTaken
  - FinalMemoryUsage
```

```python
# StackStorm 3.x: regla que dispara el pack desde una alerta
---
name: auto_remediate_redis_memory
description: "Dispara runbook de auto-remediation cuando CloudWatch alerta"
pack: redis_ops
enabled: true

trigger:
  type: webhook
  parameters:
    url: "auto-remediate-redis"

criteria:
  trigger.payload.alarm_name: "redis-memory-high"

action:
  ref: redis.auto_remediate
  parameters:
    cluster_id: "{{ trigger.payload.cluster_id }}"
    memory_threshold: 90

# Pack action (Python)
# /opt/stackstorm/packs/redis_ops/actions/auto_remediate.py
from st2common.runners.base_action import Action
import boto3

class AutoRemediateAction(Action):
    def run(self, cluster_id, memory_threshold):
        ssm = boto3.client('ssm')
        response = ssm.start_automation_execution(
            DocumentName='AWS-Remediate-ElastiCache-Memory',
            Parameters=[
                {'Name': 'ClusterId', 'Value': cluster_id},
                {'Name': 'MemoryThreshold', 'Value': str(memory_threshold)}
            ]
        )
        return {
            'execution_id': response['AutomationExecutionId'],
            'status': 'started'
        }
```

**Fuente oficial:** [AWS Systems Manager Automation](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation.html) · [StackStorm Docs](https://docs.stackstorm.com/) · [Ansible AWX Runbooks](https://github.com/ansible/awx)

### Alternativa de Implementación Específica

Azure: Azure Automation Runbooks con PowerShell o Python. Integración nativa con Azure Monitor alerts, similar patrón a AWS SSM pero con `Az` PowerShell modules.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Alertas recurrentes con causa conocida (memory pressure, disk full, certificate expiry), tareas de mantenimiento (cleanup, scaling), compliance remediation (patches) |
| **Cuándo evitar** | Acciones irreversibles (delete DB), primeras ocurrencias de un problema (necesitan investigación humana), sistemas con efectos legales/financieros |
| **Alternativas** | PagerDuty + runbook manual (humano siempre en el loop), Ansible Tower con surveys (semi-automático), AIOps platforms (BigPanda, Moogsoft con ML) |
| **Coste/Complejidad** | Coste medio (SSM incluido en AWS, AWX open-source); ROI alto en reducción de MTTR; requiere testing riguroso del runbook antes de automatizar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Runbook automatizado causa outage en cascada

**¿Qué ocasionó el error?**
Una alerta de "high memory" disparó el runbook que escala verticalmente Redis. El scale-up (cambio de node type) requiere un failover forzado que reinicia el primary. La app no estaba preparada para el failover (reconnect logic ausente), y durante el reinicio de Redis, todas las requests fallaron.

**¿Cómo se solucionó?**
1. **Test del runbook en staging** con carga real antes de producción
2. **Throttle del runbook**: añadir `rateLimit: 1 per 30min` por cluster (evita ejecuciones concurrentes)
3. **Pre-check de prerequisites**: el runbook debe verificar que la app tiene reconnect logic activo (probe)
4. **Rollback automático**: el runbook debe saber cómo revertir la acción si empeora la situación
5. **HITL para acciones de riesgo medio/alto**: solo automatizar acciones de riesgo bajo (cleanup, restart) sin aprobación

**¿Por qué funciona esta técnica?**
La automatización sin testing replica errores a velocidad de máquina. El throttle previene cascadas. El rollback automático limita el blast radius. El HITL mantiene el juicio humano donde es necesario.

### Caso: Runbook se ejecuta pero no resuelve el problema

**¿Qué ocasionó el error?**
El runbook de "disk full" limpia logs antiguos. Pero la causa raíz es que un log loop genera 10GB/min de logs. La remediación funciona una vez, pero en 5 min el disco vuelve a llenarse. La alerta se dispara en bucle, ejecutando el runbook N veces.

**¿Cómo se solucionó?**
1. **Detección de causa raíz**: el runbook debe correlacionar con otras métricas (CPU, network, app errors) para distinguir síntoma de causa
2. **Escalation logic**: si el runbook falla N veces (típicamente 3) en X minutos, escalar a humano con contexto enriquecido
3. **Quarantine de la fuente**: si la causa es una app con bug, identificarla y reducir su capacidad (scale-to-1) en lugar de seguir mitigando

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "runbook", "auto remediation", "incident automation", "SSM automation", "AWX"
- **Prioridad de carga:** Media — relevante para SRE/Platform teams
- **Dependencias:** `monitoring-prometheus-metrics`, `auto-scaling-strategies`, `agent-human-in-the-loop-hitl`

### Tool Integration

```json
{
  "tool_name": "auto_remediation_runbooks",
  "description": "Diseña y ejecuta runbooks de auto-remediation: codifica procedimientos operacionales como ejecutables idempotentes con guard rails, HITL, y rollback. SSM, AWX, StackStorm.",
  "triggers": ["runbook", "auto remediation", "incident automation", "SSM", "AWX", "MTTR reduction"],
  "context_hint": "Cargar cuando el usuario mencione incidentes recurrentes, MTTR alto, alertas repetitivas, o deseo de codificar procedimientos manuales.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre runbooks, auto remediation o incident
automation, carga el skill auto-remediation-runbooks y prioriza AWS SSM
Automation (si AWS) o AWX (multi-cloud). Recomienda HITL para acciones
de riesgo medio/alto.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# AWS SSM: ejecutar automation document
aws ssm start-automation-execution \
  --document-name "AWS-Remediate-ElastiCache-Memory" \
  --parameters "ClusterId=my-redis,MemoryThreshold=90" \
  --output text

# Ver estado de la ejecución
aws ssm get-automation-execution --automation-execution-id <id>

# AWX/Ansible: lanzar job template
awx job_templates launch --name "Remediate Redis Memory" \
  --inventory "Redis Prod" --limit "redis-01" --wait

# StackStorm: disparar acción
st2 run redis_ops.auto_remediate cluster_id=my-redis memory_threshold=90
```

### GUI / Web

- **AWS Console → Systems Manager → Automation**: lista de ejecuciones, logs, success/failure
- **Ansible AWX Dashboard**: vista de jobs con playbook flow, retries, inventory
- **StackStorm Web UI**: action runner con approval workflow visual
- **PagerDuty + Runbook Automation**: incidente → runbook asociado en un click

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver ejecuciones recientes | `aws ssm describe-automation-executions` | Panel "Recent" en SSM Console |
| Aprobar HITL step | N/A (vía SNS/SSM approve action) | Botón "Approve" en PagerDuty/SSM |
| Cancelar ejecución | `aws ssm stop-automation-execution` | Botón "Stop" en AWX job |

---

## 7. Cheatsheet Rápido

```yaml
# AWS SSM: estructura mínima
mainSteps:
  - name: Check
    action: aws:executeAwsApi
  - name: Branch
    action: aws:branch
    Choices: [...]
  - name: Remediate
    action: aws:executeAwsApi
    onFailure: step:Notify
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `monitoring-prometheus-metrics` | Dependiente (alertas como trigger) | Sí |
| `auto-healing-systems` | Complementario (K8s healing vs cloud runbook) | Sí |
| `agent-human-in-the-loop-hitl` | Complementario (HITL para acciones riesgosas) | Sí |
| `predictive-failure-detection` | Superconjunto (ML detecta + runbook aplica) | No |
| `auto-scaling-strategies` | Complementario (runbook puede escalar) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: auto-remediation-runbooks
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [runbook, auto-remediation, SSM, AWX, StackStorm, incident-automation, MTTR, SRE]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

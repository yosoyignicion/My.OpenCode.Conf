# auto-healing-systems

## Semantic Triggers
```
auto-healing, self-healing, automatic recovery, fault tolerance, resilient systems, self-repair, autonomous operations, healing loop, AIOps, recovery automation
```

---

## 1. Definición Teórica

Los sistemas auto-healing (auto-curativos) resuelven el problema de la recuperación manual de fallos en infraestructura distribuida mediante bucles cerrados de detección-diagnóstico-remediación ejecutados sin intervención humana. El principio fundamental combina tres pilares: observabilidad continua (métricas, logs, trazas), una máquina de estados que evalúa la salud del sistema contra SLOs definidos, y un motor de remediación que ejecuta acciones pre-aprobadas cuando se detecta desviación. Aplica en arquitecturas cloud-native (Kubernetes, service mesh, serverless) donde los fallos son considerados la norma (antifragilidad) y el coste de respuesta humana supera al coste de automatización. Existe como categoría diferenciada porque desplaza el modelo mental de "prevenir fallos" a "asumir fallos y recuperarse rápido" (MTTR < MTTF).

---

## 2. Implementación de Referencia

Framework de referencia: Kubernetes con operadores personalizados (Operator SDK / Kubebuilder v3.10+, Go 1.22+). Estándares: SIG-AWS Auto Healing, Azure Automation Runbooks, GCP Cloud Workflows. Compatible con OpenTelemetry para telemetría unificada.

### Ejemplo Práctico Avanzado

```go
// Operator Go que reconcilia el estado deseado de un Deployment
// Patrón: observe-diff-act loop con backoff exponencial
package main

import (
    "context"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/reconcile"
)

type Healer struct {
    client.Client
    MaxRetries int
}

func (h *Healer) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
    var dep appsv1.Deployment
    if err := h.Get(ctx, req.NamespacedName, &dep); err != nil {
        if errors.IsNotFound(err) {
            return reconcile.Result{}, nil
        }
        return reconcile.Result{}, err
    }

    // 1. DETECT: ¿el deployment está healthy?
    if dep.Status.ReadyReplicas == *dep.Spec.Replicas {
        return reconcile.Result{RequeueAfter: 30 * time.Second}, nil
    }

    // 2. DIAGNOSE: ¿es un crash loop o un fallo transitorio?
    if isCrashLoopBackOff(dep) {
        // 3. REMEDIATE: reinicia con backoff para evitar storm
        return h.rollingRestart(ctx, &dep)
    }

    // Re-queue para reevaluar en 5s
    return reconcile.Result{RequeueAfter: 5 * time.Second}, nil
}

func (h *Healer) rollingRestart(ctx context.Context, dep *appsv1.Deployment) (reconcile.Result, error) {
    if patch := deploymentWithRestartAnnotation(dep); patch != nil {
        return reconcile.Result{}, h.Update(ctx, patch)
    }
    return reconcile.Result{RequeueAfter: 10 * time.Second}, nil
}
```

**Fuente oficial:** [Kubernetes Operator Pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/) · [CNCF Auto Healing Whitepaper](https://www.cncf.io/)

### Alternativa de Implementación Específica

AWS SSM Automation Documents + CloudWatch Alarms: define un `Automation` document con steps `aws:executeAutomation` que invocan Lambda functions o `aws:ecsService` actions. Más sencillo para workloads no-K8s.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas distribuidos con MTTR > 5min, > 50 microservicios, equipos on-call saturados, SLOs estrictos (99.9%+) |
| **Cuándo evitar** | Aplicaciones monolíticas, sistemas con efectos secundarios irreversibles (transacciones financieras), entornos regulados que requieren aprobación humana |
| **Alternativas** | Chaos Engineering (proactivo, no reactivo), Runbooks manuales + PagerDuty (humano en el loop), Observabilidad + dashboards (sin remediación automática) |
| **Coste/Complejidad** | Alto coste inicial (3-6 meses para un Operator robusto); reduce MTTR en 60-80% según informe de Google SRE 2024; requiere tests exhaustivos del bucle de remediación |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El operador entra en bucle infinito de remediación

**¿Qué ocasionó el error?**
El operador detecta fallo, aplica fix, pero el fix mismo causa un nuevo fallo (por ejemplo: reinicia pod que vuelve a CrashLoopBackOff por bug no corregido). Esto genera storm de updates en la API de Kubernetes y aumenta el `workqueue` del controller.

**¿Cómo se solucionó?**
Implementar un contador de reintentos por recurso (`status.remediationAttempts`) con backoff exponencial. Tras N intentos fallidos (típicamente 5), escalar a intervención humana emitiendo un evento Kubernetes de tipo `Warning` con `reason=RemediationExhausted`. Referencia: PR #108542 de kubernetes-sigs/controller-runtime.

**¿Por qué funciona esta técnica?**
El backoff exponencial desacopla la presión sobre el sistema de la velocidad del bucle de control. El escalado a humano previene el "automation trap" donde un sistema automatizado causa más daño que el problema original.

### Caso: Race condition entre múltiples instancias del controlador

**¿Qué ocasionó el error?**
Dos réplicas del operador procesan el mismo recurso simultáneamente, generan updates conflictivos y la API de K8s devuelve `Conflict (409)`.

**¿Cómo se solucionó?**
Usar leader election (`--leader-elect=true` flag en controller-manager) para garantizar una sola instancia activa. Las demás quedan en standby y toman el control si la líder falla (lease TTL típico: 15s).

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "auto-healing", "self-healing", "MTTR reduction", "auto remediation"
- **Prioridad de carga:** Media — invocable solo cuando el usuario describe problemas de recuperación o fiabilidad
- **Dependencias:** `container-orchestration-k8s-scheduling`, `monitoring-prometheus-metrics`, `chaos-mesh-reliability-testing`

### Tool Integration

```json
{
  "tool_name": "auto_healing_systems",
  "description": "Diseña e implementa bucles auto-healing para sistemas distribuidos: detección, diagnóstico y remediación automatizada sin intervención humana.",
  "triggers": ["auto-healing", "self-healing", "remediación automática", "MTTR", "fault tolerance"],
  "context_hint": "Inyectar este skill cuando el usuario mencione caídas recurrentes, necesidad de reducir MTTR, o diseño de operadores K8s.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre auto-healing, recuperación automática o MTTR,
carga el skill auto-healing-systems y responde siguiendo la sección de
implementación de referencia. Prioriza el patrón Operator sobre scripts ad-hoc.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear un nuevo operador con Operator SDK
operator-sdk init --domain example.com --repo github.com/example/healer
operator-sdk create api --group apps --version v1 --kind Healer --resource --controller

# Ver eventos de remediación en un namespace
kubectl get events -n production --field-selector reason=RemediationApplied

# Logs del controlador
kubectl logs -n healer-system deploy/healer-controller-manager -f
```

### GUI / Web

- **Grafana**: dashboard con panel "Remediation Actions/min" agrupado por tipo (restart, scale, rollback)
- **Argo Workflows UI**: visualización del DAG de remediación con tiempos por step
- **Backstage (Spotify)**: plugin `auto-healing-overview` que muestra SLOs y health score por servicio
- **VS Code Kubernetes extension**: inspección de CRDs (Custom Resources) del healer

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Aplicar remediación manual | `kubectl annotate deploy foo healer.io/remediate=true` | N/A |
| Ver historial de acciones | `kubectl get events --sort-by=.lastTimestamp` | `Ctrl+Shift+E` en VS Code K8s |
| Pausar auto-healing | `kubectl scale deploy healer-controller --replicas=0` | N/A |

---

## 7. Cheatsheet Rápido

```go
// Plantilla mínima de un Reconciler auto-healing
func Reconcile(ctx, req) (Result, error) {
    obj := getObject(req)                          // 1. OBSERVE
    if isHealthy(obj) { return requeue(30s), nil } // estado estable
    if retriesExceeded(obj) { alertHuman(obj) }    // 2. ESCALATE
    return remediate(ctx, obj)                     // 3. ACT
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `chaos-mesh-reliability-testing` | Complementario (prueba el healer) | Sí |
| `circuit-breaker-pattern` | Dependiente (patrón de recuperación) | Sí |
| `container-orchestration-k8s-scheduling` | Dependiente (K8s como host) | Sí |
| `monitoring-prometheus-metrics` | Dependiente (fuente de señales) | Sí |
| `predictive-failure-detection` | Superconjunto (ML + auto-healing) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: auto-healing-systems
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [auto-healing, self-healing, kubernetes, operators, MTTR, resilience, SRE, AIOps]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

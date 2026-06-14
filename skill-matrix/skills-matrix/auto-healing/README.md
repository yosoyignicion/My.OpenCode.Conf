# auto-healing

> Dominio temático: **resiliencia y recuperación automatizada**. 10 skills oficiales y verificadas que cubren el espectro completo: desde el patrón de detección-diagnóstico-remediación hasta la predicción con ML.

## Skills incluidas

| # | Skill | Dominio técnico | Stack principal |
|---|---|---|---|
| 1 | [auto-healing-systems](./auto-healing-systems/SKILL.md) | Concepto umbrella / K8s Operators | Go + Operator SDK + controller-runtime |
| 2 | [self-healing-infrastructure](./self-healing-infrastructure/SKILL.md) | Cloud IaC + ASG instance refresh | Terraform + AWS Systems Manager |
| 3 | [circuit-breaker-pattern](./circuit-breaker-pattern/SKILL.md) | Aislamiento de fallos en llamadas | Resilience4j / Polly / Hystrix-replacement |
| 4 | [auto-scaling-strategies](./auto-scaling-strategies/SKILL.md) | Elasticidad cloud-native | HPA + VPA + KEDA + Karpenter |
| 5 | [chaos-engineering](./chaos-engineering/SKILL.md) | Validación proactiva de resiliencia | Chaos Mesh / Litmus / Gremlin |
| 6 | [retry-with-backoff](./retry-with-backoff/SKILL.md) | Reintentos idempotentes con jitter | AWS SDK / Resilience4j / Polly / tenacity |
| 7 | [health-checks-liveness-readiness](./health-checks-liveness-readiness/SKILL.md) | Probes K8s separadas | Kubernetes + Spring Boot Actuator |
| 8 | [graceful-shutdown-handling](./graceful-shutdown-handling/SKILL.md) | Drain de conexiones in-flight | Go os/signal + K8s preStop + Go Shutdown |
| 9 | [auto-remediation-runbooks](./auto-remediation-runbooks/SKILL.md) | Codificación de ops manuales | AWS SSM Automation + AWX + StackStorm |
| 10 | [predictive-failure-detection](./predictive-failure-detection/SKILL.md) | ML / SLO burn rate | Prophet + Google SRE multi-window + Grafana ML |

## Mapa de relaciones

```
                              ┌─────────────────────┐
                              │  auto-healing-      │
                              │  systems (umbrella) │
                              └──────────┬──────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
┌───────────────┐              ┌─────────────────┐              ┌──────────────────────┐
│  self-healing │              │ chaos-          │              │ predictive-failure-  │
│  infra (cloud)│              │ engineering     │              │ detection (ML)      │
└───────┬───────┘              └────────┬────────┘              └──────────┬───────────┘
        │                               │                                │
        │                               │  triggers                      │
        │                               ▼                                ▼
        │                    ┌──────────────────────┐         ┌────────────────────────┐
        │                    │ auto-remediation-    │◄────────┤ auto-scaling-          │
        │                    │ runbooks             │         │ strategies             │
        │                    └──────────┬───────────┘         └────────────────────────┘
        │                               │
        │                               │  componentes
        │                               ▼
        │              ┌────────────────────────────────────────┐
        │              │  circuit-breaker + retry + bulkhead    │
        │              │  (composición de patrones)             │
        │              └────────────────┬───────────────────────┘
        │                               │
        │                               ▼
        │              ┌────────────────────────────────────┐
        └─────────────►│ health-checks + graceful-shutdown │  ← nivel aplicación
                       │ (probes K8s + SIGTERM handling)    │
                       └────────────────────────────────────┘
```

## Cuándo cargar este dominio

Activa estas skills cuando el usuario mencione:
- "auto-healing", "self-healing", "MTTR"
- "circuit breaker", "cascading failure", "resilience4j"
- "autoscaling", "HPA", "VPA", "KEDA", "Karpenter"
- "chaos engineering", "fault injection", "game day", "chaos mesh"
- "retry", "backoff", "jitter", "idempotency"
- "health check", "liveness", "readiness", "probe failure"
- "graceful shutdown", "SIGTERM", "drain", "rolling deploy"
- "runbook", "auto remediation", "incident automation"
- "predictive", "anomaly detection", "AIOps", "SLO burn rate"

## Fuentes oficiales verificadas

Cada skill cita al menos una fuente oficial primaria:
- Kubernetes Docs (kubernetes.io)
- CNCF Projects (Chaos Mesh, KEDA, Karpenter)
- HashiCorp (Terraform)
- AWS (Systems Manager, Auto Scaling, DevOps Guru)
- Google SRE Workbook
- Resilience4j, Polly, Spring Boot Docs
- Meta Prophet, Stripe API Docs (idempotency)

## Convenciones

- **Idioma**: español en prosa, inglés en identificadores técnicos (`livenessProbe`, `failureThreshold`).
- **Tamaño**: cada SKILL.md ≈ 168 líneas (alineado con `00-standard-skill-template`).
- **Estructura**: 9 secciones del template, todas pobladas.
- **Versionado**: 1.0.0 inicial; revisión tras 60 días sin uso (campo `archive_after`).

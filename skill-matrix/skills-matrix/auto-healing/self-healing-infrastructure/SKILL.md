# self-healing-infrastructure

## Semantic Triggers
```
self-healing infrastructure, auto remediation, automatic recovery, infrastructure as code healing, terraform healing, drift detection, auto rollback, cloud healing
```

---

## 1. Definición Teórica

Self-healing infrastructure resuelve el problema del drift de configuración y los fallos de infraestructura mediante IaC declarativa + reconciliadores que comparan el estado real contra el deseado y aplican correcciones automáticamente. El principio fundamental es la "infraestructura inmutable" (HashiCorp): en lugar de parchear servidores en ejecución, se reemplazan por nuevas instancias generadas desde la configuración declarativa. Aplica en entornos cloud (AWS, Azure, GCP) donde la configuración manual, los hot-fixes y los click-ops introducen no-determinismo. Existe como patrón diferenciado porque trata la infraestructura como código testeable y versionable, permitiendo remediation reproducible y audit-able, a diferencia de scripts bash ad-hoc.

---

## 2. Implementación de Referencia

Stack de referencia: Terraform 1.9+ para IaC, Atlantis o Spacelift para GitOps, AWS Systems Manager + Cloud Custodian para remediation. Lenguajes: HCL (Terraform), Python (Cloud Custodian policies), Go (operadores AWS).

### Ejemplo Práctico Avanzado

```hcl
# Terraform: módulo de auto-healing para un ASG con health checks + lifecycle hooks
module "self_healing_asg" {
  source  = "terraform-aws-modules/autoscaling/aws"
  version = "~> 7.0"

  name                = "web-tier-${var.environment}"
  min_size            = 3
  max_size            = 10
  desired_capacity    = 3
  vpc_zone_identifier = module.vpc.private_subnets
  target_group_arns   = [aws_lb_target_group.web.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  # Launch Template con IMDSv2 obligatorio + user-data que reporta heartbeat
  launch_template_name        = "web-${var.environment}"
  launch_template_description = "Self-healing web tier"
  image_id                    = data.aws_ami.ubuntu.id
  instance_type               = "t3.medium"
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2 obligatorio
    http_put_response_hop_limit = 1
  }

  # Instance refresh = rolling replacement cuando cambia el LT
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
      instance_warmup        = 300
    }
    triggers = ["launch_template", "tag"]
  }

  tag_specifications = {
    Instance = { Name = "web-${var.environment}", Tier = "frontend" }
  }
}

# CloudWatch alarm: si menos del 80% healthy, dispara scale-up + SNS alert
resource "aws_cloudwatch_metric_alarm" "asg_health" {
  alarm_name          = "asg-${var.environment}-unhealthy"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  threshold           = 80
  metric_name         = "GroupInServiceInstances"
  namespace           = "AWS/AutoScaling"
  period              = 60
  statistic           = "Average"
  dimensions = {
    AutoScalingGroupName = module.self_healing_asg.autoscaling_group_name
  }
  alarm_actions = [aws_sns_topic.ops_alerts.arn]
  ok_actions    = [aws_sns_topic.ops_alerts.arn]
}
```

**Fuente oficial:** [Terraform AWS ASG Module](https://github.com/terraform-aws-modules/terraform-aws-autoscaling) · [AWS Auto Healing Guide](https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-health-replacement.html)

### Alternativa de Implementación Específica

Azure Automanage + Azure Policy: para entornos Azure, usar `Automanage` con `Machine Configuration` para aplicar baselines de seguridad y auto-remediation de drift de configuración. Compatible con Arc para servidores on-prem.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cloud workloads con tráfico variable, requisitos de SLA 99.9%+, equipos DevOps maduros con GitOps |
| **Cuándo evitar** | Workloads stateful con sesiones persistentes (usar sticky sessions primero), sistemas con < 3 instancias (no hay quorum para reemplazar) |
| **Alternativas** | Packer + immutable AMIs (más control, menos automatización), Runbooks manuales con PagerDuty, Kubernetes Deployments (si ya estás en K8s) |
| **Coste/Complejidad** | Coste medio (Terraform maduro, 2-4 semanas setup); reduce drift incidents en 70% según HashiCorp State of Cloud Strategy 2024; requiere disciplina GitOps |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Instance refresh falla y deja el ASG inconsistente

**¿Qué ocasionó el error?**
Al actualizar el Launch Template, el rolling refresh no puede lanzar nuevas instancias porque la subnet está saturada o el IAM role no tiene permisos para el nuevo AMI. El refresh queda en estado `InServiceRefreshing` indefinidamente.

**¿Cómo se solucionó?**
1. Cancelar el refresh: `aws autoscaling cancel-instance-refresh --auto-scaling-group-name <name>`
2. Revisar `aws autoscaling describe-scaling-activities` para identificar la causa raíz
3. Aplicar fix (subnet, IAM, AMI permissions) y re-intentar con `min_healthy_percentage=100` para mantener capacidad

**¿Por qué funciona esta técnica?**
Cancelar el refresh evita que el ASG quede en estado inconsistente. Forzar `min_healthy_percentage=100` en el segundo intento garantiza que no se reduce capacidad durante la transición, previniendo outages.

### Caso: Drift de configuración no detectado durante semanas

**¿Qué ocasionó el error?**
Cambios manuales en la consola AWS (click-ops) no se reflejan en Terraform, y `terraform plan` no se ejecuta regularmente. La configuración real diverge silenciosamente del código.

**¿Cómo se solucionó?**
Implementar `terraform plan` automatizado en CI (Atlantis, Spacelift, o GitHub Actions) en cada PR. Adicionalmente, usar AWS Config con reglas managed (`ec2-instance-managed-by-systems-manager`, `s3-bucket-public-read-prohibited`) para detectar drift en tiempo real. OPA/Conftest puede validar Terraform contra políticas custom.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "self-healing", "auto remediation", "drift detection", "infrastructure recovery"
- **Prioridad de carga:** Media — relevante para workloads cloud de producción
- **Dependencias:** `infrastructure-as-code-terraform`, `monitoring-prometheus-metrics`, `chaos-mesh-reliability-testing`

### Tool Integration

```json
{
  "tool_name": "self_healing_infrastructure",
  "description": "Diseña infraestructura cloud con auto-remediation: Terraform + ASG instance refresh, Cloud Custodian policies, Azure Automanage. Detecta y corrige drift automáticamente.",
  "triggers": ["self-healing", "auto remediation", "drift", "infrastructure as code", "immutable infra"],
  "context_hint": "Activar cuando el usuario mencione gestión de infraestructura cloud, reducción de drift, o auto-rollback.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre self-healing infrastructure, drift detection
o auto remediation en cloud, carga el skill self-healing-infrastructure y
prioriza el patrón Terraform + instance refresh sobre scripts ad-hoc.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver drift de Terraform
terraform plan -detailed-exitcode

# Ejecutar Cloud Custodian localmente
custodian run --output-dir=. custodian.yml

# Forzar instance refresh en ASG
aws autoscaling start-instance-refresh --auto-scaling-group-name web-prod \
  --strategy Rolling --preferences '{"MinHealthyPercentage": 100}'

# Ver reglas de AWS Config
aws configservice describe-config-rules --query 'ConfigRules[].[ConfigRuleName,ConfigRuleState]'
```

### GUI / Web

- **Terraform Cloud**: dashboard con planes pendientes y drift detectado por workspace
- **AWS Console → Auto Scaling**: vista de `Instance Refresh` con progreso y fallos
- **Spacelift UI**: runs con diff visual del IaC, política de approval por stack
- **Cloud Custodian Dashboard**: métricas de remediaciones aplicadas por día

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver plan de Terraform | `terraform plan` | `Ctrl+Shift+P → TF: Plan` (VS Code) |
| Aprobar apply en Atlantis | `atlantis approve` | Botón "Approve" en PR comment |
| Listar drift | `terraform plan -detailed-exitcode` | Panel "Drift" en Terraform Cloud |

---

## 7. Cheatsheet Rápido

```hcl
# Patrón mínimo: instance refresh + health check
instance_refresh {
  strategy = "Rolling"
  preferences { min_healthy_percentage = 90 }
  triggers   = ["launch_template"]
}
health_check_type = "ELB"
health_check_grace_period = 300
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `infrastructure-as-code-terraform` | Dependiente (IaC base) | Sí |
| `auto-healing-systems` | Superconjunto (K8s + cloud) | Sí |
| `chaos-mesh-reliability-testing` | Complementario (prueba el healing) | No |
| `monitoring-prometheus-metrics` | Dependiente (señales) | Sí |
| `gitops-declarative-reconciliation` | Complementario (mismo patrón) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: self-healing-infrastructure
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [self-healing, infrastructure, terraform, ASG, cloud, drift, GitOps, immutable]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*

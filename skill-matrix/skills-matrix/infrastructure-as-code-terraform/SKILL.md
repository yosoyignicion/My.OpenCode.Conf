---
name: infrastructure-as-code-terraform
description: "Terraform usa HCL (HashiCorp Configuration Language) para definir infraestructura declarativa multi-cloud (AWS, GCP, Azure, Kubernetes)"
---
# Infrastructure as Code with Terraform

## Semantic Triggers
```
terraform infrastructure code, hcl declarative infra, terraform plan apply, state management remote backend, modules reusability, drift detection terraform, multi-cloud provision
```

---

## 1. Definición Teórica

Terraform usa HCL (HashiCorp Configuration Language) para definir infraestructura declarativa multi-cloud (AWS, GCP, Azure, Kubernetes). El estado (state) es la fuente de verdad que mapea la configuración a recursos reales. Remote state + locking previene corrupción por operaciones concurrentes. El ciclo plan→apply muestra el diff sin cambios y luego ejecuta solo lo aprobado.

---

## 2. Implementación de Referencia

Terraform v1.10+ con protocolo provider gRPC. OpenTofu (fork de Linux Foundation) es la alternativa open-source. Módulos versionados con semver y registry público.

### Ejemplo Práctico Avanzado

```hcl
terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/eks/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  name    = "${var.environment}-vpc"
  cidr    = var.vpc_cidr
  azs     = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
  enable_nat_gateway = true
  tags = { Environment = var.environment, Terraform = "true" }
}

resource "aws_eks_cluster" "main" {
  name     = "${var.environment}-eks"
  role_arn = aws_iam_role.eks.arn
  vpc_config {
    subnet_ids = module.vpc.private_subnets
    endpoint_private_access = true
    endpoint_public_access  = false
  }
  depends_on = [aws_iam_role_policy_attachment.eks-cluster-policy]
}
```

**Fuente oficial:** https://developer.hashicorp.com/terraform/docs

### Alternativa de Implementación Específica

Pulumi (TypeScript/Python/Go) para equipos que prefieren lenguajes de programación reales sobre HCL. Ofrece state management similar pero con lógica procedural y mejores abstracciones.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Infraestructura multi-cloud, equipos que necesitan estado centralizado y plan/apply |
| **Cuándo evitar** | Kubernetes-only (preferir Helm/Kustomize), infraestructura temporal (preferir Pulumi) |
| **Alternativas** | Pulumi (TS/Python/Go), AWS CDK (TypeScript), Crossplane (K8s nativo) |
| **Coste/Complejidad** | Medio. Estado remoto, módulos reusables, y CI/CD de Terraform |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: State locked por CI fallido

**¿Qué ocasionó el error?**
Un pipeline de CI se canceló a medio `terraform apply`, dejando el lock en DynamoDB.

**¿Cómo se solucionó?**
```bash
terraform force-unlock <LOCK_ID>
```
Se forzó el desbloqueo manual tras verificar que ningún proceso activo estaba operando.

**¿Por qué funciona esta técnica?**
DynamoDB lock expira si el proceso muere, pero a veces queda el registro. `force-unlock` lo elimina.

### Caso: Drift entre state y recursos reales

**¿Qué ocasionó el error?**
Alguien modificó manualmente una instancia EC2 desde la consola AWS, causando drift.

**¿Cómo se solucionó?**
```bash
terraform plan  # detecta drift
terraform apply # reconcilia o
terraform import aws_instance.my_instance i-12345 # si el cambio debe preservarse
```

**¿Por qué funciona esta técnica?**
`terraform plan` siempre compara state vs realidad. `import` sincroniza recursos existentes al estado.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~360 tokens al invocar este skill
- **Trigger de activación:** terraform, infrastructure as code, hcl, state, module, plan apply
- **Prioridad de carga:** Alta — skill fundacional de infraestructura
- **Dependencias:** `14-immutable-infrastructure-packer`, `01-gitops-declarative-reconciliation`

### Tool Integration

```json
{
  "tool_name": "infrastructure-as-code-terraform",
  "description": "Gestión de infraestructura como código con Terraform, módulos y state management",
  "triggers": ["terraform", "iac", "hcl", "state", "infrastructure"],
  "context_hint": "Activar cuando se discuta provisión de infraestructura cloud",
  "output_format": "markdown",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Terraform o infraestructura como código, carga el skill
infrastructure-as-code-terraform. Prioriza ejemplos de módulos, remote state backend,
y manejo de drift sobre teoría de HCL.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Inicializar y planificar
terraform init -upgrade
terraform workspace select prod
terraform plan -var-file=environments/prod.tfvars -out=plan.tfplan
terraform apply plan.tfplan

# Estado
terraform state list
terraform state show aws_eks_cluster.main
terraform state mv aws_s3_bucket.old aws_s3_bucket.new
terraform import aws_instance.web i-1234567890

# Debug
TF_LOG=DEBUG terraform plan
terraform console  # REPL para expresiones HCL
```

### GUI / Web

- **Terraform Cloud/Enterprise**: UI remota para runs, state, variables, y policy-as-code (Sentinel)
- **Atlantis**: PR-driven Terraform con comentarios de plan/apply en GitHub/GitLab
- **HashiCorp Explorer**: Visualización de recursos y dependencias
- **VSCode**: HCL extension con syntax highlighting y autocomplete

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Plan | `terraform plan` | Atlantis PR comment `atlantis plan` |
| Apply | `terraform apply plan.out` | Atlantis PR comment `atlantis apply` |
| Destroy | `terraform destroy` | TFC → Queue Destroy Plan |

---

## 7. Cheatsheet Rápido

```hcl
# Módulo VPC mínimo
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  name = "main"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
}

# CLI
terraform init && terraform plan -out=plan.out
terraform apply plan.out
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-immutable-infrastructure-packer` | complementario (Packer + Terraform) | Sí |
| `01-gitops-declarative-reconciliation` | complementario (Terraform + GitOps) | Sí |
| `30-cost-optimization-finops-kubernetes` | complementario (costo de infra) | No |
| `27-bare-metal-vs-virtualization` | complementario (elección de infra) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: infrastructure-as-code-terraform
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [terraform, hcl, infrastructure-as-code, state-management, modules, aws, multi-cloud]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: immutable-infrastructure-packer
description: "Infraestructura inmutable reemplaza servidores en lugar de actualizarlos"
---
# Immutable Infrastructure (Packer)

## Semantic Triggers
```
packer immutable image, image building ami golden, infrastructure immutability, packer provisioner shell ansible, hcl packer template, image versioning semver, pre baked vs post config
```

---

## 1. Definición Teórica

Infraestructura inmutable reemplaza servidores en lugar de actualizarlos. Packer construye imágenes de máquina (AMI, GCP image, Vagrant box, Docker) con todas las dependencias pre-instaladas, eliminando configuration drift. Golden images contienen OS, runtime, aplicación y configuración. Builders definen la plataforma target (AWS EBS, GCP, Azure, Docker, QEMU). Provisioners (shell, Ansible, Chef) configuran la imagen durante el build.

---

## 2. Implementación de Referencia

Packer v1.12+ con HCL2 templates. Soporte multi-builder (AWS, GCP, Azure, Docker, Proxmox). Ansible como provisioner principal para configuraciones complejas.

### Ejemplo Práctico Avanzado

```hcl
packer {
  required_plugins {
    amazon = { source = "github.com/hashicorp/amazon", version = "~> 1" }
    ansible = { source = "github.com/hashicorp/ansible", version = "~> 1" }
  }
}

variable "app_version" {
  type    = string
  default = "1.2.0"
}

source "amazon-ebs" "api-image" {
  region        = "us-east-1"
  source_ami    = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  ssh_username  = "ec2-user"
  ami_name      = "api-${var.app_version}-{{timestamp}}"
  tags = {
    Name        = "api-${var.app_version}"
    Environment = "prod"
    BuildTime   = "{{isotime}}"
    Version     = var.app_version
  }
  launch_block_device_mappings {
    device_name           = "/dev/xvda"
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }
}

build {
  sources = ["source.amazon-ebs.api-image"]
  provisioner "shell" {
    inline = [
      "sudo yum update -y",
      "sudo yum install -y python3 python3-pip awscli",
      "pip3 install -r /tmp/requirements.txt"
    ]
  }
  provisioner "file" {
    source      = "app/"
    destination = "/opt/app"
  }
  provisioner "ansible" {
    playbook_file = "./provision.yml"
    ansible_env_vars = ["ANSIBLE_HOST_KEY_CHECKING=False"]
  }
  post-processor "manifest" {
    output     = "manifest.json"
    strip_path = true
  }
}
```

**Fuente oficial:** https://developer.hashicorp.com/packer/docs

### Alternativa de Implementación Específica

Buildah para imágenes de contenedores sin Docker daemon, construyendo OCI images directamente desde cero con scripts shell sin Dockerfile.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | AMI golden images, VM templates, compliance requires immutability, deployments >100 servidores |
| **Cuándo evitar** | K8s-only (imágenes de contenedor), equipos pequeños con pocos servidores |
| **Alternativas** | Buildah (OCI sin Docker), Ansible + Terraform (post-config), Vagrant (dev), Image Builder (Red Hat) |
| **Coste/Complejidad** | Medio. Build time, almacenamiento de imágenes, pipeline de rebuild en CI |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: AMI no arranca por dependencias faltantes

**¿Qué ocasionó el error?**
El provisioner `shell` instaló paquetes pero no limpió el cache de yum, y una dependencia faltaba en runtime.

**¿Cómo se solucionó?**
```hcl
provisioner "shell" {
  inline = [
    "sudo yum update -y",
    "sudo yum install -y python3 nginx && sudo yum clean all",
    "sudo rm -rf /var/cache/yum"
  ]
}
```
Se agregó limpieza de cache y verificación post-build.

**¿Por qué funciona esta técnica?**
Imágenes inmutables requieren que todas las dependencias estén incluidas. La limpieza reduce tamaño de AMI.

### Caso: Packer build falla por falta de espacio en disco

**¿Qué ocasionó el error?**
El volumen root era gp2 de 8GB default. Las actualizaciones y dependencias llenaban el disco.

**¿Cómo se solucionó?**
```hcl
launch_block_device_mappings {
  device_name = "/dev/xvda"
  volume_size = 30  # aumentado de 8GB a 30GB
  volume_type = "gp3"
}
```

**¿Por qué funciona esta técnica?**
Builds de Packer requieren espacio temporal para descargas y compilación. Aumentar el volumen root lo soluciona.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~390 tokens al invocar este skill
- **Trigger de activación:** packer, immutable infrastructure, golden image, ami, image builder
- **Prioridad de carga:** Media — skill especializado de infraestructura
- **Dependencias:** `05-infrastructure-as-code-terraform`

### Tool Integration

```json
{
  "tool_name": "immutable-infrastructure-packer",
  "description": "Construcción de imágenes inmutables con Packer, AMI golden images y provisioners",
  "triggers": ["packer", "immutable", "golden image", "ami", "image building"],
  "context_hint": "Activar cuando se discuta construcción de imágenes o infraestructura inmutable",
  "output_format": "markdown",
  "max_tokens": 1950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre imágenes inmutables o Packer, carga el skill
immutable-infrastructure-packer. Proporciona HCL2 templates con builders AWS/GCP,
provisioners shell y Ansible, y post-processors.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Inicializar y construir
packer init .
packer fmt .
packer validate .
packer build -var app_version=1.2.0 template.pkr.hcl

# Debug
PACKER_LOG=1 packer build template.pkr.hcl
packer build -on-error=ask template.pkr.hcl

# Inspeccionar AMI
aws ec2 describe-images --image-ids ami-12345678
aws ec2 describe-snapshots --snapshot-ids snap-12345678

# GCP
gcloud compute images list --filter "name:api*"
```

### GUI / Web

- **HashiCorp Cloud Platform (HCP)**: Packer Registry con build history, artefactos, y policy
- **AWS EC2 Console**: AMIs con tags de versión y build time
- **Consul UI**: Service catalog con AMI version tags
- **Jenkins/GitLab**: UI de pipelines de build de imágenes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Build image | `packer build template.pkr.hcl` | HCP → Packer → Start Build |
| Validar template | `packer validate .` | VS Code → Packer extension |
| List imágenes | `aws ec2 describe-images --filters "Name=name,Values=api*"` | EC2 Console → AMIs |

---

## 7. Cheatsheet Rápido

```hcl
# Packer HCL mínimo
packer { required_plugins { amazon = { source = "github.com/hashicorp/amazon" } } }
source "amazon-ebs" "example" {
  source_ami = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  ssh_username = "ec2-user"
  ami_name = "app-{{timestamp}}"
}
build {
  sources = ["source.amazon-ebs.example"]
  provisioner "shell" {
    inline = ["echo 'built!'"]
  }
}
# CLI: packer init . && packer build .
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `05-infrastructure-as-code-terraform` | complementario (Terraform + Packer) | Sí |
| `06-cicd-declarative-pipelines` | complementario (CI builds imágenes) | Sí |
| `27-bare-metal-vs-virtualization` | complementario (VM vs bare metal) | No |
| `22-artifact-registries-security` | complementario (registro de imágenes) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: immutable-infrastructure-packer
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [packer, immutable-infrastructure, golden-image, ami, image-building, hcl2]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

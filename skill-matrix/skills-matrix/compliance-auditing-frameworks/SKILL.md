---
name: compliance-auditing-frameworks
description: "Los frameworks de compliance imponen controles de seguridad, privacidad y disponibilidad"
---
# compliance-auditing-frameworks

## Semantic Triggers
```
compliance framework SOC 2 ISO 27001 PCI DSS HIPAA FedRAMP, audit evidence collection automated compliance monitoring, continuous compliance vs point-in-time audit, control mapping and gap analysis, compliance-as-code with InSpec and Chekov, audit readiness assessment and remediation tracking
```

---

## 1. Definición Teórica

Los frameworks de compliance imponen controles de seguridad, privacidad y disponibilidad. Principales: SOC 2 (organizaciones de servicio, 5 principios de confianza), ISO 27001 (SGSI, 93 controles), PCI DSS (pagos, 12 requisitos), HIPAA (salud, salvaguardas administrativas/físicas/técnicas), FedRAMP (gov cloud, 400+ controles). Compliance-as-code (InSpec, OPA, Checkov, Cloud Custodian) automatiza la recolección de evidencia, reemplazando auditorías puntuales con monitoreo continuo. El mapeo cruzado de controles entre frameworks reduce la duplicación.

---

## 2. Implementación de Referencia

**InSpec** (Progress Chef) para compliance-as-code + **Checkov** (Bridgecrew) para IaC scanning + **Cloud Custodian** para cloud compliance. InSpec provee profiles reutilizables basados en CIS Benchmarks y controles de compliance. Checkov escanea Terraform, CloudFormation, Kubernetes contra políticas de seguridad.

### Ejemplo Práctico Avanzado

```ruby
# InSpec profile: SOC 2 + ISO 27001 common controls
# controls/soc2-security.rb

control "soc2-cc6.1" do
  impact 0.7
  title "Logical and physical access controls"
  desc "Access to information assets is restricted based on role and need-to-know"

  describe users.where { uid >= 1000 } do
    it { should_not be_empty }
  end

  describe file("/etc/shadow") do
    it { should exist }
    it { should be_file }
    its("owner") { should eq "root" }
    it { should_not be_readable.by("other") }
  end

  describe sshd_config do
    its("PermitRootLogin") { should eq "no" }
    its("PasswordAuthentication") { should eq "no" }
  end
end

control "soc2-cc6.8" do
  impact 0.7
  title "Encryption of data at rest and in transit"

  describe json("/etc/kubernetes/kubelet-config.json") do
    its(["tlsCipherSuites"]) { should include "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256" }
  end

  # Check TLS on all listening ports
  describe command("nmap --script ssl-enum-ciphers -p 443 localhost") do
    its("stdout") { should_not match /TLSv1\.0|TLSv1\.1|SSLv3/ }
  end
end
```

```yaml
# Checkov custom policy for PCI DSS
# policies/custom_pci_dss.py
from checkov.common.models.enums import CheckCategories, CheckResult
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class S3EncryptionCheck(BaseResourceCheck):
    def __init__(self):
        name = "Ensure S3 bucket encryption is enabled (PCI DSS req 3.4)"
        id = "CKV_CUSTOM_PCI_001"
        supported_resources = ["aws_s3_bucket"]
        categories = [CheckCategories.ENCRYPTION]
        super().__init__(name=name, id=id, categories=categories)

    def scan_resource_conf(self, conf):
        if "server_side_encryption_configuration" in conf:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = S3EncryptionCheck()
```

**Fuente oficial:** https://www.inspec.io/docs/

### Alternativa de Implementación Específica

**Cloud Custodian**: Para cloud compliance policies en AWS/GCP/Azure. Reglas YAML para enforce (auto-remediate) de configuración de seguridad: buckets públicos, encryption, logging, etc. Mejor que InSpec para cloud-only environments.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Organizaciones que necesitan compliance (SOC 2, ISO 27001, PCI, HIPAA, FedRAMP) |
| **Cuándo evitar** | Proyectos personales o prototipos sin requisitos regulatorios |
| **Alternativas** | InSpec (chef, más maduro), Checkov (IaC), Cloud Custodian (cloud), OPA (policy engine) |
| **Coste/Complejidad** | Alto. Compliance-as-code requiere inversión inicial. El mantenimiento es continuo. Herramientas como Vanta/Drata reducen overhead |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: FedRAMP Moderate — 400+ controls manuales

**¿Qué ocasionó el error?**
Una startup cloud necesitaba FedRAMP Moderate Authorization (JAB) y estimó 18 meses para implementar controles manualmente.

**¿Cómo se solucionó?**
Implementar compliance-as-code con InSpec + Cloud Custodian. Automatizar 80% de los controles. Usar AWS GovCloud + FedRAMP Marketplace (AWS Config rules pre-mapeados).

**¿Por qué funciona esta técnica?**
La automatización reduce el tiempo de implementación de 18 a 6 meses. Los controles automatizados se verifican continuamente, no solo en auditoría.

### Caso: Mapeo cruzado SOC 2 ↔ ISO 27001 duplica trabajo

**¿Qué ocasionó el error?**
El equipo implementaba los mismos controles dos veces porque SOC 2 e ISO 27001 usan nomenclatura diferente.

**¿Cómo se solucionó?**
Crear un control mapping matrix (SOC 2 CC6.1 ↔ ISO A.9.1.2). Implementar un control y marcarlo como satisface ambos requisitos.

| SOC 2 | ISO 27001 | Control |
|---|---|---|
| CC6.1 (Logical Access) | A.9.1.2 (Access to networks) | IAM with MFA |
| CC6.7 (Data Disposal) | A.11.2.7 (Secure disposal) | Secure wipe policy |
| CC7.1 (Monitoring) | A.12.4.1 (Event logging) | SIEM implementation |

**¿Por qué funciona esta técnica?**
El mapping elimina duplicación. Un solo control satisface múltiples frameworks.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "compliance" o "audit" o "FedRAMP" en la consulta
- **Prioridad de carga:** Alta — compliance es requisito para ventas enterprise y operaciones reguladas
- **Dependencias:** `14-compliance-frameworks-soc2-iso27001`, `20-incident-response-forensics-logging`

### Tool Integration

```json
{
  "tool_name": "compliance-auditing-frameworks",
  "description": "Compliance-as-code con InSpec, Checkov, Cloud Custodian para SOC 2, ISO 27001, PCI, HIPAA, FedRAMP",
  "triggers": ["compliance", "audit", "FedRAMP", "PCI", "HIPAA", "InSpec", "Checkov", "control mapping"],
  "context_hint": "Inyectar junto con 14-compliance-frameworks-soc2-iso27001 para cobertura completa",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre compliance frameworks, carga el skill compliance-auditing-frameworks y responde
con ejemplos de compliance-as-code y control mapping.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# InSpec profile execution
inspec exec https://github.com/dev-sec/linux-baseline -t ssh://user@server --reporter json:compliance.json
inspec exec profile -t ssh://host --reporter html:report.html

# Checkov IaC scanning
checkov --directory . --framework terraform --check CKV_AWS_* --output json
checkov --directory . --framework kubernetes --skip-check CKV_K8S_*

# Cloud Custodian
custodian run --output-dir . policy.yaml
custodian report --output-dir . policy.yaml --format csv

# FedRAMP specific
prowler aws --compliance fedramp_moderate -M json -o fedramp-report/

# Audit logging
auditd status
ausearch -m USER_LOGIN -ts today
```

### GUI / Web

- **AWS Audit Manager:** Framework de evidencia pre-construido con 30+ controles mapeados
- **Google Security Command Center:** Dashboard de compliance con findings categorizados
- **Azure Security Center:** Secure Score con controles de compliance integrados
- **Vanta/Drata Dashboard:** Compliance continua con tests automáticos y evidencia

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar InSpec | `inspec exec profile --reporter json:report.json` | Vanta → Run Tests |
| Escanear IaC | `checkov --directory . --framework terraform` | Checkov Dashboard |

---

## 7. Cheatsheet Rápido

```ruby
# InSpec control template
control "control-id" do
  impact 0.7
  title "Control title"
  desc "Description"
  describe file("/etc/ssh/sshd_config") do
    its("content") { should match /^PermitRootLogin no/ }
  end
end
```

```bash
# Compliance frameworks
# SOC 2: 5 trust principles, Type I/II
# ISO 27001: 93 controls, ISMS
# PCI DSS: 12 requirements, 4 levels
# HIPAA: Administrative, Physical, Technical
# FedRAMP: Low/Moderate/High, JAB/Agency
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-compliance-frameworks-soc2-iso27001` | Complementario — cobertura específica de SOC 2 e ISO 27001 | Sí |
| `20-incident-response-forensics-logging` | Complementario — logs de IR son evidencia de compliance | Sí |
| `13-identity-access-management-rbac-abac` | Complementario — IAM controls son comunes en todos los frameworks | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 23-compliance-auditing-frameworks
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [compliance, audit, inspec, checkov, fedramp, pci-dss, hipaa, cloud-custodian, compliance-as-code]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

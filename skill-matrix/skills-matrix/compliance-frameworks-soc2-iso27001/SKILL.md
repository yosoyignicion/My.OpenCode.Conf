---
name: compliance-frameworks-soc2-iso27001
description: "SOC 2 (AICPA) reporta sobre controles en 5 principios de servicio: Security, Availability, Processing Integrity, Confidentiality, Privacy"
---
# compliance-frameworks-soc2-iso27001

## Semantic Triggers
```
SOC 2 Type II audit trust services criteria, ISO 27001 ISMS implementation and certification, SOC 2 vs ISO 27001 scope and overlap, continuous compliance monitoring with automated evidence, control mapping between SOC2 ISO 27001 and NIST CSF, evidence collection automation for compliance audits
```

---

## 1. Definición Teórica

SOC 2 (AICPA) reporta sobre controles en 5 principios de servicio: Security, Availability, Processing Integrity, Confidentiality, Privacy. ISO 27001 (ISO) especifica un SGSI (ISMS) con 93 controles en 4 dominios (Organizacional, Personas, Físico, Tecnológico) más evaluación de riesgos obligatoria. SOC 2 Type I es puntual, Type II cubre 6-12 meses. ISO 27001 requiere certificación por entidad acreditada. Ambos comparten controles: control de acceso, cifrado, respuesta a incidentes, BCP/DR.

---

## 2. Implementación de Referencia

**Vanta** o **Drata** automatizan la recolección de evidencia para SOC 2 e ISO 27001. Se integran con AWS, GCP, GitHub, Okta, y SIEM. Proveen dashboards en tiempo real con estado de controles y alertas de desviación.

### Ejemplo Práctico Avanzado

```yaml
# Automated evidence collection with AWS Config
Resources:
  AccessKeyRotationRule:
    Type: AWS::Config::ConfigRule
    Properties:
      Source:
        Owner: AWS
        SourceIdentifier: ACCESS_KEYS_ROTATED
      MaximumExecutionFrequency: TwentyFour_Hours

  S3BucketPublicReadRule:
    Type: AWS::Config::ConfigRule
    Properties:
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED

  IAMUserNoPolicyCheck:
    Type: AWS::Config::ConfigRule
    Properties:
      Source:
        Owner: AWS
        SourceIdentifier: IAM_USER_UNUSED_CREDENTIALS_CHECK
      InputParameters:
        maxcredentialusageage: "90"

# Evidence upload script
```bash
#!/bin/bash
# Collect compliance evidence for SOC 2 Type II
OUTPUT_DIR="evidence/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"

# IAM evidence
aws iam list-users --output json > "$OUTPUT_DIR/iam-users.json"
aws iam list-roles --output json > "$OUTPUT_DIR/iam-roles.json"
aws iam get-account-summary --output json > "$OUTPUT_DIR/iam-summary.json"
aws iam list-virtual-mfa-devices --output json > "$OUTPUT_DIR/mfa-devices.json"

# Encryption at rest
aws kms list-keys --output json > "$OUTPUT_DIR/kms-keys.json"
aws kms list-aliases --output json > "$OUTPUT_DIR/kms-aliases.json"

# Logging evidence
aws cloudtrail describe-trails --output json > "$OUTPUT_DIR/cloudtrail-trails.json"
aws cloudtrail get-trail-status --name default --output json > "$OUTPUT_DIR/cloudtrail-status.json"

# Network security
aws ec2 describe-security-groups --output json > "$OUTPUT_DIR/sec-groups.json"
aws ec2 describe-network-acls --output json > "$OUTPUT_DIR/nacls.json"

# Upload to compliance platform
vanta upload-evidence --directory "$OUTPUT_DIR"
```

**Fuente oficial:** https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance/soc-2

### Alternativa de Implementación Específica

**Compliance-as-code with InSpec**: Profiles reutilizables de hardening (CIS Benchmarks) que generan evidencia automatizada. Se integran con Chef Habitat, Terraform, y Kubernetes. Output en JSON para ingest en SIEM.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Startups SaaS que venden a enterprise (SOC 2), empresas con requisitos regulatorios (ISO 27001) |
| **Cuándo evitar** | Productos B2C sin datos sensibles, proyectos personales |
| **Alternativas** | SOC 2 (más liviano, orientado a servicios), ISO 27001 (más completo, certificable), PCI DSS (pagos), HIPAA (salud) |
| **Coste/Complejidad** | Alto. SOC 2 Tipo II cuesta $30-80k, ISO 27001 $20-50k más consultoría. Herramientas como Vanta reducen overhead |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: SOC 2 Type II falla por evidencia insuficiente

**¿Qué ocasionó el error?**
El auditor solicitó 12 meses de logs de acceso, pero solo se retenían 3 meses por política de costos.

**¿Cómo se solucionó?**
Configurar S3 Lifecycle Policy para archivar logs en Glacier (costo reducido) y athena queries para consulta bajo demanda.

**¿Por qué funciona esta técnica?**
Glacier retiene datos a $0.001/GB/mes. Athena permite queries sin restaurar datos completos, satisfaciendo el requerimiento del auditor.

### Caso: ISO 27001 — risk assessment no aceptado

**¿Qué ocasionó el error?**
La evaluación de riesgos no incluía riesgos de proveedores externos (supply chain), que ISO 27001:2022 exige en A.5.19.

**¿Cómo se solucionó?**
Añadir un risk register para proveedores con scores de impacto y probabilidad. Mapear cada proveedor a controles específicos.

**¿Por qué funciona esta técnica?**
El risk register de supply chain demuestra que la organización considera riesgos externos, cumpliendo A.5.19 (Supplier Relationships).

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "SOC 2" o "ISO 27001" en la consulta del usuario
- **Prioridad de carga:** Alta — compliance es requisito para ventas enterprise
- **Dependencias:** `23-compliance-auditing-frameworks`, `04-owasp-top-10-mitigation`

### Tool Integration

```json
{
  "tool_name": "compliance-frameworks-soc2-iso27001",
  "description": "Compliance con SOC 2, ISO 27001, evidencia automatizada, y control mapping",
  "triggers": ["SOC 2", "ISO 27001", "compliance", "audit", "evidence collection", "ISMS"],
  "context_hint": "Inyectar junto con 23-compliance-auditing para cobertura completa de frameworks",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre compliance, carga el skill compliance-frameworks-soc2-iso27001 y responde
con ejemplos de evidencia automatizada y control mapping.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# AWS Config advanced query for evidence
aws configservice select-aggregate-resource-config \
  --expression "SELECT accountId, resourceId, resourceType, configuration WHERE resourceType = 'AWS::S3::Bucket'"

# InSpec profile execution
inspec exec https://github.com/dev-sec/linux-baseline -t ssh://user@server --reporter json:compliance.json

# Prowler for AWS compliance
prowler aws --compliance soc2 -M json -o compliance-reports/

# Checkov for IaC compliance
checkov --directory . --framework terraform --check CKV_AWS_* --output json

# ScoutSuite for multi-cloud
scout aws --report-dir compliance-reports/
```

### GUI / Web

- **Vanta Dashboard:** Automatización SOC 2 con tests de control continuos y pruebas de control
- **Drata:** Similar a Vanta con integraciones 150+ y evidence collection automatizada
- **AWS Audit Manager:** Framework de evidencia pre-construido para SOC 2, ISO 27001, PCI

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Evidencia IAM | `aws iam list-users --output json` | AWS Audit Manager → IAM |
| Escaneo InSpec | `inspec exec profile -t ssh://host --reporter json:report.json` | Vanta → Tests |

---

## 7. Cheatsheet Rápido

```bash
# SOC 2 + ISO 27001 quick reference
# SOC 2: 5 trust principles (Security, Availability, Processing Integrity, Confidentiality, Privacy)
# ISO 27001: 93 controls in 4 domains (Org, People, Physical, Tech)

# Automation essentials
aws configservice select-resource-config --expression "SELECT *"
inspec exec profile --reporter json:compliance.json
checkov --directory . --framework terraform --output json

# Evidence must be: timestamped, immutable, and access-controlled
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `23-compliance-auditing-frameworks` | Complementario — cubre frameworks adicionales (PCI, HIPAA, FedRAMP) | Sí |
| `04-owasp-top-10-mitigation` | Complementario — OWASP Top 10 mitiga riesgos de seguridad en compliance | No |
| `21-defensive-security-hardening` | Dependiente — hardening es evidencia de controles | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 14-compliance-frameworks-soc2-iso27001
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [soc2, iso27001, compliance, evidence, audit, vanta, drata, isms]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

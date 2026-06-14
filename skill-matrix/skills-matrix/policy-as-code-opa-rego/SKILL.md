---
name: policy-as-code-opa-rego
description: "OPA (Open Policy Agent) es un motor de políticas general-purpose"
---
# Policy-as-Code (OPA / Rego)

## Semantic Triggers
```
policy as code, open policy agent, rego language, opa kubernetes admission, gatekeeper constraint template, kubewarden, opa validation, mutating admission webhook, policy enforcement
```

---

## 1. Definición Teórica

OPA (Open Policy Agent) es un motor de políticas general-purpose. Gatekeeper integra OPA con K8s via admission webhooks usando ConstraintTemplate y Constraint CRDs. Rego es un lenguaje declarativo de queries con el patrón `deny[msg] { condition }`. Kubewarden ofrece políticas como módulos Wasm (Rust, Go, JS). OPA también se usa para políticas en Terraform, Envoy, y HTTP API.

---

## 2. Implementación de Referencia

Gatekeeper v3.18+ es la integración OPA-K8s estándar. Kubewarden v2.2+ como alternativa Wasm. OPA v1.2+ standalone.

### Ejemplo Práctico Avanzado

```rego
# ConstraintTemplate: require-labels
package k8s.requiredlabels

violation[{"msg": msg, "details": {"missing": missing}}] {
  input.request.kind.kind == "Deployment"
  provided := {label | input.request.object.metadata.labels[label]}
  required := {label | label := input.parameters.labels[_]}
  missing := required - provided
  count(missing) > 0
  msg := sprintf("Missing required labels: %v", [concat(", ", missing)])
}
---
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8s.requiredlabels
        violation[{"msg": msg}] {
          provided := {label | input.request.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing: %v", [concat(", ", missing)])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-label
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces: ["prod"]
  parameters:
    labels: ["app", "environment", "owner"]
---
# Mutating webhook: inject sidecar
package k8s.injectsidecar

mutate[result] {
  input.request.kind.kind == "Pod"
  not input.request.object.metadata.annotations["sidecar-injected"]
  result := {
    "patches": [{
      "op": "add",
      "path": "/spec/containers/-",
      "value": {
        "name": "sidecar",
        "image": "sidecar:latest"
      }
    }]
  }
}
```

**Fuente oficial:** https://openpolicyagent.org/docs/

### Alternativa de Implementación Específica

Kubewarden para políticas en Rust/Wasm con mejor rendimiento que Rego. Compilación a Wasm permite ejecución más rápida y sandboxing nativo.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Compliance, seguridad multi-tenant, validación de recursos, políticas de costos |
| **Cuándo evitar** | Políticas simples que pueden ser NetworkPolicy o RBAC nativos |
| **Alternativas** | Kubewarden (Wasm), Kyverno (YAML nativo), jsPolicy (JavaScript), CEL (K8s nativo) |
| **Coste/Complejidad** | Medio-alto. Rego tiene curva de aprendizaje. Gatekeeper requiere operación del webhook |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Constraint no se aplica, recursos se crean igual

**¿Qué ocasionó el error?**
Gatekeeper webhook en dry-run mode: `enforcementAction: dryrun` en lugar de `enforcementAction: deny`.

**¿Cómo se solucionó?**
```yaml
spec:
  enforcementAction: deny  # ← dryrun → deny
```
Y se verificó que el webhook esté registrado: `kubectl get validatingwebhookconfigurations`.

**¿Por qué funciona esta técnica?**
`dryrun` solo audita, no bloquea. Cambiar a `deny` activa el enforcement en admission.

### Caso: ConstraintTemplate no se compila (rego syntax error)

**¿Qué ocasionó el error?**
La expresión `{label | input.request.object.metadata.labels[label]}` tenía un typo: `label` vs `labels`.

**¿Cómo se solucionó?**
```rego
provided := {l | input.request.object.metadata.labels[l]}
```
Se usó variable única `l` para claridad y consistencia.

**¿Por qué funciona esta técnica?**
Rego es sensible a nombres de variables. Un typo causa error de compilación silencioso.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~430 tokens al invocar este skill
- **Trigger de activación:** opa, rego, gatekeeper, policy as code, admission webhook, constraint
- **Prioridad de carga:** Media — skill de seguridad
- **Dependencias:** `21-network-policies-segmentation`

### Tool Integration

```json
{
  "tool_name": "policy-as-code-opa-rego",
  "description": "Políticas como código con OPA/Rego, Gatekeeper, ConstraintTemplate y admission webhooks",
  "triggers": ["opa", "rego", "gatekeeper", "policy as code", "constraint", "admission"],
  "context_hint": "Activar cuando se discuta enforcement de políticas o compliance",
  "output_format": "markdown",
  "max_tokens": 2150
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre políticas como código u OPA, carga el skill
policy-as-code-opa-rego. Proporciona ConstraintTemplate en Rego, Constraint con match/parameters,
y troubleshooting de admission webhooks. Prioriza patrones deny y mutating.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# OPA CLI
opa eval -i input.json -d policy.rego "data.k8s.requiredlabels"
opa test ./policies -v
opa fmt -w policy.rego

# Gatekeeper
kubectl get constrainttemplate
kubectl get constraints
kubectl describe k8srequiredlabels require-app-label
kubectl get validatingwebhookconfigurations gatekeeper-validating-webhook

# Debug admission
kubectl apply -f test-deploy.yaml --server-dry-run
kubectl get events -n gatekeeper-system --field-selector reason=DryRunViolation

# Kubewarden
kwctl run policy.wasm -r settings.json
kwctl annotate policy.wasm
```

### GUI / Web

- **Gatekeeper Audit UI**: Resultados de auditoría de constraints existentes
- **OPA Playground**: Editor Rego online con input simulado
- **Kubewarden UI**: Políticas Wasm, versiones, y settings
- **Kyverno Policy Reporter**: Dashboard de políticas aplicadas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test rego | `opa eval -i input.json -d policy.rego "data...violation"` | OPA Playground |
| Ver constraints | `kubectl get constraints` | Gatekeeper UI → Constraints |
| Policy dryrun | `kubectl apply --server-dry-run -f deploy.yaml` | Lens → Gatekeeper tab |

---

## 7. Cheatsheet Rápido

```rego
# Patrón deny mínimo
package k8s.deny
violation[{"msg": msg}] {
  input.request.kind.kind == "Deployment"
  not input.request.object.metadata.labels["app"]
  msg := "Label 'app' is required"
}
---
# ConstraintTemplate + Constraint YAML
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata: { name: k8srequiredlabels }
spec:
  crd:
    spec:
      names: { kind: K8sRequiredLabels }
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: ... (patrón deny)
---
# CLI
opa test ./policies
kubectl get constraint
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `21-network-policies-segmentation` | complementario (network + policy) | Sí |
| `12-secret-management-vault-integration` | complementario (secrets + policies) | No |
| `04-kubernetes-operators-controllers` | complementario (operators + webhooks) | No |
| `22-artifact-registries-security` | complementario (image policy) | No |
| `34-structured-logging-patterns` | complementario (audit logging) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: policy-as-code-opa-rego
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [opa, rego, gatekeeper, policy-as-code, admission-webhook, kubernetes-security]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: identity-access-management-rbac-abac
description: "RBAC (Role-Based Access Control) asigna permisos a roles y roles a usuarios"
---
# identity-access-management-rbac-abac

## Semantic Triggers
```
RBAC role-based access control implementation, ABAC attribute-based policy with OPA and Cedar, AWS IAM policies and resource-based permissions, fine-grained authorization with Google Zanzibar pattern, RBAC vs ABAC tradeoffs and hybrid models, identity governance and entitlement review automation
```

---

## 1. Definición Teórica

RBAC (Role-Based Access Control) asigna permisos a roles y roles a usuarios. ABAC (Attribute-Based Access Control) usa atributos (usuario, recurso, entorno, acción) para decisiones dinámicas de política. Modelos modernos: Rego (OPA), Cedar (AWS, verificado con métodos formales), Topaz (Zanzibar open-source). Los híbridos RBAC + ABAC son comunes en enterprise. La autorización se expresa como `namespace:resource:action` (ej: `payments:invoice:read`). Toda decisión (allow/deny + policy ID) debe auditarse.

---

## 2. Implementación de Referencia

**Open Policy Agent (OPA)** con **Rego** es el estándar de facto para policy-as-code. Desacopla la lógica de autorización de la aplicación. Se despliega como sidecar (k8s), servicio HTTP, o librería Go.

### Ejemplo Práctico Avanzado

```rego
# policy/authz.rego — ABAC with resource ownership
package authz

import future.keywords.if
import future.keywords.in

default allow := false

# Admin role — full access within namespace
allow if {
    input.user.roles[_] == "admin"
    input.action in ["read", "write", "delete"]
    input.resource.namespace == input.user.namespace
}

# Editor role — write access to owned resources
allow if {
    input.user.roles[_] == "editor"
    input.action in ["read", "write"]
    input.resource.owner_id == input.user.id
}

# Viewer role — read access for public resources
allow if {
    input.user.roles[_] == "viewer"
    input.action == "read"
    (input.resource.visibility == "public" or
     input.resource.owner_id == input.user.id)
}

# Time-based restriction (ABAC attribute)
deny["Access restricted outside business hours"] if {
    input.action != "read"
    not is_business_hours(time.now_ns())
}

is_business_hours(ts) if {
    time.weekday(ts) != "Saturday"
    time.weekday(ts) != "Sunday"
    hour := time.clock(ts)[0]
    hour >= 9
    hour < 18
}
```

```python
# Python: OPA client
import json, requests

OPA_URL = "http://opa:8181/v1/data/authz/allow"

def check_access(user: dict, resource: dict, action: str) -> bool:
    input_data = {
        "user": user,
        "resource": resource,
        "action": action,
    }
    resp = requests.post(OPA_URL, json={"input": input_data})
    return resp.json().get("result", False)
```

**Fuente oficial:** https://www.openpolicyagent.org/docs/latest/

### Alternativa de Implementación Específica

**SpiceDB** (AuthZed): Implementación open-source de Google Zanzibar. Provee autorización fine-grained con un esquema de relaciones (relation tuples). Ideal para sistemas multi-tenant con relaciones complejas.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas multi-tenant, aplicaciones con múltiples roles y permisos granulares, compliance audit |
| **Cuándo evitar** | CRUD simple con 2-3 roles fijos — hardcodear permisos es más simple |
| **Alternativas** | OPA/Rego (independiente), Cedar/AVP (AWS), SpiceDB (Zanzibar), Casbin (librería embedida) |
| **Coste/Complejidad** | Medio-Alto. OPA requiere infraestructura separada. ABAC añade complejidad en evaluación de atributos |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: OPA policy lenta en high-throughput

**¿Qué ocasionó el error?**
Cada request HTTP a OPA añadía 5-10ms de latencia, inaceptable para endpoints de alta frecuencia.

**¿Cómo se solucionó?**
Implementar OPA como sidecar (co-locado) con HTTP keep-alive y caching de decisiones. OPA soporta `opa eval --data policy.rego --input input.json` en línea para baja latencia.

**¿Por qué funciona esta técnica?**
El sidecar elimina latencia de red. El caching reduce evaluaciones repetidas (TTL configurable).

### Caso: Explosión de roles en RBAC puro

**¿Qué ocasionó el error?**
20,000 usuarios con 500 roles diferentes. Cada nuevo recurso requería un nuevo rol.

**¿Cómo se solucionó?**
Migrar a ABAC con atributos (departamento, ubicación, nivel de acceso). Reducción de 500 roles a 5 policy templates basadas en atributos.

**¿Por qué funciona esta técnica?**
ABAC usa combinaciones de atributos dinámicamente, eliminando la necesidad de roles predefinidos para cada permiso.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "RBAC" o "ABAC" u "OPA" en la consulta del usuario
- **Prioridad de carga:** Alta — autorización es transversal a toda aplicación
- **Dependencias:** `02-oauth2-oidc-flows`, `22-auth-jwt-oauth-detailed`

### Tool Integration

```json
{
  "tool_name": "identity-access-management-rbac-abac",
  "description": "RBAC/ABAC con OPA/Rego, Cedar, SpiceDB, y patrones de autorización fine-grained",
  "triggers": ["RBAC", "ABAC", "OPA", "Rego", "Cedar", "SpiceDB", "authorization", "IAM", "access control"],
  "context_hint": "Inyectar junto con 02-oauth2-oidc-flows para autenticación + autorización",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre RBAC o ABAC, carga el skill identity-access-management-rbac-abac y responde
con ejemplos de OPA/Rego y políticas basadas en atributos.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# OPA eval locally
opa eval --data policy/authz.rego --input input.json "data.authz.allow"

# OPA test
opa test ./policy/

# OPA run as server
opa run --server --addr :8181 ./policy/

# OPA format
opa fmt policy/authz.rego

# Cedar CLI
cedar authorize --policies policy.cedar --entities entities.json --request request.json

# SpiceDB
spicedb serve --grpc-preshared-key mykey
zed permission check document:1 view user:alice
```

### GUI / Web

- **OPA Playground:** Editor web de políticas Rego con simulación de requests
- **SpiceDB Dashboard:** Visualización de relaciones y esquemas de autorización
- **AWS IAM Console:** Creación visual de políticas IAM con Policy Simulator

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Evaluar política | `opa eval --data policy.rego --input input.json` | OPA Playground → Evaluate |
| Test OPA | `opa test ./policy/` | OPA Playground → Test |

---

## 7. Cheatsheet Rápido

```rego
# OPA Rego essentials
package authz

default allow := false

allow if {
    input.user.roles[_] == input.resource.required_role
    input.user.dept == input.resource.dept
}

# Name: namespace:resource:action
# Example: payments:invoice:read

# Decision log (for audit)
# Every evaluation logged with input, result, and timestamp
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-oauth2-oidc-flows` | Dependiente — autenticación precede a autorización | Sí |
| `22-auth-jwt-oauth-detailed` | Complementario — claims JWT alimentan decisiones ABAC | Sí |
| `23-compliance-auditing-frameworks` | Complementario — logs de autorización son evidencia de compliance | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 13-identity-access-management-rbac-abac
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [rbac, abac, opa, rego, cedar, spicedb, iam, authorization, access-control]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

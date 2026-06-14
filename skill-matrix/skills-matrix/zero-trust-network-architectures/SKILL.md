---
name: zero-trust-network-architectures
description: "Zero Trust assumes no implicit trust based on network location"
---
# Zero Trust Network Architectures

## Semantic Triggers
```
zero trust network access ztna beyondcorp, zero trust principle never trust always verify, zero trust micro segmentation per service, identity aware proxy for zero trust access, zero trust with mtls and spiffe workload identity, zero trust architecture for kubernetes and cloud
```

---

## 1. Definición Teórica

Zero Trust assumes no implicit trust based on network location. Every request must be authenticated, authorized, and encrypted. It solves the problem of perimeter-based security (castle-and-moat) being insufficient for modern cloud and remote-work environments. Key distinction: traditional security trusts anything inside the network; Zero Trust requires continuous verification of every request regardless of origin.

---

## 2. Implementación de Referencia

**SPIFFE/SPIRE** — workload identity platform issuing X.509 SVIDs. **Istio** with STRICT mTLS and AuthorizationPolicy. **Google BeyondCorp** — the original Zero Trust implementation. **Cloudflare Access** — managed Identity-Aware Proxy. **Teleport** — Zero Trust access to infrastructure.

### Ejemplo Práctico Avanzado

```yaml
# Kubernetes NetworkPolicy — default deny all ingress/egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow only specific service communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-payment-api
spec:
  podSelector:
    matchLabels:
      app: payment-api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: order-service
    ports:
    - port: 8080
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - port: 8080
---
# Istio AuthorizationPolicy — Zero Trust access control
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-zt
spec:
  selector:
    matchLabels:
      app: payment
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/order-service"]
        namespaces: ["default"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/charge"]
    when:
    - key: request.headers[X-Idempotency-Key]
      values: ["*"]
  - from:
    - source:
        requestPrincipals: ["*"]
    to:
    - operation:
        methods: ["GET"]
```

```python
# SPIFFE workload identity with mTLS
import ssl
import httpx
import spiffe

# Load SPIFFE identity
async def get_spiffe_client() -> httpx.AsyncClient:
    """Create an mTLS client using SPIFFE workload identity."""
    spiffe_source = spiffe.SpiffeSource()
    svid = await spiffe_source.fetch_x509_svid()
    
    ctx = ssl.create_default_context(capath="/etc/spiffe/certs")
    ctx.load_cert_chain(svid.cert_path, svid.key_path)
    ctx.verify_mode = ssl.CERT_REQUIRED
    ctx.verify_flags = ssl.VERIFY_X509_STRICT
    
    return httpx.AsyncClient(verify=ctx)

# Usage
async def call_service_b():
    client = await get_spiffe_client()
    response = await client.get("https://service-b.internal:443/api/data")
    # SPIFFE ID in client certificate ensures service B knows exactly who called

# Identity-Aware Proxy verification
async def verify_beyondcorp(jwt: str) -> dict:
    """Verify Google IAP JWT assertion."""
    # IAP signs JWTs with Google's public keys
    payload = jwt.decode(
        jwt,
        options={"verify_signature": True},
        algorithms=["ES256"],
        audience="/projects/my-project/global/backendServices/my-service",
    )
    return {
        "user": payload.get("sub"),
        "email": payload.get("email"),
        "access_level": payload.get("access_levels", []),
    }
```

**Fuente oficial:** https://spiffe.io/docs/latest/spire-about/

### Alternativa de Implementación Específica

**Cloudflare Zero Trust** — managed ZTNA with Access (identity-based auth), Gateway (DNS filtering), and Browser Isolation (remote browser). No infrastructure to manage. **Tailscale** — WireGuard-based Zero Trust mesh VPN with SSO integration.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Multi-cloud environments, remote work, compliance (PCI, SOC 2), Kubernetes clusters, microservices with sensitive data |
| **Cuándo evitar** | Simple single-service apps, fully air-gapped networks, small teams with minimal compliance requirements |
| **Alternativas** | Traditional perimeter firewall + VPN. Service mesh for micro-segmentation only. Cloud-native IAM (AWS IAM, GCP IAM) |
| **Coste/Complejidad** | High — SPIFFE/SPIRE deployment, policy management, certificate rotation, monitoring. Managed services (Cloudflare, Tailscale) reduce complexity. Migration from perimeter to Zero Trust is incremental |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Legacy application without mTLS support

**¿Qué ocasionó el error?**
A legacy Java application doesn't support mTLS. The organization mandates Zero Trust with mTLS between all services. The legacy app cannot be modified.

**¿Cómo se solucionó?**
Use a sidecar proxy (Envoy) to terminate mTLS and forward plain HTTP to the legacy app. Istio's sidecar injection handles this transparently — the legacy app receives HTTP, but network traffic is encrypted with mTLS.

**¿Por qué funciona esta técnica?**
The sidecar acts as a mTLS endpoint for the pod. Other services connect to the sidecar with mTLS; the sidecar forwards to the application over localhost HTTP. The app is isolated in Zero Trust without modification.

### Caso: Overly restrictive policies cause outages

**¿Qué ocasionó el error?**
A Zero Trust policy blocks all traffic by default. After a deployment, the monitoring team can't access metrics because their namespace isn't in the allow list.

**¿Cómo se solucionó?**
Implement policy as code (OPA, Kyverno) with CI/CD validation. Use deny-by-default for production but allow wide access in staging during rollout. Maintain a policy audit log to detect blocked-but-valid traffic.

**¿Por qué funciona esta técnica?**
Policy-as-code enables review and versioning. Staged rollout catches missing policies before they affect production. Audit logs reveal necessary policy updates.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "zero trust", "ztna", "beyondcorp", "spiffe spire", "identity aware proxy"
- **Prioridad de carga:** Alta — fundamental para seguridad moderna
- **Dependencias:** `service-mesh-envoy-sidecars`, `data-encryption-in-transit-mtls`

### Tool Integration

```json
{
  "tool_name": "zero-trust-network-architectures",
  "description": "Zero Trust architecture: mTLS, SPIFFE/SPIRE workload identity, micro-segmentation, Identity-Aware Proxy, policy-as-code",
  "triggers": ["zero trust", "ztna", "beyondcorp", "spiffe", "identity aware proxy", "micro segmentation"],
  "context_hint": "Load when user asks about Zero Trust, network security, workload identity, or BeyondCorp implementation",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Zero Trust o seguridad de red, carga el skill
zero-trust-network-architectures. Prioriza el patrón de SPIFFE/SPIRE + Istio
para implementación práctica sobre teoría de BeyondCorp.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# SPIRE: check workload registration
spire-server entry show
spire-server healthcheck

# Istio mTLS check
istioctl authn tls-check <pod-name>

# Kubernetes NetworkPolicy audit
kubectl get networkpolicies --all-namespaces
kubectl describe networkpolicy default-deny-all

# OPA policy check
opa eval -i input.json -d policy.rego "data.authz.allow"

# Verify SPIFFE SVID
openssl x509 -in /etc/spiffe/svid.pem -text -noout | grep -A2 "X509v3 Subject Alternative Name"

# Cloudflare Access token test
curl -H "Cf-Access-Jwt-Assertion: $(cat jwt.txt)" https://internal.example.com
```

### GUI / Web

- **SPIRE Dashboard** — workload registration, SVID status, health monitoring
- **Kiali** — Istio mTLS status per service, authorization policy visualization
- **Cloudflare Zero Trust Dashboard** — Access policies, Gateway DNS logs, Browser Isolation sessions
- **Tailscale Admin Console** — user/device management, ACL rules, connection logs

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check mTLS | `istioctl authn tls-check <pod>` | Kiali → Graph → Security overlay |
| SPIFFE status | `spire-server healthcheck` | SPIRE Dashboard → Health |
| Policies | `kubectl get networkpolicies -A` | Kiali → Workloads → Policies |
| OPA test | `opa eval -i input.json -d policy.rego` | Cloudflare → Zero Trust → Policies |

---

## 7. Cheatsheet Rápido

```yaml
# Zero Trust principles:
# 1. Never trust, always verify
# 2. Least privilege access
# 3. Assume breach
# 4. Verify every request regardless of origin

# Implementation layers:
# - Workload identity: SPIFFE/SPIRE (X.509 SVIDs)
# - mTLS: Istio STRICT mode
# - Segmentation: K8s NetworkPolicy (deny-all by default)
# - Auth: Istio AuthorizationPolicy / OPA
# - Verification: continuous, every request

# Tools: Istio + SPIRE, Cloudflare Access, Tailscale, Teleport

# Default deny: always start with deny-all NetworkPolicy
# Cert rotation: short-lived certificates (24h), auto-renew
# Monitoring: audit every auth decision
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `service-mesh-envoy-sidecars` | implementación — Istio for mTLS and auth | Sí |
| `data-encryption-in-transit-mtls` | base — mTLS is the encryption layer | Sí |
| `oauth2-oidc-flows` | complementario — identity-aware access | No |
| `network-policies-segmentation` | complementario — K8s NetworkPolicy | No |
| `identity-access-management-rbac-abac` | complementario — authorization policies | No |

---

## 9. Metadatos del Skill

```yaml
---
id: zero-trust-network-architectures
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [zero-trust, ztna, spiffe, spire, mtls, istio, beyondcorp, micro-segmentation, identity-aware-proxy]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

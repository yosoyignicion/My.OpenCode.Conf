---
name: data-encryption-in-transit-mtls
description: "TLS encrypts data in transit between clients and servers"
---
# Data Encryption in Transit & mTLS

## Semantic Triggers
```
mutual tls mtls for service to service authentication, tls handshake cipher suite and certificate chain, tls 1.3 optimizations 0-rtt and early data, certificate management with cert manager and letsencrypt, spiffe spire for workload identity and mtls, minimum tls version and cipher suite hardening
```

---

## 1. Definición Teórica

TLS encrypts data in transit between clients and servers. mTLS (mutual TLS) extends this to authenticate both parties via certificates. It solves the problems of eavesdropping, tampering, and impersonation in network communication. Key distinction: regular TLS only verifies the server; mTLS requires both sides to present certificates, establishing mutual identity — essential for service-to-service communication in Zero Trust architectures.

---

## 2. Implementación de Referencia

**Let's Encrypt** — free automated certificates via ACME protocol. **cert-manager** — Kubernetes certificate management. **SPIFFE/SPIRE** — workload identity with short-lived X.509 SVIDs. **mkcert** — local development TLS certificates.

### Ejemplo Práctico Avanzado

```yaml
# cert-manager ClusterIssuer for Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
---
# Certificate resource with automatic renewal
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
spec:
  secretName: api-tls-secret
  duration: 2160h  # 90 days
  renewBefore: 360h  # 15 days before expiry
  dnsNames:
  - api.example.com
  - api.internal.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
---
# SPIFFE/SPIRE for workload identity (short-lived certs)
apiVersion: spire.spiffe.io/v1alpha1
kind: ClusterSPIFFEID
metadata:
  name: payment-service
spec:
  spiffe_id: "spiffe://cluster.local/ns/default/sa/payment-sa"
  workload_selector:
    matchLabels:
      app: payment
  dns_san:
  - payment.default.svc.cluster.local
  ttl: "24h"  # short-lived certificate
```

```python
# Python server with mTLS
import ssl
from fastapi import FastAPI

app = FastAPI()

ctx = ssl.create_default_context(purpose=ssl.Purpose.CLIENT_AUTH)
ctx.load_cert_chain("/etc/certs/server.crt", "/etc/certs/server.key")
ctx.load_verify_locations(cafile="/etc/certs/ca.crt")
ctx.verify_mode = ssl.CERT_REQUIRED  # Require client certificate
ctx.check_hostname = False  # Use SPIFFE ID for identity

@app.get("/api/secure")
async def secure_endpoint():
    # Client cert info available via request
    return {"message": "mTLS authenticated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=443, ssl_context=ctx)


# Python mTLS client
import httpx

def create_tls_client() -> httpx.Client:
    ctx = ssl.create_default_context(capath="/etc/spiffe/certs")
    ctx.load_cert_chain("/etc/spiffe/client.crt", "/etc/spiffe/client.key")
    ctx.verify_mode = ssl.CERT_REQUIRED
    return httpx.Client(verify=ctx)

# Usage
client = create_tls_client()
response = client.get("https://service-b.internal:443/api/secure")
```

**Fuente oficial:** https://cert-manager.io/docs/

### Alternativa de Implementación Específica

**AWS Certificate Manager** (ACM) — managed certificates for ALB/NLB/CloudFront. **Google Cloud Certificate Manager** — managed TLS with Let's Encrypt and Google CA. **Cloudflare Origin CA** — free origin certificates for Cloudflare-proxied sites.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | All production services (HTTPS mandatory). mTLS for internal service-to-service communication, especially in Zero Trust architectures |
| **Cuándo evitar** | Internal development environments (use mkcert or self-signed CA). mTLS for public-facing APIs (use OAuth2/OIDC instead) |
| **Alternativas** | mTLS vs TLS + API keys (simpler for internal services). SSH tunnels for legacy systems. WireGuard for point-to-point encryption |
| **Coste/Complejidad** | Low for public TLS (free via Let's Encrypt). Medium for mTLS (certificate distribution, rotation, revocation). cert-manager automates most of the complexity on Kubernetes |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Certificate expiry causes production outage

**¿Qué ocasionó el error?**
A TLS certificate for api.example.com expires at midnight. No alert was configured. Users can't access the API — all requests fail with `CERTIFICATE_VERIFY_FAILED`.

**¿Cómo se solucionó?**
Use cert-manager with auto-renewal and `renewBefore: 720h` (30 days). Monitor certificate expiry with expiry checker (e.g., `kube-cert-manager` or Prometheus `cert_exporter`). Alert when cert expires in < 30 days.

**¿Por qué funciona esta técnica?**
cert-manager automates renewal before expiry. Monitoring provides visibility and proactive alerts. `renewBefore` ensures enough time for troubleshooting if auto-renewal fails.

### Caso: mTLS certificate chain too long

**¿Qué ocasionó el error?**
A certificate chain has 5 intermediate CAs. The client sends the full chain with every request. The handshake size exceeds the TLS record size limit, causing some clients to fail.

**¿Cómo se solucionó?**
Minimize certificate chain depth (max 3 levels: root → intermediate → leaf). Use OCSP stapling to verify revocation without additional round trips. Configure server to send only necessary intermediates.

**¿Por qué funciona esta técnica?**
Shorter chains reduce handshake latency and size. OCSP stapling offloads revocation checking from the client. Correct chain configuration ensures compatibility with all clients.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "tls", "mtls", "ssl", "cert-manager", "https", "certificate", "encryption in transit"
- **Prioridad de carga:** Alta — fundamental para seguridad de comunicaciones
- **Dependencias:** `zero-trust-network-architectures`, `service-mesh-envoy-sidecars`

### Tool Integration

```json
{
  "tool_name": "data-encryption-in-transit-mtls",
  "description": "TLS/mTLS encryption, certificate management with cert-manager and Let's Encrypt, SPIFFE workload identity",
  "triggers": ["tls", "mtls", "ssl", "cert-manager", "lets encrypt", "certificate", "encryption in transit"],
  "context_hint": "Load when user asks about TLS, mTLS, certificate management, or HTTPS configuration",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre TLS, mTLS o certificados, carga el skill
data-encryption-in-transit-mtls. Prioriza cert-manager configuration y mTLS
con SPIFFE sobre teoría del handshake TLS.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Check certificate expiry
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates

# Check certificate chain
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|Issuer:"

# TLS version and cipher check
openssl s_client -connect example.com:443 -tls1_3 2>/dev/null | grep -E "TLS|Cipher"

# cert-manager: check certificate status
kubectl get certificate -A
kubectl describe certificate api-tls

# Test TLS with specific cipher
curl --ciphers 'ECDHE-RSA-AES128-GCM-SHA256' -I https://example.com

# mTLS test
curl --cert client.crt --key client.key --cacert ca.crt https://service-b.internal/api

# Check SPIFFE SVID
openssl x509 -in /etc/spiffe/svid.pem -text -noout | grep -E "Not Before|Not After|SPIFFE"
```

### GUI / Web

- **Qualys SSL Labs** — public TLS assessment (grade A+ target)
- **cert-manager Dashboard** — certificate status, renewal events, expiry tracking
- **Kiali** — mTLS status for service mesh (STRICT vs PERMISSIVE)
- **SPIRE Dashboard** — SVID lifecycle, workload registration
- **Datadog** — certificate expiry dashboard, TLS handshake latency, cipher distribution

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check cert | `openssl s_client -connect <host>:443` | SSL Labs → Enter domain |
| TLS version | `openssl s_client -tls1_3 <host>:443` | Kiali → Security → mTLS |
| mTLS test | `curl --cert client.crt ...` | SPIRE Dashboard → SVIDs |
| Cert-manager | `kubectl get certificate -A` | cert-manager UI → Certificates |

---

## 7. Cheatsheet Rápido

```bash
# TLS hardening:
# - Minimum TLS 1.2, prefer TLS 1.3
# - Ciphers: ECDHE + AEAD (AES-GCM, ChaCha20-Poly1305)
# - Disable: TLS 1.0/1.1, RC4, 3DES, CBC mode

# cert-manager essentials:
kubectl create -f cluster-issuer.yaml
kubectl create -f certificate.yaml
kubectl get certificate -w

# mTLS with SPIFFE:
#   Each workload gets unique SPIFFE ID
#   Short-lived SVIDs (24h), auto-rotated
#   Identity verified via X.509 certificate chain

# Header security:
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Certificate-Transparency: enforce

# Monitor: cert expiry, cipher strength, handshake failures
# Alert on: cert expires < 30 days, TLS < 1.2, weak cipher detected
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `zero-trust-network-architectures` | superconjunto — mTLS as Zero Trust component | Sí |
| `service-mesh-envoy-sidecars` | implementación — Istio manages mTLS at mesh level | Sí |
| `oauth2-oidc-flows` | alternativo — OAuth2 for public-facing auth vs mTLS for service-to-service | No |
| `http3-quic` | base — QUIC uses TLS 1.3 natively | No |
| `seguridad-defensiva-web` | complementario — HTTPS headers, HSTS, CSP | No |

---

## 9. Metadatos del Skill

```yaml
---
id: data-encryption-in-transit-mtls
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [tls, mtls, ssl, cert-manager, lets-encrypt, spiffe, spire, encryption, certificate, https]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

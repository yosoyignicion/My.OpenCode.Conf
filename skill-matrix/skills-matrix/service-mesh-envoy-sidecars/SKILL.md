---
name: service-mesh-envoy-sidecars
description: "Service mesh offloads networking concerns (routing, observability, security) from application code to sidecar proxies"
---
# Service Mesh & Envoy Sidecars

## Semantic Triggers
```
envoy proxy sidecar injection and xds control plane, istio virtual service and destination rule, service mesh mtls and authorization policy, envoy lua filter and wasm extension, circuit breaking and outlier detection in envoy, observability with envoy access logs and metrics
---

## 1. Definición Teórica

Service mesh offloads networking concerns (routing, observability, security) from application code to sidecar proxies. It solves the problem of managing service-to-service communication in large microservice deployments. Key distinction over traditional libraries (e.g., Netflix OSS): proxies operate transparently without code changes, providing consistent traffic management, mTLS, and telemetry across polyglot services.

---

## 2. Implementación de Referencia

**Istio** — the most feature-rich service mesh. Uses Envoy as the data plane and Istiod as the control plane. **Linkerd** — lighter mesh (Rust-based micro-proxy, no Envoy). **Consul Connect** — HashiCorp's mesh with Envoy. **Envoy** itself can be used standalone as a proxy or edge gateway.

### Ejemplo Práctico Avanzado

```yaml
# Istio VirtualService + DestinationRule for canary traffic
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: reviews
        subset: v2
        port:
          number: 9080
  - route:
    - destination:
        host: reviews
        subset: v1
        port:
          number: 9080
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
  subsets:
  - labels:
      version: v1
    name: v1
  - labels:
      version: v2
    name: v2
---
# AuthorizationPolicy for mTLS + access control
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-auth
spec:
  selector:
    matchLabels:
      app: payment
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/order-service"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/charge"]
```

```python
# Envoy access log format (structured JSON)
access_log_format = """
{
  "start_time": "%START_TIME%",
  "method": "%REQ(:METHOD)%",
  "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
  "protocol": "%PROTOCOL%",
  "response_code": "%RESPONSE_CODE%",
  "duration": "%DURATION%",
  "upstream_host": "%UPSTREAM_HOST%",
  "upstream_cluster": "%UPSTREAM_CLUSTER%",
  "bytes_received": "%BYTES_RECEIVED%",
  "bytes_sent": "%BYTES_SENT%",
  "trace_id": "%REQ(X-REQUEST-ID)%"
}
"""
```

**Fuente oficial:** https://istio.io/latest/docs/reference/config/networking/virtual-service/

### Alternativa de Implementación Específica

**Linkerd** — simpler than Istio: no Envoy, uses a Rust-based micro-proxy (linkerd2-proxy). Lower resource usage, fewer features (no WASM, no Lua). Better for smaller teams. **Consul** — integrates service mesh with service discovery and KV store.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | >20 microservices, polyglot teams, need for consistent mTLS/circuit breaking/retries without code changes, canary deployments |
| **Cuándo evitar** | <10 services (management overhead > benefits), teams without Kubernetes expertise, applications requiring ultra-low latency (sidecar adds <2ms) |
| **Alternativas** | Library-based approach (gRPC interceptors, Netflix OSS). Proxy per-host (nginx reverse proxy). Application-level mTLS and retries |
| **Coste/Complejidad** | High — Istio adds significant control plane complexity, sidecar resource overhead (50-100MB RAM per sidecar), debugging complexity (traffic flows through 2 proxies per request) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Sidecar startup race condition

**¿Qué ocasionó el error?**
Application container starts before the Envoy sidecar is ready. The application makes outgoing requests that fail because Envoy hasn't connected to the control plane.

**¿Cómo se solucionó?**
Use Istio's `holdApplicationUntilProxyStarts` flag (adds a post-start hook). Or configure the application to retry initial connections. Set `istio.io/rev` annotation for proper sidecar injection order.

**¿Por qué funciona esta técnica?**
The `holdApplicationUntilProxyStarts` ensures the sidecar container is running and its admin endpoint is healthy before the application container starts.

### Caso: Envoy memory leak with high connection count

**¿Qué ocasionó el error?**
A service handling 10k+ concurrent connections causes Envoy to consume 2GB+ of memory. Connection pool limits were not configured, causing unbounded connection growth.

**¿Cómo se solucionó?**
Set `maxConnections` and `http2MaxRequests` in DestinationRule. Enable idle timeout and connection draining. Tune Envoy's `--concurrency` to match CPU cores.

**¿Por qué funciona esta técnica?**
Connection pooling limits prevent unbounded resource usage. Idle timeouts close unused connections. Proper concurrency setting matches worker threads to CPU.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "service mesh", "istio", "envoy", "sidecar", "linkerd", "virtual service", "destination rule"
- **Prioridad de carga:** Alta — esencial para microservicios en Kubernetes
- **Dependencias:** `zero-trust-network-architectures`, `grpc-protobuf`, `distributed-tracing-context-propagation`

### Tool Integration

```json
{
  "tool_name": "service-mesh-envoy-sidecars",
  "description": "Service mesh with Envoy sidecars, Istio control plane, traffic management, mTLS, circuit breaking, and observability",
  "triggers": ["service mesh", "istio", "envoy", "sidecar", "linkerd", "virtual service", "destination rule"],
  "context_hint": "Load when user asks about service mesh, sidecar proxies, Istio, Envoy, or microservice networking",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre service mesh o Istio, carga el skill
service-mesh-envoy-sidecars. Prioriza ejemplos de VirtualService, DestinationRule
y AuthorizationPolicy sobre teoría del mesh.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Istio: check sidecar injection
istioctl proxy-status
istioctl proxy-config clusters <pod-name>
istioctl proxy-config listeners <pod-name>

# Check mTLS status
istioctl authn tls-check <pod-name>

# Envoy admin (via port-forward)
kubectl port-forward deploy/reviews 15000
curl http://localhost:15000/server_info
curl http://localhost:15000/stats | grep upstream_rq

# Linkerd
linkerd check --pre
linkerd stat deployments
linkerd viz top deployments
```

### GUI / Web

- **Kiali** — service graph with health, traffic routing, mTLS status, and tracing integration
- **Grafana (Istio dashboards)** — mesh telemetry: request volume, error rate, p50/p99 latency
- **Jaeger** — distributed tracing with Envoy spans (auto-generated)
- **Linkerd Dashboard** — per-route metrics, top-line success rate, latency distribution

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Proxy status | `istioctl proxy-status` | Kiali → Services |
| Config dump | `istioctl proxy-config clusters <pod>` | Kiali → Workloads → Envoy |
| mTLS check | `istioctl authn tls-check` | Kiali → Graph → mTLS overlay |
| Metrics | `curl localhost:15000/stats` | Grafana → Istio Dashboard |

---

## 7. Cheatsheet Rápido

```yaml
# Istio VirtualService: routing + retries + timeouts
# DestinationRule: connection pools + outlier detection
# AuthorizationPolicy: mTLS + RBAC per service

# Common patterns:
# - STRICT mTLS for all services
# - Circuit breaker: maxConnections=100, consecutive5xxErrors=5
# - Retry: max_retries=3, retry_on=gRPC Unavailable,connect-failure
# - Timeout: 15s default, 30s for slow endpoints

# Istio commands:
istioctl proxy-status                  # sidecar health
istioctl proxy-config clusters <pod>   # Envoy clusters
istioctl proxy-config listeners <pod>  # Envoy listeners
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `zero-trust-network-architectures` | complementario — mTLS + AuthorizationPolicy for zero trust | Sí |
| `distributed-tracing-context-propagation` | complementario — Envoy auto-generates trace spans | Sí |
| `grpc-protobuf` | complementario — Envoy is the standard gRPC proxy | No |
| `service-discovery-dns-consul` | base — service discovery for mesh | No |
| `network-policies-segmentation` | complementario — K8s NetworkPolicy + mesh | No |

---

## 9. Metadatos del Skill

```yaml
---
id: service-mesh-envoy-sidecars
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [service-mesh, envoy, istio, sidecar, mtls, circuit-breaker, virtual-service, linkerd]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

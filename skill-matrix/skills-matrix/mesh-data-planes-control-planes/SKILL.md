---
name: mesh-data-planes-control-planes
description: "Service mesh separa el control plane (configuración, certificados, telemetría) del data plane (proxies sidecar que interceptan tráfico)"
---
# Mesh: Data Planes & Control Planes

## Semantic Triggers
```
service mesh, istio control plane, envoy data plane, linkerd, sidecar proxy, mutual tls service mesh, traffic policy mesh, mesh observability, istio virtual service destination rule
```

---

## 1. Definición Teórica

Service mesh separa el control plane (configuración, certificados, telemetría) del data plane (proxies sidecar que interceptan tráfico). Envoy es el data plane dominante; Istio y Linkerd son los control planes populares. mTLS automático entre sidecars provee encriptación zero-config. VirtualService + DestinationRule (Istio) definen routing, retries, timeouts, y circuit breakers. Linkerd es más ligero (sin Envoy binary, 1/10 de recursos).

---

## 2. Implementación de Referencia

Istio v1.24+ con Envoy v1.34+. Linkerd v2.18+ como alternativa ligera. Ambos se integran con K8s v1.30+.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api
            subset: v2
          weight: 10
        - destination:
            host: api
            subset: v1
          weight: 90
      retries:
        attempts: 2
        perTryTimeout: 5s
        retryOn: connect-failure,refused-stream,unavailable
      timeout: 10s
      corsPolicy:
        allowOrigins:
          - regex: ".*"
        allowMethods: ["GET", "POST"]
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-destination
spec:
  host: api
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 10
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }
  exportTo:
    - "*"
---
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: prod
spec:
  mtls:
    mode: STRICT
```

**Fuente oficial:** https://istio.io/latest/docs/

### Alternativa de Implementación Específica

Linkerd con `linkerd inject` para mTLS automático y HTTP/2, sin Envoy. Ideal para equipos que buscan mesh simple con bajo overhead (1 CPU core extra por nodo).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | mTLS automático, canary avanzado, circuit breaking, observabilidad de tráfico |
| **Cuándo evitar** | Clusters <20 nodos, equipos sin capacidad de operar mesh, latencia extra intolerable |
| **Alternativas** | Linkerd (ligero), Consul Connect (multi-platform), Cilium (eBPF native), NGINX Mesh |
| **Coste/Complejidad** | Alto. Istio consume recursos (Envoy sidecar 256m CPU). Debugging complejo. Linkerd es más simple |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Envoy sidecar OOM en alta concurrencia

**¿Qué ocasionó el error?**
El sidecar Envoy por defecto tiene límite 512Mi memory, insuficiente para picos de tráfico.

**¿Cómo se solucionó?**
```yaml
# Istio global values
meshConfig:
  defaultConfig:
    proxyMemory: 1024Mi  # aumentar límite
    concurrency: 2        # workers de Envoy
```

**¿Por qué funciona esta técnica?**
Envoy necesita memoria para connection pools y TLS. Aumentar límites y limitar concurrencia estabiliza el proxy.

### Caso: mTLS causa errores de conexión entre servicios

**¿Qué ocasionó el error?**
Modo `STRICT` mTLS forzaba TLS en servicios que no tenían sidecar (ej: bases de datos externas).

**¿Cómo se solucionó?**
```yaml
spec:
  mtls:
    mode: PERMISSIVE  # acepta TLS y plaintext
```
Luego se migró a `STRICT` gradualmente.

**¿Por qué funciona esta técnica?**
`PERMISSIVE` permite conexiones sin TLS. Es el modo de transición recomendado antes de forzar `STRICT`.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~420 tokens al invocar este skill
- **Trigger de activación:** service mesh, istio, envoy, linkerd, sidecar, mTLS, virtual service
- **Prioridad de carga:** Alta — skill importante de redes
- **Dependencias:** `11-ebpf-based-networking-cilium`, `13-service-discovery-dns-consul`

### Tool Integration

```json
{
  "tool_name": "mesh-data-planes-control-planes",
  "description": "Configuración de service mesh con Istio/Envoy, mTLS, VirtualService, DestinationRule y observabilidad",
  "triggers": ["service mesh", "istio", "envoy", "linkerd", "mtls", "sidecar"],
  "context_hint": "Activar cuando se discuta service mesh o mTLS",
  "output_format": "markdown",
  "max_tokens": 2100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre service mesh o Istio, carga el skill
mesh-data-planes-control-planes. Proporciona VirtualService con traffic splitting,
DestinationRule con circuit breaking, y PeerAuthentication para mTLS STRICT.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Istio CLI
istioctl install --set profile=default -y
istioctl analyze
istioctl proxy-status
istioctl proxy-config clusters <pod-name>
istioctl dashboard kiali

# Debug Envoy
istioctl pc routes <pod-name>
istioctl pc listeners <pod-name> -o json
istioctl experimental describe pod <pod-name>

# Linkerd
linkerd check --pre
linkerd inject deployment/api
linkerd viz stat deploy api
linkerd viz top deploy api

# mTLS verification
istioctl authn tls-check <pod-name>
```

### GUI / Web

- **Kiali**: Service graph visual, traffic metrics, Wizards para VirtualService/DestinationRule
- **Grafana Istio Dashboard**: Métricas de mesh, latency, error rate por servicio
- **Jaeger/Tempo**: Distributed tracing con spans de Envoy
- **Linkerd Dashboard**: `linkerd viz dashboard` — top, tap, stat

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver proxy status | `istioctl proxy-status` | Kiali → Services |
| Ver routing | `istioctl pc routes <pod>` | Kiali → Graph |
| Kiali dashboard | `istioctl dashboard kiali` | http://localhost:20001 |

---

## 7. Cheatsheet Rápido

```yaml
# VirtualService canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata: { name: api }
spec:
  hosts: [api]
  http:
    - route:
        - destination: { host: api, subset: v1, weight: 90 }
        - destination: { host: api, subset: v2, weight: 10 }
      timeout: 10s
      retries: { attempts: 2, perTryTimeout: 5s }
---
# Istio mTLS mínimo
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata: { name: default }
spec:
  mtls:
    mode: STRICT
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `11-ebpf-based-networking-cilium` | alternativa (eBPF vs mesh) | No |
| `13-service-discovery-dns-consul` | complementario (Consul Connect) | No |
| `07-progressive-delivery-canary` | dependiente (canary via mesh) | Sí |
| `16-blue-green-deployment-strategies` | complementario (blue-green + mesh) | Sí |
| `02-opentelemetry-distributed-tracing` | complementario (tracing mesh) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: mesh-data-planes-control-planes
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [service-mesh, istio, envoy, linkerd, mtls, sidecar, traffic-routing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

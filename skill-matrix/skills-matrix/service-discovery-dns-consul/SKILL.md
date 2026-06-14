---
name: service-discovery-dns-consul
description: "Service discovery mapea nombres de servicio a endpoints de red"
---
# Service Discovery (DNS / Consul)

## Semantic Triggers
```
service discovery kubernetes, consul service mesh, core dns, dns based discovery, consul connect, health checks consul, dns policy kubernetes
```

---

## 1. Definición Teórica

Service discovery mapea nombres de servicio a endpoints de red. En Kubernetes, CoreDNS provee descubrimiento nativo basado en DNS: los pods resuelven servicios como `<servicio>.<namespace>.svc.cluster.local`. HashiCorp Consul extiende el descubrimiento multi-cloud y multi-plataforma con health checking, KV store, y Connect (service mesh con mTLS). Headless Services (clusterIP: None) retornan todas las IPs de los pods para workloads stateful.

---

## 2. Implementación de Referencia

CoreDNS v1.12+ es el DNS server por defecto de K8s desde 1.13. Consul v1.20+ con Consul Connect para service mesh multi-platform.

### Ejemplo Práctico Avanzado

```hcl
# Consul service definition
service {
  name = "api"
  port = 8000
  tags = ["prod", "v2"]
  check {
    http     = "http://localhost:8000/health"
    interval = "10s"
    timeout  = "2s"
    deregister_critical_service_after = "1m"
  }
  connect {
    sidecar_service {
      proxy {
        upstreams {
          destination_name = "database"
          local_bind_port  = 5432
        }
      }
    }
  }
}
---
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: api-to-db
spec:
  destination:
    name: database
  sources:
    - name: api
      action: allow
---
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  clusterIP: None  # Headless
  selector:
    app: database
  ports:
    - port: 5432
      targetPort: 5432
---
# CoreDNS custom config
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  example.server: |
    example.com:53 {
      forward . 8.8.8.8
    }
```

**Fuente oficial:** https://www.consul.io/docs

### Alternativa de Implementación Específica

Consul API Gateway + Consul Mesh Gateway para multi-cluster service discovery con mTLS entre nubes. Ideal para entornos híbridos (on-prem + cloud).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Multi-platform discovery (VM + K8s), service mesh con mTLS, KV store centralizado |
| **Cuándo evitar** | K8s-only (CoreDNS suficiente), equipos sin necesidad de multi-cloud |
| **Alternativas** | CoreDNS (nativo K8s), Eureka (Netflix), ZooKeeper (Apache), etcd (coordinación) |
| **Coste/Complejidad** | Medio-alto. Consul requiere server cluster, agentes en cada nodo, y configuración de intenciones |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: DNS resolution timeout en K8s

**¿Qué ocasionó el error?**
`ndots:5` en resolv.conf causaba queries DNS adicionales para nombres cortos, incrementando latencia.

**¿Cómo se solucionó?**
```yaml
dnsConfig:
  options:
    - name: ndots
      value: "1"
spec:
  dnsPolicy: ClusterFirst
```

**¿Por qué funciona esta técnica?**
`ndots:1` reduce queries DNS evitando búsquedas en dominios adicionales para nombres cortos.

### Caso: Consul service mesh rotura de conexiones

**¿Qué ocasionó el error?**
Un upstream definido como `destination_name = "database"` no resolvía porque el servicio no existía en Consul.

**¿Cómo se solucionó?**
```hcl
upstreams {
  destination_name = "database.service.consul"
  datacenter = "dc1"
  local_bind_port = 5432
}
```

**¿Por qué funciona esta técnica?**
Consul Connect necesita el FQDN correcto del servicio destino, incluyendo datacenter si es cross-DC.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~380 tokens al invocar este skill
- **Trigger de activación:** service discovery, consul, dns, core dns, headless service, service mesh
- **Prioridad de carga:** Media — skill de infraestructura de red
- **Dependencias:** `18-mesh-data-planes-control-planes`, `11-ebpf-based-networking-cilium`

### Tool Integration

```json
{
  "tool_name": "service-discovery-dns-consul",
  "description": "Descubrimiento de servicios con DNS/Consul, health checks, y Consul Connect mTLS",
  "triggers": ["service discovery", "consul", "dns", "core dns", "service mesh"],
  "context_hint": "Activar cuando se discuta descubrimiento de servicios multi-platform",
  "output_format": "markdown",
  "max_tokens": 1900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre service discovery, carga el skill
service-discovery-dns-consul. Enfócate en CoreDNS, Consul service definitions,
y Consul Connect con mTLS entre servicios.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# DNS debugging
kubectl run dnsutils --image=registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3 -- sleep 1d
kubectl exec dnsutils -- nslookup api-service.default.svc.cluster.local
kubectl exec dnsutils -- dig +short api-service

# CoreDNS
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50
kubectl -n kube-system edit configmap coredns

# Consul CLI
consul members
consul catalog services
consul catalog nodes -service api
consul connect envoy -sidecar-for api

# Health checks
consul monitor
consul operator raft list-peers
```

### GUI / Web

- **Consul UI**: Service catalog, health status, intentions, KV editor, mesh topology
- **Consul API Gateway UI**: Configuración de routes y listeners
- **kubectl + CoreDNS logs**: Debugging de resolución DNS

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Resolver servicio | `dig +short api-service.default.svc.cluster.local` | Consul UI → Service → Instances |
| Listar servicios | `consul catalog services` | Consul UI → Services |
| Ver health | `consul members --detailed` | Consul UI → Nodes |

---

## 7. Cheatsheet Rápido

```bash
# DNS debugging en K8s
kubectl run dnstool --image=busybox -it --rm -- nslookup kubernetes.default
kubectl exec dnsutils -- dig +short myservice

# Consul rápido
consul members
consul catalog services
consul connect envoy -sidecar-for api -admin-bind 0.0.0.0:19000

# Headless service K8s
# clusterIP: None → DNS returns all pod IPs
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `18-mesh-data-planes-control-planes` | complementario (service mesh + discovery) | Sí |
| `11-ebpf-based-networking-cilium` | complementario (Cilium + DNS) | No |
| `21-network-policies-segmentation` | complementario (DNS policy + network) | Sí |
| `24-dns-routing-anycast-latency` | complementario (DNS routing avanzado) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: service-discovery-dns-consul
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [service-discovery, consul, dns, core-dns, service-mesh, health-checks]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

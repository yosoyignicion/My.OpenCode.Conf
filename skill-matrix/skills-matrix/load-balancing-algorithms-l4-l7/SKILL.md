---
name: load-balancing-algorithms-l4-l7
description: "Load balancing distributes incoming traffic across backend servers"
---
# Load Balancing Algorithms — L4 & L7

## Semantic Triggers
```
layer 4 load balancing tcp udp vs layer 7 http, round robin least connections and weighted load balancing, consistent hashing load balancing for sticky sessions, l7 load balancing with path and header based routing, load balancer health checks and passive monitoring, load balancing for grpc with l7 proxy
```

---

## 1. Definición Teórica

Load balancing distributes incoming traffic across backend servers. L4 (transport layer) operates on TCP/UDP, routing by IP and port. L7 (application layer) inspects HTTP headers, paths, cookies, and other application data. It solves the problem of distributing load, providing fault tolerance, and enabling horizontal scaling. Key distinction: L4 is faster and protocol-agnostic; L7 provides intelligent routing (canary, A/B testing, content-based routing) at higher latency.

---

## 2. Implementación de Referencia

**Envoy** — the modern standard for L7 load balancing (used by Istio, Consul). **NGINX** — mature HTTP/TCP load balancer. **HAProxy** — high-performance TCP/HTTP load balancer. **AWS ALB** (L7) and **NLB** (L4). **Linkerd** — lightweight L7 for service mesh.

### Ejemplo Práctico Avanzado

```python
from dataclasses import dataclass
from typing import Protocol
import random
import hashlib
import bisect

# Load balancer strategy protocol
class LoadBalancerStrategy(Protocol):
    def select(self, backends: list[str], client_id: str = None) -> str: ...

# Round Robin
@dataclass
class RoundRobin:
    idx: int = 0
    def select(self, backends: list[str], client_id: str = None) -> str:
        self.idx = (self.idx + 1) % len(backends)
        return backends[self.idx]

# Weighted Round Robin
@dataclass
class WeightedRoundRobin:
    weights: dict[str, int]
    _current: int = 0
    _max_weight: int = 0
    _gcd_weight: int = 1

    def select(self, backends: list[str], client_id: str = None) -> str:
        while True:
            backend = backends[self._current]
            self._current = (self._current + 1) % len(backends)
            if self._current == 0:
                weights = [self.weights.get(b, 1) for b in backends]
                self._gcd_weight = self._gcd(weights)
                self._max_weight = max(weights)
            weight = self.weights.get(backend, 1)
            if weight >= self._max_weight:
                return backend
            self._max_weight -= self._gcd_weight

    def _gcd(self, nums: list[int]) -> int:
        import math
        return math.gcd(*nums)

# Least Connections
@dataclass
class LeastConnections:
    connections: dict[str, int]
    def select(self, backends: list[str], client_id: str = None) -> str:
        return min(backends, key=lambda b: self.connections.get(b, 0))

# Consistent Hash (for sticky sessions)
@dataclass
class ConsistentHash:
    ring: dict = None
    sorted_keys: list = None
    vnodes: int = 150
    backends: list = None

    def __post_init__(self):
        self.ring = {}
        self.sorted_keys = []
        for b in self.backends or []:
            self._add_node(b)

    def _add_node(self, node: str):
        for i in range(self.vnodes):
            key = hashlib.md5(f"{node}:{i}".encode()).hexdigest()
            h = int(key[:8], 16)
            self.ring[h] = node
        self.sorted_keys = sorted(self.ring.keys())

    def select(self, backends: list[str], client_id: str = None) -> str:
        key = client_id or str(random.randint(0, 100000))
        h = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
        idx = bisect.bisect_left(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]

# Proxy Protocol: preserve client IP across L4 LB
# Enable on NLB/ALB and configure backend to accept proxy protocol
```

**Fuente oficial:** https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing

### Alternativa de Implementación Específica

**HAProxy** — Best for high-performance TCP/L4 and HTTP. Uses single-process event-driven model. Config via `/etc/haproxy/haproxy.cfg`. **NGINX** — Best for HTTP with complex routing rules. Also serves as reverse proxy and TLS termination.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | L4: TCP-level protocols (MySQL, SSH), low-latency, protocol-agnostic. L7: HTTP services, canary deploys, auth, cookie-based sessions |
| **Cuándo evitar** | L4 for gRPC (breaks long-lived streams). L7 for non-HTTP protocols. Sticky sessions for stateless services |
| **Alternativas** | DNS load balancing (simple, TTL-dependent). Service mesh (L7 routing without separate LB). Client-side load balancing (service discovery) |
| **Coste/Complejidad** | Low — L4 is simple, L7 adds configuration complexity (routing rules, health checks, SSL termination). Modern proxies (Envoy) handle both |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: gRPC load balancing with L4 breaks

**¿Qué ocasionó el error?**
gRPC uses HTTP/2 with long-lived connections. L4 UDP/TCP load balancing does not understand HTTP/2 multiplexing. All gRPC streams route to the same backend once a connection is established, causing uneven distribution.

**¿Cómo se solucionó?**
Use L7 load balancing (Envoy, Linkerd, NGINX with `grpc_pass`). L7 balancers can distribute each gRPC stream independently. Enable client-side load balancing with service discovery (gRPC resolver).

**¿Por qué funciona esta técnica?**
L7 balancers terminate the HTTP/2 connection and create new ones to backends, allowing per-request routing. gRPC's built-in resolver creates separate subchannels to each backend.

### Caso: Sticky sessions cause uneven load

**¿Qué ocasionó el error?**
Consistent hash-based sticky sessions with 150 vnodes per backend. A few popular clients (by IP) hash to the same node, creating hot spots.

**¿Cómo se solucionó?**
Use cookie-based sessions instead of IP hash. Set the cookie with a random value on first request. Use consistent hash with more vnodes (256) and weighted nodes.

**¿Por qué funciona esta técnica?**
Cookie-based sticky sessions distribute clients uniformly. Random cookie values ensure even distribution across backends regardless of client IP patterns.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "load balancing", "l4 lb", "l7 lb", "envoy", "haproxy", "nginx load balancer"
- **Prioridad de carga:** Alta — fundamental para escalado horizontal
- **Dependencias:** `consistent-hashing-topologies`, `service-mesh-envoy-sidecars`

### Tool Integration

```json
{
  "tool_name": "load-balancing-algorithms-l4-l7",
  "description": "Load balancing algorithms (round-robin, least connections, consistent hash) for L4 and L7 traffic distribution",
  "triggers": ["load balancing", "l4", "l7", "envoy", "haproxy", "round robin", "consistent hash"],
  "context_hint": "Load when user asks about load balancing, traffic distribution, or proxy configuration",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre load balancing, carga el skill
load-balancing-algorithms-l4-l7. Prioriza la selección de algoritmo según
el tipo de tráfico: L4 para TCP, L7 para HTTP/gRPC con Envoy o NGINX.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# HAProxy stats socket
echo "show stat" | socat stdio /var/run/haproxy/admin.sock

# Envoy cluster status
curl -s http://localhost:15000/clusters | grep -E "host_status|healthy"
curl -s http://localhost:15000/stats | grep -E "lb|load|balancer"

# NGINX upstream status
curl http://localhost:8080/nginx_status

# ALB target group health
aws elbv2 describe-target-health --target-group-arn <arn>

# Test weighting with wrr
ab -n 1000 -c 10 http://localhost/api/

# Connection pool size
ss -s | grep -E "estab|total"
```

### GUI / Web

- **HAProxy Stats Page** — real-time backend status, sessions, queue depth, response time
- **NGINX Amplify** — upstream health, request distribution, latency per upstream
- **AWS Console (ELB)** — ALB/NLB target group health, request count, latency, HTTP error codes
- **Kiali** — traffic routing visualization for service mesh (Istio + Envoy)
- **Envoy Admin** — config dump, clusters, listeners, stats at `localhost:15000`

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check backends | `echo "show stat" \| socat ...` | HAProxy Stats → Backend |
| Envoy config | `curl localhost:15000/config_dump` | Kiali → Services → Traffic |
| LB health | `aws elbv2 describe-target-health` | AWS Console → Target Groups |
| Test distribution | `ab -n 1000 -c 10 <url>` | NGINX Amplify → Live Activity |

---

## 7. Cheatsheet Rápido

```text
# L4 (transport): TCP/UDP, round-robin/least-connections
#   Use for: MySQL, SSH, gRPC (only with L7 proxy)
#   Tools: NLB, HAProxy (tcp mode)

# L7 (application): HTTP/gRPC, content-based routing
#   Use for: Web APIs, canary deploys, auth, rate limiting
#   Tools: ALB, Envoy, NGINX, HAProxy (http mode)

# Algorithms:
#   Round-robin: uniform workload
#   Least connections: variable request duration
#   Consistent hash: sticky sessions (avoid if possible)
#   Weighted: heterogeneous backends

# Health checks:
#   Active: HTTP GET /healthz, 2s timeout, 5s interval, 3 failures = unhealthy
#   Passive: Envoy outlier detection, 5 consecutive 5xx = ejected
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `consistent-hashing-topologies` | implementación — consistent hash for sessions | Sí |
| `service-mesh-envoy-sidecars` | implementación — Envoy as L7 load balancer | Sí |
| `grpc-protobuf` | complementario — gRPC needs L7 load balancing | No |
| `dns-routing-anycast-latency` | complementario — DNS as first hop, LB as second | No |
| `cdn-edge-caching-georouting` | complementario — CDN as global L7 LB | No |

---

## 9. Metadatos del Skill

```yaml
---
id: load-balancing-algorithms-l4-l7
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [load-balancing, l4, l7, envoy, haproxy, nginx, round-robin, least-connections, consistent-hash]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

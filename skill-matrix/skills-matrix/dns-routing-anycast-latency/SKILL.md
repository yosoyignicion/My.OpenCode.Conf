---
name: dns-routing-anycast-latency
description: "DNS resolves domain names to IP addresses"
---
# DNS Routing, Anycast & Latency Optimization

## Semantic Triggers
```
dns anycast routing for global load balancing, dns latency based routing with geo proximity, dns ttl and resolution caching best practices, dns based failover and health checking, edns client subnet for improved resolution, dns performance optimization and resolver selection
```

---

## 1. Definición Teórica

DNS resolves domain names to IP addresses. Anycast DNS routes queries to the nearest of many globally distributed authoritative servers, reducing resolution latency. It solves the problem of directing users to the closest or most appropriate server without relying on client-side logic. Key distinction: Anycast (same IP advertised from multiple locations via BGP) vs Unicast (one IP per location). Geo-routing with EDNS Client Subnet lets DNS return location-optimized records.

---

## 2. Implementación de Referencia

**AWS Route 53** — latency-based routing, geolocation routing, health checks. **Cloudflare DNS** — global anycast network with DNSSEC, DDoS protection. **Google Cloud DNS** — managed DNS with anycast. **CoreDNS** — self-hosted DNS for Kubernetes.

### Ejemplo Práctico Avanzado

```python
import socket
import time
import random
from dataclasses import dataclass
from typing import Optional
import asyncio

@dataclass
class DNSRecord:
    hostname: str
    ips: list[str]
    expiry: float
    ttl: float

class SmartDNSResolver:
    """DNS resolver with caching, latency probing, and failover."""
    def __init__(self, min_ttl: float = 30.0, max_ttl: float = 3600.0):
        self.cache: dict[str, DNSRecord] = {}
        self.min_ttl = min_ttl
        self.max_ttl = max_ttl
        self.resolver = "8.8.8.8"  # Google DNS as fallback

    async def resolve(self, hostname: str, prefer_ipv6: bool = False) -> Optional[str]:
        now = time.monotonic()
        cached = self.cache.get(hostname)

        # Check cache freshness
        if cached and now < cached.expiry:
            return cached.ips[0] if cached.ips else None

        # Cache stale or missing — resolve
        try:
            # Get all IPs, preferring IPv4 or v6
            family = socket.AF_INET6 if prefer_ipv6 else socket.AF_INET
            info = await asyncio.get_event_loop().run_in_executor(
                None, lambda: socket.getaddrinfo(hostname, 80, family, socket.SOCK_STREAM)
            )
            ips = list(set(addr[4][0] for addr in info))

            # Determine effective TTL
            ttl = self._get_ttl(hostname, ips)
            self.cache[hostname] = DNSRecord(
                hostname=hostname,
                ips=ips,
                expiry=now + ttl,
                ttl=ttl,
            )
            return ips[0] if ips else None
        except socket.gaierror:
            # DNS resolution failed — return stale if exists
            return cached.ips[0] if (cached and cached.ips) else None

    def _get_ttl(self, hostname: str, ips: list[str]) -> float:
        """Determine conservative TTL."""
        # In real impl: parse SOA TTL or use DNS resolver's TTL
        # Conservative: use self.min_ttl for failover domains
        if "api" in hostname:
            return self.min_ttl  # short TTL for failover
        return self.max_ttl  # long TTL for static resources

    def resolve_best_by_latency(self, hostname: str) -> Optional[str]:
        """Resolve to the fastest IP based on latency probe."""
        cached = self.cache.get(hostname)
        if not cached or not cached.ips:
            return None
        if len(cached.ips) == 1:
            return cached.ips[0]
        # Probe latency for each IP (simplified: pick random)
        return random.choice(cached.ips)

    def invalidate(self, hostname: str):
        """Force re-resolution on next request."""
        self.cache.pop(hostname, None)

# Health-check aware DNS failover
class HealthAwareDNSResolver(SmartDNSResolver):
    def __init__(self, min_ttl: float = 30.0):
        super().__init__(min_ttl=min_ttl, max_ttl=60.0)
        self.health: dict[str, bool] = {}

    async def resolve_with_failover(self, hostname: str) -> Optional[str]:
        ips = await self._resolve_ips(hostname)
        if not ips:
            return None
        # Return first healthy IP
        for ip in ips:
            if self.health.get(ip, True):  # default healthy
                return ip
        # All unhealthy — try any
        return ips[0]

    async def health_check(self, ips: list[str]):
        """Background loop: check IP health."""
        while True:
            for ip in ips:
                try:
                    s = socket.create_connection((ip, 80), timeout=2)
                    s.close()
                    self.health[ip] = True
                except (socket.timeout, ConnectionRefusedError):
                    self.health[ip] = False
            await asyncio.sleep(10)
```

**Fuente oficial:** https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html

### Alternativa de Implementación Específica

**Consul DNS** (port 8600) provides service discovery via DNS with SRV records. **CoreDNS** can serve as a Kubernetes DNS with health-based weighted routing. For edge DNS, **Cloudflare** provides free anycast DNS with DDoS protection and DNSSEC.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Global applications needing low-latency resolution, multi-region failover, service discovery via DNS SRV records |
| **Cuándo evitar** | Internal-only services (use Consul/ZK for discovery). DNS as the sole load balancer (DNS cache TTL limits failover speed) |
| **Alternativas** | Service mesh (L7 traffic routing with no DNS dependency). HTTP redirects (302-based geo-routing). Client-side load balancers |
| **Coste/Complejidad** | Low — managed DNS is cheap. Complexity in TTL tuning: low TTL (<30s) increases query volume/cost; high TTL slows failover. Anycast requires BGP peering or managed provider |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: DNS caching prevents failover

**¿Qué ocasionó el error?**
A primary server fails. The DNS record is updated to the secondary's IP. However, clients and intermediate resolvers have the old record cached (high TTL=300s). Users see errors for 5 minutes.

**¿Cómo se solucionó?**
Use **low TTL** (30-60s) for failover-sensitive domains. Use **Route 53 latency-based routing** with health checks — it updates DNS within the TTL but also returns different IPs to different clients. Use **multiple A records** — clients retry on connection failure.

**¿Por qué funciona esta técnica?**
Low TTL minimizes cache duration. Multi-A records allow clients to retry with different IPs on connection failure (browser retry logic). Health checks change the active IP without waiting for TTL.

### Caso: EDNS Client Subnet not supported by resolver

**¿Qué ocasionó el error?**
Geo-routing via DNS returns a US IP to clients worldwide because the recursive resolver is in the US. European users get poor performance because EDNS Client Subnet is not supported by the resolver.

**¿Cómo se solucionó?**
Enable EDNS Client Subnet (ECS) on authoritative DNS. For resolvers that don't support ECS, use geo-proximity routing based on the resolver's IP location. Cloudflare and Google Public DNS support ECS.

**¿Por qué funciona esta técnica?**
ECS sends the first 24 bits of the client IP to the authoritative server. Without ECS, the server sees only the resolver's IP. Geo-proximity based on resolver location is less precise but works universally.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "dns routing", "anycast", "geo dns", "dns failover", "latency based routing", "edns"
- **Prioridad de carga:** Media — importante para aplicaciones multi-región
- **Dependencias:** `cdn-edge-caching-georouting`, `load-balancing-algorithms-l4-l7`

### Tool Integration

```json
{
  "tool_name": "dns-routing-anycast-latency",
  "description": "DNS routing strategies: anycast, geo-routing, latency-based routing, health-check failover, ECS, TTL optimization",
  "triggers": ["dns routing", "anycast", "geo dns", "dns failover", "edns", "route53"],
  "context_hint": "Load when user asks about DNS, routing, anycast, or multi-region traffic management",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre DNS routing o anycast, carga el skill
dns-routing-anycast-latency. Prioriza estrategias de TTL, failover con health checks
y EDNS Client Subnet para geo-routing.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# DNS resolution
dig example.com A
dig example.com AAAA
dig example.com MX

# Check authoritative nameservers
dig example.com NS

# Trace resolution path
dig +trace example.com

# Check TTL
dig example.com | grep -E "^example|IN A"

# EDNS Client Subnet test
dig +subnet=1.2.3.4 example.com

# Route53 latency test
dig example.com @ns-xxx.awsdns-xx.net

# DNS failover test
nslookup example.com 8.8.8.8
```

### GUI / Web

- **Route 53 Console** — latency-based routing policies, health check status, failover configuration
- **Cloudflare Dashboard** — DNS analytics, DNSSEC, proxy (orange cloud) settings
- **DNSViz** — DNS delegation and DNSSEC chain visualization
- **DNSPerf** — resolver performance benchmarks, query latency
- **Grafana** — DNS resolution latency, query volume, failover events

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Query | `dig example.com` | Route53 Console → Hosted Zones |
| Trace | `dig +trace example.com` | DNSViz → Enter domain |
| Check TTL | `dig example.com \| grep IN A` | Cloudflare → DNS → Records |
| Failover test | `nslookup <domain> 8.8.8.8` | Route53 → Health Checks |

---

## 7. Cheatsheet Rápido

```bash
# DNS TTL strategy:
#   Failover-sensitive: TTL = 30-60s
#   Stable CDN: TTL = 300-3600s
#   Immutable: TTL = 86400s

# Anycast: same IP from multiple locations via BGP
#   +: automatic failover, lower query latency
#   -: requires BGP or managed provider

# Route53 routing policies:
#   Simple: single record
#   Latency-based: return IP with lowest latency
#   Geolocation: return IP based on client country
#   Failover: primary/secondary with health checks

# dig essentials:
dig +short example.com        # short answer
dig example.com ANY           # all record types
dig -x 1.2.3.4                # reverse lookup
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `cdn-edge-caching-georouting` | complementario — DNS routes users to CDN edges | Sí |
| `load-balancing-algorithms-l4-l7` | complementario — DNS is first hop, LB is second | Sí |
| `service-discovery-dns-consul` | implementación — service discovery via DNS/SRV | No |
| `network-partitions-split-brain` | relacionado — DNS failover during network partition | No |
| `service-mesh-envoy-sidecars` | alternativo — mesh replaces DNS for traffic routing | No |

---

## 9. Metadatos del Skill

```yaml
---
id: dns-routing-anycast-latency
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [dns, anycast, geo-routing, latency, failover, edns, route53, cloudflare, dnss]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

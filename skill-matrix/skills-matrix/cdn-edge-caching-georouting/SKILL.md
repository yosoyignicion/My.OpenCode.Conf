---
name: cdn-edge-caching-georouting
description: "CDNs cache content at edge locations close to users, reducing latency and origin load"
---
# CDN, Edge Caching & Georouting

## Semantic Triggers
```
cdn edge caching with cache-control and surrogate-key, geo routing and origin shield for cdn, cdn cache invalidation and purging strategies, stale while revalidate and stale-if-error patterns, dynamic content acceleration at the edge, cdn security with waf and bot management
```

---

## 1. Definición Teórica

CDNs cache content at edge locations close to users, reducing latency and origin load. They solve the problem of delivering content globally with low latency. Key distinction: CDNs provide a distributed caching layer with intelligent routing (Anycast), origin shielding (collapsing requests), and programmability via edge functions (Cloudflare Workers, Fastly Compute@Edge). Surrogate keys enable grouped cache invalidation.

---

## 2. Implementación de Referencia

**Cloudflare** — largest global edge network with Workers, Cache API, and KV. **Fastly** — VCL-based CDN with instant purge. **AWS CloudFront** with Lambda@Edge for custom logic. **Varnish** / **nginx** for self-hosted edge caching.

### Ejemplo Práctico Avanzado

```python
# CDN cache strategy patterns
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """API endpoint with stale-while-revalidate pattern."""
    data = await fetch_order(order_id)
    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": "public, max-age=10, stale-while-revalidate=300",
            "Surrogate-Key": f"order:{order_id} user:{data['user_id']}",
            "CDN-Cache-Control": "max-age=10",
        }
    )

@app.get("/static/{path:path}")
async def static_asset(path: str):
    """Static assets with long cache and immutable flag."""
    content = await read_static(path)
    return Response(
        content=content,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Surrogate-Key": "static",
        }
    )

# Cache invalidation via surrogate keys
async def invalidate_order(order_id: str, user_id: str):
    """Purge CDN cache for specific order and user's order list."""
    # Fastly/Cloudflare API purge by surrogate key
    await cdn_client.purge_by_key(f"order:{order_id}")
    await cdn_client.purge_by_key(f"user:{user_id}")

# Edge function (Cloudflare Workers-like) for geo-routing
async def geo_route_response(request, geo: dict):
    country = geo.get("country", "US")
    if country == "EU":
        return await handle_gdpr(request)
    return await handle_default(request)
```

**Fuente oficial:** https://developers.cloudflare.com/cache/

### Alternativa de Implementación Específica

For self-hosted CDN, **Varnish** with VCL provides precise cache control: `vcl_recv` for request modification, `vcl_backend_response` for TTL setting, and `ban()` for cache invalidation. For Kubernetes, **Skipper** ingress provides CDN-like caching with route-based policies.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Global user base, static asset delivery, API response caching, DDoS protection, image optimization |
| **Cuándo evitar** | Single-region internal services, real-time data that cannot be cached (WebSocket feeds), compliance requirements preventing edge caching |
| **Alternativas** | Self-hosted Varnish/nginx reverse proxy. In-memory cache (Redis) for API caching without CDN. Edge functions for compute near users |
| **Coste/Complejidad** | Low for managed CDN (Cloudflare, Fastly). Medium for self-hosted (Varnish tuning, origin shield sizing). Cache invalidation is the primary complexity |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Stale content served after update

**¿Qué ocasionó el error?**
API response is cached with 60s TTL. Admin updates pricing. The CDN serves stale prices for up to 60 seconds. Users see old prices and attempt purchases at outdated rates.

**¿Cómo se solucionó?**
Use **surrogate keys** for targeted invalidation. When prices change, send a purge request for the `prices` surrogate key. For immutable data, use `stale-if-error` to serve stale on origin failure but purge on mutation.

**¿Por qué funciona esta técnica?**
Surrogate keys group related content across URLs. A single purge invalidates all cached responses tagged with that key, ensuring cache consistency for dependent data.

### Caso: Origin overload despite CDN

**¿Qué ocasionó el error?**
High traffic causes thousands of concurrent cache misses. All requests hit the origin simultaneously, overwhelming the database.

**¿Cómo se solucionó?**
Enable **origin shield** (collapsed forwarding). The shield node handles all backfill requests for a region, collapsing concurrent misses into a single origin request. Use `stale-while-revalidate` to serve stale during revalidation.

**¿Por qué funciona esta técnica?**
Origin shield acts as a secondary cache layer. Requests that miss the edge cache go to the shield (not origin). The shield coalesces concurrent misses into one origin request.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "cdn", "edge caching", "cloudflare", "fastly", "cache control", "surrogate key"
- **Prioridad de carga:** Alta — esencial para rendimiento web global
- **Dependencias:** `performance-caching-web`, `dns-routing-anycast-latency`

### Tool Integration

```json
{
  "tool_name": "cdn-edge-caching-georouting",
  "description": "CDN configuration, edge caching patterns, surrogate key invalidation, origin shield, geo-routing",
  "triggers": ["cdn", "edge caching", "cloudflare", "cache control", "surrogate key", "origin shield"],
  "context_hint": "Load when user asks about CDN setup, cache invalidation, or global content delivery",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre CDN o edge caching, carga el skill
cdn-edge-caching-georouting. Prioriza estrategias de cache-control headers,
surrogate keys para invalidación, y stale-while-revalidate patterns.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Check CDN cache headers
curl -sI https://example.com/static/app.js | grep -E "Cache-Control|Age|CF-Cache-Status|X-Cache"

# Force purge via API (Fastly)
curl -X POST "https://api.fastly.com/service/<sid>/purge" -H "Fastly-Key: $TOKEN" -H "Surrogate-Key: orders"

# Cloudflare purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone>/purge_cache" -H "Authorization: Bearer $TOKEN" -d '{"purge_everything":true}'

# Test geo-routing
curl -H "CF-IPCountry: DE" https://example.com/api

# Simulate origin shield behavior
ab -n 1000 -c 100 https://origin.example.com/api/
```

### GUI / Web

- **Cloudflare Dashboard** — cache analytics, purge tool, Edge Workers logs
- **Fastly Observatory** — real-time cache hit ratio, origin shield efficiency, purge history
- **AWS CloudFront** — cache distribution metrics, origin request metrics, geo-distribution maps
- **GTmetrix / WebPageTest** — CDN impact analysis, waterfall view with cache status per request

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Check cache | `curl -sI <url> \| grep -i cache` | DevTools → Network → Headers |
| Purge key | `curl -X POST ... purge_by_key` | Cloudflare Dashboard → Caching → Purge |
| Geo test | `curl -H "CF-IPCountry: DE"` | Fastly Observatory → Real-time |

---

## 7. Cheatsheet Rápido

```http
# Cache-Control directives
Cache-Control: public, max-age=3600, s-maxage=3600
Cache-Control: private, no-cache, no-store  # never cache
Cache-Control: public, max-age=31536000, immutable  # versioned assets

# Stale-while-revalidate
Cache-Control: public, max-age=10, stale-while-revalidate=300, stale-if-error=86400

# Surrogate keys for grouped invalidation
Surrogate-Key: "api orders user:42"

# CDN response headers
CF-Cache-Status: HIT/MISS/DYNAMIC  # Cloudflare
X-Cache: HIT/MISS/MISS from cloudfront  # CloudFront
Age: 123  # seconds since cached
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `dns-routing-anycast-latency` | base — Anycast DNS routes to nearest CDN edge | Sí |
| `performance-caching-web` | complementario — browser + CDN caching strategy | Sí |
| `seguridad-defensiva-web` | complementario — WAF and edge security | No |
| `edge-serverless-streaming` | complementario — edge functions for cache customization | No |
| `load-balancing-algorithms-l4-l7` | relacionado — CDN as L7 load balancer | No |

---

## 9. Metadatos del Skill

```yaml
---
id: cdn-edge-caching-georouting
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [cdn, edge-caching, cloudflare, fastly, cache-control, surrogate-key, origin-shield, georouting]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

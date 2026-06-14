---
name: api-gateway-bff-patterns
description: "The API Gateway is a single entry point that routes requests to appropriate microservices and handles cross-cutting concerns (auth, rate limiting, logging, SSL termination)"
---
# API Gateway & BFF Patterns

## Semantic Triggers
```
api gateway routing composición, bff backend for frontend específico, gateway aggregation multiple services, api gateway rate limiting auth, bff pattern cliente dedicado, gateway vs bff diferencias
```

---

## 1. Definición Teórica

The API Gateway is a single entry point that routes requests to appropriate microservices and handles cross-cutting concerns (auth, rate limiting, logging, SSL termination). It may aggregate responses from multiple services to reduce client roundtrips. Backend for Frontend (BFF) extends this by providing a dedicated backend per client type (web, mobile, IoT), each optimized for that client's specific needs — mobile BFFs return smaller payloads, web BFFs include more metadata, IoT BFFs use binary protocols.

---

## 2. Implementación de Referencia

TypeScript with Express-based API Gateway and separate BFF services for web and mobile clients.

### Ejemplo Práctico Avanzado

```typescript
// ===== API GATEWAY =====
// Single entry point with routing, auth, rate limiting, aggregation

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rateLimit } from 'express-rate-limit';

const gateway = express();

// Cross-cutting concerns
gateway.use(rateLimit({
  windowMs: 60_000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

gateway.use((req, res, next) => {
  // Authentication check
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req.user = verifyToken(token);
  next();
});

// Route to microservices
gateway.all('/api/orders/*', createProxyMiddleware({
  target: 'http://orders-service:3001',
  timeout: 5000,
  proxyTimeout: 5000,
}));

gateway.all('/api/payments/*', createProxyMiddleware({
  target: 'http://payments-service:3002',
}));

gateway.all('/api/shipping/*', createProxyMiddleware({
  target: 'http://shipping-service:3003',
}));

// Aggregation endpoint — reduces client roundtrips
gateway.get('/api/checkout-status/:orderId', async (req, res) => {
  try {
    const [order, payment, shipping] = await Promise.all([
      fetch(`http://orders-service:3001/api/orders/${req.params.orderId}`).then(r => r.json()),
      fetch(`http://payments-service:3002/api/payments/order/${req.params.orderId}`).then(r => r.json()),
      fetch(`http://shipping-service:3003/api/shipments/order/${req.params.orderId}`).then(r => r.json()),
    ]);

    res.json({
      order: { id: order.id, status: order.status, items: order.items },
      payment: { status: payment.status, method: payment.method },
      shipping: { status: shipping.status, estimatedDelivery: shipping.eta },
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch checkout status' });
  }
});

// ===== BFF PATTERNS =====

// Mobile BFF — lightweight responses, binary-friendly
class MobileBFF {
  async getOrder(id: string): Promise<MobileOrderResponse> {
    const order = await this.ordersService.getOrder(id);
    return {
      id: order.id,
      status: order.status,
      total: order.total.amount,
      currency: order.total.currency,
      // No audit fields, no metadata — mobile needs minimal payload
    };
  }

  async getProductList(category: string): Promise<MobileProductResponse> {
    const products = await this.catalogService.getProducts(category);
    return products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.thumbnailUrl, // small image for mobile
      inStock: p.inventory > 0,
    }));
  }
}

// Web BFF — richer responses, includes SEO metadata
class WebBFF {
  async getProductPage(slug: string): Promise<WebProductPage> {
    const [product, reviews, related] = await Promise.all([
      this.catalogService.getProductBySlug(slug),
      this.reviewService.getReviews(slug),
      this.recommendationService.getRelated(slug),
    ]);

    return {
      product: {
        ...product,
        description: product.fullDescription, // full HTML for web
        images: product.images, // all sizes
      },
      reviews: { average: reviews.average, count: reviews.total, items: reviews.top },
      related: related.map(r => ({ id: r.id, name: r.name, price: r.price })),
      seo: {
        title: product.metaTitle,
        description: product.metaDescription,
        canonicalUrl: `https://shop.com/products/${slug}`,
      },
    };
  }
}

// IoT BFF — binary protocol, minimal bytes
class IoTBFF {
  async getDeviceConfig(deviceId: string): Promise<Uint8Array> {
    const config = await this.deviceService.getConfig(deviceId);
    // Return protobuf-encoded config instead of JSON
    return DeviceConfig.encode({
      pollingInterval: config.interval,
      endpoints: config.endpoints.map(e => ({ url: e.url, type: e.protocol })),
    }).finish();
  }
}
```

**Fuente oficial:** https://samnewman.io/patterns/architectural/bff/

### Alternativa de Implementación Específica

Python with FastAPI for API Gateway and separate FastAPI apps for each BFF. Use `httpx` for async service-to-service calls.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Múltiples clientes con diferentes necesidades, microservicios con APIs separadas, necesidad de centralizar auth/rate limiting |
| **Cuándo evitar** | Sistema simple con un solo cliente, servicios que ya exponen APIs optimizadas para cada cliente, equipos pequeños |
| **Alternativas** | GraphQL (cliente decide qué datos obtener), Service Mesh (sidecar para cross-cutting), Client-side aggregation (más roundtrips pero sin gateway) |
| **Coste/Complejidad** | Medio. Gateway añade latencia (hop extra). BFF añade mantenimiento de N backends. Gran flexibilidad para equipos de cliente |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Gateway se convierte en monolito

**¿Qué ocasionó el error?**
Toda la lógica de negocio se movió al gateway porque era "conveniente", creando un monolito distribuido.

**¿Cómo se solucionó?**
```typescript
// Gateway debe ser delgado — solo routing y cross-cutting
class Gateway {
  // ✅ Solo cross-cutting concerns
  // auth, rate limit, logging, routing, simple aggregation

  // ❌ NO: business logic, validation de dominio, transformaciones complejas
  // NO: calcular impuestos, validar reglas de negocio, orquestar sagas

  // Si se necesita lógica, crear un BFF o microservicio dedicado
}
```

**¿Por qué funciona esta técnica?**
Gateway debe ser delgado. La lógica de negocio pertenece a los servicios o BFFs. Gateway que crece es un anti-patrón.

### Caso: BFF con lógica duplicada

**¿Qué ocasionó el error?**
Mobile BFF y Web BFF tenían lógica de negocio duplicada (cálculo de impuestos, validación).

**¿Cómo se solucionó?**
```typescript
// Extraer lógica compartida a un servicio común
class SharedBillingService {
  async calculateTax(items: OrderItem[], customerRegion: string): Promise<TaxBreakdown> {
    // Lógica compartida — un solo lugar
  }
}

// BFFs llaman al servicio compartido
class MobileBFF {
  constructor(private billing: SharedBillingService) {}
}

class WebBFF {
  constructor(private billing: SharedBillingService) {}
}
```

**¿Por qué funciona esta técnica?**
BFFs comparten lógica de negocio a través de servicios, no duplicándola. Cada BFF solo tiene lógica específica del cliente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "api gateway", "bff", "backend for frontend", "gateway aggregation", "service routing"
- **Prioridad de carga:** Alta — patrón esencial para microservicios con múltiples clientes
- **Dependencias:** `02-arquitectura-diseno/15-microservices-decomposition`, `03-sistemas-distribuidos/26-load-balancing-algorithms-l4-l7`

### Tool Integration

```json
{
  "tool_name": "api-gateway-bff-patterns",
  "description": "Implements API Gateway and BFF patterns: routing, aggregation, rate limiting, client-specific backends",
  "triggers": ["api gateway", "bff", "backend for frontend", "gateway", "service aggregation"],
  "context_hint": "Inject when user asks about API entry points or multi-client backends",
  "output_format": "code examples with gateway and BFF implementations",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre API Gateway o BFF, carga el skill api-gateway-bff-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test gateway routing
curl -s http://gateway:8080/api/orders/123 -H "Authorization: Bearer $TOKEN"
# Check rate limit headers
curl -sI http://gateway:8080/api/products | grep -i ratelimit
# BFF-specific endpoints
curl -s http://mobile-bff:4000/api/orders/123  # lightweight
curl -s http://web-bff:5000/api/orders/123      # full
```

### GUI / Web

- **Kong Manager / Kong UI**: Dashboard de API Gateway
- **KrakenD UI**: Configuración visual de gateway
- **AWS API Gateway Console**: Gateway gestionado en AWS

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test gateway route | `curl -s http://gateway/{path}` | — |
| Check rate limits | `curl -sI http://gateway/{path}` | — |

---

## 7. Cheatsheet Rápido

```typescript
// API Gateway: single entry, route + auth + rate limit + aggregate
// BFF: one backend per client type (web, mobile, IoT)
// Gateway is thin: cross-cutting only, no business logic
// BFF has client-specific logic, not domain duplication
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/15-microservices-decomposition` | Complementario | Sí |
| `03-sistemas-distribuidos/26-load-balancing-algorithms-l4-l7` | Complementario | No |
| `03-sistemas-distribuidos/18-graphql-federation-gateways` | Alternativa | No |
| `06-seguridad-sdlc/11-rate-limiting-abuse-prevention` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: api-gateway-bff-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [api-gateway, bff, backend-for-frontend, routing, aggregation, rate-limiting]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

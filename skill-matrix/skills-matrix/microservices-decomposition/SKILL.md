---
name: microservices-decomposition
description: "Microservices decomposition strategies break a system into independently deployable services aligned to business subdomains (Bounded Contexts)"
---
# Microservices Decomposition

## Semantic Triggers
```
descomposición microservicios bounded context, strangler fig migración incremental, decomposition by subdomain, microservicios tamaño granularidad, decomposition patterns database per service, microservicios comunicación api
```

---

## 1. Definición Teórica

Microservices decomposition strategies break a system into independently deployable services aligned to business subdomains (Bounded Contexts). The primary strategies: decomposition by subdomain (DDD Bounded Contexts), by business capability (team-aligned), by transaction boundary, and the Strangler Fig pattern for incremental migration of monoliths. Each service owns its data store (Database per Service). Communication is via APIs (sync) or events (async). The goal is independent deployability, team autonomy, and scalable evolution.

---

## 2. Implementación de Referencia

TypeScript with decomposition patterns, API Gateway routing, and event-driven communication between services.

### Ejemplo Práctico Avanzado

```typescript
// ===== DECOMPOSITION BY SUBDOMAIN =====
// Each bounded context becomes a separate service with its own database.

// Service 1: Orders (PostgreSQL)
// Owns: orders, order_items tables
// API: /api/orders
// Events emitted: OrderCreated, OrderCancelled
class OrderService {
  async createOrder(items: OrderItem[]): Promise<Order> {
    const order = await this.db.transaction(async (tx) => {
      const [order] = await tx('orders').insert({ status: 'pending' }).returning('*');
      const orderItems = items.map(i => ({ ...i, order_id: order.id }));
      await tx('order_items').insert(orderItems);
      return order;
    });
    await this.eventBus.publish('order.created', { orderId: order.id, items });
    return order;
  }
}

// Service 2: Payments (PostgreSQL)
// Owns: payments, refunds tables
// API: /api/payments
// Subscribed events: OrderCreated
class PaymentService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('order.created', this.handleOrderCreated.bind(this));
  }

  async handleOrderCreated(event: { orderId: string; items: OrderItem[] }): Promise<void> {
    const amount = event.items.reduce((s, i) => s + i.price, 0);
    await this.charge(event.orderId, amount);
  }

  async charge(orderId: string, amount: number): Promise<Payment> {
    const payment = await this.db('payments').insert({ order_id: orderId, amount, status: 'completed' }).returning('*');
    await this.eventBus.publish('payment.completed', { orderId, paymentId: payment[0].id });
    return payment[0];
  }
}

// Service 3: Shipping (PostgreSQL)
// Owns: shipments table
// Subscribed events: PaymentCompleted
class ShippingService {
  async handlePaymentCompleted(event: { orderId: string }): Promise<void> {
    await this.db('shipments').insert({ order_id: event.orderId, status: 'pending' });
  }
}

// ===== STRANGLER FIG PATTERN =====
// Incrementally replace monolith features with microservices.

// Step 1: Add proxy that routes new features to microservice
class StranglerProxy {
  async handleRequest(req: Request): Promise<Response> {
    // Check if this feature has been migrated
    if (this.isMigrated(req.path)) {
      return this.forwardToMicroservice(req);
    }
    // Fall through to monolith
    return this.forwardToMonolith(req);
  }

  private migratedFeatures = new Set(['/api/checkout', '/api/payments']);

  private isMigrated(path: string): boolean {
    return [...this.migratedFeatures].some(f => path.startsWith(f));
  }

  private async forwardToMicroservice(req: Request): Promise<Response> {
    return fetch(`http://new-services${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
  }
}

// Step 2: Gradually add more features to microservice
// Step 3: When monolith has no requests, decommission it

// ===== API GATEWAY =====
const gateway = express();
gateway.all('/api/orders/*', createProxyMiddleware({ target: 'http://orders:3001' }));
gateway.all('/api/payments/*', createProxyMiddleware({ target: 'http://payments:3002' }));
gateway.all('/api/shipping/*', createProxyMiddleware({ target: 'http://shipping:3003' }));

// Aggregation endpoint for composite operations
gateway.get('/api/order-status/:orderId', async (req, res) => {
  const [order, payment, shipment] = await Promise.all([
    fetch(`http://orders:3001/api/orders/${req.params.orderId}`).then(r => r.json()),
    fetch(`http://payments:3002/api/payments/by-order/${req.params.orderId}`).then(r => r.json()),
    fetch(`http://shipping:3003/api/shipments/by-order/${req.params.orderId}`).then(r => r.json()),
  ]);
  res.json({ order, payment, shipment });
});
```

**Fuente oficial:** https://microservices.io/patterns/decomposition/decompose-by-subdomain.html

### Alternativa de Implementación Específica

Go with gRPC for sync communication and NATS JetStream for async events. Use Docker Compose for local development.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos grandes y autónomos, sistemas que requieren escalado independiente por funcionalidad, necesidad de tecnologías diferentes por servicio |
| **Cuándo evitar** | Equipos pequeños, dominios simples, early-stage startups, sistemas donde la latencia de red es crítica |
| **Alternativas** | Modular Monolith (misma modularidad sin complejidad distribuida), SOA (similar pero con ESB), Serverless Functions (granularidad extrema) |
| **Coste/Complejidad** | Alta. Complejidad operativa (despliegue, monitoreo, debugging distribuido). Mayor productividad de equipos grandes. Costes de infraestructura |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Servicio demasiado pequeño (nano-service)

**¿Qué ocasionó el error?**
Se creó un microservicio para cada entidad, resultando en docenas de servicios con dependencias complejas.

**¿Cómo se solucionó?**
```typescript
// Antes: nano-services (uno por entidad)
// user-service, address-service, preferences-service, notification-service
// Cada uno con su DB, comunicación síncrona entre todos → red de dependencias

// Después: agrupar por bounded context
// user-context-service (Users + Addresses + Preferences)
// notification-service (independiente, escucha eventos)
```

**¿Por qué funciona esta técnica?**
Los servicios deben alinearse a Bounded Contexts DDD, no a entidades individuales. La granularidad correcta permite desacoplamiento real.

### Caso: Transacciones distribuidas entre servicios

**¿Qué ocasionó el error?**
Se intentó mantener consistencia fuerte entre servicios usando transacciones distribuidas (XA).

**¿Cómo se solucionó?**
```typescript
// Reemplazar XA con Saga pattern
// OrderService: crea orden, emite OrderCreated
// PaymentService: recibe OrderCreated, cobra, emite PaymentCompleted
// ShippingService: recibe PaymentCompleted, programa envío
// Si Payment falla, InventoryService compensa la reserva
```

**¿Por qué funciona esta técnica?**
Sagas aceptan consistencia eventual y compensan fallos, evitando el acoplamiento bloqueante de XA.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "microservices decomposition", "strangler fig", "bounded context service", "database per service", "service granularity"
- **Prioridad de carga:** Alta — patrón arquitectónico fundamental para sistemas distribuidos
- **Dependencias:** `02-arquitectura-diseno/01-ddd-tactical-patterns`, `02-arquitectura-diseno/14-modular-monolithic-design`

### Tool Integration

```json
{
  "tool_name": "microservices-decomposition",
  "description": "Implements microservices decomposition: subdomain decomposition, strangler fig, database per service, API gateway",
  "triggers": ["microservices", "decomposition", "strangler fig", "service granularity", "bounded context"],
  "context_hint": "Inject when user asks about splitting monolith or designing microservices",
  "output_format": "code examples with decomposition patterns and API gateway",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre descomposición en microservicios, carga el skill microservices-decomposition
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Docker Compose for multi-service dev
docker-compose up -d orders payments shipping
# Check service health
curl -s http://localhost:3001/health && echo " orders ok"
curl -s http://localhost:3002/health && echo " payments ok"
# Strangler Fig migration status
curl -s http://gateway:8080/_migration-status | jq '.'
```

### GUI / Web

- **Docker Desktop**: Gestión de contenedores multi-servicio
- **K9s / Lens**: Dashboard Kubernetes para microservicios
- **Consul UI**: Service discovery y health checks

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Start all services | `docker-compose up -d` | — |
| Check service health | `curl -s {service}/health` | — |

---

## 7. Cheatsheet Rápido

```typescript
// Decomposition: 1 bounded context = 1 service = 1 DB
// Communication: sync (REST/gRPC) or async (events)
// Strangler Fig: proxy → microservice → monolith fallback → decommission
// API Gateway: single entry, route to services
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/14-modular-monolithic-design` | Alternativa | Sí |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Dependiente | Sí |
| `02-arquitectura-diseno/16-api-gateway-bff-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/10-saga-orchestration-choreography` | Complementario | Sí |
| `03-sistemas-distribuidos/20-service-mesh-envoy-sidecars` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: microservices-decomposition
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [microservices, decomposition, strangler-fig, bounded-context, database-per-service, api-gateway]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

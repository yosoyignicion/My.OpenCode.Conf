---
name: grpc-protobuf
description: "gRPC is a high-performance RPC framework using HTTP/2 as transport and Protocol Buffers as the interface definition language"
---
# gRPC & Protocol Buffers

## Semantic Triggers
```
grpc bidirectional streaming, protobuf schema evolution and wire format, grpc deadline propagation and cancellation, grpc interceptors and middleware patterns, grpc load balancing with l4 and l7, protobuf any and oneof for polymorphic messages
```

---

## 1. Definición Teórica

gRPC is a high-performance RPC framework using HTTP/2 as transport and Protocol Buffers as the interface definition language. It solves the problem of polyglot service communication with strong typing, streaming, and automatic code generation. The contract-first approach via `.proto` files ensures backward-compatible schema evolution. Its key distinction is bidirectional streaming over a single HTTP/2 connection with integrated context propagation (deadlines, cancellation, metadata).

---

## 2. Implementación de Referencia

**gRPC** (grpc.io) — official framework maintained by Google. Stable version: 1.70.x. Supports C++, Go, Java, Python, Ruby, Node.js, C#, and more. Use **Buf** for proto management (linting, breaking change detection, code generation).

### Ejemplo Práctico Avanzado

```protobuf
syntax = "proto3";
package order.v1;

import "google/protobuf/timestamp.proto";
import "google/type/money.proto";

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc StreamOrders(StreamOrdersRequest) returns (stream Order);
  rpc ProcessOrders(stream ProcessOrderRequest) returns (stream ProcessOrderResponse);
}

message CreateOrderRequest {
  string user_id = 1;
  repeated LineItem items = 2;
  google.type.Money total = 3;
}

message Order {
  string id = 1;
  string user_id = 2;
  repeated LineItem items = 3;
  google.type.Money total = 4;
  google.protobuf.Timestamp created_at = 5;
  OrderStatus status = 6;
}

message LineItem {
  string product_id = 1;
  int32 quantity = 2;
  google.type.Money unit_price = 3;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
}

message StreamOrdersRequest {
  string user_id = 1;
  OrderStatus filter = 2;
}
```

```python
import grpc
from grpc import aio
from order.v1 import order_pb2, order_pb2_grpc

class OrderServiceServicer(order_pb2_grpc.OrderServiceServicer):
    async def CreateOrder(self, request, context):
        context.set_deadline(5.0)  # server-side deadline
        order_id = await create_order(request)
        return order_pb2.Order(id=order_id, user_id=request.user_id, status=order_pb2.ORDER_STATUS_PENDING)

    async def StreamOrders(self, request, context):
        async for order in stream_orders(request.user_id, request.filter):
            yield order

async def serve():
    server = aio.server()
    order_pb2_grpc.add_OrderServiceServicer_to_server(OrderServiceServicer(), server)
    server.add_insecure_port("[::]:50051")
    await server.start()
    await server.wait_for_termination()
```

**Fuente oficial:** https://grpc.io/docs/languages/python/quickstart/

### Alternativa de Implementación Específica

For TypeScript/Node.js environments, **Connect-ES** (by Buf) provides a lighter alternative to gRPC-web with full gRPC compatibility and better browser support via the Connect protocol. No proxy needed for web clients.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Service-to-service communication in microservices, polyglot environments, real-time streaming, low-latency internal APIs |
| **Cuándo evitar** | Public-facing APIs (browser clients need gRPC-Web or Connect), simple CRUD (REST is simpler), resource-constrained IoT devices (HTTP/2 overhead) |
| **Alternativas** | REST + OpenAPI for public APIs. GraphQL for flexible client-driven queries. AsyncAPI for event-driven communication |
| **Coste/Complejidad** | Medium — requires proto management, code generation build step, and HTTP/2 load balancer support (L7). Higher learning curve for teams new to protobuf |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Deadline exceeded on long-lived stream

**¿Qué ocasionó el error?**
Client sets a 10s deadline; server processes a streaming response that takes >30s. The client cancels the RPC but the server continues processing (no context cancellation check).

**¿Cómo se solucionó?**
Check `context.is_active()` periodically in server-side streaming RPCs. Short-circuit if context is cancelled.

**¿Por qué funciona esta técnica?**
gRPC propagates cancellation via HTTP/2 RST_STREAM. The server must poll the context to detect cancellation; it does not auto-interrupt long operations.

### Caso: Protobuf schema evolution breaks consumers

**¿Qué ocasionó el error?**
A developer removes a deprecated field from a proto message. Consumers using older stubs fail with unknown field errors or wire format mismatches.

**¿Cómo se solucionó?**
Never remove fields — use `reserved` keyword. For breaking changes, create a new package version (`service.v2`). Enforce with `buf breaking --against .git` in CI.

**¿Por qué funciona esta técnica?**
Protobuf wire format uses field numbers, not names. Removing a field makes its number available for reuse, causing data corruption. `reserved` blocks reuse. Versioned packages keep both schemas live.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "grpc", "protobuf", "rpc", "protocol buffers", "grpc streaming"
- **Prioridad de carga:** Alta — fundamental para comunicación entre servicios distribuidos
- **Dependencias:** `http3-quic` (HTTP/2 transport base), `load-balancing-algorithms-l4-l7`

### Tool Integration

```json
{
  "tool_name": "grpc-protobuf",
  "description": "gRPC framework and Protocol Buffers for service-to-service communication with streaming and code generation",
  "triggers": ["grpc", "protobuf", "rpc", "protocol buffers", "grpc streaming", "buf"],
  "context_hint": "Load when user asks about inter-service communication, RPC frameworks, or schema-first API design",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre gRPC o Protocol Buffers, carga el skill grpc-protobuf y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos
de proto schema evolution y manejo de errores sobre teoría general.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# gRPC reflection — list services
grpcurl -plaintext localhost:50051 list

# Invoke RPC
grpcurl -plaintext -d '{"user_id": "42"}' localhost:50051 order.v1.OrderService/CreateOrder

# Proto linting
buf lint

# Breaking change detection
buf breaking --against .git

# Health check
grpc_health_probe -addr=localhost:50051
```

### GUI / Web

- **gRPC UI** (fullstorydev/grpcui) — browser-based gRPC client with reflection
- **Postman** — gRPC support with reflection, streaming visualization, and proto import
- **BloomRPC** — desktop gRPC client with auto-completion from proto files
- **Kiali** (with Istio) — gRPC traffic graph, success rates, and request routing visualization

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List services | `grpcurl list <addr>` | BloomRPC → Import proto |
| Invoke RPC | `grpcurl -d '{}' <addr>/svc/method` | Postman → New gRPC Request |
| Lint | `buf lint` | — |
| Health check | `grpc_health_probe -addr=:50051` | Kiali → Services tab |

---

## 7. Cheatsheet Rápido

```protobuf
syntax = "proto3";
package svc.v1;

service Greeter {
  rpc SayHello (HelloReq) returns (HelloResp);
  rpc StreamHellos (HelloReq) returns (stream HelloResp);
}

message HelloReq { string name = 1; }
message HelloResp { string message = 1; }

// Field rules: singular (default), repeated (array), map<k,v>, oneof
// Never remove fields: use reserved 2, 3;
// Version: use package svc.v1, never rename
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `load-balancing-algorithms-l4-l7` | complementario — gRPC needs L7 load balancing | Sí |
| `service-mesh-envoy-sidecars` | complementario — Envoy is the standard gRPC proxy | Sí |
| `distributed-tracing-context-propagation` | complementario — gRPC integrates OpenTelemetry | No |
| `data-encryption-in-transit-mtls` | complementario — mTLS for gRPC | No |
| `data-serialization-formats` | alternativo — protobuf vs Avro vs JSON | No |

---

## 9. Metadatos del Skill

```yaml
---
id: grpc-protobuf
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [grpc, protobuf, rpc, http2, streaming, buf, schema-evolution, code-generation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

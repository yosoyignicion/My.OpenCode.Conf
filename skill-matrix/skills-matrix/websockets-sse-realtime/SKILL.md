---
name: websockets-sse-realtime
description: "WebSockets provide full-duplex communication over a single TCP connection. Covers event-driven architecture, PostgreSQL LISTEN/NOTIFY, Supabase Realtime, CQRS, Event Sourcing, tiempo real, real-time, eventos, WebSockets, SSE, message queues, outbox pattern, CDC, Change Data Capture, Prisma Pulse"
---
# WebSockets, SSE & Realtime Communication

## Semantic Triggers
```
websocket connection lifecycle and reconnection, server sent events vs websockets use cases, websocket broadcast to rooms with redis pubsub, websocket backpressure and bufferedamount monitoring, realtime event delivery with exponential backoff, socket.io rooms and namespaces for scaling
```

---

## 1. Definición Teórica

WebSockets provide full-duplex communication over a single TCP connection. Server-Sent Events (SSE) provide one-way server-to-client streaming over HTTP. They solve the problem of real-time bidirectional (WebSocket) or server-push (SSE) data delivery without HTTP polling overhead. Key distinction: WebSocket uses a persistent binary/text frame protocol with handshake upgrade; SSE uses standard HTTP with `text/event-stream` and built-in auto-reconnect via `EventSource`.

---

## 2. Implementación de Referencia

**Socket.IO** (Node.js) — de facto standard for WebSocket with auto-reconnection, rooms, namespaces, and fallback. **FastAPI WebSocket** (Python) — async-native with `WebSocket` class. For SSE, **Express SSE** or **FastAPI StreamingResponse**.

### Ejemplo Práctico Avanzado

```python
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, room: str):
        await ws.accept()
        self.active.setdefault(room, set()).add(ws)

    def disconnect(self, ws: WebSocket, room: str):
        self.active.get(room, set()).discard(ws)

    async def broadcast(self, room: str, msg: dict):
        dead = set()
        for ws in self.active.get(room, set()):
            try:
                await ws.send_json(msg)
            except WebSocketDisconnect:
                dead.add(ws)
        self.active.get(room, set()) -= dead

    async def broadcast_with_backpressure(self, room: str, msg: dict):
        dead = set()
        for ws in self.active.get(room, set()):
            try:
                # Check backpressure before sending
                if ws.client_state.value == 1:  # CONNECTED
                    await asyncio.wait_for(ws.send_json(msg), timeout=1.0)
                else:
                    dead.add(ws)
            except (asyncio.TimeoutError, WebSocketDisconnect):
                dead.add(ws)
        self.active.get(room, set()) -= dead

# SSE streaming
from fastapi.responses import StreamingResponse

async def event_generator(user_id: str):
    """SSE generator for streaming notifications."""
    while True:
        notification = await get_notification(user_id)
        if notification:
            yield f"data: {json.dumps(notification)}\n\n"
        yield f": heartbeat\n\n"  # comment line keeps connection alive
        await asyncio.sleep(1)

@app.get("/events/{user_id}")
async def sse_endpoint(user_id: str):
    return StreamingResponse(
        event_generator(user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

manager = ConnectionManager()

@app.websocket("/ws/{room}")
async def ws_endpoint(ws: WebSocket, room: str):
    await manager.connect(ws, room)
    try:
        while True:
            data = await ws.receive_json()
            await manager.broadcast(room, {"user": "anon", "message": data.get("text", "")})
    except WebSocketDisconnect:
        manager.disconnect(ws, room)
```

**Fuente oficial:** https://fastapi.tiangolo.com/advanced/websocket/

### Alternativa de Implementación Específica

For Node.js, **Socket.IO** with Redis adapter enables horizontal scaling across multiple nodes. The Redis adapter uses Pub/Sub to broadcast events to all nodes. Use `socket.join(room)` for room-based scoping and `io.of("/admin")` for namespace isolation.

```typescript
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL },
  pingInterval: 25000,
  pingTimeout: 20000,
})
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  isValid(token) ? next() : next(new Error("unauth"))
})
io.on("connection", (socket) => {
  socket.join(`room:${socket.data.userId}`)
  socket.on("message", (data) => io.to(`room:${data.to}`).emit("message", data))
})
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | WebSocket: bidirectional, multi-user apps (chat, gaming, collaboration). SSE: one-way server push (notifications, metrics, live feeds) |
| **Cuándo evitar** | Simple periodic polling (use HTTP caching + short polling). Non-realtime data (use REST/GraphQL) |
| **Alternativas** | HTTP long-polling (fallback). gRPC bidirectional streaming. WebTransport (future, over QUIC). SSE EventSource (simpler than WebSocket for one-way) |
| **Coste/Complejidad** | Medium — WebSocket requires sticky sessions or Redis Pub/Sub for horizontal scaling. SSE is simpler (stateless HTTP). Both require connection monitoring |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Socket.IO connection flooding after server restart

**¿Qué ocasionó el error?**
All 10k clients reconnect simultaneously after a server restart, causing the database to be overwhelmed by session lookups. Many connections fail with timeout.

**¿Cómo se solucionó?**
Implement incremental reconnection with exponential backoff (1s, 2s, 4s, max 30s) and jitter. Use Socket.IO's built-in `reconnectionDelay` and `randomizationFactor`.

**¿Por qué funciona esta técnica?**
Exponential backoff spreads reconnection attempts over time. Jitter prevents synchronized retry waves. The server handles a manageable influx rather than a spike.

### Caso: WebSocket backpressure — slow consumer blocks server

**¿Qué ocasionó el error?**
A WebSocket connection to a slow client fills the server's send buffer. Messages queue up, consuming memory until OOM.

**¿Cómo se solucionó?**
Monitor `bufferedAmount` before sending. Implement a maximum queue size per connection. Drop or delay messages when the queue exceeds threshold.

**¿Por qué funciona esta técnica?**
WebSocket API exposes `bufferedAmount`. By checking it before `send()`, the application can make informed decisions about whether to wait, drop, or throttle.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "websocket", "sse", "server sent events", "realtime", "socket.io", "event source"
- **Prioridad de carga:** Media — especializado en comunicación en tiempo real
- **Dependencias:** `message-brokers-kafka-internals`, `distributed-cache-redis-cluster`

### Tool Integration

```json
{
  "tool_name": "websockets-sse-realtime",
  "description": "WebSocket and Server-Sent Events for real-time bidirectional and server-push communication in distributed systems",
  "triggers": ["websocket", "sse", "server sent events", "realtime", "socket.io", "event source"],
  "context_hint": "Load when user asks about real-time communication, bidirectional streaming, or server push patterns",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre WebSockets, SSE o comunicación en tiempo real, carga el skill
websockets-sse-realtime. Prioriza ejemplos de FastAPI WebSocket y Socket.IO
con backpressure y reconnection patterns.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# WebSocket test with wscat
wscat -c ws://localhost:8080/ws/room1

# SSE test with curl
curl -N -H "Accept: text/event-stream" http://localhost:8080/events/user1

# Socket.IO test
npx socket.io-shell ws://localhost:3000

# Monitor WebSocket connections
ss -tnp | grep 8080
lsof -i :8080 | wc -l

# Redis Pub/Sub monitoring
redis-cli MONITOR | grep "publish"
```

### GUI / Web

- **Socket.IO Admin UI** — real-time dashboard: connected clients, rooms, events (port 3000/admin)
- **Chrome DevTools** → Network → WS tab — full WebSocket frame inspection, binary viewer
- **Postman** — WebSocket client for testing endpoints
- **RedisInsight** — Pub/Sub channel monitoring and message inspection

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Connect WS | `wscat -c ws://localhost:8080/ws` | Postman → WebSocket → Connect |
| Monitor | `redis-cli MONITOR \| grep publish` | DevTools → WS → Frames |
| Test SSE | `curl -N http://localhost:8080/events` | DevTools → Network → EventStream |

---

## 7. Cheatsheet Rápido

```python
# WebSocket: full-duplex, persistent TCP
# SSE: one-way HTTP, auto-reconnect via EventSource
# Use SSE for server→client, WS for bidirectional

# FastAPI WebSocket pattern
async def ws(ws: WebSocket, room: str):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            await manager.broadcast(room, data)
    except WebSocketDisconnect:
        manager.disconnect(ws, room)

# SSE pattern
async def sse_gen(user_id):
    while True:
        yield f"data: {json.dumps(await get_notif(user_id))}\n\n"
        await asyncio.sleep(1)

# Headers: Cache-Control: no-cache, X-Accel-Buffering: no
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `message-brokers-kafka-internals` | complementario — async messaging for cross-service real-time | Sí |
| `distributed-cache-redis-cluster` | complementario — Redis Pub/Sub for WebSocket scaling | Sí |
| `grpc-protobuf` | alternativo — gRPC bidirectional streaming | No |
| `backpressure-and-flow-control` | complementario — backpressure in WebSocket connections | No |
| `http3-quic` | futuro — WebTransport over QUIC | No |

---

## 9. Metadatos del Skill

```yaml
---
id: websockets-sse-realtime
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills
tags: [websocket, sse, realtime, socket.io, server-sent-events, bidirectional, streaming]
---
```

---

## Comparativa 2026 / Ecosystem

### Event-Driven vs Request-Driven

| Aspecto | Request-Driven | Event-Driven |
|---------|---------------|--------------|
| Acoplamiento | Cliente conoce servidor | Productor no conoce consumidor |
| Comunicación | Síncrona (request/response) | Asíncrona (evento no bloquea) |
| Escalabilidad | Vertical (más servidores) | Horizontal (consumidores independientes) |
| Resiliencia | Falla en cascada | Aislamiento por consumidor |
| Auditabilidad | Limitada | Total (event store) |
| Consistencia | Fuerte (transaccional) | Eventual |

### Componentes Fundamentales

1. **Event Producer** — genera eventos (ej: servicio de usuarios al crear cuenta)
2. **Event Bus** — canal de transporte (PostgreSQL LISTEN/NOTIFY, Redis, Kafka)
3. **Event Consumer** — reacciona al evento
4. **Event Store** — almacén persistente (opcional, para Event Sourcing)

### Event Schema (bien formado)

```json
{
  "id": "evt_01J123456789abcdef",
  "type": "user.created",
  "version": 1,
  "source": "users-service",
  "timestamp": "2025-06-10T14:30:00Z",
  "data": { "userId": "usr_abc123", "email": "user@example.com" },
  "metadata": { "correlationId": "corr_xyz", "causationId": "cmd_yzx" }
}
```

### PostgreSQL LISTEN/NOTIFY

```sql
-- Trigger + NOTIFY
CREATE OR REPLACE FUNCTION notify_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('events', json_build_object(
    'type', 'user.created', 'userId', NEW.id, 'email', NEW.email
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_user
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION notify_new_user();
```

```javascript
// Consumidor Node.js
import pg from 'pg'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
async function listenToEvents() {
  const client = await pool.connect()
  await client.query('LISTEN events')
  client.on('notification', (msg) => handleEvent(JSON.parse(msg.payload)))
  setInterval(async () => await client.query('SELECT 1'), 30000) // keep alive
}
```

**Limitaciones:** scope solo en mismo cluster, no persistente (evento se pierde si nadie escucha), payload máximo 8000 bytes, buffer en memoria del backend.

### Supabase Realtime v2 (Go server, pgoutput)

| Tipo | Descripción | Persistencia | Autorización |
|------|-------------|-------------|--------------|
| Broadcast | Mensajes efímeros entre clientes (chat, cursor) | No | RLS opcional |
| Presence | Estado sincronizado de clientes conectados | En memoria | RLS |
| Postgres Changes | CDC de tablas PostgreSQL vía logical replication | No (streaming) | RLS por row |

```javascript
// Broadcast
const channel = supabase.channel('room-1', {
  config: { broadcast: { self: true, ack: true }, presence: { key: 'user-id' } }
})
channel.on('broadcast', { event: 'cursor' }, (payload) => console.log(payload))
channel.send({ type: 'broadcast', event: 'cursor', payload: { x: 100, y: 200 } })

// Presence
channel.on('presence', { event: 'sync' }, () => console.log('Online:', Object.keys(channel.presenceState()).length))

// Postgres Changes (CDC)
supabase.channel('db-changes').on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
  (payload) => console.log('New message:', payload.new)
).subscribe()
```

**RLS en Realtime:** Para que un cliente reciba cambios, debe tener permiso SELECT. Habilitar con `ALTER PUBLICATION supabase_realtime ADD TABLE messages`.

### CQRS y Event Sourcing

```
Client → Command (POST /orders) → Command Handler → Write DB (normalized)
Client → Query (GET /orders)    → Query Handler  → Read DB (denormalized)
```

```javascript
// COMMAND — escribe en DB normalizada
async function createOrder(command) {
  const order = await db.order.create({ data: { userId: command.userId, status: 'PENDING' } })
  await pgNotify('events', JSON.stringify({ type: 'order.created', orderId: order.id }))
  return order
}

// QUERY — lee de vista desnormalizada
async function getOrderSummary(userId) {
  return db.orderSummary.findUnique({ where: { userId }, select: { totalOrders: true, totalSpent: true } })
}
```

**Event Sourcing:** Almacenar secuencia de eventos como fuente de verdad. Estado actual = fold(Event[]).

### Outbox Pattern (Consistencia Transaccional)

```javascript
async function createOrder(command) {
  const { orderId } = await db.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { ... } })
    await tx.outboxMessage.create({
      data: { type: 'order.created', aggregateId: order.id, payload: {...}, status: 'PENDING' }
    })
    return { orderId: order.id }
  })
}

// Procesador cada 5s
async function processOutbox() {
  const messages = await db.outboxMessage.findMany({ where: { status: 'PENDING' }, take: 100 })
  for (const msg of messages) {
    try {
      await pgNotify('events', JSON.stringify({ type: msg.type, data: msg.payload }))
      await db.outboxMessage.update({ where: { id: msg.id }, data: { status: 'SENT' } })
    } catch (error) {
      await db.outboxMessage.update({ where: { id: msg.id }, data: { status: 'FAILED', retryCount: { increment: 1 } } })
      if (msg.retryCount >= 5) await db.deadLetterQueue.create({ data: { ...msg } })
    }
  }
}
setInterval(processOutbox, 5000)
```

### Prisma Pulse (CDC 2024+)

```javascript
import { PrismaClient } from '@prisma/client'
import { withPulse } from '@prisma/extension-pulse'

const prisma = new PrismaClient().$extends(withPulse({ apiKey: process.env.PULSE_API_KEY }))

async function watchOrders() {
  const stream = await prisma.order.stream({ create: true, update: true, delete: true })
  for await (const event of stream) {
    if (event.action === 'create') await updateOrderSummary(event.created.userId)
  }
}
```

Pulse se conecta a logical replication de PostgreSQL y transforma cambios WAL en eventos. Reemplaza outbox processor y sincronizadores custom para vistas CQRS.

### Tabla Comparativa de Tecnologías

| Característica | LISTEN/NOTIFY | Supabase Realtime | Redis Pub/Sub | Kafka |
|---------------|---------------|-------------------|---------------|-------|
| Persistencia | No | No | No | Sí (configurable) |
| Latencia | <1ms | <10ms | <1ms | <10ms |
| Escalabilidad | Cluster PG | Horizontal (Go) | Horizontal | Horizontal (partitions) |
| Payload max | 8KB | ~1MB | ~512MB | ~1MB |
| Orden garantizado | Por canal/backend | No | No | Sí (por partición) |
| Replays históricos | No | No | No | Sí (offset reset) |
| Ideal para | Cache invalidation, notif. ligeras | Chat, presence, colab streaming | Task queues, pub/sub liviano | Event sourcing, audit logs, ETL |

### Cuándo usar cada uno

- **LISTEN/NOTIFY:** notificaciones entre microservicios que comparten PostgreSQL, invalidación de caché.
- **Supabase Realtime:** chat, cursor multiplayer, presence, CDC con RLS granulado. Cuando ya usas Supabase.
- **Redis Pub/Sub:** pub/sub liviano, colas de tareas, rate limiting. No persistencia ni replays.
- **Kafka:** event sourcing, streaming masivo, pipelines ETL, audit logs, reprocesamiento histórico.

### Patrones Avanzados

- **Dead Letter Queue (DLQ):** Eventos que fallan ≥5 reintentos se mueven a DLQ para inspección manual.
- **Event Versioning:** Upcasters transforman `v1` → `v2` al leer. Permite evolución de schema sin breaking changes.
- **Sagas:** Orquestación de multi-step con compensación. `createOrderSaga()` ejecuta pasos + compensa en orden inverso si falla.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with event-driven-tiempo-real)*

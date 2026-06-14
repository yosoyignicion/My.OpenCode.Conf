---
name: http3-quic
description: "HTTP/3 is the third major version of HTTP, running over QUIC (Quick UDP Internet Connections) instead of TCP"
---
# HTTP/3 & QUIC Protocol

## Semantic Triggers
```
http3 connection establishment, quic 0-rtt handshake, multiplexed streams without head-of-line blocking, http3 vs http2 performance, quic congestion control and loss detection
```

---

## 1. Definición Teórica

HTTP/3 is the third major version of HTTP, running over QUIC (Quick UDP Internet Connections) instead of TCP. It solves head-of-line blocking inherent in HTTP/2 by multiplexing independent streams over a single QUIC connection. Built-in TLS 1.3 encryption and 0-RTT connection establishment reduce latency significantly. Its key distinction is transport-level connection migration — sessions survive network changes (Wi-Fi → cellular) without reconnection.

---

## 2. Implementación de Referencia

**aioquic** (Python) — the reference QUIC implementation from the QUIC working group chair. Supports HTTP/3, HTTP/0-RTT, and all QUIC transport features. For production HTTP/3 termination, use **Caddy** (built-in) or **nginx 1.25+** with QUIC support.

### Ejemplo Práctico Avanzado

```python
import asyncio
import ssl
from aioquic.asyncio.client import connect
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import StreamDataReceived, HandshakeCompleted

class HTTP3Client(QuicConnectionProtocol):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.response_data = b""

    def quic_event_received(self, event):
        if isinstance(event, HandshakeCompleted):
            print(f"Handshake completed, server: {self._quic.host}")
        elif isinstance(event, StreamDataReceived):
            self.response_data += event.data
            if event.end_stream:
                print(f"Response: {self.response_data.decode()}")

async def main():
    config = QuicConfiguration(is_client=True, alpn_protocols=["h3"])
    config.load_verify_locations("/etc/ssl/certs/ca-certificates.crt")
    config.verify_mode = ssl.CERT_REQUIRED
    async with connect("cloudflare.com", 443, configuration=config, create_protocol=HTTP3Client) as client:
        client._quic.send_stream_data(client._quic.get_next_available_stream_id(), b"GET / HTTP/3\r\n\r\n", end_stream=True)
        await asyncio.sleep(2)

asyncio.run(main())
```

**Fuente oficial:** https://github.com/aiortc/aioquic

### Alternativa de Implementación Específica

For Rust projects, **quiche** (by Cloudflare) provides a C/ Rust library for QUIC and HTTP/3. It powers Cloudflare's own HTTP/3 infrastructure. For Go, use **quic-go** which powers the Caddy web server.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Latency-sensitive apps (real-time, video, IoT), mobile clients with frequent network switches, or when multiplexing many streams over single connection |
| **Cuándo evitar** | Internal DC traffic with low latency and no mobility needs; network middleboxes that block UDP |
| **Alternativas** | HTTP/2 + TCP for stable environments (mature, no UDP issues). WebSocket for bidirectional streaming with simpler handshake |
| **Coste/Complejidad** | Moderate — UDP tuning, larger deployment surface, fewer debugging tools than TCP. CDN termination hides complexity |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: 0-RTT replay attacks

**¿Qué ocasionó el error?**
Clients sending 0-RTT early data get replayed if the server receives the same packet multiple times (network duplication, retransmission). Idempotent safety is not automatic — a 0-RTT POST could process a payment twice.

**¿Cómo se solucionó?**
Reject 0-RTT early data for non-idempotent methods. Configure the server to limit 0-RTT to GET/HEAD/OPTIONS. For POST, require at least 1-RTT handshake by returning `425 (Too Early)`.

**¿Por qué funciona esta técnica?**
QUIC provides the `early_data` extension — the server can reject early data per-request. The client then falls back to a full handshake automatically.

### Caso: QUIC blocked by corporate firewall

**¿Qué ocasionó el error?**
Enterprise networks and some mobile carriers block UDP entirely, causing QUIC connection attempts to timeout. No fallback means no connectivity.

**¿Cómo se solucionó?**
Implement QUIC connection timeout (3s) with automatic fallback to HTTP/2 over TLS 1.3 + TCP. Use `Alt-Svc: h3=":443"; ma=3600` header to advertise HTTP/3 only after successful QUIC connection.

**¿Por qué funciona esta técnica?**
The Alt-Svc header lets servers progressively opt-in clients. Clients remember the alternative service for `ma` seconds but retry TCP if QUIC fails, ensuring seamless degradation.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "http3", "quic protocol", "0-rtt", "connection migration"
- **Prioridad de carga:** Media — especializado, solo relevante para transfer layer optimization
- **Dependencias:** `grpc-protobuf`, `load-balancing-algorithms-l4-l7`

### Tool Integration

```json
{
  "tool_name": "http3-quic",
  "description": "HTTP/3 and QUIC protocol implementation, deployment, and optimization",
  "triggers": ["http3", "quic", "0-rtt", "connection migration", "udp transport"],
  "context_hint": "Load when user asks about modern HTTP protocol, low-latency transport, or connection migration patterns",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre HTTP/3 o QUIC, carga el skill http3-quic y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos
de aioquic o quiche sobre teoría del protocolo.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test HTTP/3 support
curl --http3 -I https://cloudflare.com

# QUIC connection info with qlog
quiche-client --no-verify https://quic.rocks:4433/

# Capture QUIC traffic (Wireshark)
tshark -Y "quic" -i eth0

# Server advertisement check
curl -sI https://example.com | grep -i alt-svc
```

### GUI / Web

- **Wireshark** — FULL QUIC dissection, connection migration visualization, 0-RTT analysis
- **Chrome DevTools** → Network tab → Protocol column shows `h3` for HTTP/3 connections
- **https://quic.rocks** — interactive QUIC test page showing connection metrics
- **Cloudflare Dashboard** — HTTP/3 usage analytics and adoption metrics

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test QUIC | `curl --http3 -I <url>` | DevTools → Protocol column |
| QUIC stats | `ss -u -i` | Wireshark → Statistics → QUIC |

---

## 7. Cheatsheet Rápido

```bash
# ALPN negotiation: h3 → h2 → http/1.1
# Alt-Svc header for HTTP/3 advertisement
curl --http3 -I https://example.com

# Connection migration: QUIC survives IP change
# 0-RTT: cached session tickets, watch replay risk

# nginx QUIC config
server {
    listen 443 quic reuseport;
    listen 443 ssl;
    ssl_protocols TLSv1.3;
    add_header Alt-Svc 'h3=":443"; ma=86400';
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `grpc-protobuf` | complementario — HTTP/2 as transport base | Sí |
| `load-balancing-algorithms-l4-l7` | complementario — QUIC needs L4 UDP load balancing | Sí |
| `service-mesh-envoy-sidecars` | complementario — Envoy supports HTTP/3 termination | No |
| `data-encryption-in-transit-mtls` | superconjunto — TLS 1.3 in QUIC | No |

---

## 9. Metadatos del Skill

```yaml
---
id: http3-quic
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [http3, quic, udp, transport, tls13, connection-migration, 0-rtt]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: rest-api-integration-client
description: "La integración cliente HTTP consiste en establecer una comunicación eficiente y robusta con APIs REST desde aplicaciones backend o frontend"
---
# REST API Integration (Client)

## Semantic Triggers
```
HTTP client patterns httpx requests, session reuse connection pooling, retry with exponential backoff HTTPStatusError TransportError, streaming large responses iter_bytes, Bearer token auth OAuth2 client credentials, timeout configuration connect read write
```

---

## 1. Definición Teórica

La integración cliente HTTP consiste en establecer una comunicación eficiente y robusta con APIs REST desde aplicaciones backend o frontend. El patrón fundamental es crear una sesión/cliente HTTP reutilizable por servicio, configurando timeouts explícitos (connect, read, write), connection pooling para reutilizar conexiones TCP, y reintentos con backoff exponencial para manejar fallos transitorios. La biblioteca recomendada es `httpx` (sucesor moderno de `requests`) por su soporte nativo de async/await, HTTP/2, y tipado. El manejo de autenticación (Bearer tokens, OAuth2, API keys) se integra a nivel de cliente, no por request.

---

## 2. Implementación de Referencia

Python 3.12+ con `httpx` como cliente HTTP moderno. `httpx` reemplaza a `requests` con soporte async, HTTP/2, connection pooling avanzado, y tipado completo. Se crea un cliente por servicio externo.

### Ejemplo Práctico Avanzado

```python
import httpx
import time
from httpx import HTTPStatusError, TransportError, Timeout, Limits, Client
from typing import Any
import asyncio

# ============ Cliente reutilizable por servicio ============
class ApiClient:
    """Cliente HTTP reutilizable con retry, auth, y timeouts."""

    def __init__(self, base_url: str, token: str | None = None):
        self.client = Client(
            base_url=base_url,
            timeout=Timeout(30.0, connect=5.0, read=30.0, write=10.0),
            limits=Limits(max_keepalive_connections=10, max_connections=100),
            headers={
                "User-Agent": "MyApp/1.0",
                "Accept": "application/json",
            },
            http2=True,  # HTTP/2 prioritario
        )
        if token:
            self.client.headers["Authorization"] = f"Bearer {token}"

    def _should_retry(self, status_code: int) -> bool:
        """Determina si un código de estado merece reintento."""
        return status_code in {429, 500, 502, 503, 504}

    def _retry_delay(self, attempt: int, max_delay: float = 30.0) -> float:
        """Backoff exponencial con jitter."""
        delay = min(0.5 * (2 ** attempt), max_delay)
        jitter = delay * 0.1 * (time.time() % 1)  # ±10% jitter
        return delay + jitter

    def request(
        self,
        method: str,
        path: str,
        max_retries: int = 3,
        **kwargs: Any,
    ) -> httpx.Response:
        """
        Request con retry automático en fallos transientes.
        """
        last_exception = None
        for attempt in range(max_retries):
            try:
                response = self.client.request(method, path, **kwargs)
                if response.is_success:
                    return response
                if response.status_code == 422:
                    # Error de validación — no reintentar
                    response.raise_for_status()
                if self._should_retry(response.status_code) and attempt < max_retries - 1:
                    delay = self._retry_delay(attempt)
                    time.sleep(delay)
                    continue
                response.raise_for_status()
            except (HTTPStatusError, TransportError) as e:
                last_exception = e
                if attempt < max_retries - 1:
                    delay = self._retry_delay(attempt)
                    time.sleep(delay)
                    continue
                raise
        raise last_exception  # type: ignore

    def get(self, path: str, **kwargs: Any) -> httpx.Response:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, json: dict | None = None, **kwargs: Any) -> httpx.Response:
        return self.request("POST", path, json=json, **kwargs)

    def close(self) -> None:
        self.client.close()

# ============ Streaming ============
def stream_large_response(client: Client, url: str):
    """Itera sobre chunks de una respuesta grande sin cargar todo en memoria."""
    with client.stream("GET", url) as response:
        for chunk in response.iter_bytes(chunk_size=8192):
            yield chunk

# ============ Async version ============
class AsyncApiClient:
    def __init__(self, base_url: str, token: str | None = None):
        self.client = httpx.AsyncClient(
            base_url=base_url,
            timeout=Timeout(30.0, connect=5.0),
            limits=Limits(max_keepalive=10, max_connections=100),
            http2=True,
        )
        if token:
            self.client.headers["Authorization"] = f"Bearer {token}"

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        for attempt in range(3):
            try:
                response = await self.client.request(method, path, **kwargs)
                response.raise_for_status()
                return response
            except (HTTPStatusError, TransportError) as e:
                if attempt < 2 and response.status_code in {429, 500, 502, 503, 504}:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                    continue
                raise
        raise

    async def close(self) -> None:
        await self.client.aclose()


# ============ Uso ============
client = ApiClient("https://api.example.com", token="my-token")

# GET con paginación
def fetch_all_posts() -> list[dict]:
    posts = []
    page = 1
    while True:
        resp = client.get(f"/posts?page={page}&per_page=50")
        data = resp.json()
        posts.extend(data["items"])
        if page >= data["total_pages"]:
            break
        page += 1
    return posts

# POST con validación de respuesta
new_post = client.post("/posts", json={"title": "Hello", "content": "World"})
assert new_post.status_code == 201
created = new_post.json()
print(f"Created post {created['id']}")

client.close()
```

**Fuente oficial:** https://www.python-httpx.org/

### Alternativa de Implementación Específica

**Axios (JavaScript/TypeScript)** para clientes HTTP en frontend o Node.js. Axios es el estándar en el ecosistema JS con interceptors, cancelación de requests, y transformación automática de JSON.

```typescript
import axios, { AxiosInstance, AxiosError } from "axios"

const api: AxiosInstance = axios.create({
  baseURL: "https://api.example.com",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
})

// Interceptor de auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor de retry
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Refresh token logic
    }
    if (error.response?.status && [429, 500, 502, 503].includes(error.response.status)) {
      // Retry logic
    }
    return Promise.reject(error)
  }
)

// Tipado
interface Post { id: number; title: string; content: string }
const { data } = await api.get<Post[]>("/posts")
```

**Fuente oficial:** https://axios-http.com/docs/intro

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier integración con APIs REST externas; microservicios; clientes de datos; scraping |
| **Cuándo evitar** | Comunicación entre servicios en el mismo proceso (usa RPC/functions directas); APIs GraphQL (usa cliente GraphQL específico) |
| **Alternativas** | `aiohttp` (async-only, más thin que httpx); `requests` (síncrono, legacy); Axios (JS/TS, estándar frontend); `urllib3` (bajo nivel) |
| **Coste/Complejidad** | Bajo — el patrón es simple. La complejidad está en el manejo de errores (retry, circuit breaker), rate limiting, y caché. httpx reduce la complejidad con APIs modernas |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: `httpx.ConnectError` sin conexión aparente

**¿Qué ocasionó el error?**
Timeout de conexión porque el servidor no responde en el tiempo configurado. El valor por defecto de httpx es 5s para connect, que puede ser insuficiente en redes lentas.

**¿Cómo se solucionó?**
Aumentar el timeout de conexión y añadir retry:

```python
client = httpx.Client(
    timeout=Timeout(60.0, connect=10.0),  # 10s para connect
)
```

**¿Por qué funciona esta técnica?**
Connect timeout es el tiempo máximo para establecer el handshake TCP/TLS. Valores bajos causan fallos en redes lentas. 10s es un balance razonable.

### Caso: Rate limiting (429) no se maneja automáticamente

**¿Qué ocasionó el error?**
La API retorna 429 Too Many Requests, pero el cliente no espera antes de reintentar, causando más rechazos.

**¿Cómo se solucionó?**
Leer el header `Retry-After` y usarlo como delay:

```python
def request_with_rate_limit(self, method: str, path: str, **kwargs):
    for attempt in range(3):
        response = self.client.request(method, path, **kwargs)
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 5))
            time.sleep(retry_after)
            continue
        response.raise_for_status()
        return response
```

**¿Por qué funciona esta técnica?**
El header `Retry-After` indica el tiempo exacto que el servidor recomienda esperar. Ignorarlo empeora la situación. Usarlo respeta las políticas de rate limit del servidor.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "http client", "api integration", "httpx", "rest client", "fetch api", "axios" en la consulta
- **Prioridad de carga:** Media — necesario cuando el usuario integra APIs externas
- **Dependencias:** Ninguna directa

### Tool Integration

```json
{
  "tool_name": "rest-api-integration-client",
  "description": "Guía de integración HTTP cliente: httpx, session management, retry, streaming, auth, timeouts",
  "triggers": ["http client", "api", "httpx", "axios", "rest", "fetch"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de cliente httpx con retry. FAQ para rate limiting y timeouts.",
  "output_format": "markdown",
  "max_tokens": 2600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre integración con APIs REST, carga el skill rest-api-integration-client.
httpx es la recomendación para Python, Axios para JS/TS.
Crea un cliente por servicio con timeouts explícitos y retry con backoff.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar API desde terminal
curl -X GET https://api.example.com/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -w "\nHTTP %{http_code}, Time: %{time_total}s\n"

# httpx CLI (instalar httpx incluye CLI)
httpx https://api.example.com/posts

# httpie — alternativa moderna a curl
http GET https://api.example.com/posts Authorization:"Bearer $TOKEN"

# Ver latencia de API
curl -o /dev/null -s -w "Connect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  https://api.example.com/health
```

### GUI / Web

- **Postman:** Cliente GUI completo para probar APIs: colecciones, variables de entorno, tests, generación de código
- **HTTPie (Desktop):** GUI para el CLI httpie, con syntax highlighting y autocompletado
- **Insomnia:** Cliente REST/GraphQL con diseño de requests, environment variables, y generación de SDK
- **REST Client (VS Code extension):** Enviar requests HTTP directamente desde archivos `.http` o `.rest`
- **Thunder Client (VS Code):** Cliente REST liviano integrado en el editor

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Enviar request | `curl <url>` | `Ctrl+Enter` (VS Code REST Client) |
| Guardar colección | — | Postman → `Ctrl+S` |
| Generar código | — | Postman → Code snippet |
| Probar endpoint | `http GET /api` | Insomnia → Send |

---

## 7. Cheatsheet Rápido

```python
# httpx — patrón mínimo
import httpx

c = httpx.Client(
    base_url="https://api.example.com",
    timeout=httpx.Timeout(30, connect=5),
    limits=httpx.Limits(max_keepalive=10, max_connections=100),
)
c.headers["Authorization"] = "Bearer token123"

resp = c.get("/posts", params={"page": 1})
resp.raise_for_status()
data = resp.json()

# Async
async with httpx.AsyncClient() as ac:
    r = await ac.get("https://api.example.com/data")
```

```typescript
// Axios — patrón mínimo
import axios from "axios"
const api = axios.create({ baseURL: "https://api.example.com", timeout: 30000 })
api.interceptors.request.use(cfg => { cfg.headers.Authorization = `Bearer ${token}`; return cfg })
const { data } = await api.get("/posts")
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-02-next-js-app-router` | Complementario | No |
| `07-09-react-native-mobile` | Complementario | No |
| `07-04-typescript-type-system` | Complementario | Sí |
| `06-10-message-brokers-kafka-internals` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: rest-api-integration-client
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/http-client
tags: [http, api, rest, client, httpx, axios, integration, frontend]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

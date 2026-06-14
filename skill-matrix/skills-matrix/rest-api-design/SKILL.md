---
name: rest-api-design
description: "REST API Design follows resource-oriented URLs, standard HTTP methods, and consistent error responses"
---
# REST API Design

## Semantic Triggers
```
rest api diseño endpoints, api paginación offset cursor, rest api status codes, api versioning hateoas, rest api idempotency key, api rate limiting headers
```

---

## 1. Definición Teórica

REST API Design follows resource-oriented URLs, standard HTTP methods, and consistent error responses. Resources are plural nouns (`/users`), HTTP methods are used semantically (GET for read, POST for create, PUT for full update, PATCH for partial, DELETE for removal). Standard status codes communicate results clearly. Pagination uses keyset/cursor for large datasets, offset/limit for simple cases. Consistent error formats (RFC 9457) and conditional request headers (ETag, If-Modified-Since) improve reliability. Rate limiting headers inform clients of usage limits.

---

## 2. Implementación de Referencia

TypeScript with Express implementing a RESTful API following best practices for pagination, error handling, filtering, and versioning.

### Ejemplo Práctico Avanzado

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// ===== PAGINATION (Cursor-based) =====
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

async function getUsers(req: express.Request, res: express.Response) {
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  let query = db.selectFrom('users').orderBy('id', 'asc').limit(limit + 1);

  if (cursor) {
    query = query.where('id', '>', cursor);
  }

  const users = await query.execute();
  const hasMore = users.length > limit;

  if (hasMore) users.pop();  // remove extra item

  res.json({
    data: users,
    meta: {
      nextCursor: hasMore ? users[users.length - 1].id : undefined,
      hasMore,
      total: undefined,  // omit for large datasets
    },
  } satisfies PaginatedResponse<typeof users[0]>);
}

// ===== FILTERING =====
// Pattern: ?filter[field]=value, compound: ?filter[status]=active&filter[role][in]=admin,user
function parseFilters(query: Record<string, string>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^filter\[(.+)]$/);
    if (match) {
      const field = match[1];
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        filters[parent] = { ...(filters[parent] as object || {}), [child]: value };
      } else {
        // Handle operators: field[gte]=value, field[in]=a,b
        const operatorMatch = field.match(/^(\w+)\[(gte|lte|gt|lt|in|like)]$/);
        if (operatorMatch) {
          filters[operatorMatch[1]] = { [operatorMatch[2]]: operatorMatch[1] === 'in' ? value.split(',') : value };
        } else {
          filters[field] = value;
        }
      }
    }
  }
  return filters;
}

// ===== ERROR RESPONSE (RFC 9457) =====
interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Array<{ source: { pointer: string }; detail: string }>;
}

function problemResponse(res: express.Response, status: number, detail: ProblemDetail) {
  return res.status(status).json(detail);
}

// ===== RATE LIMITING =====
import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
  message: { type: '/errors/rate-limit', title: 'Too Many Requests', status: 429, detail: 'Rate limit exceeded' },
});

app.use(limiter);

// ===== CONDITIONAL REQUESTS =====
app.get('/users/:id', async (req, res) => {
  const user = await db.selectFrom('users').where('id', '=', req.params.id).executeTakeFirst();
  if (!user) return res.status(404).json({ type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'User not found' });

  const etag = `"${crypto.createHash('md5').update(JSON.stringify(user)).digest('hex')}"`;

  // Check If-None-Match
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', user.updated_at.toUTCString());
  res.json({ data: user });
});

// ===== COMPLETE ENDPOINT =====
app.get('/api/v1/users', async (req, res) => {
  try {
    const filters = parseFilters(req.query as Record<string, string>);
    const sort = (req.query.sort as string) || '-created_at';
    const sortField = sort.replace(/^-/, '');
    const sortDir = sort.startsWith('-') ? 'desc' : 'asc';

    let query = db.selectFrom('users').selectAll();
    for (const [field, value] of Object.entries(filters)) {
      if (typeof value === 'object') {
        const op = value as Record<string, unknown>;
        if (op.gte) query = query.where(field, '>=', op.gte);
        if (op.in) query = query.where(field, 'in', op.in as string[]);
      } else {
        query = query.where(field, '=', value);
      }
    }
    query = query.orderBy(sortField, sortDir as any);

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    query = query.limit(limit).offset(offset);

    const [data, total] = await Promise.all([
      query.execute(),
      db.selectFrom('users').select(db.fn.countAll<number>().as('count')).executeTakeFirstOrThrow(),
    ]);

    res.json({
      data,
      meta: { total: total.count, offset, limit, count: data.length },
      links: {
        self: `/api/v1/users?offset=${offset}&limit=${limit}`,
        next: offset + limit < total.count ? `/api/v1/users?offset=${offset + limit}&limit=${limit}` : null,
        prev: offset > 0 ? `/api/v1/users?offset=${Math.max(0, offset - limit)}&limit=${limit}` : null,
      },
    });
  } catch (err) {
    problemResponse(res, 500, {
      type: '/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
    });
  }
});
```

**Fuente oficial:** https://www.rfc-editor.org/rfc/rfc9457

### Alternativa de Implementación Específica

Python with FastAPI for automatic OpenAPI docs, Pydantic validation, and built-in pagination utilities.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs públicas, sistemas con clientes heterogéneos, integración con terceros, arquitecturas REST-first |
| **Cuándo evitar** | APIs internas con un solo cliente, sistemas en tiempo real (WebSocket mejor), cuando GraphQL es más adecuado |
| **Alternativas** | GraphQL (cliente decide campos), gRPC (tipado fuerte, streaming), RPC (simplicidad, menos estándar) |
| **Coste/Complejidad** | Bajo/medio. REST es simple de implementar. Paginación cursors vs offset: offset es más simple, cursor escala mejor |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Offset pagination inconsistency

**¿Qué ocasionó el error?**
Con offset pagination, inserts concurrentes causaban que items aparecieran duplicados o se saltaran entre páginas.

**¿Cómo se solucionó?**
```typescript
// Keyset/cursor pagination — stable across inserts
async function cursorPaginate(cursor?: string, limit = 20) {
  const query = db.selectFrom('users')
    .orderBy('id', 'asc')
    .limit(limit + 1);

  if (cursor) query.where('id', '>', cursor);

  const results = await query.execute();
  const hasMore = results.length > limit;
  if (hasMore) results.pop();

  return {
    data: results,
    nextCursor: hasMore ? results[results.length - 1].id : null,
  };
}
```

**¿Por qué funciona esta técnica?**
Cursor-based pagination usa un campo estable (ID) como marcador, evitando problemas de offset con datos cambiantes.

### Caso: 422 vs 400 para validación

**¿Qué ocasionó el error?**
La API usaba 400 para errores de validación, mezclando errores de cliente (malformed request) con errores de validación de negocio.

**¿Cómo se solucionó?**
```typescript
// Diferenciar status codes según el tipo de error
400 // Bad Request: JSON malformed, missing required headers
401 // Unauthorized: missing/invalid auth
403 // Forbidden: authenticated but not allowed
404 // Not Found: resource doesn't exist
409 // Conflict: duplicate, version conflict
422 // Unprocessable Entity: validation errors (RFC 9457)
429 // Too Many Requests: rate limit exceeded
```

**¿Por qué funciona esta técnica?**
Status codes específicos permiten a los clientes manejar cada error adecuadamente sin parsear el body.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "rest api", "api design", "pagination", "status codes", "rfc 9457", "error response"
- **Prioridad de carga:** Alta — skill fundamental para desarrollo web
- **Dependencias:** `02-arquitectura-diseno/32-error-handling-patterns`, `02-arquitectura-diseno/27-api-versioning-evolution-strategies`

### Tool Integration

```json
{
  "tool_name": "rest-api-design",
  "description": "Implements REST API best practices: resource-oriented URLs, pagination, filtering, sorting, error handling (RFC 9457), rate limiting",
  "triggers": ["rest api", "api design", "pagination", "rfc 9457", "endpoint", "http methods"],
  "context_hint": "Inject when user asks about REST API design or HTTP API patterns",
  "output_format": "code examples with pagination, filtering, error responses",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre diseño de APIs REST, carga el skill rest-api-design y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test pagination
curl -s "http://localhost:3000/api/v1/users?limit=2&offset=0" | jq '.'
curl -s "http://localhost:3000/api/v1/users?cursor=abc" | jq '.'

# Test filtering
curl -s "http://localhost:3000/api/v1/users?filter[status]=active" | jq '.'

# Test error response
curl -s http://localhost:3000/api/v1/users/999999 | jq '.'
```

### GUI / Web

- **Swagger UI**: Documentación interactiva de APIs REST
- **Postman**: Testing y colecciones de endpoints
- **Insomnia**: Cliente REST con soporte de GraphQL

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test endpoint | `curl -s http://localhost:3000/{path}` | Postman → Send |
| Check response headers | `curl -sI http://localhost:3000/{path}` | Postman → Headers |

---

## 7. Cheatsheet Rápido

```http
GET /api/v1/users?filter[status]=active&sort=-created_at&limit=20&cursor=abc
Response: { data: [...], meta: { nextCursor, hasMore, total? }, links: { self, next, prev } }
Error (RFC 9457): { type, title, status, detail, errors?: [{ source: { pointer }, detail }] }
Status: 200 GET, 201 POST, 204 DELETE, 400/401/403/404/409/422/429/500
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/32-error-handling-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/27-api-versioning-evolution-strategies` | Complementario | Sí |
| `02-arquitectura-diseno/33-data-serialization-formats` | Complementario | No |
| `07-frontend-web-fullstack/12-rest-api-integration-client` | Complementario | Sí |
| `06-seguridad-sdlc/22-auth-jwt-oauth-detailed` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: rest-api-design
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/31-rest-api-design
tags: [rest-api, api-design, pagination, rfc-9457, http-methods, filtering, rate-limiting]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: api-versioning-evolution-strategies
description: "API versioning manages change without breaking existing clients"
---
# API Versioning & Evolution Strategies

## Semantic Triggers
```
api versioning url prefix, api versioning header accept, evolución api backward compatible, api breaking change estrategia, deprecation api sunset header, api versioning media type
```

---

## 1. Definición Teórica

API versioning manages change without breaking existing clients. Strategies include: URL prefix (`/v1/`, `/v2/`), Header (`Accept: application/vnd.api+json; version=2`), Query parameter (`?api-version=2`), and Media type versioning. Best practice favors header-based versioning for cleaner URLs but URL prefix for simplicity and cacheability. Evolution with backward compatibility (add-only fields, nullable expansions, default values) is preferred over version bumps when possible. Deprecation uses Sunset and Deprecation headers to notify clients.

---

## 2. Implementación de Referencia

TypeScript with Express implementing URL prefix and header-based versioning, deprecation headers, and backward-compatible evolution.

### Ejemplo Práctico Avanzado

```typescript
import express from 'express';

// ===== URL PREFIX VERSIONING =====
// Simple, cache-friendly, easy to route

interface UserV1 {
  id: string;
  name: string;
}

interface UserV2 {
  id: string;
  name: string;
  email: string;  // added in v2
  role: string;    // added in v2
}

const v1Router = express.Router();
const v2Router = express.Router();

v1Router.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Alice',
  } satisfies UserV1);
});

v2Router.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
  } satisfies UserV2);
});

const app = express();
app.use('/v1', v1Router);
app.use('/v2', v2Router);

// ===== HEADER-BASED VERSIONING =====
// Cleaner URLs, standard (Accept header), client-driven

type VersionedRequest = express.Request & { apiVersion: number };

function headerVersioning(req: VersionedRequest, res: express.Response, next: express.NextFunction) {
  const accept = req.headers['accept'] || '';
  const match = accept.match(/version=(\d+)/);
  req.apiVersion = match ? parseInt(match[1]) : 1;
  next();
}

app.get('/users/:id', headerVersioning, (req: VersionedRequest, res) => {
  if (req.apiVersion >= 2) {
    return res.json({ id: req.params.id, name: 'Alice', email: 'alice@example.com' });
  }
  res.json({ id: req.params.id, name: 'Alice' });
});

// ===== BACKWARD-COMPATIBLE EVOLUTION =====
// Prefer additive changes over version bumps

interface UserResponse {
  id: string;
  name: string;
  // New fields should be optional (nullable)
  email?: string;     // added in v2, optional for backward compat
  role?: string;      // added in v2, optional
  metadata?: Record<string, unknown>;  // extensible container
}

class UserController {
  async getUser(id: string, version: number): Promise<UserResponse> {
    const user = await this.userRepo.findById(id);

    const response: UserResponse = {
      id: user.id,
      name: user.name,
    };

    // Extend response based on version
    if (version >= 2) {
      response.email = user.email;
      response.role = user.role;
    }

    // Future-proof: always include metadata container
    response.metadata = { requestedVersion: version };

    return response;
  }
}

// ===== DEPRECATION HEADERS =====
function deprecationMiddleware(deprecatedSince: Date, sunsetDate: Date, migrationGuide: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Deprecation', deprecatedSince.toISOString());
    res.setHeader('Sunset', sunsetDate.toUTCString());
    res.setHeader('Link', `<${migrationGuide}>; rel="deprecation"`);
    next();
  };
}

// v1 endpoint with deprecation notice
const v1DeprecationDate = new Date('2025-01-01');
const v1SunsetDate = new Date('2026-01-01');

app.use('/v1', deprecationMiddleware(v1DeprecationDate, v1SunsetDate, '/docs/migration-v1-to-v2'));
app.use('/v1', v1Router);

// ===== VERSION NEGOTIATION =====
// Advanced: content negotiation with media types

function acceptVersionMiddleware(allowedVersions: number[]) {
  return (req: VersionedRequest, res: express.Response, next: express.NextFunction) => {
    const accept = req.headers['accept'] || '';
    const match = accept.match(/application\/vnd\.myapi\.v(\d+)\+json/);

    if (match) {
      const requested = parseInt(match[1]);
      if (allowedVersions.includes(requested)) {
        req.apiVersion = requested;
        return next();
      }
    }

    req.apiVersion = Math.max(...allowedVersions);  // default to latest
    next();
  };
}

// ===== API CHANGE LOG =====
// Document breaking changes per version
const apiChangelog = {
  1: { changes: [], breaking: false },
  2: {
    changes: [
      { type: 'added', path: '/users/:id/email', description: 'Email field added' },
      { type: 'added', path: '/users/:id/role', description: 'Role field added' },
    ],
    breaking: false,
  },
  3: {
    changes: [
      { type: 'removed', path: '/v1/users', description: 'Removed legacy endpoint' },
      { type: 'changed', path: '/users/:id', description: 'name field split to firstName/lastName' },
    ],
    breaking: true,
  },
};
```

**Fuente oficial:** https://stripe.com/blog/api-versioning

### Alternativa de Implementación Específica

Python with FastAPI versioning using APIRouter prefix and dependency injection for header-based version resolution.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs públicas con múltiples clientes, sistemas que evolucionan rápidamente, contratos formales con partners |
| **Cuándo evitar** | APIs internas con control sobre todos los clientes, prototipos, sistemas donde solo hay un consumidor |
| **Alternativas** | No versioning (siempre backward compat), GraphQL (cliente específica campos), Evolución additive (nunca breaking changes) |
| **Coste/Complejidad** | Medio. Mantener N versiones simultáneas es costoso. Header versioning es más complejo que URL prefix. Deprecation headers ayudan a migrar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Versiones URL que complican el routing

**¿Qué ocasionó el error?**
Múltiples versiones de URL causaban duplicación de rutas y lógica de routing compleja en el gateway.

**¿Cómo se solucionó?**
```typescript
// Version resolver middleware — single router
function versionRouter(versions: Record<number, express.Router>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const version = parseInt(req.path.split('/')[1]?.replace('v', '') || '1');
    req.url = req.url.replace(/\/v\d+/, '');  // strip version prefix
    const router = versions[version] || versions[Object.keys(versions).pop()!];
    router(req, res, next);
  };
}

const routers = { 1: v1Router, 2: v2Router };
app.use('/v:version', versionRouter(routers));
```

**¿Por qué funciona esta técnica?**
Resolver la versión en middleware y delegar a un router específico evita duplicar rutas y mantiene la lógica centralizada.

### Caso: Cliente ignorando headers de deprecation

**¿Qué ocasionó el error?**
Clientes seguían usando v1 a pesar de los headers de deprecation, causando problemas cuando v1 se descontinuó.

**¿Cómo se solucionó?**
```typescript
// Programar descontinuación con múltiples avisos
class DeprecationManager {
  private warnings: Map<string, Set<string>> = new Map();  // client → versions

  logUsage(clientId: string, version: number): void {
    if (version < this.latestVersion) {
      if (!this.warnings.has(clientId)) this.warnings.set(clientId, new Set());
      const warned = this.warnings.get(clientId)!;
      if (!warned.has(`v${version}`)) {
        warned.add(`v${version}`);
        // Send email/notification to client owner
        this.notifyClient(clientId, version);
      }
    }
  }

  private async notifyClient(clientId: string, version: number): Promise<void> {
    // Integration with customer platform
    await emailService.send(
      clientId,
      `Your API client is using deprecated version v${version}. Migrate by ${this.sunsetDate}.`
    );
  }
}
```

**¿Por qué funciona esta técnica?**
Notificaciones proactivas a dueños de clientes deprecated garantizan que la migración ocurra antes del sunset.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "api versioning", "version strategy", "backward compatibility", "deprecation", "sunset header", "breaking change"
- **Prioridad de carga:** Alta — esencial para APIs públicas
- **Dependencias:** `02-arquitectura-diseno/31-rest-api-design`, `02-arquitectura-diseno/32-error-handling-patterns`

### Tool Integration

```json
{
  "tool_name": "api-versioning-evolution-strategies",
  "description": "Implements API versioning: URL prefix, header-based, backward-compatible evolution, deprecation headers, changelog management",
  "triggers": ["api versioning", "version strategy", "backward compatible", "deprecation", "sunset", "breaking change"],
  "context_hint": "Inject when user asks about API versioning or evolution strategies",
  "output_format": "code examples with versioning middleware and deprecation patterns",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre versionado de APIs o estrategias de evolución, carga el skill api-versioning-evolution-strategies
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test different versions
curl -s http://localhost:3000/v1/users/123 | jq '.'
curl -s http://localhost:3000/v2/users/123 | jq '.'

# Header versioning
curl -s -H "Accept: application/json; version=2" http://localhost:3000/users/123

# Check deprecation headers
curl -sI http://localhost:3000/v1/users/123 | grep -i "deprecation\|sunset"
```

### GUI / Web

- **Swagger UI**: Documentación multi-versión
- **Postman**: Colecciones por versión de API
- **Redoc**: Documentación con changelog de versiones

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test v1 endpoint | `curl http://localhost:3000/v1/{path}` | Postman v1 collection |
| Test v2 endpoint | `curl http://localhost:3000/v2/{path}` | Postman v2 collection |

---

## 7. Cheatsheet Rápido

```typescript
// URL: /v1/resource, /v2/resource
// Header: Accept: application/json; version=2
// Evolution: add optional fields, never remove, use extensible containers
// Deprecation: Deprecation header + Sunset header + Link rel="deprecation"
// Prefer additive changes over breaking changes
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/31-rest-api-design` | Complementario | Sí |
| `02-arquitectura-diseno/32-error-handling-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/16-api-gateway-bff-patterns` | Complementario | No |
| `02-arquitectura-diseno/33-data-serialization-formats` | Complementario | No |
| `03-sistemas-distribuidos/18-graphql-federation-gateways` | Alternativa | No |

---

## 9. Metadatos del Skill

```yaml
---
id: api-versioning-evolution-strategies
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [api-versioning, evolution, backward-compatible, deprecation, sunset, breaking-change, api-evolution]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

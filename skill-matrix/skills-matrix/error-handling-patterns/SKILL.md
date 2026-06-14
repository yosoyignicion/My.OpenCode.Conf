---
name: error-handling-patterns
description: "Structured error handling separates expected domain errors (validation, business rule violations) from unexpected exceptions (network failures, null pointers)"
---
# Error Handling Patterns

## Semantic Triggers
```
error handling exception jerarquía, result type error handling, structured errors rfc 9457, global error handler middleware, domain exception error code, error handling graceful degradation
```

---

## 1. Definición Teórica

Structured error handling separates expected domain errors (validation, business rule violations) from unexpected exceptions (network failures, null pointers). Use a hierarchy of domain exceptions with machine-readable codes and HTTP status mapping. Result types (Ok/Err) make error paths explicit in the type system, forcing callers to handle errors. Global error middleware catches unhandled exceptions and returns structured (RFC 9457) responses. Log detailed errors internally, return safe messages to clients. Graceful degradation provides fallback behavior on non-critical failures.

---

## 2. Implementación de Referencia

TypeScript with error hierarchy, Result type, global error handler, and graceful degradation patterns.

### Ejemplo Práctico Avanzado

```typescript
// ===== ERROR HIERARCHY =====
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;
  readonly requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.requestId = requestId;
  }

  toProblemDetail(): ProblemDetail {
    return {
      type: `/errors/${this.code.toLowerCase()}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      instance: this.requestId,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

class NotFoundError extends AppError {
  code = 'NOT_FOUND';
  statusCode = 404;
  constructor(entity: string, id: string, requestId?: string) {
    super(`${entity} with id '${id}' not found`, requestId);
  }
}

class ValidationError extends AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 422;
  readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>, requestId?: string) {
    super('Validation failed', requestId);
    this.errors = errors;
  }

  toProblemDetail(): ProblemDetail {
    return {
      ...super.toProblemDetail(),
      errors: this.errors.map(e => ({
        source: { pointer: `/data/attributes/${e.field}` },
        detail: e.message,
      })),
    };
  }
}

class ConflictError extends AppError {
  code = 'CONFLICT';
  statusCode = 409;
  constructor(detail: string, requestId?: string) {
    super(detail, requestId);
  }
}

class UnauthorizedError extends AppError {
  code = 'UNAUTHORIZED';
  statusCode = 401;
  constructor(requestId?: string) {
    super('Authentication required', requestId);
  }
}

class ForbiddenError extends AppError {
  code = 'FORBIDDEN';
  statusCode = 403;
  constructor(requestId?: string) {
    super('Insufficient permissions', requestId);
  }
}

// ===== RESULT TYPE =====
type Result<T, E = AppError> =
  | { success: true; value: T }
  | { success: false; error: E };

function ok<T>(value: T): Result<T> {
  return { success: true, value };
}

function err<T, E = AppError>(error: E): Result<T, E> {
  return { success: false, error };
}

// Usage in service
async function getUser(id: string): Promise<Result<User>> {
  const user = await db.selectFrom('users').where('id', '=', id).executeTakeFirst();
  if (!user) return err(new NotFoundError('User', id));
  return ok(user);
}

// Caller must handle both cases
const result = await getUser('123');
if (!result.success) {
  logger.warn('Failed to get user', { error: result.error.message });
  return problemResponse(res, result.error);
}
const user = result.value;  // type-safe access

// ===== GLOBAL ERROR HANDLER =====
function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log full error internally
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    path: req.path,
  });

  // AppError → structured response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toProblemDetail());
  }

  // Unknown error → safe generic response
  res.status(500).json({
    type: '/errors/internal',
    title: 'Internal Server Error',
    status: 500,
    detail: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    instance: req.id,
  });
}

app.use(globalErrorHandler);

// ===== GRACEFUL DEGRADATION =====
class DegradableService {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    try {
      return await this.recommendationApi.fetch(userId);
    } catch (err) {
      // Non-critical feature — degrade gracefully
      logger.warn('Recommendations unavailable, returning defaults', { userId, error: (err as Error).message });
      return this.getDefaultRecommendations();
    }
  }

  private getDefaultRecommendations(): Recommendation[] {
    // Return cached popular items instead of personalized
    return cache.get('popular_recommendations') || [];
  }
}

// ===== ASYNC ERROR WRAPPER =====
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);  // forward to global handler
  };
}

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const result = await getUser(req.params.id);
  if (!result.success) {
    return res.status(result.error.statusCode).json(result.error.toProblemDetail());
  }
  res.json({ data: result.value });
}));
```

**Fuente oficial:** https://www.rfc-editor.org/rfc/rfc9457

### Alternativa de Implementación Específica

Python with FastAPI exception handlers and Pydantic error models. Use `@app.exception_handler` for custom error responses.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs públicas, sistemas con múltiples clientes, aplicaciones donde la claridad de errores es crítica |
| **Cuándo evitar** | Scripts internos, prototipos, sistemas donde todos los errores se manejan igual |
| **Alternativas** | Exceptions tradicionales (menos estructurado), Option type (solo presente/ausente), Monads/Either (más funcional) |
| **Coste/Complejidad** | Bajo. Error hierarchy es fácil de implementar. Result type añade seguridad de tipos. Global handler simplifica el código |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Stack trace expuesto en producción

**¿Qué ocasionó el error?**
El middleware de errores exponía el stack trace completo en la respuesta, filtrando información interna.

**¿Cómo se solucionó?**
```typescript
function globalErrorHandler(err: Error, req: Request, res: Response) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toProblemDetail());
  }

  // NEVER expose stack traces in production
  const detail = process.env.NODE_ENV === 'development'
    ? err.message
    : 'An unexpected error occurred';

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    // stack only in logs, never in response
  });

  res.status(500).json({
    type: '/errors/internal',
    title: 'Internal Server Error',
    status: 500,
    detail,
  });
}
```

**¿Por qué funciona esta técnica?**
El stack trace se loguea internamente pero nunca se devuelve al cliente en producción. Solo se muestra en desarrollo para debugging.

### Caso: Result type ignorado por error

**¿Qué ocasionó el error?**
Un desarrollador accedió a `result.value` sin verificar `result.success`, causando un crash cuando el resultado era error.

**¿Cómo se solucionó?**
```typescript
// TypeScript strict mode con exhaustiveness check
function handleResult<T>(result: Result<T>, onSuccess: (value: T) => void, onError: (error: AppError) => void): void {
  if (result.success) {
    onSuccess(result.value);
  } else {
    onError(result.error);
  }
}

// O con pattern matching (TC39 proposal)
// match(result) {
//   when({ success: true, value }) => handle(value),
//   when({ success: false, error }) => handleError(error),
// }
```

**¿Por qué funciona esta técnica?**
El Result type fuerza al compilador a verificar ambos casos. TypeScript narrowing con checks condicionales o helper functions garantizan manejo exhaustivo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "error handling", "result type", "rfc 9457", "error hierarchy", "global error handler", "graceful degradation"
- **Prioridad de carga:** Alta — esencial para APIs robustas
- **Dependencias:** `02-arquitectura-diseno/31-rest-api-design`, `02-arquitectura-diseno/34-structured-logging-patterns`

### Tool Integration

```json
{
  "tool_name": "error-handling-patterns",
  "description": "Implements structured error handling: error hierarchy, Result type, global handler, RFC 9457 responses, graceful degradation",
  "triggers": ["error handling", "result type", "rfc 9457", "error middleware", "graceful degradation"],
  "context_hint": "Inject when user asks about error handling strategies or API error responses",
  "output_format": "code examples with error types and handlers",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre manejo de errores o patrones de error, carga el skill error-handling-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test error responses
curl -s http://localhost:3000/api/nonexistent | jq '.'
curl -s -X POST http://localhost:3000/api/users -d '{"email": "invalid"}' | jq '.'

# Check error logs
tail -f logs/error.log | jq 'select(.level == "error")'
```

### GUI / Web

- **Sentry**: Monitoreo de errores en producción
- **Datadog Error Tracking**: Agregación de errores por tipo
- **Postman**: Testing de respuestas de error

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test 404 | `curl -s http://localhost:3000/nonexistent` | Postman → 404 |
| Test 422 | `curl -s -X POST ... -d '{}'` | Postman → 422 |

---

## 7. Cheatsheet Rápido

```typescript
class AppError extends Error { abstract code: string; abstract statusCode: number; toProblemDetail(): ProblemDetail }
type Result<T,E=AppError> = { success:true; value:T } | { success:false; error:E }
// Global handler: catch(err instanceof AppError) → structured response
// Graceful: catch → log → return default/fallback
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/31-rest-api-design` | Complementario | Sí |
| `02-arquitectura-diseno/34-structured-logging-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/32-error-handling-patterns` | — | — |
| `03-sistemas-distribuidos/36-http-client-patterns` | Complementario | No |
| `02-arquitectura-diseno/01-ddd-tactical-patterns` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: error-handling-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/32-error-handling-patterns
tags: [error-handling, result-type, rfc-9457, error-hierarchy, global-error-handler, graceful-degradation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

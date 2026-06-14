---
name: structured-logging-patterns
description: "Structured logging outputs log entries as structured data (JSON) rather than free text, enabling querying, filtering, and analysis in log aggregation systems"
---
# Structured Logging Patterns

## Semantic Triggers
```
structured logging json output, correlation id trace logging, contextual logging bind, structured logging best practices, logging levels debug info error, structured logger structlog
```

---

## 1. Definición Teórica

Structured logging outputs log entries as structured data (JSON) rather than free text, enabling querying, filtering, and analysis in log aggregation systems. Correlation IDs tie together requests across services in distributed systems. Context fields (user, tenant, request_id, trace_id) are bound at the request boundary and propagated through async contexts. Production output is JSON for machine parsing; development output is colored human-readable format. Log levels indicate severity: DEBUG (dev), INFO (ops), WARN (handled issues), ERROR (failures). Never use `console.log` in production — always use a proper logger.

---

## 2. Implementación de Referencia

TypeScript with Pino (fastest Node.js logger) implementing structured logging, correlation IDs, and contextual logging.

### Ejemplo Práctico Avanzado

```typescript
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// ===== LOGGER SETUP =====
const isDev = process.env.NODE_ENV === 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Production: JSON, Development: pretty-printed
  ...(isDev ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  } : {}),

  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'secret', 'token'],
    censor: '[REDACTED]',
  },
});

// ===== CORRELATION ID / CONTEXT =====
// AsyncLocalStorage propagates context through async calls without passing it explicitly

interface LogContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  tenantId?: string;
  method?: string;
  path?: string;
  [key: string]: unknown;
}

const asyncContext = new AsyncLocalStorage<LogContext>();

function createContext(req?: Partial<LogContext>): LogContext {
  return {
    requestId: randomUUID(),
    correlationId: req?.correlationId || randomUUID(),
    userId: req?.userId,
    tenantId: req?.tenantId,
    method: req?.method,
    path: req?.path,
  };
}

// ===== CONTEXTUAL LOGGER =====
class ContextLogger {
  private baseLogger: pino.Logger;
  private context: LogContext;

  constructor(baseLogger: pino.Logger, context: LogContext) {
    this.baseLogger = baseLogger;
    this.context = context;
  }

  private mergeContext(obj?: Record<string, unknown>): Record<string, unknown> {
    // Combine stored context + explicit fields
    const ctx = asyncContext.getStore() || this.context;
    return { ...ctx, ...obj };
  }

  info(msg: string, obj?: Record<string, unknown>): void {
    this.baseLogger.info(this.mergeContext(obj), msg);
  }

  error(msg: string, obj?: Record<string, unknown>): void {
    this.baseLogger.error(this.mergeContext(obj), msg);
  }

  warn(msg: string, obj?: Record<string, unknown>): void {
    this.baseLogger.warn(this.mergeContext(obj), msg);
  }

  debug(msg: string, obj?: Record<string, unknown>): void {
    this.baseLogger.debug(this.mergeContext(obj), msg);
  }

  child(bindings: Record<string, unknown>): ContextLogger {
    return new ContextLogger(this.baseLogger.child(bindings), this.context);
  }
}

// ===== REQUEST MIDDLEWARE =====
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const ctx = createContext({
    correlationId: req.headers['x-correlation-id'] as string,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    tenantId: req.headers['x-tenant-id'] as string,
  });

  // Run entire request in async context
  asyncContext.run(ctx, () => {
    const log = new ContextLogger(logger, ctx);
    const start = Date.now();

    log.info('request started', {
      query: req.query,
      headers: { 'user-agent': req.headers['user-agent'], 'content-type': req.headers['content-type'] },
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      log.info('request completed', {
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader('content-length'),
      });
    });

    next();
  });
}

// ===== USAGE IN APPLICATION CODE =====
function getContextLogger(): ContextLogger {
  const ctx = asyncContext.getStore();
  if (ctx) return new ContextLogger(logger, ctx);
  return new ContextLogger(logger, createContext());
}

// In a controller
app.get('/api/users/:id', async (req, res) => {
  const log = getContextLogger();
  log.info('Fetching user', { userId: req.params.id });

  try {
    const user = await userRepo.findById(req.params.id);
    log.info('User found', { userEmail: user.email });  // email in context
    res.json(user);
  } catch (err) {
    log.error('Failed to fetch user', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ error: 'Internal error' });
  }
});

// ===== STRUCTURED LOG OUTPUT (production) =====
// {"level":30,"time":1718000000000,"requestId":"abc","correlationId":"def","msg":"request started","method":"GET","path":"/api/users/123"}
// {"level":30,"time":1718000000100,"requestId":"abc","correlationId":"def","msg":"User found","userEmail":"alice@example.com","duration":98}

// ===== CHILD LOGGER FOR MODULES =====
const dbLogger = logger.child({ module: 'database' });
dbLogger.info('Connected to database', { url: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') });
```

**Fuente oficial:** https://getpino.io/

### Alternativa de Implementación Específica

Python with `structlog` (recommended for structured logging) or `loguru` (simpler API). Use `contextvars` for async context propagation.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas en producción, microservicios, debugging de sistemas distribuidos, compliance y auditoría |
| **Cuándo evitar** | Scripts one-off, desarrollo local sin necesidad de agregación, sistemas donde file-based logging es suficiente |
| **Alternativas** | Winston (Node.js, más features, más lento), console.log (solo desarrollo), syslog (estándar Unix) |
| **Coste/Complejidad** | Bajo. Pino es rápido y fácil de configurar. AsyncLocalStorage añade complejidad pero es esencial para contexto |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Async context perdido en promesas

**¿Qué ocasionó el error?**
El AsyncLocalStorage perdía el contexto cuando se usaban promesas que no estaban dentro del mismo microtask.

**¿Cómo se solucionó?**
```typescript
// Verificar que el logger se usa dentro del mismo async context
app.use(requestLogger);  // crea el context

// Los handlers que usan await retienen el context automáticamente
app.get('/api/data', async (req, res) => {
  // ✅ Dentro del mismo async context
  const log = getContextLogger();
  await someAsyncFunction();
  log.info('After async call');  // context still available
});

// Si se necesita pasar contexto a un worker/callback
function runExternalTask<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = asyncContext.getStore();
  return fn().then(result => {
    asyncContext.enterWith(ctx);  // restore context
    return result;
  });
}
```

**¿Por qué funciona esta técnica?**
AsyncLocalStorage en Node.js automáticamente mantiene el contexto a través de cadenas de promesas. Si se rompe, restaurar con `enterWith`.

### Caso: Sensitive data in logs

**¿Qué ocasionó el error?**
Passwords y tokens de autenticación aparecían en los logs en texto plano.

**¿Cómo se solucionó?**
```typescript
const logger = pino({
  redact: {
    paths: [
      'password', 'secret', 'token', 'authorization',
      'headers.authorization', 'headers.cookie',
      '*.password', '*.secret',  // nested paths
    ],
    censor: '[REDACTED]',
  },
});

// O manualmente
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set(['password', 'secret', 'token', 'ssn', 'creditCard']);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      sensitiveKeys.has(k) ? [k, '[REDACTED]'] : [k, v]
    )
  );
}
```

**¿Por qué funciona esta técnica?**
Pino redact intercepta paths específicos y los censura. La validación manual como fallback garantiza que datos sensibles nunca lleguen a los logs.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "structured logging", "pino", "correlation id", "contextual logging", "log level", "async local storage"
- **Prioridad de carga:** Alta — esencial para observabilidad
- **Dependencias:** `03-sistemas-distribuidos/08-distributed-tracing-context-propagation`, `04-devops-platform/02-opentelemetry-distributed-tracing`

### Tool Integration

```json
{
  "tool_name": "structured-logging-patterns",
  "description": "Implements structured logging: JSON output, correlation IDs, async context propagation, log levels, sensitive data redaction",
  "triggers": ["structured logging", "pino", "correlation id", "contextual logging", "log level"],
  "context_hint": "Inject when user asks about logging strategies or observability",
  "output_format": "code examples with Pino and AsyncLocalStorage",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre logging estructurado o correlación de logs, carga el skill structured-logging-patterns
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Development: pretty-printed
NODE_ENV=development node app.js

# Production: JSON, pipe to jq
node app.js | jq 'select(.level >= 40)'  # only warnings and errors
node app.js | jq 'select(.module == "database")'  # filter by module

# Search by correlation ID
grep '"correlationId":"abc"' app.log | jq '.'
```

### GUI / Web

- **Kibana / Grafana Loki**: Búsqueda y análisis de logs estructurados
- **Datadog Logs**: Dashboard de logs con filtros por campos
- **Papertrail**: Agregación de logs en tiempo real

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Filter errors | `node app.js | jq 'select(.level >= 50)'` | Kibana → level:error |
| Search correlation | `grep '"correlationId":"abc"'` | Kibana → correlationId:abc |

---

## 7. Cheatsheet Rápido

```typescript
const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['password', 'token'] });
// AsyncLocalStorage for context: const ctx = asyncContext.getStore()
// Log levels: debug(20), info(30), warn(40), error(50), fatal(60)
// Always use logger.info(), never console.log()
// Production: structured JSON → log aggregator
// Development: pino-pretty for readability
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-sistemas-distribuidos/08-distributed-tracing-context-propagation` | Complementario | Sí |
| `04-devops-platform/02-opentelemetry-distributed-tracing` | Complementario | Sí |
| `04-devops-platform/09-log-aggregation-loki-elasticsearch` | Herramienta | Sí |
| `02-arquitectura-diseno/32-error-handling-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/37-configuration-management` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: structured-logging-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/34-structured-logging-patterns
tags: [structured-logging, pino, correlation-id, async-local-storage, contextual-logging, observability]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

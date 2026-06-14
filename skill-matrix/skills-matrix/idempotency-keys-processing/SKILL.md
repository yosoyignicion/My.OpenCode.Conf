---
name: idempotency-keys-processing
description: "Idempotency ensures that executing the same operation multiple times produces the same result without side effects"
---
# Idempotency Keys & Processing

## Semantic Triggers
```
idempotency key garantía procesamiento único, idempotent consumer deduplicación, idempotency key expire, safe retry idempotent, idempotency store redis, idempotency payment processing
```

---

## 1. Definición Teórica

Idempotency ensures that executing the same operation multiple times produces the same result without side effects. The client sends an Idempotency-Key header (UUID) with the request. The server stores the key and response; if the same key is received again (retry), the cached response is returned instead of reprocessing. Keys expire after a window (1-24h depending on use case). Idempotent consumers use an inbox table or idempotency store to discard duplicate messages, guaranteeing exactly-once processing.

---

## 2. Implementación de Referencia

TypeScript with Redis-based idempotency store for APIs and database-backed inbox for consumers.

### Ejemplo Práctico Avanzado

```typescript
// ===== API IDEMPOTENCY (Redis-based) =====
import { createClient } from 'redis';

interface IdempotencyRecord {
  key: string;
  status: number;
  body: unknown;
  createdAt: Date;
  requestHash: string;  // detect key reuse with different payload
}

class IdempotencyMiddleware {
  constructor(
    private redis = createClient({ url: process.env.REDIS_URL }),
    private ttlSeconds = 3600,  // 1 hour default
    private keyPrefix = 'idem:'
  ) {}

  async middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only idempotent-safe methods
    if (!['POST', 'PATCH', 'PUT'].includes(req.method)) return next();

    const key = req.headers['idempotency-key'] as string;
    if (!key) return next();  // idempotency optional

    // Validate key format
    if (!this.isValidUUID(key)) {
      return res.status(400).json({ error: 'Invalid idempotency-key format' });
    }

    const redisKey = `${this.keyPrefix}${key}`;

    // Check for existing record
    const existing = await this.redis.get(redisKey);
    if (existing) {
      const record: IdempotencyRecord = JSON.parse(existing);

      // Verify same payload (prevent key reuse with different data)
      const currentHash = this.hashRequest(req);
      if (record.requestHash !== currentHash) {
        return res.status(422).json({
          error: 'Idempotency key already used with different request',
        });
      }

      // Return cached response
      return res.status(record.status).json(record.body);
    }

    // Store original response methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let statusCode = 200;
    const statusSpy = (code: number) => { statusCode = code; return originalStatus(code); };

    res.status = statusSpy as any;

    res.json = (body: unknown) => {
      // Cache the response
      const record: IdempotencyRecord = {
        key,
        status: statusCode,
        body,
        createdAt: new Date(),
        requestHash: this.hashRequest(req),
      };

      this.redis.setEx(redisKey, this.ttlSeconds, JSON.stringify(record))
        .catch(err => console.error('Failed to cache idempotency record:', err));

      return originalJson(body);
    };

    next();
  }

  private isValidUUID(key: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  }

  private hashRequest(req: Request): string {
    return crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  }
}

// ===== IDEMPOTENT CONSUMER (Database-based) =====
// For message consumers — exactly-once processing

interface ProcessingRecord {
  messageId: string;
  messageType: string;
  status: 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  error?: string;
}

class IdempotentConsumer {
  constructor(private db: Database) {}

  async processMessage<T>(
    messageId: string,
    messageType: string,
    handler: () => Promise<T>
  ): Promise<T | null> {
    // Try to insert processing record (atomic check + insert)
    const inserted = await this.db.transaction(async (tx) => {
      const existing = await tx
        .selectFrom('message_processing')
        .where('message_id', '=', messageId)
        .executeTakeFirst();

      if (existing) return null;

      await tx.insertInto('message_processing').values({
        message_id: messageId,
        message_type: messageType,
        status: 'processing',
        created_at: new Date(),
      }).execute();

      return true;
    });

    // Already processed
    if (inserted === null) {
      const existing = await this.db
        .selectFrom('message_processing')
        .where('message_id', '=', messageId)
        .executeTakeFirst();

      if (existing?.status === 'completed') {
        return null;  // already done
      }
      if (existing?.status === 'failed') {
        throw new Error(`Message ${messageId} previously failed: ${existing.error}`);
      }
      return null;  // currently processing
    }

    // Process
    try {
      const result = await handler();
      await this.db
        .updateTable('message_processing')
        .set({ status: 'completed', processed_at: new Date() })
        .where('message_id', '=', messageId)
        .execute();
      return result;
    } catch (err) {
      await this.db
        .updateTable('message_processing')
        .set({ status: 'failed', error: (err as Error).message })
        .where('message_id', '=', messageId)
        .execute();
      throw err;
    }
  }
}

// ===== PAYMENT PROCESSING (critical idempotency) =====
class PaymentService {
  async charge(
    amount: number,
    token: string,
    idempotencyKey: string
  ): Promise<PaymentResult> {
    // Check with payment provider using idempotency key
    // Stripe: Idempotency-Key header
    return stripe.charges.create({
      amount,
      currency: 'usd',
      source: token,
    }, { idempotencyKey });
  }
}
```

**Fuente oficial:** https://stripe.com/docs/api/idempotent_requests

### Alternativa de Implementación Específica

Python with FastAPI middleware for idempotency using Redis. Use SQLAlchemy for inbox pattern with PostgreSQL advisory locks for concurrency.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs de pago, creación de recursos POST, endpoints no idempotentes por naturaleza, sistemas de mensajería con retry |
| **Cuándo evitar** | GET requests (ya idempotentes), operaciones sin side effects, sistemas donde la duplicación es aceptable |
| **Alternativas** | Idempotent Consumer (para eventos/mensajes), Optimistic Locking (versión en DB), Natural keys (evitar duplicados por constraint) |
| **Coste/Complejidad** | Bajo/medio. Redis es rápido para API idempotency. Storage crece con TTL. Previene bugs graves de duplicación |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Idempotency key reusada con diferente payload

**¿Qué ocasionó el error?**
Cliente reusó el mismo idempotency key para dos operaciones diferentes, causando que la segunda operación retornara el resultado de la primera.

**¿Cómo se solucionó?**
```typescript
// Store hash of the request body
const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');

// On key replay, compare hashes
if (existingRecord.requestHash !== requestHash) {
  return res.status(422).json({
    error: 'Idempotency key already used with different request',
    type: 'idempotency_reuse',
  });
}
```

**¿Por qué funciona esta técnica?**
Almacenar el hash del payload permite detectar si el mismo key se reusa legítimamente (retry) o con datos diferentes (error).

### Caso: Idempotency key expire durante proceso largo

**¿Qué ocasionó el error?**
Un proceso batch tomó más de 1 hora y el idempotency key expiró. Un retry después de la expiración creó un duplicado.

**¿Cómo se solucionó?**
```typescript
// Use sliding TTL: renovar mientras está en proceso
class SlidingIdempotencyStore {
  async startProcessing(key: string): Promise<void> {
    await this.redis.setEx(`idem:${key}:processing`, 7200, 'processing');  // 2h
  }

  async completeProcessing(key: string, response: unknown): Promise<void> {
    await this.redis.del(`idem:${key}:processing`);
    await this.redis.setEx(`idem:${key}`, this.ttl, JSON.stringify(response));
  }

  // Extend TTL periodically
  async extendTTL(key: string): Promise<void> {
    const processing = await this.redis.get(`idem:${key}:processing`);
    if (processing) {
      await this.redis.expire(`idem:${key}:processing`, 7200);
    }
  }
}
```

**¿Por qué funciona esta técnica?**
Sliding TTL extiende la ventana mientras la operación está en proceso, garantizando cobertura para operaciones largas.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "idempotency key", "idempotent consumer", "safe retry", "exactly once processing", "idempotency store"
- **Prioridad de carga:** Alta — crítico para APIs y mensajería confiable
- **Dependencias:** `02-arquitectura-diseno/11-outbox-inbox-patterns`, `02-arquitectura-diseno/20-asynchronous-messaging-patterns`

### Tool Integration

```json
{
  "tool_name": "idempotency-keys-processing",
  "description": "Implements idempotency: API idempotency keys with Redis, idempotent consumers with inbox table, payment processing safety",
  "triggers": ["idempotency", "safe retry", "exactly once", "deduplication", "idempotent consumer"],
  "context_hint": "Inject when user asks about safe retries or duplicate prevention",
  "output_format": "code examples with middleware, consumer, and payment idempotency",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre idempotencia o retry seguro, carga el skill idempotency-keys-processing y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test idempotency
KEY=$(uuidgen)
curl -X POST http://localhost:3000/api/charges \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'

# Retry same request — should return cached response
curl -X POST http://localhost:3000/api/charges \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'

# Redis inspection
redis-cli KEYS "idem:*"
```

### GUI / Web

- **RedisInsight**: GUI para inspeccionar registros de idempotencia en Redis
- **Stripe Dashboard**: Historial de cargos con idempotency keys
- **Datadog**: Métricas de tasa de replay de idempotency keys

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generate UUID | `uuidgen` | — |
| Check Redis keys | `redis-cli KEYS "idem:*"` | RedisInsight |

---

## 7. Cheatsheet Rápido

```typescript
// API: Idempotency-Key header → store response → return cached on replay
// Consumer: inbox table → INSERT message_id ON CONFLICT DO NOTHING → skip if exists
// Payment: idempotencyKey param with provider
// Key format: UUIDv4. TTL: 1h default, 24h for payments
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/11-outbox-inbox-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/20-asynchronous-messaging-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/31-rest-api-design` | Complementario | Sí |
| `02-arquitectura-diseno/32-error-handling-patterns` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: idempotency-keys-processing
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [idempotency, safe-retry, exactly-once, deduplication, idempotent-consumer, payment-processing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

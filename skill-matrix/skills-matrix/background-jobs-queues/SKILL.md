---
name: background-jobs-queues
description: "Los background jobs resuelven el problema de ejecutar trabajo pesado, lento o programado fuera del ciclo request-response HTTP"
---
# background-jobs-queues

## Semantic Triggers
```
Celery task queue Redis broker result backend, BullMQ Node.js queue worker, task chaining chain group chord, exponential backoff retries max_retries, dead letter queue failed jobs monitoring, Celery Beat scheduled periodic tasks
```

---

## 1. Definición Teórica

Los background jobs resuelven el problema de ejecutar trabajo pesado, lento o programado fuera del ciclo request-response HTTP. El principio fundamental es el *procesamiento asíncrono fiable*: un productor encola una tarea, un worker la consume cuando tiene capacidad, y el resultado se almacena para consulta posterior. Esto desacopla la API web de la carga de trabajo (procesamiento de imágenes, envío de emails, generación de reportes, integraciones con terceros). Arquitectónicamente, un sistema de colas consta de: broker (Redis/RabbitMQ almacena mensajes), worker (procesa tareas), result backend (opcional, almacena resultados) y scheduler (tareas periódicas). Existe como capa esencial en aplicaciones web que necesitan escalar más allá de una sola request síncrona.

## 2. Implementación de Referencia

La implementación recomendada usa **Celery** para Python y **BullMQ** para Node.js. Python: Redis como broker/backend, task chaining (`chain`, `group`), retries exponenciales, Celery Beat para scheduling. Node.js: Queue + Worker, concurrency control, job lifecycle events. Idempotency requerido; payload < 1MB.

### Ejemplo Práctico Avanzado

#### Celery (Python)

```python
from celery import Celery, Task, chain, group

app = Celery("tasks", broker="redis://localhost:6379/0", backend="redis://localhost:6379/1")
app.conf.update(task_serializer="json", result_expires=3600, task_acks_late=True, worker_prefetch_multiplier=1)

@app.task(bind=True, max_retries=3, default_retry_delay=60, autoretry_for=(ConnectionError,))
def process_order(self, order_id: int) -> dict:
    try:
        result = perform_payment(order_id)
        return {"order_id": order_id, "status": result}
    except TemporaryError as exc:
        raise self.retry(exc=exc)

workflow = chain(
    validate_order.s(order_id),
    group(charge_payment.s(order_id), send_email.s(order_id)),
    notify_complete.s(),
)
result = workflow()
```

#### BullMQ (Node.js)

```typescript
import { Queue, Worker } from "bullmq"

const queue = new Queue("email", { connection: { host: "localhost", port: 6379 } })
await queue.add("welcome", { userId: 1 }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } })

const worker = new Worker("email", async (job) => {
  await sendEmail(job.data.userId)
}, { concurrency: 10 })
worker.on("completed", (job) => log.info(`job ${job.id} done`))
worker.on("failed", (job, err) => log.error(`job ${job.id} failed: ${err.message}`))
```

**Fuente oficial:** https://docs.celeryq.dev/ — https://docs.bullmq.io/

### Alternativa de Implementación Específica

Para proyectos pequeños o prototipos, Redis Streams (skill `redis-caching-patterns`) sirve como cola simple sin dependencias externas. Para RabbitMQ nativo, usar `aio-pika` (Python) o `amqplib` (Node.js). Para serverless, AWS SQS + Lambda o Google Cloud Tasks eliminan la gestión de workers. Para scheduling periódico sin Celery Beat, `APScheduler` en Python o `node-cron` en Node.js.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Procesamiento asíncrono fiable (email, PDF, notificaciones), tareas programadas (reportes diarios, limpieza), integraciones con APIs lentas de terceros, ETL ligero |
| **Cuándo evitar** | Tareas que requieren <100ms de latencia (usar in-process con asyncio); tareas CPU-bound que necesitan true parallelismo (multiprocessing); workloads que necesitan exactly-once processing (usar Kafka + transactional outbox) |
| **Alternativas** | Redis Streams directo (skill redis-caching-patterns): sin dependencia Celery, menos features; AWS SQS/SNS + Lambda: sin gestión de servidores; Temporal.io: workflow engines con stateful orchestration, más pesado pero más fiable |
| **Coste/Complejidad** | Bajo para tareas simples con Celery+BullMQ; medio para workflows multi-paso (chain, group); alto para monitoreo de workers, dead letter queues, rate limiting entre colas, y backpressure cuando los workers no dan abasto |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Tarea se ejecuta múltiples veces — duplicación

**¿Qué ocasionó el error?**
El worker murió después de procesar pero antes de hacer ACK. Celery (task_acks_late=True) re-encola la tarea.

**¿Cómo se solucionó?**
Hacer la tarea idempotente: usar `lock_key = f"lock:order:{order_id}"` con Redis SET NX EX. Si el lock existe, la tarea ya se procesó, retornar éxito.

**¿Por qué funciona esta técnica?**
Idempotencia garantiza que ejecutar la misma tarea N veces produce el mismo resultado. El lock distribuido previene procesamiento concurrente de la misma orden.

### Caso: Celery worker se queda sin memoria con el tiempo

**¿Qué ocasionó el error?**
`worker_prefetch_multiplier=1` no configurado. Celery pre-fetches N tareas por worker, acumulando referencias a datos grandes en memoria.

**¿Cómo se solucionó?```
app.conf.update(worker_prefetch_multiplier=1, worker_max_tasks_per_child=1000)
```El worker procesa una tarea a la vez y reinicia cada 1000 tareas, liberando memoria.

**¿Por qué funciona esta técnica?**
`prefetch_multiplier=1` evita que el worker acumule tareas en buffer. `max_tasks_per_child` fuerza reciclado del proceso worker periódicamente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~750 tokens estimados al invocar este skill
- **Trigger de activación:** Background task, Celery, BullMQ, cola de trabajo asíncrona, tarea programada
- **Prioridad de carga:** Alta — background jobs son esenciales en apps web de producción
- **Dependencias:** Cargar junto con `redis-caching-patterns` (broker Redis) o `docker-compose-watch` (entorno dev)

### Tool Integration

```json
{
  "tool_name": "background-jobs-queues",
  "description": "Configura background jobs con Celery (Python) y BullMQ (Node.js): tareas asíncronas, chaining, retries, scheduling",
  "triggers": ["celery", "bullmq", "queue", "background job", "task queue", "worker", "scheduled task"],
  "context_hint": "Inyectar ejemplos Celery + BullMQ (sección 2) cuando el usuario necesite procesamiento asíncrono",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre tareas en background, carga el skill background-jobs-queues y responde
siguiendo la sección de implementación de referencia con ejemplos de Celery o BullMQ según el lenguaje.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Celery — iniciar worker
celery -A tasks worker --loglevel=info --concurrency=4

# Celery — flores (GUI de monitoreo)
celery -A tasks flower --port=5555

# Celery — inspeccionar colas
celery -A tasks inspect active      # tareas en ejecución
celery -A tasks inspect reserved    # tareas en buffer
celery -A tasks inspect stats       # estadísticas del worker

# Celery — tarea programada
celery -A tasks beat                # scheduler

# BullMQ — CLI tool (bull-repl)
npx bull-repl --queue email

# Monitoreo BullMQ
npx bull-board                       # dashboard web

# Docker compose con workers
docker compose up -d worker beat
```

### GUI / Web

- **Flower (Celery):** `celery -A tasks flower` — dashboard web con workers activos, tasks, queues, gráficos
- **Bull Board (BullMQ):** Dashboard web con jobs activos/completados/fallidos, controles de retry
- **VSCode:** Celery extension (task tree, status de workers)
- **RedisInsight:** Visualizar keys de Celery/BullMQ en Redis, ver tareas encoladas
- **Celery Task Viewer:** `celery report` + script custom para debug de task states

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Start worker | `celery -A tasks worker -l info` | Docker Compose → UP |
| Open Flower | `celery -A tasks flower` | `http://localhost:5555` |
| Purge queue | `celery -A tasks purge` | Flower → Purge button |
| Retry failed | `celery -A tasks retry -d <task_id>` | Bull Board → Retry |
| Scheduled tasks | `celery -A tasks beat` | Flower → Tasks tab |

---

## 7. Cheatsheet Rápido

```python
@app.task(bind=True, max_retries=3, autoretry_for=(Exception,))
def process(self, data):
    try: return perform(data)
    except TemporaryError as exc: raise self.retry(exc=exc)
workflow = chain(validate.s(), group(charge.s(), email.s()))
```

```typescript
const q = new Queue("name", { connection })
const w = new Worker("name", async (job) => { await process(job.data) })
await q.add("task", data, { attempts: 3, backoff: { type: "exponential", delay: 1000 } })
```

```bash
celery -A tasks worker -l info & celery -A tasks beat
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `redis-caching-patterns` | Dependiente — Redis como broker/backend para Celery y BullMQ | Sí |
| `async-python-concurrency` | Complementario — task internas async dentro de workers Celery | No |
| `docker-compose-watch` | Complementario — Redis + worker en Docker Compose para dev | Sí |
| `fastapi-rest-development` | Complementario — encolar tareas desde endpoints FastAPI | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: background-jobs-queues
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/background-jobs
tags: [celery, bullmq, queues, background-jobs, workers, task-queue, scheduling, async-processing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: concurrency-patterns-pipelines
description: "Concurrency patterns manage parallel execution, resource contention, and pipeline processing"
---
# Concurrency Patterns & Pipelines

## Semantic Triggers
```
pipeline pattern stages channels, fan out fan in concurrencia, worker pool paralelismo, circuit breaker concurrencia, semaphore rate limiting concurrente, structured concurrency task group
```

---

## 1. Definición Teórica

Concurrency patterns manage parallel execution, resource contention, and pipeline processing. Pipeline stages connected by channels provide streaming parallelism — each stage processes and passes data to the next. Fan-Out/Fan-In distributes work across multiple workers and collects results. Worker Pools bound resource usage with a fixed number of concurrent workers. Semaphores limit access to scarce resources. Structured Concurrency ensures cleanup and error propagation when any concurrent subtask fails.

---

## 2. Implementación de Referencia

TypeScript with async iterators, channels, and worker pools. Concurrency primitives for cooperative multitasking.

### Ejemplo Práctico Avanzado

```typescript
// Pipeline — sequential processing stages with channels
interface Stage<I, O> {
  process(input: I): Promise<O>;
}

class Pipeline<I, O> {
  constructor(private stages: Stage<any, any>[]) {}

  async process(input: I): Promise<O> {
    let result: any = input;
    for (const stage of this.stages) {
      result = await stage.process(result);
    }
    return result as O;
  }

  async processBatch(inputs: I[]): Promise<O[]> {
    const results: O[] = [];
    for (const input of inputs) {
      results.push(await this.process(input));
    }
    return results;
  }
}

// Example pipeline stages
class ValidateInput implements Stage<any, any> {
  async process(input: any): Promise<any> {
    if (!input.email) throw new Error('Email required');
    return input;
  }
}

class EnrichData implements Stage<any, any> {
  async process(input: any): Promise<any> {
    return { ...input, createdAt: new Date(), enriched: true };
  }
}

class PersistData implements Stage<any, any> {
  constructor(private db: Database) {}
  async process(input: any): Promise<any> {
    return this.db.insertInto('users').values(input).returningAll().executeTakeFirstOrThrow();
  }
}

// Fan-Out/Fan-In — distributed work
class WorkerPool<T, R> {
  private workers: Worker<T, R>[] = [];

  constructor(workerCount: number, private workerFn: (input: T) => Promise<R>) {
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new Worker(workerFn));
    }
  }

  async executeAll(inputs: T[]): Promise<R[]> {
    const promises = inputs.map((input, i) => {
      const workerIndex = i % this.workers.length;
      return this.workers[workerIndex].process(input);
    });
    return Promise.all(promises);
  }

  async executeWithThrottle(inputs: T[], concurrency: number): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    async function worker(self: WorkerPool<T, R>): Promise<void> {
      while (index < inputs.length) {
        const current = index++;
        results[current] = await self.workerFn(inputs[current]);
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker(this));
    await Promise.all(workers);
    return results;
  }
}

class Worker<T, R> {
  constructor(private fn: (input: T) => Promise<R>) {}
  async process(input: T): Promise<R> {
    return this.fn(input);
  }
}

// Semaphore — concurrency limiter
class Semaphore {
  private current = 0;
  private queue: (() => void)[] = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try { return await fn(); }
    finally { this.release(); }
  }
}

// Structured Concurrency with TaskGroup
class TaskGroup {
  private tasks: Promise<void>[] = [];

  async spawn<T>(fn: () => Promise<T>): Promise<T> {
    const promise = fn().then(
      () => undefined as any,
      (err) => { throw err; }
    );
    this.tasks.push(promise);
    return promise;
  }

  async wait(): Promise<void> {
    await Promise.all(this.tasks);
  }

  async waitAll(): Promise<void> {
    try {
      await Promise.all(this.tasks);
    } catch (err) {
      // Cancel remaining tasks (implementation-specific)
      this.tasks = [];
      throw err;
    }
  }
}
```

**Fuente oficial:** https://go.dev/blog/pipelines

### Alternativa de Implementación Específica

Go with goroutines and channels for native concurrency. Use `errgroup.Group` for structured concurrency and `semaphore.Weighted` for resource limits.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Procesamiento batch de datos, ETL pipelines, servicios con alta concurrencia, sistemas que procesan streams |
| **Cuándo evitar** | Operaciones secuenciales simples, sistemas con baja carga, cuando la sobrecarga de threads/workers no justifica el paralelismo |
| **Alternativas** | Async/await secuencial (simplicidad), streams Node.js (backpressure nativa), message queues (distribución entre servicios) |
| **Coste/Complejidad** | Medio. Pipeline pattern es fácil de mantener. Worker pool añade complejidad de gestión. Structured concurrency reduce memory leaks |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Deadlock en worker pool

**¿Qué ocasionó el error?**
Workers esperaban resultados de otros workers, causando deadlock porque todos los slots estaban ocupados esperando.

**¿Cómo se solucionó?**
```typescript
// Evitar dependencias circulares entre workers
// Usar cola separada para operaciones blocking
class SafeWorkerPool {
  async processWithDependency(input: Input): Promise<Output> {
    // Si este worker necesita otro recurso, liberar el slot antes
    this.semaphore.release();
    try {
      const dependency = await this.fetchDependency(input.id);
      await this.semaphore.acquire();
      return await this.doWork(input, dependency);
    } finally {
      this.semaphore.release();
    }
  }
}
```

**¿Por qué funciona esta técnica?**
Liberar el semáforo antes de una operación bloqueante evita consumir un slot mientras se espera.

### Caso: Pipeline stage lento bloquea todo el flujo

**¿Qué ocasionó el error?**
Una etapa del pipeline era 10x más lenta que las demás, causando acumulación de backpressure.

**¿Cómo se solucionó?**
```typescript
// Parallel pipeline stage con múltiples workers
class ParallelStage<I, O> implements Stage<I, O> {
  private workers: Stage<I, O>[];

  constructor(workerCount: number, private stageFn: (input: I) => Promise<O>) {
    this.workers = Array.from({ length: workerCount }, () => ({
      process: stageFn,
    }));
  }

  async process(input: I): Promise<O> {
    return this.stageFn(input);  // individual processing
  }

  async processBatch(inputs: I[]): Promise<O[]> {
    const semaphore = new Semaphore(this.workers.length);
    return Promise.all(inputs.map(input =>
      semaphore.run(() => this.stageFn(input))
    ));
  }
}
```

**¿Por qué funciona esta técnica?**
Parallelizar la etapa lenta permite que múltiples instancias procesen en paralelo, equilibrando el throughput del pipeline.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~810 tokens estimados al invocar este skill
- **Trigger de activación:** "concurrency pattern", "pipeline pattern", "worker pool", "fan out fan in", "semaphore", "structured concurrency"
- **Prioridad de carga:** Media — patrones específicos para procesamiento paralelo
- **Dependencias:** `01-sistemas-bajo-nivel/02-concurrency-actor-model`

### Tool Integration

```json
{
  "tool_name": "concurrency-patterns-pipelines",
  "description": "Implements concurrency patterns: pipeline, fan-out/fan-in, worker pool, semaphore, structured concurrency",
  "triggers": ["concurrency", "pipeline", "worker pool", "fan out", "fan in", "semaphore", "parallel"],
  "context_hint": "Inject when user asks about parallel processing or concurrent execution patterns",
  "output_format": "code examples with pipeline stages and worker pools",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre patrones de concurrencia o pipelines paralelos, carga el skill concurrency-patterns-pipelines
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Run pipeline with profiling
node --prof pipeline.js
# Analyze concurrent execution
node --trace-event-categories node.perf pipeline.js

# Go race detector
go run -race cmd/pipeline/main.go
```

### GUI / Web

- **Chrome DevTools Performance**: Análisis de concurrencia y timing
- **pprof (Go)**: Visualización de perfiles de concurrencia
- **Grafana**: Métricas de worker pool utilization

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Profile pipeline | `node --prof pipeline.js` | — |
| Run race detector | `go run -race ./cmd/` | — |

---

## 7. Cheatsheet Rápido

```typescript
class Pipeline { stages: Stage[]; async process(input) { for (const s of this.stages) input = await s.process(input); return input; } }
class Semaphore { async acquire(); release(); async run<T>(fn) { await acquire(); try { return fn(); } finally { release(); } } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `01-sistemas-bajo-nivel/02-concurrency-actor-model` | Complementario | Sí |
| `02-arquitectura-diseno/21-pipeline-filter-architecture` | Complementario | Sí |
| `02-arquitectura-diseno/20-asynchronous-messaging-patterns` | Complementario | No |
| `02-arquitectura-diseno/30-bulkhead-circuit-breaker-resilience` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: concurrency-patterns-pipelines
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [concurrency, pipeline, worker-pool, fan-out-fan-in, semaphore, structured-concurrency]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

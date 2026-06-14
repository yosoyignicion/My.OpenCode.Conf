---
name: pipeline-filter-architecture
description: "The Pipeline & Filter architectural pattern structures processing as a sequence of independent filters connected by pipes"
---
# Pipeline & Filter Architecture

## Semantic Triggers
```
pipeline filter arquitectura procesamiento, pipes and filters pattern, pipeline processing stages sequential, filter chain processing steps, pipeline pattern middleware, pipeline arquitectura transformación datos
```

---

## 1. Definición Teórica

The Pipeline & Filter architectural pattern structures processing as a sequence of independent filters connected by pipes. Each filter performs one transformation and has a single responsibility; pipes transport data between filters. Filters are composable, reusable, and independently testable. The pattern excels at ETL, data processing, middleware chains, image/signal processing, and any sequential transformation pipeline. Splitters (fan-out) and Mergers (fan-in) handle parallel processing within the pipeline.

---

## 2. Implementación de Referencia

TypeScript with a generic Pipeline class supporting sync and async filters, error handling, and branching.

### Ejemplo Práctico Avanzado

```typescript
// ===== PIPELINE WITH FILTERS =====

interface Filter<I, O> {
  execute(input: I, context?: PipelineContext): Promise<O>;
}

interface PipelineContext {
  errors: Error[];
  metadata: Map<string, unknown>;
  abort(): void;
  isAborted(): boolean;
}

class DefaultPipelineContext implements PipelineContext {
  errors: Error[] = [];
  metadata = new Map<string, unknown>();
  private aborted = false;
  abort(): void { this.aborted = true; }
  isAborted(): boolean { return this.aborted; }
}

class Pipeline<I, O> {
  private filters: Filter<any, any>[] = [];
  private errorHandlers: Array<(err: Error, context: PipelineContext) => void> = [];

  addFilter<T, U>(filter: Filter<T, U>): this {
    this.filters.push(filter);
    return this;
  }

  onError(handler: (err: Error, context: PipelineContext) => void): this {
    this.errorHandlers.push(handler);
    return this;
  }

  async execute(input: I): Promise<O> {
    const context = new DefaultPipelineContext();
    let result: any = input;

    for (const filter of this.filters) {
      if (context.isAborted()) break;

      try {
        result = await filter.execute(result, context);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        context.errors.push(error);
        this.errorHandlers.forEach(h => h(error, context));
        if (!context.isAborted()) throw error;
        break;
      }
    }

    return result as O;
  }

  // Compose pipelines
  then<T>(nextPipeline: Pipeline<O, T>): Pipeline<I, T> {
    const composed = new Pipeline<I, T>();
    for (const f of this.filters) composed.addFilter(f);
    for (const f of nextPipeline.filters) composed.addFilter(f);
    return composed;
  }
}

// ===== CONCRETE FILTERS =====

class ValidationFilter implements Filter<any, any> {
  constructor(private schema: Record<string, (v: any) => boolean>) {}

  async execute(input: any, ctx: PipelineContext): Promise<any> {
    for (const [field, validator] of Object.entries(this.schema)) {
      if (!validator(input[field])) {
        ctx.abort();
        throw new ValidationError(`Field ${field} failed validation`);
      }
    }
    return input;
  }
}

class TransformFilter implements Filter<any, any> {
  constructor(private transformer: (data: any) => any) {}

  async execute(input: any): Promise<any> {
    return this.transformer(input);
  }
}

class EnrichmentFilter implements Filter<any, any> {
  constructor(private enricher: (data: any) => Promise<any>) {}

  async execute(input: any): Promise<any> {
    const enrichment = await this.enricher(input);
    return { ...input, ...enrichment };
  }
}

class PersistenceFilter implements Filter<any, any> {
  constructor(private persist: (data: any) => Promise<any>) {}

  async execute(input: any): Promise<any> {
    return this.persist(input);
  }
}

class LoggingFilter implements Filter<any, any> {
  async execute(input: any, ctx: PipelineContext): Promise<any> {
    console.log(`Pipeline step: ${JSON.stringify(input).substring(0, 100)}...`);
    return input;
  }
}

// ===== SPLITTER / MERGER =====
class Splitter<I> implements Filter<I[], I> {
  async execute(input: I[]): Promise<I> {
    // Pass through individual items — actual splitting at pipeline level
    return input[0];
  }
}

class ParallelFilter<I, O> implements Filter<I[], O[]> {
  constructor(private worker: Filter<I, O>, private concurrency = 4) {}

  async execute(inputs: I[]): Promise<O[]> {
    const results: O[] = [];
    const queue = [...inputs];

    async function worker(self: ParallelFilter<I, O>): Promise<void> {
      while (queue.length > 0) {
        const item = queue.shift()!;
        const result = await self.worker.execute(item, new DefaultPipelineContext());
        results.push(result);
      }
    }

    const workers = Array.from({ length: this.concurrency }, () => worker(this));
    await Promise.all(workers);
    return results;
  }
}

// ===== USAGE =====
const userPipeline = new Pipeline<any, any>()
  .addFilter(new ValidationFilter({
    email: (v: any) => typeof v === 'string' && v.includes('@'),
    age: (v: any) => typeof v === 'number' && v >= 18,
  }))
  .addFilter(new TransformFilter((data) => ({
    ...data,
    name: `${data.firstName} ${data.lastName}`,
  })))
  .addFilter(new EnrichmentFilter(async (data) => ({
    geo: await geoService.lookup(data.ip),
  })))
  .addFilter(new LoggingFilter())
  .addFilter(new PersistenceFilter(async (data) => db.insertInto('users').values(data).returningAll().executeTakeFirst()))
  .onError((err) => console.error('Pipeline error:', err));

const user = await userPipeline.execute({ email: 'a@b.com', age: 25, firstName: 'Alice', lastName: 'Smith' });
```

**Fuente oficial:** https://www.enterpriseintegrationpatterns.com/patterns/messaging/PipesAndFilters.html

### Alternativa de Implementación Específica

Go with interface-based filters and channel-based pipes for concurrent pipeline stages. Use `sync.Pool` for object reuse.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | ETL pipelines, middleware chains (Express/Koa), procesamiento de documentos, transformaciones multi-paso, data ingestion |
| **Cuándo evitar** | Procesos con una sola transformación, sistemas donde el orden no importa, pipelines con dependencias entre filtros no secuenciales |
| **Alternativas** | Streams (Node.js Stream API con backpressure), Chain of Responsibility (similar pero con decisión de parada), Event-driven (sin orden fijo) |
| **Coste/Complejidad** | Bajo/medio. Fácil de entender y mantener. Cada filtro es aislado y testable. Performance depende del filtro más lento |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Pipeline lento por filtro bloqueante

**¿Qué ocasionó el error?**
Un filtro hacía I/O síncrono (lectura de archivo), bloqueando todo el pipeline.

**¿Cómo se solucionó?**
```typescript
// Convertir a async y paralelizar filtros independientes
class ParallelPipeline {
  async execute(input: any): Promise<any> {
    // Ejecutar filtros independientes en paralelo
    const [validated, enriched] = await Promise.all([
      this.validationFilter.execute(input),
      this.enrichmentFilter.execute(input),
    ]);

    // Luego ejecutar filtros dependientes secuencialmente
    const persisted = await this.persistenceFilter.execute({ ...validated, ...enriched });
    return persisted;
  }
}
```

**¿Por qué funciona esta técnica?**
Filtros independientes pueden ejecutarse en paralelo. Identificar dependencias y paralelizar mejora throughput significativamente.

### Caso: Pipeline sin abort en error

**¿Qué ocasionó el error?**
Un filtro fallaba pero el pipeline continuaba procesando con datos inválidos.

**¿Cómo se solucionó?**
```typescript
// Abort context with error propagation
class AbortOnErrorPipeline extends Pipeline {
  async execute(input: any): Promise<any> {
    let result = input;
    for (const filter of this.filters) {
      try {
        result = await filter.execute(result, this.context);
      } catch (err) {
        this.context.abort();
        throw new PipelineError(`Pipeline aborted at ${filter.constructor.name}`, err);
      }
    }
    return result;
  }
}
```

**¿Por qué funciona esta técnica?**
Abort context permite detener el pipeline inmediatamente cuando un filtro falla, evitando procesamiento inválido.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~790 tokens estimados al invocar este skill
- **Trigger de activación:** "pipeline pattern", "pipes and filters", "filter chain", "etl pipeline", "middleware chain"
- **Prioridad de carga:** Media — patrón específico para procesamiento secuencial
- **Dependencias:** `02-arquitectura-diseno/12-concurrency-patterns-pipelines`

### Tool Integration

```json
{
  "tool_name": "pipeline-filter-architecture",
  "description": "Implements Pipeline & Filter: composable filters, pipe transport, split/merge, error handling, parallel execution",
  "triggers": ["pipeline", "pipes and filters", "filter chain", "etl", "middleware", "transform pipeline"],
  "context_hint": "Inject when user asks about sequential data processing or transform chains",
  "output_format": "code examples with generic pipeline and concrete filters",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre pipelines de procesamiento o filtros encadenados, carga el skill pipeline-filter-architecture
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Run ETL pipeline with timing
time npm run etl:pipeline -- --input data.csv
# Debug pipeline steps
DEBUG=pipeline:* npm run etl:pipeline
```

### GUI / Web

- **Apache NiFi**: GUI para diseñar pipelines de datos
- **Node-RED**: Flow-based programming para pipelines
- **Airflow**: DAGs para pipelines de datos programados

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Run pipeline | `npm run etl:pipeline` | Node-RED Deploy |
| Debug pipeline | `DEBUG=pipeline:* npm run etl` | — |

---

## 7. Cheatsheet Rápido

```typescript
interface Filter<I,O> { execute(input:I, ctx?:PipelineContext): Promise<O>; }
class Pipeline { addFilter(f) { this.filters.push(f); return this; } async execute(input) { for (const f of this.filters) input = await f.execute(input); return input; } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/12-concurrency-patterns-pipelines` | Complementario | Sí |
| `02-arquitectura-diseno/21-pipeline-filter-architecture` | Complementario | No |
| `02-arquitectura-diseno/07-gof-behavioral-patterns` | Complementario | No |
| `08-ingenieria-herramientas/05-async-python-concurrency` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: pipeline-filter-architecture
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [pipeline, pipes-and-filters, etl, filter-chain, middleware, data-processing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

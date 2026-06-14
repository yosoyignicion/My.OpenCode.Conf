---
name: reactive-programming-extensions
description: "Reactive Programming models asynchronous data streams using Observables — sequences of data that arrive over time"
---
# Reactive Programming & Extensions

## Semantic Triggers
```
reactive programming observables streams, rxjs operators pipe chain, reactive extensions rx pattern, observable subscription flujo datos, backpressure reactive streams, reactive manifesto responsive resilient
```

---

## 1. Definición Teórica

Reactive Programming models asynchronous data streams using Observables — sequences of data that arrive over time. Reactive Extensions (Rx) provide operators to transform, filter, combine, and manage streams declaratively. The Reactive Manifesto defines systems as Responsive, Resilient, Elastic, and Message-driven. Core concepts: Observable (data source), Observer (consumer), Subscription (lifecycle control), Operators (transformation pipeline), and Schedulers (execution context). Backpressure handles cases where the producer outpaces the consumer.

---

## 2. Implementación de Referencia

RxJS 7+ with TypeScript. Examples cover stream creation, transformation, combination, and error handling.

### Ejemplo Práctico Avanzado

```typescript
import {
  Observable, fromEvent, interval, merge, of, Subject,
  map, filter, debounceTime, distinctUntilChanged, switchMap,
  catchError, retry, shareReplay, combineLatestWith,
  timer, takeUntil, finalize, throttleTime
} from 'rxjs';

// ===== TYPEAHEAD SEARCH =====
// Classic reactive example: debounced search with cancellation
class TypeaheadSearch {
  private searchSubject = new Subject<string>();

  constructor(private api: { search(q: string): Promise<Result[]> }) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.length >= 2),
      switchMap(query =>
        from(this.api.search(query)).pipe(
          catchError(err => {
            console.error('Search failed', err);
            return of([]);
          })
        )
      )
    ).subscribe(results => this.render(results));
  }

  onInput(value: string): void {
    this.searchSubject.next(value);
  }

  private render(results: Result[]): void {
    console.log('Results:', results);
  }
}

// ===== REAL-TIME PRICE STREAM =====
// Combining multiple streams with shareReplay for caching
class PriceFeed {
  private priceStream = new Observable<Price>(subscriber => {
    const ws = new WebSocket('wss://prices.example.com/stream');

    ws.onmessage = (event) => {
      const price: Price = JSON.parse(event.data);
      subscriber.next(price);
    };

    ws.onerror = (err) => subscriber.error(err);
    ws.onclose = () => subscriber.complete();

    return () => ws.close();  // teardown
  }).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
    retry({ count: 3, delay: (_, retryCount) => timer(1000 * Math.pow(2, retryCount)) })
  );

  // Derived streams
  priceChanges$ = this.priceStream.pipe(
    map(p => ({ symbol: p.symbol, change: p.price - p.previousClose }))
  );

  significantMoves$ = this.priceStream.pipe(
    throttleTime(1000),
    map(p => ({ symbol: p.symbol, changePercent: (p.price - p.open) / p.open * 100 })),
    filter(m => Math.abs(m.changePercent) > 5)
  );
}

// ===== COMBINING STREAMS =====
const clicks$ = fromEvent(document, 'click');
const timer$ = interval(1000);

// Start timer on click, stop on next click
const clickTimer$ = clicks$.pipe(
  switchMap(() => timer$),
  takeUntil(clicks$.pipe(skip(1)))
);

// Merge multiple event sources
const keyup$ = fromEvent(document, 'keyup').pipe(map(e => (e as KeyboardEvent).key));
const keydown$ = fromEvent(document, 'keydown').pipe(map(e => (e as KeyboardEvent).key));
const allKeys$ = merge(keyup$, keydown$).pipe(
  distinctUntilChanged(),
  map(key => ({ key, timestamp: Date.now() }))
);

// ===== ERROR HANDLING WITH RETRY =====
class ResilientApiClient {
  fetchData<T>(url: string): Observable<T> {
    return from(fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.log(`Retry ${retryCount} after error:`, error);
          return timer(1000 * Math.pow(2, retryCount));
        },
      }),
      catchError(err => {
        console.error('All retries failed', err);
        return of(null as T);  // graceful fallback
      }),
      finalize(() => console.log('Stream completed'))
    );
  }
}

// ===== SUBJECTS =====
// Subject: multicast observable (both Observable and Observer)
const eventBus = new Subject<AppEvent>();

// Producer
eventBus.next({ type: 'USER_LOGIN', data: { userId: '123' } });

// Consumer 1
eventBus.pipe(filter(e => e.type === 'USER_LOGIN')).subscribe(e => console.log('Login:', e.data));

// Consumer 2
eventBus.pipe(filter(e => e.type === 'ORDER_PLACED')).subscribe(e => console.log('Order:', e.data));

// BehaviorSubject: emits current value to new subscribers
const currentUser$ = new BehaviorSubject<User | null>(null);
// ReplaySubject: replays last N values to new subscribers
const recentEvents$ = new ReplaySubject<AppEvent>(5);  // last 5 events
```

**Fuente oficial:** https://rxjs.dev/guide/overview

### Alternativa de Implementación Específica

Python with `reactivex` (RxPY) library. Use `asyncio` streams for async reactive pipelines. Similar operators: `pipe`, `map`, `filter`, `debounce`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | UIs con múltiples eventos asíncronos, streams de datos en tiempo real, autocompletados, dashboards, sistemas con backpressure |
| **Cuándo evitar** | Operaciones CRUD simples, equipos sin experiencia en Rx, casos donde async/await es suficiente, streams con un solo evento |
| **Alternativas** | Async generators (simplicidad, menos operadores), EventEmitter (nativo Node.js, menos funcional), Signals (Angular moderno, más simple) |
| **Coste/Complejidad** | Medio. Curva de aprendizaje pronunciada (operadores, marble diagrams). Alto valor en UI reactivas. Debugging puede ser complejo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Memory leak por subscription no cancelada

**¿Qué ocasionó el error?**
Un componente Angular se destruía pero la subscription al Observable no se cancelaba, causando updates después de destruir el componente.

**¿Cómo se solucionó?**
```typescript
@Component({ template: '' })
class PriceComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    interval(1000).pipe(
      takeUntil(this.destroy$)  // auto-cancel on destroy
    ).subscribe(price => this.updatePrice(price));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
// O usando async pipe en Angular (automático)
// <div>{{ prices$ | async }}</div>
```

**¿Por qué funciona esta técnica?**
`takeUntil(destroy$)` completa la subscription automáticamente cuando el Subject se emite. El async pipe de Angular maneja subscriptions automáticamente.

### Caso: Nested subscriptions (callback hell)

**¿Qué ocasionó el error?**
Subscripciones dentro de subscripciones creaban código anidado difícil de leer y gestionar.

**¿Cómo se solucionó?**
```typescript
// 🚫 Nested subscriptions
user$.subscribe(user => {
  orders$.subscribe(orders => {
    // nested!
  });
});

// ✅ Higher-order operators
user$.pipe(
  switchMap(user => this.ordersService.getOrders(user.id)),  // cancels previous
  catchError(err => of([]))
).subscribe(orders => console.log(orders));
```

**¿Por qué funciona esta técnica?**
`switchMap` (y otros flattening operators como `mergeMap`, `concatMap`, `exhaustMap`) manejan subscripciones internas automáticamente, evitando nesting.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "reactive programming", "rxjs", "observable", "reactive extensions", "stream", "operator pipe"
- **Prioridad de carga:** Media — relevante para UI y streams de datos
- **Dependencias:** `02-arquitectura-diseno/18-reactive-programming-extensions`, `03-sistemas-distribuidos/25-backpressure-and-flow-control`

### Tool Integration

```json
{
  "tool_name": "reactive-programming-extensions",
  "description": "Implements Reactive Programming with RxJS: Observables, Operators, Subjects, error handling, backpressure",
  "triggers": ["reactive", "rxjs", "observable", "stream", "operator", "subject"],
  "context_hint": "Inject when user asks about async data streams or reactive patterns",
  "output_format": "code examples with RxJS operators and stream composition",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre programación reactiva o RxJS, carga el skill reactive-programming-extensions y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# RxJS marble testing
npx jasmine --helper=node_modules/rxjs/testing/package.json
# Debug RxJS streams
NODE_ENV=development node --inspect app.js
```

### GUI / Web

- **RxJS Marble Diagrams**: Visualización interactiva de operadores en https://rxmarbles.com
- **RxJS DevTools**: Extensión Chrome para debugging de streams
- **Angular DevTools**: Visualización de change detection y streams

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Marble test | `npx jasmine rxjs-test.spec.ts` | — |
| Debug stream | `console.log` + `tap()` operator | Chrome DevTools |

---

## 7. Cheatsheet Rápido

```typescript
// Creation: of(1,2,3), from([1,2,3]), fromEvent(el, 'click'), interval(1000)
// Pipe operators: .pipe(map(x => x*2), filter(x => x>5), debounceTime(300), distinctUntilChanged(), switchMap(fn))
// Subjects: Subject, BehaviorSubject(initial), ReplaySubject(N)
// Unsubscribe: sub.unsubscribe(), takeUntil(destroy$), async pipe
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-sistemas-distribuidos/25-backpressure-and-flow-control` | Complementario | Sí |
| `02-arquitectura-diseno/02-event-driven-cqrs` | Complementario | No |
| `02-arquitectura-diseno/12-concurrency-patterns-pipelines` | Alternativa | No |
| `02-arquitectura-diseno/35-state-management-patterns` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: reactive-programming-extensions
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [reactive-programming, rxjs, observable, stream, operator, subject, reactive-extensions]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

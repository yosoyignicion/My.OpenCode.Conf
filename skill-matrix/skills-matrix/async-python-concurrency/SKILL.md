---
name: async-python-concurrency
description: "Async Python resuelve el problema de gestionar operaciones I/O-bound concurrentes sin los costes de threading (race conditions, context switching, GIL)"
---
# async-python-concurrency

## Semantic Triggers
```
asyncio TaskGroup structured concurrency gather, anyio library-agnostic async backend trio, asyncio timeout wait_for shield cancellation, semaphore rate limiting concurrent tasks, run_in_executor thread pool for blocking I/O, uvloop performance Linux event loop
```

---

## 1. Definición Teórica

Async Python resuelve el problema de gestionar operaciones I/O-bound concurrentes sin los costes de threading (race conditions, context switching, GIL). El principio fundamental es la *programación cooperativa*: las tareas ceden el control voluntariamente en puntos de espera (`await`), permitiendo que el event loop multiplexe miles de conexiones en un solo hilo. Arquitectónicamente, `asyncio` es el event loop estándar (Python 3.4+), con `TaskGroup` (3.11+) que provee structured concurrency — cancelación correcta de subtareas sin leaks. `anyio` abstrae el backend (asyncio/trio) para librerías reusables. Existe como alternativa necesaria a threading para servidores web, clientes HTTP, bases de datos y streaming.

## 2. Implementación de Referencia

La implementación recomendada usa `asyncio.TaskGroup` (Python 3.11+) sobre `gather()` para structured concurrency. `anyio` para código library-agnostic. `asyncio.timeout()` para cancellation. Semaphores para rate limiting. `run_in_executor()` para blocking I/O. `uvloop.install()` para 2x rendimiento en Linux.

### Ejemplo Práctico Avanzado

```python
# Python 3.11+ TaskGroup (preferred over asyncio.gather)
async def fetch_all(urls: list[str]) -> list[bytes]:
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(url)) for url in urls]
    return [t.result() for t in tasks]

# asyncio — timeout, shield, wait_for
try:
    result = await asyncio.wait_for(coro, timeout=5.0)
except TimeoutError:
    result = fallback

# asyncio — semaphore for rate limiting
sem = asyncio.Semaphore(10)
async def rate_limited_fetch(url: str) -> bytes:
    async with sem:
        return await fetch(url)

# anyio (library-agnostic)
import anyio
async def main() -> None:
    async with anyio.create_task_group() as tg:
        tg.start_soon(worker, "a")
        tg.start_soon(worker, "b")
anyio.run(main)

# anyio — cancellation scopes
with anyio.CancelScope() as scope:
    scope.deadline = anyio.current_time() + 5
    result = await fetch()
```

**Fuente oficial:** https://docs.python.org/3/library/asyncio.html — https://anyio.readthedocs.io/

### Alternativa de Implementación Específica

Para código que debe ser transportable entre asyncio y trio (librerías), usar `anyio` exclusivamente — abstrae backends y provee cancelación por defecto. Para aplicaciones que requieren concurrencia CPU-bound genuina (no I/O-bound), usar `multiprocessing` con `concurrent.futures.ProcessPoolExecutor` en lugar de asyncio. Para streams de datos (red, archivos binarios), `anyio.AsyncFile` y `anyio.Stream` son más seguros que los wrappers nativos.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs HTTP, WebSockets, clientes DB, scraping, procesamiento de streams, servidores con miles de conexiones concurrentes |
| **Cuándo evitar** | Código CPU-bound (procesamiento numérico, machine learning); tareas que requieren verdadero paralelismo multi-core; scripts simples donde threading con pool es más simple |
| **Alternativas** | threading: true paralelismo I/O con race conditions (más riesgoso); multiprocessing: CPU-bound, memoria separada; Trio: async nativo con cancelación por default, menos ecosistema que asyncio |
| **Coste/Complejidad** | Bajo para concurrencia simple con TaskGroup; medio si se combina with blocking I/O + executors; alto si se necesita debugging de tareas canceladas, timeout anidados, o sincronización compleja |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Task was destroyed but it is pending! warning

**¿Qué ocasionó el error?**
Se creó una tarea con `asyncio.create_task()` pero el event loop finalizó antes de que la tarea se completara. Esto ocurre típicamente en tests o scripts que no esperan a las tareas.

**¿Cómo se solucionó?**
Usar `TaskGroup` (3.11+) que espera/limpia todas las tareas al salir del contexto. O recolectar referencias y await explícito: `tasks = [asyncio.create_task(coro())]; await asyncio.gather(*tasks)`.

**¿Por qué funciona esta técnica?**
`TaskGroup` garantiza que todas las tareas hijas se completen o cancelen al salir del bloque `async with`, eliminando tareas huérfanas.

### Caso: asyncio.gather no cancela tareas al fallar una

**¿Qué ocasionó el error?**
`asyncio.gather()` con `return_exceptions=False` lanza la excepción pero las otras tareas siguen ejecutándose en background, sin ser canceladas.

**¿Cómo se solucionó?**
Reemplazar `asyncio.gather(*tasks)` con `TaskGroup`, que cancela automáticamente todas las tareas hermanas si alguna falla.

**¿Por qué funciona esta técnica?**
`TaskGroup` implementa structured concurrency — cuando una tarea hija falla, todas las tareas del mismo grupo se cancelan y el error se propaga al padre.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** Concurrencia async, TaskGroup, anyio, event loop, timeout, semaphore
- **Prioridad de carga:** Alta — async es ubicuo en APIs modernas Python
- **Dependencias:** Cargar junto con `fastapi-rest-development` si aplica APIs async

### Tool Integration

```json
{
  "tool_name": "async-python-concurrency",
  "description": "Implementa concurrencia async con asyncio TaskGroup, anyio, timeouts y rate limiting",
  "triggers": ["asyncio", "async", "await", "concurrency", "taskgroup", "anyio", "uvloop", "event loop"],
  "context_hint": "Inyectar ejemplos de TaskGroup y anyio cuando el usuario necesite concurrencia; FAQ para errores comunes",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre concurrencia en Python, carga el skill async-python-concurrency y responde
siguiendo la sección de implementación de referencia. Prioriza TaskGroup sobre gather() y anyio para librerías.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ejecutar script async
python -m my_async_script.py

# Con uvloop para rendimiento (Linux)
python -c "
import uvloop, asyncio
uvloop.install()
asyncio.run(main())
"

# Depurar tareas pendientes
python -W default -X dev my_script.py

# Perfil de event loop
python -m asyncio my_script.py   # modo debug

# AIOHTTP benchmark
python -m aiohttp.web -H 0.0.0.0 -P 8080 app:init_func

# Async tests
pytest -v -k "async" --asyncio-mode=auto
```

### GUI / Web

- **VSCode Debugger:** Soporta stepping en código async, inspección de corrutinas en CALL STACK
- **Python Debugger (pdb):** `await coro()` en pdb 3.11+ (breakpoint con soporte async)
- **asyncio Task Viewer:** `asyncio.all_tasks()` en consola de debug
- **uvloop status:** Linux `perf` + Python profiler para detectar bloqueos del event loop

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Debug script async | `python -m pdb script.py` | F5 (VSCode launch async) |
| Detectar tasks leak | `python -W default -X dev` | Python Test Explorer |
| Perfil event loop | `python -m asyncio script.py` | VSCode Python Profiler |
| Run async tests | `pytest --asyncio-mode=auto` | Ctrl+Shift+P → Test: Run |

---

## 7. Cheatsheet Rápido

```python
async with asyncio.TaskGroup() as tg:       # structured concurrency
    tg.create_task(coro())                   # auto-cancela on error
async with asyncio.timeout(5):               # timeout 3.11+
    result = await fetch()
async with sem: ...                          # rate limiting
loop.run_in_executor(None, sync_fn)          # blocking I/O bridge
anyio.run(main)                              # backend-agnostic
uvloop.install()                             # 2x perf Linux
```

```bash
python -W default -X dev script.py && pytest --asyncio-mode=auto
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `fastapi-rest-development` | Complementario — handlers async, lifespan, background tasks | Sí |
| `pytest-testing-quality` | Complementario — @pytest.mark.asyncio | Sí |
| `postgresql-advanced` | Complementario — asyncpg driver para PostgreSQL async | No |
| `background-jobs-queues` | Complementario — workers async con Celery/BullMQ | No |

---

## 9. Metadatos del Skill

```yaml
---
id: async-python-concurrency
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/async-python
tags: [asyncio, async, concurrency, python, anyio, uvloop, taskgroup, await, event-loop]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

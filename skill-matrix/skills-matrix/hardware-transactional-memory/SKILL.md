---
name: hardware-transactional-memory
description: "HTM (Hardware Transactional Memory) resuelve la contención de locks en secciones críticas mediante la ejecución especulativa de transacciones optimistas, donde el hardware detecta conflictos de acc..."
---
# Hardware Transactional Memory

## Semantic Triggers
```
Intel TSX restricted transactional memory, hardware lock elision HLE, transactional abort conflict detection, RTM restricted transactional memory, best-effort transactional memory fallback, lock elision optimization concurrency
```

---

## 1. Definición Teórica

HTM (Hardware Transactional Memory) resuelve la contención de locks en secciones críticas mediante la ejecución especulativa de transacciones optimistas, donde el hardware detecta conflictos de acceso a memoria caché entre hilos y aborta/retrocede la transacción si ocurre una colisión. El principio fundamental es que las transacciones se ejecutan sin adquirir locks; el cache coherence protocol (MESI) detecta conflictos: si otro hilo escribe en una dirección leída por la transacción, esta aborta y se reintenta (con backoff). Arquitectónicamente, Intel implementó TSX (Transactional Synchronization Extensions) con RTM (Restricted Transactional Memory) y HLE (Hardware Lock Elision) desde Haswell (2013), aunque con bugs (errata HSW136) que forzaron su desactivación en firmware para ciertos modelos. Existe como mecanismo diferenciado porque ofrece el rendimiento de estructuras lock-free con la semántica simple de transacciones atómicas, pero con la limitación de ser "best-effort" (puede abortar por causas no relacionadas con la concurrencia).

---

## 2. Implementación de Referencia

Intel TSX (RTM + HLE) en CPUs ≥Haswell/Broadwell (desactivado en algunos por errata). Idiomas: C/C++ (intrinsics `_xbegin`, `_xend`), compilador GCC ≥10 con `-mrtm`. No hay implementación en ARM (el estándar TME de ARM no se ha desplegado masivamente).

### Ejemplo Práctico Avanzado

```c
#include <immintrin.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <pthread.h>
#include <x86intrin.h>

// Estructura de datos protegida con HTM (con fallback a mutex)
typedef struct {
    int value;
    pthread_mutex_t fallback;
} HtmCounter;

// Intentar transacción RTM con fallback
void htm_increment(HtmCounter *c) {
    unsigned status;
    int retries = 5;

    while (1) {
        status = _xbegin();
        if (status == _XBEGIN_STARTED) {
            // Región transaccional
            int tmp = c->value;  // read set
            tmp++;
            c->value = tmp;     // write set

            _xend();
            return;  // éxito
        }

        // Abort: analizar causa
        if (retries-- <= 0) {
            // Fallback: adquirir mutex
            pthread_mutex_lock(&c->fallback);
            c->value++;
            pthread_mutex_unlock(&c->fallback);
            return;
        }

        // Backoff exponencial
        if (status & _XABORT_CONFLICT) {
            _mm_pause();  // esperar un poco si hay conflicto
        }
        // Otros abortos: reintentar inmediatamente
    }
}

// Hardware Lock Elision: usar transacciones sin modificar código
// (hint en la instrucción lock)
__attribute__((transaction_safe))
int hle_increment(int *p) {
    // GCC con -mhle: lock add elide automáticamente
    return __atomic_add_fetch(p, 1, __ATOMIC_SEQ_CST);
}

// Benchmark: HTM vs mutex
#define ITERATIONS 1000000
#define THREADS 4

typedef struct {
    HtmCounter *counter;
    int id;
} ThreadArg;

void* worker_htm(void *arg) {
    ThreadArg *a = arg;
    for (int i = 0; i < ITERATIONS; i++)
        htm_increment(a->counter);
    return NULL;
}

void* worker_mutex(void *arg) {
    HtmCounter *c = arg;
    for (int i = 0; i < ITERATIONS; i++) {
        pthread_mutex_lock(&c->fallback);
        c->value++;
        pthread_mutex_unlock(&c->fallback);
    }
    return NULL;
}

int main() {
    HtmCounter counter = { .value = 0 };
    pthread_mutex_init(&counter.fallback, NULL);

    // Verificar soporte HTM
    if (!__builtin_cpu_supports("rtm")) {
        printf("No RTM support (use -mrtm on compatible CPU)\n");
        return 1;
    }

    pthread_t threads[THREADS];
    ThreadArg args[THREADS];

    printf("Testing HTM with %d threads x %d iterations...\n",
           THREADS, ITERATIONS);

    for (int i = 0; i < THREADS; i++) {
        args[i] = (ThreadArg){ &counter, i };
        pthread_create(&threads[i], NULL, worker_htm, &args[i]);
    }
    for (int i = 0; i < THREADS; i++)
        pthread_join(threads[i], NULL);

    printf("Final value: %d (expected: %d)\n",
           counter.value, THREADS * ITERATIONS);

    pthread_mutex_destroy(&counter.fallback);
    return 0;
}
```

```bash
# Compilar: gcc -O2 -mrtm -pthread -o htm htm.c
./htm
```

**Fuente oficial:** https://www.intel.com/content/www/us/en/docs/intrinsics-guide/ — `_xbegin`, `_xend`

### Alternativa de Implementación Específica

**TSX lock elision (HLE) con GCC transactional memory:**

```c
// GCC Transactional Memory (TM) con HLE
int shared_var __attribute__((transaction_callable));

void update(void) {
    __transaction_atomic {
        shared_var++;
    }
}
// Compilar: gcc -O2 -fgnu-tm -mhle -o hle_tm hle.c
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Secciones críticas cortas con baja contención pero alta frecuencia, estructuras lock-free donde el ABA problem es difícil de resolver, optimización de hot locks identificados por profiling (mutex contention >5%) |
| **Cuándo evitar** | Secciones críticas largas (>1000 ciclos, alta probabilidad de abort por other reasons), sistemas con TSX desactivado (bugs hardware), código que toca >L1 cache (overflow de read/write set → abort), sistemas NUMA (alta latencia de coherencia → conflictos falsos) |
| **Alternativas** | Lock-free con CAS/CAS2 (más predecible), RCU (read-heavy), std::mutex (portable), seqlock (write con mutex, read sin lock), spinlock optimizado con `_mm_pause` |
| **Coste/Complejidad** | Alto: HTM es best-effort — puede abortar por cualquier evento (interrupción, page fault, TLB miss, SMT contention). Requiere fallback obligatorio (mutex). El modelo de programación (fallback path) duplica la lógica de la sección crítica y puede introducir bugs |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: _xbegin aborta inmediatamente sin conflicto

**¿Qué ocasionó el error?**
La transacción abortaba con `_XABORT_RETRY` (bit 0) más `_XABORT_CAPACITY` (bit 3). El read/write set de la transacción excedía la capacidad de L1 cache (32KB). Causas típicas: tocar demasiadas direcciones de memoria distintas dentro de la transacción.

**¿Cómo se solucionó?**
Reducir el tamaño del read/write set:

```c
// ❌ Aborta por capacity: tocar todo un array
int sum = 0;
for (int i = 0; i < 1000; i++)
    sum += data[i];  // read set = 1000 addresses → abort

// ✅ Compacto: solo tocar lo esencial
_xbegin();
int idx = shared_index;
int val = data[idx];  // read set mínimo
sum += val;
_xend();
```

**¿Por qué funciona esta técnica?**
HTM mantiene el read/write set en las cachés L1. Si el set excede ∼8KB (Skylake) o ∼32KB (Haswell) de direcciones únicas, la transacción aborta por capacity. Mantener el set pequeño (accesos a pocas direcciones) maximiza la probabilidad de commit.

### Caso: TSX aborta por conflicto con el kernel (syscall)

**¿Qué ocasionó el error?**
Dentro de la transacción `_xbegin`...`_xend`, se llamaba a `printf()`, que internamente hace una syscall (`write`). Cualquier syscall dentro de una transacción TSX causa abort inmediato (el kernel no es transactional).

**¿Cómo se solucionó?**
Mover toda syscall fuera de la transacción:

```c
// ❌ Aborta por syscall dentro de transacción
_xbegin();
printf("value: %d\n", counter->value);
counter->value++;
_xend();

// ✅ Solo operaciones de memoria dentro
_xbegin();
int val = counter->value;
counter->value = val + 1;
_xend();
printf("value: %d\n", val + 1);  // syscall fuera de transacción
```

**¿Por qué funciona esta técnica?**
TSX aborta cualquier transacción que sufre un event no transactional (syscall, interrupción, page fault, TLB miss). Las únicas operaciones soportadas dentro de transacciones son accesos a memoria y operaciones aritméticas simples.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~175 tokens estimados al invocar este skill
- **Trigger de activación:** `Intel TSX restricted transactional memory`
- **Prioridad de carga:** Baja — hardware específico, no disponible en todos los CPUs
- **Dependencias:** `07-lock-free-data-structures` (alternativa a HTM), `06-cpu-cache-locality-alignment` (L1 capacity)

### Tool Integration

```json
{
  "tool_name": "hardware-transactional-memory",
  "description": "Memoria transaccional por hardware con Intel TSX (RTM/HLE): transacciones best-effort con fallback",
  "triggers": ["TSX", "transactional memory", "HTM", "RTM", "HLE", "_xbegin", "lock elision"],
  "context_hint": "Inyectar ejemplo de RTM con _xbegin/_xend y fallback a mutex",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre memoria transaccional por hardware o Intel TSX,
carga el skill hardware-transactional-memory. Proporciona ejemplos de _xbegin/_xend
con fallback a mutex. Explica las restricciones de capacity y eventos que abortan.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Verificar soporte TSX en CPU
grep rtm /proc/cpuinfo  # "rtm" en flags = soporte
grep tsx /proc/cpuinfo

# Test de rendimiento HTM vs mutex
./htm 2>&1

# Monitorear aborts TSX
perf stat -e tx_start,tx_commit,tx_abort ./htm

# Ver aborts por tipo
perf stat -e 'tx_mem_abort_*' ./htm
```

### GUI / Web

- **Intel VTune**: análisis de HTM con conteo de transacciones, commits, aborts y causas
- **`perf` tx counters**: eventos `tx_start`, `tx_commit`, `tx_abort`, `tx_mem_abort_*`
- **TSX-Tools**: suite de tests para diagnosticar soporte TSX en CPUs
- **CPU-Z**: verificar si TSX está habilitado en el firmware

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver soporte TSX | `grep rtm /proc/cpuinfo` | `CPU-Z → Instructions → TSX` |
| Contar aborts | `perf stat -e tx_abort ./app` | `VTune → HTM Analysis` |
| Test RTM | `gcc -mrtm -o test test.c && ./test` | `TSX-Tools → Test Suite` |

---

## 7. Cheatsheet Rápido

```c
// RTM (TSX) — 10 líneas
#include <immintrin.h>

unsigned status = _xbegin();
if (status == _XBEGIN_STARTED) {
    // Sección crítica transaccional
    shared_var++;  // write set
    _xend();
} else {
    // Fallback obligatorio
    pthread_mutex_lock(&mtx);
    shared_var++;
    pthread_mutex_unlock(&mtx);
}
// Ver: grep rtm /proc/cpuinfo
// Compilar: gcc -mrtm -pthread
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-lock-free-data-structures` | alternativo — CAS loop vs HTM | Sí |
| `06-cpu-cache-locality-alignment` | dependiente — L1 capacity para read/write set | Sí |
| `24-instruction-level-parallelism` | complementario — pipeline OoO + TSX | No |
| `02-concurrency-actor-model` | alternativo — sin estado compartido | No |

---

## 9. Metadatos del Skill

```yaml
---
id: hardware-transactional-memory
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [TSX, HTM, RTM, HLE, Intel, transactional-memory, lock-elision, _xbegin, concurrency]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

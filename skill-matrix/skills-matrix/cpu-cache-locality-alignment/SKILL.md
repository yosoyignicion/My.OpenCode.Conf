---
name: cpu-cache-locality-alignment
description: "La localidad de caché resuelve el problema del memory wall (la CPU está inactiva >50% del tiempo esperando memoria) mediante la organización de datos para maximizar aciertos en caché L1/L2/L3"
---
# CPU Cache Locality & Alignment

## Semantic Triggers
```
cache line false sharing in concurrent data structures, cache-friendly data layout AoS vs SoA, alignment padding cache line size, prefetching __builtin_prefetch, data-oriented design ECS, NUMA-aware memory allocation
```

---

## 1. Definición Teórica

La localidad de caché resuelve el problema del memory wall (la CPU está inactiva >50% del tiempo esperando memoria) mediante la organización de datos para maximizar aciertos en caché L1/L2/L3. El principio fundamental es que la jerarquía de memoria (L1 ∼1ns, L2 ∼4ns, L3 ∼12ns, DRAM ∼100ns) penaliza los accesos no secuenciales; el diseño cache-friendly agrupa datos accedidos conjuntamente en la misma cache line (64 bytes en x86). Arquitectónicamente, el patrón AoS (Array of Structures) para acceso por registro se convierte en SoA (Structure of Arrays) cuando se procesan todos los registros de un campo secuencialmente. Existe como técnica diferenciada porque el compilador no puede reordenar estructuras arbitrariamente para optimizar la localidad —requiere diseño explícito de data layout.

---

## 2. Implementación de Referencia

C++20/23 con `alignas`, `std::hardware_destructive_interference_size`, `std::hardware_constructive_interference_size`. Idiomas: C++, Rust (repr, align), Zig.

### Ejemplo Práctico Avanzado

```cpp
#include <new>          // std::hardware_destructive_interference_size
#include <atomic>
#include <array>
#include <thread>
#include <vector>

// False sharing: dos threads modifican variables en la misma cache line
struct alignas(std::hardware_destructive_interference_size) PaddedCounter {
    alignas(64) std::atomic<int> value{0};
    // Padding implícito al tamaño de cache line
};

// Sin padding: false sharing garantizado
struct BadCounter {
    std::atomic<int> value{0};
};

// SoA (Structure of Arrays) vs AoS (Array of Structures)
struct AoS_Particle {
    float x, y, z;  // 12 bytes, pero cada iteración salta 12 bytes
    uint8_t type;
    // 16 bytes total, 4 por cache line -> solo 4 partículas por línea
};

struct SoA_Particles {
    std::vector<float> x, y, z;
    std::vector<uint8_t> type;
    // Iterar x: acceso secuencial, 16 floats por cache line
};

// Benchmark de localidad
void processAoS(std::vector<AoS_Particle>& particles) {
    for (auto& p : particles)
        p.x *= 1.5f;  // cada iteración salta 16 bytes -> cache miss
}

void processSoA(SoA_Particles& particles) {
    for (auto& x : particles.x)
        x *= 1.5f;  // acceso secuencial -> cache hit ~95%
}

// Prefetching explícito
void processWithPrefetch(const int* data, size_t n) {
    for (size_t i = 0; i < n; i++) {
        __builtin_prefetch(&data[i + 8], 0, 3);  // 0=read, 3=high temporal
        process(data[i]);  // data[i] ya está en caché
    }
}
```

**Fuente oficial:** https://www.intel.com/content/www/us/en/developer/articles/technical/cache-friendly-code.html

### Alternativa de Implementación Específica

**Rust — repr(C) y alignment explícito:**

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::cell::UnsafeCell;

#[repr(C, align(64))]  // alinear a cache line
struct PaddedCounter {
    value: AtomicU64,
    _padding: [u8; 56],  // 64 - 8 bytes del AtomicU64
}

// ECS pattern para localidad de caché
struct Position { x: f32, y: f32, z: f32 }
struct Velocity { x: f32, y: f32, z: f32 }

struct SoAStorage {
    position: Vec<Position>,
    velocity: Vec<Velocity>,
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Hot loops donde >5% del tiempo se gasta en stall de memoria, estructuras accedidas concurrentemente de forma independiente, processing de grandes datasets (>L3), motores de juegos/physics, bases de datos in-memory |
| **Cuándo evitar** | Código con acceso aleatorio (árboles, hash maps — el patrón de acceso es inherentemente cache-unfriendly), prototipado prematuro, datos pequeños que caben en registros, optimización sin perfilado previo |
| **Alternativas** | `__builtin_prefetch` (hints explícitos), Restrict pointers (aliasing hints), `madvise` (sequential/random advice al kernel), PMU counters (verificar en lugar de asumir) |
| **Coste/Complejidad** | Medio: SoA requiere cambio estructural que complica el código. La optimización prematura de caché puede empeorar la legibilidad sin beneficio medible. Siempre validar con `perf stat -e cache-misses` |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: False sharing anula paralelismo en std::atomic counters

**¿Qué ocasionó el error?**
Dos hilos incrementan contadores `std::atomic<int>` en un array contiguo. Ambos contadores caen en la misma cache line de 64 bytes. El protocolo MESI invalida la línea en cada modificación, causando 100x slowdown vs esperado.

**¿Cómo se solucionó?**
Padding explícito con `alignas(64)` para separar los contadores:

```cpp
struct alignas(64) Counter {
    std::atomic<int> val{0};
    char padding[64 - sizeof(std::atomic<int>)];  // llenar la cache line
};
Counter counters[NUM_THREADS];
// Ahora cada thread tiene su propia cache line
```

**¿Por qué funciona esta técnica?**
`alignas(64)` fuerza cada instancia a comenzar en una cache line distinta. El padding llena el resto de la línea, evitando que otro contador comparta la línea. El protocolo MESI ya no invalida entre hilos.

### Caso: SoA no mejora rendimiento porque el compilador vectoriza AoS

**¿Qué ocasionó el error?**
El compilador auto-vectorizó el bucle AoS usando SIMD, agrupando accesos en registros vectoriales y ocultando la latencia de memoria. SoA no mostró mejora porque el cuello de botella no era caché sino ALU.

**¿Cómo se solucionó?**
Medir primero con `perf stat -e cache-misses,stalled-cycles-backend`:

```bash
perf stat -e cache-misses,instructions,cycles ./aos_version
# Si cache-misses/instructions < 1%, el cuello de botella no es caché
# Si stalled-cycles-backend/cycles > 30%, es ALU/mem
```

**¿Por qué funciona esta técnica?**
Lo que se mide se puede optimizar. Sin perf stat, las optimizaciones de caché son conjeturas. El performance engineering correcto requiere medir antes y después.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~170 tokens estimados al invocar este skill
- **Trigger de activación:** `cache line false sharing in concurrent data structures`
- **Prioridad de carga:** Alta — optimización crítica para rendimiento multihilo
- **Dependencias:** `28-performance-profiling-optimization` (medición de misses), `10-simd-vectorization` (complemento para SoA+SIMD)

### Tool Integration

```json
{
  "tool_name": "cpu-cache-locality-alignment",
  "description": "Optimización de localidad de caché, false sharing, y diseño data-oriented",
  "triggers": ["cache line", "false sharing", "SoA", "AoS", "alignment", "cache-friendly", "prefetch"],
  "context_hint": "Inyectar ejemplo de false sharing con padding y SoA para data-oriented design",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre optimización de caché CPU o false sharing, carga el skill
cpu-cache-locality-alignment. Proporciona ejemplos de padding con alignas(64) y
cómo convertir AoS a SoA para procesamiento secuencial.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Medir cache misses
perf stat -e cache-references,cache-misses,stalled-cycles-backend ./app

# Ver tamaño de cache line
getconf LEVEL1_DCACHE_LINESIZE  # 64 en x86 moderno

# Analizar false sharing
perf c2c record ./app   # detecta contention en cache lines
perf c2c report         # reporte con heatmap de lines compartidas

# Ver distribución de struct
pahole ./app -C MyStruct  # muestra padding y holes
```

### GUI / Web

- **Perf c2c report**: visualización de heatmap de false sharing (cache-to-cache transfers)
- **Cachegrind / QCachegrind**: simulación de jerarquía de caché con coloreado por hits/misses
- **Intel VTune**: Memory Access Analysis con detección de NUMA y bandwidth
- **Valgrind --tool=cachegrind**: `cg_annotate` para ver misses por línea de código

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Medir cache misses | `perf stat -e cache-misses ./app` | `VTune → Memory Access → Hotspots` |
| Analizar false sharing | `perf c2c record ./app && perf c2c report` | `perf c2c report --stdio` |
| Ver padding de struct | `pahole ./app -C MyStruct` | `VSCode → Hex Editor View` |

---

## 7. Cheatsheet Rápido

```cpp
// False sharing fix — 5 líneas
struct alignas(64) SafeCounter {
    std::atomic<int> val{0};
};

// SoA pattern — 3 líneas
struct SoA { vector<float> x, y, z; };  // vs struct AoS { float x,y,z; };
// SoA: acceso secuencial -> ~95% cache hit
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `28-performance-profiling-optimization` | dependiente — medición de misses | Sí |
| `10-simd-vectorization` | complementario — SoA + SIMD = máximo rendimiento | Sí |
| `20-numa-architectures-tuning` | complementario — localidad cross-NUMA | No |
| `07-lock-free-data-structures` | dependiente — false sharing crítico en lock-free | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: cpu-cache-locality-alignment
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [cpu-cache, false-sharing, SoA, alignment, cache-friendly, MESI, data-oriented]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

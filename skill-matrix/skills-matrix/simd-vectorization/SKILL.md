---
name: simd-vectorization
description: "SIMD (Single Instruction Multiple Data) resuelve el problema del throughput limitado en bucles que procesan datos independientes al ejecutar la misma operación sobre múltiples elementos simultáneam..."
---
# SIMD & Vectorization

## Semantic Triggers
```
AVX-512 vectorized loop optimization, SSE intrinsics manual vectorization, auto-vectorization compiler hints, SLP superword-level parallelism, gather scatter vectorized memory access, SIMD math library performance
```

---

## 1. Definición Teórica

SIMD (Single Instruction Multiple Data) resuelve el problema del throughput limitado en bucles que procesan datos independientes al ejecutar la misma operación sobre múltiples elementos simultáneamente. El principio fundamental es que los registros vectoriales (128-bit SSE, 256-bit AVX2, 512-bit AVX-512) pueden contener múltiples valores escalares, y las instrucciones vectoriales operan sobre todos ellos en un ciclo. Arquitectónicamente, la vectorización puede ser automática (compilador detecta bucles vectorizables), semiautomática (directivas `#pragma omp simd`), o manual (intrinsics en C/C++, Rust `core::simd`). Existe como técnica diferenciada porque explota el paralelismo a nivel de datos (DLP) que el hardware ofrece, distinto del paralelismo a nivel de hilo (TLP) o instrucción (ILP).

---

## 2. Implementación de Referencia

Compiladores: GCC ≥13, Clang ≥17, MSVC ≥2022 con flags `-O3 -march=native -mavx2 -mfma`. Idiomas: C/C++ (intrinsics, auto-vectorization), Rust (core::simd, `wide` crate), Python (NumPy que usa SIMD), Fortran.

### Ejemplo Práctico Avanzado

```cpp
#include <immintrin.h>   // AVX-512 intrinsics
#include <cstdint>
#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>

// Método 1: Auto-vectorization con pragma
auto sum_auto(const std::vector<float>& data) -> float {
    float sum = 0.0f;
    #pragma omp simd reduction(+:sum)
    for (size_t i = 0; i < data.size(); i++) {
        sum += data[i];
    }
    return sum;
}

// Método 2: AVX-512 manual intrinsics
auto sum_avx512(const float* data, size_t n) -> float {
    __m512 sum_vec = _mm512_setzero_ps();
    size_t i = 0;

    // Procesar 16 floats por iteración
    for (; i + 16 <= n; i += 16) {
        __m512 vec = _mm512_loadu_ps(&data[i]);
        sum_vec = _mm512_add_ps(sum_vec, vec);
    }

    // Reducir: sumar los 16 valores del registro
    float sum_array[16];
    _mm512_storeu_ps(sum_array, sum_vec);
    float sum = std::accumulate(sum_array, sum_array + 16, 0.0f);

    // Epílogo: elementos restantes
    for (; i < n; i++) sum += data[i];

    return sum;
}

// Método 3: FMA (Fused Multiply-Add) — operación más común en ML
auto dot_product_avx512(const float* a, const float* b, size_t n) -> float {
    __m512 sum = _mm512_setzero_ps();
    size_t i = 0;

    for (; i + 16 <= n; i += 16) {
        __m512 va = _mm512_loadu_ps(&a[i]);
        __m512 vb = _mm512_loadu_ps(&b[i]);
        sum = _mm512_fmadd_ps(va, vb, sum);  // sum += a[i] * b[i]
    }

    float res[16];
    _mm512_storeu_ps(res, sum);
    float result = std::accumulate(res, res + 16, 0.0f);
    for (; i < n; i++) result += a[i] * b[i];
    return result;
}

int main() {
    std::vector<float> data(1 << 20, 1.0f);
    auto r1 = sum_auto(data);
    auto r2 = sum_avx512(data.data(), data.size());
    std::cout << "Auto: " << r1 << " AVX-512: " << r2 << "\n";
    return 0;
}
```

**Fuente oficial:** https://www.intel.com/content/www/us/en/docs/intrinsics-guide/ — Intel Intrinsics Guide

### Alternativa de Implementación Específica

**Rust — core::simd (estabilizado en nightly, estable desde 1.80+):**

```rust
#![feature(portable_simd)]
use std::simd::{f32x16, StdFloat};

fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    let mut sum = f32x16::splat(0.0);
    let mut i = 0;

    while i + 16 <= a.len() {
        let va = f32x16::from_slice(&a[i..]);
        let vb = f32x16::from_slice(&b[i..]);
        sum = sum * (va * vb).to_owned();  // o usar mul_add
        i += 16;
    }

    let mut total = sum.reduce_sum();
    for j in i..a.len() { total += a[j] * b[j]; }
    total
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Bucles numéricos intensivos (matemáticas, ML, procesamiento de señal, audio/video, gráficos) donde los datos son independientes y el cuello de botella es ALU, no memoria |
| **Cuándo evitar** | Bucles con dependencias de datos (reducciones no asociativas), acceso aleatorio a memoria, lógica condicional divergente dentro del bucle, datos pequeños donde el overhead de setup domina |
| **Alternativas** | OpenMP SIMD (`#pragma omp simd` — más portable que intrinsics), auto-vectorization con `-fopt-info-vec` (sin mantenimiento), GPU/CUDA (paralelismo masivo, >1000 elementos), `std::execution::par_unseq` (C++17 políticas de ejecución) |
| **Coste/Complejidad** | Medio-alto: intrinsics manual requieren mantenimiento por arquitectura. Auto-vectorization es frágil (cambios pequeños rompen la vectorización). El speedup típico es 2-8x, no 16x por límites de memoria |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Auto-vectorization falla silenciosamente

**¿Qué ocasionó el error?**
El compilador no pudo vectorizar un bucle porque había un puntero alias (`restrict` ausente) o porque el bucle contenía una operación no asociativa (reducción de punto flotante sin `-ffast-math`).

**¿Cómo se solucionó?**
Verificar con `-fopt-info-vec` y corregir las barreras:

```bash
# Compilar con diagnóstico de vectorización
clang++ -O3 -march=native -Rpass=loop-vectorize -Rpass-missed=loop-vectorize main.cpp

# Salida esperada:
# main.cpp:5:5: loop vectorized using 16-byte vectors
# main.cpp:5:5: loop not vectorized: unsafe dependent memory operations
```

Correcciones típicas:
```cpp
// 1. Agregar restrict
float sum_vectorized(const float* __restrict__ a, const float* __restrict__ b, float* __restrict__ c) { ... }

// 2. Habilitar reducciones asociativas (-ffast-math o #pragma STDC FP_CONTRACT ON)
// 3. Usar contadores ascendentes (no descendentes)
for (int i = 0; i < n; i++)  // vectorizable
for (int i = n-1; i >= 0; i--)  // no vectorizable por defecto
```

**¿Por qué funciona esta técnica?**
`__restrict__` garantiza al compilador que los punteros no se superponen, eliminando la dependencia de memoria. `-ffast-math` permite tratar las operaciones de punto flotante como asociativas (a+(b+c) == (a+b)+c), que no es cierto en IEEE 754 pero es aceptable para la mayoría de aplicaciones.

### Caso: Gather instructions más lentas que escalar

**¿Qué ocasionó el error?**
AVX-512 gather (`_mm512_i32gather_ps`) se usó para acceder a un array con índices no secuenciales. Aunque procesa 16 valores a la vez, cada acceso gather genera 16 transacciones de caché separadas, saturando el puerto de memoria.

**¿Cómo se solucionó?**
Usar gather solo cuando los índices tienen cierta localidad, y preferir `_mm256_i32gather_epi32` con prefetching:

```cpp
// Gather solo si los índices están en el mismo rango de 4KB
if (max_index - min_index < 4096) {
    __m512 vals = _mm512_i32gather_ps(indices, data, 4);
    // ~2-3x sobre escalar si hay localidad
} else {
    for (int i = 0; i < 16; i++)
        result[i] = data[indices[i]];  // escalar
}
```

**¿Por qué funciona esta técnica?**
Gather traduce cada elemento a una micro-op de carga. Si las direcciones están en líneas de caché diferentes, se satura el puerto de memoria. Con localidad espacial en el mismo bloque de 4KB, el prefetcher de hardware puede traer múltiples líneas en paralelo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `AVX-512 vectorized loop optimization`
- **Prioridad de carga:** Media — optimización de rendimiento para cómputo numérico
- **Dependencias:** `06-cpu-cache-locality-alignment` (data layout for SIMD), `28-performance-profiling-optimization` (medición de speedup)

### Tool Integration

```json
{
  "tool_name": "simd-vectorization",
  "description": "Vectorización SIMD con AVX-512, SSE, auto-vectorization e intrinsics manuales",
  "triggers": ["SIMD", "AVX", "vectorization", "intrinsics", "auto-vectorize", "OpenMP SIMD", "FMA"],
  "context_hint": "Inyectar ejemplo de intrinsics AVX-512 para bucles numéricos y diagnóstico de auto-vectorization",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre vectorización SIMD o aceleración de bucles numéricos,
carga el skill simd-vectorization. Proporciona ejemplos de intrinsics AVX-512
y técnicas de auto-vectorization con diagnóstico del compilador.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Verificar soporte SIMD de la CPU
grep flags /proc/cpuinfo | head -1 | tr ' ' '\n' | grep -E 'avx|sse|fma|amx'

# Diagnóstico de vectorización del compilador
clang++ -O3 -march=native -Rpass=loop-vectorize -Rpass-missed=loop-vectorize main.cpp

# Benchmark de versiones escalar vs SIMD
perf stat -e fp_arith_inst_retired.256b_packed_single ./avx512_app

# Ver asm generado
objdump -d app | grep -E 'vaddps|vfmadd|vmulps'
```

### GUI / Web

- **Intel Intrinsics Guide**: https://www.intel.com/content/www/us/en/docs/intrinsics-guide/
- **Compiler Explorer (Godbolt)**: comparar código SIMD generado por diferentes compiladores
- **VTune Amplifier**: análisis de utilización de puertos vectoriales
- **LLVM-MCA**: simulación de pipeline para código vectorial

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver flags SIMD de CPU | `grep avx512 /proc/cpuinfo` | `CPU-Z / HWInfo` |
| Diagnosticar vectorización | `clang++ -Rpass=loop-vectorize main.cpp` | `Compiler Explorer → Optimization Report` |
| Ver asm vectorial | `objdump -d app | grep vaddps` | `Godbolt → clang -O3 -march=native` |

---

## 7. Cheatsheet Rápido

```cpp
// AVX-512 dot product — 10 líneas
__m512 sum = _mm512_setzero_ps();
for (; i + 16 <= n; i += 16)
    sum = _mm512_fmadd_ps(
        _mm512_loadu_ps(&a[i]),
        _mm512_loadu_ps(&b[i]),
        sum);
float res[16];
_mm512_storeu_ps(res, sum);
// resultado = std::accumulate(res, res + 16, 0.0f)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-cpu-cache-locality-alignment` | complementario — SoA layout para SIMD | Sí |
| `28-performance-profiling-optimization` | dependiente — medición de speedup real | Sí |
| `24-instruction-level-parallelism` | complementario — ILP vs DLP (SIMD) | No |
| `31-cpp-audio-development` | dependiente — SIMD en DSP audio | No |

---

## 9. Metadatos del Skill

```yaml
---
id: simd-vectorization
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [SIMD, AVX-512, SSE, vectorization, intrinsics, auto-vectorize, FMA, performance]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

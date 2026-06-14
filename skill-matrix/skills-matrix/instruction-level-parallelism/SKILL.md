---
name: instruction-level-parallelism
description: "ILP (Instruction-Level Parallelism) resuelve la ejecución secuencial de instrucciones mediante la ejecución simultánea de múltiples instrucciones independientes en un mismo núcleo, explotando el pa..."
---
# Instruction-Level Parallelism

## Semantic Triggers
```
superscalar pipeline instruction throughput, out-of-order execution and reorder buffer, speculative execution branch prediction, data hazards RAW WAR WAW, instruction scheduling compiler, software pipelining modulo scheduling
```

---

## 1. Definición Teórica

ILP (Instruction-Level Parallelism) resuelve la ejecución secuencial de instrucciones mediante la ejecución simultánea de múltiples instrucciones independientes en un mismo núcleo, explotando el paralelismo inherente en el flujo de código. El principio fundamental es que las CPUs modernas son superscalares (ejecutan múltiples instrucciones por ciclo), con ejecución fuera de orden (OoO) que reordena instrucciones para maximizar el uso de unidades funcionales, y predicción de saltos (branch prediction) para evitar paradas en el pipeline. Arquitectónicamente, el pipeline se divide en fetch, decode, rename, issue, execute, writeback, commit — con buffers de reordenación (ROB) y estaciones de reserva que gestionan dependencias RAW (read-after-write), WAR (write-after-read) y WAW (write-after-write). Existe como concepto fundamental porque el programador y el compilador pueden reordenar código para exponer ILP (software pipelining) que la CPU OoO explota para mayor throughput.

---

## 2. Implementación de Referencia

Arquitecturas: x86-64 (Intel Core, AMD Zen), ARM (Cortex-X). Compiladores: GCC ≥13, Clang ≥17 con `-O3 -march=native`. Idiomas: C, C++, Rust.

### Ejemplo Práctico Avanzado

```c
#include <stdio.h>
#include <stdint.h>
#include <time.h>

// Dependencias de datos vs independencia
// RAW (Read After Write): depende de resultado anterior
float compute_raw(float *a, int n) {
    float acc = 0;
    for (int i = 0; i < n; i++)
        acc = acc * 0.5f + a[i];  // cada iteración depende de la anterior
    return acc;
}

// Independiente: sin dependencias entre operaciones
void compute_indep(float *a, float *b, float *c, int n) {
    for (int i = 0; i < n; i++)
        c[i] = a[i] + b[i];  // cada suma es independiente
}

// Software pipelining: desenrollar para exponer ILP
float compute_pipelined(float *a, int n) {
    float acc0 = 0, acc1 = 0;
    int i = 0;

    // Procesar 2 elementos por iteración
    for (; i + 1 < n; i += 2) {
        acc0 = acc0 * 0.5f + a[i];     // 1er acumulador
        acc1 = acc1 * 0.5f + a[i + 1]; // 2o acumulador (independiente)
    }

    // Combinar resultados
    acc0 = acc0 * 0.5f + acc1;

    // Elemento final
    for (; i < n; i++) acc0 = acc0 * 0.5f + a[i];
    return acc0;
}

// Benchmark comparativo
int main() {
    int n = 100000000;
    float *a = malloc(n * sizeof(float));
    float *c = malloc(n * sizeof(float));
    for (int i = 0; i < n; i++) a[i] = (float)i / n;

    struct timespec t0, t1;

    clock_gettime(CLOCK_MONOTONIC, &t0);
    float r1 = compute_raw(a, n);
    clock_gettime(CLOCK_MONOTONIC, &t1);
    double t_raw = (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9;

    clock_gettime(CLOCK_MONOTONIC, &t0);
    float r2 = compute_pipelined(a, n);
    clock_gettime(CLOCK_MONOTONIC, &t1);
    double t_pipe = (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9;

    printf("Results: raw=%.6f pipelined=%.6f (match: %d)\n",
           r1, r2, r1 == r2);
    printf("Raw:       %.3f s\n", t_raw);
    printf("Pipelined: %.3f s\n", t_pipe);
    printf("Speedup:   %.2fx\n", t_raw / t_pipe);

    free(a);
    free(c);
    return 0;
}
```

```bash
# Ver assembly para identificar pipeline
gcc -O3 -march=native -S -o output.s ilp.c
# Buscar: múltiples addss/vaddss entremezcladas (ILP expuesto)

# Análisis de pipeline con LLVM-MCA
llvm-mca -march=x86-64 -mcpu=native output.s
```

**Fuente oficial:** https://www.agner.org/optimize/instruction_tables.pdf — Agner Fog's Instruction Tables

### Alternativa de Implementación Específica

**Rust — ParallelIterator para exponer ILP de datos:**

```rust
use rayon::prelude::*;

fn independent_ops(data: &[f32]) -> f32 {
    // Suma: reduce es secuencial en el acumulador
    // Pero rayon paraleliza el bucle en múltiples hilos
    data.par_iter().sum()
}

fn transform_parallel(v: &mut [f32]) {
    // Vec → f32::sin es independiente por elemento
    v.par_iter_mut().for_each(|x| *x = x.sin());
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Bucles numéricos críticos (DSP, ML, procesamiento de señal), hot spots después de profiling, cuando el compilador no expone suficiente ILP automáticamente |
| **Cuándo evitar** | Carga de trabajo limitada por memoria (cache misses), código con dependencias de datos fuertes (la CPU OoO ya expone ILP), prototipado sin medida (el compilador hace buen trabajo con `-O3`) |
| **Alternativas** | SIMD (paralelismo de datos explícito, más fácil que ILP manual), OpenMP (paralelismo a nivel de hilo), auto-vectorization (`-O3 -march=native`), `-funroll-loops` (desenrollado automático) |
| **Coste/Complejidad** | Alto: software pipelining es difícil de mantener y puede empeorar con nuevas microarquitecturas. El compilador ya expone ILP en la mayoría de casos. Solo justificable cuando se verifica >10% mejora con `perf stat` |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Desenrollado manual de bucle empeora el rendimiento

**¿Qué ocasionó el error?**
El desenrollado expuso ILP pero aumentó el uso de registros, causando spill a memoria (stack). El compilador no pudo asignar todos los acumuladores a registros, y el spill de memoria anuló el beneficio del ILP.

**¿Cómo se solucionó?**
Reducir el factor de desenrollado y verificar register pressure con el compilador:

```bash
# Ver register pressure (spill)
gcc -O3 -march=native -fno-tree-pre -fno-ivopts -S -o /dev/stdout ilp.c | grep -c 'rsp\|push\|pop'

# Limitar el desenrollado a lo que la CPU soporta
gcc -O3 -funroll-loops --param max-unroll-times=2 main.c
```

En código:
```c
#define UNROLL 4  // probar 2, 4, 8 — monitorear spill con objdump
for (...) {
    sum0 += a[i];
    sum1 += a[i+1];
    sum2 += a[i+2];
    sum3 += a[i+3];
}
```

**¿Por qué funciona esta técnica?**
Cada acumulador necesita un registro. x86-64 tiene 16 registros SIMD (XMM0-XMM15). Si el desenrollado requiere más registros de los disponibles, el compilador spilla a memoria (push/pop). Las instrucciones de memoria añaden latencia que puede superar el beneficio del ILP. Probar diferentes factores de desenrollado.

### Caso: Saltos impredecibles matan el pipeline

**¿Qué ocasionó el error?**
Un bucle contenía un condicional con patrón impredecible (e.g., `if (hash[i] % 2 == 0)`), causando ∼50% de branch mispredictions. Cada misprediction cuesta ∼15 ciclos de pipeline flush.

**¿Cómo se solucionó?**
Reemplazar el branch con cmov (conditional move) o predecir el patrón:

```c
// ❌ Branch impredecible (50% mispredict)
int sum = 0;
for (int i = 0; i < n; i++)
    if (data[i] > threshold)
        sum += data[i];

// ✅ Branchless con conditional move
int sum = 0;
for (int i = 0; i < n; i++) {
    int mask = (data[i] > threshold) - 1;  // 0 o -1
    sum += data[i] & mask;  // & mask filtra
}
```

**¿Por qué funciona esta técnica?**
`cmov` no requiere predicción: el resultado se calcula especulativamente y se selecciona con una máscara. Sin branch, no hay pipeline flush por misprediction. La penalización de calcular ambos caminos (∼1 ciclo extra) se compensa con eliminar ∼15 ciclos de miss en branches impredecibles.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~175 tokens estimados al invocar este skill
- **Trigger de activación:** `superscalar pipeline instruction throughput`
- **Prioridad de carga:** Media — optimización avanzada para hot paths
- **Dependencias:** `10-simd-vectorization` (SIMD como ILP explícito), `28-performance-profiling-optimization` (medición de IPC)

### Tool Integration

```json
{
  "tool_name": "instruction-level-parallelism",
  "description": "Paralelismo a nivel de instrucción: pipeline superscalar, OoO, software pipelining, branch prediction",
  "triggers": ["ILP", "superscalar", "out-of-order", "software pipelining", "branch prediction", "pipeline", "RAW hazard"],
  "context_hint": "Inyectar ejemplo de software pipelining con desenrollado y comparación de throughput",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre paralelismo a nivel de instrucción o pipeline de CPU,
carga el skill instruction-level-parallelism. Proporciona ejemplos de software pipelining
y branchless programming. Explica cómo el compilador expone ILP con -O3.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Medir IPC (Instructions Per Cycle)
perf stat -e cycles,instructions ./app
# IPC = instructions / cycles (ideal: >2 para CPUs modernas)

# Ver branch misprediction
perf stat -e branch-misses,branch-instructions ./app
# Ratio <1% es bueno; >5% indica branches impredecibles

# Análisis de pipeline con LLVM-MCA
llvm-mca -mcpu=skylake -iterations=1000 my_hot_loop.s

# Ver hardware counters detallados
perf list | grep pipeline
```

### GUI / Web

- **Intel VTune (uArch Explorer)**: análisis de pipeline, front-end bound, bad speculation
- **LLVM-MCA Online**: https://llvm-mca.com/ (simulación web de pipeline)
- **Agner Fog's Instruction Tables**: latencia y throughput por instrucción
- **`perf top` -e uops_retired.slots**: monitoreo de pipeline en vivo

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Medir IPC | `perf stat -e cycles,instructions ./app` | `VTune → uArch Analysis` |
| Ver branch miss | `perf stat -e branch-misses ./app` | `VTune → Bad Speculation` |
| Simular pipeline | `llvm-mca -mcpu=native hot.s` | `LLVM-MCA Online` |

---

## 7. Cheatsheet Rápido

```cpp
// Branchless — 7 líneas
// En lugar de: if (x > t) sum += x;
int mask = (x > t) - 1;  // 0 si falso, -1 si verdadero
sum += x & mask;

// Software pipelining (2-way)
sum0 += a[i]; sum1 += a[i+1];
// Luego combinar: sum0 += sum1
// Mide IPC: perf stat -e cycles,instructions
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `10-simd-vectorization` | complementario — SIMD expone DLP + ILP | Sí |
| `28-performance-profiling-optimization` | dependiente — medir IPC y branch miss | Sí |
| `15-assembly-inline-optimizations` | complementario — instrucciones específicas | No |
| `06-cpu-cache-locality-alignment` | complementario — cache misses limitan ILP | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: instruction-level-parallelism
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [ILP, superscalar, OoO, pipeline, software-pipelining, branch-prediction, IPC, SIMD]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: performance-profiling-optimization
description: "El profiling de rendimiento resuelve la identificación sistemática de cuellos de botella en software mediante la medición de dónde se gasta el tiempo de CPU, la memoria, o la latencia de I/O"
---
# Performance Profiling & Optimization

## Semantic Triggers
```
perf top sampling profiler production, Valgrind Cachegrind Callgrind cache simulation, Tracy real-time profiler C++ Rust, Google Benchmark microbenchmark regression, heaptrack heap profiling allocation, hotspot detection perf annotate assembly
```

---

## 1. Definición Teórica

El profiling de rendimiento resuelve la identificación sistemática de cuellos de botella en software mediante la medición de dónde se gasta el tiempo de CPU, la memoria, o la latencia de I/O. El principio fundamental es el teorema de Amdahl: la optimización solo es efectiva cuando se aplica al código que consume una fracción significativa del tiempo total. Arquitectónicamente, las herramientas de profiling se clasifican en sampling (muestreo estadístico, overhead <2%, seguro para producción) como `perf`, instrumentation (Valgrind con overhead 20x, para desarrollo), y real-time (Tracy, overhead ∼15%). Existe como disciplina diferenciada porque sin medición objetiva, las optimizaciones son conjeturas que a menudo empeoran el rendimiento (premature optimization is the root of all evil).

---

## 2. Implementación de Referencia

`perf` (Linux ≥6.x, sampling profiler), Valgrind ≥3.23 (instrumentación), Tracy ≥0.11 (tiempo real), Google Benchmark ≥1.9 (microbenchmarks), heaptrack (heap profiling). Idiomas: C/C++, Rust, cualquier lenguaje con símbolos DWARF.

### Ejemplo Práctico Avanzado

```bash
# Pipeline completo de profiling y optimización

# 1. CPU hotspots (sampling, producción seguro)
perf record -F 999 --call-graph dwarf ./myapp --input large.dat
perf report --hierarchy -n
# Buscar: funciones con >10% de samples

# 2. Anotación a nivel de instrucción
perf annotate --symbol HotFunction

# 3. Cache misses (Valgrind, solo dev)
valgrind --tool=callgrind --simulate-cache=yes ./myapp
# Abrir con QCachegrind
callgrind_annotate callgrind.out.* > analysis.txt

# 4. Heap profiling
heaptrack ./myapp
heaptrack_gui heaptrack.myapp.*.gz
# Muestra: allocation hotspots, temporary allocations, leaks

# 5. Microbenchmark regression testing
cat > benchmark.cpp << 'EOF'
#include <benchmark/benchmark.h>

static void BM_StringCreation(benchmark::State& state) {
    for (auto _ : state)
        std::string empty_string;
}
BENCHMARK(BM_StringCreation);

static void BM_StringCopy(benchmark::State& state) {
    std::string x = "hello";
    for (auto _ : state)
        std::string copy(x);
}
BENCHMARK(BM_StringCopy);

BENCHMARK_MAIN();
EOF
g++ -O2 -lbenchmark -lpthread benchmark.cpp -o bench
./bench

# 6. Branch mispredictions
perf stat -e branch-misses,branch-instructions ./myapp
# Ratio <1% ideal; >5% afecta pipeline significativamente

# 7. Antes y después: verificar con hyperfine
hyperfine --warmup 5 './myapp' './myapp-opt'
```

```cpp
// Optimización guiada por profiling: SoA transformation
// Antes: AoS (profiling muestra >30% stall en caché)
struct ParticleAoS { float x, y, z; };
void update_x(std::vector<ParticleAoS>& p) {
    for (auto& part : p) part.x *= 1.1f;  // stride 12 bytes → cache miss
}

// Después: SoA (profiling confirma reducción de misses 80%)
struct ParticleSoA {
    std::vector<float> x, y, z;
};
void update_x(ParticleSoA& p) {
    for (auto& v : p.x) v *= 1.1f;  // acceso secuencial → cache hit
}
```

**Fuente oficial:** https://perf.wiki.kernel.org/ — https://github.com/google/benchmark

### Alternativa de Implementación Específica

**Tracy Profiler — tiempo real con overhead ~15%:**

```cpp
#include <tracy/Tracy.hpp>

void hot_function() {
    ZoneScoped;  // marcar inicio/fin automático
    std::this_thread::sleep_for(std::chrono::milliseconds(10));

    // Named zone
    ZoneScopedN("Processing batch");
    for (int i = 0; i < 100; i++) {
        FrameMarkStart("batch_loop");
        process(i);
        FrameMarkEnd("batch_loop");
    }

    // Alloc tracking
    auto ptr = (int*)tracy_malloc(1024);
    TracyAllocS(ptr, 1024, 4);
    tracy_free(ptr);
    TracyFreeS(ptr, 4);
}
// Ejecutar: ./myapp
// Conectar: Tracy Profiler → Connect (127.0.0.1:8086)
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Siempre antes de optimizar. Hotspot detection con perf para CPU, heaptrack para memoria, callgrind para caché. Microbenchmarks para regression testing en CI |
| **Cuándo evitar** | Profiling en producción con overhead >2% sin autorización, profiling de código no-hot (el setup overhead no se amortiza), microbenchmarks de funciones que no son bottleneck |
| **Alternativas** | Tracy (tiempo real, overhead bajo para profiling continuo), Cachegrind (simulación de jerarquía de caché), `perf c2c` (detección de false sharing), `strace -c` (syscall profiling rápido) |
| **Coste/Complejidad** | Bajo para herramientas básicas (perf top, perf record/report). Alto para interpretación de resultados (Tracy timeline, Callgrind annotations). La optimización sin profiling es especulación pura |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Profiling con Valgrind muestra bottleneck diferente que en producción

**¿Qué ocasionó el error?**
Valgrind simula una CPU genérica con caché de 64KB/64KB L1, pero la CPU de producción era AMD Zen 4 con 32KB/32KB L1 y prefetcher diferente. Los hot spots de caché eran distintos.

**¿Cómo se solucionó?**
Usar `perf` (muestreo real en la CPU de producción) en lugar de simulación:

```bash
# ✅ Medir en la misma CPU donde corre el software
perf record -F 999 --call-graph dwarf ./myapp
perf report --hierarchy

# Solo usar Valgrind para detección de leaks o data races
valgrind --tool=memcheck ./myapp
valgrind --tool=helgrind ./myapp
```

**¿Por qué funciona esta técnica?**
`perf` usa los PMU (Performance Monitoring Units) de la CPU real, midiendo eventos exactos (cache misses, branch misses, cycles). Valgrind simula una CPU genérica que puede no reflejar el comportamiento real. Para análisis de caché, usar `perf stat -e cache-misses` en la CPU objetivo.

### Caso: Microbenchmark muestra 10x mejora, app real muestra 0%

**¿Qué ocasionó el error?**
El microbenchmark aislaba una función en un bucle cerrado (datos en L1 cache), mientras que en la app real la función operaba sobre datos que no cabían en caché (L3 miss). La optimización eliminaba instrucciones pero añadía accesos a memoria que en el microbenchmark no se medían.

**¿Cómo se solucionó?**
Medir la función en contexto real:

```cpp
// ❌ Microbenchmark aislado (solo mide ALU)
static void BM_Op(benchmark::State& state) {
    float x = 0;
    for (auto _ : state)
        benchmark::DoNotOptimize(x = fast_op(x));
}

// ✅ Benchmark con datos reales
static void BM_Realistic(benchmark::State& state) {
    auto data = load_production_data();
    for (auto _ : state)
        for (auto& d : data)
            benchmark::DoNotOptimize(fast_op(d));
}
```

**¿Por qué funciona esta técnica?**
Los datos calientes en caché (microbenchmark) dan medidas optimistas. Los datos fríos (app real) revelan el costo real de memoria. Siempre verificar con `perf stat -e cache-misses` que la mejora en el microbenchmark se traduzca a la app real.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `perf top sampling profiler production`
- **Prioridad de carga:** Alta — profiling es requisito previo para cualquier optimización
- **Dependencias:** `06-cpu-cache-locality-alignment` (cache misses), `10-simd-vectorization` (medición de speedup)

### Tool Integration

```json
{
  "tool_name": "performance-profiling-optimization",
  "description": "Profiling de rendimiento con perf, Valgrind, Tracy, Google Benchmark, y heaptrack",
  "triggers": ["profiling", "perf", "Valgrind", "Callgrind", "Tracy", "heaptrack", "Google Benchmark", "hotspot"],
  "context_hint": "Inyectar pipeline completo de profiling: perf record → annotate → fix → hyperfine verify",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre profiling u optimización de rendimiento, carga el skill
performance-profiling-optimization. Proporciona el pipeline de profiling: perf record,
annotate, fix, y verificación con hyperfine. Incluye ejemplo de SoA transformation.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Quick profiling
perf top -p $(pidof myapp)  # en vivo

# Hotspot detection
perf record -F 999 --call-graph dwarf ./app; perf report
perf annotate --symbol HotFunc

# Memory
heaptrack ./app; heaptrack_gui *.gz
valgrind --tool=cachegrind ./app; cg_annotate cachegrind.*

# Benchmark
hyperfine --warmup 5 './app' './app-opt'
```

### GUI / Web

- **QCachegrind**: visualización de callgrind con árbol de costos
- **Tracy Profiler**: timeline con threads, locks, allocations
- **perf report -n --stdio**: alternativa textual para CI
- **FlameGraph**: `perf script | stackcollapse-perf.pl | flamegraph.pl > perf.svg`

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar perf record | `perf record -F 999 --call-graph dwarf ./app` | `perf report → Enter para annotate` |
| Ver flamegraph | `perf script | stackcollapse.pl | flamegraph.pl > out.svg` | Abrir SVG en navegador |
| Heap profiling | `heaptrack ./app` | `heaptrack_gui → interactive` |

---

## 7. Cheatsheet Rápido

```bash
# Profiling pipeline — 6 líneas
perf record -F 999 --call-graph dwarf ./app
perf report -n --hierarchy     # hotspots
perf annotate --symbol HotFunc  # instrucción por instrucción
# Fix → verificar:
hyperfine --warmup 3 './app' './app-opt'
perf stat -e cache-misses,branch-misses ./app-opt
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-cpu-cache-locality-alignment` | dependiente — cache miss analysis | Sí |
| `10-simd-vectorization` | dependiente — SIMD speedup measurement | Sí |
| `24-instruction-level-parallelism` | dependiente — IPC y pipeline stalls | Sí |
| `16-system-calls-overhead-tracing` | complementario — syscall profiling | No |

---

## 9. Metadatos del Skill

```yaml
---
id: performance-profiling-optimization
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/28-performance-profiling-optimization
tags: [perf, profiling, Valgrind, Tracy, heaptrack, Google-Benchmark, hotspots, optimization]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

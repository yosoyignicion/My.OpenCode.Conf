---
name: system-calls-overhead-tracing
description: "Las system calls (syscalls) son la interfaz entre programas de usuario y el kernel, y su overhead —dominado por el context switch (∼100ns a ∼2μs), la copia de datos entre usuarios y kernel, y el TL..."
---
# System Calls — Overhead & Tracing

## Semantic Triggers
```
system call latency measurement, strace syscall count per second, syscall overhead context switch, getpid vs cached pid optimization, vDSO kernel acceleration, seccomp syscall filtering
```

---

## 1. Definición Teórica

Las system calls (syscalls) son la interfaz entre programas de usuario y el kernel, y su overhead —dominado por el context switch (∼100ns a ∼2μs), la copia de datos entre usuarios y kernel, y el TLB flush— puede ser el cuello de botella en aplicaciones intensivas en I/O o con alta frecuencia de llamadas. El principio fundamental es que cada syscall requiere un cambio de modo (user→kernel→user), que invalida TLB, guarda/restaura registros, y ejecuta código de kernel. Arquitectónicamente, Linux acelera ciertas syscalls con vDSO (virtual dynamic shared object) que implementa `clock_gettime`, `getpid`, `gettimeofday` en userspace sin entrar al kernel, y con io_uring que agrupa múltiples syscalls en una sola transición. Existen como concepto fundamental porque toda interacción con hardware (I/O, memoria, red, procesos) requiere syscalls, y su costo determina el rendimiento máximo del sistema.

---

## 2. Implementación de Referecia

Linux kernel ≥6.x. Herramientas: `strace` (tracing básico), `perf trace` (bajo overhead), `bpftrace` (tracing programable), `seccomp` (filtrado). Idiomas: C, Rust, Python.

### Ejemplo Práctico Avanzado

```c
#include <sys/syscall.h>
#include <unistd.h>
#include <stdio.h>
#include <time.h>
#include <x86intrin.h>  // __rdtsc

// Medir latencia de syscall con TSC (cycle counter)
static inline uint64_t rdtscp(void) {
    unsigned aux;
    return __rdtscp(&aux);
}

double measure_syscall_latency(const char* name, long (*syscall_fn)(void), int iterations) {
    uint64_t min = UINT64_MAX, max = 0, total = 0;

    for (int i = 0; i < iterations; i++) {
        uint64_t start = rdtscp();
        syscall_fn();
        uint64_t end = rdtscp();

        uint64_t cycles = end - start;
        if (cycles < min) min = cycles;
        if (cycles > max) max = cycles;
        total += cycles;
    }

    // Asumiendo 2.5 GHz de CPU
    double avg_ns = (total / (double)iterations) / 2.5;
    printf("%s: avg=%.1f ns min=%.1f ns max=%.1f ns\n",
           name, avg_ns, min / 2.5, max / 2.5);
    return avg_ns;
}

// Syscall real vs vDSO optimizado
long real_getpid(void) { return syscall(SYS_getpid); }
long vdso_getpid(void) { return getpid(); }  // vDSO optimizado

// Comparación: syscall vs io_uring para read
void compare_syscall_vs_iouring(int fd, char* buf, size_t len) {
    uint64_t t0 = rdtscp();
    read(fd, buf, len);
    uint64_t t1 = rdtscp();
    printf("read syscall: %lu cycles\n", t1 - t0);
}

int main() {
    printf("=== Syscall Latency Benchmark ===\n");
    printf("CPU: %.2f GHz\n\n", 1.0);  // reemplazar con medición real

    measure_syscall_latency("getpid (vDSO)",  vdso_getpid,  100000);
    measure_syscall_latency("getpid (syscall)", real_getpid, 100000);

    printf("\nSugerencia: usa getpid() (vDSO) en lugar de syscall(SYS_getpid).\n");
    printf("getpid() es ~10x más rápido porque no entra al kernel.\n");
    return 0;
}
```

```bash
# Medir syscalls de una aplicación
strace -c ./myapp  # resumen de count, time, errors per syscall
strace -T ./myapp  # tiempo por syscall

# Con perf (menos overhead)
perf stat -e syscalls:sys_enter_write,syscalls:sys_enter_read ./myapp

# Con bpftrace (bajo overhead)
bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }'
```

**Fuente oficial:** https://man7.org/linux/man-pages/man2/syscalls.2.html

### Alternativa de Implementación Específica

**Rust — counting syscalls con `seccomp` y tracing:**

```rust
use std::time::Instant;

fn bench_syscall() {
    let start = Instant::now();
    for _ in 0..100_000 {
        let _ = std::fs::read_to_string("/dev/null");
    }
    let elapsed = start.elapsed();
    println!("100k syscalls: {:?} ({:.1} ns/syscall)",
             elapsed,
             elapsed.as_nanos() as f64 / 100_000.0);
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Diagnosticar cuellos de botella de I/O, optimizar aplicaciones con >100k syscalls/s, identificar llamadas innecesarias, verificar cumplimiento de seccomp policies |
| **Cuándo evitar** | Tracing de rutina en producción con strace (demasiado overhead: 10-100x), medición de latencia cuando vDSO ya está optimizando, sistemas donde el overhead de perf (<2%) se considera alto |
| **Alternativas** | `perf stat -e syscalls:*` (bajo overhead), bpftrace (programable, overhead mínimo), `seccomp` (filtrado de syscalls no autorizadas), `cache `getpid` y `clock_gettime` en variables cacheadas |
| **Coste/Complejidad** | Bajo: strace y perf trace son fáciles de usar. La optimización avanzada (io_uring, batch, vDSO) requiere cambios arquitectónicos mayores |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: getpid() en hot path causa 10% de overhead

**¿Qué ocasionó el error?**
Una aplicación de logging llamaba `getpid()` en cada entrada de log (millones por segundo). `getpid()` vía syscall (no vDSO porque el enlace dinámico resolvía la versión incorrecta) costaba ∼200ns cada llamada, sumando 200ms por millón de logs.

**¿Cómo se solucionó?**
Cachear el PID al inicio del proceso:

```c
// En init del proceso
static __thread pid_t cached_pid = 0;
if (!cached_pid) cached_pid = getpid();  // una sola syscall

// Usar cached_pid en hot path — 0 overhead
```

Alternativa: usar `syscall(SYS_getpid)` no vDSO. La solución definitiva: enlazar contra glibc que implementa `getpid()` con vDSO.

**¿Por qué funciona esta técnica?**
El PID de un proceso no cambia durante su vida. Sin threads, incluso se puede cachear en variable global. Con threads, `__thread` da una copia por thread (innecesario porque el PID es el mismo para todos los threads del proceso, pero seguro). La syscall cuesta ∼200ns; la lectura de variable cacheada ∼1ns.

### Caso: strace hace que la app sea 100x más lenta

**¿Qué ocasionó el error?**
`strace` usa `ptrace` para interceptar cada syscall, que requiere 2 context switches adicionales por syscall (tracer → tracee), además de serializar la salida. En una aplicación con 500k syscalls/s, strace la reduce a ~5k/s.

**¿Cómo se solucionó?**
Usar `perf trace` (menos overhead) o `bpftrace` (overhead mínimo):

```bash
# En lugar de strace:
perf trace -e syscalls:sys_enter_openat ./myapp

# O bpftrace para contar sin logging por syscall:
bpftrace -e 'tracepoint:syscalls:sys_enter_* { @syscalls[probe] = count(); }' -c ./myapp
```

**¿Por qué funciona esta técnica?**
`perf trace` usa el subsistema de tracing del kernel (perf events) que añade overhead de ∼1-2μs por evento, no de ∼100μs como ptrace. `bpftrace` con eBPF puede contar en el kernel y solo enviar agregaciones, con overhead <1μs por evento.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~175 tokens estimados al invocar este skill
- **Trigger de activación:** `system call latency measurement`
- **Prioridad de carga:** Alta — diagnóstico de rendimiento de syscalls es fundamental
- **Dependencias:** `09-linux-ebpf-tracing` (tracing con eBPF), `01-io-multiplexing-iouring` (batch de syscalls)

### Tool Integration

```json
{
  "tool_name": "system-calls-overhead-tracing",
  "description": "Medición de latencia de system calls, optimización con vDSO y batch con io_uring",
  "triggers": ["syscall", "system call", "strace", "latency", "vDSO", "seccomp", "context switch"],
  "context_hint": "Inyectar ejemplo de medición de latencia de syscalls con TSC y comparación vDSO vs syscall",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre overhead de syscalls o cómo trace system calls, carga el skill
system-calls-overhead-tracing. Proporciona ejemplos de medición con TSC, comparación
vDSO vs syscall real, y herramientas de tracing (strace, perf trace, bpftrace).
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Contar syscalls por tipo
strace -c ./app | tail -20

# Syscalls más lentas (con tiempo)
strace -T -o trace.log ./app
sort -t'<' -k2 -n trace.log | tail -10

# Sin overhead: perf count
perf stat -e 'syscalls:sys_enter_*' ./app 2>&1

# Tracing en vivo con bpftrace
bpftrace -e 'tracepoint:syscalls:sys_enter_read { @[comm] = sum(args->count); }'

# vDSO: qué funciones están aceleradas
grep vdso /proc/$(pidof myapp)/maps
```

### GUI / Web

- **`perf top`**: muestra syscalls más frecuentes en vivo
- **`htop` → strace**: integración para attach strace desde UI
- **Sysdig**: captura de syscalls con filtros y salida estructurada
- **Vector (Datadog agent)**: monitoreo continuo de syscalls en producción

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Resumen syscalls | `strace -c ./app` | `htop → F9 → strace -c` |
| Contar con perf | `perf stat -e 'syscalls:sys_enter_*' ./app` | `perf top -e syscalls:*` |
| Contar con bpftrace | `bpftrace -e 't:syscalls:sys_enter_* { @[probe] = count() }'` | `Sysdig -c syscall_count` |

---

## 7. Cheatsheet Rápido

```bash
# Medir syscalls esencial — 8 líneas
strace -c ./app                    # resumen
strace -T -e trace=read ./app      # tiempo por read
perf stat -e 'syscalls:sys_enter_*' ./app  # bajo overhead
bpftrace -e 't:syscalls:sys_enter_open { @[comm] = count(); }'
# vDSO: getpid() y clock_gettime() NO son syscalls reales
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `09-linux-ebpf-tracing` | complementario — tracing de syscalls con eBPF | Sí |
| `01-io-multiplexing-iouring` | dependiente — batch de syscalls para reducir overhead | Sí |
| `17-signals-and-interrupts-handling` | complementario — interrupciones vs syscalls | No |
| `19-io-scheduling-linux` | complementario — I/O syscalls y planificación | No |

---

## 9. Metadatos del Skill

```yaml
---
id: system-calls-overhead-tracing
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [syscalls, kernel, strace, perf, latency, vDSO, tracing, seccomp, context-switch]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: hardware-timers-clock-precision
description: "Los temporizadores y relojes de hardware resuelven la medición precisa del tiempo y la ejecución de acciones en intervalos determinados, desde nanosegundos (TSC) hasta segundos (RTC)"
---
# Hardware Timers & Clock Precision

## Semantic Triggers
```
CLOCK_MONOTONIC vs CLOCK_REALTIME, TSC cycle counter frequency scaling, HPET high precision event timer, timerfd periodic timer Linux, clock_nanosleep high resolution sleep, time namespace container consistency
```

---

## 1. Definición Teórica

Los temporizadores y relojes de hardware resuelven la medición precisa del tiempo y la ejecución de acciones en intervalos determinados, desde nanosegundos (TSC) hasta segundos (RTC). El principio fundamental es que la CPU ofrece diferentes fuentes de tiempo: TSC (Time Stamp Counter, ∼1ns resolución, pero escalable en frecuencia), HPET (∼1μs, estable), y ACPI (∼1ms, bajo consumo). Arquitectónicamente, Linux abstrae estas fuentes con clocks (`CLOCK_MONOTONIC` para intervalos, `CLOCK_REALTIME` para tiempo absoluto, `CLOCK_BOOTTIME` que incluye suspensión) y proporciona APIs como `clock_gettime`, `timerfd` y `clock_nanosleep`. Existen como capa diferenciada porque la selección incorrecta de clock source o timer causa mediciones imprecisas, consumo excesivo de energía, o comportamiento incorrecto en sistemas con suspensión.

---

## 2. Implementación de Referencia

Linux kernel ≥6.x. API: `clock_gettime`, `timerfd_create`. Idiomas: C, C++ (`std::chrono`), Rust (`std::time`, `tokio::time`).

### Ejemplo Práctico Avanzado

```c
#include <time.h>
#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <x86intrin.h>

// Calibrar frecuencia de TSC
double calibrate_tsc_freq(void) {
    struct timespec start, end;
    uint64_t tsc_start, tsc_end;

    clock_gettime(CLOCK_MONOTONIC, &start);
    tsc_start = __rdtsc();
    usleep(100000);  // 100ms
    clock_gettime(CLOCK_MONOTONIC, &end);
    tsc_end = __rdtsc();

    double elapsed_ns = (end.tv_sec - start.tv_sec) * 1e9 +
                        (end.tv_nsec - start.tv_nsec);
    double freq_ghz = (double)(tsc_end - tsc_start) / elapsed_ns;

    printf("TSC frequency: %.2f GHz\n", freq_ghz);
    return freq_ghz;
}

// Medir latencia de diferentes clock sources
void benchmark_clocks(int iterations) {
    struct timespec tp;

    // CLOCK_REALTIME (tiempo de pared)
    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (int i = 0; i < iterations; i++)
        clock_gettime(CLOCK_REALTIME, &tp);
    clock_gettime(CLOCK_MONOTONIC, &t1);

    double ns = (double)(t1.tv_sec - t0.tv_sec) * 1e9 +
                (double)(t1.tv_nsec - t0.tv_nsec);
    printf("CLOCK_REALTIME:  %.1f ns/call (vDSO)\n", ns / iterations);

    // vs TSC raw
    t0 = tp;
    for (int i = 0; i < iterations; i++)
        __rdtsc();
    clock_gettime(CLOCK_MONOTONIC, &t1);
    ns = (double)(t1.tv_sec - t0.tv_sec) * 1e9 +
         (double)(t1.tv_nsec - t0.tv_nsec);
    printf("TSC (__rdtsc):     %.1f ns/call\n", ns / iterations);
}

// Timer periódico preciso con timerfd
int create_precise_timer(int interval_ms) {
    int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_CLOEXEC | TFD_NONBLOCK);
    if (tfd < 0) { perror("timerfd_create"); return -1; }

    struct itimerspec spec = {
        .it_interval = {
            .tv_sec = interval_ms / 1000,
            .tv_nsec = (interval_ms % 1000) * 1000000LL
        },
        .it_value = spec.it_interval  // primer disparo igual al intervalo
    };

    if (timerfd_settime(tfd, 0, &spec, NULL) < 0) {
        perror("timerfd_settime");
        close(tfd);
        return -1;
    }
    return tfd;
}

int main() {
    printf("=== Clock & Timer Precision ===\n");
    double freq = calibrate_tsc_freq();
    benchmark_clocks(100000);

    printf("\nCreando timer de 100ms...\n");
    int tfd = create_precise_timer(100);
    if (tfd < 0) return 1;

    uint64_t expirations;
    for (int i = 0; i < 5; i++) {
        read(tfd, &expirations, sizeof(expirations));
        printf("Timer tick %d (expired %lu times)\n", i + 1, expirations);
    }

    close(tfd);
    return 0;
}
```

```bash
gcc -o timers timers.c -O2 -lrt
./timers
```

**Fuente oficial:** https://man7.org/linux/man-pages/man7/time.7.html

### Alternativa de Implementación Específica

**Rust — tokio::time para timers asíncronos con alta precisión:**

```rust
use tokio::time::{sleep, interval, Duration, Instant};

#[tokio::main]
async fn main() {
    // Medir tiempo con Instant (CLOCK_MONOTONIC)
    let start = Instant::now();
    sleep(Duration::from_millis(100)).await;
    println!("Slept for {:?}", start.elapsed());

    // Timer periódico
    let mut ticker = interval(Duration::from_millis(50));
    for _ in 0..5 {
        ticker.tick().await;
        println!("Tick at {:?}", Instant::now().duration_since(start));
    }
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Medición de rendimiento (TSC), timeouts precisos (timerfd), profiling de latencia, sistemas de tiempo real suave (<1ms granularidad), logging con timestamps precisos |
| **Cuándo evitar** | Temporizadores de larga duración con CLOCK_REALTIME (pueden saltar por NTP), mediciones que requieren precisión <100ns (TSC puede no ser síncrono entre cores), sleep simple (usar `usleep` para segundos, timerfd para ms) |
| **Alternativas** | `CLOCK_MONOTONIC_RAW` (evita ajustes de NTP pero puede tener deriva), `CLOCK_BOOTTIME` (incluye suspensión), `gettimeofday` (obsoleto, 1μs resolución), `std::chrono::high_resolution_clock` (C++ wrapper) |
| **Coste/Complejidad** | Bajo: las APIs de clock/timer son simples. La complejidad está en entender qué clock usar para cada propósito. TSC calibration es necesaria en CPUs con frequency scaling (p-state) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: clock_gettime da tiempos inconsistentes después de NTP update

**¿Qué ocasionó el error?**
Un benchmark usaba `CLOCK_REALTIME` para medir intervalos. Un ajuste de NTP (systemd-timesyncd) modificó el tiempo hacia atrás, causando que `clock_gettime(CLOCK_REALTIME)` devolviera un valor menor que el anterior. El benchmark mostró un "elapsed time" negativo.

**¿Cómo se solucionó?**
Usar `CLOCK_MONOTONIC` que no se ve afectado por ajustes de NTP:

```c
// ❌ Afectado por NTP: puede ir hacia atrás
clock_gettime(CLOCK_REALTIME, &start);
// ... work ...
clock_gettime(CLOCK_REALTIME, &end);
elapsed = (end.tv_sec - start.tv_sec) + (end.tv_nsec - start.tv_nsec) / 1e9;
// Si NTP ajustó hacia atrás, end < start → elapsed negativo

// ✅ No afectado: CLOCK_MONOTONIC solo avanza
clock_gettime(CLOCK_MONOTONIC, &start);
// ... work ...
clock_gettime(CLOCK_MONOTONIC, &end);
elapsed = (end.tv_sec - start.tv_sec) + (end.tv_nsec - start.tv_nsec) / 1e9;
```

**¿Por qué funciona esta técnica?**
`CLOCK_MONOTONIC` representa el tiempo transcurrido desde el boot, sin ajustes. `CLOCK_REALTIME` es la hora del día, que NTP puede cambiar hacia adelante o atrás. Para intervalos de tiempo, siempre usar `CLOCK_MONOTONIC` o `CLOCK_BOOTTIME`.

### Caso: usleep no es suficientemente preciso para 1ms

**¿Qué ocasionó el error?**
`usleep(1000)` (1ms) en realidad dormía ∼15ms en un sistema con `CONFIG_HZ=250` (tick de 4ms). La resolución del sleep está limitada por el tick del kernel.

**¿Cómo se solucionó?**
Usar `clock_nanosleep` con `TIMER_ABSTIME` y CLOCK_MONOTONIC para alta precisión:

```c
struct timespec deadline;
clock_gettime(CLOCK_MONOTONIC, &deadline);
deadline.tv_nsec += 1_000_000;  // +1ms

// Normalizar nsec
if (deadline.tv_nsec >= 1_000_000_000) {
    deadline.tv_sec++;
    deadline.tv_nsec -= 1_000_000_000;
}

int ret;
do {
    // clock_nanosleep con TIMER_ABSTIME es más preciso
    ret = clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &deadline, NULL);
} while (ret == EINTR);
```

**¿Por qué funciona esta técnica?**
`clock_nanosleep` con `TIMER_ABSTIME` usa el timer hardware de alta resolución (hrtimer) en lugar del timer basado en ticks. La precisión alcanza ∼microsegundos en lugar de ∼milisegundos, porque hrtimer usa el APIC timer.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~180 tokens estimados al invocar este skill
- **Trigger de activación:** `CLOCK_MONOTONIC vs CLOCK_REALTIME`
- **Prioridad de carga:** Alta — medición de tiempo es fundamental en profiling
- **Dependencias:** `16-system-calls-overhead-tracing` (vDSO para clock_gettime), `17-signals-and-interrupts-handling` (timerfd)

### Tool Integration

```json
{
  "tool_name": "hardware-timers-clock-precision",
  "description": "Relojes y temporizadores de alta precisión: TSC, HPET, timerfd, clock_gettime, y vDSO",
  "triggers": ["clock", "timer", "TSC", "HPET", "CLOCK_MONOTONIC", "CLOCK_REALTIME", "timerfd", "nanosleep"],
  "context_hint": "Inyectar ejemplo de benchmark de clocks y timerfd para timers periódicos",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre temporizadores precisos o medición de tiempo, carga el skill
hardware-timers-clock-precision. Proporciona ejemplos de timerfd, clock_nanosleep,
y la diferencia entre CLOCK_MONOTONIC y CLOCK_REALTIME.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver clock sources disponibles
cat /sys/devices/system/clocksource/clocksource0/available_clocksource
# tsc hpet acpi_pm

# Ver clock source actual
cat /sys/devices/system/clocksource/clocksource0/current_clocksource

# Resolución de sleep
sudo cyclictest -m -n -p99 -i1000 -l10000  # benchmark de latencia
# Benchmark de clock_gettime
perf bench sched pipe  # mide latencia entre pipes
```

### GUI / Web

- **`hwclock`**: visualización/configuración de RTC
- **`timedatectl`**: ver clocks del sistema (NTP, RTC, timezone)
- **`cyclictest`**: histograma de latencia en tiempo real
- **`perf timechart`**: visualización de estados de CPU, sleep e interrupciones

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver clock source | `cat /sys/.../current_clocksource` | `timedatectl show-timesync` |
| Benchmark sleep | `sudo cyclictest -m -n -p99 -i1000` | `htop → process state (S/sleep)` |
| Ver tiempo desde boot | `cat /proc/uptime` | `uptime -p` |

---

## 7. Cheatsheet Rápido

```c
// Timers — 10 líneas
// Medir: clock_gettime(CLOCK_MONOTONIC, &tp);
// Timer periódico:
int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_CLOEXEC);
struct itimerspec sp = { .it_interval = {0, 50*1000000}, .it_value = {0, 50*1000000} };
timerfd_settime(tfd, 0, &sp, NULL);
// Leer: read(tfd, &exp, 8);
// Sleep preciso: clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &deadline, NULL);
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `16-system-calls-overhead-tracing` | complementario — vDSO clock_gettime | Sí |
| `17-signals-and-interrupts-handling` | complementario — timerfd como variante de signal | Sí |
| `28-performance-profiling-optimization` | dependiente — medición de tiempo en profiling | Sí |
| `24-instruction-level-parallelism` | complementario — TSC y pipeline | No |

---

## 9. Metadatos del Skill

```yaml
---
id: hardware-timers-clock-precision
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [clock, timer, TSC, HPET, CLOCK_MONOTONIC, timerfd, nanosleep, precision, vDSO]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

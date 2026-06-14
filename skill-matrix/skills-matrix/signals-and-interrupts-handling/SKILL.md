---
name: signals-and-interrupts-handling
description: "Las señales (signals) e interrupciones (IRQs) son mecanismos de notificación asíncrona que interrumpen el flujo normal de ejecución para manejar eventos externos (hardware I/O, timers, errores) o i..."
---
# Signals & Interrupts Handling

## Semantic Triggers
```
async-signal-safe functions list, signal handler design restrictions, SA_SIGINFO extended signal handling, real-time signals queuing, interrupt context vs process context, IRQ affinity and threading
```

---

## 1. Definición Teórica

Las señales (signals) e interrupciones (IRQs) son mecanismos de notificación asíncrona que interrumpen el flujo normal de ejecución para manejar eventos externos (hardware I/O, timers, errores) o internos (SIGSEGV, SIGPIPE). El principio fundamental es que una señal/interrupción guarda el contexto actual, ejecuta un handler en modo kernel (IRQ) o usuario (signal), y restaura el contexto, con restricciones drásticas en lo que el handler puede hacer: las funciones async-signal-safe son solo `write`, `signal`, `_exit` y unas pocas más. Arquitectónicamente, las interrupciones se dividen en hard IRQs (ejecutadas por el kernel con interrupciones deshabilitadas, alta prioridad, mínimo procesamiento) y soft IRQs (bottom halves, tasklets, workqueues — procesamiento diferido). Existen como mecanismo diferenciado porque son la base de toda respuesta a eventos externos en un sistema operativo, y su diseño incorrecto causa data races, deadlocks y pérdida de eventos.

---

## 2. Implementación de Referencia

Linux kernel ≥6.x. API POSIX `sigaction`, `signalfd`, `timerfd`. Idiomas: C, Rust (nix crate, tokio::signal).

### Ejemplo Práctico Avanzado

```c
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <sys/signalfd.h>

// Variable global solo para señal — volatile sig_atomic_t
static volatile sig_atomic_t shutdown_requested = 0;

// Handler mínimo — solo async-signal-safe
void signal_handler(int sig) {
    // Solo escribir a un pipe o volatile sig_atomic_t
    shutdown_requested = 1;
    // write() es async-signal-safe, printf() NO
    const char msg[] = "!SIGINT received\n";
    write(STDERR_FILENO, msg, sizeof(msg) - 1);
}

// Enfoque moderno: signalfd (evita race conditions de handler)
int setup_signalfd(void) {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGINT);
    sigaddset(&mask, SIGTERM);
    sigaddset(&mask, SIGQUIT);

    // Bloquear señales (no se entregan a handlers, sino a signalfd)
    if (sigprocmask(SIG_BLOCK, &mask, NULL) < 0) {
        perror("sigprocmask"); return -1;
    }

    int sfd = signalfd(-1, &mask, SFD_CLOEXEC | SFD_NONBLOCK);
    if (sfd < 0) { perror("signalfd"); return -1; }
    return sfd;
}

void handle_signals_with_fd(int sfd) {
    struct signalfd_siginfo fdsi;
    ssize_t s = read(sfd, &fdsi, sizeof(fdsi));
    if (s != sizeof(fdsi)) return;

    switch (fdsi.ssi_signo) {
        case SIGINT:
            printf("Caught SIGINT (via signalfd)\n");
            shutdown_requested = 1;
            break;
        case SIGTERM:
            printf("Caught SIGTERM — clean shutdown\n");
            shutdown_requested = 1;
            break;
    }
}

// Timer con timerfd (evita signal handlers)
int setup_timerfd(int seconds) {
    int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_CLOEXEC | TFD_NONBLOCK);
    if (tfd < 0) return -1;

    struct itimerspec spec = {
        .it_interval = { .tv_sec = seconds },    // periódico
        .it_value    = { .tv_sec = seconds }      // primer disparo
    };
    timerfd_settime(tfd, 0, &spec, NULL);
    return tfd;
}

int main() {
    // Método 1: handler tradicional (solo SIGINT)
    struct sigaction sa = {
        .sa_handler = signal_handler,
        .sa_flags = SA_RESTART  // reiniciar syscalls interrumpidas
    };
    sigaction(SIGINT, &sa, NULL);

    // Método 2: signalfd (recomendado)
    int sfd = setup_signalfd();
    int tfd = setup_timerfd(5);

    printf("PID: %d. Press Ctrl+C to quit.\n", getpid());

    while (!shutdown_requested) {
        fd_set rfds;
        FD_ZERO(&rfds);
        FD_SET(sfd, &rfds);
        FD_SET(tfd, &rfds);

        struct timeval tv = { .tv_sec = 1 };
        int ret = select(FD_SETSIZE, &rfds, NULL, NULL, &tv);
        if (ret < 0 && errno != EINTR) break;

        if (FD_ISSET(sfd, &rfds)) handle_signals_with_fd(sfd);
        if (FD_ISSET(tfd, &rfds)) {
            uint64_t exp;
            read(tfd, &exp, sizeof(exp));
            printf("Timer tick!\n");
        }
    }

    close(sfd);
    close(tfd);
    printf("Clean shutdown\n");
    return 0;
}
```

**Fuente oficial:** https://man7.org/linux/man-pages/man7/signal.7.html

### Alternativa de Implementación Específica

**Rust — señales con tokio (basado en signalfd bajo el capó):**

```rust
use tokio::signal;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // Esperar señal
    signal::ctrl_c().await.expect("Failed to listen for Ctrl+C");
    println!("Shutting down gracefully...");

    // También se puede esperar SIGTERM:
    // signal::unix::signal(signal::unix::SignalKind::terminate())
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Graceful shutdown (SIGINT/SIGTERM), timeouts (timerfd), notificación de eventos asíncronos, manejo de errores fatales (SIGSEGV, SIGFPE), IPC ligero |
| **Cuándo evitar** | Comunicación entre procesos regular (usar sockets/pipes), logging dentro de handlers (usar signalfd y logging fuera del handler), señales en programas multi-thread (la entrega a threads es impredecible), sincronización (futex/semáforos son mejores) |
| **Alternativas** | `signalfd` (entregar señales como eventos de fd, evitando handlers asíncronos), `timerfd` (timers sin señales), `eventfd` (notificación ligera entre threads/procesos), `io_uring` (notificación I/O sin señales) |
| **Coste/Complejidad** | Alto: las restricciones de async-signal-safe son contra-intuitivas, y los bugs en handlers causan race conditions difíciles de depurar. signalfd reduce la complejidad al tratar señales como I/O normal |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Deadlock en signal handler porque llama a malloc

**¿Qué ocasionó el error?**
El signal handler de SIGINT llamaba a `free()` para liberar recursos. `malloc/free` no son async-signal-safe. Si la señal llegó mientras el programa estaba en `malloc`, el heap estaba en estado inconsistente. `free()` dentro del handler corrompió el heap.

**¿Cómo se solucionó?**
Reemplazar operaciones no seguras por async-signal-safe:

```c
// ❌ PELIGROSO: printf, malloc, free, mutex_lock no son seguros
void handler(int sig) {
    printf("Signal received\n");  // ❌ no async-signal-safe
    free(some_ptr);              // ❌ no async-signal-safe
}

// ✅ SEGURO: solo write() y volatile sig_atomic_t
void handler(int sig) {
    static const char msg[] = "Signal\n";
    write(STDERR_FILENO, msg, sizeof(msg));  // ✅ async-signal-safe
}
```

**¿Por qué funciona esta técnica?**
`write()` es una syscall directa que no adquiere locks (es atómica respecto a sí misma a nivel de kernel). `volatile sig_atomic_t` garantiza que la lectura/escritura de la variable es atómica. Cualquier función que adquiera un lock (malloc, free, printf, mutex_lock) puede causar deadlock si la señal interrumpe el código que tiene el lock.

### Caso: SIGPIPE mata el proceso silenciosamente

**¿Qué ocasionó el error?**
Un servidor enviaba datos a un socket cuya otra punta se cerró. El kernel enviaba SIGPIPE al proceso, que por defecto lo termina. Sin logs, el servidor moría sin explicación aparente.

**¿Cómo se solucionó?**
Ignorar SIGPIPE y manejar EPIPE explícitamente:

```c
// Al inicio del programa:
signal(SIGPIPE, SIG_IGN);  // ignorar SIGPIPE

// write() devolverá -1 con errno EPIPE
ssize_t ret = write(fd, buf, len);
if (ret < 0 && errno == EPIPE) {
    // La otra punta cerró la conexión
    close(fd);
    return;
}
```

**¿Por qué funciona esta técnica?**
SIG_IGN hace que el kernel descarte la señal. La siguiente syscall (write, send) devolverá EPIPE, que el programa puede manejar sin morir. Este es el patrón estándar en servidores de red.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `async-signal-safe functions list`
- **Prioridad de carga:** Alta — manejo incorrecto de señales causa bugs difíciles
- **Dependencias:** `16-system-calls-overhead-tracing` (syscalls async-signal-safe), `23-process-scheduler-namespaces` (señales en contenedores)

### Tool Integration

```json
{
  "tool_name": "signals-and-interrupts-handling",
  "description": "Manejo de señales POSIX, interrupciones, signalfd, timerfd, y restricciones async-signal-safe",
  "triggers": ["signal", "SIGINT", "SIGTERM", "SIGPIPE", "interrupt", "signalfd", "timerfd", "async-signal-safe"],
  "context_hint": "Inyectar ejemplo de signalfd para manejo seguro de señales y lista de funciones async-signal-safe",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre manejo de señales o interrupciones, carga el skill
signals-and-interrupts-handling. Proporciona ejemplos de signalfd y timerfd.
Explica por qué malloc/printf no son async-signal-safe.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Enviar señales
kill -SIGTERM <pid>    # graceful shutdown
kill -SIGKILL <pid>    # kill -9 (no se puede atrapar)
kill -SIGUSR1 <pid>    # señal de usuario

# Ver señales soportadas
kill -l

# Debugging de señales
strace -e trace=signal ./app

# Ver máscara de señales de un proceso
grep Sig /proc/<pid>/status
# SigCgt: máscara de señales capturadas (hex)
```

### GUI / Web

- **`htop`**: enviar señales desde la UI (F9 → seleccionar señal)
- **`gdb`**: `handle SIGPIPE nostop noprint` para debug
- **`perf probe`**: tracing de envío de señales con `perf probe --add 'signal_send'`
- **SystemTap**: script `signalmon.stp` para monitoreo de señales

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Enviar SIGTERM | `kill -15 <pid>` | `htop → F9 → SIGTERM` |
| Ver máscara de señales | `grep SigCgt /proc/pid/status` | `htop → F5 → status` |
| Debug de señales | `strace -e trace=kill,signal ./app` | `gdb → handle SIGSEGV pass` |

---

## 7. Cheatsheet Rápido

```c
// Async-signal-safe — 10 líneas
// ✅ SEGURO: write, read, _exit, signal, sig_atomic_t
// ❌ PELIGROSO: malloc, free, printf, fprintf, sprintf, mutex, cond_wait

// Mejor práctica: usar signalfd (bloquear señales + fd readability)
sigset_t mask;
sigemptyset(&mask);
sigaddset(&mask, SIGINT);
sigprocmask(SIG_BLOCK, &mask, NULL);
int sfd = signalfd(-1, &mask, SFD_CLOEXEC);
// Leer señales como eventos en un fd normal
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `16-system-calls-overhead-tracing` | complementario — syscalls async-signal-safe | Sí |
| `30-go-systems-production` | dependiente — graceful shutdown pattern | Sí |
| `23-process-scheduler-namespaces` | complementario — señales en contenedores | No |
| `18-hardware-timers-clock-precision` | complementario — timerfd y clocks | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: signals-and-interrupts-handling
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [signals, interrupts, signalfd, timerfd, async-signal-safe, SIGINT, SIGTERM, POSIX]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

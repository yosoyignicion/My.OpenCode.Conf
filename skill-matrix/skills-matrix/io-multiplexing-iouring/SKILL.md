---
name: io-multiplexing-iouring
description: "Linux `io_uring` resuelve la sobrecarga de syscalls en I/O de alto rendimiento mediante un par de colas circulares compartidas (Submission Queue / Completion Queue) entre usuario y kernel, eliminan..."
---
# I/O Multiplexing & io_uring

## Semantic Triggers
```
io_uring syscall batching, epoll edge-triggered vs level-triggered, async I/O with kernel submissions, SQ/CQ ring buffer optimization, zero-copy file I/O Linux, io_uring splice and sendmsg, IOSQE_IO_LINK chain dependencies
```

---

## 1. Definición Teórica

Linux `io_uring` resuelve la sobrecarga de syscalls en I/O de alto rendimiento mediante un par de colas circulares compartidas (Submission Queue / Completion Queue) entre usuario y kernel, eliminando la necesidad de `read`/`write`/`fsync` como syscalls individuales. El principio fundamental es que el usuario prepara solicitudes I/O en SQ, el kernel las consume de forma asíncrona y deposita resultados en CQ, todo sin modo de usuario. Arquitectónicamente, `io_uring` reemplaza a `epoll` + AIO para cargas de I/O intensivas (NVMe, redes 100Gbps, almacenamiento) donde los ciclos de CPU dedicados a syscalls se convierten en cuello de botella. Existe como mecanismo distinto porque ningún otro subsistema de I/O Linux ofrece zero-copy, colas compartidas y encadenamiento de operaciones sin intervención del planificador.

---

## 2. Implementación de Referencia

Linux kernel ≥5.1 (estable 6.x). API nativa en C con la librería `liburing` ≥2.4. Idiomas: C, Rust (tokio-uring), C++ (wrapper propio).

### Ejemplo Práctico Avanzado

```c
#define QUEUE_DEPTH 256

struct io_uring ring;
struct io_uring_sqe *sqe;
struct io_uring_cqe *cqe;
char buf[4096];
int ret;

// Inicialización con opciones: IORING_SETUP_SQPOLL para polling automático
ret = io_uring_queue_init(QUEUE_DEPTH, &ring, IORING_SETUP_SQPOLL);
if (ret < 0) { perror("io_uring_queue_init"); return -1; }

// Preparar un readv encadenado con un writev usando IOSQE_IO_LINK
struct iovec iov = { .iov_base = buf, .iov_len = sizeof(buf) };
int in_fd = open("input.bin", O_RDONLY);

sqe = io_uring_get_sqe(&ring);
io_uring_prep_readv(sqe, in_fd, &iov, 1, 0);
sqe->flags |= IOSQE_IO_LINK;  // no ejecuta el siguiente hasta que este termine
sqe->user_data = 1;

sqe = io_uring_get_sqe(&ring);
int out_fd = open("output.bin", O_WRONLY | O_CREAT);
io_uring_prep_writev(sqe, out_fd, &iov, 1, 0);
sqe->user_data = 2;

io_uring_submit(&ring);

// Recolectar completions en orden
for (int i = 0; i < 2; i++) {
    ret = io_uring_wait_cqe(&ring, &cqe);
    if (ret < 0) { perror("wait_cqe"); break; }
    if (cqe->res < 0)
        fprintf(stderr, "SQE %lu failed: %s\n", cqe->user_data, strerror(-cqe->res));
    io_uring_cqe_seen(&ring, cqe);
}

io_uring_queue_exit(&ring);
close(in_fd);
close(out_fd);
```

**Fuente oficial:** https://kernel.dk/io_uring.pdf — `liburing` en https://git.kernel.dk/liburing

### Alternativa de Implementación Específica

Para sockets de red con alta concurrencia (10k+ conexiones), `epoll` con `EPOLLET` (edge-triggered) sigue siendo una alternativa válida cuando no se necesita I/O en archivos:

```c
int epfd = epoll_create1(0);
struct epoll_event ev = {.events = EPOLLIN | EPOLLET, .data.fd = sock};
epoll_ctl(epfd, EPOLL_CTL_ADD, sock, &ev);
struct epoll_event events[128];
int nfds = epoll_wait(epfd, events, 128, 100);
for (int i = 0; i < nfds; i++)
    handle_event(events[i].data.fd, events[i].events);
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Throughput >100k I/O ops/s, almacenamiento NVMe, redes 100Gbps, servidores de archivos, bases de datos embebidas |
| **Cuándo evitar** | I/O esporádica (pocas ops/s), compatibilidad con kernels <5.1, portabilidad a macOS/Windows sin capa de emulación |
| **Alternativas** | `epoll` (sockets, no storage), `AIO` (obsoleto, limitaciones), `mmap` (I/O simple sin async), `SPDK` (userspace drivers, sin syscalls en absoluto) |
| **Coste/Complejidad** | Alto: gestión manual de colas dobles, fijado de buffers, reinicio tras fork. Curva de aprendizaje pronunciada para modos avanzados (sqpoll, IORING_SETUP_IOPOLL) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: io_uring submit devuelve -EAGAIN bajo carga

**¿Qué ocasionó el error?**
SQ (Submission Queue) llena porque el consumo del kernel no sigue el ritmo de submissions. `io_uring_submit()` retorna -EAGAIN cuando la cola está llena y no se usan `IOSQE_IO_DRAIN` ni modo `SQPOLL`.

**¿Cómo se solucionó?**
Implementar un bucle de reintento con `io_uring_sqring_wait()` antes de submit:

```c
while (io_uring_sqring_full(&ring)) {
    ret = io_uring_submit(&ring);
    if (ret < 0 && ret != -EAGAIN) break;
}
```

**¿Por qué funciona esta técnica?**
Vaciar parcialmente la CQ libera espacio en la SQ (el kernel mueve SQE completados). Alternativamente, usar `IORING_SETUP_SQPOLL` para que el kernel consuma la SQ automáticamente sin intervención de syscall.

### Caso: cqe->res negativo para readv con buffer fijo registrado

**¿Qué ocasionó el error?**
Se usó `io_uring_prep_readv()` sobre un buffer registrado con `io_uring_register_buffers()` sin usar el SQE flag correcto (`IOSQE_FIXED_FILE` para archivos fijos, y `io_uring_prep_read_fixed()` en lugar de `readv`).

**¿Cómo se solucionó?**
Usar la API específica para buffers fijos:

```c
io_uring_prep_read_fixed(sqe, fd, buf, len, offset, buf_index);
// donde buf_index corresponde al índice del buffer registrado
```

**¿Por qué funciona esta técnica?**
Los buffers fijos se referencian por índice, no por puntero. El kernel ya tiene mapeadas las páginas, evitando el bounce buffer. Usar la variante `_fixed` es obligatorio; la variante `readv` estándar ignora el registro.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~180 tokens estimados al invocar este skill
- **Trigger de activación:** `io_uring syscall batching` en la consulta del usuario
- **Prioridad de carga:** Alta — I/O es bottleneck común en sistemas de alto rendimiento
- **Dependencias:** `27-rust-systems-programming` (si se usa tokio-uring), `08-kernel-bypass-dpdk` (si se complementa con userspace networking)

### Tool Integration

```json
{
  "tool_name": "io-multiplexing-iouring",
  "description": "Implementación de I/O asíncrona con io_uring y epoll para Linux de alto rendimiento",
  "triggers": ["io_uring", "epoll", "aio", "async I/O", "SQ/CQ", "liburing"],
  "context_hint": "Inyectar sección 2 (Implementación de Referencia) cuando el usuario necesite ejemplos de código",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre I/O asíncrona en Linux, carga el skill io-multiplexing-iouring
y proporciona un ejemplo práctico con liburing. Prioriza la API de colas compartidas SQ/CQ
sobre epoll para cargas de alta densidad.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver soporte de io_uring en el kernel
grep io_uring /boot/config-$(uname -r) || cat /proc/config.gz | gunzip | grep CONFIG_IO_URING

# Benchmark de I/O con fio usando io_uring
fio --name=iouring-test --ioengine=io_uring --rw=randread --bs=4k --numjobs=4 --iodepth=64 --runtime=30s

# Comparar con epoll
fio --name=epoll-test --ioengine=psync --rw=randread --bs=4k --numjobs=4 --runtime=30s

# Monitorear operaciones io_uring por proceso
bpftrace -e 'kprobe:io_uring_enter { @[comm] = count(); }'
```

### GUI / Web

- **`perf top`** con anotación: identifica funciones que dominan el perfil I/O
- **`htop` + strace**: monitoreo de syscalls por hilo
- **`iostat -x 1`**: seguimiento de I/O por dispositivo con %util, await, svctm
- **`/proc/diskstats`**: lectura directa de estadísticas de I/O del kernel

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver colas SQ/CQ de io_uring | `sudo bpftrace -e 'kprobe:io_uring_submit { @sqe[sarg1] = count(); }'` | `perf top -e io_uring:io_uring_submit` |
| Benchmark rápido con fio | `fio --name=t --ioengine=io_uring --rw=randread --bs=4k --size=1G` | `htop → F5 → filtrar proceso I/O` |

---

## 7. Cheatsheet Rápido

```c
// io_uring esencial — 12 líneas
#include <liburing.h>

struct io_uring ring;
io_uring_queue_init(64, &ring, 0);

struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, 4096, 0);
io_uring_sqe_set_data(sqe, &my_data);
io_uring_submit(&ring);

struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
int bytes = cqe->res;  // o -errno
io_uring_cqe_seen(&ring, cqe);

io_uring_queue_exit(&ring);
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-kernel-bypass-dpdk` | complementario — I/O de red sin kernel | Sí |
| `27-rust-systems-programming` | dependiente — tokio-uring wrapping | Sí |
| `16-system-calls-overhead-tracing` | superconjunto — medición de latencia de syscalls | No |
| `10-simd-vectorization` | complementario — procesamiento paralelo de datos + I/O | No |

---

## 9. Metadatos del Skill

```yaml
---
id: io-multiplexing-iouring
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [io_uring, epoll, linux, async-io, liburing, kernel, syscalls]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

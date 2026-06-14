---
name: ipc-shared-memory-pipes
description: "La comunicación entre procesos (IPC) resuelve el problema de intercambiar datos entre procesos que tienen espacios de direcciones virtuales separados, proporcionando mecanismos que el kernel media ..."
---
# IPC — Shared Memory & Pipes

## Semantic Triggers
```
POSIX shared memory shm_open mmap, Unix domain socket SOCK_DGRAM SOCK_STREAM, anonymous pipes pipe fork, message queues mq_open mq_send, D-Bus inter-process communication, shared memory synchronization
```

---

## 1. Definición Teórica

La comunicación entre procesos (IPC) resuelve el problema de intercambiar datos entre procesos que tienen espacios de direcciones virtuales separados, proporcionando mecanismos que el kernel media o facilita. El principio fundamental es que los procesos no pueden acceder directamente a la memoria de otros, por lo que el IPC requiere un canal mediado por el kernel (pipes, sockets, message queues) o un segmento de memoria compartida (shared memory) con sincronización explícita (semáforos, futexes). Arquitectónicamente, los mecanismos de IPC se diferencian en latencia (shared memory es nanosegundos, sockets son microsegundos), tipo de transferencia (stream vs datagram), y alcance (local vs red). Existen como capa diferenciada porque cada mecanismo ofrece un balance distinto de velocidad, simplicidad y funcionalidad.

---

## 2. Implementación de Referencia

Linux kernel ≥6.x. POSIX shared memory (`shm_open`, `mmap`), Unix domain sockets, anonymous pipes. C POSIX, Rust (nix crate). Idiomas: C, Rust, C++.

### Ejemplo Práctico Avanzado

```c
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <semaphore.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

#define SHM_NAME "/my_shared_buffer"
#define SEM_NAME "/my_semaphore"
#define BUF_SIZE 4096

struct SharedBuffer {
    sem_t mutex;
    char data[BUF_SIZE];
    size_t written;
};

// Proceso escritor
void writer() {
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0666);
    if (fd < 0) { perror("shm_open"); return; }
    ftruncate(fd, sizeof(struct SharedBuffer));

    struct SharedBuffer *buf = mmap(NULL, sizeof(struct SharedBuffer),
                                    PROT_READ | PROT_WRITE,
                                    MAP_SHARED, fd, 0);
    close(fd);

    sem_init(&buf->mutex, 1, 1);  // shared entre procesos

    const char *msg = "Hello from writer via shared memory!";
    sem_wait(&buf->mutex);
    buf->written = strlen(msg) + 1;
    memcpy(buf->data, msg, buf->written);
    sem_post(&buf->mutex);
}

// Proceso lector
void reader() {
    int fd = shm_open(SHM_NAME, O_RDONLY, 0666);
    struct SharedBuffer *buf = mmap(NULL, sizeof(struct SharedBuffer),
                                    PROT_READ, MAP_SHARED, fd, 0);
    close(fd);

    sem_wait(&buf->mutex);
    printf("Reader received: %s (%zu bytes)\n", buf->data, buf->written);
    sem_post(&buf->mutex);

    munmap(buf, sizeof(struct SharedBuffer));
    shm_unlink(SHM_NAME);
}
```

```bash
# Compilar y ejecutar en terminales separadas
gcc -o writer writer.c -lpthread -lrt
gcc -o reader reader.c -lpthread -lrt
./writer &  # en terminal 1
./reader     # en terminal 2
```

**Fuente oficial:** https://man7.org/linux/man-pages/man7/shm_overview.7.html

### Alternativa de Implementación Específica

**Unix domain sockets (SOCK_STREAM)** — para IPC con semántica de flujo similar a TCP pero local:

```rust
use std::os::unix::net::UnixStream;
use std::io::{Read, Write};

fn server() -> std::io::Result<()> {
    let listener = std::os::unix::net::UnixListener::bind("/tmp/ipc.sock")?;
    let (mut stream, _) = listener.accept()?;
    let mut buf = [0; 4096];
    let n = stream.read(&mut buf)?;
    println!("Server received: {}", String::from_utf8_lossy(&buf[..n]));
    Ok(())
}

fn client() -> std::io::Result<()> {
    let mut stream = UnixStream::connect("/tmp/ipc.sock")?;
    stream.write_all(b"Hello via Unix socket!")?;
    Ok(())
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Shared memory: alta frecuencia de intercambio (>100k msg/s), datos grandes (>1MB), baja latencia (sub-microsegundo). Sockets: IPC entre máquinas, semántica de flujo. Pipes: comunicación padre-hijo simple |
| **Cuándo evitar** | Shared memory: cuando la sincronización (semáforos) añade complejidad innecesaria para pocos mensajes. Sockets locales cuando shared memory ofrece menor latencia. Pipes para comunicación bidireccional compleja |
| **Alternativas** | Eventfd (notificación ligera), Futex (sincronización rápida), D-Bus (IPC con bus de mensajes y activación de servicios), gRPC (IPC sobre HTTP/2), ZeroMQ (abstracción de transporte) |
| **Coste/Complejidad** | Variable. Shared memory: alta complejidad (sincronización, naming, limpieza), pero menor latencia. Unix sockets: baja complejidad, overhead moderado. Pipes: muy simple pero unidireccional. Shared memory sin sincronización = data corruption garantizado |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: shm_open falla con "Permission denied" aunque los permisos son 0666

**¿Qué ocasionó el error?**
`shm_open` en Linux requiere que `/dev/shm` esté montado con `rw` para el usuario. En entornos containerizados (Docker), a menudo está montado como `noexec` o `nodev` adicional, y puede tener permisos restrictivos.

**¿Cómo se solucionó?**
Verificar el mount de tmpfs y usar un nombre de shared memory sin caracteres especiales:

```bash
# Verificar mount
mount | grep /dev/shm
# tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev,noexec,relatime,size=65536k)

# Si falta /dev/shm, crearlo:
sudo mkdir -p /dev/shm
sudo mount -t tmpfs tmpfs /dev/shm
```

**¿Por qué funciona esta técnica?**
`shm_open` crea archivos en `/dev/shm` (montaje tmpfs). Si el directorio no existe o los permisos son incorrectos, la syscall falla. Los nombres POSIX shared memory deben comenzar con `/` y no contener barras adicionales.

### Caso: Deadlock por sem_wait en reader si writer no se ejecuta primero

**¿Qué ocasionó el error?**
El reader ejecutaba `sem_wait(&buf->mutex)` antes de que el writer inicializara el semáforo con `sem_init(..., 1, 1)`. Si el reader se ejecutaba primero, el semáforo contenía basura (valor 0 o inválido), causando deadlock.

**¿Cómo se solucionó?**
Usar un protocolo de inicialización con semáforo con nombre (`sem_open`) que persiste independientemente de los procesos:

```c
sem_t *sem = sem_open(SEM_NAME, O_CREAT, 0666, 1);
if (sem == SEM_FAILED) { perror("sem_open"); return; }

// sem_open persiste hasta sem_unlink
// El primer proceso en crear lo inicializa
// El segundo lo abre con el valor correcto
```

**¿Por qué funciona esta técnica?**
`sem_open` crea semáforos con nombre que persisten en el sistema (en `/dev/shm`). A diferencia de `sem_init` (que requiere memoria compartida ya inicializada), `sem_open` garantiza que el semáforo tiene el valor correcto sin importar qué proceso se ejecuta primero.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~180 tokens estimados al invocar este skill
- **Trigger de activación:** `POSIX shared memory shm_open mmap`
- **Prioridad de carga:** Alta — IPC es fundamental en sistemas multi-proceso
- **Dependencias:** `07-lock-free-data-structures` (sincronización en shared memory), `02-concurrency-actor-model` (alternativa con actores)

### Tool Integration

```json
{
  "tool_name": "ipc-shared-memory-pipes",
  "description": "Comunicación entre procesos con shared memory, pipes, Unix sockets y message queues",
  "triggers": ["IPC", "shared memory", "pipe", "Unix socket", "shm_open", "semaphore", "message queue"],
  "context_hint": "Inyectar ejemplo de shared memory con POSIX shm_open y sincronización con semáforos",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre comunicación entre procesos, carga el skill
ipc-shared-memory-pipes. Proporciona ejemplos de shared memory con shm_open,
Unix domain sockets, y cuándo usar cada mecanismo según latencia y volumen.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver segmentos de shared memory activos
ipcs -m

# Ver semáforos activos
ipcs -s

# Ver pipes/sockets Unix en /proc
ls -la /proc/$(pidof myapp)/fd/ | grep -E 'pipe|socket'

# Monitoreo de IPC con strace
strace -e trace=shmget,shmat,shmdt,semget,semop,semctl ./app

# Limpiar shared memory huérfana
ipcrm -M shmid
```

### GUI / Web

- **`lsof -U`**: lista sockets Unix activos
- **`htop` → F5 → Tree view**: muestra jerarquía de procesos con pipes
- **`/proc/*/fd/`**: exploración de descriptores de archivo IPC
- **`Sysdig`**: captura de llamadas IPC con filtros por proceso

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver shared memory | `ipcs -m` | `htop → F9 → enviar señal` |
| Ver sockets Unix | `lsof -U` | `lsof -U` en terminal |
| Monitorear IPC | `strace -e trace=ipc ./app` | `sysdig -c ipc` |

---

## 7. Cheatsheet Rápido

```c
// Shared memory POSIX — 8 líneas
int fd = shm_open("/name", O_CREAT|O_RDWR, 0666);
ftruncate(fd, sizeof(Data));
Data *p = mmap(NULL, sizeof(Data), PROT_RW, MAP_SHARED, fd, 0);
// Usar p->field con sem_wait/sem_post
munmap(p, sizeof(Data));
close(fd);
shm_unlink("/name");
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-lock-free-data-structures` | dependiente — sincronización lock-free en shared memory | Sí |
| `02-concurrency-actor-model` | alternativo — mensajes vs memoria compartida | No |
| `01-io-multiplexing-iouring` | complementario — I/O asíncrono con pipes/sockets | No |
| `03-sistemas-distribuidos/09-websockets-sse-realtime` | complementario — IPC sobre red con WebSockets | No |

---

## 9. Metadatos del Skill

```yaml
---
id: ipc-shared-memory-pipes
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [IPC, shared-memory, pipes, Unix-sockets, semaphore, shm_open, mmap, POSIX]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

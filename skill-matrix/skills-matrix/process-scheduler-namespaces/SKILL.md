---
name: process-scheduler-namespaces
description: "El scheduler de procesos (CFS — Completely Fair Scheduler) resuelve la asignación equitativa de tiempo de CPU entre procesos en ejecución, garantizando que cada tarea reciba una porción justa según..."
---
# Process Scheduler & Namespaces

## Semantic Triggers
```
CFS completely fair scheduler vruntime, cgroups v2 cpu.weight cpu.max, namespace isolation Linux, PID namespace fork, user namespace security mapping, scheduler group entity se
```

---

## 1. Definición Teórica

El scheduler de procesos (CFS — Completely Fair Scheduler) resuelve la asignación equitativa de tiempo de CPU entre procesos en ejecución, garantizando que cada tarea reciba una porción justa según su prioridad (nice value). El principio fundamental de CFS es que mantiene un árbol rojo-negro de tareas ordenado por `vruntime` (tiempo virtual ejecutado), seleccionando siempre la de menor `vruntime` (la más "injusticiada"), con fairness proporcional al peso de cada proceso. Arquitectónicamente, los namespaces (PID, mount, network, user, cgroups) proporcionan aislamiento adicional, permitiendo que grupos de procesos tengan vistas independientes del sistema (esencial para contenedores). Linux namespaces + CFS + cgroups v2 forman la base de la virtualización a nivel de sistema operativo (Docker, Podman, Kubernetes).

---

## 2. Implementación de Referencia

Linux kernel ≥6.x con cgroups v2 y CFS. Idiomas: C (sched_setscheduler, clone), shell (cgroups config), Rust (nix crate).

### Ejemplo Práctico Avanzado

```c
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/mount.h>
#include <sys/syscall.h>
#include <string.h>
#include <errno.h>

#define STACK_SIZE (1024 * 1024)

// Función del proceso hijo con nuevos namespaces
static int child_fn(void* arg) {
    printf("Child: PID=%d (en su propio PID namespace)\n", getpid());
    printf("Child: PPID=%d\n", getppid());  // será 0 en PID ns

    // Montar proc en el nuevo namespace
    if (mount("proc", "/proc", "proc", 0, NULL) < 0) {
        perror("mount proc");
        return 1;
    }

    // Crear proceso hijo dentro del namespace
    pid_t grandchild = fork();
    if (grandchild == 0) {
        printf("Grandchild: PID=%d (primer proceso en PID ns)\n", getpid());
        sleep(2);
        _exit(0);
    }
    waitpid(grandchild, NULL, 0);

    umount("/proc");
    return 0;
}

// Establecer política de scheduling
void set_realtime_sched(pid_t pid, int priority) {
    struct sched_param param = { .sched_priority = priority };
    int ret = sched_setscheduler(pid, SCHED_FIFO, &param);
    if (ret < 0) {
        perror("sched_setscheduler (needs CAP_SYS_NICE)");
    }
}

int main() {
    char *stack = malloc(STACK_SIZE);
    if (!stack) { perror("malloc"); return 1; }

    printf("Parent: PID=%d (en PID namespace global)\n", getpid());

    // Crear proceso en nuevos namespaces: PID + mount + user
    int flags = CLONE_NEWPID | CLONE_NEWNS | CLONE_NEWUSER | SIGCHLD;
    pid_t child = clone(child_fn, stack + STACK_SIZE, flags, NULL);

    if (child < 0) {
        perror("clone");
        free(stack);
        return 1;
    }

    printf("Parent: child PID (externo) = %d\n", child);
    waitpid(child, NULL, 0);

    free(stack);
    return 0;
}
```

```bash
# Compilar: gcc -o ns ns.c
# Ejecutar como root (requiere CAP_SYS_ADMIN para namespaces)
sudo ./ns
```

**Configuración de cgroups v2:**

```bash
# Asignar límites de CPU a un proceso mediante cgroups v2
# (asumiendo cgroups v2 mounted en /sys/fs/cgroup)

# Crear grupo
mkdir /sys/fs/cgroup/mygroup

# Asignar peso CPU (relativo, 1-10000, default 100)
echo 500 > /sys/fs/cgroup/mygroup/cpu.weight   # 5x el peso base

# Límite máximo de CPU (quota/period)
echo "50000 100000" > /sys/fs/cgroup/mygroup/cpu.max  # 50ms de 100ms = 0.5 CPU

# Añadir proceso
echo $(pidof myapp) > /sys/fs/cgroup/mygroup/cgroup.procs
```

**Fuente oficial:** https://www.kernel.org/doc/html/latest/scheduler/sched-design-CFS.html

### Alternativa de Implementación Específica

**Rust — scheduling policies con nix crate:**

```rust
use nix::sched::{self, Scheduler};
use nix::unistd::Pid;

fn set_realtime() -> Result<(), Box<dyn std::error::Error>> {
    let param = sched::SchedParam::new_fifo(80)?;  // prioridad 80
    sched::sched_setscheduler(Pid::from_raw(0), &param)?;  // 0 = self
    Ok(())
}

fn print_scheduler() {
    let policy = sched::sched_getscheduler(Pid::from_raw(0)).unwrap();
    println!("Current scheduling: {:?}", policy);
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aislamiento de procesos (contenedores), control de recursos CPU (cgroups), planificación de tiempo real (SCHED_FIFO/RR para sistemas de baja latencia), priorización de servicios críticos |
| **Cuándo evitar** | SCHED_FIFO/RR en sistemas sin necesidades de tiempo real (puede degradar otros procesos), cgroups cuando el sistema tiene un solo proceso importante, PID namespace sin mount namespace (visible proc incompleto) |
| **Alternativas** | SCHED_OTHER (CFS default para la mayoría), SCHED_BATCH (para cargas batch sin necesidad de respuesta rápida), SCHED_IDLE (solo cuando no hay otra tarea), cpuset (fijar CPUs en lugar de compartir) |
| **Coste/Complejidad** | Medio: el aislamiento con namespaces requiere privilegios de administrador (CAP_SYS_ADMIN) y comprensión de la jerarquía de cgroups. SCHED_FIFO mal configurado puede hacer que el sistema no responda (sin timeout) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: DTrace/strace no puede seguir procesos en PID namespace

**¿Qué ocasionó el error?**
Dentro de un PID namespace, el proceso hijo tiene PID 1 (como init). Desde fuera del namespace, strace con `-p <pid>` apunta al PID externo. Pero si el proceso hijo está en otro PID namespace, strace desde fuera falla con "Operation not permitted".

**¿Cómo se solucionó?**
Ejecutar strace desde dentro del namespace o usar `nsenter`:

```bash
# nsenter: ejecutar herramienta en el namespace del proceso
nsenter -t <external_pid> -p strace -p 1

# O directamente:
nsenter -t <external_pid> -p -- strace -p 1

# Ver namespaces de un proceso
ls -la /proc/<pid>/ns/
# total 0
# lrwxrwxrwx ... pid -> pid:[4026533184]
# lrwxrwxrwx ... net -> net:[4026533176]
```

**¿Por qué funciona esta técnica?**
`nsenter` cambia al namespace del proceso objetivo (con `-p` para PID namespace). Una vez dentro, strace ve los PIDs internos del namespace. Los namespaces son identificados por inodo (`pid:[4026533184]`); dos procesos comparten el mismo namespace si tienen el mismo número de inodo.

### Caso: SCHED_FIFO hace que el sistema no responda al teclado

**¿Qué ocasionó el error?**
Un thread con SCHED_FIFO prioridad 99 (máxima) ejecutaba un bucle infinito sin ceder la CPU. Ningún otro proceso (incluyendo el manejador de interrupciones de teclado) podía ejecutarse, congelando el sistema.

**¿Cómo se solucionó?**
Usar SCHED_RR (Round Robin) que fuerza rotación entre procesos de misma prioridad, o limitar el tiempo de ejecución:

```c
// En lugar de SCHED_FIFO:
struct sched_param param = { .sched_priority = 80 };
sched_setscheduler(0, SCHED_RR, &param);  // RR preempts automáticamente

// O limitar con sched_rr_get_interval:
struct timespec ts;
sched_rr_get_interval(0, &ts);
printf("RR interval: %ld ns\n", ts.tv_nsec + ts.tv_sec * 1000000000UL);
```

**¿Por qué funciona esta técnica?**
SCHED_FIFO se ejecuta hasta que el proceso se bloquea o es preemptado por uno de mayor prioridad (sin time slice). SCHED_RR tiene un time slice (default ∼100ms) que fuerza rotación entre procesos de la misma prioridad. Siempre usar SCHED_RR en lugar de SCHED_FIFO a menos que haya una razón explícita para FIFO.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `CFS completely fair scheduler vruntime`
- **Prioridad de carga:** Alta — base de contenedores y planificación de CPU
- **Dependencias:** `20-numa-architectures-tuning` (afinidad NUMA + cpuset), `11-virtual-memory-paging` (aislamiento de memoria)

### Tool Integration

```json
{
  "tool_name": "process-scheduler-namespaces",
  "description": "Planificador CFS, cgroups v2, namespaces (PID/user/mount), y políticas de tiempo real",
  "triggers": ["CFS", "scheduler", "cgroups", "namespace", "PID ns", "container isolation", "SCHED_FIFO"],
  "context_hint": "Inyectar ejemplo de cgroups v2 para limitar CPU y clone() con CLONE_NEWPID",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre planificación de procesos, cgroups o aislamiento de contenedores,
carga el skill process-scheduler-namespaces. Proporciona ejemplos de cgroups v2 cpu.max
y creación de namespaces con clone(). Explica la diferencia entre SCHED_FIFO y SCHED_RR.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver scheduler de un proceso
chrt -p $(pidof myapp)

# Cambiar scheduler de un proceso en ejecución
chrt -f -p 80 $(pidof myapp)  # FIFO, prioridad 80
chrt -r -p 80 $(pidof myapp)  # RR, prioridad 80

# Ver cgroups v2 activos
cat /sys/fs/cgroup/cgroup.controllers

# Ver namespaces de un proceso
lsns -p $(pidof myapp)
```

### GUI / Web

- **`htop` → columna S (scheduler state):** muestra procesos en run, sleep, disk sleep
- **`systemd-cgtop`**: top-like monitor de cgroups
- **`cadvisor`**: monitoreo de cgroups en contenedores con UI web
- **`lsns`** (util-linux): lista todos los namespaces del sistema

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver scheduling policy | `chrt -p <pid>` | `htop → Columns → SCHED` |
| Cambiar prioridad | `chrt -f -p 80 <pid>` | `htop → F7/F8 → nice` |
| Ver cgroups | `systemd-cgtop` | `cadvisor → Containers` |

---

## 7. Cheatsheet Rápido

```bash
# CFS y cgroups — 8 líneas
# Ver scheduling: chrt -p <pid>
# Cambiar a RR: chrt -r -p 80 <pid>
# cgroups v2 CPU limit:
# echo "50000 100000" > /sys/fs/cgroup/mygrp/cpu.max  # 0.5 CPU
# echo <pid> > /sys/fs/cgroup/mygrp/cgroup.procs
# Namespaces: clone(CLONE_NEWPID|CLONE_NEWNS|CLONE_NEWUSER)
# Ver: lsns -p <pid>
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `20-numa-architectures-tuning` | complementario — cpuset + numactl | Sí |
| `11-virtual-memory-paging` | complementario — aislamiento de memoria | Sí |
| `30-go-systems-production` | dependiente — goroutine scheduling vs OS threads | No |
| `04-devops-platform/03-container-internals-namespaces` | dependiente — namespaces para Docker | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: process-scheduler-namespaces
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [CFS, scheduler, cgroups, namespaces, clone, SCHED_FIFO, SCHED_RR, container, PID-ns]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: numa-architectures-tuning
description: "NUMA (Non-Uniform Memory Access) resuelve el problema de escalabilidad de memoria en sistemas multi-socket, donde cada CPU tiene su propia memoria local con latencia baja (∼100ns) y acceso a memori..."
---
# NUMA Architectures & Tuning

## Semantic Triggers
```
NUMA memory access latency remote vs local, numactl bind node policy, NUMA-aware memory allocation mbind, NUMA node interleaving policy, first-touch page allocation strategy, NUMA balancing kernel migration
```

---

## 1. Definición Teórica

NUMA (Non-Uniform Memory Access) resuelve el problema de escalabilidad de memoria en sistemas multi-socket, donde cada CPU tiene su propia memoria local con latencia baja (∼100ns) y acceso a memoria remota (otro socket) con latencia mayor (∼200ns). El principio fundamental es que la arquitectura UMA (Uniform Memory Access) no escala más allá de ∼8 núcleos porque el bus de memoria se satura, mientras que NUMA distribuye la memoria entre nodos (cada socket es un nodo NUMA) con su propio controlador de memoria. Arquitectónicamente, el sistema operativo (Linux) implementa políticas de "first-touch" (la página se asigna en el nodo del thread que primero la toca) y "NUMA balancing" (migración automática de páginas entre nodos). Existe como capa diferenciada porque las aplicaciones no optimizadas para NUMA pueden sufrir 2-3x degradación por accesos remotos a memoria.

---

## 2. Implementación de Referencia

Linux kernel ≥6.x. Hardware: Intel (Xeon Scalable), AMD (EPYC), ARM (Ampere Altra). Herramientas: `numactl`, `numastat`, `libnuma`. Idiomas: C (libnuma), Rust (nix crate).

### Ejemplo Práctico Avanzado

```c
#include <numa.h>
#include <numaif.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sched.h>
#include <unistd.h>
#include <sys/mman.h>

// Mostrar topología NUMA
void print_numa_topology(void) {
    int max_node = numa_max_node();
    printf("NUMA nodes: %d\n", max_node + 1);

    for (int n = 0; n <= max_node; n++) {
        struct bitmask *cpus = numa_allocate_cpumask();
        numa_node_to_cpus(n, cpus);

        long long size = numa_node_size64(n, NULL);
        printf("Node %d: %lld MB | CPUs: ", n, size / 1024 / 1024);
        for (int c = 0; c < numa_num_configured_cpus(); c++)
            if (numa_bitmask_isbitset(cpus, c)) printf("%d ", c);
        printf("\n");

        numa_free_cpumask(cpus);
    }
}

// Asignar memoria en nodo específico (NUMA-aware allocation)
void* alloc_on_node(size_t size, int node) {
    void *ptr = mmap(NULL, size, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (ptr == MAP_FAILED) return NULL;

    struct bitmask *nodes = numa_allocate_nodemask();
    numa_bitmask_setbit(nodes, node);

    // mbind fuerza la asignación en el nodo especificado
    if (mbind(ptr, size, MPOL_BIND, nodes->maskp, nodes->size + 1, 0) < 0) {
        perror("mbind");
        munmap(ptr, size);
        numa_free_nodemask(nodes);
        return NULL;
    }

    // First-touch: el thread actual toca la memoria para asignarla físicamente
    memset(ptr, 0, size);

    numa_free_nodemask(nodes);
    return ptr;
}

// Benchmark de latencia local vs remota
double measure_access_latency(void *ptr) {
    volatile int sum = 0;
    struct timespec start, end;

    clock_gettime(CLOCK_MONOTONIC, &start);
    for (int i = 0; i < 10000000; i++) {
        sum += ((volatile int*)ptr)[i & 0xFFF];  // acceso aleatorio local
    }
    clock_gettime(CLOCK_MONOTONIC, &end);

    double ns = (end.tv_sec - start.tv_sec) * 1e9 +
                (end.tv_nsec - start.tv_nsec);
    return ns / 10000000;  // promedio por acceso
}

int main() {
    print_numa_topology();

    // Fijar thread a CPU del nodo 0
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(0, &set);  // asumiendo CPU 0 en nodo 0
    sched_setaffinity(0, sizeof(set), &set);

    // Asignar memoria en nodo local (0)
    size_t size = 64 * 1024 * 1024;
    void *local = alloc_on_node(size, 0);
    if (!local) return 1;

    // Asignar memoria en nodo remoto (1)
    void *remote = alloc_on_node(size, 1);
    if (!remote) { munmap(local, size); return 1; }

    double local_lat = measure_access_latency(local);
    double remote_lat = measure_access_latency(remote);

    printf("\nAccess latency:\n");
    printf("  Local  (Node 0): %.2f ns\n", local_lat);
    printf("  Remote (Node 1): %.2f ns\n", remote_lat);
    printf("  Penalty: %.1f%%\n", (remote_lat / local_lat - 1) * 100);

    munmap(local, size);
    munmap(remote, size);
    return 0;
}
```

```bash
# Compilar: gcc -o numa numa.c -lnuma -O2
./numa
```

**Fuente oficial:** https://man7.org/linux/man-pages/man7/numa.7.html

### Alternativa de Implementación Específica

**numactl para control sin modificar código:**

```bash
# Ejecutar app en nodo 0 con memoria local
numactl --cpunodebind=0 --membind=0 ./myapp

# Política interleaved (round-robin entre nodos)
numactl --interleave=all ./myapp

# Ver política actual de un proceso
numactl --show

# Estadísticas de uso NUMA
numastat -p $(pgrep myapp)
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas multi-socket (servidores ≥2 sockets), aplicaciones con sets de trabajo grandes (>L3 caché), bases de datos in-memory, HPC/ML que usan toda la memoria disponible, virtualización con PCI passthrough |
| **Cuándo evitar** | Sistemas single-socket (no hay penalidad NUMA), aplicaciones con datasets pequeños que caben en caché, prototipado (numactl --interleave es suficiente), contenedores pequeños asignados a un solo nodo |
| **Alternativas** | `numactl --interleave` (balancea sin modificar código), `mempolicy` en cgroups v2, THP (Transparent Huge Pages) reduce TLB misses pero no penalidad NUMA, cache-friendly data layout (reduce accesos a memoria remota) |
| **Coste/Complejidad** | Medio: las políticas de first-touch y bind requieren conocimiento de la topología del hardware. `numactl --interleave` es simple pero no óptimo. El tuning fino con mbind/mempolicy es específico de cada aplicación |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Aplicación 2x más lenta en socket remoto

**¿Qué ocasionó el error?**
El scheduler de Linux migró la aplicación a un socket diferente de donde estaba su memoria (first-touch allocation). Todos los accesos a memoria se volvieron remotos (∼200ns vs ∼100ns), duplicando la latencia efectiva.

**¿Cómo se solucionó?**
Forzar afinidad de CPU y memoria al mismo nodo:

```bash
# solución 1: numactl
numactl --cpunodebind=0 --membind=0 ./myapp

# solución 2: cgroups v2 con cpuset y memory policy
mkdir /sys/fs/cgroup/myapp
echo "0-7" > /sys/fs/cgroup/myapp/cpuset.cpus
echo "0" > /sys/fs/cgroup/myapp/cpuset.mems
echo $$ > /sys/fs/cgroup/myapp/cgroup.procs
./myapp
```

**¿Por qué funciona esta técnica?**
`--cpunodebind=0` fija todos los threads a CPUs del nodo 0. `--membind=0` fuerza que toda la memoria nueva se asigne en el nodo 0. El kernel no puede migrar el proceso fuera del nodo, garantizando localidad.

### Caso: numastat muestra remote access alto pese a cpunodebind

**¿Qué ocasionó el error?**
`numactl --cpunodebind=0` fija la CPU pero no la memoria. Si la aplicación llama a `mmap` sin `mbind`, la memoria se asigna en el nodo del thread que hace el primer acceso (first-touch policy). Si la inicialización la hace otro thread en otro nodo, la memoria queda remota.

**¿Cómo se solucionó?**
Agregar `--membind` y/o prefault con memset en el hilo correcto:

```bash
# Forzar memoria local al nodo de CPU
numactl --cpunodebind=0 --membind=0 ./myapp

# En código: prefault en el hilo correcto
// Asegurar que el hilo del nodo 0 toca la memoria primero
#pragma omp parallel
{
    if (omp_get_thread_num() == 0) {
        memset(large_buffer, 0, size);
    }
}
```

**¿Por qué funciona esta técnica?**
First-touch: la página física se asigna en el nodo del thread que la escribe primero. Si el hilo de inicialización está en el nodo 1, la memoria se asigna en nodo 1 aunque el thread principal esté en nodo 0. `--membind=0` fuerza la asignación en nodo 0 independientemente de qué thread toque la página.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `NUMA memory access latency remote vs local`
- **Prioridad de carga:** Alta — esencial para rendimiento en servidores multi-socket
- **Dependencias:** `11-virtual-memory-paging` (page allocation policies), `06-cpu-cache-locality-alignment` (localidad + NUMA)

### Tool Integration

```json
{
  "tool_name": "numa-architectures-tuning",
  "description": "Arquitectura NUMA: políticas de memoria, bind de nodo, first-touch, y afinidad de CPU",
  "triggers": ["NUMA", "numactl", "numastat", "memory binding", "first-touch", "node interleaving", "mbind"],
  "context_hint": "Inyectar ejemplo de topología NUMA con libnuma y benchmark local vs remoto",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre arquitectura NUMA o rendimiento multi-socket, carga el skill
numa-architectures-tuning. Proporciona ejemplos de numactl --cpunodebind --membind
y benchmark de latencia local vs remota con libnuma.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver topología NUMA
numactl --hardware
lstopo --of txt

# Ver estadísticas NUMA del sistema
numastat

# Ver estadísticas NUMA por proceso
numastat -p $(pidof myapp)

# Benchmark de ancho de banda NUMA
mbw -n 10 1024

# Ver políticas de memoria
cat /proc/$(pidof myapp)/numa_maps
```

### GUI / Web

- **`hwloc/lstopo`**: visualización gráfica de topología NUMA (colores por nodo)
- **`numa-abi-validator`**: verificación de ABI de libnuma
- **`likwid`** (LIKWID): herramientas de microbenchmarking NUMA
- **`perf bench numa`**: benchmark de ancho de banda NUMA integrado

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver topología | `numactl --hardware` | `lstopo --of pdf > topo.pdf` |
| Bindear app a nodo | `numactl --cpunodebind=0 --membind=0 ./app` | `likwid-pin -c N:0-7 ./app` |
| Ver stats NUMA | `numastat -p <pid>` | `htop → F2 → NUMA stats` |

---

## 7. Cheatsheet Rápido

```bash
# NUMA esencial — 8 líneas
numactl --hardware           # ver topología
numactl --show               # ver política actual
numactl --cpunodebind=0 --membind=0 ./app  # fijar a nodo 0
numactl --interleave=all ./app  # balancear entre nodos
numastat -p <pid>            # remote access ratio
# C: void *p = alloc_on_node(size, node); // libnuma mbind
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `11-virtual-memory-paging` | complementario — page allocation y hugepages | Sí |
| `06-cpu-cache-locality-alignment` | complementario — localidad + acceso NUMA | Sí |
| `08-kernel-bypass-dpdk` | dependiente — DPDK requiere afinidad NUMA | Sí |
| `23-process-scheduler-namespaces` | complementario — cpuset en cgroups | No |

---

## 9. Metadatos del Skill

```yaml
---
id: numa-architectures-tuning
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [NUMA, numactl, numastat, memory-binding, first-touch, mbind, multi-socket, topology]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

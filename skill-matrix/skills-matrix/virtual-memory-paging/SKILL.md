---
name: virtual-memory-paging
description: "La memoria virtual resuelve el aislamiento entre procesos y la ilusión de un espacio de direcciones contiguo mediante la traducción de direcciones virtuales a físicas a través de page tables gestio..."
---
# Virtual Memory & Paging

## Semantic Triggers
```
page table walk TLB miss mitigation, huge pages 2MB 1GB Linux, mmap MAP_HUGETLB anonymous memory, transparent huge pages THP config, page fault handling major minor, swapping memory pressure OOM killer
```

---

## 1. Definición Teórica

La memoria virtual resuelve el aislamiento entre procesos y la ilusión de un espacio de direcciones contiguo mediante la traducción de direcciones virtuales a físicas a través de page tables gestionadas por la MMU. El principio fundamental es que la memoria se divide en páginas (típicamente 4KB en x86) que pueden estar en RAM, en swap, o no asignadas, y la TLB (Translation Lookaside Buffer) acelera la traducción cacheando las últimas entradas de page table. Arquitectónicamente, el sistema de paginación permite overcommit, copy-on-write, memory-mapped files, y swapping, pero introduce el costo de TLB misses y page faults. Existe como mecanismo fundamental porque sin memoria virtual, cada proceso tendría que gestionar su propio espacio físico, haciendo imposible la multitarea segura.

---

## 2. Implementación de Referencia

Linux kernel ≥6.x con THP (Transparent Huge Pages), `mmap`, `madvise`. Idiomas: C (syscalls `mmap`, `mprotect`, `mlock`), C++ (no estándar, wrappers de OS).

### Ejemplo Práctico Avanzado

```c
#include <sys/mman.h>
#include <sys/sysinfo.h>
#include <numa.h>  // libnuma
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

#define SIZE_2MB (2UL * 1024 * 1024)
#define SIZE_1GB (1UL * 1024 * 1024 * 1024)

// Asignar memoria con hugepages explícitas
void* alloc_hugepage_2mb(size_t pages) {
    void* addr = mmap(NULL, pages * SIZE_2MB,
                      PROT_READ | PROT_WRITE,
                      MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB,
                      -1, 0);
    if (addr == MAP_FAILED) {
        perror("mmap hugepage 2MB");
        return NULL;
    }
    // Las páginas ya están asignadas (prefault)
    memset(addr, 0, pages * SIZE_2MB);
    return addr;
}

// Verificar tamaño de página usado
void check_page_size(void* addr, size_t size) {
    FILE* f = fopen("/proc/self/smaps", "r");
    if (!f) return;

    char line[256];
    int found = 0;
    while (fgets(line, sizeof(line), f)) {
        // Buscar la región y verificar THP
        if (strstr(line, "AnonHugePages:")) {
            unsigned long kb;
            sscanf(line, "AnonHugePages: %lu kB", &kb);
            printf("HugePages: %lu kB (%lu 2MB pages)\n", kb, kb / 2048);
            found = 1;
        }
    }
    if (!found) printf("No THP in use\n");
    fclose(f);
}

// Usar madvise para transparent hugepages
void enable_thp(void* addr, size_t size) {
    int ret = madvise(addr, size, MADV_HUGEPAGE);
    if (ret < 0) perror("madvise THP failed");
    // Alternativa: MADV_COLLAPSE (kernel 6.1+) para colapsar páginas
}

int main() {
    struct sysinfo info;
    sysinfo(&info);
    printf("Total RAM: %lu MB, Free: %lu MB\n",
           info.totalram >> 20, info.freeram >> 20);

    // Asignar 10 hugepages de 2MB
    void* hp = alloc_hugepage_2mb(10);
    if (hp) {
        printf("Hugepage alloc at %p\n", hp);
        check_page_size(hp, 10 * SIZE_2MB);
        munmap(hp, 10 * SIZE_2MB);
    }

    // Asignar memoria normal y colapsar a hugepages
    void* normal = mmap(NULL, 64 * 1024 * 1024,
                        PROT_READ | PROT_WRITE,
                        MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    enable_thp(normal, 64 * 1024 * 1024);
    memset(normal, 0, 64 * 1024 * 1024);  // trigger page faults

    munmap(normal, 64 * 1024 * 1024);
    return 0;
}
```

**Fuente oficial:** https://www.kernel.org/doc/html/latest/admin-guide/mm/hugetlbpage.html

### Alternativa de Implementación Específica

**Rust — `mmap` con crate `memmap2` para memory-mapped files:**

```rust
use memmap2::MmapMut;
use std::fs::File;

fn create_mmap_file(path: &str, size: usize) -> Result<MmapMut, std::io::Error> {
    let file = File::create(path)?;
    file.set_len(size as u64)?;

    let mmap = unsafe { MmapMut::map_mut(&file)? };
    // El sistema operativo gestiona las page faults bajo demanda
    Ok(mmap)
}

// El archivo mapeado se puede acceder como un slice
let mmap = create_mmap_file("data.bin", 1_000_000_000)?;
mmap[0..4].copy_from_slice(&42u32.to_le_bytes());
// Las páginas se sincronizan automáticamente (o con mmap.flush()?)
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Bases de datos in-memory (Redis, Memcached), DPDK (hugepages para DMA), motores de juegos con grandes datasets, SVMs/VMs (1GB pages para KVM), HPC/ML con grandes arrays contiguos |
| **Cuándo evitar** | Aplicaciones normales donde THP es suficiente, sistemas con memoria limitada (<4GB), procesos efímeros donde el costo de asignar hugepages no se amortiza |
| **Alternativas** | THP transparente (sin cambios de código, pero no garantizado), `madvise MADV_HUGEPAGE` (hint en lugar de reserva), `MAP_POPULATE` (prefault pages), `mlockall` (evitar swapping) |
| **Coste/Complejidad** | Medio: hugepages reducen TLB misses pero aumentan el costo de page faults individuales. THP puede causar fragmentación de memoria con el tiempo. La reserva de 1GB pages debe hacerse en boot |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: MAP_HUGETLB falla con "Cannot allocate memory"

**¿Qué ocasionó el error?**
No hay hugepages reservadas en el sistema. El kernel no tiene pools de hugepages preasignados.

**¿Cómo se solucionó?**
Reservar hugepages en boot o runtime:

```bash
# En runtime (hasta que se agote la memoria contigua)
echo 20 | sudo tee /proc/sys/vm/nr_hugepages

# O en boot: hugepages=20 en kernel cmdline
# Verificar pools disponibles:
cat /proc/meminfo | grep HugePages
# HugePages_Total: 20
```

**¿Por qué funciona esta técnica?**
Las hugepages requieren memoria físicamente contigua. El kernel reserva pools en tiempo de boot cuando la memoria está menos fragmentada. En runtime, `nr_hugepages` compacta memoria, pero puede fallar si no hay suficientes páginas contiguas de 2MB.

### Caso: Performance drop tras THP compaction

**¿Qué ocasionó el error?**
THP (Transparent Huge Pages) con `always` causaba que `khugepaged` compaction escaneara memoria, elevando el uso de CPU al 100% en momentos de carga.

**¿Cómo se solucionó?**
Configurar THP en modo `madvise` (solo cuando el programa lo solicita):

```bash
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
# En /etc/default/grub:
# transparent_hugepage=madvise
```

**¿Por qué funciona esta técnica?**
THP `always` permite que el kernel intente colapsar cualquier región de 4KB en 2MB. `khugepaged` escanea memoria en background pero bajo presión de memoria causa compaction síncrono. `madvise` solo colapsa regiones marcadas explícitamente con `madvise(MADV_HUGEPAGE)`.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~175 tokens estimados al invocar este skill
- **Trigger de activación:** `page table walk TLB miss mitigation`
- **Prioridad de carga:** Alta — fundamental para entender rendimiento de memoria
- **Dependencias:** `20-numa-architectures-tuning` (NUMA-aware memory allocation), `08-kernel-bypass-dpdk` (hugepages para DPDK)

### Tool Integration

```json
{
  "tool_name": "virtual-memory-paging",
  "description": "Gestión de memoria virtual, page tables, TLB, hugepages y page fault handling en Linux",
  "triggers": ["virtual memory", "paging", "hugepages", "TLB", "page fault", "mmap", "THP", "swap"],
  "context_hint": "Inyectar ejemplo de mmap con hugepages y diagnóstico de TLB misses",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre memoria virtual, page tables, o hugepages, carga el skill
virtual-memory-paging. Proporciona ejemplos de MAP_HUGETLB y configuración de THP.
Explica cómo mitigar TLB misses y diagnosticar page faults.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver estado de memoria virtual y hugepages
cat /proc/meminfo | grep -E 'HugePages|PageTables|SwapTotal'
cat /proc/vmstat | grep pgfault  # page faults totales

# Ver page table size de un proceso
grep VmPTE /proc/$(pidof myapp)/status
# VmPTE: 124 kB  (4KB pages → 124kB ~ 31000 entradas)

# Medir TLB misses
perf stat -e dTLB-load-misses,iTLB-load-misses ./app

# Mostrar mapa de memoria virtual de un proceso
pmap -x $(pidof myapp) | head -20
```

### GUI / Web

- **`/proc/smaps` parser**: `smem` (herramienta con reportes gráficos)
- **htop**: columna de "M_PTE" muestra page table size
- **perf top**: monitoreo de TLB misses en vivo
- **Valgrind --tool=lackey**: simulación básica de page references

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver hugepages totales | `cat /proc/meminfo | grep Huge` | `htop → memory meter` |
| Medir TLB misses | `perf stat -e dTLB-load-misses ./app` | `VTune → TLB analysis` |
| Ver mapa de memoria | `pmap -x <pid>` | `processhacker → Memory` |

---

## 7. Cheatsheet Rápido

```bash
# Hugepages esencial — 7 líneas
# Reservar
echo 20 | sudo tee /proc/sys/vm/nr_hugepages
# Asignar en C
void *p = mmap(NULL, 20 * 2MB, PROT_RW, MAP_PRIVATE|MAP_ANONYMOUS|MAP_HUGETLB, -1, 0);
# THP: madvise
madvise(p, size, MADV_HUGEPAGE);
# Medir: perf stat -e dTLB-load-misses ./app
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `20-numa-architectures-tuning` | complementario — memoria NUMA + page allocation | Sí |
| `08-kernel-bypass-dpdk` | dependiente — hugepages para DPDK | Sí |
| `06-cpu-cache-locality-alignment` | complementario — localidad de memoria virtual | No |
| `23-process-scheduler-namespaces` | complementario — cgroups memory limits | No |

---

## 9. Metadatos del Skill

```yaml
---
id: virtual-memory-paging
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [virtual-memory, paging, TLB, hugepages, mmap, THP, page-fault, swap, Linux]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

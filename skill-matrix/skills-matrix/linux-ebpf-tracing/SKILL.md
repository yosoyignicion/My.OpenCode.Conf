---
name: linux-ebpf-tracing
description: "eBPF (extended Berkeley Packet Filter) resuelve la necesidad de extender el kernel Linux de forma segura y eficiente sin modificar código fuente del kernel ni cargar módulos"
---
# Linux eBPF & Tracing

## Semantic Triggers
```
eBPF program attach to kprobe tracepoint, bpftrace one-liner tracing, BCC Python eBPF trace tool, perf event array eBPF maps, CO-RE BTF portability, cgroups eBPF networking policy
```

---

## 1. Definición Teórica

eBPF (extended Berkeley Packet Filter) resuelve la necesidad de extender el kernel Linux de forma segura y eficiente sin modificar código fuente del kernel ni cargar módulos. El principio fundamental es que programas eBPF se verifican en tiempo de carga (verifier) para garantizar que terminan y no corrompen memoria, y se ejecutan en un sandbox dentro del kernel en respuesta a eventos (kprobes, tracepoints, perf events, XDP, cgroups). Arquitectónicamente, eBPF reemplaza el modelo clásico de módulos de kernel (riesgosos, sin verificación) y el tracing tradicional (perf, strace — con overhead de syscall). Existe como tecnología diferenciada porque combina programabilidad, seguridad formal y eficiencia (JIT compilation a código nativo) en un solo framework de observabilidad y control del kernel.

---

## 2. Implementación de Referencia

libbpf ≥1.5 (C) con CO-RE (Compile Once, Run Everywhere). bpftrace ≥0.21 (one-liners). BCC ≥0.35 (Python). Kernel ≥5.15 (BTF obligatorio). Idiomas: C (programas eBPF), Python/BCC (control de userspace), Rust (aya-rs).

### Ejemplo Práctico Avanzado

```c
// eBPF program en C: contar syscalls por proceso usando CO-RE
// archivo: syscount.bpf.c
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u32);   // PID
    __type(value, u64); // contador
} syscall_count SEC(".maps");

// Array para almacenar el nombre del syscall
struct {
    __uint(type, BPF_MAP_TYPE_PERF_EVENT_ARRAY);
    __uint(key_size, sizeof(u32));
    __uint(value_size, sizeof(u32));
} events SEC(".maps");

SEC("tracepoint/raw_syscalls/sys_enter")
int trace_sys_enter(struct trace_event_raw_sys_enter* ctx) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 *val, zero = 0;

    val = bpf_map_lookup_or_try_init(&syscall_count, &pid, &zero);
    if (val) __sync_fetch_and_add(val, 1);

    // Enviar a perf event ring buffer
    s32 syscall_id = ctx->id;
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &syscall_id, sizeof(syscall_id));

    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```

```python
# userspace: cargar y leer eventos (BCC Python)
from bcc import BPF
import ctypes

b = BPF(src_file="syscount.bpf.c")
tracepoint_fn = b.load_func("trace_sys_enter", BPF.TRACEPOINT)
BPF.attach_tracepoint(tp="raw_syscalls:sys_enter", fn=tracepoint_fn)

def print_event(cpu, data, size):
    syscall_id = ctypes.c_int.from_buffer(ctypes.create_string_buffer(data, 4)).value
    print(f"syscall: {syscall_id} (CPU {cpu})")

b["events"].open_perf_buffer(print_event)

while True:
    try:
        b.perf_buffer_poll(timeout=100)
    except KeyboardInterrupt:
        break
```

**Fuente oficial:** https://ebpf.io/what-is-ebpf/ — https://github.com/iovisor/bcc

### Alternativa de Implementación Específica

**bpftrace one-liners para diagnóstico rápido en producción:**

```bash
# Syscalls más frecuentes por proceso
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Latencia de open() en microsegundos
bpftrace -e 'kprobe:do_sys_open { @ts[tid] = nsecs; }
             kretprobe:do_sys_open /@ts[tid]/ {
               $lat = (nsecs - @ts[tid]) / 1000;
               @lat_us[comm] = hist($lat);
               delete(@ts[tid]);
             }'

# Seguimiento de write() con tamaño
bpftrace -e 'tracepoint:syscalls:sys_enter_write { printf("%s write %d bytes\n", comm, arg2); }'
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Diagnóstico de producción sin reinicio, seguridad de contenedores (Seccomp BPF), redes (XDP, TC), profiling de latencia, monitoreo continuo de kernel |
| **Cuándo evitar** | Tracing simple con strace/ltrace (basta), programas complejos con estado que requieren >1M instrucciones, lo que el verifier rechaza, sistemas con kernel sin BTF (<5.2) |
| **Alternativas** | `ftrace` (built-in, sin programabilidad), `perf` (hardware counters), `systemtap` (similar pero más pesado), `strace` (simple, overhead alto), `SELinux/AppArmor` (políticas de seguridad, no programables) |
| **Coste/Complejidad** | Medio: el verifier impone restricciones que requieren aprendizaje (bucles acotados, stack limitado a 512 bytes). CO-RE/BTF simplifica la portabilidad. bpftrace es fácil; BCC/libbpf requieren conocimientos de kernel |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Verifier reject: "back-edge from insn 42 to 15"

**¿Qué ocasionó el error?**
El programa eBPF contenía un bucle no desenrollado. El verifier de eBPF rechaza bucles hacia atrás (back-edge) a menos que se use `__attribute__((unrollable))` con un número fijo de iteraciones conocido en tiempo de compilación.

**¿Cómo se solucionó?**
Desenrollar manualmente el bucle o usar `bpf_for_each_map_elem()` para iterar:

```c
// En lugar de:
for (int i = 0; i < n; i++) process(i);  // ❌ back-edge

// Usar:
#define UNROLL_COUNT 8
int i = 0;
if (i < UNROLL_COUNT) { process(i); i++; }
if (i < UNROLL_COUNT) { process(i); i++; }
// ... 8 veces

// O mejor: bpf_for_each_map_elem con callback
struct callback_ctx { int acc; };
int sum_fn(__u32 *key, __u64 *val, struct callback_ctx *ctx) {
    ctx->acc += *val;
    return 0;
}
bpf_for_each_map_elem(&my_map, sum_fn, &ctx, 0);
```

**¿Por qué funciona esta técnica?**
El verifier requiere que todos los caminos de ejecución sean acotables. `bpf_for_each_map_elem` es una función helper verificada que itera de forma segura. El desenrollado manual convierte el bucle en código lineal.

### Caso: CO-RE: "libbpf: failed to find BTF for type 'task_struct'"

**¿Qué ocasionó el error?**
El kernel no exporta BTF (BPF Type Format) o el programa eBPF se compiló contra un `vmlinux.h` de versión diferente a la del kernel en ejecución.

**¿Cómo se solucionó?**
Verificar BTF y generar el archivo correcto:

```bash
# Verificar si el kernel tiene BTF
ls -l /sys/kernel/btf/vmlinux || echo "No BTF - actualizar kernel a >=5.2"

# Generar vmlinux.h para el kernel actual
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h
# Recompilar el programa eBPF con este vmlinux.h
```

**¿Por qué funciona esta técnica?**
CO-RE (Compile Once Run Everywhere) usa BTF para adaptar el programa eBPF al kernel destino en tiempo de carga. Si BTF no está disponible o no coincide, libbpf falla. Generar `vmlinux.h` del kernel actual garantiza compatibilidad.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `eBPF program attach to kprobe tracepoint`
- **Prioridad de carga:** Alta — herramienta fundamental para observabilidad de producción
- **Dependencias:** `08-kernel-bypass-dpdk` (XDP eBPF), `16-system-calls-overhead-tracing` (tracing de syscalls con eBPF)

### Tool Integration

```json
{
  "tool_name": "linux-ebpf-tracing",
  "description": "Programación eBPF para tracing, redes, seguridad y observabilidad del kernel Linux",
  "triggers": ["eBPF", "bpftrace", "BCC", "tracing", "kprobe", "tracepoint", "CO-RE", "BTF"],
  "context_hint": "Inyectar ejemplo de eBPF program (kprobe/tracepoint) con BCC Python o libbpf C",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre tracing del kernel, eBPF o observabilidad de producción,
carga el skill linux-ebpf-tracing. Proporciona ejemplos de bpftrace one-liners
y un programa eBPF completo con BCC. Explica CO-RE/BTF para portabilidad.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# bpftrace one-liners esenciales
bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }'
bpftrace -e 'kprobe:vfs_read { @[comm] = sum(arg2); }'

# BCC tools pre-empaquetadas
execsnoop   # seguimiento de nuevos procesos
tcptop      # tráfico TCP por proceso
biolatency  # latencia de I/O de bloques
cpudist     # distribución de tiempo de CPU

# Gestión de programas eBPF
bpftool prog list
bpftool map dump name syscall_count
```

### GUI / Web

- **bpftop**: dashboard interactivo estilo htop para programas eBPF
- **Pixie (by New Relic)**: plataforma de observabilidad eBPF con UI web
- **Cilium Hubble**: UI para redes eBPF en Kubernetes
- **eBPF.supervision**: plataforma de gestión de programas eBPF

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Listar programas eBPF | `bpftool prog list` | `Cilium → Hubble UI` |
| Ver mapa de contadores | `bpftool map dump name <map>` | `bpftop` |
| One-liner rápido | `bpftrace -e 'k:do_sys_open { @[comm]++ }'` | `Pixie → Scripts → syscall` |

---

## 7. Cheatsheet Rápido

```bash
# eBPF esencial — 8 líneas
# One-liner: syscalls por proceso
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Latencia de open
bpftrace -e 'k:do_sys_open { @ts[tid] = nsecs; }
             kr:do_sys_open /@ts[tid]/ { @ = hist(nsecs - @ts[tid]); delete(@ts[tid]); }'
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-kernel-bypass-dpdk` | complementario — XDP eBPF para redes | Sí |
| `16-system-calls-overhead-tracing` | dependiente — tracing de syscalls con eBPF | Sí |
| `23-process-scheduler-namespaces` | complementario — cgroups eBPF | No |
| `04-devops-platform/11-ebpf-based-networking-cilium` | complementario — Cilium para redes eBPF en K8s | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: linux-ebpf-tracing
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [eBPF, tracing, bpftrace, BCC, libbpf, kprobe, tracepoint, CO-RE, BTF, observability]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

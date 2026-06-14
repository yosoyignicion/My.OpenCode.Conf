---
name: io-scheduling-linux
description: "El I/O scheduler del kernel Linux resuelve la optimización del acceso al disco gestionando el orden en que las peticiones de bloques se entregan al dispositivo de almacenamiento, maximizando throug..."
---
# I/O Scheduling — Linux

## Semantic Triggers
```
I/O scheduler deadline CFQ vs kyber, blk-mq multi-queue block layer, IOPS vs latency I/O tuning, mq-deadline vs none scheduler, blk-mq hardware dispatch software staging, block layer multi-queue scalability
```

---

## 1. Definición Teórica

El I/O scheduler del kernel Linux resuelve la optimización del acceso al disco gestionando el orden en que las peticiones de bloques se entregan al dispositivo de almacenamiento, maximizando throughput y minimizando latencia según el tipo de carga. El principio fundamental es que los discos (HDD, SSD, NVMe) tienen características físicas diferentes: HDDs necesitan merging de peticiones secuenciales para minimizar seek time, mientras que NVMe requiere mínima intervención del scheduler para evitar overhead. Arquitectónicamente, el block layer moderno (blk-mq) usa múltiples colas de envío (hardware dispatch queues) y software staging queues, con schedulers intercambiables (mq-deadline, kyber, none) que se configuran por dispositivo. Existen como capa diferenciada porque el scheduler incorrecto puede degradar el rendimiento 2-5x en cargas de trabajo reales.

---

## 2. Implementación de Referencia

Linux kernel ≥6.x con blk-mq (multi-queue block layer). Schedulers: `mq-deadline` (default SSD/NVMe), `bfq` (HDD), `kyber` (latency-focused), `none` (NVMe alta performance). Idiomas: C (kernel), sysfs tuning.

### Ejemplo Práctico Avanzado

```bash
# Inspeccionar y cambiar I/O scheduler por dispositivo
# Ver schedulers disponibles y activo
cat /sys/block/nvme0n1/queue/scheduler
# Salida: [mq-deadline] kyber none

# Para NVMe: none (menos overhead)
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Para SSD SATA: mq-deadline
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Para HDD: bfq (mejor fairness)
echo bfq | sudo tee /sys/block/sdb/queue/scheduler

# Tuning de mq-deadline
echo 100 | sudo tee /sys/block/nvme0n1/queue/iosched/fifo_expire_read
echo 500 | sudo tee /sys/block/nvme0n1/queue/iosched/fifo_expire_write

# Deshabilitar merging para NVMe (reduce latencia a costa de throughput)
echo 0 | sudo tee /sys/block/nvme0n1/queue/nomerges
```

```c
// Medir rendimiento de I/O con diferentes schedulers (C con libaio)
// Más práctico: fio para benchmarks

// Ejemplo fio:
// fio --name=test --ioengine=libaio --iodepth=64 --rw=randread
//     --bs=4k --direct=1 --numjobs=4 --runtime=30s
//     --filename=/dev/nvme0n1
// Cambiar scheduler y repetir para comparar
```

**Análisis de latencia con iostat y perf:**

```bash
# iostat extendido
iostat -x 1  # %util, await, svctm, r_await, w_await

# Si await >> svctm, el scheduler tiene cola larga
# Si %util ~100% con baja IOPS, hay bottleneck en el scheduler o device

# Latencia por percentil con btptrace
bpftrace -e 'kprobe:blk_account_io_done {
    @usec = hist((nsecs - @io_start[arg1]) / 1000);
    delete(@io_start[arg1]);
}
kprobe:blk_account_io_start {
    @io_start[arg1] = nsecs;
}' -c 'fio --name=t --rw=read --bs=4k --size=1G'
```

**Fuente oficial:** https://www.kernel.org/doc/html/latest/block/index.html

### Alternativa de Implementación Específica

**Configuración persistente con udev:**

```bash
# /etc/udev/rules.d/60-iosched.rules
# NVMe: none scheduler
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="none"

# HDD rotate: bfq
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="bfq"

# SSD SATA: mq-deadline
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Tuning de almacenamiento para cargas específicas (bases de datos, colas de mensajes, logs), diagnóstico de latencia de I/O, servidores con múltiples tipos de disco (NVMe + HDD), benchmarks de rendimiento |
| **Cuándo evitar** | Sistemas con un solo tipo de disco (el default del kernel es adecuado), cargas con I/O moderado donde el scheduler no es cuello de botella, containers donde el scheduler lo gestiona el host |
| **Alternativas** | io_uring (bypass del scheduler para NVMe), SPDK (driver en userspace, bypass total del kernel), `ionice` (priorización de I/O por proceso), cgroups IO (limitación de IOPS/bytes) |
| **Coste/Complejidad** | Bajo: cambiar scheduler es `echo > /sys/...`. La complejidad está en medir cuál scheduler funciona mejor para cada carga. El tuning fino requiere entender las métricas de iostat y blktrace |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: NVMe con mq-deadline tiene latencia 2x vs none

**¿Qué ocasionó el error?**
`mq-deadline` ordena y mergea peticiones, añadiendo overhead de CPU y latencia. Para NVMe (que tiene su propio scheduler en el controlador), este overhead es innecesario y empeora la latencia.

**¿Cómo se solucionó?**
Cambiar a `none` scheduler para NVMe:

```bash
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler
# Verificar:
cat /sys/block/nvme0n1/queue/scheduler
# [none] mq-deadline kyber
```

Benchmark antes/después:
```bash
fio --name=test --ioengine=libaio --iodepth=64 --rw=randread --bs=4k --direct=1 --numjobs=4 --runtime=30s --filename=/dev/nvme0n1 --output-format=json
```

**¿Por qué funciona esta técnica?**
NVMe tiene su propio hardware scheduler (multiple queues, command arbitration). El scheduler del kernel (`mq-deadline`) añade otra capa de ordenamiento que compite con el del hardware. `none` solo pasa las peticiones directamente al device driver, delegando todo el scheduling al controlador NVMe.

### Caso: await >> svctm en HDD con bfq

**¿Qué ocasionó el error?**
`iostat -x` mostraba `await: 50ms` vs `svctm: 8ms`. La diferencia indica que las peticiones pasaban mucho tiempo en cola del scheduler. `bfq` estaba priorizando fairness sobre throughput, causando latencia alta para algunos procesos.

**¿Cómo se solucionó?**
Cambiar a `mq-deadline` o ajustar los tiempos de expiración de bfq:

```bash
# Para HDD con carga batch: deadline reduce latencia
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Tuning: reducir tiempo de expiración de lecturas
echo 50 | sudo tee /sys/block/sda/queue/iosched/read_expire
```

**¿Por qué funciona esta técnica?**
`bfq` (Budget Fair Queuing) asigna time slices a procesos para garantizar fairness, pero en HDDs con carga mezclada puede acumular cola. `mq-deadline` tiene un timeout fijo por petición (default 500ms writes, 100ms reads) que garantiza latencia máxima. La diferencia entre `await` y `svctm` es directamente el tiempo de cola.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~165 tokens estimados al invocar este skill
- **Trigger de activación:** `I/O scheduler deadline CFQ vs kyber`
- **Prioridad de carga:** Media — tuning de almacenamiento para servidores
- **Dependencias:** `01-io-multiplexing-iouring` (I/O async alternativa), `28-performance-profiling-optimization` (medición de I/O)

### Tool Integration

```json
{
  "tool_name": "io-scheduling-linux",
  "description": "Planificación de I/O en Linux: schedulers (mq-deadline, bfq, kyber, none), blk-mq, y tuning",
  "triggers": ["I/O scheduler", "blk-mq", "mq-deadline", "bfq", "kyber", "iostat", "IOPS", "latency"],
  "context_hint": "Inyectar ejemplo de cambio de scheduler y medición con fio/iostat",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre planificación de I/O o rendimiento de disco en Linux,
carga el skill io-scheduling-linux. Proporciona ejemplos de cambio de scheduler
y medición con fio/iostat. Explica qué scheduler usar para NVMe vs HDD.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver scheduler actual y disponibles
cat /sys/block/nvme0n1/queue/scheduler

# Cambiar scheduler
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Monitoreo de I/O
iostat -x 1  # ver await, svctm, %util
iostat -x 1 | awk '{if ($2 ~ /nvme/ || $2 ~ /sd/) print $1, $2, $7, $10+$11}'

# Blktrace: tracing detallado de I/O
blktrace -d /dev/nvme0n1 -o - | blkparse -i -
```

### GUI / Web

- **`iotop`**: monitoreo de I/O por proceso con UI (tecla `o` para filtro)
- **`gnome-disks`**: benchmark gráfico de disco
- **`KDiskMark`**: GUI para benchmarks de almacenamiento
- **`nvme-cli`**: comandos específicos NVMe (list, smart-log, format)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver scheduler | `cat /sys/block/*/queue/scheduler` | `gnome-disks → Settings → scheduler` |
| Monitorear I/O | `iostat -x 1` | `iotop (tecla o)` |
| Benchmark | `fio --name=t --rw=randread --bs=4k --size=1G` | `KDiskMark` |

---

## 7. Cheatsheet Rápido

```bash
# I/O scheduler — 7 líneas
# Ver: cat /sys/block/nvme0n1/queue/scheduler
# Cambiar: echo none > /sys/block/nvme0n1/queue/scheduler
# Medir: iostat -x 1 (await vs svctm)
# Comparar: fio --name=t --rw=randread --bs=4k --direct=1 --filename=/dev/nvme0n1
# NVMe → none | SSD SATA → mq-deadline | HDD → bfq
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `01-io-multiplexing-iouring` | alternativo — I/O async sin scheduler | Sí |
| `28-performance-profiling-optimization` | dependiente — medición de I/O con perf | Sí |
| `20-numa-architectures-tuning` | complementario — afinidad de IRQ de disco | No |
| `04-devops-platform/10-container-orchestration-k8s-scheduling` | complementario — I/O en containers | No |

---

## 9. Metadatos del Skill

```yaml
---
id: io-scheduling-linux
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [I/O scheduler, blk-mq, mq-deadline, bfq, kyber, Linux, storage, iostat, fio]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

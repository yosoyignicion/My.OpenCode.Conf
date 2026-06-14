---
name: kernel-bypass-dpdk
description: "El kernel bypass resuelve la latencia y overhead del stack de red del kernel Linux, que puede consumir >50% de los ciclos de CPU en redes de alta velocidad (≥25Gbps)"
---
# Kernel Bypass & DPDK

## Semantic Triggers
```
DPDK poll mode driver packet processing, XDP eXpress Data Path eBPF hook, AF_XDP socket zero-copy, kernel bypass network stack, userspace networking high-throughput, RDMA InfiniBand remote direct memory access
```

---

## 1. Definición Teórica

El kernel bypass resuelve la latencia y overhead del stack de red del kernel Linux, que puede consumir >50% de los ciclos de CPU en redes de alta velocidad (≥25Gbps). El principio fundamental es trasladar el procesamiento de paquetes de red al espacio de usuario (DPDK) o al early hook del kernel antes del stack TCP/IP (XDP), eliminando syscalls, context switches e interrupciones por paquete. Arquitectónicamente, DPDK usa poll-mode drivers (PMD) que toman control directo de la NIC mediante UIO/VFIO, mientras XDP se ejecuta como eBPF en el driver de red antes de `skb` allocation. Existen como mecanismos diferenciados porque el stack de red genérico (TCP/IP en kernel) está optimizado para throughput moderado, no para latencia de microsegundos o millones de paquetes por segundo.

---

## 2. Implementación de Referencia

DPDK ≥24.11 (Data Plane Development Kit). Idiomas: C (primario), Rust (experimental con netbricks/io-uring), Python (bindings). Kernel ≥5.0 para AF_XDP, ≥4.8 para XDP.

### Ejemplo Práctico Avanzado

```c
#include <rte_eal.h>
#include <rte_ethdev.h>
#include <rte_mbuf.h>
#include <rte_mempool.h>

#define RX_RING_SIZE 1024
#define NUM_MBUFS 8191
#define MBUF_CACHE_SIZE 250
#define BURST_SIZE 32

static const struct rte_eth_conf port_conf_default = {
    .rxmode = { .max_rx_pkt_len = RTE_ETHER_MAX_LEN }
};

int main(int argc, char *argv[]) {
    // Inicializar Environment Abstraction Layer
    int ret = rte_eal_init(argc, argv);
    if (ret < 0) rte_exit(EXIT_FAILURE, "EAL init failed\n");

    uint16_t port_id = 0;
    struct rte_mempool *mbuf_pool = rte_pktmbuf_pool_create(
        "MBUF_POOL", NUM_MBUFS, MBUF_CACHE_SIZE, 0,
        RTE_MBUF_DEFAULT_BUF_SIZE, rte_socket_id());

    // Configurar puerto
    struct rte_eth_conf port_conf = port_conf_default;
    rte_eth_dev_configure(port_id, 1, 1, &port_conf);
    rte_eth_rx_queue_setup(port_id, 0, RX_RING_SIZE,
                           rte_eth_dev_socket_id(port_id), NULL, mbuf_pool);
    rte_eth_dev_start(port_id);

    printf("DPDK forwarding on port %u\n", port_id);

    // Bucle principal: poll-mode, sin interrupciones
    struct rte_mbuf *bufs[BURST_SIZE];
    while (1) {
        uint16_t nb_rx = rte_eth_rx_burst(port_id, 0, bufs, BURST_SIZE);

        for (int i = 0; i < nb_rx; i++) {
            struct rte_ether_hdr *eth_hdr =
                rte_pktmbuf_mtod(bufs[i], struct rte_ether_hdr*);

            // Procesar paquete (ej: contar tráfico)
            if (RTE_ETH_IS_IPV4_HDR(eth_hdr->ether_type)) {
                // forward/reverse/packet processing
            }

            rte_pktmbuf_free(bufs[i]);
        }
    }

    rte_eth_dev_stop(port_id);
    rte_eal_cleanup();
    return 0;
}
```

**Fuente oficial:** https://doc.dpdk.org/guides/prog_guide/intro.html

### Alternativa de Implementación Específica

**AF_XDP + eBPF** para integración con el stack de red sin monopolizar la NIC:

```c
// XDP program: descartar tráfico no IPv4 antes del kernel
SEC("xdp")
int xdp_pass(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if (eth + 1 > data_end)
        return XDP_ABORTED;

    if (eth->h_proto == htons(ETH_P_IP)) {
        return XDP_PASS;  // solo IPv4 llega al stack TCP
    }
    return XDP_DROP;  // descartar antes de skb
}

// Compilar: clang -O2 -target bpf -c xdp_prog.c -o xdp_prog.o
// Cargar: ip link set dev eth0 xdp obj xdp_prog.o
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Ruteo/switching a velocidad de línea (≥25Gbps/port), firewalls de alto rendimiento, NFV, 5G UPF, trading de baja latencia (<10μs), packet brokers |
| **Cuándo evitar** | Aplicaciones que requieren stack TCP completo (DPDK no tiene TCP nativo), tráfico moderado (<10Gbps donde el kernel basta), entornos virtualizados sin VFIO passthrough, prototipado rápido |
| **Alternativas** | XDP + AF_XDP (kernel bypass parcial, sin monopolizar NIC), io_uring (para storage I/O, no red), RDMA/InfiniBand (carga remota sin CPU), VPP (Vector Packet Processing sobre DPDK) |
| **Coste/Complejidad** | Muy alto: DPDK requiere dedicar núcleos completos, memoria hugepages, configuración de NIC en modo promiscuo, y reimplementar lógica de red. Sin stack TCP/IP por defecto |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: rte_eal_init falla con "EAL: No available hugepages"

**¿Qué ocasionó el error?**
DPDK requiere hugepages (2MB o 1GB) para sus pools de memoria. Si el sistema no tiene hugepages reservadas, EAL falla inmediatamente.

**¿Cómo se solucionó?**
Reservar hugepages antes de ejecutar la aplicación:

```bash
# Reservar 1024 hugepages de 2MB
echo 1024 | sudo tee /proc/sys/vm/nr_hugepages
# O configurar en /etc/default/grub:
# GRUB_CMDLINE_LINUX="default_hugepagesz=1G hugepagesz=1G hugepages=8"
```

**¿Por qué funciona esta técnica?**
DPDK usa `mmap` con `MAP_HUGETLB` para asignar memoria físicamente contigua accesible desde la NIC mediante IOMMU. Sin hugepages, las páginas de 4KB rompen la contigüidad necesaria para los descriptors de anillo DMA.

### Caso: AF_XDP ring overflow con tráfico intenso

**¿Qué ocasionó el error?**
Cuando la aplicación de userspace no vacía el RX ring suficientemente rápido, el kernel descarta paquetes porque el ring de AF_XDP está lleno. Se pierde tráfico sin notificación.

**¿Cómo se solucionó?**
Aumentar el tamaño del ring y usar batch processing:

```c
// Socket AF_XDP
struct xsk_umem_info umem;
struct xsk_socket_info xsk;
xsk_socket__create(&xsk->xsk, "eth0", 0, umem->umem, &rxq, &txq, &config);

// Batch: procesar 64 paquetes por iteración
while (1) {
    unsigned int rcvd, idx;
    rcvd = xsk_ring_cons__peek(&xsk->rx, 64, &idx);
    if (!rcvd) continue;

    for (int i = 0; i < rcvd; i++) {
        char *pkt = xsk_umem__get_data(xsk->umem->buffer,
                       xsk_ring_cons__rx_desc(&xsk->rx, idx + i)->addr);
        process_packet(pkt);
    }
    xsk_ring_cons__release(&xsk->rx, rcvd);
}
```

**¿Por qué funciona esta técnica?**
Lotes de 64 paquetes amortizan el overhead de `xsk_ring_cons__release` sobre el costo por paquete, igualando el throughput de llegada de la NIC.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~180 tokens estimados al invocar este skill
- **Trigger de activación:** `DPDK poll mode driver packet processing`
- **Prioridad de carga:** Media — especializado para redes de ultra-alto rendimiento
- **Dependencias:** `09-linux-ebpf-tracing` (XDP complementario), `01-io-multiplexing-iouring` (alternativa para storage)

### Tool Integration

```json
{
  "tool_name": "kernel-bypass-dpdk",
  "description": "Kernel bypass para redes de alta velocidad con DPDK, XDP/eBPF y AF_XDP",
  "triggers": ["DPDK", "XDP", "kernel bypass", "AF_XDP", "PMD", "userspace networking", "hugepages"],
  "context_hint": "Inyectar ejemplo de DPDK main loop con rte_eth_rx_burst para procesamiento de paquetes",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre kernel bypass o redes de alta velocidad, carga el skill
kernel-bypass-dpdk. Proporciona ejemplos de DPDK con PMD y XDP/eBPF como alternativa ligera.
Explica la configuración de hugepages y UIO/VFIO.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Verificar soporte de NIC para DPDK
dpdk-devbind.py --status

# Asignar NIC a VFIO driver
dpdk-devbind.py -b vfio-pci 0000:01:00.0

# Ejecutar ejemplo de DPDK
dpdk-l2fwd -l 0-1 -n 2 -- -p 0x1

# Cargar programa XDP
ip link set dev eth0 xdp obj xdp_pass.o

# Medir throughput de paquetes
dpdk-pktgen -l 0-3 -n 4 -- -P -m "[1:2].0"
```

### GUI / Web

- **DPDK Packet Framework GUI**: dashboard de configuración de pipelines de paquetes
- **XDP-tutorial con bpftool**: visualización de programas XDP cargados
- **Intel VTune + DPDK**: profiling de PMD performance
- **Wireshark con AF_PACKET**: captura de paquetes antes/después de procesamiento DPDK

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver NICs disponibles | `dpdk-devbind.py --status` | `DPDK-GUI → Device Manager` |
| Cargar XDP | `ip link set dev eth0 xdp obj prog.o` | `bpftool p show` |
| Ejecutar testpmd | `dpdk-testpmd -l 0-3 -n 4 -- -i` | `testpmd GUI in browser` |

---

## 7. Cheatsheet Rápido

```c
// Loop principal DPDK — 10 líneas
struct rte_mbuf *bufs[32];
while (1) {
    uint16_t nb = rte_eth_rx_burst(port, 0, bufs, 32);
    for (i = 0; i < nb; i++) {
        process(rte_pktmbuf_mtod(bufs[i], char*));
        rte_pktmbuf_free(bufs[i]);
    }
}
// Requiere: hugepages, VFIO, core dedicado
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `09-linux-ebpf-tracing` | complementario — XDP sobre eBPF | Sí |
| `01-io-multiplexing-iouring` | alternativo — I/O asíncrono sin kernel bypass | No |
| `11-virtual-memory-paging` | dependiente — hugepages para DPDK | Sí |
| `20-numa-architectures-tuning` | complementario — afinidad de núcleo/NIC NUMA | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: kernel-bypass-dpdk
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [DPDK, XDP, eBPF, kernel-bypass, AF_XDP, PMD, networking, NIC, userspace]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

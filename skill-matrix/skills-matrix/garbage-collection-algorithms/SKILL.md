---
name: garbage-collection-algorithms
description: "El garbage collector resuelve la gestión automática de memoria liberando objetos no referenciados, eliminando la necesidad de `free`/`delete` explícitos y los bugs asociados (use-after-free, double..."
---
# Garbage Collection Algorithms

## Semantic Triggers
```
generational garbage collection young old generation, tricolor mark-sweep concurrent GC, G1 garbage first heap region, ZGC sub-millisecond pause, Shenandoah concurrent evacuation, reference counting cycle detection
```

---

## 1. Definición Teórica

El garbage collector resuelve la gestión automática de memoria liberando objetos no referenciados, eliminando la necesidad de `free`/`delete` explícitos y los bugs asociados (use-after-free, double-free, leaks). El principio fundamental es que el GC identifica objetos alcanzables desde las raíces (stacks, registros, globales) y recolecta el resto, utilizando algoritmos como mark-sweep, copying, o generacional. Arquitectónicamente, los GCs modernos (G1, ZGC, Shenandoah) son concurrentes —operan mientras la aplicación corre— y generacionales —optimizan para la "hipótesis generacional débil" (la mayoría de objetos mueren jóvenes). Existen como mecanismo diferenciado del manejo manual de memoria porque ofrecen seguridad de memoria a costa de pausas (STW) y overhead de CPU.

---

## 2. Implementación de Referencia

HotSpot JVM ≥21 con G1GC (default), ZGC (baja latencia), Shenandoah. Idiomas: Java, Go (GC concurrente), V8 (JavaScript), .NET (Server GC). Implementación canónica en OpenJDK.

### Ejemplo Práctico Avanzado

```java
// Configuración avanzada de GC en JVM
// java -XX:+UseZGC -XX:SoftMaxHeapSize=2g -Xmx4g -Xms1g -XX:ZCollectionInterval=60 MyApp

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.util.List;

public class GCMonitor {
    // Monitorear pausas de GC en tiempo real
    public static void monitorGC() {
        List<GarbageCollectorMXBean> beans =
            ManagementFactory.getGarbageCollectorMXBeans();

        for (var bean : beans) {
            System.out.printf("GC: %s | Count: %d | Time: %dms%n",
                bean.getName(),
                bean.getCollectionCount(),
                bean.getCollectionTime());
        }
    }

    // Simular carga que genera GC pressure
    public static void generateGarbage() {
        var list = new java.util.ArrayList<byte[]>();
        try {
            for (int i = 0; i < 1000; i++) {
                list.add(new byte[1024 * 1024]);  // 1MB cada uno
                if (i % 100 == 0) {
                    System.gc();  // sugerencia (no garantizada)
                    monitorGC();
                }
                Thread.sleep(100);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public static void main(String[] args) {
        System.out.println("=== GC Monitoring ===");
        System.out.printf("Initial heap: %d MB%n",
            Runtime.getRuntime().totalMemory() / 1024 / 1024);

        generateGarbage();

        System.out.printf("Final heap: %d MB%n",
            Runtime.getRuntime().totalMemory() / 1024 / 1024);
    }
}
```

```bash
# Flags JVM para producción con G1GC
# -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:ParallelGCThreads=4
# -XX:ConcGCThreads=2 -XX:G1HeapRegionSize=4m
# -Xlog:gc*:file=gc.log:time,pid,tags

# ZGC para latencia <1ms
# -XX:+UseZGC -XX:SoftMaxHeapSize=2g -Xmx4g
```

**Fuente oficial:** https://openjdk.org/groups/hotspot/docs/HotSpotGlossary.html

### Alternativa de Implementación Específica

**Go GC — concurrente, no generacional, con pacing:**

```go
package main

import (
    "fmt"
    "runtime"
    "runtime/debug"
    "time"
)

func main() {
    // Configurar GC
    debug.SetGCPercent(100)  // trigger cuando heap crece 100%
    debug.SetMemoryLimit(512 * 1024 * 1024)  // soft memory limit

    var stats runtime.MemStats
    for i := 0; i < 10; i++ {
        // Forzar GC
        runtime.GC()
        runtime.ReadMemStats(&stats)

        fmt.Printf("GC %d: Heap=%d MB, Pause=%d μs\n",
            i,
            stats.HeapAlloc/1024/1024,
            stats.PauseNs[(stats.NumGC-1)%256]/1000)
        time.Sleep(1 * time.Second)
    }
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones donde la gestión manual de memoria es inviable (web APIs, microservicios, apps empresariales), lenguajes con GC runtime (Java, Go, C#, JS, Python), sistemas donde la productividad del desarrollador pesa más que el control de memoria |
| **Cuándo evitar** | Sistemas de tiempo real estricto (GC pausas impredecibles), kernels, drivers, sistemas embebidos con memoria limitada, aplicaciones donde pausas >1ms son inaceptables (audio en tiempo real, trading) |
| **Alternativas** | RAII/Borrow Checker (Rust, C++ — determinista, sin pausas), ARC (Swift — automático pero con overhead de conteo), gestión manual (C — máximo control, máximo riesgo), pool allocators (juegos, audio) |
| **Coste/Complejidad** | Bajo para el desarrollador (automático), alto para el runtime (hasta 20% overhead de CPU). Los GCs modernos (ZGC, Shenandoah) logran pausas <1ms pero con mayor uso de CPU. El tuning de GC es complejo y específico de cada aplicación |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: G1GC "to-space exhausted" pese a heap suficiente

**¿Qué ocasionó el error?**
G1GC divide el heap en regiones. Durante una evacuación (copia de objetos de regiones origen a destino), si las regiones destino están llenas, ocurre "to-space overflow". Esto fuerza un STW full GC (serial) que puede durar segundos.

**¿Cómo se solucionó?**
Aumentar la reserva de espacio de evacuación y ajustar el ratio de regiones reservadas:

```bash
-XX:G1ReservePercent=20      # reservar 20% del heap para copia
-XX:+UnlockExperimentalVMOptions
-XX:G1MixedGCLiveThresholdPercent=85  # evitar regiones casi llenas
-XX:G1HeapWastePercent=5     # forzar GC mixto temprano
```

**¿Por qué funciona esta técnica?**
G1 necesita espacio libre para copiar objetos durante la evacuación. `G1ReservePercent` reserva un porcentaje del heap específicamente para este propósito. Si la reserva es insuficiente, G1 no puede evacuar y cae en full GC.

### Caso: ZGC pausas largas (>1ms) periódicas

**¿Qué ocasionó el error?**
ZGC es concurrente pero tiene fases STW cortas: pause mark start, pause mark end, pause relocate start. Si estas fases duran >1ms, puede ser por page faults de las forwarding tables o por contention en NUMA.

**¿Cómo se solucionó?**
Diagnosticar con `-Xlog:gc+heap*` y ajustar:

```bash
# Habilitar NUMA awareness
-XX:+UseNUMA
# Aumentar número de threads de GC concurrente
-XX:ConcGCThreads=8
# Relajar el objetivo de pausa
-XX:SoftMaxHeapSize=2g
# Logging detallado
-Xlog:gc+z:file=zgc.log
```

**¿Por qué funciona esta técnica?**
ZGC usa barreras de carga y coloración de punteros. En sistemas NUMA, las forwarding tables pueden estar en nodos remotos, causando latencia. `UseNUMA` asegura que las estructuras de ZGC se asignen en el nodo correcto.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `generational garbage collection young old generation`
- **Prioridad de carga:** Alta — GC es crítico para rendimiento de aplicaciones managed
- **Dependencias:** `03-memory-raii-borrowing` (alternativa manual), `28-performance-profiling-optimization` (medición de pausas)

### Tool Integration

```json
{
  "tool_name": "garbage-collection-algorithms",
  "description": "Algoritmos de garbage collection: generacional, G1, ZGC, Shenandoah, y tuning de JVM",
  "triggers": ["GC", "garbage collection", "G1", "ZGC", "Shenandoah", "JVM tuning", "mark-sweep"],
  "context_hint": "Inyectar ejemplo de configuración de G1/ZGC y monitoreo con JMX",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre garbage collection o tuning de JVM/Go GC, carga el skill
garbage-collection-algorithms. Proporciona ejemplos de flags G1/ZGC y monitoreo de pausas.
Compara con alternativas de gestión manual de memoria.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# JVM: log de GC detallado
java -Xlog:gc*:file=gc.log:time,pid,tags -jar app.jar

# Analizar log de GC
grep -E 'Pause Young|Pause Full' gc.log | tail -20
jhsdb jstat --gcutil <pid>

# Go: estadísticas de GC
GODEBUG=gctrace=1 ./goapp

# VisualVM: perfilado remoto de GC
jvisualvm --openjmx <host>:<port>
```

### GUI / Web

- **VisualVM**: monitoreo de heap, GC, y análisis de pausas
- **GCeasy**: analizador web de logs GC con recomendaciones
- **Java Mission Control (JMC)**: flight recorder para GC profiling
- **Grafana + Prometheus**: dashboards de GC con métricas JMX exportadas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Forzar GC | `jcmd <pid> GC.run` | `VisualVM → Perform GC` |
| Ver stats heap | `jstat -gc <pid> 1s` | `VisualVM → Monitor → Heap` |
| Analizar log GC | `grep 'Pause Full' gc.log \| tail` | `GCeasy → Upload log` |

---

## 7. Cheatsheet Rápido

```bash
# G1GC tuning — 8 líneas
java -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=100 \
     -XX:ParallelGCThreads=4 \
     -XX:ConcGCThreads=2 \
     -Xlog:gc*:file=gc.log \
     -jar app.jar

# ZGC baja latencia
java -XX:+UseZGC -XX:SoftMaxHeapSize=2g -Xmx4g -jar app.jar
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-memory-raii-borrowing` | alternativo — gestión manual vs automática | Sí |
| `28-performance-profiling-optimization` | dependiente — medición de pausas GC | Sí |
| `30-go-systems-production` | dependiente — GC de Go runtime | Sí |
| `11-virtual-memory-paging` | complementario — interacción GC con page tables | No |

---

## 9. Metadatos del Skill

```yaml
---
id: garbage-collection-algorithms
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [GC, garbage-collection, G1, ZGC, Shenandoah, JVM, mark-sweep, generational, tuning]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

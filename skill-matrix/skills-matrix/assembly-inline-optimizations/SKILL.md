---
name: assembly-inline-optimizations
description: "El assembly inline resuelve la necesidad de explotar instrucciones específicas de CPU o patrones de optimización que el compilador no genera automáticamente, permitiendo al programador escribir dir..."
---
# Assembly & Inline Optimizations

## Semantic Triggers
```
GCC extended inline assembly constraints, x86-64 assembly calling convention, hand-optimized assembly loops, SIMD assembly intrinsic wrapping, ARM NEON inline assembly, assembly optimization profiling perf annotate
```

---

## 1. Definición Teórica

El assembly inline resuelve la necesidad de explotar instrucciones específicas de CPU o patrones de optimización que el compilador no genera automáticamente, permitiendo al programador escribir directamente instrucciones de máquina dentro de código de alto nivel. El principio fundamental es que el compilador traduce código C/C++ a assembly, pero ciertas optimizaciones (instrucciones sin intrínseco SIMD, control preciso de pipeline, barreras de memoria específicas) solo son accesibles mediante assembly explícito. Arquitectónicamente, las extensiones de inline assembly (GCC extended asm, MSVC `__asm`) definen cláusulas de entrada, salida, clobber (registros modificados) y constraints que permiten al compilador integrar el código assembly con su propio registro allocation. Existe como técnica diferenciada porque los intrinsics (como `_mm_add_ps`) son wrappers 1:1 de instrucciones, mientras que inline assembly permite instrucciones sin intrínseco disponible y control exacto del código generado.

---

## 2. Implementación de Referencia

GCC ≥13, Clang ≥17 con extended inline assembly (`asm volatile`). Idiomas: C, C++. Arquitecturas: x86-64 (AT&T syntax default), ARM64, RISC-V.

### Ejemplo Práctico Avanzado

```c
#include <stdint.h>
#include <stdio.h>

// CPUID wrapper mediante inline assembly (instrucción sin intrínseco en GCC)
static void cpuid(uint32_t leaf, uint32_t subleaf,
                  uint32_t *eax, uint32_t *ebx,
                  uint32_t *ecx, uint32_t *edx) {
    __asm__ volatile(
        "cpuid\n\t"
        : "=a" (*eax), "=b" (*ebx), "=c" (*ecx), "=d" (*edx)
        : "a" (leaf), "c" (subleaf)
        : "memory"   // clobber: CPUID puede modificar memoria interna
    );
}

// Multiplicación de matrices 4x4 con AVX mediante inline asm
// (sin intrínseco directo para broadcasting + FMA)
void matmul_4x4_asm(float *C, const float *A, const float *B) {
    __asm__ volatile(
        // Cargar columnas de B
        "vmovups      (%[B]), %%ymm0\n\t"
        "vmovups   32(%[B]), %%ymm1\n\t"
        "vmovups   64(%[B]), %%ymm2\n\t"
        "vmovups   96(%[B]), %%ymm3\n\t"

        // Broadcast cada elemento de A y FMA
        "vbroadcastss 0(%[A]), %%ymm4\n\t"
        "vfmadd231ps  %%ymm4, %%ymm0, %%ymm8\n\t"
        "vbroadcastss 4(%[A]), %%ymm4\n\t"
        "vfmadd231ps  %%ymm4, %%ymm1, %%ymm8\n\t"

        // Almacenar resultado
        "vmovups   %%ymm8,  0(%[C])\n\t"

        : [C] "+r" (C), [A] "+r" (A), [B] "+r" (B)
        :
        : "ymm0", "ymm1", "ymm2", "ymm3",
          "ymm4", "ymm5", "ymm6", "ymm7",
          "ymm8", "memory"
    );
}

// Memory barrier con instrucción de fence
static inline void atomic_thread_fence_seq_cst(void) {
    __asm__ volatile("mfence" ::: "memory");
}

// Rotación de bits sin branching (instrucción única)
static inline uint32_t rotate_left(uint32_t x, uint32_t n) {
    uint32_t result;
    __asm__("roll %1, %0" : "=r" (result) : "c" (n), "0" (x));
    return result;
}

int main() {
    uint32_t eax, ebx, ecx, edx;
    cpuid(1, 0, &eax, &ebx, &ecx, &edx);
    printf("CPUID: stepping=%d model=%d family=%d\n",
           eax & 0xF, (eax >> 4) & 0xF, (eax >> 8) & 0xF);
    return 0;
}
```

**Fuente oficial:** https://gcc.gnu.org/onlinedocs/gcc/Extended-Asm.html

### Alternativa de Implementación Específica

**ARM64 — NEON inline assembly para DSP:**

```c
// Suma de 4 floats con NEON (sin intrínseco)
float neon_sum(const float *v) {
    float result;
    __asm__(
        "ld1 {v0.4s}, [%1]\n\t"
        "faddp v0.4s, v0.4s, v0.4s\n\t"
        "faddp s0, v0.2s, v0.2s\n\t"
        "str s0, [%0]\n\t"
        : "=r"(result)
        : "r"(v)
        : "v0", "memory"
    );
    return result;
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Instrucciones sin intrínseco (CPUID, RDTSC, BSWAP), optimización de hot loops críticos verificados con perfil, implementación de barriers/fences específicas, acceso a registros de control de CPU |
| **Cuándo evitar** | 99% del código: el compilador genera mejor assembly que un humano promedio. Las optimizaciones manuales suelen empeorar con nuevas microarquitecturas. Mantenimiento: el inline assembly es específico de arquitectura y difícil de mantener |
| **Alternativas** | Intrinsics (la mayoría de instrucciones tienen wrapper), `__builtin_*` (GCC/Clang builtins para CPUID, ROTATE, CLZ, etc.), `-march=native` (dejar al compilador optimizar), `__attribute__((always_inline))` para forzar inlining |
| **Coste/Complejidad** | Muy alto: el inline assembly rompe la portabilidad, impide que el compilador optimice a través de la instrucción, y las cláusulas de clobber incorrectas causan bugs sutiles. Solo justificable cuando se ha medido que >10% del tiempo está en una instrucción específica |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Compilador genera código incorrecto alrededor del inline asm

**¿Qué ocasionó el error?**
Faltaba la cláusula `"memory"` clobber en un inline asm que modificaba memoria. El compilador reordenó lecturas de memoria alrededor del asm, causando que leyera valores stale.

**¿Cómo se solucionó?**
Agregar `"memory"` clobber para evitar que el compilador reordene accesos a memoria:

```c
// ❌ Sin clobber: el compilador puede mover la lectura antes del asm
__asm__("movl $1, %0" : "=m"(flag));

// ✅ Con clobber: barrera de memoria del compilador
__asm__ volatile("movl $1, %0" : "=m"(flag) :: "memory");
```

**¿Por qué funciona esta técnica?**
`"memory"` clobber le dice al compilador que el inline asm puede leer/escribir cualquier dirección de memoria. El compilador debe vaciar todos los registros que contienen valores de memoria y no puede reordenar accesos a través del asm. `volatile` previene que el compilador elimine el asm si cree que su salida no se usa.

### Caso: inline asm genera segfault por register clobber no declarado

**¿Qué ocasionó el error?**
La instrucción `CPUID` modifica `eax`, `ebx`, `ecx`, `edx`. En la cláusula clobber se omitió `"ebx"` (en PIC, ebx es el GOT base pointer). El compilador asumió que ebx se preservaba y luego usó un valor incorrecto del GOT, causando segfault al siguiente acceso a variable global.

**¿Cómo se solucionó?**
Declarar todos los registros modificados en la cláusula clobber:

```c
// ✅ CORRECTO: todos los registros modificados declarados
__asm__ volatile(
    "cpuid\n\t"
    : "=a"(a), "=b"(b), "=c"(c), "=d"(d)
    : "a"(leaf), "c"(subleaf)
    : "memory"
);

// Si no se usan las salidas, marcarlas como clobber
__asm__ volatile("cpuid\n\t"
    : "=a"(dummy), "=b"(dummy), "=c"(dummy), "=d"(dummy)
    : "a"(1), "c"(0)
    : "memory");
```

**¿Por qué funciona esta técnica?**
GCC Extended Asm permite declarar los registros de salida como `"=r"` (dejar al compilador elegir) o explícitamente (`"=a"` para eax). Los registros no declarados como salida/clobber se asumen preservados. Si la instrucción los modifica, el compilador puede usar valores incorrectos.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~180 tokens estimados al invocar este skill
- **Trigger de activación:** `GCC extended inline assembly constraints`
- **Prioridad de carga:** Baja — técnica de optimización extrema para casos muy específicos
- **Dependencias:** `10-simd-vectorization` (intrinsics como alternativa), `14-compilation-linking-loader` (cómo se enlaza el asm)

### Tool Integration

```json
{
  "tool_name": "assembly-inline-optimizations",
  "description": "Optimización con inline assembly: instrucciones sin intrínseco, barriers, control de pipeline",
  "triggers": ["inline assembly", "asm volatile", "GCC extended asm", "CPUID", "x86-64", "ARM inline"],
  "context_hint": "Inyectar ejemplo de CPUID con inline assembly y explicación de cláusulas clobber",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre inline assembly o instrucciones específicas de CPU sin intrínseco,
carga el skill assembly-inline-optimizations. Proporciona ejemplos de GCC extended asm
con cláusulas de entrada, salida y clobber. Enfatiza cuándo NO usar inline asm.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver assembly generado por el compilador
gcc -O3 -march=native -S -o output.s main.c

# Ver solo el inline assembly expandido
gcc -O3 -march=native -c -g -o main.o main.c
objdump -d -M intel main.o | grep -A5 'asm\|cpuid'

# Verificar restricciones
echo 'int main() { asm("nop"); }' | gcc -x c - -S -o /dev/stdout -O2

# Profiling: ver qué instrucciones consumen más ciclos
perf annotate --symbol hot_function
```

### GUI / Web

- **Compiler Explorer (Godbolt)**: comparar código C/C++ con assembly generado
- **perf annotate** con UI: `perf report -n --stdio` muestra porcentajes por instrucción
- **Intel Architecture Code Analyzer (IACA)**: análisis estático de throughput de assembly
- **LLVM-MCA**: simulación de pipeline para bloques assembly

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver assembly de función | `gcc -O3 -S main.c` | `Godbolt → clang -O3 -march=native` |
| Anotar hot instruction | `perf annotate --symbol func` | `perf report → Enter en símbolo` |
| Simular pipeline | `llvm-mca output.s` | `IACA GUI` |

---

## 7. Cheatsheet Rápido

```c
// GCC inline asm template — 10 líneas
__asm__ volatile(
    "instruction %[input], %[output]\n\t"
    : [output] "=r"(var_out)
    : [input] "r"(var_in)
    : "cc", "memory"
);
// "r" = cualquier registro
// "m" = memoria
// "i" = inmediato
// "=r" = output (escritura)
// "+r" = input+output (lectura y escritura)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `10-simd-vectorization` | alternativo — intrinsics vs inline asm | Sí |
| `14-compilation-linking-loader` | complementario — código objeto generado | No |
| `28-performance-profiling-optimization` | dependiente — medir antes de optimizar con asm | Sí |
| `24-instruction-level-parallelism` | complementario — pipeline y latencia de instrucciones | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: assembly-inline-optimizations
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [inline-assembly, x86-64, GCC, asm, CPUID, intrinsics, optimization, ARM]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

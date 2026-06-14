---
name: jit-compilation-engines
description: "La compilación JIT (Just-In-Time) resuelve el balance entre velocidad de ejecución y portabilidad al compilar código intermedio (bytecode, IR) a código máquina nativo en tiempo de ejecución, combin..."
---
# JIT Compilation Engines

## Semantic Triggers
```
JIT compiler lazy compilation tiered, LLVM ORC JIT API, DynASM LuaJIT assembly, method-based compilation hotspot detection, adaptive optimization deoptimization, runtime code generation code cache
```

---

## 1. Definición Teórica

La compilación JIT (Just-In-Time) resuelve el balance entre velocidad de ejecución y portabilidad al compilar código intermedio (bytecode, IR) a código máquina nativo en tiempo de ejecución, combinando las ventajas de intérpretes (portabilidad, inicio rápido) y compiladores AOT (rendimiento máximo). El principio fundamental es que un JIT observa la ejecución del programa, identifica "hot spots" (código ejecutado frecuentemente), los compila a código nativo optimizado, y puede incluso desoptimizar si las condiciones cambian (adaptive optimization). Arquitectónicamente, los JITs modernos (V8, HotSpot C2, LuaJIT) usan compilación en niveles: intérprete → baseline JIT (rápido, poco optimizado) → optimizing JIT (lento, muy optimizado). Existen como mecanismo diferenciado porque los compiladores AOT no pueden optimizar basándose en el perfil de ejecución real, mientras que JIT sí puede (speculative optimization, inline caching).

---

## 2. Implementación de Referencia

LLVM ORC JIT ≥19 (C++), LuaJIT ≥2.1 (C), V8 (JavaScript), HotSpot (Java). Idiomas: C++ (ORC), LuaJIT (DynASM), cualquier lenguaje que compile a IR.

### Ejemplo Práctico Avanzado

```cpp
// ORC JIT: compilar y ejecutar expresiones aritméticas en runtime
#include "llvm/ExecutionEngine/Orc/LLJIT.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Module.h"
#include "llvm/Support/InitLLVM.h"
#include "llvm/Support/TargetSelect.h"
#include <string_view>

using namespace llvm;
using namespace llvm::orc;

class JITCompiler {
    std::unique_ptr<LLJIT> jit;
    int counter = 0;

public:
    JITCompiler() {
        InitializeNativeTarget();
        InitializeNativeTargetAsmPrinter();
        auto jitOrErr = LLJITBuilder().create();
        if (!jitOrErr) {
            logAllUnhandledErrors(jitOrErr.takeError(), errs(), "JIT: ");
            exit(1);
        }
        jit = std::move(*jitOrErr);
    }

    // Compilar y ejecutar una función que suma dos enteros
    int compileAndRun(int a, int b) {
        auto ctx = std::make_unique<LLVMContext>();
        auto mod = std::make_unique<Module>("jit_module", *ctx);
        auto &builder = *mod;

        // Crear función: int sum(int a, int b)
        auto funcType = FunctionType::get(
            Type::getInt32Ty(*ctx),
            {Type::getInt32Ty(*ctx), Type::getInt32Ty(*ctx)},
            false);
        auto func = Function::Create(funcType,
            Function::ExternalLinkage, "sum", mod.get());

        // Crear bloque y builder
        auto entry = BasicBlock::Create(*ctx, "entry", func);
        IRBuilder<> irb(entry);

        auto args = func->arg_begin();
        Value *aVal = args++;
        Value *bVal = args;
        Value *result = irb.CreateAdd(aVal, bVal, "tmp");
        irb.CreateRet(result);

        // Añadir módulo al JIT
        auto threadSafeMod = std::make_unique<ThreadSafeModule>(
            std::move(mod), std::move(ctx));
        if (auto err = jit->addIRModule(std::move(threadSafeMod))) {
            logAllUnhandledErrors(std::move(err), errs(), "AddModule: ");
            return -1;
        }

        // Buscar la función compilada
        auto symOrErr = jit->lookup("sum");
        if (!symOrErr) {
            logAllUnhandledErrors(symOrErr.takeError(), errs(), "Lookup: ");
            return -1;
        }

        auto *sumFn = symOrErr->getAddress().toPtr<int(*)(int, int)>();
        return sumFn(a, b);
    }
};

int main() {
    JITCompiler jit;
    auto result = jit.compileAndRun(21, 21);
    llvm::outs() << "JIT result: " << result << "\n";  // 42
    return 0;
}
```

```bash
# Compilar: clang++ -O2 jit.cpp `llvm-config --cxxflags --ldflags --libs orcjit` -o jit
./jit
```

**Fuente oficial:** https://llvm.org/docs/ORCv2.html

### Alternativa de Implementación Específica

**LuaJIT + DynASM — código máquina generado en runtime para hot paths:**

```lua
-- DynASM: generación de código máquina x64 en tiempo real
-- Ideal para hot paths numéricos (DSP, juego, ML)
local ffi = require("ffi")
local bit = require("bit")

-- Ejemplo: JIT de suma de floats (LuaJIT ya compila esto automáticamente)
-- El verdadero poder está en usar FFI para código nativo:
ffi.cdef[[
    double sum_array(const double *arr, int n);
]]

-- Implementación en C inline (JIT compila en carga)
local sum = ffi.load("libm").sum_array
-- En producción: generar código específico con LuaJIT + DynASM
print(sum(ffi.new("double[?]", 1000, 42.0), 1000))
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Lenguajes dinámicos (JS, Python, Lua), máquinas virtuales (JVM, V8), sistemas que requieren autogeneración de código (DB query compilers, regex engines), hot paths numéricos identificados por profiling |
| **Cuándo evitar** | Sistemas de tiempo real duro (JIT compilation pausa), seguridad estricta (código generado puede eludir sandbox), aplicaciones donde el código compilado no cambia (AOT suficiente), sistemas embebidos sin suficiente RAM para code cache |
| **Alternativas** | AOT (Premisa: compilar todo antes de ejecutar, mejor para móvil/embebido), Intérpretes (simples, sin overhead de compilación), Partial Evaluation (especialización basada en valores constantes, similar a JIT pero en compile-time) |
| **Coste/Complejidad** | Muy alto: implementar un JIT requiere conocimiento profundo de ISA, calling conventions, runtime de GC, y deoptimización. ORC JIT reduce la complejidad pero sigue siendo significativa. LuaJIT es una excepción (∼15K LOC, extremadamente eficiente) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: JIT compilation causa pausas en aplicación interactiva

**¿Qué ocasionó el error?**
V8 (Node.js) compilaba funciones JavaScript con el optimizing compiler (TurboFan) en un hilo separado, pero la compilación requería locks que detenían el hilo principal, causando pausas de ∼100ms en momentos críticos de interacción de usuario.

**¿Cómo se solucionó?**
En Node.js, usar flags para controlar la compilación:

```bash
# Deshabilitar optimizaciones especulativas que causan pausas
node --jitless app.js           # sin JIT (intérprete puro)
node --no-opt app.js            # sin optimizaciones
node --max-opt-count=100 app.js # limitar compilaciones optimizadas

# Monitorear compilaciones JIT
node --trace-opt --trace-deopt app.js 2>&1 | grep -E 'compiled|deoptimize'
```

Para aplicaciones React/Typescript, usar `--jitless` en entornos serverless (latencia más predecible).

**¿Por qué funciona esta técnica?**
`--jitless` desactiva completamente el JIT, ejecutando solo el intérprete (V8 Ignition). Las pausas desaparecen porque no hay compilación, pero el rendimiento de CPU puede ser 2-5x menor. `--trace-opt` muestra qué funciones se están compilando para diagnosticar compilaciones innecesarias.

### Caso: Deoptimización frecuente en HotSpot (JVM)

**¿Qué ocasionó el error?**
El JIT de HotSpot (C2) optimizaba basándose en tipos observados (class hierarchy analysis). Cuando llegaba un tipo diferente (clase nueva no vista antes), C2 deoptimizaba la función compilada y volvía a interpretación, causando un "punto caliente" de rendimiento inestable.

**¿Cómo se solucionó?**
Diagnosticar con flags JVM:

```bash
# Log de compilación y deoptimización
java -XX:+PrintCompilation -XX:+TraceDeoptimization -jar app.jar

# Salida típica:
# 128   !   3       my.foo() (10 bytes)   ! = compilando en nivel 3
# 129   b   4       my.foo() (10 bytes)   b = compilando en nivel 4
# 130   * 4        my.foo() (10 bytes)   deoptimización!

# Soluciones:
# -XX:CompileThreshold=5000  # compilar más tarde (más perfil)
# -XX:TieredStopAtLevel=3    # detener en C1 (menos optimizado)
```

**¿Por qué funciona esta técnica?**
La compilación tiered de HotSpot compila primero con C1 (bajo nivel, rápido) y luego con C2 (muy optimizado, lento) cuando el perfil es estable. `TieredStopAtLevel=3` detiene en C1, evitando C2 que es más propenso a deoptimización.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `JIT compiler lazy compilation tiered`
- **Prioridad de carga:** Media — especializado para VM y runtime code generation
- **Dependencias:** `14-compilation-linking-loader` (código objeto), `15-assembly-inline-optimizations` (instrucciones generadas)

### Tool Integration

```json
{
  "tool_name": "jit-compilation-engines",
  "description": "Compilación JIT con LLVM ORC, LuaJIT, HotSpot, V8: compilación adaptativa, optimización especulativa",
  "triggers": ["JIT", "LLVM ORC", "LuaJIT", "DynASM", "adaptive optimization", "deoptimization", "code generation"],
  "context_hint": "Inyectar ejemplo de ORC JIT compilando funciones aritméticas en runtime",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre compilación JIT o generación de código en runtime,
carga el skill jit-compilation-engines. Proporciona ejemplos de LLVM ORC JIT en C++
y explicación de compilación adaptativa y tiered compilation.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Node.js: monitorear compilación JIT
node --trace-opt --trace-deopt app.js

# JVM: logs de compilación
java -XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions -XX:+LogCompilation -jar app.jar

# LuaJIT: ver qué se compila
luajit -jdump myapp.lua

# Ver código generado por V8
node --print-code --print-code-verbose -e 'function f(a,b){return a+b}; print(f(1,2))'
```

### GUI / Web

- **IRHydra** (V8): visualización de IR de TurboFan, comparación de funciones compiladas
- **JITWatch** (HotSpot): visualización de compilación JVM, bytecode, y código nativo
- **Godbolt (Compiler Explorer)**: comparar JIT output de V8, SpiderMonkey, etc.
- **`perf` + JIT support**: `perf report -n` con símbolos de JIT (requiere `perf inject --jit`)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver JIT en V8 | `node --print-code app.js` | `IRHydra → upload ir.json` |
| Ver JIT en JVM | `java -XX:+PrintCompilation -jar app.jar` | `JITWatch → open hotspot.log` |
| Profiling con perf | `perf record -k 1 -F 999 node app.js` | `perf report → JIT symbols` |

---

## 7. Cheatsheet Rápido

```cpp
// LLVM ORC JIT — 10 líneas
LLJITBuilder builder;
auto jit = cantFail(builder.create());
auto mod = loadModule(ctx);  // tu IR module
cantFail(jit->addIRModule(std::move(mod)));
auto sym = cantFail(jit->lookup("myFunc"));
auto fn = sym.getAddress().toPtr<int(*)()>();
int result = fn();
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-compilation-linking-loader` | complementario — código objeto generado por JIT | Sí |
| `15-assembly-inline-optimizations` | complementario — instrucciones generadas por JIT | Sí |
| `13-garbage-collection-algorithms` | dependiente — GC interactúa con code cache | No |
| `24-instruction-level-parallelism` | complementario — pipeline de código generado | No |

---

## 9. Metadatos del Skill

```yaml
---
id: jit-compilation-engines
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [JIT, LLVM ORC, LuaJIT, DynASM, adaptive-optimization, code-generation, HotSpot, V8]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

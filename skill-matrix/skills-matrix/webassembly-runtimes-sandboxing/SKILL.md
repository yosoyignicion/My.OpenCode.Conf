---
name: webassembly-runtimes-sandboxing
description: "WebAssembly (Wasm) resuelve la ejecución segura y portátil de código no confiable en entornos donde la seguridad y el aislamiento son críticos (navegadores, edge computing, plugins, CDN workers)"
---
# WebAssembly Runtimes & Sandboxing

## Semantic Triggers
```
wasmtime runtime sandbox isolation, WASI preview 2 streaming I/O, Component Model cross-language, wasm3 interpreter embedded, WAMR micro-controller WebAssembly, memory sandbox address space isolation
```

---

## 1. Definición Teórica

WebAssembly (Wasm) resuelve la ejecución segura y portátil de código no confiable en entornos donde la seguridad y el aislamiento son críticos (navegadores, edge computing, plugins, CDN workers). El principio fundamental es que Wasm define una máquina virtual basada en stack con tipado estático, memoria lineal aislada (un único array lineal por módulo, accesible solo mediante instrucciones Wasm), y sandboxing por diseño: no hay acceso al sistema operativo sin invocación explícita a través de WASI (WebAssembly System Interface). Arquitectónicamente, los runtimes Wasm (wasmtime, WAMR, wasm3) pueden interpretar, compilar JIT o AOT el bytecode Wasm, con políticas de seguridad configurables (límites de memoria, CPU, filesystem virtual). Existe como tecnología diferenciada porque ofrece un sandbox más fino que los contenedores (no comparte kernel), más seguro que Native Client (tipado), y más portátil que cualquier formato binario nativo.

---

## 2. Implementación de Referencia

wasmtime ≥25 (C/Rust, Cranelift JIT). WASI preview 2. Idiomas: Rust (wasmtime crate), C (wasmtime-c-api). Alternativas: WasmEdge, Wasmer, WAMR (embebido).

### Ejemplo Práctico Avanzado

```rust
// Host: cargar y ejecutar un módulo Wasm con WASI
use wasmtime::{Engine, Module, Store, Linker, Func, TypedFunc};
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder, add_to_linker};
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configurar engine con features específicas
    let engine = Engine::new(
        wasmtime::Config::new()
            .wasm_reference_types(true)
            .wasm_bulk_memory(true)
            .wasm_multi_value(true)
            .consume_fuel(true)  // limitar CPU
            .static_memory_maximum_size(4 * 1024 * 1024)  // 4MB max
    )?;

    // Crear WASI context con directorio virtual
    let wasi = WasiCtxBuilder::new()
        .inherit_stdio()
        .inherit_env()
        .preopened_dir(Path::new("./sandbox_data"), "/data")?
        .build();

    // Crear módulo
    let module = Module::from_file(&engine, "my_module.wasm")?;

    // Linker con WASI
    let mut linker = Linker::new(&engine);
    add_to_linker(&mut linker, |s| s)?;

    // Store con estado (WASI context)
    let mut store = Store::new(&engine, wasi);
    store.set_fuel(100_000)?;  // 100k instrucciones máximas

    // Instanciar
    let instance = linker.instantiate(&mut store, &module)?;
    linker.instance(&mut store, "my_module", &instance)?;

    // Llamar función exportada
    let run = instance.get_typed_func::<(), ()>(&mut store, "run")?;
    match run.call(&mut store, ()) {
        Ok(_) => println!("Wasm module completed"),
        Err(e) => eprintln!("Wasm trapped: {}", e),
    }

    // Verificar fuel consumido
    let fuel_consumed = 100_000 - store.get_fuel()?;
    println!("Fuel consumed: {}", fuel_consumed);

    Ok(())
}
```

```wat
;; Módulo Wasm simple que lee un archivo y lo escribe en stdout
;; Compilar: wat2wasm my_module.wat -o my_module.wasm
(module
    (import "wasi:io/streams" "output-stream"
        (func $log (param i32 i32)))
    (memory (export "memory") 1)

    (func (export "run")
        ;; Cargar "Hello from WASI!" en memoria
        i32.const 0
        i64.const 0x6f6c6c6548  ; "Hell"
        i64.store
        i32.const 8
        i64.const 0x6f7257206f6c6c  ; "llo Wo"
        i64.store
        i32.const 16
        i64.const 0x2149534150206d  ; "m WASI!"
        i64.store

        ;; Llamar output-stream con ptr 0, len 20
        i32.const 0
        i32.const 20
        call $log
    )
)
```

**Fuente oficial:** https://docs.wasmtime.dev/

### Alternativa de Implementación Específica

**WAMR (WebAssembly Micro Runtime) para sistemas embebidos:**

```c
// WAMR en microcontrolador con <64KB RAM
#include "wasm_export.h"

static char buffer[4096];
static int wasm_output(const char *msg) {
    // Enviar por UART
    return 0;
}

int main() {
    // Inicializar runtime
    RuntimeInitArgs init_args;
    memset(&init_args, 0, sizeof(RuntimeInitArgs));
    init_args.mem_alloc_type = ALLOC_WITH_POOL;
    init_args.pool_size = 8192;  // 8KB para allocations

    wasm_runtime_full_init(&init_args);

    // Cargar bytecode
    WASMModule *module = wasm_runtime_load(buffer, sizeof(buffer), NULL, 0);
    WASMExecEnv *env = wasm_runtime_create_exec_env(module, 4096);

    // Ejecutar función
    wasm_runtime_call_wasm(env, NULL, "run", 0, NULL);

    wasm_runtime_destroy();
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Plugins no confiables (aplicaciones SaaS, marketplaces), edge computing (Cloudflare Workers, Fastly), serverless (wasmtime en λ), IoT/embebido (WAMR), multi-lenguaje (Component Model) |
| **Cuándo evitar** | Código que requiere acceso intensivo a syscalls (WASI aún limitado), gráficos 3D complejos (Wasm no tiene acceso directo a GPU), rendimiento crítico donde el overhead de sandbox es inaceptable |
| **Alternativas** | Contenedores (más pesados, comparten kernel), gVisor (sandbox de kernel en userspace, más overhead), Native Client (obsoleto, menos portátil), wasm3 interpreter (para sistemas sin capacidad de JIT) |
| **Coste/Complejidad** | Medio: el tooling es maduro pero WASI aún evoluciona. El sandboxing de memoria (4GB por defecto) puede ser restrictivo. La integración con sistemas de archivos reales requiere `preopened_dir`. Las restricciones de fuel/cpu requieren configuración explícita |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Module instantiation falla por memory size insuficiente

**¿Qué ocasionó el error?**
El módulo Wasm declaraba una memoria mínima de 10 páginas (640KB) pero el runtime (wasmtime) tenía configurado `static_memory_maximum_size = 262144` (256KB). El linker rechazó la memoria Wasm.

**¿Cómo se solucionó?**
Aumentar el límite de memoria estática:

```rust
let config = wasmtime::Config::new()
    .static_memory_maximum_size(1024 * 1024)  // 1MB
    .static_memory_guard_size(0);  // sin guard pages para ahorrar memoria
```

O cambiar a memoria dinámica (pero más lenta):

```rust
// .dynamic_memory_reserved_for_growth(true)  // permite crecimiento
```

**¿Por qué funciona esta técnica?**
Wasmtime asigna memoria Wasm como un chunk contiguo (4GB de espacio de direcciones virtuales para guard pages). `static_memory_maximum_size` controla cuánta memoria física se compromete. Aumentarlo permite módulos con más páginas; la memoria virtual sigue siendo 4GB. Cambiar a dinámica evita el límite pero añade overhead en accesos por las guard pages.

### Caso: File descriptor inválido usando WASI preview 2

**¿Qué ocasionó el error?**
El módulo Wasm usaba `fd_read` de WASI preview 1, pero wasmtime 25+ usa WASI preview 2 por defecto, que tiene una API completamente diferente (streams basados en `wit`). La función `fd_read` no existe en preview 2.

**¿Cómo se solucionó?**
Compilar el módulo Wasm contra WASI preview 2 o habilitar compatibilidad preview 1:

```bash
# Opción 1: Compilar para preview 2
rustc --target wasm32-wasip2 my_module.rs -o my_module.wasm

# Opción 2: Habilitar preview 1 en wasmtime
wasmtime run --wasm-features=multi-value --wasi-modules=experimental-wasi-unstable my_module.wasm

# Opción 3 (recomendada): Usar adapter preview 1→preview 2
wasmtime run --wasm-features=multi-value my_module.wasm  # con adapter implícito
```

**¿Por qué funciona esta técnica?**
WASI preview 2 cambió de una API POSIX-like (fd_read, fd_write) a una basada en componentes WIT (witx) con streams. El adapter preview 1 → preview 2 traduce las llamadas antiguas a las nuevas. Para WASI preview 2 nativo, el toolkit `wasi-sdk` ≥22 genera el formato correcto.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~175 tokens estimados al invocar este skill
- **Trigger de activación:** `wasmtime runtime sandbox isolation`
- **Prioridad de carga:** Media — sandboxing para plugins y edge computing
- **Dependencias:** `14-compilation-linking-loader` (formato binario Wasm), `21-jit-compilation-engines` (Cranelift JIT)

### Tool Integration

```json
{
  "tool_name": "webassembly-runtimes-sandboxing",
  "description": "Ejecución sandbox de WebAssembly con wasmtime, WAMR, WASI y Component Model",
  "triggers": ["WebAssembly", "wasmtime", "WASI", "WAMR", "sandbox", "Component Model", "plugin isolation"],
  "context_hint": "Inyectar ejemplo de wasmtime con WASI y fuel para limitar CPU",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre sandboxing de plugins o WebAssembly, carga el skill
webassembly-runtimes-sandboxing. Proporciona ejemplos de wasmtime con WASI preview 2
y fuel consumption para limitar recursos. Explica la diferencia entre WAT/WASI y Component Model.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Compilar Wasm desde Rust
cargo build --target wasm32-wasip2 --release

# Ejecutar con wasmtime
wasmtime run --dir=. my_module.wasm -- arg1 arg2

# Ver metadatos del módulo Wasm
wasm-tools print my_module.wasm | head -30
wasm-tools validate my_module.wasm

# Limitar recursos
wasmtime run --fuel 50000 --max-memory 1MB my_module.wasm

# Component Model: crear componente
wasm-tools component new my_module.wasm -o my_component.wasm
```

### GUI / Web

- **Wasmtime UI** (experimental): dashboard de instancias Wasm con métricas
- **WAT2Wasm Playground**: https://webassembly.github.io/wabt/demo/wat2wasm/
- **Component Model Playground**: https://component-model.dev/
- **Wasmbuilder**: IDE online de módulos Wasm con preview

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar módulo | `wasmtime run module.wasm` | `Wasmtime UI → Run` |
| Ver estructura | `wasm-tools print module.wasm` | `wat2wasm → Download wasm` |
| Limitar recursos | `wasmtime run --fuel 50000 module.wasm` | `Wasmtime UI → Config → Fuel` |

---

## 7. Cheatsheet Rápido

```bash
# WebAssembly esencial — 8 líneas
# Rust → Wasm: cargo build --target wasm32-wasip2 --release
# Ejecutar: wasmtime run --dir=. module.wasm
# Fuel: wasmtime run --fuel 100000 module.wasm
# WAT a Wasm: wat2wasm module.wat -o module.wasm
# Ver exports: wasm-tools print module.wasm | grep export
# Tools: wasmtime, wasm-tools, wabt, cargo-component
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-compilation-linking-loader` | complementario — formato binario y linking | Sí |
| `21-jit-compilation-engines` | dependiente — Cranelift y Singlepass JIT | Sí |
| `27-rust-systems-programming` | dependiente — rustc target wasm32 | Sí |
| `04-devops-platform/26-serverless-knative-cold-starts` | complementario — Wasm para serverless | No |

---

## 9. Metadatos del Skill

```yaml
---
id: webassembly-runtimes-sandboxing
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [WebAssembly, wasmtime, WASI, WAMR, sandbox, Component-Model, Cranelift, runtime]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

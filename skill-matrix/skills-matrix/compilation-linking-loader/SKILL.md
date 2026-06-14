---
name: compilation-linking-loader
description: "El pipeline de compilación-enlace-carga resuelve la transformación de código fuente a un ejecutable en memoria, mediando entre la representación simbólica del programador y las direcciones físicas/..."
---
# Compilation, Linking & Loader

## Semantic Triggers
```
ELF shared library relocation and GOT, PE COFF PE32+ format structure, dynamic linker ld.so resolution, position independent code PIC vs PIE, link-time optimization LTO whole-program, ABI compatibility versioning symbol visibility
```

---

## 1. Definición Teórica

El pipeline de compilación-enlace-carga resuelve la transformación de código fuente a un ejecutable en memoria, mediando entre la representación simbólica del programador y las direcciones físicas/virtuales de la máquina. El principio fundamental es que la compilación produce object files con símbolos sin resolver, el linker (ld, mold) resuelve referencias entre object files y bibliotecas, y el loader (ld.so) reubica direcciones virtuales en tiempo de carga o ejecución. Arquitectónicamente, los formatos ELF (Linux), PE (Windows) y Mach-O (macOS) definen secciones (.text, .data, .bss), tablas de símbolos, y tablas de reubicación que permiten la vinculación dinámica (shared libraries) y la carga diferida (lazy binding). Existe como capa diferenciada porque sin ella cada programa sería monolítico y consumiría más memoria por falta de código compartido.

---

## 2. Implementación de Referencia

GCC ≥14, Clang ≥18, mold linker ≥2.4 (rapidísimo), GNU ld, ld.lld. Idiomas: C, C++, Rust, Zig (con su propio linker). Formato: ELF (Linux), PE (Windows), Mach-O (macOS).

### Ejemplo Práctico Avanzado

```c
// demo.c — funciones PIC para shared library
// Compilar: gcc -fPIC -shared -o libdemo.so demo.c -O2 -flto
// Usar: LD_LIBRARY_PATH=. ./main

int global_var = 42;  // .data section
static int local_var = 0;  // .bss (zero-init)

__attribute__((visibility("default")))
int compute(int x) {
    return x * global_var + local_var++;
}

__attribute__((visibility("hidden")))
int internal_helper(int x) {
    // No exportado: no entra en GOT/PLT
    return x * x;
}

// Constructor: se ejecuta al cargar la biblioteca
__attribute__((constructor))
void init_lib() {
    local_var = 100;
}
```

```bash
# Análisis del ELF generado
gcc -fPIC -shared -o libdemo.so demo.c -O2

# Ver secciones
readelf -S libdemo.so | grep -E '\.text|\.data|\.bss|\.got|\.plt'

# Ver símbolos exportados
nm -D libdemo.so | grep compute

# Ver reubicaciones
readelf -r libdemo.so | head -10

# Ver GOT (Global Offset Table)
objdump -d -j .got.plt libdemo.so

# Ver PLT (Procedure Linkage Table)
objdump -d -j .plt libdemo.so | head -20
```

```bash
# Enlace estático vs dinámico
# Static: todas las bibliotecas incluidas en el binario
gcc -static -o app_static main.c demo.c
# Dynamic: bibliotecas compartidas cargadas en runtime
gcc -o app_dynamic main.c -L. -ldemo

# Ver dependencias dinámicas
ldd app_dynamic
# linux-vdso.so.1  (kernel virtual dynamic shared object)
# libdemo.so => ./libdemo.so
# libc.so.6 => /usr/lib/libc.so.6
```

**Fuente oficial:** https://www.akkadia.org/drepper/dsohowto.pdf — Ulrich Drepper "How to Write Shared Libraries"

### Alternativa de Implementación Específica

**Rust — cross-compilation y enlace con LTO:**

```rust
// Cargo.toml
// [profile.release]
// lto = "fat"          # link-time optimization
// codegen-units = 1    # maximize optimizations
// strip = "symbols"    # reduce binary size

// $RUSTFLAGS: flags para el linker
// RUSTFLAGS="-C link-arg=-fuse-ld=mold -C target-cpu=native" cargo build --release

fn main() {
    // Análisis del binario generado:
    // objdump -d target/release/myapp | wc -l
    // size target/release/myapp
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Enlace dinámico: bibliotecas compartidas entre múltiples programas, reducción de tamaño de binarios, actualizaciones sin recompilar. Enlace estático: distribución de binarios portátiles (containers), herramientas CLI, sistemas embebidos |
| **Cuándo evitar** | Enlace dinámico: cuando se necesita distribución autónoma (sin dependencias del sistema), o cuando la resolución de símbolos en runtime añade latencia indeseada. Enlace estático: cuando múltiples programas comparten la misma biblioteca (desperdicio de RAM) |
| **Alternativas** | LTO (Link Time Optimization) con ThinLTO (balance entre speed y optimization), mold (10x más rápido que ld), Zig build (integración cross-platform), `dlopen` para carga dinámica manual |
| **Coste/Complejidad** | Medio: el enlace dinámico requiere entender RPATH, LD_LIBRARY_PATH, soname, versioning de símbolos. LTO aumenta significativamente el tiempo de enlace pero mejora el rendimiento del binario 5-15% |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: "undefined reference to `symbol'" pese a linkear la biblioteca correcta

**¿Qué ocasionó el error?**
En GCC, el orden de los object files y bibliotecas en la línea de enlace importa. Las bibliotecas deben aparecer después de los archivos que las referencian.

**¿Cómo se solucionó?**
Corregir el orden de enlace:

```bash
# ❌ Incorrecto: la biblioteca aparece antes del object file que la necesita
gcc -L. -ldemo main.o -o app

# ✅ Correcto: main.o referencia libdemo, libdemo debe ir después
gcc main.o -L. -ldemo -o app

# Si hay dependencias circulares, usar --start-group/--end-group
gcc main.o -Wl,--start-group -ldemo -lhelper -Wl,--end-group -o app
```

**¿Por qué funciona esta técnica?**
El linker procesa los archivos de izquierda a derecha. Cuando encuentra un símbolo indefinido en `main.o`, busca en las bibliotecas a la derecha. Si la biblioteca está a la izquierda, el linker ya la procesó y descartó el símbolo no referenciado. `--start-group/--end-group` hace múltiples pasadas sobre el grupo.

### Caso: LD_PRELOAD no funciona con bibliotecas setuid

**¿Qué ocasionó el error?**
Los binarios con setuid/setgid ignoran `LD_PRELOAD` y `LD_LIBRARY_PATH` por razones de seguridad. El dynamic linker (ld.so) las elimina del entorno.

**¿Cómo se solucionó?**
Compilar la biblioteca en el RPATH del binario o enlazar estáticamente:

```bash
# CORRECTO: incrustar ruta en el binario
gcc main.o -Wl,-rpath,/opt/myapp/lib -L/opt/myapp/lib -lmyapp -o app

# Si es código propio, compilar sin setuid o usar capabilities (ambient)
sudo setcap cap_net_raw=+ep ./app  # en lugar de setuid
```

**¿Por qué funciona esta técnica?**
`ld.so` desde glibc 2.0+ ignora `LD_*` para binarios setuid. `RPATH` está incrustado en el binario (sección `.dynamic`) y es fiable (el usuario no puede manipularlo). `setcap` otorga capacidades específicas sin setuid.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `ELF shared library relocation and GOT`
- **Prioridad de carga:** Alta — pipeilne de compilación es fundamental para sistemas de bajo nivel
- **Dependencias:** `15-assembly-inline-optimizations` (verificación de código generado), `09-linux-ebpf-tracing` (tracing de carga de bibliotecas)

### Tool Integration

```json
{
  "tool_name": "compilation-linking-loader",
  "description": "Pipeline de compilación, enlace (static/dynamic) y carga de binarios ELF/PE/Mach-O",
  "triggers": ["ELF", "linker", "loader", "PIC", "PIE", "LTO", "GOT", "PLT", "shared library", "ld.so"],
  "context_hint": "Inyectar ejemplo de análisis ELF con readelf y objdump, y comparación static vs dynamic",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre compilación, enlace o loaders, carga el skill
compilation-linking-loader. Proporciona ejemplos de análisis ELF (readelf, objdump)
y explica la diferencia entre enlace estático y dinámico con GOT/PLT.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Análisis de binarios ELF
readelf -h app         # ELF header
readelf -l app         # program headers (segmentos)
readelf -S app         # section headers
readelf -s app         # symbol table
readelf -d app         # dynamic section

objdump -d app         # disassembly
objdump -t app         # symbol table
objdump -R app         # dynamic relocations

# Dependencias dinámicas
ldd app
objdump -p app | grep NEEDED

# Debug del linker
LD_DEBUG=all ./app 2>&1 | head -100
LD_DEBUG=bindings ./app 2>&1 | grep my_function
```

### GUI / Web

- **Binary Ninja / Ghidra**: descompilación y análisis estático de binarios
- **Compiler Explorer (Godbolt)**: ver assembly generado por secciones
- **Elfspy / elfit**: visualización de secciones ELF en web
- **VSCode Extension: "ELF Explorer"**: navegación de binarios

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver header ELF | `readelf -h app` | `Ghidra → File → Open → ELF` |
| Ver dependencias | `ldd app` | `Binary Ninja → Libraries` |
| Debug del linker | `LD_DEBUG=all ./app` | `strace -e trace=openat ./app \| grep lib` |

---

## 7. Cheatsheet Rápido

```bash
# Análisis ELF esencial — 8 líneas
readelf -h app           # header
readelf -l app           # segments (LOAD, INTERP, DYNAMIC)
readelf -S app           # sections (.text, .data, .bss, .got, .plt)
objdump -d -j .plt app   # PLT (lazy binding stubs)
ldd app                  # shared library dependencies
# Enlace: gcc -fPIC -shared -o lib.so objects.o
# RPATH: gcc -Wl,-rpath,'$ORIGIN/lib' -o app main.o -Llib -lmylib
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `15-assembly-inline-optimizations` | complementario — verificación de código generado | Sí |
| `04-ast-manipulation` | dependiente — AST → IR → código objeto | No |
| `26-modern-cpp-development` | dependiente — build systems CMake + enlace | Sí |
| `09-linux-ebpf-tracing` | complementario — tracing de carga de bibliotecas | No |

---

## 9. Metadatos del Skill

```yaml
---
id: compilation-linking-loader
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [ELF, linker, loader, GOT, PLT, PIC, PIE, LTO, shared-library, ld.so, compilation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

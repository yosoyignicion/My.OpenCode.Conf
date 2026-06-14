---
name: cpp-memory-safety
description: "La seguridad de memoria en C++ requiere una estrategia en capas porque el lenguaje no tiene safety garantizado por el compilador (a diferencia de Rust)"
---
# C++ Memory Safety — Sanitizers & Safe Compilation

## Semantic Triggers
```
ASan AddressSanitizer heap buffer overflow detection, Valgrind memcheck memory leak detection, smart pointers unique_ptr shared_ptr weak_ptr, compiler security flags FORTIFY_SOURCE, stack protector CLANG CFI, gsl::not_null null pointer prevention
```

---

## 1. Definición Teórica

La seguridad de memoria en C++ requiere una estrategia en capas porque el lenguaje no tiene safety garantizado por el compilador (a diferencia de Rust). El principio fundamental es combinar prevención en tiempo de compilación (smart pointers, RAII, `gsl::not_null`), detección en tiempo de ejecución (AddressSanitizer, UndefinedBehaviorSanitizer, Valgrind), y hardening del binario (`-fstack-protector-all`, `-D_FORTIFY_SOURCE=2`, CFI). Arquitectónicamente, la estrategia de "defense in depth" asume que cada capa puede fallar pero en conjunto minimizan la superficie de vulnerabilidades de memoria (buffer overflow, use-after-free, double-free, null pointer dereference). Existe como disciplina diferenciada porque C++ permite operaciones de bajo nivel inseguras por diseño, y la seguridad debe aplicarse explícitamente como capa adicional.

---

## 2. Implementación de Referencia

Compilador: Clang ≥18, GCC ≥14. Sanitizers: AddressSanitizer, UndefinedBehaviorSanitizer, LeakSanitizer, ThreadSanitizer. Herramientas: Valgrind ≥3.23 (memcheck, helgrind). Idiomas: C++20/23, C23.

### Ejemplo Práctico Avanzado

```cmake
# CMake — configuración completa de hardening y sanitizers
cmake_minimum_required(VERSION 3.31)
project(SafeApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Hardening flags (siempre activas, incluso en Release)
function(add_hardening_flags target)
    target_compile_options(${target} PRIVATE
        -fstack-protector-all           # stack overflow protection
        -fstack-clash-protection        # stack clash (GCC 8+)
        -D_FORTIFY_SOURCE=3             # fortify (glibc 2.35+)
        -Wformat-security               # non-const format strings
        -Werror=format-security
        -fcf-protection=full            # control flow integrity
        -fno-common                     # no duplicate globals
        -fvisibility=hidden             # hide symbols by default
    )
    target_link_options(${target} PRIVATE
        -Wl,-z,relro,-z,now             # RELRO + immediate binding
        -Wl,-z,noexecstack              # non-executable stack
        -pie                            # position independent executable
    )
endfunction()

# Sanitizers (solo Debug)
function(add_sanitizers target)
    target_compile_options(${target} PRIVATE
        -fsanitize=address,undefined,leak
        -fno-omit-frame-pointer
        -fno-sanitize-recover=all       # abort en el primer error
    )
    target_link_options(${target} PRIVATE
        -fsanitize=address,undefined,leak
    )
endfunction()

add_executable(myapp main.cpp)
add_hardening_flags(myapp)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_sanitizers(myapp)
endif()
```

```cpp
// Safe resource management y nullptr prevention
#include <gsl/gsl>
#include <memory>
#include <map>
#include <string>

class SafeCache {
    std::map<std::string, std::weak_ptr<CacheEntry>> entries;
public:
    // weak_ptr: no incrementa refcount, previene use-after-free
    std::shared_ptr<CacheEntry> get_or_create(const std::string& key) {
        auto it = entries.find(key);
        if (it != entries.end()) {
            if (auto ptr = it->second.lock()) {
                // weak_ptr::lock() devuelve shared_ptr o nullptr
                return ptr;
            }
            entries.erase(it);  // expired entry
        }
        auto e = std::make_shared<CacheEntry>(key);
        entries[key] = e;
        return e;
    }
};

// gsl::not_null: nunca nullptr en interfaces
void process(gsl::not_null<Resource*> r) {
    r->update();  // seguro: no puede ser nullptr
}

// unique_ptr: ownership único, sin leaks
auto resource = std::make_unique<Resource>(args...);
resource->do_work();
// ~unique_ptr libera automáticamente al salir del scope
```

**Fuente oficial:** https://github.com/isocpp/CppCoreGuidelines — https://clang.llvm.org/docs/AddressSanitizer.html

### Alternativa de Implementación Específica

**Valgrind para detección de leaks y races:**

```bash
# Memcheck: leaks, invalid reads/writes
valgrind --leak-check=full --track-origins=yes ./myapp

# Helgrind: POSIX thread race detection
valgrind --tool=helgrind ./myapp

# Cachegrind: cache profiling (no seguridad, pero relacionado)
valgrind --tool=cachegrind ./myapp
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Todo proyecto C++ en producción. ASan + UBSan son obligatorios en CI Debug. Hardening flags siempre activas incluso en Release. Valgrind para diagnóstico de leaks específicos |
| **Cuándo evitar** | ASan en producción (overhead ∼2x, consume más memoria), Valgrind en producción (overhead 20x), hardening flags con compiladores antiguos sin soporte (GCC <8) |
| **Alternativas** | Rust (seguridad en compilación, no necesita sanitizers), C++ Core Guidelines Checkers (clang-tidy), automatic `gsl::span` boundaries checking, `std::optional` vs nullable pointers |
| **Coste/Complejidad** | Bajo: los sanitizers son fáciles de activar con flags. Hardening flags son configuración única. El costo real está en arreglar los bugs que los sanitizers encuentran (uso correcto de smart pointers, bounds checking) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: ASan reporta heap-buffer-overflow pero el código parece correcto

**¿Qué ocasionó el error?**
Un `std::vector` se redimensionaba dentro de un bucle que guardaba referencias a elementos. La redimensión invalidó las referencias (iterators), causando overflow al acceder por la referencia stale.

**¿Cómo se solucionó?**
Reservar capacidad antes del bucle o usar índices en lugar de referencias:

```cpp
// ❌ ASan: heap-buffer-overflow
std::vector<int> v = {1, 2, 3};
for (auto& x : v) {
    v.push_back(x * 2);  // reallocation → x es dangling reference
}

// ✅ Reservar capacidad
std::vector<int> v = {1, 2, 3};
v.reserve(6);  // suficiente para push_backs
for (auto x : v)  // copia, no referencia
    v.push_back(x * 2);

// ✅ O usar índices
for (size_t i = 0, n = v.size(); i < n; i++)
    v.push_back(v[i] * 2);
```

**¿Por qué funciona esta técnica?**
ASan detecta accessos a memoria después de que el buffer original fue liberado por `realloc`. `reserve()` pre-asigna espacio suficiente para que `push_back` no provoque reallocation. Usar índices evita referencias que pueden invalidarse.

### Caso: UBSan reporta "shift exponent too large"

**¿Qué ocasionó el error?**
Desplazamiento de bits con un exponente mayor o igual al ancho del tipo (por ejemplo, desplazar un `uint32_t` 32 bits o más). En C++, esto es undefined behavior.

**¿Cómo se solucionó?**
Verificar el exponente antes del desplazamiento:

```cpp
// ❌ UB: shift >= width
uint32_t x = 1;
int shift = 32;
uint32_t result = x << shift;  // undefined behavior!

// ✅ Safe: verificar rango
uint32_t safe_shl(uint32_t val, int shift) {
    if (shift < 0 || shift >= 32)
        return 0;  // o lanzar excepción
    return val << shift;
}

// ✅ O usar shift condicional
uint32_t safe = (shift >= 32) ? 0 : (x << shift);
```

**¿Por qué funciona esta técnica?**
En x86, `shl` con CL=32 es un no-op (usa solo los 5 bits bajos de CL), pero el estándar C++ lo define como UB. UBSan detecta y reporta. La verificación explícita elimina el UB y hace el comportamiento predecible en todas las plataformas.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~185 tokens estimados al invocar este skill
- **Trigger de activación:** `ASan AddressSanitizer heap buffer overflow detection`
- **Prioridad de carga:** Alta — seguridad de memoria es crítica en C++
- **Dependencias:** `03-memory-raii-borrowing` (smart pointers, RAII), `26-modern-cpp-development` (CMake toolchain)

### Tool Integration

```json
{
  "tool_name": "cpp-memory-safety",
  "description": "Seguridad de memoria en C++: ASan, UBSan, hardening flags, smart pointers, Valgrind",
  "triggers": ["ASan", "UBSan", "Valgrind", "sanitizer", "memory safety", "FORTIFY_SOURCE", "CFI"],
  "context_hint": "Inyectar ejemplo de CMake con hardening flags y sanitizers para Debug",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre seguridad de memoria en C++ o sanitizers, carga el skill
cpp-memory-safety. Proporciona la configuración de CMake con ASan + UBSan + hardening
y ejemplos de smart pointers + gsl::not_null.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Compilar con sanitizers
clang++ -fsanitize=address,undefined -g -O1 -o app main.cpp

# Ejecutar (ASan aborta en primer error)
./app

# Valgrind memcheck
valgrind --leak-check=full --show-leak-kinds=all ./app

# Verificar hardening del binario
readelf -l app | grep -E 'GNU_STACK|GNU_RELRO'
# GNU_STACK: RWE → noexecstack (buscar RW, no RWE)
# GNU_RELRO: RELRO parcial o completo

# Clang-tidy para detección estática
clang-tidy --checks=clang-analyzer-*,cppcoreguidelines-* main.cpp
```

### GUI / Web

- **ASan output**: stack trace coloreado con líneas de código fuente
- **Valgrind Memcheck**: reporte de leaks con backtraces completos
- **Clang-Tidy VSCode**: subrayado en línea de problemas de seguridad
- **SonarQube**: análisis estático con reglas C++ Core Guidelines

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compilar con ASan | `clang++ -fsanitize=address -g -O1 main.cpp` | `CMake → -DCMAKE_BUILD_TYPE=Debug` |
| Ejecutar Valgrind | `valgrind --leak-check=full ./app` | `VSCode → Valgrind Task` |
| Clang-tidy | `clang-tidy --checks=clang-analyzer-* main.cpp` | `Ctrl+Shift+P → Clang-Tidy: Fix` |

---

## 7. Cheatsheet Rápido

```cmake
# Memory safety — 8 líneas
target_compile_options(app PRIVATE
    -fstack-protector-all -D_FORTIFY_SOURCE=3
    -fcf-protection=full -Wformat-security)
target_link_options(app PRIVATE -Wl,-z,relro,-z,now -pie)
# Debug: -fsanitize=address,undefined,leak -fno-omit-frame-pointer
# leak check: valgrind --leak-check=full ./app
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-memory-raii-borrowing` | dependiente — RAII y smart pointers | Sí |
| `26-modern-cpp-development` | dependiente — toolchain CMake | Sí |
| `27-rust-systems-programming` | alternativo — Rust safety sin sanitizers | No |
| `06-seguridad-sdlc/08-static-application-security-testing-sast` | complementario — SAST para C++ | No |

---

## 9. Metadatos del Skill

```yaml
---
id: cpp-memory-safety
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/29-cpp-memory-safety
tags: [ASan, UBSan, Valgrind, memory-safety, C++, hardening, smart-pointers, CFI]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

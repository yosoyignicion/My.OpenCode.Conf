---
name: modern-cpp-development
description: "Modern C++ (C++20/23/26) resuelve los problemas de productividad y seguridad del C++ clásico mediante módulos (reemplazando headers frágiles), concepts (restricciones de plantilla legibles), ranges..."
---
# Modern C++ Development

## Semantic Triggers
```
modern C++20 CMake target-based build, C++23 std::expected std::print std::mdspan, C++26 static reflection contracts execution, Conan 2 package manager dependency, vcpkg manifest mode dependencies, C++ modules concepts ranges coroutines
```

---

## 1. Definición Teórica

Modern C++ (C++20/23/26) resuelve los problemas de productividad y seguridad del C++ clásico mediante módulos (reemplazando headers frágiles), concepts (restricciones de plantilla legibles), ranges (algoritmos componibles), corrutinas (async nativo sin bibliotecas externas), y `std::expected` (manejo de errores determinista). El principio fundamental es que el código moderno expresa intención en lugar de mecánica: los concepts documentan restricciones en la interfaz, los ranges separan datos de algoritmos, y `std::optional`/`std::expected` eliminan la necesidad de punteros nulos o códigos de error. Arquitectónicamente, el ecosistema moderno combina CMake 4.x (target-based build con presets), Conan 2 para dependencias, y sanitizers (ASan + UBSan) como parte integral del pipeline de desarrollo. C++26 introduce reflection estática y contracts, acercando el lenguaje a la verificación formal.

---

## 2. Implementación de Referencia

CMake 4.x, Conan 2, vcpkg. Compiladores: clang++ ≥18, GCC ≥14, MSVC ≥2022. Estándar: C++23 para proyectos nuevos, C++20 para máxima portabilidad.

### Ejemplo Práctico Avanzado

```json
// CMakePresets.json
{
  "version": 8,
  "configurePresets": [
    {
      "name": "default",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "cacheVariables": {
        "CMAKE_CXX_COMPILER": "clang++",
        "CMAKE_CXX_STANDARD": "23",
        "CMAKE_CXX_EXTENSIONS": "OFF",
        "BUILD_TESTING": "ON"
      }
    },
    {
      "name": "asan",
      "inherits": "default",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_CXX_FLAGS": "-fsanitize=address,undefined -fno-omit-frame-pointer"
      }
    },
    {
      "name": "release",
      "inherits": "default",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release",
        "CMAKE_INTERPROCEDURAL_OPTIMIZATION": "ON"
      }
    }
  ]
}
```

```cpp
// math.cppm — C++20 module
export module math;

export auto add(auto a, auto b) { return a + b; }

// main.cpp — usando módulos y features modernos
import math;
import std;

auto main() -> int {
    // C++20: Concepts y Ranges
    std::vector<int> nums = {1, 2, 3, 4, 5};

    auto even = nums | std::views::filter([](int n) { return n % 2 == 0; });
    std::println("Even numbers: {}", even);

    // C++23: Corrutinas con std::generator
    auto fibonacci() -> std::generator<int> {
        int a = 0, b = 1;
        while (true) {
            co_yield a;
            a = std::exchange(b, a + b);
        }
    }

    for (auto f : fibonacci() | std::views::take(10))
        std::print("{} ", f);
    std::println();

    // C++23: std::expected para errores deterministas
    return 0;
}

// Error handling determinista
auto parse_int(std::string_view s) -> std::expected<int, std::string> {
    int value;
    auto [ptr, ec] = std::from_chars(s.data(), s.data() + s.size(), value);
    if (ec != std::errc{})
        return std::unexpected("Invalid number: " + std::string(s));
    return value;
}
```

**Fuente oficial:** https://en.cppreference.com/w/cpp/23 — https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html

### Alternativa de Implementación Específica

**Conan 2 + CMake para dependencias complejas:**

```python
# conanfile.txt
[requires]
fmt/10.2.1
boost/1.86.0
spdlog/1.15.0

[generators]
CMakeDeps
CMakeToolchain

[layout]
cmake_layout
```

```bash
conan install . --build=missing
cmake --preset default
cmake --build build/default
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas de producción con requisitos de rendimiento y seguridad, bibliotecas de infraestructura, aplicaciones desktop, motores de juegos, sistemas financieros/trading |
| **Cuándo evitar** | Prototipado rápido (Python/JS mejor), sistemas embebidos sin soporte del compilador para C++20+, scripts pequeños (overhead de toolchain excesivo) |
| **Alternativas** | Rust (seguridad de memoria similar, ecosistema más pequeño), C23 (C moderno sin sobrecarga de OOP), Zig (compile-time reflection built-in), Go (GC pero compilación rápida) |
| **Coste/Complejidad** | Medio: CMake moderno reduce la complejidad, pero los módulos C++20 aún tienen soporte parcial. Conan 2 es más simple que Conan 1. Sanitizers obligatorios en Debug añaden overhead de compilación |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: C++20 module compilation falla con "module not found"

**¿Qué ocasionó el error?**
CMake no gestiona automáticamente las dependencias de módulos C++20. El orden de compilación de archivos `.cppm` es crítico y debe declararse explícitamente.

**¿Cómo se solucionó?**
Declarar dependencias de módulos en CMake:

```cmake
# CMakeLists.txt
target_sources(myapp PRIVATE
    FILE_SET CXX_MODULES
    BASE_DIRS src
    FILES src/math.cppm
)

# Asegurar el orden de compilación
target_link_libraries(myapp PRIVATE
    cmake::std_module  # módulo std (C++23)
)
```

**¿Por qué funciona esta técnica?**
CMake 3.28+ entiende `FILE_SET CXX_MODULES` y ordena la compilación según las dependencias de importación de módulos. `cmake::std_module` es un target especial que proporciona el módulo `std` de C++23 (disponible en GCC 14+ y clang 18+).

### Caso: LTO falla con enlace de bibliotecas estáticas y dinámicas

**¿Qué ocasionó el error?**
LTO (Link-Time Optimization) requiere que todos los objetos se compilen con el mismo compilador y flags. Mezclar bibliotecas estáticas compiladas con GCC y objetos clang causa errores de LTO irreconciliables.

**¿Cómo se solucionó?**
Usar ThinLTO y forzar el mismo compilador:

```cmake
# Usar ThinLTO (más portable entre versiones)
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)
set(CMAKE_CXX_FLAGS_RELEASE "-flto=thin -fuse-linker-plugin")
target_link_options(myapp PRIVATE "-flto=thin")

# Forzar mismo compilador para todas las dependencias
set(CMAKE_CXX_COMPILER "${CMAKE_CXX_COMPILER}" CACHE STRING "" FORCE)
```

**¿Por qué funciona esta técnica?**
ThinLTO (clang) es más tolerante con diferentes versiones de IR. `-fuse-linker-plugin` permite que el linker use el plugin de LTO correcto. La clave es compilar todo con el mismo toolchain (clang++ + lld) en lugar de mezclar.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~200 tokens estimados al invocar este skill
- **Trigger de activación:** `modern C++20 CMake target-based build`
- **Prioridad de carga:** Alta — C++ moderno es base para sistemas de bajo nivel
- **Dependencias:** `03-memory-raii-borrowing` (RAII y smart pointers), `29-cpp-memory-safety` (sanitizers)

### Tool Integration

```json
{
  "tool_name": "modern-cpp-development",
  "description": "Desarrollo C++ moderno: CMake 4, C++23 modules, concepts, ranges, Conan 2, sanitizers",
  "triggers": ["C++20", "C++23", "CMake", "Conan", "modules", "concepts", "ranges", "coroutines"],
  "context_hint": "Inyectar ejemplo de CMakePresets.json + C++23 modules y ranges",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre desarrollo C++ moderno o toolchain, carga el skill
modern-cpp-development. Proporciona ejemplos de CMakePresets, modules C++20,
y bibliotecas modernas como std::expected y std::generator.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Configurar y compilar con presets
cmake --preset default
cmake --build build/default

# Con ASan
cmake --preset asan
cmake --build build/asan
./build/asan/tests

# Release con LTO
cmake --preset release
cmake --build build/release

# Actualizar dependencias Conan
conan install . --build=missing
```

### GUI / Web

- **CLion**: soporte nativo de CMake presets y Conan
- **VSCode + CMake Tools**: integración con presets y codelldb
- **CMake GUI**: configuración visual de variables de caché
- **Conan Center**: https://conan.io/center/ — búsqueda de paquetes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Configurar | `cmake --preset default` | `Ctrl+Shift+P → CMake: Configure` |
| Compilar | `cmake --build build/default` | `F7 (CLion) / Ctrl+F9 (VSCode)` |
| Ejecutar tests | `ctest --preset default` | `Ctrl+Shift+P → CMake: Run Tests` |

---

## 7. Cheatsheet Rápido

```cpp
// Modern C++ essentials — 10 líneas
export module mylib;
export auto square(auto x) { return x * x; }

import std;
auto v = std::vector{1, 2, 3} | std::views::transform(square<int>);
std::println("{}", v);

// CMakePresets.json para build reproducible
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-memory-raii-borrowing` | dependiente — smart pointers + RAII | Sí |
| `29-cpp-memory-safety` | dependiente — sanitizers + hardening | Sí |
| `31-cpp-audio-development` | dependiente — JUCE sobre C++ moderno | No |
| `33-qt6-framework` | dependiente — Qt6 sobre CMake moderno | No |

---

## 9. Metadatos del Skill

```yaml
---
id: modern-cpp-development
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/26-modern-cpp-development
tags: [C++, CMake, Conan, modules, concepts, ranges, coroutines, std::expected, LTO]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

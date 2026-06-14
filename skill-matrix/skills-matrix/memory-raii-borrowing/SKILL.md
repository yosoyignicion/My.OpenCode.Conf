---
name: memory-raii-borrowing
description: "RAII (Resource Acquisition Is Initialization) resuelve la gestión determinista de recursos enlazando su ciclo de vida al de un objeto de ámbito (stack), garantizando que la liberación ocurra al sal..."
---
# Memory Management — RAII & Borrowing

## Semantic Triggers
```
RAII resource acquisition is initialization, Rust borrow checker ownership, C++ smart pointers unique_ptr shared_ptr, rule of five C++ resource management, scope-bound resource management destructors, ownership transfer move semantics
```

---

## 1. Definición Teórica

RAII (Resource Acquisition Is Initialization) resuelve la gestión determinista de recursos enlazando su ciclo de vida al de un objeto de ámbito (stack), garantizando que la liberación ocurra al salir del scope, incluso con excepciones. El principio fundamental es que el constructor adquiere el recurso y el destructor lo libera, haciendo imposible el olvido de liberación. En Rust, este concepto se extiende con el borrow checker, que verifica en tiempo de compilación que toda referencia cumple las reglas de ownership (único propietario, múltiples referencias inmutables XOR una mutable). Arquitectónicamente, RAII + borrow checking eliminan categorías enteras de bugs de memoria (use-after-free, double-free, leaks) sin necesidad de garbage collector. Existen como paradigma diferenciado porque ofrecen seguridad de memoria determinista con overhead cero en tiempo de ejecución.

---

## 2. Implementación de Referencia

C++20/23 con smart pointers (`std::unique_ptr`, `std::shared_ptr`, `std::weak_ptr`). Rust ownership system (borrow checker, lifetimes, `Box`, `Rc`, `Arc`).

### Ejemplo Práctico Avanzado

```cpp
#include <memory>
#include <vector>
#include <string>
#include <gsl/gsl>

class DatabaseConnection {
public:
    // RAII: constructor adquiere recurso
    explicit DatabaseConnection(std::string_view conn_str)
        : m_handle(connect(conn_str)) {
        if (!m_handle) throw std::runtime_error("Connection failed");
    }

    // Move constructor: transferencia de ownership
    DatabaseConnection(DatabaseConnection&& other) noexcept
        : m_handle(std::exchange(other.m_handle, nullptr)) {}

    // Destructor: liberación automática
    ~DatabaseConnection() {
        if (m_handle) disconnect(m_handle);
    }

    // Prohibir copia (recurso único)
    DatabaseConnection(const DatabaseConnection&) = delete;
    DatabaseConnection& operator=(const DatabaseConnection&) = delete;

    gsl::not_null<Handle*> get() { return m_handle; }

private:
    Handle* m_handle = nullptr;
};

// Uso: el recurso se libera al salir del scope
class ConnectionPool {
    std::vector<std::unique_ptr<DatabaseConnection>> m_pool;
public:
    void addConnection(std::unique_ptr<DatabaseConnection> conn) {
        m_pool.push_back(std::move(conn));  // transferencia de ownership
    }
    // Al destruir ConnectionPool, todos los unique_ptr se destruyen
    // y cada DatabaseConnection libera su handle
};
```

**Fuente oficial:** https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii

### Alternativa de Implementación Específica

**Rust — Borrow Checker con Lifetimes:**

```rust
use std::fmt::Display;

struct DatabaseConnection {
    handle: i32,
    connected: bool,
}

// Lifetime explícito: el prestamo (borrow) debe vivir menos que el origen
fn execute_query<'a, T: Display>(conn: &'a DatabaseConnection, query: T) -> String
where
    'a: 'static // la referencia debe ser estática para el ejemplo
{
    format!("Executing on handle {}: {}", conn.handle, query)
}

fn process() {
    let conn = DatabaseConnection { handle: 42, connected: true };

    // Borrow inmutable (múltiples referencias permitidas)
    let result1 = execute_query(&conn, "SELECT 1");
    let result2 = execute_query(&conn, "SELECT 2");
    println!("{} | {}", result1, result2);

    // conn se destruye aquí, liberando el recurso
} // destructor de DatabaseConnection se ejecuta automáticamente
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas con requisitos deterministas de memoria, tiempo real embebido, navegadores, motores de juegos, cualquier sistema donde GC stop-the-world sea inaceptable |
| **Cuándo evitar** | Prototipado rápido donde la complejidad del borrow checker frena iteración, scripts de una sola ejecución, sistemas con ciclo de objetos complejo (ej. grafos cíclicos sin weak_ptr) |
| **Alternativas** | GC tracing (Java, Go — pausas, pero menor carga cognitiva), ARC (Swift, ObjC — conteo de referencias automático con ciclos), GC generacional (V8, HotSpot — throughput, pero no determinista) |
| **Coste/Complejidad** | Medio: RAII es simple en C++, pero el borrow checker de Rust tiene curva de aprendizaje pronunciada. El overhead de smart pointers (`shared_ptr`) incluye conteo atómico |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Double-free con shared_ptr por ciclo de referencia

**¿Qué ocasionó el error?**
Dos objetos se referencian mutuamente con `shared_ptr`, creando un ciclo que impide que el contador de referencias llegue a cero. El recurso nunca se libera (leak silencioso).

**¿Cómo se solucionó?**
Usar `weak_ptr` para una de las direcciones del ciclo:

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;  // débil para romper el ciclo
    ~Node() { std::print("Node destroyed\n"); }
};

auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->prev = a;  // weak_ptr, no incrementa ref count
// Al salir del scope, ambos se destruyen correctamente
```

**¿Por qué funciona esta técnica?**
`weak_ptr` no incrementa el contador de referencias. Cuando se necesita acceder al recurso, se debe llamar a `weak_ptr::lock()`, que devuelve un `shared_ptr` temporal o `nullptr` si el recurso ya fue liberado. Esto rompe el ciclo manteniendo la seguridad de tipos.

### Caso: Rust borrow checker rechaza código válido (NLL issue)

**¿Qué ocasionó el error?**
Código que funciona en C++ con punteros se rechaza porque el borrow checker ve un conflicto entre borrows mutable e inmutable, aunque en ejecución estén temporalmente separados.

**¿Cómo se solucionó?**
Reestructurar usando Non-Lexical Lifetimes (NLL) o introducir un ámbito adicional:

```rust
let mut data = vec![1, 2, 3];
// Antes: error de borrow
// let slice = &data[..];
// data.push(4);  // error: mutable borrow mientras existe inmutable

// Después: ámbito explícito
let result = {
    let slice = &data[..];
    slice.iter().sum::<i32>()  // el borrow termina aquí
};
data.push(4);  // ahora compila: el borrow inmutable ya terminó
```

**¿Por qué funciona esta técnica?**
NLL del compilador 2021+ analiza el tiempo de vida real de los borrows (no solo el ámbito léxico). Al limitar el uso de `slice` a un bloque, el compilador determina que el borrow termina antes de la mutación.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `RAII resource acquisition is initialization`
- **Prioridad de carga:** Alta — gestión de memoria es fundamental en sistemas de bajo nivel
- **Dependencias:** `27-rust-systems-programming` (para ejemplos Rust), `26-modern-cpp-development` (para ejemplos C++ modernos)

### Tool Integration

```json
{
  "tool_name": "memory-raii-borrowing",
  "description": "Gestión determinista de memoria con RAII y borrow checker para sistemas sin GC",
  "triggers": ["RAII", "borrow checker", "smart pointer", "ownership", "lifetime", "unique_ptr"],
  "context_hint": "Inyectar ejemplos de C++ (unique_ptr/shared_ptr) o Rust (ownership/lifetimes) según el lenguaje",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre gestión de memoria sin GC, carga el skill memory-raii-borrowing.
Proporciona ejemplos de RAII en C++ con smart pointers y del borrow checker de Rust.
Explica cómo transferir ownership con std::move y std::exchange.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Rust: comprobar prestamos (borrow) y lifetimes
cargo check  # verifica el borrow checker sin compilar

# C++: habilitar ASan para detectar uso después de liberar
clang++ -fsanitize=address -g -o app main.cpp

# Valgrind: detectar leaks de memoria
valgrind --leak-check=full ./app

# Verificar que RAII funciona (no leaks)
valgrind --leak-check=full --show-leak-kinds=all ./app 2>&1 | grep "definitely lost\|indirectly lost"
```

### GUI / Web

- **Rust Analyzer** (VSCode): subraya errores de borrow checker en tiempo real con sugerencias de fix
- **`cargo clippy`**: linting con reglas para ownership y lifetimes
- **Visual Studio**: diagnosticador de lifetime de C++ Core Guidelines
- **ReSharper C++**: análisis de fugas de recursos con RAII

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Verificar borrows en Rust | `cargo check` | `Ctrl+Shift+P → Rust Analyzer: Check` |
| Ejecutar con ASan | `./app` (compilado con `-fsanitize=address`) | `Ctrl+F5` con configuración ASan |
| Leak check con Valgrind | `valgrind --leak-check=full ./app` | VSCode: `Run → Valgrind Task` |

---

## 7. Cheatsheet Rápido

```cpp
// RAII en 10 líneas
class Resource {
    Handle* h;
public:
    Resource() : h(acquire()) {}
    ~Resource() { if (h) release(h); }
    Resource(Resource&& o) : h(std::exchange(o.h, nullptr)) {}
    Resource(const Resource&) = delete;
};

// Uso: se libera al salir del ámbito
{ Resource r; /* usar r */ } // ~Resource() automático
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `29-cpp-memory-safety` | superconjunto — sanitizers + RAII combinados | Sí |
| `27-rust-systems-programming` | complementario — ownership + borrow checker | Sí |
| `26-modern-cpp-development` | dependiente — smart pointers en C++ moderno | Sí |
| `13-garbage-collection-algorithms` | alternativo — gestión de memoria con GC | No |

---

## 9. Metadatos del Skill

```yaml
---
id: memory-raii-borrowing
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [RAII, rust, borrow-checker, ownership, memory, unique_ptr, shared_ptr, smart-pointers]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

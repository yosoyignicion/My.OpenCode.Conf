---
name: lock-free-data-structures
description: "Las estructuras de datos lock-free resuelven la contención de hilos bajo alta concurrencia eliminando los mutexes y permitiendo que múltiples hilos progresen simultáneamente sin bloqueo mutuo"
---
# Lock-Free Data Structures

## Semantic Triggers
```
lock-free stack with hazard pointers, wait-free queue multi-producer multi-consumer, Compare-And-Swap CAS ABA problem, RCU read-copy-update synchronization, seqlock sequence lock, memory ordering acquire release semantics
```

---

## 1. Definición Teórica

Las estructuras de datos lock-free resuelven la contención de hilos bajo alta concurrencia eliminando los mutexes y permitiendo que múltiples hilos progresen simultáneamente sin bloqueo mutuo. El principio fundamental es el uso de operaciones atómicas (CAS, LL/SC) sobre variables compartidas, garantizando que al menos un hilo progrese en cada paso (lock-free) o todos los hilos progresen en un número finito de pasos (wait-free). Arquitectónicamente, requieren protocolos de gestión de memoria como hazard pointers o RCU para resolver el problema de ABA y el reclamation de memoria, ya que un hilo no puede saber cuándo otro deja de referenciar un nodo. Existen como patrón diferenciado porque los mutexes escalan mal con el número de núcleos y pueden causar inversión de prioridad, mientras que lock-free ofrece progreso garantizado.

---

## 2. Implementación de Referencia

C++20/23 con `std::atomic`, `std::atomic_ref`, `std::memory_order`. Idiomas: C++ (boost.lockfree, folly::RCU), Rust (crossbeam-epoch, arc-swap), Java (java.util.concurrent, VarHandle).

### Ejemplo Práctico Avanzado

```cpp
#include <atomic>
#include <memory>
#include <bit>
#include <cstdint>

// Lock-free stack con hazard pointers (simplificado, sin ABA)
template<typename T>
class LockFreeStack {
    struct Node {
        std::shared_ptr<T> data;
        Node* next;
        Node(T val) : data(std::make_shared<T>(val)), next(nullptr) {}
    };

    std::atomic<Node*> head{nullptr};

public:
    void push(T val) {
        Node* new_node = new Node(std::move(val));
        new_node->next = head.load(std::memory_order_relaxed);

        // CAS loop: actualizar head si sigue apuntando al mismo next
        while (!head.compare_exchange_weak(
            new_node->next,
            new_node,
            std::memory_order_release,  // release: otros hilos ven el push
            std::memory_order_relaxed
        )) {}
    }

    std::shared_ptr<T> pop() {
        Node* old_head = head.load(std::memory_order_relaxed);

        while (old_head) {
            // CAS loop: si head cambió (otro pop concurrente), reintentar
            if (head.compare_exchange_weak(
                old_head,
                old_head->next,
                std::memory_order_acquire,  // acquire: ver datos del push
                std::memory_order_relaxed
            )) {
                auto result = old_head->data;
                // En producción: hazard pointer aquí para reclamation segura
                delete old_head;
                return result;
            }
        }
        return nullptr;
    }

    bool empty() const {
        return head.load(std::memory_order_acquire) == nullptr;
    }
};

// Wait-free SPMC queue con seqlock (simplificado)
template<typename T>
class SeqLockQueue {
    std::atomic<uint64_t> seq{0};
    T buffer[256];
    std::atomic<size_t> write_idx{0};
    size_t read_idx{0};

public:
    void write(const T& item) {
        size_t idx = write_idx.fetch_add(1, std::memory_order_relaxed) % 256;
        seq.store(idx + 1, std::memory_order_release);
        buffer[idx] = item;
        seq.store(idx + 2, std::memory_order_release);
    }

    bool read(T& out) {
        size_t idx = read_idx++ % 256;
        uint64_t s0 = seq.load(std::memory_order_acquire);
        if (s0 != idx + 2) return false;  // escritura incompleta
        out = buffer[idx];
        return (seq.load(std::memory_order_acquire) == s0);  // verify no torn read
    }
};
```

**Fuente oficial:** https://en.cppreference.com/w/cpp/atomic/memory_order

### Alternativa de Implementación Específica

**Rust con crossbeam-epoch para reclamation segura de memoria:**

```rust
use crossbeam_epoch::{self as epoch, Atomic, Owned, Shared};

struct Node<T> {
    data: T,
    next: Atomic<Node<T>>,
}

pub struct Stack<T> {
    head: Atomic<Node<T>>,
}

impl<T> Stack<T> {
    pub fn push(&self, val: T) {
        let new_node = Owned::new(Node {
            data: val,
            next: Atomic::null(),
        });
        let guard = epoch::pin();
        loop {
            let head = self.head.load(std::sync::atomic::Ordering::Relaxed, &guard);
            new_node.next.store(head, std::sync::atomic::Ordering::Relaxed);
            match self.head.compare_exchange_weak(
                head, new_node, std::sync::atomic::Ordering::Release, &guard,
            ) {
                Ok(_) => break,
                Err(e) => new_node.next.store(e.current, std::sync::atomic::Ordering::Relaxed),
            }
        }
    }
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Concurrencia extrema (>16 hilos), sistemas de tiempo real (sin bloqueo garantizado), infraestructura de baja latencia (trading, redes), sistemas donde los mutexes causan inversión de prioridad |
| **Cuándo evitar** | Contención baja (<4 hilos), estructuras pequeñas donde un mutex es más simple, prototipado, sistemas donde la complejidad de memory reclamation no se justifica |
| **Alternativas** | Mutex con `std::shared_mutex` (simple, suficiente para <8 hilos), RCU (read-heavy workloads), Transactional Memory (HTM/TSX), Actors (sin estado compartido) |
| **Coste/Complejidad** | Muy alto: hazard pointers, epoch-based reclamation, memory ordering correcto es extremadamente difícil. La mayoría de implementaciones contienen bugs de concurrencia. Usar bibliotecas probadas (boost.lockfree, crossbeam) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: ABA problem en lock-free stack con CAS

**¿Qué ocasionó el error?**
Thread A: head → Node1 → Node2. Thread A lee head = Node1, Node1->next = Node2. Thread B: pop Node1, pop Node2, push Node1 (misma dirección). Thread A: CAS(head, Node1, Node2) succeed porque head sigue siendo Node1 (misma dirección, pero ahora Node1->next es nullptr, no Node2). Thread A accede a Node1->next que ahora es nullptr → crash.

**¿Cómo se solucionó?**
Usar versioned pointers o hazard pointers + tag:

```cpp
struct TaggedPtr {
    Node* ptr;
    uint64_t tag;  // contador de versiones
};
std::atomic<TaggedPtr> head;

void push(Node* n) {
    auto old = head.load(std::memory_order_relaxed);
    n->next = old.ptr;
    // CAS con tag: si la dirección es la misma pero tag cambió, falla
    while (!head.compare_exchange_weak(
        old,
        {n, old.tag + 1},
        std::memory_order_release,
        std::memory_order_relaxed
    )) {}
}
```

**¿Por qué funciona esta técnica?**
El tag actúa como contador ABA: cada modificación de head incrementa el tag. Si un nodo se elimina y se reasigna, el tag ya no coincide, y CAS falla. En ARM64, CAS de 128 bits (usando LDXP/STXP) soporta doble-word atómico.

### Caso: Memory leak en lock-free stack sin reclamation

**¿Qué ocasionó el error?**
El destructor de `LockFreeStack` hacía `delete` de todos los nodos, pero un thread en `pop()` podía tener una referencia a un nodo que otro thread ya liberó, causando use-after-free.

**¿Cómo se solucionó?**
Implementar epoch-based reclamation con hazard pointers. En producción, usar `crossbeam_epoch` (Rust) o `folly::rcu` (C++):

```cpp
// Esquema conceptual: usar epoch counter
// Incrementar epoch al empezar pop, decrementar al terminar
// Eliminar nodos solo cuando todos los threads están fuera del epoch
std::atomic<int> global_epoch{0};
thread_local int local_epoch{0};

void enter_critical() {
    local_epoch = global_epoch.load();
}
void exit_critical() {
    local_epoch = 0;
}
// Sólo eliminar nodos en epoch anterior cuando todos los threads salieron
```

**¿Por qué funciona esta técnica?**
RCU y epoch-based reclamation garantizan que un nodo solo se elimina cuando ningún thread puede tener una referencia a él. Los hazard pointers marcan punteros en uso; la reclamation diferida espera a que todos los threads pasen por un quiescent state.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `lock-free stack with hazard pointers`
- **Prioridad de carga:** Alta — estructuras lock-free son esenciales para sistemas concurrentes
- **Dependencias:** `06-cpu-cache-locality-alignment` (false sharing en CAS loops), `25-hardware-transactional-memory` (alternativa HTM)

### Tool Integration

```json
{
  "tool_name": "lock-free-data-structures",
  "description": "Estructuras de datos concurrentes sin locks con CAS, RCU, hazard pointers y memoria transaccional",
  "triggers": ["lock-free", "wait-free", "CAS", "ABA problem", "RCU", "hazard pointer", "memory ordering"],
  "context_hint": "Inyectar ejemplo de lock-free stack con CAS loop y explicación de memory ordering",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre estructuras lock-free o CAS, carga el skill lock-free-data-structures.
Proporciona un ejemplo de lock-free stack con CAS loop y memory ordering.
Explica el problema ABA y cómo solucionarlo con tagged pointers.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Detectar data races con TSan
clang++ -fsanitize=thread -g -O1 -o app main.cpp
./app  # reporta race conditions

# Helgrind para races en lock-free
valgrind --tool=helgrind ./app

# Verificar memory ordering en asm
objdump -d app | grep -E 'lock|cmpxchg|fence|dmb'

# TSAN suppression para lock-free correcto
cat tsan.supp
race:my_lock_free_push
```

### GUI / Web

- **ThreadSanitizer**: reporta data races con stack traces
- **Relacy Race Detector**: simulación de modelos de memoria C++ para lock-free
- **CDSChecker**: model checking de estructuras lock-free
- **Godbolt (Compiler Explorer)**: ver el código assembly generado para operaciones atómicas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compilar con TSan | `clang++ -fsanitize=thread -g -O1 main.cpp` | `CMake → -DCMAKE_CXX_FLAGS=-fsanitize=thread` |
| Ver asm de CAS | `objdump -d app | grep cmpxchg` | `Compiler Explorer → clang -S -emit-llvm` |
| Simular modelo memoria | `relacy my_lock_free.cpp` | `CDSChecker GUI` |

---

## 7. Cheatsheet Rápido

```cpp
// CAS loop lock-free push — 8 líneas
void push(T val) {
    Node* n = new Node(val);
    n->next = head.load(memory_order_relaxed);
    while (!head.compare_exchange_weak(
        n->next, n,
        memory_order_release,
        memory_order_relaxed)) {}
}
// Release: otros threads ven n->next actualizado
// Acquire en pop: ven los datos del push
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `06-cpu-cache-locality-alignment` | dependiente — false sharing en CAS loops | Sí |
| `25-hardware-transactional-memory` | alternativo — HTM/TSX como alternativa a CAS | Sí |
| `02-concurrency-actor-model` | alternativo — concurrencia sin estado compartido | No |
| `24-instruction-level-parallelism` | complementario — pipeline de CPU y operaciones atómicas | No |

---

## 9. Metadatos del Skill

```yaml
---
id: lock-free-data-structures
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [lock-free, wait-free, CAS, ABA, RCU, hazard-pointer, memory-ordering, concurrent]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: zero-copy-serialization
description: "La serialización zero-copy resuelve el overhead de CPU y memoria al evitar el paso de deserialización mediante el acceso directo a un buffer de bytes que ya está en el formato de memoria nativo"
---
# Zero-Copy Serialization

## Semantic Triggers
```
zero-copy deserialization without parsing, FlatBuffers schema definition, Cap'n Proto arena allocation, Apache Arrow columnar format, memory-mapped serialization, wire format zero parsing
```

---

## 1. Definición Teórica

La serialización zero-copy resuelve el overhead de CPU y memoria al evitar el paso de deserialización mediante el acceso directo a un buffer de bytes que ya está en el formato de memoria nativo. El principio fundamental es que los datos se escriben en un formato que puede ser mapeado directamente a memoria (mmap o buffer contiguo) y accedido mediante offsets en lugar de parsear una estructura serializada. Arquitectónicamente, las bibliotecas zero-copy (FlatBuffers, Cap'n Proto, Arrow) definen un esquema en un IDL, generan código que produce un layout de memoria autocontenido, y proporcionan accessors que leen directamente del buffer sin copias intermedias. Existen como alternativa diferenciada porque JSON/Protobuf/Avro requieren deserialización completa antes de acceder a los datos, lo que añade latencia y GC pressure.

---

## 2. Implementación de Referencia

Cap'n Proto ≥1.1 (C++) con arena allocation. FlatBuffers ≥24.3 (C++, Rust, TypeScript). Apache Arrow ≥18 (columnar, multi-lenguaje). Idiomas: C++, Rust, Python, JavaScript.

### Ejemplo Práctico Avanzado

```capnp
// schema.capnp — definición IDL
@0x89a3b2c1d4e5f607;

struct Person {
    name @0 :Text;
    email @1 :Text;
    age @2 :UInt32;
    addresses @3 :List(Address);
}

struct Address {
    street @0 :Text;
    city @1 :Text;
    zip @2 :UInt32;
}
```

```cpp
// Escritura zero-copy con Cap'n Proto
#include <capnp/message.h>
#include <capnp/serialize-packed.h>
#include "schema.capnp.h"

kj::Array<capnp::word> buildPersonData() {
    ::capnp::MallocMessageBuilder message;
    Person::Builder person = message.initRoot<Person>();

    person.setName("Alice García");
    person.setEmail("alice@example.com");
    person.setAge(30);

    auto addresses = person.initAddresses(1);
    addresses[0].setStreet("123 Main St");
    addresses[0].setCity("Madrid");
    addresses[0].setZip(28001);

    // Serializar a bytes — sin copias internas
    return capnp::messageToFlatArray(message);
}

// Lectura zero-copy (sin deserializar)
void readPersonData(const capnp::word* data, size_t size) {
    ::capnp::FlatArrayMessageReader reader(kj::arrayPtr(data, size));
    Person::Reader person = reader.getRoot<Person>();

    // Acceso directo al buffer — no hay parseo
    auto name = person.getName();     // Text::Reader apunta al buffer original
    auto email = person.getEmail();   // mismo buffer, sin copia
    kj::StringPtr nameStr = name;     // string_view-like, zero copy

    KJ_LOG(INFO, "Name:", nameStr, "Age:", person.getAge());
}
```

**Fuente oficial:** https://capnproto.org/cxx.html — Cap'n Proto C++ Serialization

### Alternativa de Implementación Específica

**FlatBuffers** para sistemas donde el consumo de memoria debe ser mínimo y el acceso aleatorio frecuente:

```cpp
// Escritura FlatBuffers
flatbuffers::FlatBufferBuilder builder(1024);
auto name = builder.CreateString("Alice García");
auto email = builder.CreateString("alice@example.com");

auto person = CreatePerson(builder, name, email, 30);
builder.Finish(person);

// Enviar builder.GetBufferPointer() por red o mmap
uint8_t *buf = builder.GetBufferPointer();
size_t size = builder.GetSize();

// Lectura — acceso directo, sin deserializar
const Person* person_fb = flatbuffers::GetRoot<Person>(buf);
std::string_view name_fb(person_fb->name()->c_str(), person_fb->name()->size());
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Mensajes de baja latencia (<1μs), datos grandes (>1MB) transmitidos frecuentemente, sistemas con mmap de archivos, columnar analytics, IoT con memoria limitada |
| **Cuándo evitar** | Serialización a humano-visible (logs, debugging), integración con APIs REST (JSON unavoidable), datos que requieren compresión fuerte (zero-copy es ineficiente en compresión), cuando el tamaño del payload es pequeño y constante |
| **Alternativas** | Protocol Buffers (serialización con parseo, buena compresión), FlatBuffers (zero-copy con random access), Avro (con schema evolutivo, row-based), MessagePack (binario compacto con overhead de parseo) |
| **Coste/Complejidad** | Medio-alto: el layout de memoria debe ser compatible entre plataformas (endianness, padding). Las actualizaciones de esquema requieren compatibilidad hacia adelante. Cap'n Proto tiene curva de aprendizaje por el modelo de arenas |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: FlatBuffers Offsets incorrectos en ARM vs x86

**¿Qué ocasionó el error?**
FlatBuffers usa Little Endian por defecto. Al leer un buffer serializado en x86 (LE) desde un ARM en modo BE (big-endian), los offsets apuntaban a direcciones incorrectas, causando segfaults al acceder a strings.

**¿Cómo se solucionó?**
Verificar que el esquema declare endianness explícito o usar el flag de conversión en FlatBuffers:

```cpp
// Forzar Little Endian en ARM que soporta LE
flatbuffers::EndianCheck();
// Para plataformas big-endian, se requiere conversión:
// flatbuffers::Verifier verifier(buf, size);
// if (!verifier.VerifyBuffer<Person>(flatbuffers::Endianness::kLittle))
//     throw std::runtime_error("Invalid buffer");
```

**¿Por qué funciona esta técnica?**
FlatBuffers verifica el endianness en tiempo de compilación con `static_assert`. La mayoría de plataformas ARM modernas operan en Little Endian por defecto (ARMv8). La verificación con `EndianCheck()` garantiza que no hay mismatch.

### Caso: Cap'n Proto arena overflow con messages anidados

**¿Qué ocasionó el error?**
Se anidaron mensajes Cap'n Proto (un mensaje como campo de otro) sin usar `initOrphanage`, causando que el arena allocator del mensaje padre tratara de gestionar la memoria del mensaje hijo, produciendo un overflow de segment.

**¿Cómo se solucionó?**
Usar `Orphanage` para transferir ownership de sub-mensajes:

```cpp
auto subMessage = message.getOrphanage().newOrphan<SubType>();
// modificar subMessage
auto builder = root.getSub();
builder.adoptSubField(subMessage);
```

**¿Por qué funciona esta técnica?**
Cap'n Proto usa un arena allocator por message. Los `Orphan` son objetos sin padre que se pueden transferir entre messages. `adopt()` mueve el orphan al arena del mensaje destino sin copiar los datos.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~175 tokens estimados al invocar este skill
- **Trigger de activación:** `zero-copy deserialization without parsing`
- **Prioridad de carga:** Media — relevante para sistemas de baja latencia y alta throughput
- **Dependencias:** `03-sistemas-distribuidos/02-grpc-protobuf` (comparación con serialización tradicional)

### Tool Integration

```json
{
  "tool_name": "zero-copy-serialization",
  "description": "Serialización sin copias con Cap'n Proto, FlatBuffers y Apache Arrow",
  "triggers": ["zero-copy", "FlatBuffers", "Cap'n Proto", "Apache Arrow", "mmap serialization"],
  "context_hint": "Inyectar ejemplos de Cap'n Proto para sistemas C++ y FlatBuffers para multiplataforma",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre serialización de baja latencia o zero-copy, carga el skill
zero-copy-serialization. Proporciona ejemplos de Cap'n Proto y FlatBuffers.
Explica cuándo preferir zero-copy vs Protocol Buffers.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Cap'n Proto: compilar schema a C++
capnp compile -oc++ schema.capnp

# FlatBuffers: compilar schema
flatc --cpp --rust schema.fbs

# Inspeccionar binario FlatBuffers
flatc --raw-binary schema.fbs -- data.bin

# Benchmarks
flatbuffers::BenchmarkMain();  // incluido en test suite
```

### GUI / Web

- **FlatBuffers Online Viewer**: https://flatbuffers.dev/flatbuffers_online_viewer.html
- **Cap'n Proto Playground**: no oficial, pero el debugger `capnp` permite inspeccionar mensajes
- **Apache Arrow Flight SQL**: interfaz de consulta SQL con transferencia columnar zero-copy

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compilar schema Cap'n Proto | `capnp compile -oc++ schema.capnp` | `CMake → add_custom_command(COMMAND capnp)` |
| Ver tamaño de mensaje | `flatc --size-prefixed schema.fbs data.bin` | `flatbuffers-analyzer data.bin` |
| Inspeccionar estructura | `capnp decode schema.capnp Person < data.bin` | `https://flatbuffers.dev/viewer` |

---

## 7. Cheatsheet Rápido

```cpp
// Cap'n Proto — 10 líneas
::capnp::MallocMessageBuilder msg;
auto root = msg.initRoot<MySchema>();
root.setField(42);
auto words = capnp::messageToFlatArray(msg);
send(words.asBytes().begin(), words.asBytes().size());

// Lectura
::capnp::FlatArrayMessageReader reader(bytes);
auto r = reader.getRoot<MySchema>();
int v = r.getField();  // zero-copy
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-sistemas-distribuidos/02-grpc-protobuf` | alternativo — serialización con parseo para RPC | Sí |
| `12-ipc-shared-memory-pipes` | complementario — transporte zero-copy sobre shared memory | Sí |
| `33-data-serialization-formats` | superconjunto — comparativa de formatos de serialización | No |
| `08-kernel-bypass-dpdk` | complementario — zero-copy en red + serialización | No |

---

## 9. Metadatos del Skill

```yaml
---
id: zero-copy-serialization
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [zero-copy, Cap'n Proto, FlatBuffers, Apache Arrow, serialization, mmap, arena-allocation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

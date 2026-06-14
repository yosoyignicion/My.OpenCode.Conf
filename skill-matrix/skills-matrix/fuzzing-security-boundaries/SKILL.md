---
name: fuzzing-security-boundaries
description: "Fuzzing envía entradas malformadas/aleatorias para encontrar crashes, hangs, o comportamiento indefinido"
---
# fuzzing-security-boundaries

## Semantic Triggers
```
fuzz testing input validation boundaries, libFuzzer and AFL coverage-guided fuzzing, API fuzzing with RESTler and schemathesis, fuzzing network protocols with Boofuzz, structured fuzzing with protobuf definitions, sanitizer-based crash detection with ASan and UBSan
```

---

## 1. Definición Teórica

Fuzzing envía entradas malformadas/aleatorias para encontrar crashes, hangs, o comportamiento indefinido. Coverage-guided (libFuzzer, AFL++) instrumenta el código para maximizar cobertura de ramas. Structured fuzzing usa definiciones de formato (protobuf, gramática) para inputs válidos-pero-inesperados. Se integra en CI mediante compilación con `-fsanitize=fuzzer`. Tres tipos principales: generational (genera desde cero), mutational (modifica inputs existentes), y evolutionary (combina ambos con feedback de cobertura).

---

## 2. Implementación de Referencia

**libFuzzer** (Clang/LLVM) para C/C++ + **schemathesis** para APIs (OpenAPI/GraphQL). libFuzzer es coverage-guided con detección automática de crashes via sanitizers. Schemathesis genera requests malformados desde la especificación OpenAPI.

### Ejemplo Práctico Avanzado

```c
// fuzz_parser.cc — libFuzzer target for network protocol parser
#include <cstdint>
#include <cstddef>
#include "network/packet.h"

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    // Limit input size to prevent OOM
    if (size < 4 || size > 4096) return 0;

    NetworkPacket pkt;
    // Parse structured input
    if (!pkt.ParseFromArray(data, size)) return 0;

    // Fuzz validation logic
    pkt.ValidateChecksum();
    pkt.VerifySequenceNumber();

    // Fuzz state machine transitions
    pkt.Process();
    return 0;
}
```

```bash
# Compile with libFuzzer + ASan + UBSan
clang++ -fsanitize=fuzzer,address,undefined \
  -g -O1 \
  fuzz_parser.cc network/packet.cc \
  -o fuzzer_parser

# Run with corpus
mkdir -p corpus
./fuzzer_parser corpus/ -max_len=1024 -runs=1000000 -jobs=4

# Minimize corpus
./fuzzer_parser corpus/ -merge=1 new_corpus/ -runs=0
```

```python
# schemathesis — API fuzzing from OpenAPI spec
import schemathesis

schema = schemathesis.from_uri("https://api.example.com/openapi.json")

@schema.parametrize()
def test_api(case):
    response = case.call()
    # Check for 5xx, timeouts, and validation errors
    assert response.status_code < 500
    assert response.elapsed.total_seconds() < 5
    # Verify response matches schema
    case.validate_response(response)
```

**Fuente oficial:** https://llvm.org/docs/LibFuzzer.html

### Alternativa de Implementación Específica

**AFL++** (American Fuzzy Lop plus plus): Más lento que libFuzzer pero mejor para targets complejos (programas completos vs funciones). Soporta fuzzing de binarios sin recompilar (con QEMU mode).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Parsers, protocolos, serialización, APIs, cualquier código que procese input externo |
| **Cuándo evitar** | Lógica de negocio sin parsing de inputs. Código genérico sin ramas complejas |
| **Alternativas** | libFuzzer (más rápido), AFL++ (más flexible), Honggfuzz (multi-threaded), OSS-Fuzz (CI/CD managed) |
| **Coste/Complejidad** | Medio. Requiere compilación con sanitizers. OSS-Fuzz escala gratuitamente para OSS |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Fuzzer pierde tiempo en inputs no válidos

**¿Qué ocasionó el error?**
El fuzzer generaba inputs aleatorios que el parser rechazaba en la primera validación, nunca alcanzando lógica profunda.

**¿Cómo se solucionó?**
Implementar un fuzzer estructurado con protobuf. Definir el schema del protocolo y usar `libfuzzer` con `FuzzedDataProvider`:

```c++
#include <fuzzer/FuzzedDataProvider.h>
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    FuzzedDataProvider provider(data, size);
    std::string type = provider.ConsumeRandomLengthString(10);
    uint32_t seq = provider.ConsumeIntegral<uint32_t>();
    // Generate valid packets from structured data
    auto packet = CreateValidPacket(type, seq);
    packet.Process();
    return 0;
}
```

**¿Por qué funciona esta técnica?**
FuzzedDataProvider transforma bytes aleatorios en tipos estructurados, generando inputs que pasan la validación inicial.

### Caso: Crashing input no reproducible

**¿Qué ocasionó el error?**
Un crash detectado por el fuzzer no se reproducía al ejecutar manualmente el mismo input (race condition / ASLR).

**¿Cómo se solucionó?**
Configurar ASLR desactivado durante debugging (`setarch `uname -m` -R ./binary < input`). Usar rr (Mozilla) para grabación y replay.

**¿Por qué funciona esta técnica?**
rr graba todas las instrucciones y permite replay determinista, esencial para bugs de concurrencia.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "fuzzing" o "fuzz testing" en la consulta del usuario
- **Prioridad de carga:** Media — crítico para sistemas que procesan input externo
- **Dependencias:** `09-cryptography-symmetric-asymmetric`, `08-static-application-security-testing-sast`

### Tool Integration

```json
{
  "tool_name": "fuzzing-security-boundaries",
  "description": "Fuzzing con libFuzzer, AFL++, schemathesis, sanitizers, y API fuzzing",
  "triggers": ["fuzzing", "libFuzzer", "AFL", "sanitizer", "crash detection", "input fuzzing"],
  "context_hint": "Inyectar junto con SAST y mutation testing para cobertura completa de testing de seguridad",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre fuzzing, carga el skill fuzzing-security-boundaries y responde
con ejemplos de libFuzzer y API fuzzing con schemathesis.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# libFuzzer
clang++ -fsanitize=fuzzer,address -g -O1 fuzz_target.cc -o fuzzer
./fuzzer corpus/ -max_len=1024 -runs=1000000

# AFL++
afl-clang-fast -fsanitize=address -o fuzz_target fuzz_target.c
afl-fuzz -i input_corpus -o findings ./fuzz_target

# OSS-Fuzz (CI)
python infra/helper.py build_fuzzers --sanitizer address my_project
python infra/helper.py check_build my_project

# API fuzzing with schemathesis
schemathesis run https://api.example.com/openapi.json --checks all --targeted

# RESTler (Microsoft)
restler.exe fuzz --grammar_file grammar.json --settings settings.json
```

### GUI / Web

- **OSS-Fuzz Dashboard:** Estadísticas de cobertura, crashes, y regresiones por proyecto
- **ClusterFuzz:** Web UI para triage de crashes, gestión de corpora, y reproducibilidad
- **CIFuzz (GitHub):** Acción de GitHub para ejecutar fuzzing en PR automáticamente

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar fuzzer | `./fuzzer corpus/ -runs=100000` | ClusterFuzz → New Task |
| Minimizar corpus | `./fuzzer corpus/ -merge=1 new_corpus/` | OSS-Fuzz → Corpus Manager |

---

## 7. Cheatsheet Rápido

```bash
# Essentials
clang++ -fsanitize=fuzzer,address -g -O1 target.cc -o fuzzer
./fuzzer corpus/ -max_len=1024 -runs=100000

# Sanitizers: -fsanitize=fuzzer,address,undefined,memory

# API fuzzing
schemathesis run https://api.example.com/openapi.json --checks all

# OSS-Fuzz
# CIFuzz for GitHub PRs
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-static-application-security-testing-sast` | Complementario — SAST encuentra lo que fuzzing puede no cubrir | Sí |
| `03-property-based-testing` | Complementario — property-based testing es fuzzing con invariantes | No |
| `09-cryptography-symmetric-asymmetric` | Dependiente — implementaciones criptográficas deben fuzzearse | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 17-fuzzing-security-boundaries
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [fuzzing, libfuzzer, afl, sanitizer, api-fuzzing, schemathesis, oss-fuzz]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

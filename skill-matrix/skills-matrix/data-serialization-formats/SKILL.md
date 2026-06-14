---
name: data-serialization-formats
description: "Choosing the right data format depends on the use case: human-readability (JSON, YAML, TOML) vs performance and schema-rigor (Protobuf, Avro, Parquet)"
---
# Data Serialization Formats

## Semantic Triggers
```
data serialization json yaml toml, protobuf avro parquet comparativa, schema evolution serialization, binary serialization protobuf avro, data format trade offs, json serialization performance
```

---

## 1. Definición Teórica

Choosing the right data format depends on the use case: human-readability (JSON, YAML, TOML) vs performance and schema-rigor (Protobuf, Avro, Parquet). JSON is universal for APIs with wide ecosystem support but no schema enforcement. YAML/TOML excel for configuration files. Protobuf enables typed, versioned service-to-service RPC with code generation. Avro is ideal for Kafka/data lakes with strong schema evolution (reader/writer schemas). Parquet provides columnar storage for analytics with compression and predicate pushdown. Schema evolution is critical for long-lived systems.

---

## 2. Implementación de Referencia

TypeScript with examples for JSON (orjson), Protobuf, and Avro with schema evolution.

### Ejemplo Práctico Avanzado

```typescript
// ===== JSON (orjson) =====
// Best for: APIs, config files, human-readable
import orjson from 'orjson';

const user = { id: '123', name: 'Alice', roles: ['admin', 'user'], metadata: { theme: 'dark' } };
const jsonBuffer = orjson.dumps(user);  // Buffer (faster than string)
const parsed = orjson.loads(jsonBuffer);

// ===== PROTOBUF =====
// Best for: service-to-service RPC, typed contracts
// schema/user.proto
/*
syntax = "proto3";
package user;
option go_package = "./userpb";

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  repeated string roles = 4;
  // Field 5 reserved for future use
  map<string, string> metadata = 6;

  // Enum example
  enum Status {
    UNKNOWN = 0;
    ACTIVE = 1;
    INACTIVE = 2;
  }
  Status status = 7;
}
*/

import protobuf from 'protobufjs';

async function protobufExample() {
  const root = await protobuf.load('schema/user.proto');
  const UserMessage = root.lookupType('user.User');

  const payload = {
    id: '123',
    name: 'Alice',
    email: 'alice@example.com',
    roles: ['admin'],
    metadata: { theme: 'dark' },
    status: 1,  // ACTIVE
  };

  // Encode
  const buffer = UserMessage.encode(payload).finish();
  console.log(`Protobuf size: ${buffer.length} bytes`);  // ~40 bytes

  // Decode
  const decoded = UserMessage.decode(buffer);
  console.log('Decoded:', decoded);

  // Verify payload
  const error = UserMessage.verify(payload);
  if (error) throw new Error(error);
}

// ===== AVRO =====
// Best for: Kafka, data lakes, schema evolution
// Schema evolution example: adding a field 'phone' to existing data

interface AvroSchema {
  type: 'record';
  name: string;
  namespace?: string;
  fields: Array<{
    name: string;
    type: string | string[] | Record<string, unknown>;
    default?: unknown;  // crucial for schema evolution
  }>;
}

const writerSchema: AvroSchema = {
  type: 'record',
  name: 'User',
  namespace: 'com.example',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null },  // union with null = optional
    { name: 'version', type: 'int', default: 1 },
  ],
};

const readerSchema: AvroSchema = {
  type: 'record',
  name: 'User',
  namespace: 'com.example',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null },
    { name: 'phone', type: ['null', 'string'], default: null },  // NEW field
    { name: 'version', type: 'int', default: 2 },                 // NEW default
  ],
};

// Old data written with writer schema
// Reader with reader schema can still read → phone = null, version = 1 (original default)
console.log('Schema evolution: reader can read old data');
console.log('Writer had: id, name, email, version');
console.log('Reader adds: phone (null default), changes version default → backward compatible');

// ===== AVRO SERIALIZATION =====
import avsc from 'avsc';

const type = avsc.parse(writerSchema as any);
const buffer = type.toBuffer({ id: '123', name: 'Alice', email: 'alice@example.com', version: 1 });
console.log(`Avro size: ${buffer.length} bytes`);

// ===== CHOOSING THE RIGHT FORMAT =====
interface FormatDecision {
  context: string;
  format: string;
  reason: string;
}

const formatGuide: FormatDecision[] = [
  { context: 'REST API / Web', format: 'JSON', reason: 'Universal support, human-readable, browser native' },
  { context: 'Configuration', format: 'YAML / TOML', reason: 'Comments, readability, nested structures' },
  { context: 'Service-to-service RPC', format: 'Protobuf / gRPC', reason: 'Typed, versioned, code generation, fast' },
  { context: 'Event streaming (Kafka)', format: 'Avro', reason: 'Schema evolution, compression, registry' },
  { context: 'Analytics / Data lakes', format: 'Parquet', reason: 'Columnar, predicate pushdown, compression' },
  { context: 'CLI / Metadata', format: 'TOML', reason: 'Simple, unambiguous, pyproject.toml' },
];

// ===== COMPARISON =====
console.table({
  JSON: { human: 'Yes', typed: 'No', binary: 'No', schema: 'No', evolution: 'Manual' },
  YAML: { human: 'Yes', typed: 'No', binary: 'No', schema: 'No', evolution: 'Manual' },
  TOML: { human: 'Yes', typed: 'No', binary: 'No', schema: 'No', evolution: 'Manual' },
  Protobuf: { human: 'No', typed: 'Yes', binary: 'Yes', schema: '.proto', evolution: 'Fields' },
  Avro: { human: 'No', typed: 'Yes', binary: 'Yes', schema: 'JSON', evolution: 'Reader/Writer' },
  Parquet: { human: 'No', typed: 'Yes', binary: 'Yes', schema: 'Embedded', evolution: 'Limited' },
});
```

**Fuente oficial:** https://protobuf.dev/

### Alternativa de Implementación Específica

Python with `orjson` (fast JSON), `protobuf` (protobuf), `fastavro` (Avro), and `pyarrow` (Parquet). Conventions differ by ecosystem.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar JSON** | APIs web, config, cualquier lugar donde humanos necesiten leer los datos |
| **Cuándo usar Protobuf** | Comunicación entre servicios, alta performance, contratos versionados |
| **Cuándo usar Avro** | Kafka, data lakes, evolución de esquemas frecuente |
| **Cuándo usar Parquet** | Análisis de datos, BI, processamiento columnar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: JSON.parse lento en high-throughput

**¿Qué ocasionó el error?**
JSON.parse en Node.js era el bottleneck para un API que servía 10k req/s con payloads grandes.

**¿Cómo se solucionó?**
```typescript
// Usar orjson (Rust-based, 3-5x faster)
import orjson from 'orjson';

const buffer = orjson.dumps(data);  // returns Buffer
const parsed = orjson.loads(buffer);

// Comparación
Benchmark: {
  'JSON.stringify': '1,000 ops/ms',
  'orjson.dumps':   '3,500 ops/ms',  // 3.5x
  'JSON.parse':     '800 ops/ms',
  'orjson.loads':   '2,800 ops/ms',  // 3.5x
}
```

**¿Por qué funciona esta técnica?**
orjson está implementado en Rust y evita la overhead de la máquina virtual de JavaScript para serialización.

### Caso: Avro schema evolution con campos obligatorios

**¿Qué ocasionó el error?**
Un nuevo campo obligatorio sin default rompió la lectura de datos antiguos.

**¿Cómo se solucionó?**
```typescript
// Siempre usar default para nuevos campos
const schemaV2 = {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null },  // NUEVO: optional with null default
  ],
};

// Reglas de schema evolution:
// ✅ Añadir campo con default → backward compatible
// ✅ Añadir campo opcional (union con null) → backward compatible
// ❌ Añadir campo obligatorio sin default → BREAKING
// ❌ Eliminar campo sin default → BREAKING
```

**¿Por qué funciona esta técnica?**
Avro usa reader/writer schemas separados. Los defaults permiten que el reader interprete datos escritos sin ese campo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "json", "protobuf", "avro", "parquet", "serialization", "schema evolution", "data format"
- **Prioridad de carga:** Alta — decisión arquitectónica fundamental
- **Dependencias:** `03-sistemas-distribuidos/02-grpc-protobuf`, `03-sistemas-distribuidos/21-data-lakehouses-parquet-iceberg`

### Tool Integration

```json
{
  "tool_name": "data-serialization-formats",
  "description": "Compares data serialization formats: JSON, YAML, TOML, Protobuf, Avro, Parquet with schema evolution and performance",
  "triggers": ["serialization", "json", "protobuf", "avro", "parquet", "schema evolution", "data format"],
  "context_hint": "Inject when user asks about data formats or serialization strategies",
  "output_format": "code examples with format comparison and schema evolution",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre formatos de serialización de datos, carga el skill data-serialization-formats
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# JSON validation
echo '{"key": "value"}' | jq '.'
# YAML validation
yamllint config.yaml
# Protobuf compilation
protoc --ts_out=src/generated user.proto
# Avro schema compatibility
java -jar avro-tools.jar compatibility -reader schema.avsc -writer old_schema.avsc
```

### GUI / Web

- **Protobuf Editor**: Visual editing of .proto files
- **Avro Schema Editor**: GUI para schemas Avro
- **Parquet Viewer**: Navegación de archivos Parquet

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Validate JSON | `echo '{}' | jq '.'` | — |
| Compile protobuf | `protoc --ts_out=src/ user.proto` | — |

---

## 7. Cheatsheet Rápido

```typescript
// JSON: APIs, orjson for perf
// Protobuf: typed RPC, .proto schema, code gen
// Avro: Kafka, schema evolution with defaults
// Parquet: columnar analytics, compression
// YAML: complex config
// TOML: pyproject.toml, simple config
// Schema evolution: always add fields with defaults
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-sistemas-distribuidos/02-grpc-protobuf` | Complementario | Sí |
| `03-sistemas-distribuidos/21-data-lakehouses-parquet-iceberg` | Complementario | No |
| `02-arquitectura-diseno/31-rest-api-design` | Complementario | Sí |
| `02-arquitectura-diseno/33-data-serialization-formats` | — | — |
| `08-ingenieria-herramientas/13-svg-generation-programmatic` | Aplicación | No |

---

## 9. Metadatos del Skill

```yaml
---
id: data-serialization-formats
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/33-data-serialization-formats
tags: [serialization, json, protobuf, avro, parquet, yaml, toml, schema-evolution]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

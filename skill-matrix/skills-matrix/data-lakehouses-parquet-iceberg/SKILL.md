---
name: data-lakehouses-parquet-iceberg
description: "A data lakehouse combines data lake flexibility (cheap object storage) with data warehouse features (ACID transactions, schema enforcement, time travel)"
---
# Data Lakehouses — Parquet & Iceberg

## Semantic Triggers
```
apache iceberg table format and snapshot isolation, parquet columnar storage and row group pruning, iceberg partitioning and hidden partitioning benefits, time travel queries in data lakehouse, delta lake vs iceberg vs hudi comparison, data lakehouse with object storage and catalog
```

---

## 1. Definición Teórica

A data lakehouse combines data lake flexibility (cheap object storage) with data warehouse features (ACID transactions, schema enforcement, time travel). It solves the problem of data staleness and governance in traditional data lakes. Key distinction over data warehouses: lakehouses use open table formats (Apache Iceberg) on object storage (S3, GCS) with engine-agnostic access (Spark, Trino, DuckDB, Flink).

---

## 2. Implementación de Referencia

**Apache Iceberg** — the leading open table format. **PyIceberg** for Python-native access. **Apache Parquet** for columnar storage. **Apache Spark** with Iceberg for batch processing. **Trino** for interactive queries. **DuckDB** for ad-hoc analytics.

### Ejemplo Práctico Avanzado

```python
from pyiceberg.catalog import load_catalog
from pyiceberg.table import Table
from pyiceberg.expressions import GreaterThanOrEqual, EqualTo
import pandas as pd

# Initialize catalog (REST catalog)
catalog = load_catalog(
    "rest",
    uri="http://catalog:8181/",
    warehouse="s3://data-lakehouse/"
)

# Create table with hidden partitioning
catalog.create_table(
    "analytics.orders",
    schema={
        "order_id": "long",
        "user_id": "long",
        "amount": "double",
        "status": "string",
        "ts": "timestamp",
        "region": "string",
    },
    partition_spec={
        "day(ts)": "month",  # hidden partition by month
        "region": "bucket(4)",  # bucketed for even distribution
    },
    properties={
        "write.target-file-size-bytes": "268435456",  # 256MB target files
        "write.parquet.compression-codec": "zstd",
        "commit.manifest.target-size-bytes": "8388608",
    },
)

# Load table and query
table: Table = catalog.load_table("analytics.orders")

# Time travel: query as of specific snapshot
snapshot = table.scan(
    snapshot_id=12345,
    row_filter=GreaterThanOrEqual("amount", 100.0),
).to_pandas()
print(f"Snapshots: {len(table.snapshots())}")

# Incremental query (e.g., for streaming)
from pyiceberg.expressions import GreaterThanOrEqual as GTE
new_data = table.scan(
    snapshot_id=table.current_snapshot().snapshot_id,
    row_filter=GTE("ts", "2026-06-01"),
).to_pandas()

# Schema evolution
table.update_schema().add_column("discount", "double").commit()

# Partition evolution (backward compatible)
table.update_spec().add_field("year(ts)").commit()
```

**Fuente oficial:** https://py.iceberg.apache.org/

### Alternativa de Implementación Específica

**Apache Hudi** — alternative table format with more write optimization (bulk insert, clustering, indexing). **Delta Lake** — Databricks-backed, integrates tightly with Spark. For simpler analytics, **ClickHouse** provides lakehouse-like performance with columnar storage directly on S3.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Large-scale analytics (>10TB), multi-engine access (Spark + Trino + DuckDB), schema evolution needs, time travel queries, cloud object storage |
| **Cuándo evitar** | Small datasets (<100GB, a database is simpler), transactional workloads (use OLTP DB), single-engine deployments (Delta Lake ties to Spark) |
| **Alternativas** | Delta Lake (Databricks ecosystem). Apache Hudi (write-heavy). ClickHouse (real-time analytics). Snowflake (managed warehouse) |
| **Coste/Complejidad** | High — catalog management, compaction jobs, vacuum procedures, manifest maintenance. Object storage cost is low; compute cost depends on engines |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Small file problem — millions of tiny Parquet files

**¿Qué ocasionó el error?**
Streaming ingestion creates millions of small Parquet files (<16MB each). Iceberg manifests grow huge. Queries struggle with metadata overhead.

**¿Cómo se solucionó?**
Run compaction jobs: rewrite small files into 256MB-1GB files. Use `rewrite_data_files` action in Iceberg. Set `write.target-file-size-bytes=268435456` for future writes.

**¿Por qué funciona esta técnica?**
Compaction merges small files into larger ones. Larger files reduce metadata overhead (fewer data files to scan) and improve compression ratio.

### Caso: Orphan files fill up storage

**¿Qué ocasionó el error?**
Iceberg snapshots keep old data files. After many operations (compaction, overwrite), orphan files (not referenced by any snapshot) accumulate, wasting storage.

**¿Cómo se solucionó?**
Run `RemoveOrphanFiles` procedure periodically. Set `write.delete.orphan-file-min-age=7d`. Use Iceberg's `expire_snapshots` action with `max_snapshot_age_seconds=604800` (7 days).

**¿Por qué funciona esta técnica?**
Orphan files are data files no longer referenced by any Iceberg snapshot. Marking them with an age threshold ensures no active data is deleted.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "data lakehouse", "iceberg", "parquet", "delta lake", "hudi", "time travel"
- **Prioridad de carga:** Media — importante para arquitecturas de datos
- **Dependencias:** `data-serialization-formats`, `message-brokers-kafka-internals`

### Tool Integration

```json
{
  "tool_name": "data-lakehouses-parquet-iceberg",
  "description": "Apache Iceberg table format, Parquet columnar storage, data lakehouse architecture with time travel and schema evolution",
  "triggers": ["data lakehouse", "iceberg", "parquet", "delta lake", "hudi", "time travel", "columnar storage"],
  "context_hint": "Load when user asks about data lakehouse, table formats, or analytical data architecture",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre data lakehouse o Iceberg, carga el skill
data-lakehouses-parquet-iceberg. Prioriza ejemplos de PyIceberg con hidden partitioning
y time travel sobre teoría de lakehouse.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# DuckDB query Iceberg table
duckdb -c "SELECT * FROM iceberg_scan('s3://bucket/orders', allow_moved_paths=true);"

# Spark SQL with Iceberg
spark-sql --packages org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.6.0

# Iceberg table metadata
SELECT * FROM orders.history;
SELECT * FROM orders.snapshots;
SELECT * FROM orders.manifests;
SELECT * FROM orders.files;

# Compaction
CALL catalog.system.rewrite_data_files(table => 'analytics.orders');
CALL catalog.system.expire_snapshots(table => 'analytics.orders', older_than => now() - 7);
```

### GUI / Web

- **Nessie Catalog UI** — Iceberg catalog browser with table lineage and snapshot history
- **Dremio** — lakehouse query explorer with Iceberg integration
- **Tabular** — managed Iceberg catalog with web UI
- **Grafana** — compaction progress, snapshot age, orphan file count dashboards

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Table info | `SELECT * FROM orders.snapshots;` | Nessie → Tables → Snapshots |
| Compaction | `CALL system.rewrite_data_files(...)` | Tabular UI → Optimize |
| Expire | `CALL system.expire_snapshots(...)` | Nessie → Maintenance |
| Query | `duckdb -c "SELECT * FROM iceberg_scan(...)"` | Dremio → Query Editor |

---

## 7. Cheatsheet Rápido

```python
# PyIceberg essentials
catalog.create_table("db.table", schema={...}, partition_spec={...})
table = catalog.load_table("db.table")
df = table.scan(row_filter=GreaterThanOrEqual("col", val)).to_pandas()

# Iceberg features:
# - Hidden partitioning: partition by transform (day(ts), bucket(id))
# - Schema evolution: add/drop/rename columns, no full rewrite
# - Time travel: scan by snapshot_id or timestamp
# - ACID: serializable isolation
# - Catalog: REST, Hive, Nessie, Glue

# Parquet:
# - Columnar storage with min/max stats at row group level
# - Compression: Zstd (best balance), Snappy (fast), Gzip (small)
# - Target file size: 256MB-1GB
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `data-serialization-formats` | complementario — Parquet vs Avro vs Protobuf | Sí |
| `message-brokers-kafka-internals` | complementario — Kafka → Iceberg streaming pipeline | No |
| `change-data-capture-cdc` | complementario — CDC into Iceberg tables | No |
| `database-sharding-partitioning` | contexto — partition strategies for data lakes | No |
| `streaming-llm-outputs-sse` | no relacionado | No |

---

## 9. Metadatos del Skill

```yaml
---
id: data-lakehouses-parquet-iceberg
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [iceberg, parquet, data-lakehouse, time-travel, schema-evolution, compaction, pyiceberg, trino]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

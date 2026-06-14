---
name: vector-db-indexing-hnsw
description: "Los índices vectoriales permiten búsqueda aproximada de vecinos más cercanos (ANN) sobre embeddings de alta dimensión, sacrificando precisión perfecta por velocidad en órdenes de magnitud"
---
# vector-db-indexing-hnsw

## Semantic Triggers
```
hnsw index, vector index, approximate nearest neighbor, ivf index, vector database indexing, index build parameters, product quantization, ef_construction, M parameter
```

---

## 1. Definición Teórica

Los índices vectoriales permiten búsqueda aproximada de vecinos más cercanos (ANN) sobre embeddings de alta dimensión, sacrificando precisión perfecta por velocidad en órdenes de magnitud. HNSW (Hierarchical Navigable Small World) construye un grafo multi-capa donde capas superiores son "autopistas" de acceso rápido y capas inferiores proporcionan precisión local. Resuelve el problema de que la búsqueda por fuerza bruta (comparar con todos los vectores) no escala a millones de documentos.

---

## 2. Implementación de Referencia

Librerías: ChromaDB (HNSW integrado), FAISS (Meta, HNSW+IVF), Pinecone (managed). Python 3.12+.

### Ejemplo Práctico Avanzado

```python
import chromadb
from sentence_transformers import SentenceTransformer

# Embedding model
encoder = SentenceTransformer("all-MiniLM-L6-v2")  # 384-dim

# Client with tuned HNSW
client = chromadb.PersistentClient(path="./vector_db")
collection = client.create_collection(
    name="documents",
    metadata={
        "hnsw:space": "cosine",
        "hnsw:M": 32,                # Connections per node (16-64)
        "hnsw:construction_ef": 200,  # Build quality (100-500)
        "hnsw:search_ef": 100,        # Search depth (50-500)
    }
)

# Batch add
documents = ["Doc about AI", "Doc about ML", "Doc about databases"]
embeddings = encoder.encode(documents).tolist()
collection.add(
    ids=[f"doc_{i}" for i in range(len(documents))],
    embeddings=embeddings,
    metadatas=[{"text": d} for d in documents],
)

# Search with tuned parameters
results = collection.query(
    query_embeddings=encoder.encode(["AI advances"]).tolist(),
    n_results=5,
    # Chroma uses metadata hnsw:search_ef for this query
)
for r in results["metadatas"][0]:
    print(r["text"])
```

**Fuente oficial:** https://docs.trychroma.com/guides

### Alternativa de Implementación Específica

FAISS con IVF+PQ para memoria limitada: `IndexIVFPQ` reduce el footprint de memoria 4-8x frente a HNSW, ideal para dispositivos edge o datasets muy grandes (>10M vectores).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | RAG, búsqueda semántica, sistemas de recomendación con millones de vectores. |
| **Cuándo evitar** | Datos pequeños (<10K vectores): el índice Flat (fuerza bruta) es más preciso y simple. |
| **Alternativas** | 1) HNSW (mejor recall/precision). 2) IVF+PQ (menor memoria). 3) Flat (precisión total, datasets pequeños). |
| **Coste/Complejidad** | Medio: HNSW requiere ajuste de M y ef_construction. IVF requiere entrenamiento. PQ introduce pérdida de precisión. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Búsqueda HNSW devuelve resultados inconsistentes (diferentes cada vez)

**¿Qué ocasionó el error?**
El índice no fue construido con semilla fija y el grafo HNSW tiene componentes aleatorios en la inserción de nodos, dando resultados deterministas solo si se fija `random_seed`.

**¿Cómo se solucionó?**
Configurar `hnsw:random_seed=42` en los metadatos de la colección ChromaDB o pasar `seed=42` en FAISS `IndexHNSWFlat`.

**¿Por qué funciona esta técnica?**
HNSW usa inserciones aleatorias para construir el grafo multi-capa. Fijar la semilla hace el proceso determinista para el mismo conjunto de datos.

### Caso: La memoria del índice HNSW excede la RAM disponible

**¿Qué ocasionó el error?**
M=64 y ef_construction=500 para 5M vectores de 768 dimensiones → ~30GB para el grafo HNSW.

**¿Cómo se solucionó?**
Reducir M a 16 (ahorra 4x en memoria), usar IVF+PQ como paso previo (reduce dimensionalidad), o particionar el índice en shards.

**¿Por qué funciona esta técnica?**
M controla el número de conexiones por nodo; cada conexión adicional cuesta memoria O(N). IVF reduce el espacio de búsqueda a clusters. PQ comprime cada vector.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "índice vectorial" "hnsw tuning" "aproximación de vecinos"
- **Prioridad de carga:** Alta — fundamental para cualquier sistema RAG
- **Dependencias:** `14-embeddings-similarity-metrics`, `20-hybrid-search-sparse-dense`

### Tool Integration

```json
{
  "tool_name": "vector-db-indexing-hnsw",
  "description": "Configuración y tuning de índices vectoriales ANN: HNSW, IVF, PQ. Parámetros M, ef_construction, nlist. ChromaDB y FAISS.",
  "triggers": ["hnsw index", "vector index", "approximate nearest neighbor", "ivf", "vector database"],
  "context_hint": "Inyectar sección 2 para ChromaDB con HNSW; sección 3 para tabla de trade-offs.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre índices vectoriales o cómo configurar HNSW/IVF, carga
vector-db-indexing-hnsw y usa la implementación ChromaDB como referencia principal.
Ajusta M=32 y ef_construction=200 como valores iniciales recomendados.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# ChromaDB CLI
chroma run --path ./vector_db --port 8000

# FAISS benchmark
python -m faiss.benchmark --index IVF4096,PQ32 --dataset sift1M

# Ver stats del índice
chroma stats --collection documents
```

### GUI / Web

- **ChromaDB Dashboard**: http://localhost:8000/docs (Swagger UI para operaciones CRUD)
- **Pinecone Console**: Dashboard de índices con métricas de latencia, query/s, y recall
- **Weaviate Console**: Visualización de vectores en 2D/3D con UMAP

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar Chroma | `chroma run --path ./db` | N/A |
| Ver colecciones | `chroma list-collections` | Dashboard "Collections" |

---

## 7. Cheatsheet Rápido

```python
# HNSW defaults: M=16, ef_construction=200, ef=50
# M ↑ = más preciso + más memoria. Doblar M = 2x RAM.
# ef_construction ↑ = mejor构建, más lento构建
# Recomendado: M=32, ef_construction=400, ef=200

# IVF: nlist=sqrt(N). IVF+PQ: m=32 subvectores, nbits=8
# Flat (brute force): solo para <10K vectores
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-embeddings-similarity-metrics` | Complementario (métricas de similitud) | Sí |
| `20-hybrid-search-sparse-dense` | Complementario (fusionar con BM25) | No |
| `08-semantic-chunking-embedding-pipelines` | Complementario (pipeline previo al indexado) | No |
| `15-retrieval-reranking-models` | Complementario (reranking post-búsqueda) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: vector-db-indexing-hnsw
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [hnsw, ivf, vector-index, ann, chromadb, faiss, product-quantization]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

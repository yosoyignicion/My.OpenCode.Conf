---
name: hybrid-search-sparse-dense
description: "Técnica que combina recuperación sparse (BM25, SPLADE) basada en coincidencia exacta de términos con recuperación dense (embeddings) basada en similitud semántica, fusionando ambos rankings mediant..."
---
# hybrid-search-sparse-dense

## Semantic Triggers
```
hybrid search, sparse dense retrieval, bm25 dense fusion, reciprocal rank fusion, hybrid vector search, keyword semantic search, sparse retrieval, bm25, splade
```

---

## 1. Definición Teórica

Técnica que combina recuperación sparse (BM25, SPLADE) basada en coincidencia exacta de términos con recuperación dense (embeddings) basada en similitud semántica, fusionando ambos rankings mediante Reciprocal Rank Fusion (RRF) o suma ponderada. Resuelve el dilema fundamental entre recall semántico (dense captura sinónimos y paráfrasis) y precisión keyword (sparse captura términos exactos como IDs, códigos, nombres propios).

---

## 2. Implementación de Referencia

Librerías: Tantivy/Whoosh para BM25, Sentence-Transformers para dense, Qdrant/Pinecone para vector search híbrido nativo. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
from typing import List
import math

class HybridSearch:
    def __init__(self):
        self.bi_encoder = SentenceTransformer("BAAI/bge-small-en-v1.5")
        self.documents: List[str] = []
        self.bm25: BM25Okapi | None = None
        self.doc_embs: np.ndarray | None = None
        self.k_rrf = 60  # RRF constant

    def index(self, documents: List[str]):
        self.documents = documents
        tokenized = [doc.split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized)
        self.doc_embs = self.bi_encoder.encode(documents, normalize_embeddings=True)

    def search(self, query: str, alpha: float = 0.5, top_k: int = 10) -> List[dict]:
        # Sparse: BM25 scores
        query_tokens = query.split()
        bm25_scores = self.bm25.get_scores(query_tokens)
        bm25_ranked = np.argsort(bm25_scores)[::-1]

        # Dense: Cosine similarity
        q_emb = self.bi_encoder.encode([query], normalize_embeddings=True)[0]
        dense_scores = np.dot(self.doc_embs, q_emb)
        dense_ranked = np.argsort(dense_scores)[::-1]

        # Reciprocal Rank Fusion
        doc_scores = {}
        for rank, doc_idx in enumerate(bm25_ranked):
            if bm25_scores[doc_idx] > 0:
                doc_scores[doc_idx] = doc_scores.get(doc_idx, 0) + 1 / (self.k_rrf + rank)

        for rank, doc_idx in enumerate(dense_ranked):
            doc_scores[doc_idx] = doc_scores.get(doc_idx, 0) + 1 / (self.k_rrf + rank)

        # Weighted sum alternative
        # Normalize scores
        bm25_norm = (bm25_scores - bm25_scores.min()) / (bm25_scores.max() - bm25_scores.min() + 1e-9)
        dense_norm = (dense_scores - dense_scores.min()) / (dense_scores.max() - dense_scores.min() + 1e-9)
        weighted = alpha * bm25_norm + (1 - alpha) * dense_norm
        weighted_ranked = np.argsort(weighted)[::-1]

        # Return RRF results (or weighted)
        results = []
        for idx in sorted(doc_scores.keys(), key=lambda x: doc_scores[x], reverse=True)[:top_k]:
            results.append({
                "doc_id": idx,
                "text": self.documents[idx][:200],
                "rrf_score": doc_scores[idx],
                "bm25_score": float(bm25_scores[idx]),
                "dense_score": float(dense_scores[idx]),
                "weighted_score": float(weighted[idx]),
            })
        return results

    def splade_search(self, query: str, top_k: int = 10) -> List[dict]:
        # SPLADE (learned sparse) alternative
        # Uses a trained model for term expansion
        from splade import SPLADE
        model = SPLADE("naver/splade-cocondenser-selfdistil")
        q_sparse = model.encode(query)
        # ... sparse dot product scoring
        pass
```

**Fuente oficial:** https://github.com/typesense/typesense (hybrid search implementation)

### Alternativa de Implementación Específica

Usar Qdrant con `prefer_quantization` y `hybrid` config para búsqueda híbrida gestionada sin código propio de fusión.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Colecciones con términos técnicos, IDs, códigos, nombres propios que la búsqueda semántica pierde. |
| **Cuándo evitar** | Texto puramente semántico (poesía, resúmenes) donde BM25 añade ruido sin beneficio. |
| **Alternativas** | 1) RRF (simple, sin normalización). 2) Weighted sum (requiere normalización). 3) SPLADE (aprendido, unifica sparse+dense). |
| **Coste/Complejidad** | Medio: mantener dos índices (BM25 + vector) duplica coste de almacenamiento. RRF es computacionalmente barato. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Hybrid search da peores resultados que solo dense

**¿Qué ocasionó el error?**
El peso de BM25 es demasiado alto (α=0.7) para un dominio donde los términos exactos no son importantes, arrastrando resultados irrelevantes con coincidencias de palabras vacías.

**¿Cómo se solucionó?**
Ajustar alpha mediante búsqueda en grid sobre un conjunto de validación: α=0.3 para dominios semánticos, α=0.7 para dominios con términos técnicos. Usar query-specific alpha si es posible.

**¿Por qué funciona esta técnica?**
Alpha controla el balance keyword vs semántico. Validación con ground truth permite encontrar el óptimo para cada dominio.

### Caso: BM25 no funciona bien con documentos en español

**¿Qué ocasionó el error?**
BM25 usa tokenización por espacios, pero el español tiene palabras con acentos, contracciones (del, al), y conjugaciones que no hacen match exacto.

**¿Cómo se solucionó?**
Usar un tokenizer con stemming para español (SnowballStemmer) antes de BM25, y normalizar caracteres (quitar acentos) tanto en query como en documentos.

**¿Por qué funciona esta técnica?**
El stemming unifica variantes morfológicas bajo la misma raíz. La normalización de acentos elimina falsos negativos por diferencias ortográficas irrelevantes.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "hybrid search" "bm25 + embeddings" "búsqueda híbrida" "rrf"
- **Prioridad de carga:** Alta — mejora significativa de calidad de RAG
- **Dependencias:** `14-embeddings-similarity-metrics`, `05-vector-db-indexing-hnsw`

### Tool Integration

```json
{
  "tool_name": "hybrid-search-sparse-dense",
  "description": "Búsqueda híbrida combinando BM25 (sparse) y embeddings (dense) con RRF o weighted sum. Ajuste de alpha, SPLADE, y tokenización multilingüe.",
  "triggers": ["hybrid search", "sparse dense", "bm25 fusion", "rrf", "keyword semantic"],
  "context_hint": "Inyectar sección 2 para HybridSearch class; sección 4 para ajuste de alpha y stemming.",
  "output_format": "markdown",
  "max_tokens": 1100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario quiera mejorar la búsqueda combinando keywords y semántica, carga
hybrid-search-sparse-dense. Usa BM25 + embeddings con RRF (k=60). Alpha=0.5
por defecto. Para español, añadir stemming Snowball y normalizar acentos.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar BM25
python -c "
from rank_bm25 import BM25Okapi
bm25 = BM25Okapi([['hello','world'], ['foo','bar']])
print(bm25.get_scores(['hello']))
"

# Qdrant hybrid search
python -c "
from qdrant_client import QdrantClient
c = QdrantClient(':memory:')
c.create_collection('test', vectors_config={}, hybrid_config={})
"
```

### GUI / Web

- **Typesense Dashboard**: Interfaz de búsqueda híbrida con sliders de peso keyword/semántico
- **Qdrant UI**: Visualización de resultados con scores sparse y dense por separado
- **Meilisearch**: Dashboard con configuración visual de búsqueda híbrida

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Probar búsqueda | `python search.py --query "..."` | Typesense "Search" |
| Ajustar alpha | N/A | Qdrant UI "Hybrid settings" |

---

## 7. Cheatsheet Rápido

```python
from rank_bm25 import BM25Okapi
# RRF: score = 1/(k + rank) por cada ranking, sumar
# k=60 (default), alpha=0.5 (balance), ajustar por dominio
# Stemming para español: from nltk.stem import SnowballStemmer
# SPLADE: modelo entrenado que unifica sparse+dense
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-embeddings-similarity-metrics` | Complementario (dense embeddings) | Sí |
| `05-vector-db-indexing-hnsw` | Complementario (vector index para dense) | Sí |
| `15-retrieval-reranking-models` | Complementario (reranking post-hybrid) | No |
| `08-semantic-chunking-embedding-pipelines` | Complementario (chunking para ambos índices) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: hybrid-search-sparse-dense
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [hybrid-search, bm25, dense-retrieval, rrf, splade, keyword-search, semantic-search]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

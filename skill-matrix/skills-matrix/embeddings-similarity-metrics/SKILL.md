---
name: embeddings-similarity-metrics
description: "Métricas para cuantificar la similitud semántica entre vectores de embeddings: coseno (ángulo), dot product (magnitud + ángulo), euclidiana (distancia geométrica)"
---
# embeddings-similarity-metrics

## Semantic Triggers
```
embedding similarity, cosine similarity, distance metric, dense embedding, embedding model comparison, cross encoder scoring, dot product, euclidean distance, mtelb
```

---

## 1. Definición Teórica

Métricas para cuantificar la similitud semántica entre vectores de embeddings: coseno (ángulo), dot product (magnitud + ángulo), euclidiana (distancia geométrica). Los bi-encoders producen embeddings precomputables para búsqueda eficiente, mientras los cross-encoders puntúan pares directamente con mayor precisión pero sin posibilidad de pre-cómputo. Resuelve el problema fundamental de cómo comparar significado semántico representado como vectores numéricos.

---

## 2. Implementación de Referencia

Librerías: Sentence-Transformers, NumPy, FAISS. Modelos: BGE, E5, Ada-002, MiniLM. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity
from typing import List
import asyncio

class SimilarityEngine:
    def __init__(self):
        self.bi_encoder = SentenceTransformer("BAAI/bge-large-en-v1.5")  # 1024-dim
        self.reranker = CrossEncoder("BAAI/bge-reranker-v2-m3")
        self.cache = {}

    def embed(self, texts: List[str]) -> np.ndarray:
        return self.bi_encoder.encode(texts, normalize_embeddings=True)

    def cosine(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def search(self, query: str, candidates: List[str], k: int = 5) -> List[dict]:
        q_emb = self.embed([query])
        c_embs = self.embed(candidates)

        # Bi-encoder: fast cosine search over all candidates
        scores = cosine_similarity(q_emb, c_embs)[0]
        top_k_idx = np.argsort(scores)[-k * 4:][::-1]  # Keep 4x for reranking

        # Cross-encoder: accurate reranking on top candidates
        pairs = [(query, candidates[i]) for i in top_k_idx]
        rerank_scores = self.reranker.predict(pairs)

        # Combine scores
        combined = []
        for idx, rerank_score in zip(top_k_idx, rerank_scores):
            combined.append({
                "text": candidates[idx],
                "cosine_score": float(scores[idx]),
                "rerank_score": float(rerank_score),
                "final_score": 0.3 * scores[idx] + 0.7 * rerank_score,
            })

        combined.sort(key=lambda x: x["final_score"], reverse=True)
        return combined[:k]

    def mteb_evaluate(self, queries: List[str], docs: List[str], relevant: dict) -> dict:
        """Simple MTEB-style evaluation"""
        results = {"ndcg@10": 0.0, "recall@5": 0.0}
        for q in queries:
            retrieved = self.search(q, docs, k=10)
            retrieved_ids = [r["text"] for r in retrieved]
            relevant_docs = relevant.get(q, [])

            # NDCG@10
            dcg = sum(1.0 / np.log2(i + 2) for i, d in enumerate(retrieved_ids)
                      if d in relevant_docs)
            idcg = sum(1.0 / np.log2(i + 2) for i in range(min(len(relevant_docs), 10)))
            results["ndcg@10"] += dcg / idcg if idcg > 0 else 0

            # Recall@5
            top5 = set(retrieved_ids[:5])
            results["recall@5"] += len(top5 & set(relevant_docs)) / len(relevant_docs)

        n = len(queries)
        return {k: v / n for k, v in results.items()}
```

**Fuente oficial:** https://www.sbert.net/

### Alternativa de Implementación Específica

Para máxima eficiencia, usar OpenAI `text-embedding-3-large` (3072-dim) con dot product. Menos control pero mejor calidad general sin infraestructura propia.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | RAG, búsqueda semántica, deduplicación, clustering, clasificación de texto. |
| **Cuándo evitar** | Búsqueda exacta por keywords (usa BM25), matching sintáctico exacto (usa hashing). |
| **Alternativas** | 1) Cosine (default para texto). 2) Dot product (OpenAI ada-002). 3) Cross-encoder para reranking (más preciso). |
| **Coste/Complejidad** | Bajo: embeddings son baratos de computar. Cross-encoders son 10-100x más caros que bi-encoders. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Cosine similarity da scores altos para textos no relacionados

**¿Qué ocasionó el error?**
Embeddings con normalización L2 fuerza todos los vectores a la misma magnitud, haciendo que textos cortos con palabras comunes tengan alta similitud coseno.

**¿Cómo se solucionó?**
Usar `normalize_embeddings=False` y filtrar por umbral de magnitud: vectores con norma <0.5 son ruido y deben ignorarse.

**¿Por qué funciona esta técnica?**
La magnitud del embedding codifica la especificidad del texto. Textos genéricos tienen vectores más cortos. Ignorarlos elimina falsos positivos.

### Caso: Cross-encoder es demasiado lento para producción

**¿Qué ocasionó el error?**
Ejecutar cross-encoder sobre todos los candidatos (top 1000) en cada consulta causa latencia >5s.

**¿Cómo se solucionó?**
Pipeline bi-encoder → cross-encoder: recuperar top 50 con bi-encoder, rerankear solo esos con cross-encoder. Además, usar modelo de cross-encoder pequeño (BGE-reranker-v2-m3 en lugar de cross-encoder-large).

**¿Por qué funciona esta técnica?**
El bi-encoder filtra el 95% de candidatos irrelevantes rápidamente. El cross-encoder solo procesa los más prometedores. Modelos más pequeños sacrifican precisión marginal por latencia.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "similitud semántica" "cosine similarity" "embeddings" "métrica de distancia"
- **Prioridad de carga:** Alta — fundamento de cualquier sistema de retrieval
- **Dependencias:** `15-retrieval-reranking-models`, `05-vector-db-indexing-hnsw`

### Tool Integration

```json
{
  "tool_name": "embeddings-similarity-metrics",
  "description": "Métricas de similitud entre embeddings: coseno, dot product, euclidiana. Bi-encoder vs cross-encoder, MTEB evaluation, y pipeline bi→cross para producción.",
  "triggers": ["embedding similarity", "cosine similarity", "distance metric", "cross encoder"],
  "context_hint": "Inyectar sección 2 para SimilarityEngine; sección 4 para falsos positivos y latencia.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte por similitud entre textos o comparación de embeddings, carga
embeddings-similarity-metrics. Usa cosine similarity como métrica por defecto.
Para producción, implementa pipeline bi-encoder → cross-encoder (rerankear top 50).
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar similitud coseno
python -c "
import numpy as np
a = np.array([1,0,0]); b = np.array([0,1,0])
print('cosine:', np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)))
"

# MTEB benchmark
python -m sentence_transformers.evaluation --model BAAI/bge-large-en-v1.5 --task STSBenchmark
```

### GUI / Web

- **MTEB Leaderboard** (huggingface.co/spaces/mteb): Comparativa de modelos de embedding por métrica y dataset
- **SBERT.net**: Demo interactiva de similitud semántica
- **Cohere Embed Playground**: Probar embeddings y similiridad

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Similitud coseno | `python -c "..."` | SBERT demo |
| Evaluar modelo | `python -m sentence_transformers.evaluation ...` | MTEB leaderboard |

---

## 7. Cheatsheet Rápido

```python
from sentence_transformers import SentenceTransformer, CrossEncoder
bi = SentenceTransformer("BAAI/bge-large-en-v1.5")
ce = CrossEncoder("BAAI/bge-reranker-v2-m3")
# Cosine: normalize_embeddings=True → dot product ≈ cosine
# Pipeline: bi-encoder top 50 → cross-encoder rerank top 5
# Magnitud: vectores con norma<0.5 son ruido
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `15-retrieval-reranking-models` | Complementario (reranking como extensión de similitud) | Sí |
| `05-vector-db-indexing-hnsw` | Complementario (índices vectoriales usan estas métricas) | Sí |
| `20-hybrid-search-sparse-dense` | Complementario (fusionar con BM25) | No |
| `08-semantic-chunking-embedding-pipelines` | Complementario (producir los embeddings) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: embeddings-similarity-metrics
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [embeddings, cosine-similarity, cross-encoder, bi-encoder, sentence-transformers, mteb]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

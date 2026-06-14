---
name: retrieval-reranking-models
description: "Pipeline de recuperación en dos etapas: un bi-encoder recupera candidatos rápidamente (top 20-100) vía similitud coseno, luego un cross-encoder más preciso pero más lento rerankea solo esos candidatos"
---
# retrieval-reranking-models

## Semantic Triggers
```
retrieval reranking, cross encoder reranker, multi stage retrieval, colbert reranking, dense passage retrieval, retrieve and rerank pipeline, colbert, monoT5, bge-reranker
```

---

## 1. Definición Teórica

Pipeline de recuperación en dos etapas: un bi-encoder recupera candidatos rápidamente (top 20-100) vía similitud coseno, luego un cross-encoder más preciso pero más lento rerankea solo esos candidatos. ColBERT usa "late interaction" descomponiendo query y documento en embeddings por token y puntuando con MaxSim, ofreciendo un punto medio entre velocidad de bi-encoder y precisión de cross-encoder. Resuelve el trade-off fundamental entre recall (bi-encoder, rápido) y precisión (cross-encoder, lento).

---

## 2. Implementación de Referencia

Modelos: BGE-Reranker-v2-m3, Cohere Rerank v3, ColBERTv2, monoT5. Librerías: Sentence-Transformers, RAGatouille (ColBERT). Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from sentence_transformers import SentenceTransformer, CrossEncoder
import numpy as np
from typing import List
import asyncio

class TwoStageRetriever:
    def __init__(self):
        self.retriever = SentenceTransformer("BAAI/bge-large-en-v1.5")
        self.reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", max_length=512)
        self.docs: List[str] = []
        self.doc_embs: np.ndarray | None = None

    def index(self, documents: List[str]):
        self.docs = documents
        self.doc_embs = self.retriever.encode(documents, normalize_embeddings=True)

    async def retrieve_and_rerank(self, query: str, k_retrieve: int = 50, k_final: int = 5) -> List[dict]:
        # Stage 1: Bi-encoder retrieval
        q_emb = self.retriever.encode([query], normalize_embeddings=True)[0]
        scores = np.dot(self.doc_embs, q_emb)
        top_k_idx = np.argsort(scores)[-k_retrieve:][::-1]

        candidates = [(self.docs[i], float(scores[i])) for i in top_k_idx]

        # Stage 2: Cross-encoder reranking
        pairs = [(query, doc) for doc, _ in candidates]
        rerank_scores = self.reranker.predict(pairs, show_progress_bar=False)

        results = []
        for (doc, bi_score), rr_score in zip(candidates, rerank_scores):
            results.append({
                "text": doc,
                "bi_encoder_score": bi_score,
                "reranker_score": float(rr_score),
                "combined": (bi_score + float(rr_score)) / 2,
            })

        results.sort(key=lambda x: x["combined"], reverse=True)
        return results[:k_final]

    async def colbert_search(self, query: str, k: int = 5) -> List[dict]:
        # Using RAGatouille for ColBERT
        from ragatouille import RAGPretrainedModel
        rag = RAGPretrainedModel.from_pretrained("colbert-ir/colbertv2.0")
        results = rag.search(query, k=k)
        return [{"text": r["content"], "score": r["score"]} for r in results]

retriever = TwoStageRetriever()
retriever.index(["Document about AI", "Document about ML", "Document about databases"])
results = await retriever.retrieve_and_rerank("Tell me about AI")
print(f"Top result: {results[0]['text']} (score: {results[0]['combined']:.3f})")
```

**Fuente oficial:** https://www.sbert.net/examples/applications/retrieve_rerank/README.html

### Alternativa de Implementación Específica

Usar Cohere Rerank API para evitar mantener infraestructura de cross-encoder. API simple, pago por uso, pero menos control sobre el modelo.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas RAG donde la precisión del ranking es crítica, datasets grandes (>100K docs), queries complejas. |
| **Cuándo evitar** | Datasets pequeños (<10K) donde bi-encoder solo ya da buen resultado; latencia estricta (<100ms). |
| **Alternativas** | 1) Cohere Rerank (API gestionada). 2) ColBERT (buen balance velocidad/precisión). 3) monoT5 (precisión máxima, latencia alta). |
| **Coste/Complejidad** | Medio: el cross-encoder añade latencia (50-200ms). La etapa de retrieve debe ser rápida para compensar. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El reranker no mejora significativamente los resultados

**¿Qué ocasionó el error?**
El bi-encoder recupera candidatos muy homogéneos (todos muy similares), y el cross-encoder no encuentra diferencias significativas entre ellos.

**¿Cómo se solucionó?**
Aumentar `k_retrieve` de 20 a 100 para incluir más diversidad de candidatos, y usar un cross-encoder más discriminativo como Cohere Rerank v3 que tiene mejor separación de scores.

**¿Por qué funciona esta técnica?**
Más candidatos aumentan la probabilidad de incluir documentos relevantes que el bi-encoder puntuó bajo. Rerankers más potentes detectan matices semánticos que bi-encoders pierden.

### Caso: Cross-encoder OOM con documentos largos

**¿Qué ocasionó el error?**
Cross-encoder con `max_length=512` recibe documentos de 2000+ tokens, truncando información crítica o causando OOM si se aumenta max_length.

**¿Cómo se solucionó?**
Dividir documentos largos en pasajes de 512 tokens, rerankear cada pasaje individualmente, y usar el score máximo del documento como score final.

**¿Por qué funciona esta técnica?**
Cross-encoders funcionan mejor con inputs cortos. El score máximo de pasaje captura la parte más relevante del documento sin exceder límites de memoria.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "reranking" "two-stage retrieval" "cross-encoder" "colbert"
- **Prioridad de carga:** Alta — clave para calidad de RAG
- **Dependencias:** `14-embeddings-similarity-metrics`, `05-vector-db-indexing-hnsw`

### Tool Integration

```json
{
  "tool_name": "retrieval-reranking-models",
  "description": "Pipeline de recuperación en dos etapas: bi-encoder para retrieval rápido + cross-encoder o ColBERT para reranking preciso. Cohere, BGE, ColBERTv2.",
  "triggers": ["retrieval reranking", "cross encoder", "multi stage retrieval", "colbert", "retrieve and rerank"],
  "context_hint": "Inyectar sección 2 para TwoStageRetriever; sección 4 para OOM y mejora de resultados.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pida mejorar la precisión de RAG o implementar reranking, carga
retrieval-reranking-models. Pipeline: bi-encoder top 50 → cross-encoder rerank top 5.
Para documentos largos, dividir en pasajes de 512 tokens.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Evaluar pipeline
python -c "
from sentence_transformers import CrossEncoder
ce = CrossEncoder('BAAI/bge-reranker-v2-m3')
print(ce.predict([('query', 'doc')]))
"

# Cohere Rerank API
curl https://api.cohere.ai/v1/rerank \
  -H "Authorization: Bearer $COHERE_API_KEY" \
  -d '{"model":"rerank-v3.5","query":"AI","documents":["doc1","doc2"],"top_n":3}'
```

### GUI / Web

- **Cohere Dashboard**: Playground de reranking con comparativa de modelos
- **RAGatouille Demo**: ColBERT interactive search en HuggingFace Spaces
- **LangSmith**: Trazas de pipeline retrieve+rerank con scores por etapa

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Test reranker | `python -c "CrossEncoder(...).predict(...)"` | Cohere Playground |
| Evaluar pipeline | `python eval_retriever.py` | N/A |

---

## 7. Cheatsheet Rápido

```python
from sentence_transformers import CrossEncoder
# Stage 1: bi-encoder top 50 (rápido, alta recall)
# Stage 2: cross-encoder rerank top 5 (preciso, lento)
# Modelos: BGE-reranker-v2-m3, Cohere Rerank v3
# Docs largos: dividir en pasajes 512t, score = max(pasajes)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-embeddings-similarity-metrics` | Complementario (bi-encoder usa cosine) | Sí |
| `05-vector-db-indexing-hnsw` | Complementario (stage 1 sobre índice vectorial) | Sí |
| `20-hybrid-search-sparse-dense` | Complementario (fusionar BM25 + dense antes de rerank) | No |
| `08-semantic-chunking-embedding-pipelines` | Complementario (chunking para pasajes) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: retrieval-reranking-models
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [reranking, cross-encoder, colbert, two-stage-retrieval, bge-reranker, monoT5, cohere]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

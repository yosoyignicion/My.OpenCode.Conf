---
name: semantic-chunking-embedding-pipelines
description: "Pipeline de procesamiento de documentos que divide textos largos en fragmentos (chunks) óptimos para embedding y recuperación, aplicando estrategias que preservan la coherencia semántica (por límit..."
---
# semantic-chunking-embedding-pipelines

## Semantic Triggers
```
semantic chunking, document chunking strategy, embedding pipeline, chunk overlap, embedding batch processing, chunk size tuning, recursive chunking, fixed-size chunking
```

---

## 1. Definición Teórica

Pipeline de procesamiento de documentos que divide textos largos en fragmentos (chunks) óptimos para embedding y recuperación, aplicando estrategias que preservan la coherencia semántica (por límites de párrafo, oración, o encabezado) con solapamiento controlado (10-20%). Resuelve el problema de que los modelos de embedding tienen límites de tokens (512-8192) y que chunks mal cortados rompen el significado semántico, degradando la recuperación.

---

## 2. Implementación de Referencia

Librerías: LangChain `RecursiveCharacterTextSplitter`, `SemanticChunker` (experimental), Unstructured.io. Python 3.12+.

### Ejemplo Práctico Avanzado

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from sentence_transformers import SentenceTransformer
import hashlib

class EmbeddingPipeline:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.encoder = SentenceTransformer(model_name)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=64,
            separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "],
            length_function=len,
        )

    def chunk_document(self, text: str, strategy: str = "recursive") -> list[dict]:
        if strategy == "semantic":
            splitter = SemanticChunker(
                OpenAIEmbeddings(),
                breakpoint_threshold_type="percentile"
            )
            chunks = splitter.split_text(text)
        else:
            chunks = self.splitter.split_text(text)

        return [
            {
                "id": hashlib.md5(chunk.encode()).hexdigest()[:12],
                "text": chunk,
                "tokens": len(chunk.split()),
                "metadata": {"strategy": strategy}
            }
            for chunk in chunks
        ]

    def embed_batch(self, chunks: list[dict], batch_size: int = 32) -> list[dict]:
        texts = [c["text"] for c in chunks]
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            emb = self.encoder.encode(batch, show_progress_bar=False)
            embeddings.extend(emb.tolist())

        for i, chunk in enumerate(chunks):
            chunk["embedding"] = embeddings[i]
        return chunks

    def validate_chunks(self, chunks: list[dict]) -> list[str]:
        issues = []
        for i, c in enumerate(chunks):
            # Check for truncated content
            if c["text"].rstrip()[-1] not in ".!?\n":
                issues.append(f"Chunk {i}: ends mid-sentence")
            # Check token count
            if c["tokens"] < 10:
                issues.append(f"Chunk {i}: too short ({c['tokens']} tokens)")
        return issues

pipeline = EmbeddingPipeline()
chunks = pipeline.chunk_document(long_text, strategy="recursive")
chunks = pipeline.embed_batch(chunks, batch_size=16)
print(pipeline.validate_chunks(chunks))
```

**Fuente oficial:** https://python.langchain.com/docs/how_to/recursive_text_splitter/

### Alternativa de Implementación Específica

Usar `spacy` + `nltk` para chunking por oración con detección de límites semánticos (cambio de tema, conectores discursivos). Más control pero más código.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier sistema RAG, ingestión de documentos, o base de conocimiento vectorial. |
| **Cuándo evitar** | Textos muy cortos (<512 tokens totales) que no necesitan división. |
| **Alternativas** | 1) Recursivo (mejor para markdown/código). 2) Semántico (mejor para prosa narrativa). 3) Token-based (simple, rápido). |
| **Coste/Complejidad** | Bajo: el chunking es computacionalmente barato. La decisión de estrategia requiere experimentación. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Los chunks pierden contexto entre fragmentos (respuestas incompletas)

**¿Qué ocasionó el error?**
Chunking por tokens sin solapamiento: una idea que cruza el límite del chunk se parte por la mitad, perdiendo coherencia.

**¿Cómo se solucionó?**
Añadir `chunk_overlap=64` (12.5% de 512) y usar separadores por orden de prioridad que respeten fronteras naturales (primer intento con `\n\n`, luego `\n`, luego `.`).

**¿Por qué funciona esta técnica?**
El solapamiento garantiza que el contexto del límite se preserve en ambos chunks. Los separadores jerárquicos evitan cortar en medio de palabras o frases.

### Caso: Embeddings de chunks grandes (>1024 tokens) son menos precisos

**¿Qué ocasionó el error?**
Los modelos de embedding (especialmente los más pequeños como MiniLM) tienen contexto efectivo máximo ~256-384 tokens. Chunks más grandes diluyen el significado.

**¿Cómo se solucionó?**
Reducir `chunk_size` a 256-384 tokens para modelos de embedding pequeños, y usar `max_seq_length` del modelo como referencia. Alternativamente, usar modelos con soporte de contexto largo (gte-large, 8192 tokens).

**¿Por qué funciona esta técnica?**
Los embeddings representan el significado del texto completo; si el chunk excede el contexto efectivo, el embedding promedia señales perdiendo precisión semántica.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "chunking" "dividir documentos" "embeddings pipeline"
- **Prioridad de carga:** Alta — prerequisito de cualquier sistema RAG
- **Dependencias:** `14-embeddings-similarity-metrics`, `05-vector-db-indexing-hnsw`

### Tool Integration

```json
{
  "tool_name": "semantic-chunking-embedding-pipelines",
  "description": "Pipeline de chunking semántico y embedding de documentos: estrategias recursiva/semántica/fija, batch embedding, validación de chunks.",
  "triggers": ["semantic chunking", "document chunking", "embedding pipeline", "chunk size"],
  "context_hint": "Inyectar sección 2 para la clase EmbeddingPipeline; sección 4 para troubleshooting.",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte cómo dividir documentos para RAG o embeddings, carga
semantic-chunking-embedding-pipelines y usa RecursiveCharacterTextSplitter con
chunk_size=512, overlap=64 como configuración inicial. Para prosa, sugiere SemanticChunker.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar chunking con LangChain CLI
python -c "
from langchain.text_splitter import RecursiveCharacterTextSplitter
s = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)
print(len(s.split_text(open('doc.md').read())))
"

# Visualizar chunks con spacy
python -c "
import spacy; nlp = spacy.load('en_core_web_sm')
doc = nlp(open('doc.md').read())
sentences = [sent.text for sent in doc.sents]
print(f'{len(sentences)} oraciones')
"
```

### GUI / Web

- **LangSmith**: Visualización de chunks con metadatos (fuente, posición, overlap)
- **Unstructured.io Studio**: Interfaz web para probar estrategias de chunking visualmente
- **ChromaDB Dashboard**: Ver chunks almacenados con sus embeddings

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Chunkear archivo | `python chunk.py doc.md` | N/A |
| Validar chunks | `python -c "..."` | N/A |

---

## 7. Cheatsheet Rápido

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
# Recursivo: ["\n## ", "\n\n", "\n", ". ", " "] ordenado por prioridad
# Chunk size: 512 (general), 256 (modelos pequeños), 1024 (modelos grandes)
# Overlap: 10-20% de chunk_size
# Semántico: usar cuando el tema cambia por párrafo
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-embeddings-similarity-metrics` | Complementario (métricas de similitud para validación) | Sí |
| `05-vector-db-indexing-hnsw` | Complementario (destino de los embeddings) | Sí |
| `20-hybrid-search-sparse-dense` | Complementario (BM25 sobre chunks) | No |
| `15-retrieval-reranking-models` | Complementario (reranking sobre chunks recuperados) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: semantic-chunking-embedding-pipelines
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [chunking, embedding-pipeline, langchain, recursive-splitter, semantic-chunker, document-processing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: advanced-graph-rag
description: "Graph RAG extiende la generación aumentada por recuperación (RAG) usando grafos de conocimiento como estructura de contexto intermedia"
---
# advanced-graph-rag

## Semantic Triggers
```
graph rag, knowledge graph retrieval, graph-based rag, graphrag, graph augmented generation, multi-hop retrieval, entity resolution, community detection, graph pruning
```

---

## 1. Definición Teórica

Graph RAG extiende la generación aumentada por recuperación (RAG) usando grafos de conocimiento como estructura de contexto intermedia. Extrae entidades y relaciones de documentos en un grafo, luego navega multi-saltos para recuperar evidencia conectada que los vectores densos por sí solos perderían. Resuelve la limitación de RAG tradicional donde las relaciones semánticas implícitas entre documentos separados no son capturadas por similitud coseno.

---

## 2. Implementación de Referencia

Framework recomendado: LangChain + Neo4j + OpenAI. Python 3.12+. GraphRAG de Microsoft como pipeline completo.

### Ejemplo Práctico Avanzado

```python
from langchain_community.graphs import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", temperature=0)
graph = Neo4jGraph(url="bolt://localhost:7687", username="neo4j", password="password")

transformer = LLMGraphTransformer(
    llm=llm,
    allowed_nodes=["Person", "Organization", "Technology", "Document"],
    allowed_relationships=["WORKS_AT", "DEVELOPS", "CITES", "MENTIONS"]
)

documents = [Document(page_content="OpenAI develops GPT-4, used by many companies.")]
graph_docs = transformer.convert_to_graph_documents(documents)
graph.add_graph_documents(graph_docs, baseEntityLabel=True)

# Multi-hop retrieval
query = "What technology does OpenAI develop?"
results = graph.query("""
    MATCH (o:Organization {name:'OpenAI'})-[r:DEVELOPS]->(t:Technology)
    OPTIONAL MATCH (t)<-[:MENTIONS]-(d:Document)
    RETURN t.name AS tech, collect(d.page_content) AS evidence
""")
context = "\n".join([r["tech"] + ": " + str(r["evidence"]) for r in results])
response = llm.invoke(f"Context: {context}\nQuestion: {query}")
```

**Fuente oficial:** https://github.com/microsoft/graphrag

### Alternativa de Implementación Específica

Usar NetworkX local (sin Neo4j) para grafos pequeños (<10K nodos). Ligero, sin dependencia de base de datos, pero sin persistencia ni consultas Cypher complejas.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Datos con relaciones ricas entre entidades (investigación, legal, documentación técnica multi-fuente). |
| **Cuándo evitar** | Documentos independientes sin relaciones entre sí; RAG vectorial es más simple y eficaz. |
| **Alternativas** | 1) RAG vectorial puro (simple, rápido). 2) RAG jerárquico (resúmenes por sección). 3) Graph RAG completo (Microsoft GraphRAG). |
| **Coste/Complejidad** | Alto: extracción de grafos con LLM es lenta y costosa. Mantener consistencia del grafo requiere actualizaciones cuidadosas. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Graph RAG alucina relaciones inexistentes

**¿Qué ocasionó el error?**
El LLM transformer crea relaciones falsas entre entidades porque el prompt de extracción no especifica "solo relaciones explícitamente mencionadas en el texto".

**¿Cómo se solucionó?**
Añadir `strict_mode=True` y limitar `allowed_relationships` a tipos verificables. Post-filtrar con umbral de confianza >0.7.

**¿Por qué funciona esta técnica?**
Restringir el espacio de relaciones posibles y exigir evidencia textual directa reduce las alucinaciones de relación.

### Caso: El grafo crece demasiado y las consultas Cypher son lentas

**¿Qué ocasionó el error?**
Graph RAG sin poda: cada documento añade nodos y relaciones, creando un grafo denso donde las consultas multi-saltos degeneran en barridos completos.

**¿Cómo se solucionó?**
Implementar poda por relevancia: después de recuperar candidatos, usar PageRank local para mantener solo los top-N nodos más conectados al query.

**¿Por qué funciona esta técnica?**
La poda reduce el espacio de búsqueda exponencialmente. PageRank local prioriza nodos centrales relevantes sobre ruido periférico.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1400 tokens estimados al invocar este skill
- **Trigger de activación:** "graph rag" "recuperación con grafos" "knowledge graph retrieval"
- **Prioridad de carga:** Alta — crítica para sistemas RAG sobre datos relacionales
- **Dependencias:** `19-knowledge-graphs-neo4j`, `20-hybrid-search-sparse-dense`, `05-vector-db-indexing-hnsw`

### Tool Integration

```json
{
  "tool_name": "advanced-graph-rag",
  "description": "Implementación de Graph RAG con Neo4j, LangChain, y extracción de relaciones por LLM. Cubre construcción de grafos, consultas Cypher multi-salto, y poda por relevancia.",
  "triggers": ["graph rag", "knowledge graph retrieval", "graph-based rag", "multi-hop retrieval"],
  "context_hint": "Inyectar sección 2 para implementación con Neo4j+LangChain; sección 4 para solución de problemas comunes.",
  "output_format": "markdown",
  "max_tokens": 1400
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Graph RAG o recuperación con grafos de conocimiento, carga el skill
advanced-graph-rag y usa la implementación con Neo4j + LLMGraphTransformer. Para datasets pequeños,
sugiere NetworkX como alternativa.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Iniciar Neo4j local
docker run --name neo4j -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/password neo4j:5

# Cypher shell
cypher-shell -u neo4j -p password "MATCH (n) RETURN n LIMIT 10"
```

### GUI / Web

- **Neo4j Browser** (http://localhost:7474): Editor Cypher interactivo con visualización de grafos
- **Neo4j Bloom**: Visualización tipo pizarra para exploración no técnica
- **GraphRAG Studio**: Dashboard de Microsoft para visualizar comunidades y resúmenes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar Cypher | `cypher-shell -u neo4j "QUERY"` | `Ctrl+Enter` (Neo4j Browser) |
| Visualizar grafo | N/A | `$nx` (Neo4j Browser prefix) |

---

## 7. Cheatsheet Rápido

```python
from langchain_community.graphs import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer

g = Neo4jGraph("bolt://localhost:7687", "neo4j", "password")
t = LLMGraphTransformer(llm, allowed_nodes=["Person","Org"])
docs = t.convert_to_graph_documents([Document(page_content="Text...")])
g.add_graph_documents(docs)
result = g.query("MATCH (n)-[r]-(m) RETURN n.name, type(r), m.name LIMIT 20")
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `19-knowledge-graphs-neo4j` | Dependiente (Neo4j como motor de grafo) | Sí |
| `20-hybrid-search-sparse-dense` | Complementario (fusionar BM25 + vector + grafo) | Sí |
| `05-vector-db-indexing-hnsw` | Complementario (embeddings en nodos del grafo) | No |
| `15-retrieval-reranking-models` | Complementario (reranking sobre resultados de grafo) | No |
| `08-semantic-chunking-embedding-pipelines` | Complementario (chunking previo a extracción) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: advanced-graph-rag
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [graph-rag, knowledge-graph, neo4j, multi-hop, entity-resolution, langchain]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

---
name: knowledge-graphs-neo4j
description: "Base de datos orientada a grafos (Neo4j) que almacena entidades como nodos y sus relaciones como aristas, consultables mediante Cypher (lenguaje de consulta por patrones)"
---
# knowledge-graphs-neo4j

## Semantic Triggers
```
neo4j knowledge graph, graph database rag, cypher query, entity relationship graph, graph extraction llm, knowledge graph construction, graph embeddings, community detection
```

---

## 1. Definición Teórica

Base de datos orientada a grafos (Neo4j) que almacena entidades como nodos y sus relaciones como aristas, consultables mediante Cypher (lenguaje de consulta por patrones). Combinado con LLMs para extracción automática de entidades y relaciones desde texto no estructurado, permite RAG sobre estructura relacional donde las conexiones importan tanto como el contenido. Resuelve la limitación de bases vectoriales que no capturan relaciones explícitas entre entidades.

---

## 2. Implementación de Referencia

Neo4j 5.x (Community/Enterprise), Cypher, LangChain `LLMGraphTransformer`. Python 3.12+ con `neo4j` driver.

### Ejemplo Práctico Avanzado

```python
from neo4j import AsyncGraphDatabase
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
import asyncio

class KnowledgeGraphBuilder:
    def __init__(self, uri: str = "bolt://localhost:7687", user: str = "neo4j", password: str = "password"):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
        self.transformer = LLMGraphTransformer(
            llm=self.llm,
            allowed_nodes=["Person", "Organization", "Product", "Technology", "Location"],
            allowed_relationships=[
                "WORKS_AT", "DEVELOPS", "USES", "INVESTS_IN", "COMPETES_WITH",
                "ACQUIRED", "PARTNERS_WITH", "HEADQUARTERED_IN"
            ],
            node_properties=True,  # Include text properties in nodes
        )

    async def ingest_document(self, text: str, source: str = "web"):
        doc = Document(page_content=text, metadata={"source": source})
        graph_docs = self.transformer.convert_to_graph_documents([doc])

        async with self.driver.session() as session:
            for gd in graph_docs:
                # Create nodes
                for node in gd.nodes:
                    await session.run(
                        "MERGE (n:{label} {{id: $id}}) SET n += $props, n.source = $source"
                        .format(label=node.type),
                        id=node.id, props=node.properties, source=source
                    )
                # Create relationships
                for rel in gd.relationships:
                    await session.run(
                        f"MATCH (a {{id: $src_id}}), (b {{id: $tgt_id}}) "
                        f"MERGE (a)-[r:{rel.type}]->(b) "
                        f"SET r += $props",
                        src_id=rel.source_node.id, tgt_id=rel.target_node.id,
                        props=rel.properties
                    )

    async def query(self, cypher: str, params: dict = None) -> list[dict]:
        async with self.driver.session() as session:
            result = await session.run(cypher, params or {})
            return [dict(r) async for r in result]

    async def graph_rag(self, entity: str, depth: int = 2) -> str:
        # Multi-hop traversal
        cypher = """
            MATCH path = (n)-[*1..{depth}]-(m)
            WHERE n.name CONTAINS $entity
            RETURN m.name AS related, type(r) AS relation
            LIMIT 50
        """.format(depth=depth)
        results = await self.query(cypher, {"entity": entity})
        context = "\n".join(f"{r['related']} ({r['relation']})" for r in results)
        return await self.llm.ainvoke(
            f"Graph context:\n{context}\nQuestion about {entity}:"
        )

builder = KnowledgeGraphBuilder()
await builder.ingest_document("OpenAI develops GPT-4 in San Francisco. Microsoft invested $13B.")
results = await builder.query(
    "MATCH (o:Organization {name:'OpenAI'})-[r]-(m) RETURN m.name, type(r) LIMIT 10"
)
```

**Fuente oficial:** https://neo4j.com/docs/python-manual/current/

### Alternativa de Implementación Específica

Usar `Neo4j GraphRAG Python` (paquete oficial) para pipeline completo de Graph RAG con retrievers pre-construidos y prompts optimizados.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Datos con relaciones ricas entre entidades (org charts, knowledge bases, redes de investigación, e-commerce). |
| **Cuándo evitar** | Datos puramente documentales sin relaciones entre sí; RAG vectorial es más simple y eficaz. |
| **Alternativas** | 1) Neo4j (maduro, Cypher, ecosistema). 2) NetworkX (local, sin persistencia). 3) Amazon Neptune (cloud, Gremlin/SPARQL). |
| **Coste/Complejidad** | Alto: requiere infraestructura de base de datos. La extracción con LLM consume tokens significativos. Cypher tiene curva de aprendizaje. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Las consultas Cypher degeneran en barridos completos de nodos

**¿Qué ocasionó el error?**
Falta de índices en propiedades usadas en cláusulas WHERE. `MATCH (n:Person) WHERE n.name = "X"` sin índice escanea todos los nodos Person.

**¿Cómo se solucionó?**
Crear índices sobre propiedades frecuentemente consultadas: `CREATE INDEX entity_name IF NOT EXISTS FOR (n:Entity) ON (n.name)`. Usar `EXPLAIN` antes de la consulta para ver el plan de ejecución.

**¿Por qué funciona esta técnica?**
Los índices Cypher permiten búsqueda directa por propiedad, reduciendo la complejidad de O(N) a O(log N). `EXPLAIN` revela si el plan usa índices o barre nodos.

### Caso: El LLM extrae relaciones duplicadas entre los mismos nodos

**¿Qué ocasionó el error?**
Múltiples ingestiones del mismo documento crean aristas duplicadas entre los mismos pares de nodos, causando resultados inflados en conteos.

**¿Cómo se solucionó?**
Usar `MERGE` en lugar de `CREATE` para relaciones, y añadir una propiedad `source_id` única para deduplicación. Desduplicar periódicamente con Cypher: `MATCH (a)-[r]-(b) WITH a,b,collect(r) AS rels WHERE size(rels)>1 CALL {WITH rels FOREACH (r IN tail(rels) DELETE r)}`.

**¿Por qué funciona esta técnica?**
MERGE crea la relación solo si no existe. La deduplicación periódica limpia duplicados de ingestiones anteriores sin MERGE.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimados al invocar este skill
- **Trigger de activación:** "neo4j" "graph database" "knowledge graph" "cypher query"
- **Prioridad de carga:** Media — skill especializado para datos relacionales
- **Dependencias:** `02-advanced-graph-rag`, `14-embeddings-similarity-metrics`

### Tool Integration

```json
{
  "tool_name": "knowledge-graphs-neo4j",
  "description": "Construcción y consulta de grafos de conocimiento con Neo4j + LLM. Extracción de entidades, relaciones, Cypher, Graph RAG multi-salto, y desduplicación.",
  "triggers": ["neo4j", "knowledge graph", "cypher", "graph database", "entity extraction"],
  "context_hint": "Inyectar sección 2 para KnowledgeGraphBuilder; sección 4 para índices y duplicados.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario necesite construir un grafo de conocimiento o consultar Neo4j, carga
knowledge-graphs-neo4j. Usa LLMGraphTransformer para extracción y MERGE para
evitar duplicados. Crea índices en propiedades usadas en WHERE.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Iniciar Neo4j Docker
docker run --name neo4j -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/password neo4j:5

# Cypher shell
cypher-shell -u neo4j -p password "CREATE (n:Test {name:'hello'}) RETURN n"

# Crear índice
cypher-shell -u neo4j -p password "CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.name)"
```

### GUI / Web

- **Neo4j Browser** (http://localhost:7474): Editor Cypher interactivo con visualización de grafos en canvas
- **Neo4j Bloom**: Exploración visual tipo pizarra para usuarios no técnicos
- **Neo4j Data Importer**: UI web para importar datos CSV/JSON como grafos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar Cypher | `cypher-shell -u neo4j "QUERY"` | `Ctrl+Enter` (Neo4j Browser) |
| Visualizar nodos | N/A | `$nx MATCH (n) RETURN n LIMIT 50` |

---

## 7. Cheatsheet Rápido

```cypher
// Crear nodo: MERGE (n:Label {id: $id}) SET n.prop = $val
// Crear relación: MATCH (a), (b) MERGE (a)-[r:TYPE]->(b)
// Índice: CREATE INDEX IF NOT EXISTS FOR (n:Label) ON (n.prop)
// Multi-hop: MATCH path = (n)-[*1..3]-(m) WHERE n.name = $e
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-advanced-graph-rag` | Superconjunto (Graph RAG usa Neo4j) | Sí |
| `14-embeddings-similarity-metrics` | Complementario (embeddings en nodos) | No |
| `05-vector-db-indexing-hnsw` | Complementario (vector index en propiedades) | No |
| `20-hybrid-search-sparse-dense` | Complementario (fusionar grafo + vector) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: knowledge-graphs-neo4j
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [neo4j, knowledge-graph, cypher, graph-database, llm-graph-transformer, graph-rag]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

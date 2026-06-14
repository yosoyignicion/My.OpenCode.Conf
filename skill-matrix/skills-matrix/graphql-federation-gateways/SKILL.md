---
name: graphql-federation-gateways
description: "GraphQL Federation composes multiple subgraphs into a single federated graph"
---
# GraphQL Federation & Gateways

## Semantic Triggers
```
graphql federation with apollo router and rover, graphql subgraph composition and @key directive, graphql entity resolution _entities and reference resolver, graphql gateway performance query planning and cost, federated graphql schema stitching vs federation, graphql gateway caching and persisted queries
```

---

## 1. Definición Teórica

GraphQL Federation composes multiple subgraphs into a single federated graph. Each subgraph owns its types and fields. It solves the problem of distributing GraphQL schema ownership across teams while providing a unified endpoint. Key distinction over schema stitching: Federation uses `@key` directives to define entity references across subgraphs, with a supergraph schema (composed by Rover) and a gateway (Apollo Router) that plans queries across subgraphs via the `_entities` endpoint.

---

## 2. Implementación de Referencia

**Apollo Router** (Rust) — the production gateway for federated graphs. **Rover CLI** for supergraph composition. **Apollo Server** (Node.js) or **GraphQL Yoga** (Node.js) for subgraph implementation. **Apollo Federation 2** with `@key`, `@external`, `@provides`, `@requires` directives.

### Ejemplo Práctico Avanzado

```graphql
# Subgraph A (users) — owns User type
type Query {
  user(id: ID!): User
  users: [User!]!
}

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
  role: String!
}

# Subgraph B (reviews) — extends User with review data
type User @key(fields: "id") @extends {
  id: ID! @external
  reviews: [Review!]!
}

type Review @key(fields: "id") {
  id: ID!
  rating: Int!
  content: String!
  productId: ID!
}

type Query {
  reviews(productId: ID!): [Review!]!
}

# Subgraph C (products) — owns Product, extends Review
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

type Review @key(fields: "id") @extends {
  id: ID! @external
  product: Product! @requires(fields: "productId")
}
```

```typescript
// Apollo Server subgraph (reviews service)
import { buildSubgraphSchema } from "@apollo/subgraph"
import { parse } from "graphql"

const resolvers = {
  User: {
    __resolveReference(ref: { id: string }) {
      return { __typename: "User", id: ref.id }
    },
    reviews(parent: { id: string }) {
      return prisma.review.findMany({ where: { userId: parent.id } })
    },
  },
  Review: {
    __resolveReference(ref: { id: string }) {
      return prisma.review.findUnique({ where: { id: ref.id } })
    },
    product(review: { productId: string }) {
      return { __typename: "Product", id: review.productId }
    },
  },
}

const schema = buildSubgraphSchema([{ typeDefs: parse(typeDefs), resolvers }])
```

**Fuente oficial:** https://www.apollographql.com/docs/federation/

### Alternativa de Implementación Específica

**GraphQL Yoga** with **Hive Gateway** provides a simpler Federation 2 implementation with built-in rate limiting, caching, and persisted queries. **WunderGraph** uses Federation-like composition with a code-first approach and TypeScript-native typing.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Multiple teams owning separate GraphQL schemas, needing a unified API gateway, polyglot microservices with GraphQL |
| **Cuándo evitar** | Single team, single service — use standalone GraphQL. Simple REST-to-GraphQL bridging (use Apollo Server with REST datasources) |
| **Alternativas** | Schema stitching (simpler but less powerful). Monolithic GraphQL schema. REST + BFF pattern. WunderGraph (code-first) |
| **Coste/Complejidad** | High — Apollo Router deployment, subgraph compatibility management, query planning cost, supergraph CI pipeline. Benefits emerge at 3+ subgraphs |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: N+1 problem across subgraphs

**¿Qué ocasionó el error?**
A query fetches `users { reviews { rating } }`. The gateway resolves `User.reviews` by calling the reviews subgraph once per user. With 100 users, that's 100 subgraph calls.

**¿Cómo se solucionó?**
Use DataLoader per subgraph request context. The gateway can batch `_entities` calls — Apollo Router automatically batches entity resolution for fields with the same type.

**¿Por qué funciona esta técnica?**
The `_entities` endpoint accepts an array of references `{ __typename, id }[]`. DataLoader coalesces individual resolves into a single batch call to the subgraph.

### Caso: Query planning timeout on complex queries

**¿Qué ocasionó el error?**
A deeply nested query with multiple `@provides` and `@requires` fields causes the Apollo Router's query planner to exceed the 10ms planning budget. The query fails with a timeout.

**¿Cómo se solucionó?**
Set query depth limits (max 5 levels) and cost analysis (1000 points max). Use `@requires` sparingly — prefer denormalizing fields via `@provides` for commonly co-requested fields.

**¿Por qué funciona esta técnica?**
Query planning is NP-hard in general. Limiting query complexity bounds the planning space. `@provides` pre-fetches fields in the initial subgraph call, reducing cross-subgraph resolution.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1050 tokens estimados al invocar este skill
- **Trigger de activación:** "graphql federation", "apollo federation", "supergraph", "subgraph", "@key directive"
- **Prioridad de carga:** Media — especializado en federación GraphQL
- **Dependencias:** `api-gateway-bff-patterns`, `rest-api-design`

### Tool Integration

```json
{
  "tool_name": "graphql-federation-gateways",
  "description": "GraphQL Federation 2 with Apollo Router, subgraph composition, entity resolution, and supergraph architecture",
  "triggers": ["graphql federation", "apollo federation", "supergraph", "subgraph", "@key", "entity resolution"],
  "context_hint": "Load when user asks about federated GraphQL, multi-team schema management, or GraphQL gateway architecture",
  "output_format": "markdown",
  "max_tokens": 1050
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre GraphQL Federation o Apollo Federation, carga el skill
graphql-federation-gateways. Prioriza ejemplos de subgraph composition con @key y
entity resolution sobre teoría de gateway.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Rover CLI: compose supergraph
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

# Rover: subgraph introspection
rover subgraph introspect http://users:4000/graphql > users.graphql

# Supergraph check (breaking change detection)
rover supergraph check --graph mygraph --schema supergraph.graphql

# Dev: run Apollo Router with hot-reload
APOLLO_ROUTER_CONFIG_PATH=./router.yaml ./router --hot-reload

# Query federated graph
curl -X POST http://router:4000 -H "Content-Type: application/json" -d '{"query":"{ users { id name reviews { rating } } }"}'
```

### GUI / Web

- **Apollo Studio** — supergraph schema registry, subgraph variant management, query planning visualization, performance traces
- **GraphQL Playground** — explore federated graph with automatic documentation
- **Rover Desktop** (GitHub CLI) — schema composition validation
- **K6** — load testing with federated query scenarios

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compose | `rover supergraph compose` | Apollo Studio → Schema → Publish |
| Introspect | `rover subgraph introspect` | Apollo Studio → Explorer |
| Check breaking | `rover supergraph check` | Studio → Checks → Breaking Changes |

---

## 7. Cheatsheet Rápido

```graphql
# Federation 2 directives:
# @key(fields: "id")     — entity primary key
# @external              — field owned by another subgraph
# @provides(fields: "...") — field resolvable without fetching from owner
# @requires(fields: "...") — field requires data from owner subgraph

# Entity resolver pattern:
User: {
  __resolveReference(ref) {
    return db.users.find(ref.id)
  }
}

# Supergraph composition (Rover):
# rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

# Apollo Router: Rust-based, ~100µs overhead per query
# Query planning: ~1-10ms per query, cached after first execution
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `api-gateway-bff-patterns` | alternativo — BFF pattern vs Federation | Sí |
| `rest-api-design` | alternativo — REST vs GraphQL approach | No |
| `performance-caching-web` | complementario — caching at gateway level | No |
| `microservices-decomposition` | contexto — Federation for microservice GraphQL | No |
| `grpc-protobuf` | alternativo — gRPC for internal service API | No |

---

## 9. Metadatos del Skill

```yaml
---
id: graphql-federation-gateways
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills
tags: [graphql, federation, apollo, subgraph, supergraph, gateway, entity-resolution, rover]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

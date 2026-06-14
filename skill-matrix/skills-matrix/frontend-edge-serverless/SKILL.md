---
name: frontend-edge-serverless
description: "Use when the user asks about Edge Functions, serverless, edge computing, Cloudflare Workers, Vercel Edge, streaming SSR, ISR, Partial Prerendering, cold starts, CDN, edge deployment, serverless deployment, edge runtime, Workers AI, D1, R2, KV, Lambda@Edge, middleware. Covers Edge Functions, Workers, ISR, PPR, Streaming SSR decision matrix."
---

# Edge Computing, Serverless & Streaming

## Semantic Triggers
```
Cloudflare Workers Vercel Edge Lambda@Edge Workerd WinterCG V8 isolate, ISR revalidate revalidateTag revalidatePath, Partial Prerendering PPR Suspense dynamic hole, streaming SSR renderToPipeableStream TTFB FCP LCP, Workers AI Llama 3.3 Flux DeepSeek embeddings, D1 SQLite R2 KV Durable Objects, middleware geo personalization A/B test cold start, edge runtime limitations Workerd runtime spec, Render-as-You-Fetch
```

---

## 1. Definición Teórica

Edge computing inverts the traditional request lifecycle: instead of routing to a central origin, requests are handled by V8 isolates distributed across 50-330+ edge locations, executing within 50-100ms cold-start windows. The edge runtime (Workerd at Cloudflare, WinterCG at Vercel) restricts APIs to a Fetch-compatible subset — no filesystem, no raw sockets, no Node.js built-ins. This constraint enables horizontal scale to zero (per-request billing) but rules out heavy compute.

The rendering model decision tree cascades from content dynamism: SSG for content that never changes, ISR for content that changes occasionally (CMS posts, product pages), PPR for hybrid shells (static layout + dynamic content), Streaming SSR for fully dynamic SEO-critical content, and CSR for authenticated dashboards where SEO is irrelevant. Cold start is the unifying metric: Edge (50-100ms) vs Serverless Node (200-1000ms) vs Traditional (5-60s container provisioning).

Workers AI extends the edge model to LLM inference — 300+ models (Llama 3.3 70B, Flux image generation, Whisper transcription) running on Cloudflare GPUs with the same isolation model. D1 (SQLite at the edge) and R2 (S3-compatible object storage with zero egress fees) complement KV for stateful edge applications.

---

## 2. Implementación de Referencia

### Edge vs Serverless vs Traditional

| Characteristic | Edge Runtime | Serverless (Node) | Traditional (VM/Container) |
|---|---|---|---|
| Cold start | 50-100ms | 200-500ms | 5-60s (container) |
| Geographic distribution | 50+ locations | 1-10 regions | 1-3 regions |
| CPU time limit | 30s (CF Workers), 60s (Vercel Edge) | 900s (AWS Lambda), 300s (Vercel) | Unlimited |
| Memory limit | 128MB (CF Workers), 384MB (Vercel Edge) | 10GB (AWS Lambda) | Arbitrary |
| Filesystem | Read-only, no local FS | /tmp (512MB-10GB) | Full FS |
| Binary size | 1MB (CF), 4MB (Vercel) | 250MB (AWS) | Unlimited |
| Runtime | Workerd (CF), WinterCG (Vercel) | Node.js 18-22 | Node.js, Python, Go |
| Network | Fetch API only (no raw sockets) | Full Node.js net | Full network |
| Pricing | Per-request (included tier) | Per-request + duration | Per-hour/month |
| Best for | Auth, personalization, A/B tests, AI inference | Heavy compute, data processing | Background jobs, ML training |

### Rendering Models Comparison

| Model | Type | Build time | Request time | Dynamism |
|---|---|---|---|---|
| SSG (Static Site Generation) | Static | Yes | 0ms | None |
| ISR (Incremental Static Regeneration) | Static + Dynamic | Yes | 0ms + revalidate | Partial |
| PPR (Partial Prerendering) | Static + Edge | Hybrid | 0ms + streaming | Partial |
| SSR (Server-Side Rendering) | Dynamic | No | TTFB variable | Full |
| Streaming SSR | Dynamic | No | TTFB immediate | Full |
| CSR (Client-Side Rendering) | Dynamic | No | 0ms (shell) | Full |

### Vercel Edge Middleware

```typescript
// middleware.ts — runs at edge before every request
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US'
  const response = NextResponse.next()

  response.cookies.set('country', country)

  // Geographic blocking
  if (country === 'CU' || country === 'IR') {
    return new NextResponse('Access denied', { status: 403 })
  }

  // A/B test at the edge (no origin round-trip)
  const cookie = request.cookies.get('experiment')
  if (!cookie) {
    const variant = Math.random() < 0.5 ? 'A' : 'B'
    response.cookies.set('experiment', variant)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Incremental Static Regeneration (ISR)

```typescript
// app/posts/[id]/page.tsx
import { notFound } from 'next/navigation'

async function getPost(id: string) {
  const res = await fetch(`https://api.example.com/posts/${id}`, {
    next: { revalidate: 3600 }, // revalidate every hour
  })
  if (!res.ok) return null
  return res.json()
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)
  if (!post) notFound()
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      <time>{post.updatedAt}</time>
    </article>
  )
}

// On-demand revalidation via API route
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  const body = await request.json()
  if (body.path) revalidatePath(body.path)
  if (body.tag)  revalidateTag(body.tag)
  return NextResponse.json({ revalidated: true })
}
```

### Partial Prerendering (PPR)

PPR combines build-time static HTML with edge-rendered dynamic holes via streaming.

```typescript
// app/products/[id]/page.tsx — Next.js 15+ with PPR
export const experimental_ppr = true

// Static shell, pre-rendered at build
function ProductShell() {
  return (
    <div className="product-layout">
      <nav><ProductBreadcrumbs /></nav>
      <aside><ProductSidebar /></aside>
    </div>
  )
}

// Dynamic hole, streamed from edge
async function ProductDetails({ id }: { id: string }) {
  const product = await fetch(`https://api.example.com/products/${id}`)
  return <ProductDisplay product={product} />
}

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <ProductShell>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails id={params.id} />
      </Suspense>
    </ProductShell>
  )
}
```

Result: `ProductShell` served from CDN (0ms TTFB) + `ProductDetails` streamed from edge.

### AI SDK at Vercel Edge

```typescript
// app/api/chat/route.ts — AI inference at edge
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    temperature: 0.7,
    maxTokens: 4096,
  })
  return result.toDataStreamResponse()
  // TTFB: ~500ms (first token from edge)
  // Without edge: ~2-10s (full generation at central server)
}
```

### Cloudflare Workers

```javascript
// wrangle.toml
// name = "my-worker"
// main = "src/index.js"
// compatibility_date = "2025-04-01"
//
// [ai]
// binding = "AI"

// src/index.js — Module Worker with AI, KV, D1
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/chat') {
      const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is edge computing?' },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      })
      return Response.json(response)
    }

    if (pathname === '/image') {
      const response = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
        prompt: 'A futuristic cityscape at night, neon lights',
        steps: 4,
      })
      return new Response(response.image, { headers: { 'Content-Type': 'image/png' } })
    }

    return new Response('Not found', { status: 404 })
  },
}
```

**Workers KV** — edge key-value cache:

```javascript
let cached = await env.MY_KV.get(`page:${url.pathname}`, { type: 'json' })
if (cached) return new Response(JSON.stringify(cached), { headers: { 'CF-Cache-Status': 'HIT' } })
const data = await generateData(url.pathname)
await env.MY_KV.put(`page:${url.pathname}`, JSON.stringify(data), { expirationTtl: 3600 })
// Free tier: 1GB storage, 100k reads/day, 1k writes/day, ~5μs latency
```

**D1** — SQLite at the edge:

```javascript
const { results } = await env.DB.prepare(
  'SELECT id, name, email FROM users WHERE active = ? ORDER BY created_at DESC'
).bind(1).all()

// Batch queries for performance
const batch = await env.DB.batch([
  env.DB.prepare('SELECT COUNT(*) as total FROM users'),
  env.DB.prepare('SELECT COUNT(*) as active FROM users WHERE active = 1'),
  env.DB.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role'),
])
```

**AI Gateway** — caching + rate limiting for LLM APIs:

```javascript
const response = await env.AI_GATEWAY.run({
  provider: 'openai',
  model: 'gpt-4o',
  headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
  body: await request.json(),
  cacheTtl: 3600,
  retryOnError: true,
  maxRetries: 3,
})
```

**Durable Objects** — consistent state at the edge:

```javascript
export class Counter {
  constructor(ctx) { this.ctx = ctx; this.count = 0 }
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/increment') this.count++
    if (url.pathname === '/decrement') this.count--
    return new Response(String(this.count))
  }
}
```

### Streaming SSR (React 19)

```typescript
// app/page.tsx — Streaming SSR with Suspense boundaries
import { Suspense } from 'react'
import { PostList } from './PostList'
import { Sidebar } from './Sidebar'

export default function HomePage() {
  return (
    <main>
      <h1>My Blog</h1>
      <Suspense fallback={<PostListSkeleton />}>
        <PostList /> {/* Streamed when ready */}
      </Suspense>
      <Suspense fallback={<div>Loading sidebar...</div>}>
        <Sidebar />
      </Suspense>
    </main>
  )
}
```

**Render-as-You-Fetch** — promises created before render so fetching starts immediately:

```typescript
export default function PostPage({ params }: { params: { id: string } }) {
  const postPromise = fetchPost(params.id)
  const commentsPromise = fetchComments(params.id)
  return (
    <article>
      <Suspense fallback={<PostSkeleton />}>
        <PostContent promise={postPromise} />
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments promise={commentsPromise} />
      </Suspense>
    </article>
  )
}
```

**Streaming SSR Performance Matrix**:

| Metric | Streaming SSR | SSG (Static) | SSR Traditional | CSR (Client) |
|---|---|---|---|---|
| TTFB | <100ms (first byte) | 0ms (CDN) | 200-500ms | <50ms (shell) |
| FCP | 200-300ms | <100ms | 500-1000ms | 1-5s |
| LCP | 500-2000ms | <200ms | 1000-3000ms | 2-10s |
| SEO | Excellent | Excellent | Excellent | Poor |
| Time to Interactive | Low | Immediate | Medium | High (hydration) |
| Cost CDN | Low | Very low | Medium | Low |

### Manual Streaming with Node.js (no framework)

```typescript
// server.ts
import { renderToPipeableStream } from 'react-dom/server'
import { createServer } from 'http'
import { App } from './App'

createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      res.write(`<!DOCTYPE html>`)
      pipe(res)
    },
    onError(error) { console.error(error); res.statusCode = 500; res.end('Internal Server Error') },
  })
}).listen(3000)
```

**Official source:** https://vercel.com/docs/functions/edge-functions · https://developers.cloudflare.com/workers/ · https://nextjs.org/docs/app/api-reference/next-config-js/ppr

---

## 3. Trade-offs y Decisiones de Arquitectura

### When to Use Each Rendering Model

| Scenario | SSG | ISR | PPR | Streaming SSR | CSR |
|---|---|---|---|---|---|
| Landing page | ✅ Best | ❌ | ❌ | ❌ | ❌ |
| Blog post with CMS | ✅ | ✅ Best | ❌ | ❌ | ❌ |
| Admin dashboard | ❌ | ❌ | ❌ | ❌ | ✅ Best |
| E-commerce product | ✅ | ✅ Best | ✅ | ❌ | ❌ |
| AI chat stream | ❌ | ❌ | ❌ | ✅ Best | ❌ |
| User analytics dashboard | ❌ | ❌ | ❌ | ✅ | ✅ Best |
| Multi-step form | ❌ | ❌ | ❌ | ❌ | ✅ Best |
| Slow data + fast shell | ❌ | ❌ | ✅ Best | ✅ | ✅ |
| SEO + real-time data | ❌ | ✅ | ✅ Best | ✅ | ❌ |

### Cost & Performance (Vercel, 2026)

| Model | Cost/req (100k/mo) | TTFB p50 | Cold starts | Rebuilds |
|---|---|---|---|---|
| SSG | $0 (build only) | 10ms | 0 | Full build 5-30min |
| ISR (revalidate 1h) | $1-5 | 10ms cached / 100ms revalidate | 0 | Only revalidated pages |
| PPR | $3-10 | 10ms shell / 100ms dynamic | 50ms | Partial build + edge |
| Streaming SSR | $10-50 | 100-300ms | 50ms (edge) | None |
| Edge Function only | $5-20 | 100-200ms | 50ms | None |

### Edge Runtime Limitations

1. **No filesystem** — use KV, R2, D1 for persistent storage
2. **No raw sockets** — HTTP/HTTPS only via Fetch API; WebSocket servers limited
3. **Limited bundle size** — 1MB (CF Workers), 4MB (Vercel Edge); code must be tree-shakeable
4. **No Node.js built-in modules** — `fs`, `net`, `crypto`, `path` unavailable (polyfills required)
5. **Limited CPU time** — 30s (CF Workers), 60s (Vercel Edge); not for heavy processing

### General Rules

1. Edge is for fast tasks: auth, personalization, A/B testing, lightweight AI
2. Static is the default: if it doesn't change, don't render dynamically
3. ISR for semi-dynamic content: prices, approximate stock, CMS content
4. PPR for static shell + dynamic content: e-commerce, partial dashboards
5. Streaming SSR for dynamic + SEO: chat, AI, dashboards
6. Traditional SSR is obsolete: prefer streaming or PPR

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Edge function exceeds 1MB bundle limit

**What caused the issue?**
Vercel Edge Function build fails with "Bundle size exceeded 4MB" after adding `aws-sdk` for S3 access.

**How was it resolved?**
Switched to lightweight Fetch-based S3 client (`@aws-sdk/s3-request-presigner` + raw `fetch`) and tree-shook unused exports:

```typescript
// ❌ 5MB
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ✅ <100KB — use presigned URL + fetch
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3/presigned-request'
// or use lightweight alt: s3mini, @forgehive/s3
```

**Why does this work?**
Edge bundles must be tree-shakeable. Heavy AWS SDK clients pull in XML parsers, streaming utilities, and Node.js polyfills that don't work in Workerd. A minimal `fetch`-based client avoids these.

### Caso: `revalidateTag` doesn't update the page

**What caused the issue?**
Calling `revalidateTag("posts")` in a webhook handler, but the blog list page still shows stale data.

**How was it resolved?**
Verify the `fetch` call uses the same tag string:

```typescript
// In the Server Component
const posts = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] }, // ✅ Must match exactly
})

// In the revalidation handler
revalidateTag("posts") // ✅ Same string
```

**Why does this work?**
Next.js Data Cache associates each `fetch` response with its tags. `revalidateTag` invalidates all cache entries that have that exact tag string. Tag matching is case-sensitive and whitespace-sensitive.

### Caso: `env.DB` returns D1 binding as undefined in Worker

**What caused the issue?**
Cloudflare Worker deployed successfully but `env.DB` is `undefined` when invoked, causing `TypeError: Cannot read properties of undefined`.

**How was it resolved?**
Add the D1 binding in `wrangler.toml` or the Cloudflare dashboard:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Then redeploy: `npx wrangler deploy`. The binding is injected into `env` at runtime.

**Why does this work?**
Cloudflare bindings are not implicit — they must be declared in `wrangler.toml` (or via dashboard). The Worker only has access to bindings explicitly configured for its environment.

### Caso: Streaming SSR with no framework

**What caused the issue?**
`renderToPipeableStream` returns but the browser never receives a complete response.

**How was it resolved?**
Ensure the stream's `onAllReady` or `onShellReady` callback pipes to the response, and that `Content-Type: text/html` is set BEFORE writing:

```typescript
// ❌ Headers after write
res.write('<!DOCTYPE html>')
res.setHeader('Content-Type', 'text/html')

// ✅ Headers first
res.setHeader('Content-Type', 'text/html; charset=utf-8')
res.write('<!DOCTYPE html>')
pipe(res)
```

**Why does this work?**
HTTP headers must precede the body. Setting headers after writing triggers a `ERR_HTTP_HEADERS_SENT` error and the stream terminates silently.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimated when invoking this skill
- **Trigger de activación:** "edge", "serverless", "cloudflare workers", "vercel edge", "ISR", "PPR", "streaming SSR", "cold start", "middleware" in the query
- **Prioridad de carga:** Alta — deployment target decision affects routing, middleware, and data fetching
- **Dependencias:** `next-js-app-router`, `frontend-runtimes-build`, `integracion-ia-web`, `streaming-llm-outputs-sse`

### Tool Integration

```json
{
  "tool_name": "frontend-edge-serverless",
  "description": "Edge computing, serverless, ISR, PPR, streaming SSR — Cloudflare Workers, Vercel Edge, decision matrix",
  "triggers": ["edge", "serverless", "cloudflare workers", "vercel edge", "isr", "ppr", "streaming ssr", "cold start", "lambda@edge", "middleware"],
  "context_hint": "Inject section 2 (Implementation) for ISR/PPR/middleware examples. Section 3 for rendering model decision matrix. Section 4 for revalidateTag/bundle size FAQ.",
  "output_format": "markdown",
  "max_tokens": 4000
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about edge functions, serverless deployment, ISR, Partial Prerendering, or
streaming SSR, load the skill frontend-edge-serverless and provide a decision matrix for
SSG vs ISR vs PPR vs Streaming SSR vs CSR. Reference Cloudflare Workers, Vercel Edge, and
Workers AI for deployment examples. Prioritize cold start metrics and bundle size limits.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Vercel Edge
npx vercel env pull                  # sync env vars
npx vercel deploy --prebuilt         # deploy with edge functions

# Cloudflare Workers
npx wrangler init my-worker          # scaffold
npx wrangler dev                     # local dev (workerd)
npx wrangler deploy                  # deploy to edge
npx wrangler d1 create my-db         # create D1 database
npx wrangler d1 execute my-db --file schema.sql
npx wrangler kv:namespace create     # create KV namespace
npx wrangler r2 bucket create        # create R2 bucket

# Next.js
npx next dev                         # dev server
npx next build                       # build (ISR + PPR detected)
npx next start                       # serve production
NEXT_DEBUG_FETCH=1 npx next dev      # verbose fetch logging

# Streaming test
curl -N http://localhost:3000/api/stream  # -N disables buffering
```

### GUI / Web

- **Cloudflare Dashboard**: Workers → Logs, Analytics, KV, D1, R2, AI bindings
- **Vercel Dashboard**: Functions → Edge/Serverless runtime, ISR cache, revalidation events
- **Next.js DevTools**: React Server Components tree, cache state, revalidation events
- **wrangler tail**: real-time log tail of deployed Worker
- **Vercel Observability**: TTFB p50/p99 per region, cold start frequency

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Tail Worker logs | `wrangler tail` | CF Dashboard → Logs |
| Test Edge function | `curl -i https://my-app.vercel.app/api/edge` | Vercel → Functions → Test |
| View D1 data | `wrangler d1 execute my-db --command "SELECT * FROM users"` | CF Dashboard → D1 → Console |
| Trigger ISR revalidation | `curl -X POST -H "x-revalidate-secret: $S" -d '{"tag":"posts"}' /api/revalidate` | Vercel → Deployments → Revalidate |

---

## 7. Cheatsheet Rápido

```typescript
// Vercel Middleware
export const config = { matcher: ['/((?!api|_next/static).*)'] }
export function middleware(req: NextRequest) {
  const country = req.geo?.country || 'US'
  return country === 'CU' ? new NextResponse('Denied', { status: 403 }) : NextResponse.next()
}

// ISR with revalidation
const res = await fetch(url, { next: { revalidate: 3600, tags: ['posts'] } })
revalidatePath('/posts')      // revalidate by path
revalidateTag('posts')        // revalidate by tag

// PPR (Next.js 15+)
export const experimental_ppr = true
// Wrap dynamic content in <Suspense> — holes stream from edge

// Streaming SSR
import { Suspense } from 'react'
<Suspense fallback={<Skeleton />}>
  <DynamicContent promise={fetchPromise} />
</Suspense>

// Cloudflare Worker (Module)
export default {
  async fetch(request, env, ctx) {
    // env: bindings (KV, D1, R2, AI)
    // ctx: waitUntil, passthroughOnException
    return new Response('Hello from edge')
  },
}

// Workers AI
const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct', { messages, max_tokens: 1024 })

// D1 query
const { results } = await env.DB.prepare('SELECT * FROM users WHERE active = ?').bind(1).all()
```

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.js"
compatibility_date = "2025-04-01"

[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxxxxxx"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-assets"

[ai]
binding = "AI"
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `next-js-app-router` | Dependiente | Sí |
| `frontend-runtimes-build` | Complementario | Sí |
| `integracion-ia-web` | Complementario | Sí (Workers AI, streaming LLM) |
| `streaming-llm-outputs-sse` | Complementario | Sí (AI chat streaming) |
| `meta-frameworks-web` | Complementario | Sí |
| `caching-patterns-write-through` | Complementario | Condicional (ISR/cache strategy) |
| `performance-caching-web` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: frontend-edge-serverless
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/web-architecture/edge-serverless-streaming
tags: [edge, serverless, cloudflare-workers, vercel-edge, isr, ppr, streaming-ssr, middleware, cold-start, workers-ai, d1, kv, r2]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `edge-serverless-streaming` (Skills-o-extra/web-architecture).*

---
name: next-js-app-router
description: "Next.js App Router (introducido en v13.4, estable desde v14) es un enrutador basado en el sistema de archivos que convierte cada carpeta en una ruta y cada archivo `page.tsx` en una vista pública. Covers Next.js 16, React Router v7, Astro 6, React Server Components, App Router, Islands Architecture, SSG, SSR, full-stack React, meta-frameworks comparison"
---
# Next.js App Router

## Semantic Triggers
```
Next.js App Router Server Components Server Actions, data fetching with async components and fetch cache, ISR incremental static regeneration revalidate, middleware route protection matcher, loading error not-found layouts, useActionState server mutations
```

---

## 1. Definición Teórica

Next.js App Router (introducido en v13.4, estable desde v14) es un enrutador basado en el sistema de archivos que convierte cada carpeta en una ruta y cada archivo `page.tsx` en una vista pública. Por defecto, todos los componentes son Server Components (RSC): se ejecutan en el servidor, acceden directamente a bases de datos y archivos, y envían solo HTML serializado al cliente. Las Server Actions permiten mutaciones de datos directamente desde formularios HTML sin necesidad de API Routes explícitas. El sistema de layouts persistentes, junto con `loading.tsx`, `error.tsx`, y `not-found.tsx`, proporciona manejo declarativo de estados de carga y error por segmento de ruta.

---

## 2. Implementación de Referencia

Next.js 16 es la versión recomendada. El App Router es el enrutador por defecto. Las Server Actions se definen con `"use server"` y se invocan desde formularios con `useActionState` (React 19) para manejo progresivo de formularios que funciona sin JavaScript.

### Ejemplo Práctico Avanzado

```typescript
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

// Server Component (default — no "use client")
async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await db.post.findUnique({ where: { slug } })
  if (!post) return <div>Not found</div>
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  )
}

// Server Action
"use server"
export async function createPost(formData: FormData) {
  const title = formData.get("title") as string
  const content = formData.get("content") as string
  if (!title || title.length < 3) throw new Error("Title too short")
  const post = await db.post.create({ data: { title, content } })
  revalidatePath("/posts")
  redirect(`/posts/${post.id}`)
}

// Client component consuming the action
"use client"
import { useActionState } from "react"
import { createPost } from "./actions"

function PostForm() {
  const [state, formAction, pending] = useActionState(createPost, null)
  return (
    <form action={formAction}>
      <input name="title" required minLength={3} />
      <textarea name="content" required />
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Create Post"}
      </button>
      {state?.error && <p role="alert">{state.error}</p>}
    </form>
  )
}

// Route handler (API route)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const data = await db.post.findMany({
    skip: Number(searchParams.get("offset")),
    take: 20,
  })
  return NextResponse.json({ data })
}

// Layout with parallel routes
export default function Layout({
  children, analytics, team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <>
      {children}
      <div className="grid grid-cols-2">{analytics}{team}</div>
    </>
  )
}

// Middleware
export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value
  if (!token) return NextResponse.redirect(new URL("/login", request.url))
  return NextResponse.next()
}

export const config = { matcher: ["/dashboard/:path*"] }
```

**Fuente oficial:** https://nextjs.org/docs/app

### Alternativa de Implementación Específica

**React Router v7** (antes Remix) para aplicaciones que necesitan control granular sobre la carga de datos y el manejo de formularios sin el modelo de Server Components de Next.js. RRv7 ofrece cargas paralelas con `loader`, mutaciones con `action`, y renderizado 100% en el cliente si es necesario.

```typescript
import { Route } from "./+types/root"
import { data, redirect } from "react-router"

export async function loader({ params }: Route.LoaderArgs) {
  const post = await db.post.findUnique({ where: { slug: params.slug } })
  if (!post) throw data(null, { status: 404 })
  return { post }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  await db.post.create({ data: { title: formData.get("title") as string } })
  return redirect("/posts")
}
```

**Fuente oficial:** https://reactrouter.com/start/data/loading

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Proyectos full-stack que necesitan SSR, SEO, ISR, y un modelo unificado cliente-servidor |
| **Cuándo evitar** | Sitios puramente estáticos (Astro es más ligero); SPAs sin SSR (Vite + React Router es más simple) |
| **Alternativas** | React Router v7 (más control client-side, menos magic); Astro (islas de interactividad, cero JS por defecto); Remix (origen de los loaders/actions, ahora RRv7) |
| **Coste/Complejidad** | Alto — el modelo RSC + Server Actions requiere entender el límite cliente/servidor. El caching es complejo (Full Route Cache, Data Cache, Router Cache). La DX es excelente una vez dominado |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Server Action no puede ser serializada

**¿Qué ocasionó el error?**
Error `Functions cannot be passed directly to Server Action` al intentar pasar una función como prop desde un Server Component a un Client Component.

**¿Cómo se solucionó?**
Pasar la Server Action como `action` prop (string reference) en lugar de como callback:

```typescript
// ✅ Server Component pasa la acción como referencia
// <ClientForm action={createPost} />

// ✅ Client Component la recibe como string
"use client"
export function ClientForm({ action }: { action: (formData: FormData) => void }) {
  return <form action={action}>...</form>
}

// ❌ Incorrecto: pasar una función inline
// <form action={async (fd) => { "use server"; ... }} />
```

**¿Por qué funciona esta técnica?**
Next.js serializa la referencia a la Server Action como un ID único. El cliente envía este ID al servidor, que lo mapea a la función real, evitando la serialización de código ejecutable.

### Caso: `revalidateTag` no actualiza la página

**¿Qué ocasionó el error?**
Llamar a `revalidateTag` pero la página sigue mostrando datos obsoletos porque la etiqueta no coincide con la usada en `fetch`.

**¿Cómo se solucionó?**
Asegurar que la etiqueta usada en `fetch` coincida exactamente con la de `revalidateTag`:

```typescript
// En el Server Component
const posts = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] }, // ✅ Etiqueta
})

// En la Server Action
revalidateTag("posts") // ✅ Misma etiqueta
```

**¿Por qué funciona esta técnica?**
El Data Cache de Next.js asocia cada respuesta `fetch` con sus etiquetas. `revalidateTag` invalida todas las entradas del cache que tengan esa etiqueta, forzando una nueva solicitud en el próximo render.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "next.js", "app router", "server action", "ssr" o "isr" en la consulta
- **Prioridad de carga:** Alta — framework dominante para React full-stack
- **Dependencias:** `07-01-react-ui-development`, `07-03-tailwind-css-utility`, `07-04-typescript-type-system`

### Tool Integration

```json
{
  "tool_name": "next-js-app-router",
  "description": "Guía de Next.js App Router con Server Components, Server Actions, layouts, ISR, y middleware",
  "triggers": ["next.js", "app router", "server action", "isr", "ssr", "nextjs"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de Server Components y Server Actions. FAQ para problemas de revalidación.",
  "output_format": "markdown",
  "max_tokens": 3000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Next.js o App Router, carga el skill next-js-app-router y responde
con ejemplos prácticos de Server Components, Server Actions, y revalidación. Prioriza
código TypeScript sobre explicaciones teóricas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto
npx create-next-app@latest my-app -- --typescript --tailwind --eslint --app

# Desarrollo
npm run dev          # http://localhost:3000
npm run build        # Producción
npm run start        # Servidor producción

# Análisis de bundle
ANALYZE=true npm run build

# Lint
npm run lint
```

### GUI / Web

- **Next.js DevTools:** Extensión de navegador que muestra el árbol RSC, Server Actions, y estado del cache
- **`localhost:3000` Dev Overlay:** Errores de compilación se muestran en pantalla con stack trace y sugerencias
- **React DevTools:** Muestra componentes servidor y cliente; los Server Components aparecen como slots serializados
- **`next.config.js` `logging`:** Configura `logging: { fetches: { fullUrl: true } }` para ver requests de fetch en terminal

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar dev | `npm run dev` | — |
| Build producción | `npm run build` | — |
| Inspeccionar RSC | — | React DevTools → Components |
| Ver logs de fetch | `NEXT_DEBUG_FETCH=1` | `logging.fetches` en config |

---

## 7. Cheatsheet Rápido

```typescript
// App Router file conventions
// page.tsx        → ruta pública
// layout.tsx      → layout persistente
// loading.tsx     → Suspense auto-wrapper
// error.tsx       → error boundary
// not-found.tsx   → 404
// route.ts        → API route

// Server Component (default)
async function Page() { const data = await fetch(url); return <div>{data}</div> }

// Server Action
"use server"
export async function action(fd: FormData) { await db.create(fd); revalidatePath("/") }

// Client
"use client"
import { useActionState } from "react"
const [state, formAction, pending] = useActionState(action, null)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-01-react-ui-development` | Dependiente | Sí |
| `07-03-tailwind-css-utility` | Complementario | Sí |
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-12-rest-api-integration-client` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: next-js-app-router
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/next-js
tags: [next.js, app-router, server-components, server-actions, react, fullstack]
---
```

---

## Comparativa 2026 / Ecosystem

### Panorama de Meta-Frameworks Web 2026

| Framework | Versión | Bundle JS default | SSG | SSR | ISR | RSC | Streaming | Islands |
|-----------|---------|-------------------|-----|-----|-----|-----|-----------|---------|
| Next.js | 16.2.9 | 0 (RSC) | Si | Si | Si | Si | Si | Parcial |
| React Router | 7.17.0 | 0 (framework mode) | Si | Si | No | No | Si | No |
| Astro | 6.4.5 | ~0 (Islands) | Si | Si | No | No | No | Si |

### Next.js 16 — Novedades

- **Cache Components:** Componentes que cachean su salida a nivel de servidor. `unstable_cache` + `next.cache.set/get` (key-value similar a Redis integrado en runtime).
- **Turbopack Stable:** Bundler default en dev y prod (HMR <50ms, builds 10x más rápidos que webpack, soporte RSC nativo).
- **React Compiler:** `reactCompiler: true` en `next.config.ts` elimina `useMemo`/`useCallback`/`React.memo`. Compilador memoiza automáticamente.
- **proxy.ts (formerly middleware.ts):** `middleware.ts` renombrado a `proxy.ts`. Edge proxy que inspecciona/modifica requests antes del server. Soporta `req.geo` para country-based routing.

### React Router v7 (antes Remix)

Framework mode = evolución de Remix v3. API central:

- **Route Config tipado:** `app/routes.ts` con `route()`, nested routes.
- **Loader/Action:** Cargas paralelas en una sola HTTP request (Single Fetch), `defer()` para datos críticos vs lentos, `<Await>` con `<Suspense>`.
- **Progressive Enhancement:** Forms funcionan sin JS, mejorados con fetch cuando JS está disponible.
- Cuándo preferir RRv7 sobre Next.js: apps con mucha interacción del usuario, control granular sobre data loading, sin necesidad de RSC.

### Astro 6

- **Islands Architecture:** HTML estático + islas interactivas con directivas `client:load`/`client:idle`/`client:visible`/`client:media`/`client:only`.
- **Content Collections con Zod:** `defineCollection({ type: 'content', schema: ({ image }) => z.object({...}) })` — type-safe markdown/MDX.
- **Server Islands:** `server:defer` para contenido dinámico dentro de páginas estáticas, sin JS del cliente.
- **Built-in CSP:** `astro.config.mjs` con `security.csp.directives` para Content Security Policy integrado.
- **Rust Compiler (experimental):** 3-5x build más rápido, dev server <100ms.
- Cuándo preferir Astro: blogs, docs, marketing, landing pages, bundles JS mínimos, multi-framework UI (React + Svelte + Vue simultáneo).

### Matriz de Decisión Rápida

| Criterio | Next.js | React Router v7 | Astro |
|----------|---------|-----------------|-------|
| Dashboard admin | Mejor | Bueno | Regular |
| Blog / CMS / Docs | Bueno | Regular | Mejor |
| E-commerce | Mejor | Bueno | Bueno |
| Landing page | Bueno | Regular | Mejor |
| SEO crítico | Bueno | Regular | Mejor |
| Bundle JS mínimo | Regular | Regular | Mejor |
| API routes | API Routes | loader/action | API endpoints |
| Deploy serverless | Vercel | Cloudflare/Fly | Netlify/Cloudflare |

### Migraciones Clave

- **Next.js 15 → 16:** Renombrar `middleware.ts` a `proxy.ts`; activar `reactCompiler: true`; migrar `getServerSideProps` a App Router.
- **Remix → React Router v7:** `npm install react-router@latest`; `@remix-run/node` → `react-router`; actualizar `vite.config.ts` al plugin de react-router.
- **Astro 5 → 6:** Activar Rust compiler experimental; actualizar schemas Zod con `image()` API; migrar a Live Content Collections.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with meta-frameworks-web)*

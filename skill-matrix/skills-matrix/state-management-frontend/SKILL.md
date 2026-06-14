---
name: state-management-frontend
description: "El manejo de estado en frontend existe en un espectro que va desde estado local (componente) hasta estado global (aplicación completa)"
---
# State Management (Frontend)

## Semantic Triggers
```
Zustand store state management React, Jotai atomic state derived atoms, Redux Toolkit createSlice createAsyncThunk, state management selector pattern re-render prevention, persist middleware Zustand redux-persist, devtools middleware debugging state
```

---

## 1. Definición Teórica

El manejo de estado en frontend existe en un espectro que va desde estado local (componente) hasta estado global (aplicación completa). Cada solución aborda un problema distinto: `useState`/`useReducer` para estado local, Context API para estado compartido en un árbol pequeño, Zustand para estado global con API mínima, Jotai para estado atómico con derivaciones perezosas, y Redux Toolkit para aplicaciones grandes que necesitan middleware e interceptores. El principio fundamental es "empezar simple, escalar cuando sea necesario". Los selectores (acceder a una porción mínima del estado) son críticos para prevenir re-renders innecesarios.

---

## 2. Implementación de Referencia

Zustand es la opción recomendada para la mayoría de aplicaciones React: API simple, TypeScript nativo, soporte de middleware (persist, devtools, immer). Para estado atómico con derivaciones, Jotai. Para aplicaciones grandes con middleware complejo, Redux Toolkit.

### Ejemplo Práctico Avanzado

```typescript
// ============ ZUSTAND (recomendado) ============
import { create } from "zustand"
import { persist, devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

interface BearStore {
  bears: number
  fishes: number
  addBear: (qty?: number) => void
  eatFish: () => void
  resetBears: () => void
  total: () => number
}

const useBearStore = create<BearStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        bears: 0,
        fishes: 10,
        addBear: (qty = 1) => set((state) => { state.bears += qty }),
        eatFish: () => set((state) => { if (state.fishes > 0) state.fishes -= 1 }),
        resetBears: () => set((state) => { state.bears = 0 }),
        total: () => get().bears + get().fishes,
      })),
      { name: "bear-storage" }
    ),
    { name: "BearStore" }
  )
)

// Selectores — evitar re-renders innecesarios
function BearCounter() {
  const bears = useBearStore((s) => s.bears)
  const addBear = useBearStore((s) => s.addBear)
  return <button onClick={() => addBear()}>Bears: {bears}</button>
}
```

```typescript
// ============ JOTAI (estado atómico) ============
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"

const countAtom = atom(0)
const doubledAtom = atom((get) => get(countAtom) * 2)
const asyncDataAtom = atom(async () => {
  const response = await fetch("/api/data")
  return response.json()
})

// Write-only atom (acción)
const incrementAtom = atom(null, (get, set) => set(countAtom, get(countAtom) + 1))

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const doubled = useAtomValue(doubledAtom)
  const increment = useSetAtom(incrementAtom)
  return <button onClick={increment}>{count} (doubled: {doubled})</button>
}

function DataView() {
  const data = useAtomValue(asyncDataAtom)
  return <div>{JSON.stringify(data)}</div>
}
```

```typescript
// ============ REDUX TOOLKIT (apps grandes) ============
import { createSlice, createAsyncThunk, configureStore } from "@reduxjs/toolkit"

interface PostsState {
  items: Post[]
  loading: boolean
  error: string | null
}

const fetchPosts = createAsyncThunk("posts/fetch", async () => {
  const response = await fetch("/api/posts")
  return response.json() as Promise<Post[]>
})

const postsSlice = createSlice({
  name: "posts",
  initialState: { items: [], loading: false, error: null } as PostsState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => { state.loading = true })
      .addCase(fetchPosts.fulfilled, (state, action) => { state.items = action.payload; state.loading = false })
      .addCase(fetchPosts.rejected, (state, action) => { state.error = action.error.message ?? "Error"; state.loading = false })
  },
})

const store = configureStore({ reducer: { posts: postsSlice.reducer } })
```

**Fuente oficial:** https://zustand.docs.pmnd.rs/getting-started/introduction

### Alternativa de Implementación Específica

**TanStack Query (React Query)** para estado de servidor (fetching, caching, sincronización con API). No reemplaza Zustand/Redux para estado de UI, sino que se complementa. Maneja caché, re-fetch, paginación, y mutaciones automáticamente.

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

function Posts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts").then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 min before refetch
  })

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (newPost: { title: string }) =>
      fetch("/api/posts", { method: "POST", body: JSON.stringify(newPost) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>{data.map(post => <Post key={post.id} post={post} />)}</div>
}
```

**Fuente oficial:** https://tanstack.com/query/latest

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier app React con estado compartido entre componentes no directamente relacionados |
| **Cuándo evitar** | Apps pequeñas (<5 componentes con estado compartido mínimo); estado puramente de servidor (usa TanStack Query) |
| **Alternativas** | Context API (built-in, simple, pero causa re-renders en todo el árbol); Redux Toolkit (potente, verboso); Jotai (atómico, sin boilerplate); Valtio (proxy-based, mutable) |
| **Coste/Complejidad** | Bajo para Zustand/Jotai (días de aprendizaje). Alto para Redux Toolkit (semanas). El beneficio es predictibilidad y mantenibilidad en apps grandes |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El componente se re-renderiza aunque el estado no cambió

**¿Qué ocasionó el error?**
El componente está suscrito a todo el store en lugar de a una porción mínima, o el selector retorna un nuevo objeto/referencia cada render.

**¿Cómo se solucionó?**
Usar selectores atómicos y memoización:

```typescript
// ❌ Mal: suscripción a todo el store
const state = useBearStore()

// ✅ Bien: selector mínimo
const bears = useBearStore((s) => s.bears)

// ✅ Para objetos derivados, usar shallow
import { shallow } from "zustand/shallow"
const { bears, fishes } = useBearStore((s) => ({ bears: s.bears, fishes: s.fishes }), shallow)
```

**¿Por qué funciona esta técnica?**
React compara las referencias del valor retornado. Un selector que retorna un primitivo (`number`) solo cambia cuando el valor cambia. `shallow` compara las propiedades del objeto en lugar de la referencia del objeto.

### Caso: Estado no se persiste al recargar la página

**¿Qué ocasionó el error?**
El middleware `persist` de Zustand no está configurado, o el storage (localStorage) no está disponible (por ejemplo, en SSR o entornos con privacidad restringida).

**¿Cómo se solucionó?**
Configurar persist con opciones y fallback:

```typescript
const useStore = create(
  persist(
    (set) => ({ theme: "light", setTheme: (t: string) => set({ theme: t }) }),
    {
      name: "app-settings",
      storage: typeof window !== "undefined"
        ? createJSONStorage(() => localStorage)
        : undefined,
      partialize: (state) => ({ theme: state.theme }), // solo persistir theme
    }
  )
)
```

**¿Por qué funciona esta técnica?**
Zustand usa `localStorage` por defecto pero falla en SSR donde `window` no está definido. `partialize` controla qué porción del estado se persiste, evitando almacenar datos volátiles o sensibles.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "state management", "store", "zustand", "redux", "jotai", "global state" en la consulta
- **Prioridad de carga:** Alta — el manejo de estado es central en apps React
- **Dependencias:** `07-01-react-ui-development`, `07-04-typescript-type-system`

### Tool Integration

```json
{
  "tool_name": "state-management-frontend",
  "description": "Guía de state management en React: Zustand, Jotai, Redux Toolkit, selectores y persistencia",
  "triggers": ["zustand", "redux", "jotai", "state management", "store", "global state"],
  "context_hint": "Inyectar sección 2 con ejemplos de Zustand + Jotai + Redux Toolkit. FAQ para problemas de re-renders y persistencia.",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre manejo de estado, carga el skill state-management-frontend.
Recomienda Zustand por defecto. Para estado de servidor, recomienda TanStack Query.
Prioriza selectores mínimos para prevenir re-renders.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Instalar Zustand
npm install zustand

# Jotai
npm install jotai

# Redux Toolkit
npm install @reduxjs/toolkit react-redux

# TanStack Query
npm install @tanstack/react-query

# Ver tamaño de bundle de state management
npx source-map-explorer dist/assets/*.js
```

### GUI / Web

- **Redux DevTools (extensión browser):** Viajar en el tiempo, inspeccionar acciones y estado, dispatch manual. Zustand también soporta Redux DevTools vía middleware `devtools()`
- **React DevTools:** Ver estado de componentes que usan hooks de estado, contexto y store
- **Zustand DevTools:** En desarrollo, el middleware `devtools()` conecta automáticamente con Redux DevTools
- **Jotai DevTools:** `<DevTools>` component para inspeccionar átomos y sus valores

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Depurar store | — | `Ctrl+Shift+I` → Redux tab |
| Time-travel debug | — | Redux DevTools → Jump |
| Inspeccionar átomo | — | Jotai DevTools panel |
| Reset store | `store.setState(initialState)` | — |

---

## 7. Cheatsheet Rápido

```typescript
// Zustand
const useStore = create<State>()(devtools(persist(set => ({
  count: 0,
  inc: () => set(s => ({ count: s.count + 1 })),
}), { name: "store" })))
const count = useStore(s => s.count)

// Jotai
const countAtom = atom(0)
const [count, setCount] = useAtom(countAtom)

// Redux Toolkit
const slice = createSlice({ name: "x", initialState: { v: 0 }, reducers: { inc: s => { s.v += 1 } } })
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-01-react-ui-development` | Dependiente | Sí |
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-12-rest-api-integration-client` | Complementario | No |
| `07-07-playwright-e2e-testing` | Independiente | No |

---

## 9. Metadatos del Skill

```yaml
---
id: state-management-frontend
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/state-management
tags: [state-management, zustand, jotai, redux, react, frontend]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

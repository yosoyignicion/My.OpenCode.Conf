---
name: react-ui-development
description: "React 19 es una biblioteca para construir interfaces de usuario mediante componentes declarativos basados en funciones"
---
# React UI Development

## Semantic Triggers
```
React 19 hooks useState useEffect useCallback useMemo, Server Components and client boundaries, compound component render props patterns, Suspense useTransition startTransition, forwardRef useImperativeHandle, error boundary class component fallback
```

---

## 1. Definición Teórica

React 19 es una biblioteca para construir interfaces de usuario mediante componentes declarativos basados en funciones. Su modelo mental central es la reactividad unidireccional: el estado fluye hacia abajo a través del árbol de componentes, y los eventos fluyen hacia arriba. Los Server Components (RSC por defecto en frameworks como Next.js) permiten ejecutar componentes exclusivamente en el servidor, reduciendo el JavaScript enviado al cliente. Suspense coordina estados de carga asíncronos, y las Transiciones (startTransition/useTransition) diferencian actualizaciones urgentes de no urgentes para mantener la capacidad de respuesta.

---

## 2. Implementación de Referencia

React 19 con TypeScript es la combinación recomendada. Los hooks son la unidad de lógica reutilizable. Los Server Components son el default en frameworks App Router; se marca un componente con `"use client"` solo cuando necesita estado, efectos o manejadores de eventos.

### Ejemplo Práctico Avanzado

```tsx
import { useState, useEffect, useMemo, useCallback, useRef, useReducer, useContext, forwardRef, useImperativeHandle, createContext, ReactNode } from "react"

// Custom hook — toggle pattern
function useToggle(init = false): [boolean, () => void] {
  const [on, toggle] = useReducer(prev => !prev, init)
  return [on, toggle]
}

// Custom hook — context with guard
function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

// Compound component pattern
const SelectContext = createContext<{ value: string; setValue: (v: string) => void } | null>(null)

function Select({ children }: { children: ReactNode }) {
  const [value, setValue] = useState("")
  return <SelectContext.Provider value={{ value, setValue }}>{children}</SelectContext.Provider>
}

Select.Option = function Option({ value, label }: { value: string; label: string }) {
  const ctx = useContext(SelectContext)
  if (!ctx) return null
  return <div onClick={() => ctx.setValue(value)}>{label}</div>
}

// Error boundary (class component required — no hook equivalent)
class ErrorBoundary extends React.Component<{ fallback: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() { return this.state.error ? this.props.fallback : this.props.children }
}

// forwardRef + useImperativeHandle
const FancyInput = forwardRef<HTMLInputElement, { placeholder?: string }>((props, ref) => {
  const innerRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({ focus: () => innerRef.current?.focus() }), [])
  return <input ref={innerRef} {...props} />
})

// Server Component example (runs on server, no "use client")
// async function Post({ id }: { id: string }) {
//   const post = await db.post.findUnique({ where: { id } })
//   return <article>{post.title}</article>
// }
```

**Fuente oficial:** https://react.dev/reference/react

### Alternativa de Implementación Específica

**Preact** para aplicaciones que necesitan el mismo API de React pero con un bundle de ~3 KB. Compatible con la mayoría de ecosistema React mediante `preact/compat`. Ideal para proyectos embebidos o con restricciones severas de tamaño.

```tsx
import { h, render, Component } from "preact"
import { useState } from "preact/hooks"

function Counter() {
  const [count, setCount] = useState(0)
  return h("button", { onClick: () => setCount(c => c + 1) }, `Count: ${count}`)
}

render(h(Counter), document.getElementById("app")!)
```

**Fuente oficial:** https://preactjs.com/guide/v10/hooks

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones web interactivas con estado dinámico, SPAs, dashboards, formularios complejos |
| **Cuándo evitar** | Sitios mayormente estáticos (elige Astro o HTML vanilla); proyectos que solo necesitan renderizado server-side sin interactividad |
| **Alternativas** | Vue 3 (composition API similar, Reactividad basada en proxies); Preact (mismo API, 3 KB); Solid (sin virtual DOM, señales) |
| **Coste/Complejidad** | Curva de aprendizaje moderada. React 19 reduce complejidad con Server Components. El virtual DOM añade overhead de memoria, pero el bundle base (~40 KB gzip) es aceptable. El ecosistema maduro compensa el coste de onboarding |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: "Rendered more hooks than during the previous render"

**¿Qué ocasionó el error?**
Llamar a hooks dentro de condicionales, loops o early returns. React mantiene un array de hooks por componente y espera que el orden de llamada sea idéntico entre renders.

**¿Cómo se solucionó?**
Mover todos los hooks al nivel superior del componente, antes de cualquier early return:

```tsx
function MyComponent({ flag }: { flag: boolean }) {
  const [count, setCount] = useState(0) // ✅ Siempre se ejecuta
  useEffect(() => { /* ... */ }, [])
  if (flag) return <div>Early return</div> // ❌ Hooks antes del return
  return <div>{count}</div>
}
```

**¿Por qué funciona esta técnica?**
React identifica cada hook por su posición en la secuencia de llamadas. Si el orden cambia entre renders, React no puede asociar el estado persistente con el hook correcto.

### Caso: Stale closure en useEffect con dependencias incorrectas

**¿Qué ocasionó el error?**
El closure dentro de `useEffect` captura una variable desactualizada porque no se incluyó en el array de dependencias.

**¿Cómo se solucionó?**
Incluir todas las variables que el efecto utiliza en el array de dependencias, o usar `useCallback`/`useRef` para estabilizar referencias:

```tsx
const [count, setCount] = useState(0)
useEffect(() => {
  const id = setInterval(() => setCount(prev => prev + 1), 1000)
  return () => clearInterval(id)
}, []) // ✅ Usamos forma funcional para evitar dependencia en count
```

**¿Por qué funciona esta técnica?**
La forma funcional `setCount(prev => prev + 1)` no depende del valor actual de `count`, eliminando la necesidad de incluir `count` en las dependencias y evitando que el intervalo se reinicie en cada render.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "react component" o "hook" o "render" en la consulta del usuario
- **Prioridad de carga:** Alta — React es ubicuo en frontend web
- **Dependencias:** `07-04-typescript-type-system` (los ejemplos usan TS), `07-03-tailwind-css-utility` (para estilado)

### Tool Integration

```json
{
  "tool_name": "react-ui-development",
  "description": "Guía de React 19 con hooks, Server Components, patrones compuestos y manejo de errores",
  "triggers": ["react", "hook", "useState", "useEffect", "server component", "rsc", "error boundary"],
  "context_hint": "Inyectar sección 2 (Implementación) cuando se pidan ejemplos de código. Inyectar sección 4 (FAQ) para errores comunes.",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre React o hooks, carga el skill react-ui-development y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos
con TypeScript sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto React con Vite
npm create vite@latest my-app -- --template react-ts

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build && npm run preview

# Lint y tipo
npx tsc --noEmit && npx eslint src/
```

### GUI / Web

- **React DevTools:** Extensión de navegador (Chrome/Firefox) para inspeccionar árbol de componentes, estado, props, y perfilador de renders
- **Vite Dev Server:** Hot Module Replacement (HMR) instantáneo — los cambios en componentes se reflejan sin recargar página
- **React Strict Mode:** Envuelve la app en `<StrictMode>` durante desarrollo para detectar efectos no limpios, APIs obsoletas, y renderizados inseguros
- **Profiler:** Pestaña "Profiler" en DevTools para identificar componentes que renderizan demasiado

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Inspeccionar componente | — | `Ctrl+Shift+C` (seleccionar en página) |
| Abrir DevTools | — | `F12` / `Ctrl+Shift+I` |
| Buscar en source | — | `Ctrl+P` |
| Tomar perfil | — | `Ctrl+Shift+F` (Profiler tab) |

---

## 7. Cheatsheet Rápido

```tsx
// Hooks esenciales
const [state, setState] = useState(initial)
useEffect(() => { /* efecto */ return () => cleanup }, [deps])
const memoized = useMemo(() => compute(a, b), [a, b])
const stableFn = useCallback(() => doThing(dep), [dep])
const ref = useRef(initialValue)

// Custom hook
function useLocalStorage<T>(key: string, init: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null
    return stored ? JSON.parse(stored) : init
  })
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value])
  return [value, setValue]
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-02-next-js-app-router` | Superconjunto | Sí |
| `07-05-state-management-frontend` | Dependiente | Sí |
| `07-03-tailwind-css-utility` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: react-ui-development
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/react
tags: [react, hooks, typescript, server-components, frontend, ui]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

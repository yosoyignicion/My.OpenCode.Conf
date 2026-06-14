---
name: state-management-patterns
description: "State management patterns manage client-side state in frontend applications following a \"local first\" philosophy: start with component state and props, lift to context or store only when truly shared"
---
# State Management Patterns

## Semantic Triggers
```
state management zustand jotai, redux toolkit state management, atomic state derived atoms, state persistence rehydratación, state management server cache, state management selector rendering
```

---

## 1. Definición Teórica

State management patterns manage client-side state in frontend applications following a "local first" philosophy: start with component state and props, lift to context or store only when truly shared. Zustand provides simple global state with TypeScript-native API and minimal boilerplate. Jotai offers atomic state with derived values and code-splitting. Redux Toolkit is for large applications needing middleware and interceptors. Server cache (TanStack Query/SWR) should be separated from client state — it handles loading, caching, and background refetching automatically.

---

## 2. Implementación de Referencia

TypeScript with Zustand (global state), Jotai (atomic state), and TanStack Query (server cache) separation.

### Ejemplo Práctico Avanzado

```typescript
// ===== PRINCIPLE: LOCAL FIRST =====
// 1. Component state → 2. Lifted state → 3. Context → 4. Store (last resort)

// ===== ZUSTAND — Global Client State =====
import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  user: { id: string; name: string; email: string } | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthState['user']>) => void;
}

const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,

        login: async (email, password) => {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          if (!response.ok) throw new Error('Login failed');

          const { user, token } = await response.json();
          set({ user, token, isAuthenticated: true });
        },

        logout: () => set({ user: null, token: null, isAuthenticated: false }),

        updateProfile: (data) => set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ token: state.token, user: state.user }),  // only persist these
      }
    ),
    { name: 'AuthStore' }
  )
);

// Selectors — subscribe to minimal slices
function useUser() {
  return useAuthStore((s) => s.user);
}

function useIsAuthenticated() {
  return useAuthStore((s) => s.isAuthenticated);
}

// ===== JOTAI — Atomic State with Derivation =====
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Base atoms
const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light');
const sidebarOpenAtom = atom(false);
const notificationsAtom = atom<Notification[]>([]);

// Derived atoms (computed, cached)
const unreadCountAtom = atom((get) =>
  get(notificationsAtom).filter((n) => !n.read).length
);

const hasUnreadAtom = atom((get) => get(unreadCountAtom) > 0);

// Async atom (fetch on read)
const userPreferencesAtom = atom(async () => {
  const response = await fetch('/api/preferences');
  return response.json();
});

// Writeable derived atom
const toggleSidebarAtom = atom(
  (get) => get(sidebarOpenAtom),
  (get, set) => set(sidebarOpenAtom, !get(sidebarOpenAtom))
);

// Usage in components
function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme}</button>;
}

function NotificationBadge() {
  const count = useAtomValue(unreadCountAtom);
  return count > 0 ? <span className="badge">{count}</span> : null;
}

// ===== TANSTACK QUERY — Server Cache (separate from client state) =====
import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 min
      gcTime: 30 * 60 * 1000,     // 30 min cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Server data — never stored in Zustand/Jotai
function useOrders(page: number) {
  return useQuery({
    queryKey: ['orders', { page }],
    queryFn: () => fetch(`/api/orders?page=${page}`).then(r => r.json()),
    placeholderData: keepPreviousData,  // keep previous while loading next page
  });
}

function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: OrderItem[]) =>
      fetch('/api/orders', { method: 'POST', body: JSON.stringify({ items }) }).then(r => r.json()),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ===== STATE ARCHITECTURE RULES =====
const stateArchitecture = {
  'Server State': {
    where: 'TanStack Query / SWR',
    examples: ['Orders', 'Products', 'Users list'],
    why: 'Auto-caching, refetching, loading states, pagination',
  },
  'Client UI State': {
    where: 'Zustand (global) / Jotai (atomic)',
    examples: ['Theme', 'Sidebar open', 'Auth token'],
    why: 'Persisted, shared across components',
  },
  'Component State': {
    where: 'useState / useReducer',
    examples: ['Form input', 'Dropdown open', 'Toggle'],
    why: 'Local only, no sharing needed',
  },
};
```

**Fuente oficial:** https://tkdodo.eu/blog/practical-react-query

### Alternativa de Implementación Específica

Python with `nonebot` for async state management or Vue with Pinia for reactive state stores.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar Zustand** | Global client state (auth, theme, cart), apps con pocos stores, TypeScript-first teams |
| **Cuándo usar Jotai** | Atomic state con derivación, code-splitting, feature modules independientes |
| **Cuándo usar Redux** | Grandes aplicaciones con middleware complejo, equipos que ya usan Redux |
| **Cuándo evitar store** | State local (useState), server data (React Query), props drilling con 1-2 niveles |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Server state en store global

**¿Qué ocasionó el error?**
Datos de API (orders, products) se guardaban en Zustand, causando datos obsoletos y falta de refetching automático.

**¿Cómo se solucionó?**
```typescript
// 🚫 Wrong: server data in client store
const useOrdersStore = create(() => ({ orders: [], loading: false }));

// ✅ Correct: server data managed by TanStack Query
function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 5 * 60 * 1000,
  });
}

// Zustand only for CLIENT state (auth, theme, UI)
const useUIStore = create(() => ({ sidebarOpen: false, theme: 'light' }));
```

**¿Por qué funciona esta técnica?**
Separar server state (TanStack Query) de client state (Zustand) evita datos obsoletos y aprovecha caching automático, refetching y loading states.

### Caso: Re-renders excesivos por selector incorrecto

**¿Qué ocasionó el error?**
Un componente subscribía a todo el store en lugar de un slice, causando re-render en cualquier cambio.

**¿Cómo se solucionó?**
```typescript
// 🚫 Wrong: subscribes to entire store
function BearCounter() {
  const state = useBearStore();  // re-renders on ANY change
  return <div>{state.bears}</div>;
}

// ✅ Correct: subscribes to minimal slice
function BearCounter() {
  const bears = useBearStore((s) => s.bears);  // only re-renders when bears changes
  return <div>{bears}</div>;
}

// Zustand uses Object.is for equality. For objects, use shallow:
function UserProfile() {
  const user = useAuthStore((s) => s.user, shallow);  // shallow compare
  return <div>{user?.name}</div>;
}
```

**¿Por qué funciona esta técnica?**
Selectores minimales previenen renders innecesarios. `shallow` evita re-renders cuando el objeto referenciado cambia pero su contenido es el mismo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "state management", "zustand", "jotai", "redux toolkit", "react query", "client state server state"
- **Prioridad de carga:** Alta — esencial para frontend
- **Dependencias:** `07-frontend-web-fullstack/05-state-management-frontend`, `07-frontend-web-fullstack/01-react-ui-development`

### Tool Integration

```json
{
  "tool_name": "state-management-patterns",
  "description": "Implements state management: Zustand for global client state, Jotai for atomic state, TanStack Query for server cache",
  "triggers": ["state management", "zustand", "jotai", "redux", "react query", "client state", "server state"],
  "context_hint": "Inject when user asks about frontend state management",
  "output_format": "code examples with Zustand, Jotai, and TanStack Query",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre manejo de estado en frontend, carga el skill state-management-patterns y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Debug Zustand store (in browser console)
useAuthStore.getState()
useAuthStore.subscribe((state) => console.log('auth changed', state))

# React Query devtools
npm run dev  # opens Query DevTools
```

### GUI / Web

- **Zustand DevTools**: Extensión Redux DevTools compatible
- **Jotai DevTools**: Panel de atoms y derivaciones
- **TanStack Query DevTools**: Visualización de queries, caché, mutations

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Debug store | `useXStore.getState()` (console) | React DevTools → Components |
| View query cache | — | TanStack DevTools → Queries tab |

---

## 7. Cheatsheet Rápido

```typescript
// Zustand: create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }))
// Jotai: const countAtom = atom(0); const doubled = atom((get) => get(countAtom) * 2)
// TanStack Query: useQuery({ queryKey: ['key'], queryFn: fetchData, staleTime: 300000 })
// Rule: server state → TanStack Query, global client state → Zustand, local → useState
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-frontend-web-fullstack/05-state-management-frontend` | Complementario | Sí |
| `07-frontend-web-fullstack/01-react-ui-development` | Complementario | Sí |
| `07-frontend-web-fullstack/04-typescript-type-system` | Complementario | No |
| `07-frontend-web-fullstack/02-next-js-app-router` | Complementario | No |
| `02-arquitectura-diseno/18-reactive-programming-extensions` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: state-management-patterns
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/35-state-management-patterns
tags: [state-management, zustand, jotai, redux-toolkit, tanstack-query, server-cache, client-state]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

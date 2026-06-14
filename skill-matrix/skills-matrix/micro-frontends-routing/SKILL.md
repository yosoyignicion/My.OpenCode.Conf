---
name: micro-frontends-routing
description: "Micro Frontends decompose a frontend into independently developed, tested, and deployed fragments owned by separate teams"
---
# Micro Frontends & Routing

## Semantic Triggers
```
micro frontends composición fragmentos, micro frontend routing shell, web components federated modules, module federation micro frontend, micro frontend integration build time runtime, frontend microservices composición
```

---

## 1. Definición Teórica

Micro Frontends decompose a frontend into independently developed, tested, and deployed fragments owned by separate teams. Integration strategies include: build-time composition (monorepo packages), run-time composition (Web Components, Module Federation), and server-side composition (SSI, Tailor, Edge Includes). The Shell application (or host) coordinates routing and decides which micro frontend(s) render for a given URL. Each micro frontend handles its own routing internally. Shared concerns (auth, navigation, layout) live in the shell.

---

## 2. Implementación de Referencia

TypeScript with Webpack Module Federation for runtime composition and Web Components for framework-agnostic integration.

### Ejemplo Práctico Avanzado

```typescript
// ===== MODULE FEDERATION (Webpack 5) =====
// host/webpack.config.js — Shell application
const { ModuleFederationPlugin } = require('webpack').container;

new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    orders: 'orders@http://orders-app:3001/remoteEntry.js',
    billing: 'billing@http://billing-app:3002/remoteEntry.js',
    shipping: 'shipping@http://shipping-app:3003/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true },
    'react-router-dom': { singleton: true },
  },
});

// remote/webpack.config.js — Micro frontend
new ModuleFederationPlugin({
  name: 'orders',
  filename: 'remoteEntry.js',
  exposes: {
    './OrdersApp': './src/App',
    './OrderList': './src/components/OrderList',
    './OrderDetail': './src/components/OrderDetail',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});

// ===== SHELL ROUTING (host) =====
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

const OrdersApp = lazy(() => import('orders/OrdersApp'));
const BillingApp = lazy(() => import('billing/BillingApp'));

function Shell() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/orders">Orders</Link>
        <Link to="/billing">Billing</Link>
      </nav>
      <main>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/orders/*" element={<OrdersApp />} />
            <Route path="/billing/*" element={<BillingApp />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}

// ===== WEB COMPONENTS INTEGRATION (framework-agnostic) =====
// Each micro frontend exports as a Web Component
class OrdersMicroFrontend extends HTMLElement {
  private reactRoot: Root | null = null;

  connectedCallback() {
    const mountPoint = document.createElement('div');
    this.appendChild(mountPoint);
    this.reactRoot = createRoot(mountPoint);
    this.reactRoot.render(React.createElement(OrdersApp));
  }

  disconnectedCallback() {
    this.reactRoot?.unmount();
  }
}
customElements.define('orders-mfe', OrdersMicroFrontend);

// Shell uses it like any HTML element
function ShellWithWebComponents() {
  return (
    <div>
      <h1>Shell</h1>
      <orders-mfe route="/orders" />
      <billing-mfe route="/billing" />
    </div>
  );
}

// ===== EVENT BUS FOR CROSS-MFE COMMUNICATION =====
// lightweight pub/sub for cross-micro frontend communication
class CrossMFEBus {
  private listeners = new Map<string, Set<Function>>();

  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(h => h(data));
  }

  off(event: string, handler: Function): void {
    this.listeners.get(event)?.delete(handler);
  }
}

const mfeBus = new CrossMFEBus();

// Orders MFE emits when order is placed
mfeBus.emit('order:placed', { orderId: '123' });

// Billing MFE listens
mfeBus.on('order:placed', (data) => {
  console.log('Billing: invoice order', data.orderId);
});
```

**Fuente oficial:** https://micro-frontends.org/

### Alternativa de Implementación Específica

Single SPA framework for orchestrating multiple frameworks (React, Vue, Angular) in one page. Use SystemJS for module loading.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Equipos frontend grandes y autónomos, migración incremental de frontend monolítico, aplicaciones multi-equipo con diferentes stacks |
| **Cuándo evitar** | Equipos pequeños, aplicaciones simples, cuando el overhead de integración y bundle size no justifica la modularidad |
| **Alternativas** | Monorepo (paquetes compartidos, mismo deploy), Monolito (simplicidad), Iframes (aislamiento fuerte, UX pobre) |
| **Coste/Complejidad** | Alta. Gestión de versiones compartidas, duplicación de dependencias, coordinación entre equipos. Performance impact por múltiples bundles |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Duplicación de React en el bundle

**¿Qué ocasionó el error?**
Cada micro frontend incluía su propia copia de React, resultando en 3 instancias de React en la misma página.

**¿Cómo se solucionó?**
```typescript
// Module Federation shared singleton
new ModuleFederationPlugin({
  shared: {
    react: {
      singleton: true,          // solo una instancia
      requiredVersion: '^18.0.0',
      eager: true,              // cargar inmediatamente
    },
    'react-dom': { singleton: true },
  },
});
```

**¿Por qué funciona esta técnica?**
Module Federation garantiza que las dependencias compartidas se carguen una sola vez con la versión más alta requerida.

### Caso: Routing conflict entre micro frontends

**¿Qué ocasionó el error?**
Dos micro frontends intentaban controlar el router al mismo tiempo, causando conflictos de navegación.

**¿Cómo se solucionó?**
```typescript
// Shell es el único que gestiona el router a nivel superior
// Cada MFE usa la ruta que el shell le proporciona

// Shell define el prefijo de ruta
<Route path="/orders/*" element={<OrdersApp />} />
<Route path="/billing/*" element={<BillingApp />} />

// Cada MFE recibe el path base del shell y hace routing interno relativo
function OrdersApp() {
  const { path } = useRouteMatch();  // "/orders"
  return (
    <Routes>
      <Route path={`${path}/list`} element={<OrderList />} />
      <Route path={`${path}/:id`} element={<OrderDetail />} />
    </Routes>
  );
}
```

**¿Por qué funciona esta técnica?**
El shell controla el namespace de rutas y pasa el path base a cada MFE. Cada MFE hace routing relativo a su propio prefijo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "micro frontend", "module federation", "frontend decomposition", "shell routing", "web components federated"
- **Prioridad de carga:** Media — relevante para equipos frontend grandes
- **Dependencias:** `02-arquitectura-diseno/14-modular-monolithic-design`, `07-frontend-web-fullstack/02-next-js-app-router`

### Tool Integration

```json
{
  "tool_name": "micro-frontends-routing",
  "description": "Implements Micro Frontends: Module Federation, Web Components integration, Shell routing, cross-MFE communication",
  "triggers": ["micro frontend", "module federation", "shell", "mf routing", "frontend decomposition"],
  "context_hint": "Inject when user asks about splitting frontend or multi-team frontend architectures",
  "output_format": "code examples with Module Federation and Web Component integration",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre micro frontends o federación de módulos, carga el skill micro-frontends-routing
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Build all micro frontends
npm run build --workspaces
# Start shell with remotes
MFE_ORDERS=http://localhost:3001 MFE_BILLING=http://localhost:3002 npm start
# Analyze bundle duplication
npx webpack-bundle-analyzer dist/stats.json
```

### GUI / Web

- **Module Federation Dashboard**: Visualización de remotes y shared modules
- **Single SPA DevTools**: Inspección de micro frontends registrados
- **Chrome DevTools**: Network tab para ver remoteEntry.js loading

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Build all MFEs | `npm run build --workspaces` | — |
| Analyze bundles | `npx webpack-bundle-analyzer dist/stats.json` | — |

---

## 7. Cheatsheet Rápido

```typescript
// Host exposes: remote MFEs via ModuleFederationPlugin
// Remote exposes: components via ModuleFederationPlugin.exposes
// Shell routes: <Route path="/mfe/*" element={<MFE />} />
// Shared: react, react-dom with singleton:true
// Cross-MFE: event bus (pub/sub) or shared store
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/14-modular-monolithic-design` | Complementario | Sí |
| `07-frontend-web-fullstack/02-next-js-app-router` | Alternativa | No |
| `02-arquitectura-diseno/16-api-gateway-bff-patterns` | Complementario (backend) | No |
| `02-arquitectura-diseno/22-micro-frontends-routing` | — | — |

---

## 9. Metadatos del Skill

```yaml
---
id: micro-frontends-routing
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [micro-frontends, module-federation, shell, routing, web-components, frontend-decomposition]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*

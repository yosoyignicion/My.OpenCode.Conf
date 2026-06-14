---
name: tailwind-css-utility
description: "Tailwind CSS es un framework CSS utility-first que proporciona clases atómicas de bajo nivel para construir diseños directamente en el marcado. Covers Tailwind v4, Shadcn/ui, Radix Primitives, design systems, theming, CSS variables, accesibilidad, Headless UI, oklch color, oxide engine"
---
# Tailwind CSS Utility

## Semantic Triggers
```
Tailwind CSS v4 utility-first responsive design system, @theme directive custom design tokens, dark mode with dark: variant, container queries @container responsive, arbitrary values with square bracket syntax, prettier-plugin-tailwindcss class ordering
```

---

## 1. Definición Teórica

Tailwind CSS es un framework CSS utility-first que proporciona clases atómicas de bajo nivel para construir diseños directamente en el marcado. A diferencia de frameworks tradionales como Bootstrap (orientados a componentes predefinidos), Tailwind no impone estilos visuales: cada clase utility controla una única propiedad CSS (`flex`, `pt-4`, `text-center`). Esto elimina la lucha de nombres de clases CSS, reduce la especificidad, y produce bundles mínimos gracias a PurgeCSS (solo se incluyen las clases realmente usadas). La versión 4 introduce `@theme` para tokens de diseño personalizados en CSS nativo, sin archivo de configuración JavaScript.

---

## 2. Implementación de Referencia

Tailwind CSS v4 con el plugin `@tailwindcss/vite` para proyectos Vite, o `@tailwindcss/postcss` para otros bundlers. Se instala como dependencia de desarrollo y se importa en el CSS principal con `@import "tailwindcss"`. El autocompletado en IDE requiere la extensión oficial Tailwind CSS IntelliSense.

### Ejemplo Práctico Avanzado

```html
<!-- Responsive grid + dark mode + transitions + container queries -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
      Card Title
    </h3>
    <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
      Content that will be clamped to two lines on small screens.
    </p>
    <div class="mt-4 flex items-center gap-2">
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
        Active
      </span>
    </div>
  </div>
</div>

<!-- Container queries (v4) -->
<div class="@container">
  <div class="@lg:grid-cols-3 grid-cols-1 grid gap-4">
    <div class="@md:flex-row flex-col flex p-4">
      <img class="@md:w-32 w-full rounded-lg" src="thumb.jpg" alt="" />
      <div class="@md:ml-4 mt-2 @md:mt-0">
        <h2 class="text-lg font-bold">Title</h2>
        <p class="text-sm">Description</p>
      </div>
    </div>
  </div>
</div>

<!-- Arbitrary values + modern features -->
<div class="top-[calc(100vh-4rem)] left-1/2 -translate-x-1/2 fixed
            bg-[#1da1f2] text-[clamp(1rem,2.5vw,1.5rem)]
            backdrop-blur-md bg-white/70 dark:bg-gray-900/70
            supports-[backdrop-filter]:bg-white/50">
  Backdrop blur with fallback
</div>
```

```css
/* app.css — v4 @theme directive (reemplaza tailwind.config.js) */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-primary-dark: #2563eb;
  --color-primary-light: #93c5fd;
  --font-display: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --breakpoint-xs: 30rem;
  --animate-fade-in: fade-in 0.5s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* @apply se reserva solo para componentes de librería */
@utility btn-primary {
  @apply inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg font-medium
         hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light
         transition-colors duration-200;
}
```

**Fuente oficial:** https://tailwindcss.com/docs

### Alternativa de Implementación Específica

**UnoCSS** para proyectos que necesitan un enfoque aún más ligero (sin generación de clases). UnoCSS es un motor "atomic CSS on-demand" que genera solo las utilidades que detecta en el código, sin necesidad de configuración. Compatible con sintaxis Tailwind.

```html
<!-- UnoCSS — mismo markup, genera CSS bajo demanda -->
<div class="flex items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg">
  <div class="i-ph-user-circle-fill text-2xl text-blue-500" />
  <span class="text-sm font-medium">User Name</span>
</div>
```

**Fuente oficial:** https://unocss.dev/

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier proyecto web con diseño personalizado; equipos que priorizan consistencia y velocidad de desarrollo |
| **Cuándo evitar** | Proyectos que necesitan temas intercambiables completos (CSS variables + theme switcher es más apropiado); equipos que prefieren CSS tradicional con nombres semánticos |
| **Alternativas** | CSS Modules + CSS custom properties (más control, menos herramientas); Styled Components (CSS-in-JS, dynamic styles); UnoCSS (más ligero, on-demand) |
| **Coste/Complejidad** | Bajo — la curva de aprendizaje inicial es empinada (aprender ~50 clases comunes), pero una vez dominado acelera el desarrollo 2-3x. El bundle final es mínimo. No hay runtime |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Las clases personalizadas de `@theme` no aparecen en IntelliSense

**¿Qué ocasionó el error?**
Tailwind v4 mueve la configuración a CSS. La extensión IntelliSense requiere el archivo CSS referenciado desde la configuración del workspace.

**¿Cómo se solucionó?**
Configurar `tailwindCSS.experimental.configFile` en `.vscode/settings.json`:

```json
{
  "tailwindCSS.experimental.configFile": "src/app.css"
}
```

**¿Por qué funciona esta técnica?**
La extensión IntelliSense necesita saber dónde buscar las definiciones de `@theme`. En v3, era `tailwind.config.js`. En v4, se apunta al archivo CSS principal.

### Caso: `@apply` no funciona en `@layer components`

**¿Qué ocasionó el error?**
Usar `@apply` fuera de contexto produce advertencias porque Tailwind v4 cambió el sistema de capas.

**¿Cómo se solucionó?**
Usar `@utility` en lugar de `@apply` para componentes reutilizables:

```css
/* ✅ v4: @utility para componentes personalizados */
@utility card {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-md p-6;
}
```

**¿Por qué funciona esta técnica?**
`@utility` es la nueva directiva de Tailwind v4 para definir utilidades compuestas, reemplazando el patrón v3 de `@layer components { .card { @apply ... } }`. Es más predecible y tiene mejor soporte de IntelliSense.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "tailwind", "css", "utility class", "responsive design" o "styling" en la consulta
- **Prioridad de carga:** Alta — Tailwind es el estándar de facto para CSS en React/Next.js
- **Dependencias:** `07-01-react-ui-development` o `07-02-next-js-app-router` según el contexto

### Tool Integration

```json
{
  "tool_name": "tailwind-css-utility",
  "description": "Guía de Tailwind CSS v4 con @theme, responsive, dark mode, container queries y utilidades",
  "triggers": ["tailwind", "css", "styling", "utility-first", "responsive", "dark mode"],
  "context_hint": "Inyectar ejemplos de código HTML/JSX de la sección 2. La sección 4 (FAQ) para problemas de configuración.",
  "output_format": "markdown",
  "max_tokens": 2600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre estilado CSS o Tailwind, carga el skill tailwind-css-utility
y responde con ejemplos de clases utility. Prioriza el enfoque utility-first
sobre @apply para componentes simples.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Instalar en proyecto Vite
npm install tailwindcss @tailwindcss/vite

# O con PostCSS
npm install tailwindcss @tailwindcss/postcss postcss

# Analizar bundle CSS
npx tailwindcss --help

# Ver clases usadas en producción
npm run build && grep -oP 'class="[^"]*"' .next/server/pages/*.html | tr ' ' '\n' | sort -u
```

### GUI / Web

- **Tailwind CSS IntelliSense (VS Code):** Autocompletado de clases, preview de colores, linting de clases
- **Tailwind Play:** https://play.tailwindcss.com — playground online para prototipado rápido
- **Tailwind UI:** Componentes premium preconstruidos (pagados) con markup Tailwind
- **Headless UI:** Componentes accesibles sin estilo (combinan con Tailwind)
- **Browser DevTools:** Inspeccionar elementos muestra las clases utility aplicadas; modificar clases en vivo

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ordenar clases | `npx prettier --write src/` | `Alt+Shift+F` (con plugin) |
| Preview clase | — | Hover sobre clase en VS Code |
| Toggle color picker | — | Hover sobre `bg-` / `text-` |
| Abrir Tailwind Play | — | https://play.tailwindcss.com |

---

## 7. Cheatsheet Rápido

```html
<!-- Layout -->
<div class="flex items-center justify-between gap-4 grid-cols-3 p-4"></div>

<!-- Spacing -->
<div class="m-4 p-2 mx-auto space-y-2"></div>

<!-- Typography -->
<p class="text-sm font-medium leading-relaxed tracking-wide truncate"></p>

<!-- Colors -->
<div class="bg-blue-500 text-white dark:bg-gray-800 dark:text-gray-100"></div>

<!-- Responsive -->
<div class="w-full md:w-1/2 lg:w-1/3 xl:w-1/4"></div>

<!-- States -->
<button class="hover:bg-blue-600 focus:ring-2 active:scale-95 disabled:opacity-50"></button>

<!-- Dark mode -->
<div class="bg-white dark:bg-gray-900 text-black dark:text-white"></div>
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-01-react-ui-development` | Complementario | Sí |
| `07-02-next-js-app-router` | Complementario | Sí |
| `07-06-a11y-accessibility-wcag` | Complementario | No |
| `07-04-typescript-type-system` | Independiente | No |

---

## 9. Metadatos del Skill

```yaml
---
id: tailwind-css-utility
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/tailwind-css
tags: [tailwind, css, utility-first, responsive, design-system, frontend]
---
```

---

## Comparativa 2026 / Ecosystem

### Arquitectura de 3 Capas para UI Moderna

| Capa | Tecnología | Versión | Bundle | Enfoque |
|------|-----------|---------|--------|---------|
| Utilidad | Tailwind CSS | v4 (2025) | ~10KB (purgeado) | CSS utility-first, build engine Rust |
| Componentes | Shadcn/ui | 2.9 | Solo los que usas | Copy-paste (no dependencia npm) |
| Primitivas | Radix | 1.2 | Árbol de módulos | Headless + WAI-ARIA accessible |

### Tailwind v4 — Cambios Críticos

- **CSS-First Configuration:** Elimina `tailwind.config.js`. Todo se configura con `@theme` en CSS nativo. `--color-primary: oklch(0.5 0.2 25)` genera automáticamente `bg-primary`, `text-primary`, etc.
- **Oxide Engine:** Build engine en Rust basado en Lightning CSS. Builds 50-70% más rápidos (10K+ classes: 300ms vs 1.2s v3). No depende de PostCSS obligatorio.
- **`@import "tailwindcss"`** reemplaza `@tailwind base/components/utilities`. Una sola importación.
- **Detección automática de contenido:** Sin `content` paths. Escanea `.js/.jsx/.ts/.tsx/.vue/.svelte/.astro/.html/.mdx` automáticamente.
- **Espacio oklch():** Percepción uniforme de color, gamut Display P3. `oklch(0.55 0.22 25)` para rojo, `oklch(0.55 0.22 260)` para azul.
- **Nuevas utilities v4:** `container-3xl`, `text-balance`, `field-sizing-content`, `overscroll-contain`.

### Shadcn/ui (2.9) — Componentes Copiables

- **No es dependencia npm:** Es un CLI que genera código en `components/ui/`. Control total del código.
- **Theming con CSS Variables:** `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--card`, `--border`, `--radius` con oklch. Cada preset (`default`, `new-york`) define el set.
- **v4 con Base UI:** Alternativa a Radix como backend. `npx shadcn@latest init --backend base-ui` para Material Design integration.
- **components.json:** Style, baseColor, cssVariables, aliases (`@/components`, `@/lib/utils`).

### Radix Primitives (1.2) — 30+ Componentes Headless

| Primitiva | Característica clave |
|-----------|---------------------|
| Dialog | Modal accesible, focus trap, esc para cerrar |
| Popover | Posicionamiento con flip/avoid collisions |
| DropdownMenu | Submenús anidados, keyboard navigation |
| Select | Combobox pattern, typeahead |
| Tabs | Activación por teclado, orientación |
| Tooltip | Delay group, positioning |
| Toast | Stack, swipe to dismiss |
| Checkbox | Indeterminate state, tri-state |

- **Composición dot-notation:** `<Dialog.Root>` → `<Dialog.Trigger>` → `<Dialog.Portal>` → `<Dialog.Overlay>` → `<Dialog.Content>`.
- **WAI-ARIA compliance completa:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` automático.
- **Keyboard navigation:** Tab, Arrow, Enter, Esc, Home/End según primitiva.
- **React 19:** `ref` como prop (no más `forwardRef`), Server Components compatible.

### Integración de las 3 Capas

```
CSS Variables (oklch) → @theme (Tailwind v4) → cn() + Tailwind classes (Shadcn) → Radix Primitives (a11y)
```

Dark mode automático: `.dark` selector sobreescribe las CSS variables. `next-themes` para theme switching en runtime.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with sistemas-ui-estilado)*

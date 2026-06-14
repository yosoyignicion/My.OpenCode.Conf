---
name: a11y-accessibility-wcag
description: "La accesibilidad web (a11y) garantiza que las personas con discapacidades puedan percibir, operar, entender y navegar por el contenido web. Covers WCAG 2.2, contraste, inclusión, daltonismo, ARIA, discapacidad visual, diseño inclusivo, Microsoft Inclusive Design Toolkit"
---
# Accessibility (a11y) & WCAG

## Semantic Triggers
```
WCAG 2.2 AA AAA POUR principles accessibility, ARIA roles states properties live regions, keyboard navigation focus management skip link, color contrast ratios prefers-reduced-motion, axe-core Playwright a11y testing, semantic HTML landmarks heading hierarchy
```

---

## 1. Definición Teórica

La accesibilidad web (a11y) garantiza que las personas con discapacidades puedan percibir, operar, entender y navegar por el contenido web. Las WCAG 2.2 (Web Content Accessibility Guidelines) se organizan en cuatro principios POUR: Perceivable (perceptible), Operable (operable), Understandable (comprensible), Robust (robusto). El nivel AA es el estándar legal mínimo (ADA, EU Accessibility Act, RGPD a11y). El enfoque recomendado es HTML semántico primero, ARIA solo cuando el HTML nativo es insuficiente. La jerarquía de encabezados, el contraste de color (4.5:1 texto normal, 3:1 texto grande), y la navegación por teclado son los puntos de partida no negociables.

---

## 2. Implementación de Referencia

Semantic HTML + ARIA donde sea necesario + focus management + testing con axe-core. Playwright con `axe-playwright` para CI. Contraste 4.5:1 mínimo (AA). `prefers-reduced-motion` para animaciones.

### Ejemplo Práctico Avanzado

```html
<!-- Semantic HTML + landmarks -->
<header role="banner">
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
  <a href="#main-content" class="skip-link">Skip to content</a>
</header>

<main id="main-content">
  <h1>Page Title</h1>
  <article aria-labelledby="article-1-title">
    <h2 id="article-1-title">Article 1</h2>
    <p>Content with <a href="/more">more details</a>.</p>
  </article>
</main>

<aside aria-label="Related content">
  <h2>Related</h2>
  <ul><li><a href="/related">Link</a></li></ul>
</aside>

<footer role="contentinfo">
  <p>&copy; 2026 Company</p>
</footer>
```

```html
<!-- ARIA Tab pattern -->
<div role="tablist" aria-label="Content tabs">
  <button role="tab" aria-selected="true" aria-controls="panel-overview" id="tab-overview" tabindex="0">
    Overview
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-details" id="tab-details" tabindex="-1">
    Details
  </button>
</div>
<div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
  <p>Overview content here.</p>
</div>
<div role="tabpanel" id="panel-details" aria-labelledby="tab-details" hidden>
  <p>Details content here.</p>
</div>

<!-- Live region for notifications -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {{ notificationMessage }}
</div>

<!-- Progressbar -->
<div role="progressbar" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
  25%
</div>

<!-- Alert dialog -->
<div role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Deletion</h2>
  <p>Are you sure you want to delete this item?</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

```javascript
// Focus trap for modals
function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  element.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  })
  first.focus()
}
```

```css
/* Color & motion */
:root {
  --text-primary: #1a1a1a;       /* 14.8:1 on white — AAA */
  --text-secondary: #595959;      /* 4.7:1 (AA OK) */
  --text-disabled: #a0a0a0;      /* 2.9:1 — solo decorativo */
}

@media (prefers-contrast: more) {
  :root {
    --text-primary: #000;
    --text-secondary: #000;
    --border-default: 2px solid #000;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```javascript
// Playwright a11y check
import { injectAxe, checkA11y } from "axe-playwright"
import { test, expect } from "@playwright/test"

test("homepage has no a11y violations", async ({ page }) => {
  await page.goto("/")
  await injectAxe(page)
  const results = await checkA11y(page, null, {
    includedImpacts: ["critical", "serious"],
  })
  expect(results.violations).toEqual([])
})
```

**Fuente oficial:** https://www.w3.org/WAI/ARIA/apg/patterns/

### Alternativa de Implementación Específica

**Headless UI + Radix** para componentes accesibles ya implementados. Estas librerías proporcionan componentes (dialog, tabs, menu, combobox) con ARIA completo, focus management, y keyboard navigation ya resueltos.

```tsx
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react"

function MyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6">
          <DialogTitle className="text-lg font-bold">Dialog Title</DialogTitle>
          <p>Dialog content.</p>
          <button onClick={onClose}>Close</button>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
```

**Fuente oficial:** https://headlessui.com/react/dialog

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Siempre — la accesibilidad no es opcional. Mínimo WCAG AA es requisito legal en la mayoría de jurisdicciones |
| **Cuándo evitar** | N/A — no hay excusa para no implementar a11y básico |
| **Alternativas** | Component libraries with built-in a11y (Radix, Headless UI, Reach UI) vs custom components with manual ARIA |
| **Coste/Complejidad** | Medio — el HTML semántico es gratis. ARIA complejo (tabs, modales, tree) requiere testing cuidadoso. Las herramientas de testing (axe) automatizan la detección. El coste de no hacerlo es mucho mayor (riesgo legal, pérdida de usuarios) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: `aria-label` no se lee en todos los screen readers

**¿Qué ocasionó el error?**
`aria-label` solo funciona en elementos interactivos o con rol explícito. En elementos estáticos como `<div>` o `<span>`, los screen readers pueden ignorarlo.

**¿Cómo se solucionó?**
Usar `aria-labelledby` apuntando a un elemento visible, o combinar con `role` apropiado:

```html
<!-- ❌ aria-label en div sin rol — puede ser ignorado -->
<div aria-label="Menu">...</div>

<!-- ✅ role="navigation" explícito -->
<nav aria-label="Main">...</nav>

<!-- ✅ O aria-labelledby con texto visible -->
<section aria-labelledby="section-title">
  <h2 id="section-title">Section Title</h2>
</section>
```

**¿Por qué funciona esta técnica?**
Los screen readers anuncian `aria-label` solo en elementos que tienen un rol interactivo o landmark. `aria-labelledby` es más universal porque referencia contenido visible.

### Caso: Skip link no funciona en componentes client-side

**¿Qué ocasionó el error?**
Los skip links tradicionales (ancla `#main`) no funcionan en SPAs porque el hash change no desplaza el foco sin recarga de página programática.

**¿Cómo se solucionó?**
Manejar el skip link con JavaScript para mover el foco programáticamente:

```tsx
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById("main-content")?.focus()
      }}
    >
      Skip to content
    </a>
  )
}
```

**¿Por qué funciona esta técnica?**
Mover el foco programáticamente con `.focus()` garantiza que el screen reader y la navegación por teclado salten al contenido principal, incluso en aplicaciones client-side donde el hash no provoca scroll por defecto.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "accesibilidad", "a11y", "wcag", "aria", "screen reader", "508", "ada" en la consulta
- **Prioridad de carga:** Alta — requisito legal y ético en todo desarrollo web
- **Dependencias:** `07-03-tailwind-css-utility` (clases para contraste), `07-01-react-ui-development` (componentes accesibles)

### Tool Integration

```json
{
  "tool_name": "a11y-accessibility-wcag",
  "description": "Guía de accesibilidad web WCAG 2.2: HTML semántico, ARIA, focus management, contraste, testing con axe",
  "triggers": ["accesibilidad", "a11y", "wcag", "aria", "screen reader", "contraste", "discapacidad"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de HTML semántico y ARIA. FAQ para problemas comunes de screen readers.",
  "output_format": "markdown",
  "max_tokens": 3100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre accesibilidad web, carga el skill a11y-accessibility-wcag.
Prioriza HTML semántico antes que ARIA. Recomienda axe-core en CI.
El nivel AA es el mínimo legal.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Instalar axe-core + Playwright
npm install -D @axe-core/playwright axe-playwright

# Ejecutar tests a11y en CI
npx playwright test --grep @a11y

# Lighthouse CLI para auditoría a11y
npx lighthouse https://example.com --preset=desktop --output=json --quiet

# Contrast checker CLI
npx color-contrast-checker --foreground #1a1a1a --background #ffffff

# Validador HTML
npx nu-html-checker dist/index.html
```

### GUI / Web

- **axe DevTools (extensión browser):** Analiza cualquier página web y muestra violaciones WCAG categorizadas por severidad
- **Lighthouse (Chrome DevTools):** Pestaña "Lighthouse" → marcar "Accessibility" → genera reporte con score y sugerencias
- **WAVE (extensión browser):** Visualiza la estructura de la página: landmarks, headings, ARIA, contraste
- **Color Contrast Analyzer:** Extensión que inspecciona colores y calcula ratio de contraste en vivo
- **Storybook a11y addon:** `@storybook/addon-a11y` — tests visuales de accesibilidad en cada componente

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Skip link | — | `Tab` al cargar página |
| Abrir axe panel | — | `Ctrl+Shift+I` → axe tab |
| Lighthouse audit | `npx lighthouse <url>` | Lighthouse tab → Generate report |
| Tab navigation | — | `Tab` / `Shift+Tab` |
| Activar elemento | — | `Enter` / `Space` |

---

## 7. Cheatsheet Rápido

```html
<!-- HTML semántico mínimo -->
<header><nav aria-label="Main"><ul><li><a href="/">Home</a></li></ul></nav></header>
<main><h1>Title</h1><article><h2>Subtitle</h2></article></main>
<footer role="contentinfo"><p>&copy; 2026</p></footer>

<!-- ARIA esencial -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<div role="alert" aria-live="assertive">Error message</div>
<img src="deco.jpg" alt="" /> <!-- decorativo -->
<img src="chart.png" alt="Sales Q1-Q4: upward trend from 100 to 500" /> <!-- informativo -->

<!-- Focus visible -->
:focus-visible { outline: 2px solid blue; outline-offset: 2px; }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-03-tailwind-css-utility` | Complementario | Sí |
| `07-01-react-ui-development` | Complementario | Sí |
| `07-07-playwright-e2e-testing` | Complementario | Sí |
| `07-04-typescript-type-system` | Independiente | No |

---

## 9. Metadatos del Skill

```yaml
---
id: a11y-accessibility-wcag
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/a11y
tags: [accessibility, a11y, wcag, aria, inclusive-design, frontend]
---
```

---

## Comparativa 2026 / Ecosystem

### Fórmula de Luminancia Relativa (WCAG 2.1, 1.4.3)

```
L = 0.2126 × R_sRGB + 0.7152 × G_sRGB + 0.0722 × B_sRGB
Ratio = (L1 + 0.05) / (L2 + 0.05)
```

### Niveles de Cumplimiento

| Nivel | Texto normal | Texto grande (≥18pt o ≥14pt bold) | Componentes UI |
|-------|-------------|-----------------------------------|----------------|
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | — |

### Paleta Validada (Caso Práctico)

| Rol | Hex | Contraste sobre #111 | Nivel |
|-----|-----|---------------------|-------|
| Primario | #DC2626 | 4.5:1 | AA |
| Secundario (decorativo) | #991B1B | 2.8:1 | — |
| Acento | #FFFFFF | 18:1 | AAA |
| Detalle | #FF1744 | 6.1:1 | AA |

**Caso:** Rojo #DC2626 sobre #1A1A1A = 4.51:1 — cumple AA por poco. Para AAA se necesita rojo más claro.

### Mitigaciones cuando no se alcanza el ratio

1. Añadir stroke de alto contraste (1px border)
2. Ajustar luminancia (+10% brightness en texto)
3. Sombra/glow que mejora percepción sin cambiar color base
4. Fondo de protección (rectángulo semitransparente detrás del texto)

### Microsoft Inclusive Design Toolkit — 3 Principios

1. **Reconocer la exclusión:** Diseñar desde el borde. Si funciona para baja visión en pantalla pequeña con mala luz, funciona para todos.
2. **Resolver para uno, extender a muchos:** Alto contraste ayuda también en exteriores. Iconos sin texto ayudan a no hablantes nativos.
3. **Aprender de la diversidad:** 7 dimensiones relevantes: visión, físico, cognitivo, lenguaje, cultural, generacional.

### Percepción Universal

La insignia/componente debe comunicar por al menos **dos canales sensoriales**. No usar solo color — añadir forma + texto.

```xml
<!-- Excluyente: solo color -->
<path d="..." fill="#DC2626"/>

<!-- Inclusivo: color + forma + texto -->
<path d="..." fill="#DC2626"/>
<path d="estrella" fill="#FFF" opacity="0.8"/>
<text>NV. 5</text>
```

### Daltonismo — Tipos y Prevalencia

| Tipo | Prevalencia | Problema |
|------|-------------|----------|
| Deuteranopia | 6% hombres | Rojo/verde indistinguibles |
| Protanopia | 2% hombres | Rojo aparece casi negro sobre fondo oscuro |
| Tritanopia | 0.01% | Azul/amarillo confusos |

**Simulación:** Color Oracle (filtro full-screen), Stark (plugin Figma), Chrome DevTools (Emulate vision deficiencies).

### Baja Visión — Tamaños Mínimos

| Elemento | Tamaño mínimo a 36×36 |
|----------|----------------------|
| Texto | 8px |
| Icono simple | 12×12px (~33%) |
| Borde funcional | 2px (preferible 3px) |
| Stroke | 1.5px mínimo absoluto |

Componente debe ser reconocible al 200% de zoom.

### Screen Readers — ARIA para SVG

```html
<!-- MAL: solo descripción visual -->
<img src="badge.png" alt="Círculo rojo con número 5">

<!-- BIEN: significado + contexto -->
<img src="badge.png" alt="Insignia Nivel 5: Velocidad máxima alcanzada" role="img">

<!-- SVG inline con ARIA -->
<svg role="img" aria-label="Insignia Nivel 5 - Velocidad">
  <title>Nivel 5: Velocidad</title>
  <desc>Escudo rojo con número 5 en el centro, borde plateado</desc>
</svg>
```

ARIA para SVG:
- `role="img"` trata el SVG como imagen
- `aria-label` o `aria-labelledby` para texto descriptivo
- `aria-hidden="true"` para componentes decorativos

### Touch Targets

| Estándar | Mínimo |
|----------|--------|
| Apple HIG | 44×44 pt |
| Material Design | 48×48 dp |
| WCAG 2.5.5 | 44×44 px |

Si el componente mide 36×36px pero es interactivo, usar wrapper de 44×44px con padding.

### High Contrast Mode y Reduced Motion

```css
@media (forced-colors: active) {
  .badge-img { border: 1px solid CanvasText; }
  .badge-svg path { fill: CanvasText; }
}

.badge-wrapper:focus-visible {
  outline: 2px solid #DC2626;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .badge-animated { animation: none; }
}
```

### Inclusión Cultural en Simbología

Cada símbolo tiene significados distintos según cultura:

| Símbolo | Occidente | Latinoamérica | Medio Oriente |
|---------|-----------|---------------|---------------|
| Calavera | Peligro | Celebración/Muerte | Muerte, tabú |
| Cruz | Religión/Decoración | Religión | Religión |
| Cuernos | Metal/Rebeldía | Metal/Rebeldía | Ofensivo |
| Ojo | Vigilancia | Neutral | Mal de ojo |

**Reglas:** No usar rayo doble simétrico (evoca SS nazi — ilegal en Alemania). Calavera contextualizada. Símbolos religiosos solo si el tema lo requiere. Sin apropiación de símbolos sagrados indígenas.

### Checklist Final de Accesibilidad Inclusiva

- [ ] Todos los textos funcionales ≥ 4.5:1
- [ ] Iconos informativos ≥ 3:1
- [ ] No depende solo de color para comunicar
- [ ] Alt text descriptivo con significado (no descripción visual)
- [ ] Touch target ≥ 44×44px
- [ ] Zoom al 200% mantiene legibilidad
- [ ] Sin animaciones > 3Hz
- [ ] Testeado en 3 tipos de daltonismo
- [ ] Funciona en modo claro y oscuro
- [ ] Animaciones respetan `prefers-reduced-motion`
- [ ] Símbolos culturalmente apropiados para audiencia objetivo
- [ ] axe-core en CI con severidad critical/serious

### Herramientas de Medición

- **axe-core:** Testing automatizado de contraste en SVGs renderizados
- **WebAIM Contrast Checker:** Cálculo de ratio y sugerencias
- **Lighthouse:** Reporte integrado en Chrome DevTools
- **Contrast Finder:** Encuentra variante del color que cumple AAA
- **Color Oracle / Stark:** Simulación de daltonismo

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with accessibility-design)*

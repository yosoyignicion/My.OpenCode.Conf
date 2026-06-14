---
name: design-systems-atomic
description: "Design Systems provide a single source of truth for UI components, patterns, and design decisions. Covers branding, brand identity, visual identity, tokens, atomic design, storybook, guía de estilo, coherencia, escalabilidad, arquitectura visual"
---
# Design Systems & Atomic Design

## Semantic Triggers
```
design system tokens colores tipografía, atomic design atoms molecules organisms, design tokens w3c formato, design system categories components, design system tema dark mode, design system tailwind css vars
```

---

## 1. Definición Teórica

Design Systems provide a single source of truth for UI components, patterns, and design decisions. Atomic Design organizes components hierarchically: Atoms (button, input, label), Molecules (search bar combining atoms), Organisms (header combining molecules), Templates (page layout with organisms), Pages (contextualized instances with real content). Design tokens (W3C standard) store design decisions as platform-agnostic values (color, typography, spacing). Tokens enable consistent theming across platforms (web, mobile, CLI) and support dark mode via token substitution.

---

## 2. Implementación de Referencia

TypeScript with W3C Design Tokens format, CSS variable generation, and Atomic Design component hierarchy.

### Ejemplo Práctico Avanzado

```typescript
// ===== DESIGN TOKENS (W3C Format) =====
// tokens.json — platform-agnostic design decisions

interface DesignToken {
  $type: 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'borderRadius' | 'shadow' | 'spacing';
  $value: string | number | Record<string, unknown>;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

interface DesignTokens {
  [category: string]: {
    [token: string]: DesignToken;
  };
}

const tokens: DesignTokens = {
  color: {
    'primary': { $type: 'color', $value: '#6366f1', $description: 'Primary brand color' },
    'primary-hover': { $type: 'color', $value: '#4f46e5' },
    'primary-foreground': { $type: 'color', $value: '#ffffff' },
    'surface': { $type: 'color', $value: '#ffffff' },
    'surface-alt': { $type: 'color', $value: '#f9fafb' },
    'text': { $type: 'color', $value: '#111827' },
    'text-secondary': { $type: 'color', $value: '#6b7280' },
    'border': { $type: 'color', $value: '#e5e7eb' },
    'error': { $type: 'color', $value: '#ef4444' },
    'success': { $type: 'color', $value: '#22c55e' },
    'warning': { $type: 'color', $value: '#f59e0b' },
    // Dark mode (alternative palette)
    'primary-dark': { $type: 'color', $value: '#818cf8' },
    'surface-dark': { $type: 'color', $value: '#1e1e2e' },
    'text-dark': { $type: 'color', $value: '#f3f4f6' },
  },
  font: {
    'sans': { $type: 'fontFamily', $value: 'Inter, system-ui, sans-serif' },
    'mono': { $type: 'fontFamily', $value: 'JetBrains Mono, monospace' },
    'heading': { $type: 'fontFamily', $value: 'Inter' },
  },
  fontSize: {
    'xs': { $type: 'dimension', $value: '0.75rem' },
    'sm': { $type: 'dimension', $value: '0.875rem' },
    'base': { $type: 'dimension', $value: '1rem' },
    'lg': { $type: 'dimension', $value: '1.125rem' },
    'xl': { $type: 'dimension', $value: '1.25rem' },
    '2xl': { $type: 'dimension', $value: '1.5rem' },
    '3xl': { $type: 'dimension', $value: '1.875rem' },
  },
  spacing: {
    '0': { $type: 'dimension', $value: '0px' },
    '1': { $type: 'dimension', $value: '0.25rem' },
    '2': { $type: 'dimension', $value: '0.5rem' },
    '3': { $type: 'dimension', $value: '0.75rem' },
    '4': { $type: 'dimension', $value: '1rem' },
    '5': { $type: 'dimension', $value: '1.25rem' },
    '6': { $type: 'dimension', $value: '1.5rem' },
    '8': { $type: 'dimension', $value: '2rem' },
    '10': { $type: 'dimension', $value: '2.5rem' },
    '12': { $type: 'dimension', $value: '3rem' },
    '16': { $type: 'dimension', $value: '4rem' },
  },
  borderRadius: {
    'none': { $type: 'borderRadius', $value: '0px' },
    'sm': { $type: 'borderRadius', $value: '0.125rem' },
    'md': { $type: 'borderRadius', $value: '0.375rem' },
    'lg': { $type: 'borderRadius', $value: '0.5rem' },
    'xl': { $type: 'borderRadius', $value: '0.75rem' },
    'full': { $type: 'borderRadius', $value: '9999px' },
  },
};

// ===== TOKENS TO CSS VARIABLES =====
function tokensToCSS(tokens: DesignTokens, prefix = 'ds', mode?: 'dark'): string {
  const vars: string[] = [];
  for (const [category, values] of Object.entries(tokens)) {
    for (const [name, token] of Object.entries(values)) {
      // Skip dark variants in default mode, skip non-dark in dark mode
      if (mode === 'dark' && !name.endsWith('-dark')) continue;
      if (!mode && name.endsWith('-dark')) continue;

      const varName = name.replace(/-dark$/, '');
      const cssName = `--${prefix}-${category}-${varName}`;
      vars.push(`  ${cssName}: ${token.$value};`);
    }
  }
  const selector = mode === 'dark' ? '.dark' : ':root';
  return `${selector} {\n${vars.join('\n')}\n}`;
}

// ===== CSS GENERATION =====
const lightCSS = tokensToCSS(tokens);
const darkCSS = tokensToCSS(tokens, 'ds', 'dark');

console.log(lightCSS);
// :root {
//   --ds-color-primary: #6366f1;
//   --ds-color-surface: #ffffff;
//   ...
// }

console.log(darkCSS);
// .dark {
//   --ds-color-primary: #818cf8;
//   --ds-color-surface: #1e1e2e;
//   ...
// }

// ===== ATOMIC DESIGN COMPONENTS =====
// Atoms
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

function Button({ variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      style={{
        backgroundColor: `var(--ds-color-${variant})`,
        color: `var(--ds-color-${variant}-foreground)`,
        borderRadius: 'var(--ds-border-radius-md)',
        padding: `var(--ds-spacing-2) var(--ds-spacing-4)`,
        fontSize: `var(--ds-font-size-${size})`,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// Molecules
function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--ds-spacing-2)' }}>
      <input
        type="text"
        placeholder="Search..."
        style={{
          border: `1px solid var(--ds-color-border)`,
          borderRadius: 'var(--ds-border-radius-md)',
          padding: 'var(--ds-spacing-2) var(--ds-spacing-3)',
        }}
        onChange={(e) => onSearch(e.target.value)}
      />
      <Button variant="primary" size="md">Search</Button>
    </div>
  );
}

// Organisms
function Header() {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'var(--ds-spacing-4) var(--ds-spacing-6)',
      backgroundColor: 'var(--ds-color-surface)',
      borderBottom: `1px solid var(--ds-color-border)`,
    }}>
      <h1 style={{ fontSize: 'var(--ds-font-size-xl)', fontWeight: 700 }}>Logo</h1>
      <nav style={{ display: 'flex', gap: 'var(--ds-spacing-4)' }}>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </nav>
      <SearchBar onSearch={(q) => console.log(q)} />
    </header>
  );
}
```

**Fuente oficial:** https://design-tokens.github.io/community-group/format/

### Alternativa de Implementación Específica

Python with `style-dictionary` for token transformation. Use `tailwind.config.js` for token integration with Tailwind CSS.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Múltiples productos/equipos que comparten UI, necesidad de branding consistente, theming multi-platform |
| **Cuándo evitar** | Proyectos pequeños, equipos únicos, cuando el overhead de mantenimiento del DS no justifica el beneficio |
| **Alternativas** | Tailwind CSS (utility-first sin sistema formal), Shadcn/ui (componentes copiables), Bootstrap/Material UI (frameworks pre-hechos) |
| **Coste/Complejidad** | Medio/alto. Implementación inicial significativa. Mantenimiento continuo. Gran ROI en consistencia y velocidad de desarrollo a largo plazo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Tokens hardcodeados en componentes

**¿Qué ocasionó el error?**
Los componentes usaban valores hardcodeados (#6366f1) en lugar de variables CSS, rompiendo el theming.

**¿Cómo se solucionó?**
```typescript
// 🚫 Hardcoded
<button style={{ backgroundColor: '#6366f1' }} />

// ✅ Variables CSS — themable
<button style={{ backgroundColor: 'var(--ds-color-primary)' }} />

// ✅ O utility class generada de tokens
<button className="bg-primary" />
```

**¿Por qué funciona esta técnica?**
Las variables CSS permiten cambiar el tema sin modificar componentes. Tokens → CSS Variables → Componentes rompe la dependencia directa.

### Caso: Design tokens sin versionado

**¿Qué ocasionó el error?**
Cambios en tokens rompían componentes existentes porque no había versionado ni migración.

**¿Cómo se solucionó?**
```typescript
// Versionar tokens
const tokensV1 = { color: { primary: '#6366f1' } };
const tokensV2 = { color: { primary: '#4f46e5', 'primary-hover': '#6366f1' } };

// Script de migración
function migrateTokens(tokens: DesignTokens, fromVersion: number): DesignTokens {
  if (fromVersion < 2) {
    return {
      ...tokens,
      color: {
        ...tokens.color,
        'primary-hover': tokens.color.primary,  // v1 primary becomes v2 hover
        'primary': '#4f46e5',                     // new primary
      },
    };
  }
  return tokens;
}
```

**¿Por qué funciona esta técnica?**
Versionar tokens con scripts de migración permite cambios controlados. Los componentes consumen la última versión sin cambios.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "design system", "atomic design", "design tokens", "w3c tokens", "component library", "design system ui"
- **Prioridad de carga:** Media — relevante para equipos frontend
- **Dependencias:** `07-frontend-web-fullstack/03-tailwind-css-utility`, `07-frontend-web-fullstack/06-a11y-accessibility-wcag`

### Tool Integration

```json
{
  "tool_name": "design-systems-atomic",
  "description": "Implements Design Systems with W3C tokens, Atomic Design hierarchy, CSS variable generation, dark mode theming",
  "triggers": ["design system", "atomic design", "design tokens", "w3c tokens", "ui library", "theming"],
  "context_hint": "Inject when user asks about design systems or component libraries",
  "output_format": "code examples with tokens, components, and CSS generation",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre design systems o atomic design, carga el skill design-systems-atomic y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generate CSS from tokens
npx token-transformer tokens.json output.css
# Build design system
npm run build:ds
# Validate tokens
npx design-tokens validate tokens.json
```

### GUI / Web

- **Figma**: Design tokens via plug-ins (Tokens Studio)
- **Storybook**: Catálogo de componentes con documentación
- **Design System Dashboard**: Visualización de tokens y componentes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generate CSS | `npx token-transformer tokens.json output.css` | — |
| Build storybook | `npm run storybook` | Storybook dev server |

---

## 7. Cheatsheet Rápido

```json
// Token: { "$type": "color", "$value": "#6366f1" }
// CSS: :root { --ds-color-primary: #6366f1 }
// Atomic: Atom (<Button>) → Molecule (<SearchBar>) → Organism (<Header>)
// Dark: .dark { --ds-color-primary: #818cf8 }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-frontend-web-fullstack/03-tailwind-css-utility` | Complementario | Sí |
| `07-frontend-web-fullstack/06-a11y-accessibility-wcag` | Complementario | Sí |
| `02-arquitectura-diseno/36-design-systems-atomic` | — | — |
| `02-arquitectura-diseno/35-state-management-patterns` | Complementario | No |
| `07-frontend-web-fullstack/01-react-ui-development` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: design-systems-atomic
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/36-design-systems-atomic
tags: [design-system, atomic-design, design-tokens, w3c-tokens, theming, css-variables, component-library]
---
```

---

## Comparativa 2026 / Ecosystem

### Fundamentos de Branding

El branding es la **gestión estratégica de percepciones**. Cada componente que un usuario ve, cada interacción, cada transición — todo comunica.

| Componente | Definición | Aplicación |
|-----------|-----------|-----------|
| Misión | Propósito fundamental | ¿Maestría técnica? ¿Lealtad? ¿Participación? |
| Visión | Aspiración futura | ¿Más niveles? ¿Animación? |
| Personalidad | Rasgos humanos | ¿Serio (LinkedIn) o irreverente (Discord)? |

**Marca vs. Branding vs. Identidad Visual:**
- **Marca (Brand):** Percepción acumulada en la mente del público. No la controlas; la gestionas.
- **Branding:** Proceso activo de construir y gestionar esa percepción.
- **Identidad Visual:** Sistema tangible: colores, tipografías, formas, iconografía.

### Cinco Pilares de Coherencia Visual

1. **Paleta de Color:** 3-4 colores funcionales por era. Color con significado: rojo=peligro/logro, dorado=maestría, azul=confianza.
2. **Jerarquía Tipográfica:** Ícono/shape 60-70% | Título 20-25% | Nivel/era 10-15%.
3. **Morfología Consistente:** Círculo/escudo=protección, Polígono/estrella=logro, Forma orgánica=creatividad.
4. **Sistema de Elevación:** Bajo=planos sin sombra, Medio=gradiente suave, Alto=brillo metálico.
5. **Animación y Micro-interacciones:** Refuerzan identidad (transición suave=pulcritud, explosión de partículas=celebración).

### Branding Streetwear — Economía del Hype

| Pilar | Aplicación a Componentes |
|-------|--------------------------|
| Escasez | Badges de tiempo limitado |
| Autenticidad | Componentes verificados |
| Tribu | Badges que solo comparten "los que estuvieron" |
| Narrativa | Componentes con lore de logro real |

**Modelos de drop:**
- **Supreme (semanal y limitado):** Insignias semanales para challenges rotativos, sin re-emisión.
- **Palace (temporal y sorpresivo):** Flash 24-48h, anuncio después de obtenible.
- **Off-White (colaboración):** Componentes que fusionan dos comunidades.

### Rareza y Progresión Visual

| Rareza | Probabilidad | Tratamiento Visual |
|--------|-------------|-------------------|
| Common | 60% | Color sólido, forma simple |
| Uncommon | 25% | Gradiente suave, borde definido |
| Rare | 10% | Glow sutil, forma compuesta |
| Epic | 4% | Animación, brillo metálico |
| Legendary | 1% | Partículas, glow pulsante |

### Ecuación del Componente Efectivo

```
Valor Percibido = (Exclusividad × Rareza) + (Diseño / Esfuerzo de Obtención)
```

### Variables de Progresión

| Variable | Bajo nivel | Medio nivel | Alto nivel |
|----------|-----------|-------------|-----------|
| Saturación | 30-50% | 60-80% | 90-100% |
| Contorno | 1px sólido | 2px glow | 3px glow animado |
| Forma | Simple (círculo) | Compuesta (escudo) | Compleja (polígono facetado) |
| Materialidad | Mate, plano | Satinado | Metálico con brillo |

### Arquitectura de Tokens (3 Capas)

```
1. Tokens Globales (Base)        — color, tipografía, espaciado, borde
2. Tokens Semánticos (Propósito) — badge-bg-primary, badge-text-on-dark
3. Tokens de Componente          — Badge.container.padding, Badge.glow.intensity
```

```json
// Tokens Semánticos
{
  "color": {
    "badge-bg-primary": "{color.rojo-primario}",
    "badge-text-on-dark": "{color.blanco-puro}",
    "badge-border-legendary": "rgba(220,38,38,0.8)"
  },
  "sombra": { "badge-shadow-lg": "0 4px 20px rgba(220,38,38,0.4)" }
}
```

### Style Dictionary (Amazon)

```bash
style-dictionary build
# Output: tokens.css → :root { --color-rojo: #DC2626; }
#          tokens.js  → export const red = '#DC2626'
#          tokens.json
```

Transforma tokens a todos los formatos necesarios (CSS, JS, JSON, iOS, Android).

### Principios de Coherencia Visual Sistémica

**Contraste:** Opera en luminancia (ratio WCAG), saturación/matiz, tamaño. Alto contraste=energía. Bajo=sutileza.

**Repetición:** Crea ritmo. Ojo detecta interrupciones en 50-100ms. Usar 3-5-7 repeticiones (impares).

**Alineación:** Cada elemento conectado visualmente. Axial para badges, perimetral, o grid 4×4/8×8px. Desalineación intencional=phonk.

**Proximidad (Gestalt):** Elementos relacionados agrupados a ≤8px. Espaciado modular 4-8-16px.

**Movimiento Implícito:** En SVG estático: diagonales (velocidad), asimetría (avance), difuminado direccional (estela).

### Jerarquía Visual

- **Tamaño:** Relación logarítmica — 2× más grande se percibe 4× más importante.
- **Color:** Orden de atención: Rojo puro → Amarillo/neón → Blanco → Naranja → Azul cian → Grises.
- **Espacio (técnica del pedestal):** Elemento con 15px+ de espacio vacío se percibe más importante.

### Escalabilidad Visual

El sistema debe funcionar en: 16px (tooltip), 36px (grid), 72px (perfil), 128px (detalle), 256px (merchandising).

| Tamaño | Elementos | Detalle |
|--------|-----------|---------|
| 16px | 1-2 | Silueta + 1 color |
| 36px | 2-3 | Forma + icono + glow sutil |
| 72px | 3-5 | Forma + icono + glow + textura |
| 128px+ | 5-8 | Completo con partículas |

### Storybook — Documentación como Fuente de Verdad

```mdx
<Meta title="Componentes/Badge Era 4" component={Badge} />
# Badge Era 4 — Maestría
Los badges de Era 4 usan blanco como color principal con glow rojo sutil.
<Story name="Default"><Badge era={4} level={45} type="social" /></Story>
```

- Stories para cada estado (común, hover, active, disabled, legendario, animado)
- Controles para ajustar tokens en vivo
- Documentación MDX con reglas de uso
- Snapshot testing

### Principios del Sistema

1. **Consistencia sobre variedad:** 20 variantes predecibles > 100 caóticas
2. **Jerarquía clara:** Rareza debe leerse en 200ms
3. **Rendimiento primero:** SVG optimizado, animaciones con `will-change`, evitar recálculos
4. **Accesibilidad:** Contraste mínimo 4.5:1 texto, 3:1 gráficos grandes

### Checklist de Calidad por Componente

- [ ] ¿Usa tokens existentes? (no hardcode colors)
- [ ] ¿Se distingue de su nivel anterior y siguiente?
- [ ] ¿Funciona en fondos claro, oscuro y personalizados?
- [ ] ¿SVG < 2KB optimizado?
- [ ] ¿Animación respeta `prefers-reduced-motion`?
- [ ] ¿Documentado en Storybook?
- [ ] ¿Pasa validación contraste WCAG AA?
- [ ] ¿Culturalmente apropiado para audiencia objetivo?
- [ ] ¿Reconocible al 200% de zoom?
- [ ] ¿Testeado en 3 tipos de daltonismo?

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with brand-identity + visual-architecture)*

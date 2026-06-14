---
name: frontend-visual-architecture
description: "Use when the user asks about visual architecture, design systems, systemic design, design tokens, atomic design, atomic design methodology, scalability, visual coherence, Storybook, Style Dictionary, Figma variables, component architecture, brand identity systems. Covers contrast, repetition, alignment, proximity, hierarchy, Gestalt principles."
---

# Frontend Visual Architecture

## Semantic Triggers
```
design system design tokens atomic design Storybook Style Dictionary Figma variables, contrast repetition alignment proximity Gestalt, visual hierarchy 36×36px legibility, scalability 16px 36px 72px 128px 256px, accessibility WCAG AA 4.5:1 contrast, semantic tokens component tokens global tokens, brand identity coherence, badge icon system typography, prefers-reduced-motion
```

---

## 1. Definición Teórica

Visual architecture is the systemic design discipline that aligns designers, developers, and stakeholders through a single source of truth (the design system). It operates on three layers: **principles** (contrast, repetition, alignment, proximity, movement), **tokens** (atomic values for color, spacing, typography, radius), and **components** (compositions of tokens that map to user-facing UI).

The **3-layer token architecture** separates concerns: (1) Global tokens are raw values (`rojo-primario: #DC2626`, `espaciado-md: 8px`); (2) Semantic tokens express purpose (`badge-bg-primary: {color.rojo-primario}`, `text-on-dark: {color.blanco-puro}`); (3) Component tokens are specific to a single component (`badge-rarity-legendary: {color.badge-border-legendary}`). This indirection allows theme switching (light/dark/brand) by remapping only the semantic layer.

Atomic design (atoms → molecules → organisms → templates → pages) provides the structural model. For a badge system: atoms are color swatches, paths, typography; molecules are `BadgeIcon` (SVG + background) and `BadgeLabel` (title + level); organisms are `Badge` (icon + label + glow + animation); templates are grids of badges in profile; pages are the full profile view. Scalability is tested by rendering the system at 16px (tooltip), 36px (grid), 72px (profile), 128px (detail), 256px (merchandising) — each tier requires different detail density.

---

## 2. Implementación de Referencia

### 1. Design Principles

**Contrast** — operates in luminance (WCAG ratio), saturation/hue, and size. High contrast = energy, urgency, power. Low contrast = subtlety, elegance.

**Repetition** — creates rhythm. Eye detects pattern breaks in 50-100ms. Use 3-5-7 repetitions (odd numbers). Excessive repetition = monotony.

**Alignment** — every element visually connected to another. Axial (perfect for grids), perimetral, or 4×4px/8×8px grid. Intentional misalignment = rebellion/glitch aesthetic.

**Proximity (Gestalt)** — related elements grouped at ≤8px. Modular spacing 4-8-16px. Good proximity = clarity; bad = anxiety.

**Implicit movement** — in static SVG: diagonals (speed), asymmetry (advance), directional blur (trail). Aggressive diagonals are typical of dark/phonk aesthetics.

### 2. Visual Hierarchy

The eye processes icons in a radial pattern (center → periphery). Three hierarchy tools:

**Size** — logarithmic perception (2x larger = 4x more important):

```
Scale for badges (100×100px):
  Primary:    40-60px
  Secondary:  20-30px
  Tertiary:   10-16px
  Decoration:  4-8px
```

**Color** — attention order: pure red → yellow/neon → white → orange → cyan → grays.

**Space (isolation)** — element with 15px+ empty space around it is perceived as more important ("pedestal technique").

**Inverse hierarchy** (dark/phonk aesthetic): cluttered background, semi-hidden main element, broken edges. Creates "reward for exploration".

### 3. Gestalt Theory Application

| Law | Technique | Example |
|---|---|---|
| Proximity | <4px between related | Flames + skull = "infernal fire" |
| Similarity | Same color = same category | PvP achievements in gold |
| Closure | Omit 1/5 star points | -20% SVG weight |
| Continuity | Concentric circles | Rarity rings |
| Figure-ground | 5:1 min contrast | White symbol on black |
| Common fate | Parallel rays | Directional electricity |

**Legibility at 36×36px** — priorities shift:
- Closure: most critical (less info needed)
- Figure-ground: second (distinguish shape from background)
- Continuity: third (continuous strokes better than cut)
- Proximity: intensifies (2px-separated elements appear fused)

```javascript
// SVG filter to verify legibility at 36×36px
<filter id="preview">
  <feGaussianBlur stdDeviation="0.5" />
  <feColorMatrix type="saturate" values="0.7" />
</filter>
```

### 4. Design System Architecture (3-Layer Tokens)

**Layer 1 — Global tokens (raw values)**:

```json
{
  "color": {
    "rojo-primario":   "#DC2626",
    "negro-profundo":  "#0A0A0A",
    "blanco-puro":     "#FFFFFF"
  },
  "tipografia": {
    "font-family":     "'Inter', system-ui, sans-serif",
    "font-weight-bold": 700
  },
  "espaciado": {
    "xs": "2px", "sm": "4px", "md": "8px", "lg": "12px", "xl": "16px"
  },
  "borde": {
    "radius-sm": "4px", "radius-lg": "12px", "radius-full": "50%"
  }
}
```

**Layer 2 — Semantic tokens (purpose)**:

```json
{
  "color": {
    "badge-bg-primary":       "{color.rojo-primario}",
    "badge-text-on-dark":     "{color.blanco-puro}",
    "badge-border-legendary": "rgba(220, 38, 38, 0.8)"
  }
}
```

**Layer 3 — Component tokens (specific to component)**:

```json
{
  "badge": {
    "rarity-common":    "{color.badge-bg-primary}",
    "rarity-rare":      "{color.azul-raro}",
    "rarity-legendary": "{color.badge-border-legendary}"
  }
}
```

**Style Dictionary** (Amazon) transforms tokens to all output formats:

```bash
npm install -D style-dictionary
npx style-dictionary build
# Output: tokens.css, tokens.js, tokens.json, tokens.ios.swift, tokens.android.xml
```

```json
// config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css":    { "transformGroup": "css",      "buildPath": "dist/css/" },
    "js":     { "transformGroup": "js",       "buildPath": "dist/js/" },
    "json":   { "transformGroup": "json",     "buildPath": "dist/json/" }
  }
}
```

### 5. Atomic Design Applied to Badges

- **Atoms**: color swatches, typography, individual icons, borders
- **Molecules**: `BadgeIcon` (SVG + background + border), `BadgeLabel` (title + level)
- **Organisms**: `Badge` (Icon + Label + Glow + Animation + Container)
- **Templates**: grid of badges in profile, tooltip on hover
- **Pages**: profile with 20 badges, "All badges" with filters

### 6. Documentation Stack

**Storybook** — every state (common, hover, active, disabled, legendary, animated). Live token controls. Snapshot testing.

```typescript
// Badge.stories.ts
export default { title: 'Components/Badge', component: Badge }
export const Common    = () => <Badge rarity="common" title="Bronze" />
export const Rare      = () => <Badge rarity="rare"   title="Silver" />
export const Legendary = () => <Badge rarity="legendary" title="Mythic" />
```

**Figma** — base components with era/level/rarity variants. Design tokens as variables. Auto-layout responsive. Shared library.

### 7. System Principles

1. Consistency over variety
2. Clear hierarchy (rarity readable in 200ms)
3. Performance first (optimized SVG, `will-change`, `transform`)
4. Accessibility (4.5:1 text contrast, 3:1 large graphics)

### 8. Quality Checklist per Badge

```yaml
- [ ] Uses existing tokens (no hardcoded colors)
- [ ] Distinguishable from previous/next tier
- [ ] Works on light, dark, and custom backgrounds
- [ ] SVG < 2KB optimized
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Documented in Storybook
- [ ] Passes WCAG AA contrast validation
```

### 9. Visual Scalability

The system must work at 16px (tooltip), 36px (grid), 72px (profile), 128px (detail), 256px (merchandising). Each size requires different detail density:

| Size | Elements | Detail |
|---|---|---|
| 16px | 1-2 | Silhouette + 1 color |
| 36px | 2-3 | Shape + icon + subtle glow |
| 72px | 3-5 | Shape + icon + glow + texture |
| 128px+ | 5-8 | Full with particles |

### 10. Element Relationships

Each visual element exists in relation to others: color with background, size with contrast, shape with meaning. Systemic coherence emerges when these relationships are predictable and governed by rules (tokens), not ad-hoc decisions.

**Official source:** https://bradfrost.com/blog/post/atomic-web-design/ · https://amzn.github.io/style-dictionary/

---

## 3. Trade-offs y Decisiones de Arquitectura

### Token Layering Strategy

| Approach | Pros | Cons |
|---|---|---|
| Global tokens only | Simple, flat | Hard to theme, brittle to changes |
| Global + Semantic (2-layer) | Theme support, clean intent | Component-coupled semantics leak |
| Global + Semantic + Component (3-layer) | Full theme support, clear ownership | More files, more indirection |

### Atomic Design Granularity

| Level | Reuse | Granularity |
|---|---|---|
| 3 levels (atom/molecule/organism) | Coarse, fast to build | Less reuse, less consistency |
| 5 levels (Brad Frost standard) | Balanced | Requires discipline |
| 7+ levels (Brad Frost extended) | Maximum reuse | Slower, harder to maintain |

### Documentation Tool Selection

| Tool | Strengths | Best for |
|---|---|---|
| Storybook | Component playground, snapshot tests | Engineering-led systems |
| Figma | Design editing, real-time collab | Design-led systems |
| Style Dictionary | Multi-platform output tokens | Multi-product/multi-platform |
| Zeroheight / Supernova | Living documentation portals | Cross-team communication |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Badge text not readable on dark background despite using "white" token

**What caused the issue?**
Badge label uses `{color.blanco-puro}` (#FFFFFF) on a dark gradient background. WCAG audit fails with 3.2:1 contrast.

**How was it resolved?**
Introduce a semantic token for "text on dark" and add a subtle text shadow for legibility:

```json
{
  "color": {
    "blanco-puro":     "#FFFFFF",
    "text-on-dark":     "#FAFAFA",  // slightly off-white, 5% less harsh
    "text-on-dark-glow": "0 0 4px rgba(0,0,0,0.8)"
  }
}
```

```css
.badge-label {
  color: var(--color-text-on-dark);
  text-shadow: var(--color-text-on-dark-glow);
}
```

**Why does this work?**
Pure white (#FFFFFF) on a black gradient creates optical vibration at small sizes — the high contrast can cause eye strain. Off-white (#FAFAFA) plus text shadow maintains the perceptual contrast above 4.5:1 while reducing halation.

### Caso: Design tokens not propagating to production CSS

**What caused the issue?**
Style Dictionary generates `tokens.css` but the deployed app still uses hardcoded colors from Figma exports.

**How was it resolved?**
Verify build pipeline order: tokens → CSS → bundle → deploy. Ensure the build script copies `dist/css/tokens.css` before the app's own CSS:

```json
// package.json
{
  "scripts": {
    "build:tokens": "style-dictionary build",
    "build:app":     "vite build",
    "build":         "npm run build:tokens && npm run build:app"
  }
}
```

**Why does this work?**
Style Dictionary outputs go to `dist/css/`. The Vite build imports `dist/css/tokens.css` BEFORE component CSS so tokens are defined first. If the order is reversed, components reference undefined variables and silently fall back to their initial value (often a hardcoded color from Figma export).

### Caso: Adding new tier breaks visual hierarchy of existing badges

**What caused the issue?**
Adding a "Mythic" tier above Legendary with a new color (purple #9333EA). Existing players report the new badge "doesn't feel legendary anymore" because the previous top tier lost its visual weight.

**How was it resolved?**
Recalibrate all tier colors with consistent visual weight progression, not just adding a new color:

```json
{
  "rarity": {
    "common":    { "color": "#9CA3AF", "glow": 0,    "particles": 0 },
    "rare":      { "color": "#3B82F6", "glow": 4,    "particles": 0 },
    "epic":      { "color": "#A855F7", "glow": 8,    "particles": 5 },
    "legendary": { "color": "#F59E0B", "glow": 12,   "particles": 10 },
    "mythic":    { "color": "#DC2626", "glow": 20,   "particles": 20, "animation": "shimmer" }
  }
}
```

**Why does this work?**
A new tier doesn't just need a new color — it needs a new "ceiling" of visual properties (glow, particles, animation). By making the progression quantitative (glow 0→4→8→12→20), each tier is unambiguously more important. Color alone can't carry hierarchy at high counts.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimated when invoking this skill
- **Trigger de activación:** "design system", "design tokens", "atomic design", "style dictionary", "storybook", "figma variables", "visual hierarchy", "gestalt", "brand identity" in the query
- **Prioridad de carga:** Alta — foundational for any UI system
- **Dependencias:** `tailwind-css-utility` (token implementation), `frontend-asset-pipeline` (SVG/icon system), `accessibility-design`, `design-systems-atomic`, `brand-identity`

### Tool Integration

```json
{
  "tool_name": "frontend-visual-architecture",
  "description": "Design systems, tokens, atomic design, visual hierarchy, Gestalt principles, scalability, accessibility",
  "triggers": ["design system", "design tokens", "atomic design", "storybook", "style dictionary", "figma", "visual hierarchy", "gestalt", "brand identity", "component architecture"],
  "context_hint": "Inject section 2 (Implementation) for token layering and atomic design examples. Section 4 for WCAG/tier recalibration FAQ.",
  "output_format": "markdown",
  "max_tokens": 4000
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about design systems, design tokens, atomic design, or visual hierarchy,
load the skill frontend-visual-architecture and provide the 3-layer token architecture
(global → semantic → component) and atomic design structure (atoms/molecules/organisms).
Reference Style Dictionary for multi-platform output. Prioritize systemic consistency
over per-component optimization.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Style Dictionary
npm install -D style-dictionary
npx style-dictionary build
# Output: dist/css/tokens.css, dist/js/tokens.js, dist/json/tokens.json

# Storybook
npx storybook@latest init        # scaffold
npm run storybook                # local dev (http://6006)
npm run build-storybook          # static export

# Figma CLI (plugin)
npx figma-export                 # export tokens + components from Figma

# Visual regression for design system
npx chromatic --project-token=xxx  # visual diff per Storybook story

# Token validation
npx token-cli validate tokens.json  # check schema conformance
```

### GUI / Web

- **Figma**: Variables panel for tokens, Components panel for atomic components, Auto Layout for responsive
- **Storybook**: live component playground with controls panel, snapshot tests
- **Style Dictionary Build**: generates platform-specific outputs (CSS, iOS Swift, Android XML, JS)
- **Chromatic / Percy / Loki**: visual regression for Storybook stories
- **Zeroheight / Supernova / Storybook Docs**: documentation portals for non-developers
- **Tokens Studio (Figma plugin)**: bidirectional sync between Figma Variables and Style Dictionary

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Build tokens | `style-dictionary build` | Figma → Tokens Studio → Push |
| Run Storybook | `npm run storybook` | — |
| Visual diff | `chromatic` | Figma → Compare branch |
| Export tokens | `figma-export` | Figma → Variables → Export |
| Validate schema | `token-cli validate` | — |

---

## 7. Cheatsheet Rápido

```json
// 3-Layer Token Architecture

// Layer 1: Global (raw)
{
  "color": { "rojo-primario": "#DC2626", "negro-profundo": "#0A0A0A" },
  "espaciado": { "xs": "2px", "sm": "4px", "md": "8px" }
}

// Layer 2: Semantic (purpose)
{
  "color": { "badge-bg-primary": "{color.rojo-primario}" }
}

// Layer 3: Component
{
  "badge": { "rarity-legendary": "{color.badge-border-legendary}" }
}
```

```css
/* Output CSS (Style Dictionary) */
:root {
  --color-rojo-primario: #DC2626;
  --color-badge-bg-primary: var(--color-rojo-primario);
  --badge-rarity-legendary: rgba(220, 38, 38, 0.8);
}

.badge--legendary {
  background: var(--badge-rarity-legendary);
  color: var(--color-text-on-dark);
}
```

```yaml
# Quality checklist per component
- [ ] Uses existing tokens
- [ ] Distinguishable from adjacent tiers
- [ ] Works on light/dark/custom backgrounds
- [ ] SVG < 2KB optimized
- [ ] Respects prefers-reduced-motion
- [ ] Documented in Storybook
- [ ] Passes WCAG AA contrast
```

```bash
# Pipeline
npx style-dictionary build    # tokens → CSS/JS/JSON
npm run storybook            # component playground
npx chromatic                # visual regression
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `frontend-asset-pipeline` | Complementario | Sí (icon/SVG production) |
| `tailwind-css-utility` | Complementario | Sí (token implementation in Tailwind v4) |
| `accessibility-design` | Complementario | Sí (WCAG, a11y, contraste) |
| `design-systems-atomic` | Complementario | Sí (atomic design methodology) |
| `brand-identity` | Complementario | Sí (visual coherence) |
| `design-thinking` | Complementario | Condicional (process) |
| `svg-basics` | Dependiente | Condicional (icon-level work) |
| `composition-layout` | Complementario | Sí (visual hierarchy) |

---

## 9. Metadatos del Skill

```yaml
---
id: frontend-visual-architecture
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/master-skills/visual-architecture
tags: [design-system, design-tokens, atomic-design, style-dictionary, storybook, figma, visual-hierarchy, gestalt, brand-identity, scalability, accessibility, wcag]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `visual-architecture` (Skills-o-extra/master-skills).*

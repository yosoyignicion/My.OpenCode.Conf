---
name: dark-mode
description: "Use when the user asks about dark mode design, OLED optimization, neon glow, dark themes, dark/phonk aesthetics, lumínicas, prefers-color-scheme, dark grey vs true black, night-friendly color palette, or how to design for low-light environments. Covers feGaussianBlur + feMerge SVG glow, CSS box-shadow multi-layer, blend modes (screen, plus-lighter), HSL hue-shift animations, and OLED-specific red color science."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "tendencias-estilos-digitales"
  source: "Skills-o-extra/elite-skills/dark-mode"
---

# Dark Mode: Principios de Diseño y Estética Neón

## Semantic Triggers
```
dark mode dark theme dark UI OLED true black vs dark grey, neon glow luminiscencia phonk dark, prefers-color-scheme media query, feGaussianBlur feMerge feColorMatrix SVG glow, CSS box-shadow text-shadow multi-layer, blend modes screen plus-lighter, night-friendly low-light color palette, eye strain mitigation, dark mode no invertir colores
```

---

## 1. Definición Teórica

El modo oscuro no es invertir colores — es **diseñar para condiciones de baja luz** considerando 3 ejes: (1) **tecnología de pantalla** (OLED vs LCD: el negro se "apaga" en OLED, ahorrando batería), (2) **salud visual** (reducir eye strain en sesiones largas, especialmente nocturno), (3) **estética** (neón, glow, profundidad, premium).

La elección entre `#000000` (true black) y `#121212` (dark grey) es la decisión fundacional: true black maximiza ahorro OLED y crea profundidad infinita, pero pierde layering visual. Dark grey (`#121212`) permite elevación por brillo incremental y es más amigable para sesiones largas.

Para **phonk dark aesthetic**, el modo oscuro es la base: el rojo se vuelve neón con glow, el cyan vibra, los elementos flotan en un vacío. La estética dark + neón no es decorativa — es la **gramática visual** que comunica poder, exclusividad, underground.

---

## 2. Implementación de Referencia

### Dark Mode Principles

#### True Black vs Dark Grey

| Propiedad | #000000 | #121212 |
|-----------|---------|---------|
| Consumo OLED | Mínimo | Bajo |
| Eye strain (baja luz) | Alto | Moderado |
| Profundidad visual | Nula | Posible |
| Contraste con #FFF | 21:1 | ~18:1 |
| Elegancia percibida | Alta | Muy alta |

**Recomendación:** #121212 como fondo principal, #000000 reservado para elementos que necesiten desaparecer (modales) o fondos de imágenes con glow.

#### Paleta de Grises

| Uso | Hex |
|-----|-----|
| Fondo profundo | #0A0A0A |
| Fondo principal | #121212 |
| Superficie elevada | #1E1E1E |
| Superficie más elevada | #2A2A2A |
| Borde sutil | #333333 |
| Texto secundario | #A0A0A0 |
| Texto primario | #E0E0E0 |
| Texto brillante | #FFFFFF |

#### Ratios de Contraste en Oscuro

El problema: colores saturados pierden contraste sobre fondo oscuro.

| Color | Hex | Sobre #121212 | ¿Cumple AA? |
|-------|-----|---------------|-------------|
| Rojo insignia | #DC2626 | 5.2:1 | Solo texto grande |
| Rojo claro | #FF5252 | 7.1:1 | Sí |
| Rojo brillante | #FF1744 | 8.3:1 | Sí |
| Rojo oscuro | #B71C1C | 3.1:1 | No |

**Conclusión:** Para modo oscuro, aclarar colores ~150% brightness. Texto usar gris claro (#E0E0E0), no blanco puro.

#### Eye Strain Mitigación

```css
:root {
  --text-color: #E0E0E0;         /* no #FFF */
  --font-weight-normal: 400;
  --font-weight-bold: 600;        /* no 700 */
  --letter-spacing: 0.02em;
  --line-height: 1.6;
}
```

#### Adaptación Contextual

Modo oscuro no es invertir colores. Reglas:
- No invertir logos/SVG — mantener paleta original
- Sombras blancas con baja opacidad (rgba(255,255,255,0.05))
- Elevación con brillo, no oscuridad (más claro = más elevado)
- `backdrop-filter` necesita backgrounds más sólidos

```css
@media (prefers-color-scheme: dark) {
  .badge {
    --badge-bg: #1E1E1E;
    --badge-border: #FF5252;
    --badge-text: #E0E0E0;
    --badge-glow: 0 0 6px rgba(255, 82, 82, 0.3);
  }
}
```

### Neon Luminiscence

#### Anatomía de un Glow

```
Brillo ▲
  ██████ | ← Núcleo (100% opacidad, color puro)
  ░░░░░░ | ← Halo medio (40-60% opacidad, blur 4-6px)
  ░░░░░░ | ← Aura externa (10-20% opacidad, blur 10-15px)
```

#### SVG Glow con feGaussianBlur + feMerge

```svg
<filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="aura"/>
  <feColorMatrix in="aura" type="matrix" values="0 0 0 0 1 0 0 0 0 0.09 0 0 0 0 0.09 0 0 0 0.15 0" result="auraColor"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="halo"/>
  <feColorMatrix in="halo" type="matrix" values="0 0 0 0 0.86 0 0 0 0 0.15 0 0 0 0 0.15 0 0 0 0.5 0" result="haloColor"/>
  <feMerge>
    <feMergeNode in="auraColor"/>
    <feMergeNode in="haloColor"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

#### CSS Glow: box-shadow y text-shadow

```css
.neon-badge {
  box-shadow:
    inset 0 0 8px rgba(255, 23, 68, 0.2),
    0 0 4px #FF1744,
    0 0 8px #DC2626,
    0 0 16px rgba(220, 38, 38, 0.5),
    0 0 32px rgba(220, 38, 38, 0.3);
}
```

#### El Problema del Rojo en Pantalla

El rojo puro tiene la longitud de onda más larga. En OLED, los subpíxeles rojos son menos eficientes.

Soluciones:
1. Elegir rojo acentuado al magenta (#FF1744 activa R+B subpíxeles = doble emisores)
2. Añadir capa blanca interna al glow (núcleo blanco + aura roja)
3. Usar rojo coral (#FF5252) para texto en modo oscuro

#### Paleta de Rojos Nocturnos

| Nombre | Hex | Uso |
|--------|-----|-----|
| Rojo phospor | #FF1744 | Glow principal |
| Rojo coral | #FF5252 | Texto, iconos |
| Rojo brillo | #FF8A80 | Highlight |
| Rojo neón | #DC2626 | Borde |
| Rojo sombra | #991B1B | Sombra |
| Rosa neón | #FF4081 | Alternativa OLED |

#### Animación de Glow

```css
@keyframes neon-flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { text-shadow: 0 0 4px #FF1744, 0 0 8px #FF1744, 0 0 12px #DC2626; opacity: 1; }
  20%, 24%, 55% { text-shadow: none; opacity: 0.8; }
}
```

#### Blend Modes para Glow

| Modo | Efecto | Uso |
|------|--------|-----|
| `screen` | Suma colores | Glow sobre oscuro |
| `plus-lighter` | Suma luminancia | Máximo brillo neón |
| `overlay` | Contraste alto | Sobre texturas |

### Mejores Prácticas

1. Fondo oscuro obligatorio (#121212, no #FFF)
2. Tres capas de glow: 4px, 8px, 16px
3. Threshold alto en bloom (0.85+) para que solo rojo intenso brille
4. Evitar feGaussianBlur con stdDeviation > 12 en SVG (usar CSS box-shadow)
5. No usar glow como único indicador visual
6. Tener versión sin glow para modo claro

### Three.js + UnrealBloomPass

```javascript
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,   // strength
  0.4,   // radius
  0.85   // threshold (alto = solo lo más brillante)
);
```

**Threshold alto** (0.85+) = solo elementos con luminancia alta hacen bloom (rojo intenso, blanco). Threshold bajo = todo brilla, "lavado".

### A11y y Reduced Motion

```css
/* Respetar usuarios con vestibular disorders */
@media (prefers-reduced-motion: reduce) {
  .neon-badge { animation: none; }
  .glow-flicker { animation: none; }
}

/* Indicador de color para daltónicos */
.badge-rare { border: 2px solid #FF1744; }       /* color */
.badge-rare::before { content: "★"; }            /* forma + símbolo */
```

### Tema Automático vs Toggle

| Estrategia | Pros | Contras |
|---|---|---|
| `@media (prefers-color-scheme)` | Respeta OS preference | Usuario no puede override |
| Toggle manual | Usuario controla | Pierde sincronía con OS |
| Ambos (default = system, override = toggle) | Mejor UX | Más código |

```javascript
// Detectar preferencia + override manual
const theme = localStorage.getItem('theme')
  ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Decisión | Pros | Contras |
|---|---|---|
| #000000 (true black) | OLED ahorro máximo, profundidad infinita | Sin layering, eye strain alto |
| #121212 (dark grey) | Layering visible, más cómodo | Menor ahorro OLED |
| #0A0A0A intermedio | Balance brillo/profundidad | Confunde con true black |
| Glow SVG (feGaussianBlur) | Calidad, exportable | Performance con stdDeviation > 12 |
| Glow CSS (box-shadow) | Performance, animable | Limitado a rectangular |
| Three.js bloom | Realismo | Overkill para 2D |
| prefers-color-scheme auto | UX sin fricción | Sin control fino |
| Toggle manual | Control total | Más código, estado a persistir |
| Glow permanente | Estética clara | Consume energía en OLED |
| Glow on-hover | Descubrimiento | Pierde impacto inicial |

### OLED vs LCD

- **OLED (iPhone XS+, Galaxy S+, MacBook Pro M+):** negro verdadero apaga subpíxeles, ahorra batería, contraste infinito
- **LCD (monitores viejos, laptops low-end):** negro real = gris oscuro por backlight, no ahorra batería
- **Estrategia:** diseñar para el común denominador (LCD) + optimizaciones OLED condicionales con `@media (color-gamut: p3)` o scripts de detección

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Imágenes se ven "lavadas" en dark mode con `filter: invert()`

**What caused the issue?**
El "truco" común es aplicar `filter: invert(1) hue-rotate(180deg)` a todo en dark mode. Esto invierte colores indiscriminadamente — fotos, logos, ilustraciones, sombras — y produce resultado artificial.

**How was it resolved?**
No invertir nada. Usar dos assets distintos (light + dark) o variantes semánticas:

```css
/* ❌ Anti-patrón */
@media (prefers-color-scheme: dark) {
  img { filter: invert(1) hue-rotate(180deg); }
}

/* ✅ Correcto */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121212;
    --text: #E0E0E0;
    --accent: #FF1744;
  }
  /* Imágenes: ajustar brillo/contraste si es necesario */
  img { opacity: 0.9; }  /* leve ajuste, no invertir */
}
```

**Why does this work?**
El ojo humano está entrenado para detectar colores "naturales" (piel, cielo, comida). Invertir rompe esa familiaridad y crea disonancia cognitiva. Es mejor diseñar assets específicos para cada modo que hackear la inversión.

### Caso: Glow SVG se ve pixelado en Retina

**What caused the issue?**
`feGaussianBlur` se calcula en coordenadas del viewBox, no en píxeles físicos. En pantalla 2x, el blur parece borroso o "stepped".

**How was it resolved?**
Aumentar `stdDeviation` proporcional al DPI, o migrar a CSS `drop-shadow`:

```css
/* SVG (no Retina-friendly) */
<filter id="glow"><feGaussianBlur stdDeviation="3"/></filter>

/* CSS (Retina-friendly) */
.glow-svg {
  filter: drop-shadow(0 0 4px #FF1744)
          drop-shadow(0 0 8px #DC2626);
}
```

**Why does this work?**
CSS `drop-shadow` se renderiza en GPU con resolución nativa del display. SVG filters se rasterizan al tamaño del viewBox (100×100) y luego se escalan, perdiendo fidelidad en 2x.

### Caso: Animación de flicker causa dolor de cabeza en usuarios

**What caused the issue?**
Flicker rápido (50ms on/off) desencadena respuesta vestibular en algunos usuarios, causando nausea/mareo. Además, anima `opacity` no respeta `prefers-reduced-motion` por defecto.

**How was it resolved?**
Wrap la animación en media query para accesibilidad:

```css
@keyframes neon-flicker {
  0%, 19%, 21%, 100% { opacity: 1; }
  20% { opacity: 0.7; }
}

.neon-flicker { animation: neon-flicker 4s infinite; }

@media (prefers-reduced-motion: reduce) {
  .neon-flicker { animation: none; }
  .neon-flicker { opacity: 1; }  /* estado final visible */
}
```

**Why does this work?**
WCAG 2.1 (criterio 2.3.3) requiere que animaciones de más de 5 segundos o que parpadean >3 veces/segundo tengan mecanismo de pausa. `prefers-reduced-motion` es el mecanismo estándar. Usuarios con vestibular disorders, migrañas, o ansiedad activan esta preferencia en su OS.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1300 tokens estimated when invoking this skill
- **Trigger de activación:** "dark mode", "OLED", "neon", "glow", "luminiscencia", "phonk dark", "prefers-color-scheme" in the query
- **Prioridad de carga:** Media-Alta — fundamental para branding dark/neon
- **Dependencias:** `color-basics` (paleta), `advanced-effects` (glow/glitch), `accessibility-design` (WCAG, reduced motion), `badge-system` (glow en rareza)

### Tool Integration

```json
{
  "tool_name": "dark-mode",
  "description": "Dark mode design, OLED optimization, neon glow, prefers-color-scheme, eye strain mitigation, dark/phonk aesthetic",
  "triggers": ["dark mode", "OLED", "neon", "glow", "luminiscencia", "phonk dark", "prefers-color-scheme", "dark theme", "dark UI", "true black", "dark grey", "night mode"],
  "context_hint": "Inject section 2 (true black vs dark grey, neon glow SVG/CSS, red color science, prefers-color-scheme) for dark mode decisions. Section 4 for Retina glow and reduced motion FAQ.",
  "output_format": "markdown",
  "max_tokens": 4000
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about dark mode, OLED optimization, neon glow, phonk dark aesthetic, or prefers-color-scheme,
load the skill dark-mode and provide:
1. true black (#000000) vs dark grey (#121212) decision
2. SVG feGaussianBlur + feMerge for glow + CSS box-shadow multi-layer
3. Red color science: prefer #FF1744 (R+B subpixels) over #FF0000 for OLED
4. prefers-color-scheme + prefers-reduced-motion accessibility
Always distinguish mathematical from optical centering and recommend both light + dark asset variants.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Detectar prefers-color-scheme
npx playwright test --grep "@media"

# Lighthouse audit
npx lighthouse https://yoursite.com --view
# Check: "contrast" + "color-scheme" categories

# axe-core a11y
npx @axe-core/cli https://yoursite.com
```

### GUI / Web

- **Figma**: Variables para `data-theme=dark` / `data-theme=light`
- **Stark (Figma plugin)**: simulación dark mode + WCAG
- **Polypane**: preview multi-viewport con toggle de theme
- **Chrome DevTools**: Rendering → "Emulate CSS prefers-color-scheme: dark"
- **Responsively**: dark mode side-by-side
- **Storybook**: themes addon para alternar

### Hotkeys / Atajos

| Acción | Atajo |
|---|---|
| Chrome DevTools: toggle dark | Cmd+Shift+P → "Show Rendering" → prefers-color-scheme |
| Figma: variant dark | Componente + variant `theme=dark` |
| VSCode: switch theme | Cmd+K Cmd+T |
| macOS: invert colors | Ctrl+Cmd+Option+8 (accesibilidad) |

---

## 7. Cheatsheet Rápido

```yaml
# Background
#000000  true black    OLED máximo ahorro, sin profundidad
#0A0A0A  casi negro    balance
#121212  dark grey     layering visible, recomendado Material
#1E1E1E  surface       elevación +1
#2A2A2A  surface +2    elevación +2

# Rojos Nocturnos
#FF1744  phosphor      glow principal OLED
#FF5252  coral         texto, iconos
#FF8A80  highlight     hover, focus
#DC2626  neon          borde
#991B1B  shadow        sombra

# Texto
#FFFFFF  brillante     títulos hero (ojo: puede vibrar)
#E0E0E0  primario      cuerpo (recomendado)
#A0A0A0  secundario    metadata
#666666  disabled      40% opacity

# WCAG contraste
AA normal:  ≥ 4.5:1
AA large:   ≥ 3:1
AAA:       ≥ 7:1
```

```css
/* Dark mode system */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121212;
    --surface: #1E1E1E;
    --text: #E0E0E0;
    --accent: #FF1744;
    --glow: 0 0 6px rgba(255, 23, 68, 0.4);
  }
}

/* Neon glow multi-capa */
.neon {
  box-shadow:
    0 0 4px #FF1744,
    0 0 8px #DC2626,
    0 0 16px rgba(220, 38, 38, 0.5);
  color: #FF1744;
  text-shadow: 0 0 4px currentColor;
}

/* Flicker animation (con a11y) */
@keyframes neon-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
@media (prefers-reduced-motion: reduce) {
  .neon-flicker { animation: none; }
}
```

```svg
<!-- SVG glow filter -->
<filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="8" result="aura"/>
  <feColorMatrix in="aura" type="matrix" values="
    0 0 0 0 1
    0 0 0 0 0.09
    0 0 0 0 0.09
    0 0 0 0.15 0"/>
  <feMerge>
    <feMergeNode in="aura"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `color-basics` | Complementario | Sí (paleta dark, WCAG) |
| `advanced-effects` | Complementario | Sí (glow, glitch, neón) |
| `accessibility-design` | Complementario | Sí (prefers-color-scheme, prefers-reduced-motion) |
| `a11y-accessibility-wcag` | Complementario | Sí (contraste, daltonismo) |
| `badge-system` | Complementario | Condicional (glow por rareza) |
| `frontend-visual-architecture` | Complementario | Sí (semantic tokens, theme switching) |
| `brand-identity` | Complementario | Condicional (coherencia dark) |
| `motion-ui` | Complementario | Condicional (timing de flicker) |

---

## 9. Metadatos del Skill

```yaml
---
id: dark-mode
domain: 11-design-niche
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/elite-skills/dark-mode
tags: [dark-mode, OLED, true-black, dark-grey, neon, glow, luminiscencia, prefers-color-scheme, prefers-reduced-motion, feGaussianBlur, feMerge, feColorMatrix, box-shadow, text-shadow, blend-modes, screen, plus-lighter, red-color-science, FF1744, FF5252, DC2626, WCAG, a11y, eye-strain, phonk-dark, dark-theme, night-mode]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `dark-mode` (Skills-o-extra/elite-skills).*

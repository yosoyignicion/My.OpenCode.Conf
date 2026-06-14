---
name: advanced-effects
description: "Use when the user asks about advanced visual effects for icons, badges, or UI: glow, glitch, VHS, pixel art, aberración cromática, scanlines, CRT, low poly, neón, bloom, lumínicas, efectos retro. Covers SVG filters (feGaussianBlur, feColorMatrix, feMerge), CSS blend modes, Three.js UnrealBloomPass, and HSL hue-rotate animations."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "efectos-visuales-avanzados"
  source: "Skills-o-extra/master-skills/advanced-effects"
---

# Advanced Effects: Glow, Glitch, VHS, Pixel Art, Low Poly, Neón

## Semantic Triggers
```
glow glitch VHS pixel art aberración cromática scanlines CRT low poly neón, SVG filter feGaussianBlur feColorMatrix feMerge, CSS box-shadow text-shadow blend-mode screen plus-lighter, Three.js UnrealBloomPass, hue-rotate, dithering, scanlines, retro, phonk effects
```

---

## 1. Definición Teórica

Los efectos visuales avanzados resuelven el problema de **transmitir emoción, energía y pertenencia cultural** mediante tratamiento digital no-realista. Operan en 4 ejes: (1) **glitch/inestabilidad controlada** (autenticidad underground), (2) **luminiscencia/neón** (poder radiante, tecnología), (3) **pixel art** (nostalgia, optimización extrema), (4) **low poly** (expresividad angular mínima).

Cada efecto es una capa sobre un diseño base. La regla: **un efecto es declaración; cinco efectos son saturación**. Para badges legendarios (N17-N20) combinar máximo 3 efectos con timing diferenciado.

---

## 2. Implementación de Referencia

### SVG Mastery para Iconos e Insignias

El SVG es el formato fundacional: resolución independiente, peso reducido (200-800 bytes), control total por código.

#### Anatomía del SVG

`viewBox="0 0 100 100"` define plano de 100×100 unidades. Margen de seguridad 8-10px. Coordenadas en enteros (píxel perfecto).

#### Curvas Bezier

| Tipo | Comando | Uso |
|------|---------|-----|
| Cúbica | `C x1 y1, x2 y2, x y` | Curvas suaves |
| Cuadrática | `Q x1 y1, x y` | Curvas simples |
| Arco | `A rx ry x-rot large sweep x y` | Círculos parciales |

#### Optimización de Paths

- Comandos relativos (`c`, `s`) vs absolutos
- Redondear coordenadas al entero
- Eliminar nodos redundantes
- Unificar paths del mismo color

#### Simplificación: Fusión de Shapes

```svg
<!-- Corona: círculos + rectángulo fusionados -->
<g fill="#FFD700" stroke="#B8860B" stroke-width="2">
  <circle cx="30" cy="25" r="12"/>
  <circle cx="50" cy="15" r="12"/>
  <circle cx="70" cy="25" r="12"/>
  <rect x="20" y="30" width="60" height="40" rx="5"/>
</g>
```

#### Mejores Prácticas

1. Stroke-width par (2, 4, 6) evita anti-aliasing fraccionado
2. `stroke-linejoin: round` para esquinas premium
3. Preferir `<path>` sobre `<g>` con múltiples formas
4. Optimizar con SVGO (reduce 30-60% peso)
5. Máximo 4 colores por badge

### Pixel Art para Insignias

A 36×36px (1,296 píxeles totales), cada píxel importa.

#### Budget de Píxeles

| Elemento | Pixeles | % |
|----------|---------|---|
| Silueta | ~600 | 46% |
| Detalles | ~300 | 23% |
| Borde | ~200 | 15% |
| Acentos/glow | ~130 | 10% |
| Margen | ~66 | 5% |

#### Paleta Mínima (4 colores)

| # | Hex | Propósito |
|---|-----|-----------|
| 1 | #0D0D0D | Fondo |
| 2 | #DC2626 | Outline |
| 3 | #991B1B | Sombras |
| 4 | #F5F5F5 | Luces |

#### Dithering en SVG

```svg
<pattern id="dither-50" patternUnits="userSpaceOnUse" width="2" height="2">
  <rect x="0" y="0" width="1" height="1" fill="#DC2626"/>
  <rect x="1" y="1" width="1" height="1" fill="#DC2626"/>
  <rect x="1" y="0" width="1" height="1" fill="#0D0D0D"/>
  <rect x="0" y="1" width="1" height="1" fill="#0D0D0D"/>
</pattern>
```

#### Limitaciones a 36×36

- Sin texto legible (<6px)
- Sin degradados suaves
- Sin glows complejos (consume 4-6px de margen)
- Ventaja: carga instantánea (~300 bytes), nitidez en no-Retina, impacto nostálgico

### Glitch y VHS

El glitch comunica: poder inestable, autenticidad underground, temporalidad, cultura hacker.

#### Aberración Cromática (RGB Shift)

```svg
<filter id="rgbShift">
  <feOffset in="SourceGraphic" dx="3" dy="0" result="red"/>
  <feColorMatrix in="red" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="redChannel"/>
  <feOffset in="SourceGraphic" dx="-3" dy="0" result="cyan"/>
  <feColorMatrix in="cyan" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="cyanChannel"/>
  <feBlend in="redChannel" in2="cyanChannel" mode="screen"/>
</filter>
```

#### Glitch por Clip-path (Split)

Capas roja y cian desplazadas con clip-paths que seleccionan diferentes franjas horizontales. Animación CSS con cambios de `translate` + `clip-path` en keyframes.

#### Scanlines y CRT

```css
.crt-badge::before {
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px);
}
.crt-badge::after {
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%);
}
@keyframes crt-flicker { 0%,100% { opacity: 1; } 50% { opacity: 0.995; } }
```

#### VHS Tracking Errors

Bandas horizontales de interferencia que se desplazan. Animación CSS con `translateY` y keyframes de ruido.

#### HSL Shift y Distorsión

```css
@keyframes hue-shift {
  0% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(30deg); }
  100% { filter: hue-rotate(0deg); }
}
```

#### Principios Emocionales del Glitch

1. Imperfección deliberada como declaración de autenticidad
2. Inestabilidad controlada (debe sentirse intencional)
3. Ritmo de error: alternar entre estable y roto
4. No abusar: glitch parcial > icono completamente destruido

### Low Poly 3D

Reduce la geometría a su mínima expresión. Lectura rápida, personalidad angular, atemporal.

#### Falso 3D en SVG

```svg
<!-- Cubo isométrico -->
<polygon points="50,15 80,30 50,45 20,30" fill="#DC2626" stroke="#0A0A0A" stroke-width="1.5"/>
<polygon points="50,45 80,30 80,65 50,80" fill="#991B1B" stroke="#0A0A0A" stroke-width="1.5"/>
<polygon points="20,30 50,45 50,80 20,65" fill="#5C1010" stroke="#0A0A0A" stroke-width="1.5"/>
```

#### Three.js: MeshToonMaterial + Gradient Map

Gradient map de 3 tonos (sombra, medio, luz) con `NearestFilter` para cel shading. Outline con `OutlineEffect` post-process.

#### Límites por Tamaño

| Tamaño | Polígonos máx |
|--------|---------------|
| 36×36px | ~100 tris |
| 100×100px | ~800 tris |
| 256×256px | ~2500 tris |

#### Principios Emocionales del Low Poly

- Minimalismo expresivo: menos caras = más legibilidad
- Dureza calculada: ángulos agudos = intensidad
- Autenticidad digital: celebra su naturaleza construida

#### Recomendaciones

1. Outlines negros (stroke 1-2px) para silueta sobre fondos oscuros
2. 3 tonos de color: sombra, medio, luz
3. Rotación asimétrica (5-10°) para dinamismo
4. Sombra proyectada en piso virtual (elipse negra debajo)

### Neón y Luminiscencia

(Ver también `dark-mode` skill para técnicas completas de glow.)

#### Blend Modes Estratégicos

| Modo | Efecto | Uso |
|------|--------|-----|
| `screen` | Suma colores | Glow sobre oscuro |
| `plus-lighter` | Suma luminancia | Máximo brillo |
| `overlay` | Contraste alto | Sobre texturas |
| `color-dodge` | Muy brillante | Highlight extremos |

#### Animación de Glow Pulsante

```css
@keyframes neon-breathe {
  0%, 100% { box-shadow: 0 0 4px #FF1744, 0 0 8px #DC2626, 0 0 16px rgba(220,38,38,0.4); }
  50% { box-shadow: 0 0 6px #FF1744, 0 0 14px #DC2626, 0 0 28px rgba(220,38,38,0.7); }
}
```

#### Three.js Bloom

```javascript
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
```

Threshold alto (0.85+) para que solo lo más brillante haga bloom. Strength moderado (0.5-1.5).

#### Técnicas Combinadas Avanzadas

Para badges de máximo nivel (N17-N20): combinar glow pulsante + partículas en órbita + shimmer + scanlines + glitch sutil + rotación lenta. Cada efecto debe tener su propio timing y easing para evitar saturación visual.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Decisión | Pros | Contras |
|---|---|---|
| SVG filters puros | Resolución independiente, portabilidad | Performance con stdDeviation > 12 |
| CSS box-shadow | Mejor performance que SVG blur, fácil de animar | Limitado a formas rectangulares |
| Three.js + Bloom | Realismo, máxima calidad | Requiere GPU, overkill para iconos estáticos |
| Solo CSS animations | Cero JS, accesible, performante | Sin física ni shaders personalizados |
| Glitch permanente | Declaración estética fuerte | Puede ser irritante, accessibility issue |
| Glitch on-hover | Dinámico, descubrible | Pierde impacto si nadie hace hover |

### Limitaciones de Performance

- `feGaussianBlur` con `stdDeviation > 12` consume CPU excesivo
- Mejor usar CSS `box-shadow` con múltiples capas en lugar de blur SVG
- Animaciones `filter: hue-rotate()` son GPU-accelerated pero pueden causar layout shifts
- Respetar `prefers-reduced-motion`: usuarios con vestibular disorders deben tener fallback estático

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Glow SVG se ve pixelado en pantallas Retina

**What caused the issue?**
El filtro `feGaussianBlur` se calcula en el viewport del SVG, no en píxeles físicos. En una pantalla 2x, el blur parece borroso/doble.

**How was it resolved?**
Aumentar `stdDeviation` proporcional al DPI, o usar CSS `filter: drop-shadow()` que sí respeta píxeles físicos:

```css
.glow-svg {
  filter: drop-shadow(0 0 4px #FF1744)
          drop-shadow(0 0 8px #DC2626)
          drop-shadow(0 0 16px rgba(220, 38, 38, 0.5));
}
```

**Why does this work?**
CSS `drop-shadow` se renderiza en GPU y escala correctamente con DPI. SVG filters se rasterizan al tamaño del viewBox y luego se escalan, perdiendo fidelidad.

### Caso: Animación de glitch causa 60fps drops en mobile

**What caused the issue?**
`filter: hue-rotate()` + `clip-path` animado simultáneamente fuerzan recomposición del layout completo en cada frame.

**How was it resolved?**
Animar solo `transform` (GPU-accelerated) y pre-computar el hue-rotate en clases estáticas que cambian con `setTimeout` en lugar de keyframes continuos:

```css
.glitch-step-1 { filter: hue-rotate(15deg); }
.glitch-step-2 { filter: hue-rotate(-10deg); }
.glitch-active { animation: glitch-flash 0.3s steps(2) 1; }

@keyframes glitch-flash {
  0% { clip-path: inset(0 0 0 0); transform: translate(0); }
  50% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 1px); }
  100% { clip-path: inset(0 0 0 0); transform: translate(0); }
}
```

**Why does this work?**
`transform` y `opacity` se procesan en compositor (sin layout/paint). `filter` se mueve a GPU pero solo cuando es estable, no cuando cambia 60 veces/segundo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1500 tokens estimated when invoking this skill
- **Trigger de activación:** "glow", "glitch", "VHS", "neon", "scanlines", "low poly", "pixel art", "bloom", "aberración cromática" in the query
- **Prioridad de carga:** Media — load only when user asks for non-realistic effects
- **Dependencias:** `dark-mode` (glow), `color-basics` (paleta), `svg-basics` (formato), `motion-ui` (timing), `frontend-visual-architecture` (atomic design para badges)

### Tool Integration

```json
{
  "tool_name": "advanced-effects",
  "description": "Visual effects: glow, glitch, VHS, scanlines, low poly, neón, bloom, dithering, pixel art",
  "triggers": ["glow", "glitch", "VHS", "scanlines", "neon", "low poly", "pixel art", "bloom", "dithering", "aberración cromática", "CRT"],
  "context_hint": "Inject section 2 (SVG filters, CSS animations, Three.js bloom) for implementation. Section 4 for performance FAQ.",
  "output_format": "markdown",
  "max_tokens": 4000
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about visual effects (glow, glitch, VHS, scanlines, neon, low poly, pixel art),
load the skill advanced-effects and provide the SVG filter primitives (feGaussianBlur, feColorMatrix, feMerge)
plus CSS blend modes and box-shadow techniques. Reference the trade-off between SVG filters and CSS drop-shadow
for Retina displays. Always respect prefers-reduced-motion.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Optimizar SVG con SVGO
npx svgo input.svg -o output.svg --multipass
npx svgo --multipass -i badge.svg

# Generar pixel art desde PNG
npx pxlrt pixelart.png --width 36 --height 36

# Three.js + bloom en build
npm install three @types/three
npx vite build

# Verificar performance de animaciones
npx lighthouse https://yoursite.com --view
```

### GUI / Web

- **Figma**: Effects panel (Drop Shadow, Inner Shadow, Layer Blur, Background Blur)
- **CSS generator**: `css.glass / box-shadow` para glow multi-capa
- **Three.js Editor**: editor visual con bloom preview
- **Lottie / Bodymovin**: exportar animaciones After Effects a SVG/JSON

### Hotkeys / Atajos

| Acción | Atajo |
|---|---|
| SVG → optimizado | `npx svgo` |
| Pixel art upscale | `npx pxlrt` |
| Three.js preview | F5 en Three.js Editor |
| Animate CSS | F12 → Animations panel (Chrome DevTools) |

---

## 7. Cheatsheet Rápido

```css
/* Glow neón en 3 capas */
.neon {
  text-shadow:
    0 0 4px #FF1744,
    0 0 8px #DC2626,
    0 0 16px rgba(220, 38, 38, 0.5);
}

/* Glitch on-hover */
.glitch:hover { animation: glitch 0.3s steps(2) 1; }
@keyframes glitch {
  0%, 100% { transform: translate(0); }
  50% { transform: translate(-2px, 1px); clip-path: inset(20% 0 60% 0); }
}

/* Scanlines CRT */
.crt::before {
  content: "";
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0, transparent 2px,
    rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px
  );
  pointer-events: none;
}
```

```svg
<!-- Aberración cromática -->
<filter id="rgbShift">
  <feOffset in="SourceGraphic" dx="3" dy="0"/>
  <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
  <feOffset in="SourceGraphic" dx="-3" dy="0"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="c"/>
  <feBlend in="r" in2="c" mode="screen"/>
</filter>
```

```yaml
# Reglas de oro
- Máximo 3 efectos combinados por elemento
- 1 efecto = declaración, 3 efectos = saturación
- Respetar prefers-reduced-motion
- stdDeviation > 12 → migrar a CSS drop-shadow
- Test en pantalla Retina (2x) y OLED
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `dark-mode` | Complementario | Sí (glow techniques, OLED) |
| `color-basics` | Complementario | Sí (paletas neón, HSL) |
| `svg-basics` | Dependiente | Sí (formato SVG) |
| `svg-converter-rasterization` | Complementario | Condicional (PNG fallback) |
| `motion-ui` | Complementario | Sí (timing, easing) |
| `frontend-visual-architecture` | Complementario | Sí (atomic design) |
| `composition-layout` | Complementario | Sí (jerarquía visual) |
| `advanced-graph-rag` | Independiente | No |
| `gamification-rewards` | Complementario | Condicional (badges N17-N20) |

---

## 9. Metadatos del Skill

```yaml
---
id: advanced-effects
domain: 11-design-niche
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/master-skills/advanced-effects
tags: [glow, glitch, vhs, scanlines, neon, low-poly, pixel-art, bloom, dithering, chromatic-aberration, crt, retro, phonk-effects, svg-filters, css-animations, three-js, blend-modes, prefers-reduced-motion]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `advanced-effects` (Skills-o-extra/master-skills).*

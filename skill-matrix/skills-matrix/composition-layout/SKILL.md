---
name: composition-layout
description: "Use when the user asks about visual composition, layout, grid systems, retícula, balance, symmetry/asymmetry, negative space, visual hierarchy, golden ratio (φ=1.618), Fibonacci spacing, optical centering, modular scales, or typography rhythm. Covers Müller-Brockmann grids, baseline grid, Fibonacci circles, micro/macro ritmo, and icon/badge composition at 36×36px and 100×100px."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "composicion-layout"
  source: "Skills-o-extra/initiation-skills/composition-layout"
---

# Composition & Layout: Sistemas de Retícula, Proporción y Jerarquía

## Semantic Triggers
```
composition layout grid retícula balance symmetry asymmetry negative space visual hierarchy, golden ratio φ 1.618 Fibonacci spacing, optical centering not mathematical center, modular scale typography rhythm, Müller-Brockmann baseline grid, micro ritmo macro ritmo, 36x36px 100x100px icon composition, badge layout safe area, contrast as hierarchy marker
```

---

## 1. Definición Teórica

La composición es la **columna vertebral invisible** de toda pieza visual. Como dijo Josef Müller-Brockmann: "el sistema de retícula es una ayuda, no una garantía. Permite innumerables posibilidades de diseño".

La composición opera en 3 capas: (1) **macro** (retícula general, layout de catálogo), (2) **meso** (composición de tarjeta individual, jerarquía dentro del badge), (3) **micro** (centrado óptico, espaciado interno, alineación de elementos). Las 3 capas usan los mismos principios: contraste, repetición, alineación, proximidad (CRAP de Robin Williams).

La **proporción áurea (φ = 1.618)** y la **secuencia Fibonacci** son herramientas, no leyes. En diseño práctico, ratios entre 1.4 y 1.7 producen resultados indistinguibles. La verdadera disciplina está en **romper la retícula con justificación** — no romperla por accidente.

---

## 2. Implementación de Referencia

### Fundamentos de Retícula

La retícula (grid) es la columna vertebral invisible de toda composición visual. Como dijo Josef Müller-Brockmann: "el sistema de retícula es una ayuda, no una garantía. Permite innumerables posibilidades de diseño".

#### Tipos de Retícula

**Retícula de Columnas**
Divide el espacio verticalmente en 2, 3, 4, 6, 8 o 12 columnas.

Anchos recomendados:
- 8px para móviles
- 12-16px para tablets
- 16-24px para escritorio

Ejemplo: 4 columnas para catálogo de insignias 100×100px. Cada badge ocupa 1 columna.

**Retícula Modular**
Combina columnas + filas. Ideal para sistemas de insignias.

```
Módulo para insignia 100×100px:
Módulo: 120px × 120px (100px badge + 20px padding)
Ancho de calle: 16px
Grupo de 4: 120 × 4 + 16 × 3 = 528px
```

**Baseline Grid (Retícula de Línea Base)**
```css
:root {
  --baseline: 8px;
}
body {
  line-height: calc(var(--baseline) * 2); /* 16px */
}
.badge-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--baseline);
  align-items: start;
}
```

**Retícula Jerárquica**
No sigue patrón regular. Las zonas se definen por jerarquía del contenido. Útil para landing pages donde el énfasis cambia por era.

### Diseño de Grid para Sistema de Insignias

**Catálogo de badges (vista general):**
```
┌──────────────────────────────────────┐
│ ERA I: INFERNO                       │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│ │ 1 │ │ 2 │ │ 3 │ │ 4 │           │
│ └───┘ └───┘ └───┘ └───┘           │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│ │ 5 │ │ 6 │ │ 7 │ │ 8 │           │
│ └───┘ └───┘ └───┘ └───┘           │
│                                      │
│ ERA II: ASCENSIÓN                   │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│ │ 9 │ │10 │ │11 │ │12 │           │
│ └───┘ └───┘ └───┘ └───┘           │
└──────────────────────────────────────┘
```

**Grid:** 4 columnas, gutter 16px, margen exterior 24px.
**Responsive:**
- >1024px: 4 columnas
- 768-1024px: 3 columnas
- 480-768px: 2 columnas
- <480px: 1 columna

### Reglas de Retícula para Insignias

1. Módulo base de 8px: todas las dimensiones múltiplos de 8
2. Padding interno 8-12px en cada tarjeta
3. Gutter mínimo 12px entre badges
4. Alinear números de era en misma coordenada Y
5. Usar subgrid para contenido variable
6. No romper retícula sin justificación
7. Probar en todos los viewports

### La Proporción Áurea (φ = 1.618)

#### Aplicación Práctica

No es una ley universal, sino una herramienta. En diseño práctico, 1.5, 1.6 o 1.618 produce resultados indistinguibles.

#### En tipografía (escala modular)

| Escalón | φ exacto | Redondeado | Uso |
|---------|----------|------------|-----|
| -2 | 12/φ² = 4.58px | 5px | Micro |
| -1 | 12/φ = 7.4px | 7px | Etiqueta |
| 0 | 12px | 12px | Base |
| 1 | 12×φ = 19.4px | 19px | Nombre |
| 2 | 12×φ² = 31.4px | 31px | Subtítulo |
| 3 | 12×φ³ = 50.8px | 51px | Título era |
| 4 | 12×φ⁴ = 82.3px | 82px | Display |

#### En composición de badges
Badge 100×100px dividido por φ:
- Zona superior (número): 100/φ = 61.8px → ~62px
- Zona inferior (texto): 100-62 = 38px

```
┌─────────────────┐
│       VI         │  ← 62px (61.8%)
├─────────────────┤
│  DOMINATOR      │  ← 38px (38.2%)
│  ★★★           │
└─────────────────┘
```

#### En layout de catálogo
Contenedor 1200px: 1200/φ = 741.6px (contenido), 458.4px (sidebar).

### Fibonacci en Diseño de Iconos

Secuencia: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...

**Círculos concéntricos en icono 100×100px:**
| Elemento | Radio | Diámetro |
|----------|-------|----------|
| Círculo exterior | 55px | 110px |
| Círculo medio | 34px | 68px |
| Círculo interior | 21px | 42px |
| Punto central | 8px | 16px |

**Espaciado Fibonacci:**
```css
.badge-card {
  padding: 8px 13px;
  margin-bottom: 21px;
}
```

### Cuándo NO usar φ
- Grids funcionales (CSS Grid 12 columnas)
- Body text (medida ideal 45-75 caracteres)
- Iconos de 36×36px (usar grid 4px/8px)
- Interfaces de alta densidad

### Cuándo SÍ usar φ
- Relación badge/contenedor
- División jerárquica dentro del badge
- Escalas tipográficas
- Landing pages hero
- Espirales y ornamentos

### Jerarquía y Escalas Armónicas

#### Escalas Musicales Aplicadas al Diseño

| Intervalo | Proporción | Sensación |
|-----------|------------|-----------|
| Unísono | 1:1 | Estática |
| Octava | 2:1 | Salto dramático |
| Quinta | 3:2 (1.5) | Estabilidad |
| Cuarta | 4:3 (1.333) | Armonía suave |
| Tercera mayor | 5:4 (1.25) | Agradable |
| Golden ratio | 1.618 | Expansión orgánica |

#### Escalas Tipográficas Recomendadas

| Escala | Proporción | Carácter | Mejor para |
|--------|-----------|----------|------------|
| Perfecta cuarta | 1.250 | Suave | UI general |
| Perfecta quinta | 1.500 | Enérgica | Landing pages |
| Golden ratio | 1.618 | Orgánica | Badges individuales |
| Octava | 2.000 | Dramática | Títulos de era |

### Macro-ritmo vs Micro-ritmo

#### Macro-ritmo (entre eras)
```css
.era-section { margin-bottom: 64px; }
.era-title { font-size: 48px; margin-bottom: 32px; }
.badge-row { margin-bottom: 24px; gap: 16px; }
```

#### Micro-ritmo (dentro del badge)
```css
.badge {
  display: flex; flex-direction: column; align-items: center;
  padding: 12px; gap: 4px;
}
.badge-era-number { font-size: 48px; line-height: 1; }
.badge-title { font-size: 16px; margin-top: 8px; }
.badge-meta { font-size: 10px; margin-top: 4px; }
```

### Contraste como Marcador Jerárquico

| Nivel | Tamaño | Ratio vs base |
|-------|--------|---------------|
| Era number | 60px | 5× |
| Badge title | 18px | 1.5× |
| Badge desc | 13px | ~1× |
| Metadata | 9px | 0.75× |

| Rol | Color | Opacidad |
|-----|-------|----------|
| Énfasis máximo | #FFFFFF | 100% |
| Título | #F5F5F5 | 95% |
| Cuerpo | #A0A0A0 | 65% |
| Metadata | #666666 | 40% |

### Composición de Iconos y Pictogramas

#### Principios de Composición

**Simplicidad Radical**
Elimina todo lo no esencial, luego elimina la mitad.
- ¿Este trazo comunica algo? Si no, eliminarlo.
- ¿Este detalle se ve a 36px? Si no, eliminarlo.
- ¿Dos formas pueden fusionarse? Hacerlo.

**Claridad Semántica**

| Concepto | Símbolo universal | Alternativa phonk |
|----------|------------------|-------------------|
| Fuego | Llama | Calavera en llamas |
| Velocidad | Rayo | Calavera alada |
| Maestría | Corona | Puño con corona |
| Protección | Escudo | Escudo con colmillos |

#### Técnicas de Centrado Óptico

El ojo NO percibe el centro matemático como centrado. Un círculo perfectamente centrado parece más abajo.

**Solución:** Elevar al 52-55% de la altura.

```css
/* Centrado matemático (se ve bajo) */
.badge-icon { top: 50%; left: 50%; transform: translate(-50%, -50%); }
/* Centrado óptico (se ve centrado) */
.badge-icon { top: 47%; left: 50%; transform: translate(-50%, -50%); }
```

| Forma | Corrección vertical |
|-------|---------------------|
| Círculo | +5% arriba |
| Cuadrado | 0% |
| Triángulo (punta arriba) | +10% arriba |
| Forma compleja | +3-8% arriba |

### Composición en 100×100px

**Canvas y área segura:**
```
+-----------------------------+
|  ........................... | 8px padding
|  .. +------------------+ .. |
|  .. |   AREA SEGURA    | .. | 84×84px
|  .. +------------------+ .. |
|  ........................... |
+-----------------------------+
```

**Tamaños de elementos:**
| Elemento | Tamaño | Ratio |
|----------|--------|-------|
| Forma principal | 60-70px | 60-70% |
| Forma secundaria | 30-40px | 30-40% |
| Detalles | 8-16px | 8-16% |
| Stroke | 2-4px | 2-4% |

**Estilos de composición phonk:**

*Escudo:* Polígono 6 lados 72×76px, símbolo central 32×32px, borde 3px rojo #DC2626

*Calavera:* Óvalo 56×68px, ojos círculos 12×12px, borde 2px blanco hueso

*Llama:* 3 curvas Bezier asimétricas, ancho 48px, alto 72px, gradiente rojo→naranja

**SVG con centrado óptico:**
```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(50, 47)">
    <!-- Centrado óptico: Y=47 en vez de 50 -->
    <path d="M-30,-28 L30,-28 L35,10 L0,35 L-35,10 Z"
          fill="#DC2626" stroke="#FF1744" stroke-width="2"/>
    <circle cx="0" cy="-5" r="10" fill="#1A1A1A"/>
  </g>
</svg>
```

### Composición en 36×36px

**Reglas estrictas:**
- Stroke máximo: 1.5-2px
- Formas: máximo 2 esenciales
- Detalles: 0-1
- Simplificar curvas Bezier a arcos básicos

**Grid de construcción 10×10 unidades modulares:**
Cada unidad = 10px en viewBox 100×100, 3.6px en icono 36×36.

### Simetría y Asimetría

#### Simetría: Orden y Autoridad

**Impacto emocional:** Orden, estabilidad, autoridad, tradición.
**Riesgo:** Monotonía, rigidez.

**Aplicación:** Números de era centrados, escudos heráldicos, logros de completitud.

```svg
<path d="M50,5 L90,25 L90,60 L50,95 L10,60 L10,25 Z"
      fill="#1A1A1A" stroke="#DC2626" stroke-width="3"/>
```

#### Asimetría: Dinamismo y Tensión

**Impacto emocional:** Energía, sorpresa, movimiento, innovación.
**Riesgo:** Caos.

**Balance compensado:** `Peso grande + Brazo corto = Peso pequeño + Brazo largo`

**Aplicación en badges:**
```
+----------------------------+
|  +-------+                 |
|  | VII    |   Fire Walker  |
|  +-------+   ★★★★☆        |
+----------------------------+
Icono a izquierda (100×100px rojo) + texto a derecha (200px gris)
```

**Catálogo asimétrico zigzag:**
```
Era I:   [BADGE] [texto]        [BADGE] [texto]
         [texto] [BADGE]        [texto] [BADGE]
```

### Cuándo Usar Cada Una

| Contexto | Tipo | Razón |
|----------|------|-------|
| Título de era | Simétrico | Autoridad, jerarquía |
| Catálogo badges | Simétrico | Navegación predecible |
| Badge individual | Asimétrico | Interés visual |
| Pantalla de logro | Simétrico | Celebración |
| Badge legendario | Asimétrico marcado | Romper la norma |

### La Emoción de la Retícula

Una retícula bien aplicada no se ve: se siente. El usuario percibe orden, predictibilidad y confianza:
- **Completitud:** "Este sistema está completo"
- **Progresión:** "Puedo ver mi avance en el grid"
- **Jerarquía:** "Las eras están claramente separadas"

Una retícula rota transmite caos. Úsala solo para comunicar que algo es especial.

### Herramientas Especializadas

| Herramienta | Uso |
|-------------|-----|
| gridlover.net | Generador de baseline grid tipográfico |
| gridcalculator.dk | Calculadora de retículas modulares |
| goldenratiocalc.com | Dimensiones áureas |
| modularscale.com | Escalas tipográficas con φ |
| Duck.css / Open Props | Grids CSS preconfigurados |

---

## 3. Trade-offs y Decisiones de Arquitectura

| Decisión | Pros | Contras |
|---|---|---|
| Retícula 12 columnas | Estándar web, flexible | Puede ser excesiva para app pequeña |
| Retícula 4 columnas | Simple, perfecta para grids de badges | Menos flexible para contenido variable |
| Golden ratio 1.618 | Estética clásica, "orgánica" | Subjetivo, 1.5 es indistinguible |
| Fibonacci spacing | Crecimiento natural, anti-flat | Memorizar la secuencia |
| 8px baseline grid | Estándar de facto, multiplataforma | Menos preciso que 4px |
| Centrado óptico siempre | Sensación de balance | Ajuste manual en cada icono |
| Asimetría en badges | Dinamismo | Riesgo de desbalance visual |

### Cuándo Romper la Retícula

- **Justificación necesaria:** comunicar singularidad, capturar atención
- **Aplicación:** badge legendario (N20), CTA principal, error state
- **Regla:** máximo 1-2 elementos por vista fuera de retícula, no más

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Icono "se ve bajo" dentro de su bounding box

**What caused the issue?**
El icono está centrado matemáticamente (Y=50%) pero el ojo percibe ese centro como "bajo". Esto es un fenómeno perceptual: el ojo busca el centro óptico (~47%), no el geométrico.

**How was it resolved?**
Aplicar corrección de centrado óptico según la forma:

```css
/* Círculo: +5% arriba */
.icon-circle { transform: translate(-50%, -45%); }

/* Triángulo punta arriba: +10% */
.icon-triangle { transform: translate(-50%, -40%); }

/* Forma compleja: +3-8% */
.icon-complex { transform: translate(-50%, -44%); }
```

**Why does this work?**
El cerebro humano está entrenado para interpretar imágenes basándose en luz gravitacional y peso visual. Un objeto "bajo" en su contenedor se siente pesado, no equilibrado. Mover el elemento al centro óptico (~47-48%) restaura la sensación de balance.

### Caso: Catálogo se ve "plano" sin jerarquía visual

**What caused the issue?**
Todos los badges tienen el mismo tamaño y color en la retícula, sin variación. El ojo no sabe dónde mirar primero.

**How was it resolved?**
Introducir 3 técnicas combinadas:

1. **Variación de tamaño** dentro del grid: badge "actual" 1.5× más grande
2. **Contraste cromático**: badges "completados" con borde dorado
3. **Aislamiento espacial** (pedestal): 24px de padding extra alrededor del elemento destacado

```css
.badge { width: 100px; height: 100px; }
.badge--current { width: 150px; height: 150px; outline: 2px solid #FFD700; padding: 24px; }
```

**Why does this work?**
La jerarquía visual se construye con 3 herramientas: tamaño (escala logarítmica, 2× = 4× más importante), color (atención: rojo > amarillo > blanco > grises), y espacio (15px+ vacío = "pedestal"). Combinar las 3 es mucho más efectivo que usar solo una.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1400 tokens estimated when invoking this skill
- **Trigger de activación:** "composition", "layout", "grid", "retícula", "balance", "hierarchy", "golden ratio", "Fibonacci", "centrado óptico" in the query
- **Prioridad de carga:** Alta — fundamental para cualquier decisión espacial
- **Dependencias:** `frontend-visual-architecture` (atomic design), `color-basics` (jerarquía cromática), `typography-phonk` (escalas), `badge-system` (composición de badges)

### Tool Integration

```json
{
  "tool_name": "composition-layout",
  "description": "Visual composition, grid systems, golden ratio, Fibonacci, optical centering, hierarchy, symmetry/asymmetry",
  "triggers": ["composition", "layout", "grid", "retícula", "balance", "hierarchy", "golden ratio", "Fibonacci", "optical centering", "baseline grid", "modular scale", "φ"],
  "context_hint": "Inject section 2 (grid types, golden ratio, optical centering, badge composition) for spatial decisions. Section 4 for hierarchy and centering FAQ.",
  "output_format": "markdown",
  "max_tokens": 4000
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about composition, layout, grids, golden ratio, Fibonacci, optical centering, or visual hierarchy,
load the skill composition-layout and provide the grid types (column/modular/baseline/hierarchical),
golden ratio applications (typography, badge division, layout), and optical centering rules
(circle +5%, triangle +10%, complex +3-8%). Always distinguish mathematical center from optical center
and apply Fibonacci spacing for organic feel.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generador de retículas
npx gridlover

# Calculadora áurea
open https://goldenratiocalc.com

# Escala tipográfica modular
npx modularscale --base 16 --ratio 1.618

# Generar CSS grid boilerplate
npx @uiw/react-grid

# Verificar alineación de elementos (visual)
npx @guidepup/playwright --snapshot
```

### GUI / Web

- **Figma**: Layout Grids (Shift+G), Guides (Ctrl+;), Auto Layout
- **gridlover.net**: Generador interactivo de baseline
- **modularscale.com**: Calculadora tipográfica
- **goldenratiocalc.com**: Dimensiones áureas en vivo
- **WebAIM Contrast Checker**: WCAG validator
- **Polypane / Sizzy**: Multi-viewport preview

### Hotkeys / Atajos

| Acción | Atajo Figma | Atajo Web |
|---|---|---|
| Mostrar retícula | Shift+G | DevTools → Layout |
| Guides | Ctrl+; | — |
| Alinear al centro | Alt+A (horizontal) | — |
| Constraints | Cmd+K → Constraints | — |
| Auto Layout | Shift+A | — |

---

## 7. Cheatsheet Rápido

```yaml
# Golden Ratio (φ = 1.618)
Tipografía: 12px → 19 → 31 → 51 → 82 (cada paso ×φ)
Badge:      62px / 38px (número / texto)
Layout:     1200px → 741 / 458 (contenido / sidebar)

# Centrado Óptico (corrección)
Círculo:        +5% arriba
Cuadrado:        0%
Triángulo ▲:    +10% arriba
Forma compleja: +3-8% arriba

# Fibonacci spacing
8, 13, 21, 34, 55, 89, 144
Usar para: padding, margin, gap, border-radius

# Macro vs Micro ritmo
Macro (entre eras):  64, 32, 24, 16px
Micro (en badge):    12, 8, 4px

# Contraste jerárquico
Tamaño:  60px / 18px / 13px / 9px (5×, 1.5×, 1×, 0.75×)
Opacidad: 100% / 95% / 65% / 40%
```

```css
/* Centrado óptico */
.badge-icon { top: 47%; left: 50%; transform: translate(-50%, -50%); }

/* Baseline grid 8px */
:root { --baseline: 8px; }
body { line-height: calc(var(--baseline) * 2); }

/* Fibonacci spacing */
.badge-card { padding: 8px 13px; margin-bottom: 21px; }

/* Grid catálogo */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
```

```bash
# Herramientas
gridlover.net               # baseline grid
goldenratiocalc.com         # dimensiones áureas
modularscale.com            # escalas tipográficas
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `frontend-visual-architecture` | Complementario | Sí (atomic design, tokens) |
| `color-basics` | Complementario | Sí (jerarquía cromática) |
| `typography-phonk` | Complementario | Sí (escalas tipográficas) |
| `badge-system` | Complementario | Sí (composición de badges) |
| `visual-architecture` | Complementario | Sí (sistema visual) |
| `brand-identity` | Complementario | Sí (coherencia) |
| `icon-symbolism` | Complementario | Condicional (significado) |
| `accessibility-design` | Complementario | Condicional (legibilidad) |

---

## 9. Metadatos del Skill

```yaml
---
id: composition-layout
domain: 11-design-niche
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/initiation-skills/composition-layout
tags: [composition, layout, grid, retícula, balance, symmetry, asymmetry, negative-space, visual-hierarchy, golden-ratio, phi-1.618, fibonacci, optical-centering, modular-scale, baseline-grid, muller-brockmann, micro-ritmo, macro-ritmo, 36x36, 100x100, icon, badge]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `composition-layout` (Skills-o-extra/initiation-skills).*

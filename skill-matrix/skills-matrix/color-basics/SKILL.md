---
name: color-basics
description: "Use when the user asks about color theory, palette design, HSL/RGB/LAB color models, color harmonies (complementary, analogous, triadic, tetradic), WCAG contrast ratios, dark/neon/phonk palettes, brand colors, accessibility for color blindness, or color psychology. Covers sRGB/Display P3/Adobe RGB/DCI-P3 gamuts, ΔE perceptual difference, and phonk/synthwave/cyberpunk/dark classic palettes for digital badges."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "teoria-color"
  source: "Skills-o-extra/initiation-skills/color-basics"
---

# Color Basics: Teoría del Color y Diseño de Paletas

## Semantic Triggers
```
color palette HSL RGB LAB, color harmony complementary analogous triadic tetradic, WCAG contrast ratio accessibility color blindness, sRGB Display P3 Adobe RGB DCI-P3 gamut, ΔE perceptual difference, phonk synthwave cyberpunk dark classic palette, semantic tokens brand colors, color psychology rareza estatus, saturation luminosity rules
```

---

## 1. Definición Teórica

La teoría del color es el **sistema de comunicación más rápido** del diseño visual: el ojo procesa color antes que forma (50-100ms). En diseño de insignias y branding, el color cumple 4 funciones: (1) **jerarquía** (qué es más importante), (2) **categoría** (raro/común/épico), (3) **emoción** (agresivo/calmado/lujoso), (4) **señalización** (esto es clickable, esto es info).

El color opera en **3 modelos** según el objetivo: RGB (luz aditiva, para pantallas), HSL (intuitivo, para diseñadores), LAB (perceptual uniforme, para conversiones precisas). El flujo recomendado: inspiración en LAB → definición en HSL → implementación en HEX → validación WCAG en sRGB.

---

## 2. Implementación de Referencia

### Modelos de Color

#### RGB (Rojo, Verde, Azul)
Base aditiva (luz). Cada píxel emite luz en intensidades 0-255 por canal.

```
RGB Decimal:    rgb(220, 38, 38)   → #DC2626
RGB Porcentual: rgb(86%, 15%, 15%)
```

**Usar RGB cuando:** el destino es pantalla (web, SVG), se necesita precisión numérica.
**No usar RGB para:** impresión (CMYK), percepción humana (preferir HSL), manipulación S/L.

#### HSL (Hue, Saturation, Lightness)
Base cilíndrica, diseñada para ser intuitiva para humanos.

```
HSL(0°, 70%, 50%) → rojo medio saturado
H (0-360°): matiz
S (0-100%): saturación (0=gris, 100=puro)
L (0-100%): luminosidad (0=negro, 50=puro, 100=blanco)
```

**Ventaja principal:** permite manipular S y L independientemente del matiz.

```javascript
const baseRed = { h: 0, s: 80, l: 50 };
// Variaciones de saturación
const saturations = [20, 40, 60, 80, 100].map(s => ({ ...baseRed, s }));
// Variaciones de luminosidad
const lightnesses = [10, 30, 50, 70, 90].map(l => ({ ...baseRed, l }));
```

#### LAB (CIELAB)
Base perceptual-uniforme. Misma distancia numérica = misma diferencia percibida.

```
L: luminosidad (0-100)
a: eje verde-rojo (-128 a +127)
b: eje azul-amarillo (-128 a +127)
```

**ΔE (diferencia de color):**
| ΔE | Percepción |
|----|------------|
| <1 | Invisible |
| 1-2 | Apenas perceptible |
| 3-6 | Notable |
| >12 | Colores diferentes |

### Perfiles de Color y Gamas

| Espacio | Gamut | Uso |
|---------|-------|-----|
| sRGB | 35% CIE | Web estándar, SVG |
| Display P3 | +25% sRGB | Apple, HDR |
| Adobe RGB | 50% CIE | Fotografía |
| DCI-P3 | Cine | Video, HDR |

### Conversiones Prácticas

```javascript
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function relativeLuminance(r, g, b) {
  const [R, G, B] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
```

### Flujo de Trabajo Recomendado
```
1. Inspiración → LAB (perceptual)
2. Definición → HSL (intuitivo)
3. Implementación → HEX (SVG/CSS)
4. Validación → sRGB + contraste WCAG
```

### Armonías Cromáticas

#### Rueda Cromática (Base 360°)
```
          Rojo (0°/360°)
             │
   Magenta───┼───Naranja
     │       │       │
  Violeta────●────Amarillo
     │       │       │
    Azul────┼────Verde
             │
         Cyan (180°)
```

#### 1. Monocromática
Un solo matiz (H) con variaciones de S y L.

```
#DC2626  H=0°  S=70%  L=50%  → base
#991B1B  H=0°  S=70%  L=35%  → oscuro
#F87171  H=0°  S=70%  L=70%  → claro
#450A0A  H=0°  S=70%  L=15%  → fondo
#FEE2E2  H=0°  S=70%  L=94%  → glow
```

**Emoción:** Sofisticación, coherencia, seriedad.
**Uso en badges:** Capas de un mismo color para profundidad.

#### 2. Complementaria
Dos colores opuestos en la rueda (180°).

```
Rojo (0°) + Cyan (180°): #DC2626 → #06B6D4
```

**Efecto:** Máximo contraste, energía.
**Regla:** 60-70% de un color, 30-40% del complementario. 50-50 es agresivo.

#### 3. Análoga
Colores adyacentes (30-60°).

```
Fuego (0°, 30°, 60°): #DC2626 → #EA580C → #F59E0B
```

**Emoción:** Natural, armónica, calmante.
**Uso:** Degradados de análogos para fondos.

#### 4. Tríada
Tres colores equidistantes (120°).

```
0°  Rojo     #DC2626
120° Verde   #16A34A
240° Azul    #2563EB
```

**Aplicación:** 1 dominante (60%), 1 soporte (30%), 1 acento (10%).

#### 5. Cuadrado/Tetrada
4 colores equidistantes (90°). Usar con experiencia: regla 50-25-15-10.

### Generación Programática

```javascript
function generateHarmony(baseHex, type) {
  const baseHsl = rgbToHsl(...hexToRgb(baseHex));
  const baseH = baseHsl.h;
  const harmonies = {
    complementary: [(baseH + 180) % 360],
    analogous: [(baseH + 30) % 360, (baseH - 30 + 360) % 360],
    triadic: [(baseH + 120) % 360, (baseH + 240) % 360],
  };
  const colors = [baseH, ...(harmonies[type] || [])];
  return colors.map(h => hslToHex({ h, s: baseHsl.s, l: baseHsl.l }));
}
```

### Reglas de Saturación y Luminosidad

| Elemento | S | L |
|----------|---|---|
| Fondo | 10-30% | 5-20% |
| Elemento principal | 70-100% | 40-60% |
| Detalles | 80-100% | 60-80% |
| Glow/aura | 50-70% | 80-95% |

### Paletas Icónicas para Insignias

#### Paletas Dark

**Dark Classic:**
```
#0A0A0A   → fondo principal
#1A1A1A   → fondo secundario
#2A2A2A   → bordes
#F5F5F5   → texto principal
#A3A3A3   → texto secundario
#DC2626   → acento rojo
```

**Deep Obsidian:**
```
#050505   → fondo
#0D0D0D   → superficie
#1A1A2E   → azul profundo
#BB86FC   → acento púrpura
#03DAC6   → acento teal
```

#### Paletas Neon

**Synthwave/Retrowave:**
```
#0A0A2E   → fondo azul medianoche
#FF007F   → rosa neón
#00FFF7   → cyan neón
#7B2D8E   → púrpura transición
#FFD700   → dorado
```

**Cyberpunk 2077:**
```
#000000   → fondo
#FFE600   → amarillo neón
#00F0FF   → cyan
#FF0055   → rojo-magenta
#8B00FF   → púrpura hacker
```

#### Paletas Phonk

**Memphis Phonk:**
```
#0D0D0D   → fondo negro mate
#DC2626   → rojo clásico
#FF1744   → rojo neón intenso
#B71C1C   → rojo oscuro sombras
#FFFFFF   → blanco detalles
#FFD700   → dorado rareza
```

**Dark Phonk Extreme:**
```
#000000   → fondo total
#FF0044   → rojo sangre
#AA00FF   → púrpura neón
#00FFAA   → verde veneno
#FF6600   → naranja transición
```

#### Paletas de Eras

**Era 1-2 Legacy:**
```
#DC2626, #000000, #FFFFFF, #991B1B, #B91C1C
```

**Era 3 Evolution:**
```
#E53935, #1A1A1A, #FFFFFF, #FF8A80, #4A0000, #FFD700
```

**Era 4 White Glow:**
```
#0A0A0A, #FFFFFF, #DC2626, #E5E5E5, #FF0000, #FF9999
```

**Era 5 Phantom:**
```
#0A0A0A, #FFFFFF, #FF1744, #FF0066, #1A0000, #FF4444
```

**SVG glow effect para era 4:**
```svg
<filter id="whiteGlow">
  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
  <feColorMatrix in="blur" type="matrix"
    values="0 0 0 0 0.86 0 0 0 0 0.15 0 0 0 0 0.15 0 0 0 0.4 0" result="redGlow"/>
  <feMerge>
    <feMergeNode in="redGlow"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

### Tabla Comparativa

| Paleta | Colores | Contraste avg | Emoción | Uso |
|--------|---------|---------------|---------|-----|
| Dark Classic | 6 | 7.2:1 | Profesional | Base universal |
| Synthwave | 6 | 8.1:1 | Nostalgia | Retrowave |
| Cyberpunk | 6 | 12.3:1 | Futurista | Temática 2077 |
| Memphis Phonk | 6 | 9.4:1 | Agresiva | Phonk era |
| Era 4 Glow | 6 | 10.1:1 | Etérea | Insignias actuales |
| Obsidian | 6 | 8.5:1 | Lujo | Premium |

### Combinación Recomendada

Para colección cohesiva: 1 paleta base + 1 paleta de acento.

```
Base:   Dark Classic (#0A0A0A, #1A1A1A, #F5F5F5)
Acento: Memphis Phonk (#DC2626, #FF1744, #FFD700)

Badge común:    Dark Classic completo
Badge raro:     Dark Classic + acento rojo #DC2626
Badge épico:    Dark Classic + #FF1744 + #FFD700
Badge legend:   Memphis Phonk completo (#FF1744 domina)
```

### Psicología del Color en Insignias

#### Semiótica Cromática del Proyecto

| Color | Icónico | Indicial | Simbólico |
|-------|---------|----------|-----------|
| Rojo #DC2626 | Sangre, fuego | Calor, peligro | Pasión, poder, guerra |
| Degradado #E53935 | Llama variable | Intensidad creciente | Evolución |
| Blanco #FFFFFF | Luz, nieve | Pureza, claridad | Victoria, divinidad |
| Aura #FF1744 | Corona de luz | Energía radiante | Apoteosis, poder absoluto |

#### Percepción de Estatus por Color

| Color | Estatus | Uso histórico |
|-------|---------|---------------|
| Púrpura/Rojo intenso | Máximo | Púrpura tirio (solo emperadores) |
| Dorado | Riqueza | Tronos, coronas, monedas |
| Blanco | Pureza, divinidad | Vestimenta papal |
| Negro | Poder, autoridad | Togas de juez |
| Rojo | Pasión, sangre | Capas de cardenales |

#### Pirámide de Rareza Cromática

```
Legendario (<5%):  Blanco + aura roja #FF1744
Épico (5-15%):    Rojo brillante + glow
Raro (15-50%):    Rojo medio #DC2626
Común (>50%):     Gris, rojo tenue
```

#### El Color como Indicador de Rareza (WoW System)

```
Gris → Blanco → Verde → Azul → Púrpura → Naranja
Common → Uncommon → Rare → Epic → Legendary → Mythic
```

### Accesibilidad y Contraste

#### Fórmula de Contraste WCAG
```javascript
const ratio = (L1 + 0.05) / (L2 + 0.05);
// AA normal: ≥ 4.5:1
// AA large: ≥ 3:1
// AAA normal: ≥ 7:1
```

#### Ejemplo con Rojo Phonk #FF1744
```
HEX:     #FF1744
HSL:     hsl(348°, 100%, 55%)
Luminancia: 0.145 (media-baja)
Contraste sobre #000000: 3.9:1
```

#### Reglas de Accesibilidad para Insignias
- Contraste mínimo 4.5:1 para texto
- Contraste mínimo 3:1 para elementos gráficos grandes
- No usar solo color para comunicar información crítica
- Probar en escala de grises para verificar jerarquía

#### Simulación de Daltonismo

| Tipo | % población | Colores confundidos |
|------|------------|---------------------|
| Protanopia | 1% | Rojo-verde |
| Deuteranopia | 1% | Rojo-verde (más común) |
| Tritanopia | 0.01% | Azul-amarillo |
| Achromatopsia | 0.003% | Todo en gris |

**Herramientas:** Sim Daltonize, Stark (Figma/Sketch plugin), Coblis.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Decisión | Pros | Contras |
|---|---|---|
| HEX en CSS | Compatibilidad universal | Menos legible para humanos |
| HSL en design tokens | Intuitivo para S/L manipulation | Requiere conversiones a HEX en output |
| LAB para conversiones | Perceptual uniforme | Complejidad matemática |
| sRGB everywhere | Web estándar | Pierde 25% gamut en pantallas P3 |
| Display P3 en Apple | Colores más vivos | Incompatibilidad con browsers viejos |
| Color como único indicador de rareza | Simple, universal (PlayStation) | Falla para daltónicos |
| Color + forma + glow para rareza | Accesible | Mayor trabajo de diseño |

### Gamut y Compatibilidad

- **sRGB**: seguro para web, 100% compatible
- **Display P3**: ideal para Apple ecosystem, requiere fallback a sRGB
- **HEX con fallback**: `#DC2626;` + `@supports (color: display-p3) { color: color(display-p3 0.86 0.15 0.15); }`

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Rojo se ve "apagado" en pantalla LCD vs más vibrante en OLED

**What caused the issue?**
El rojo puro #FF0000 tiene la longitud de onda más larga. En LCD (subpíxeles RGB), el rojo depende del filtro de color que es menos eficiente que en OLED (emisión directa). Resultado: el mismo HEX se ve diferente según display.

**How was it resolved?**
Para OLED, usar rojo magenta-accent (#FF1744) que activa los subpíxeles R+B (doble emisor). Para LCD, aumentar saturación con HSL +10% S:

```css
/* OLED-optimized */
.badge { background: #FF1744; }  /* activates R+B subpixels */

/* LCD-optimized */
.badge { background: #FF0044; }  /* higher saturation compensates */
```

**Why does this work?**
OLED emite luz directamente por subpíxel. Combinando R+B (magenta) se duplica la eficiencia lumínica del color. En LCD, el rojo atraviesa un filtro pasivo, así que se necesita más saturación para mantener la viveza percibida.

### Caso: Contraste WCAG pasa con texto blanco sobre rojo, pero falla con texto rojo sobre blanco

**What caused the issue?**
La luminancia relativa de #DC2626 es ~0.10, lo que da contraste de 5.2:1 sobre blanco (pasa AA) pero solo 4.1:1 sobre negro (no pasa AA normal, solo AA large).

**How was it resolved?**
Usar versión "brightening" del rojo para texto:

```css
/* ❌ No usar como texto sobre fondo claro */
.color-text-red { color: #DC2626; }

/* ✅ Aclarar para texto */
.color-text-red-bright { color: #FF5252; }  /* contraste 7.1:1 */
```

**Why does this work?**
En modo oscuro, los colores saturados pierden contraste. Aclarar el rojo ~150% compensa la pérdida de luminancia sobre fondo claro, manteniendo la identidad cromática.

### Caso: Paleta se ve "marrón" en monitores calibrados a sRGB cuando fue diseñada en Display P3

**What caused the issue?**
Colores P3 fuera del gamut sRGB se "comprimen" (gamut clipping) al renderizar, perdiendo saturación y virando hacia tonos marrones o desaturados.

**How was it resolved?**
Mantener todos los colores dentro del gamut sRGB para web, o usar `@supports` con fallback:

```css
:root {
  --brand-red: #DC2626;  /* sRGB safe */
}

@supports (color: color(display-p3 1 0 0)) {
  :root {
    --brand-red: color(display-p3 0.95 0.10 0.10);  /* P3 wider */
  }
}
```

**Why does this work?**
sRGB es el "lower common denominator" — todos los browsers/monitores lo soportan. Display P3 solo en Safari/Chrome moderno + pantallas compatibles. Usar `@supports` con fallback garantiza que el color sRGB se muestre donde P3 no es soportado.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1600 tokens estimated when invoking this skill
- **Trigger de activación:** "color", "palette", "HSL", "RGB", "WCAG", "contrast", "harmony", "phonk palette", "synthwave", "cyberpunk" in the query
- **Prioridad de carga:** Alta — fundamental para cualquier decisión visual
- **Dependencias:** `accessibility-design` (WCAG), `dark-mode` (paleta oscura), `badge-system` (rarity colors), `frontend-visual-architecture` (semantic tokens)

### Tool Integration

```json
{
  "tool_name": "color-basics",
  "description": "Color theory, HSL/RGB/LAB models, harmonies, WCAG contrast, dark/neon/phonk palettes, accessibility",
  "triggers": ["color", "palette", "HSL", "RGB", "WCAG", "contrast", "harmony", "phonk", "synthwave", "cyberpunk", "gamut", "delta E", "P3", "sRGB"],
  "context_hint": "Inject section 2 (RGB/HSL/LAB models, harmonies, phonk palettes) for color decisions. Section 4 for WCAG and gamut FAQ.",
  "output_format": "markdown",
  "max_tokens": 4500
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about colors, palettes, color theory, WCAG contrast, or harmony,
load the skill color-basics and provide the HSL/RGB/LAB model conversions,
5 harmony types (monochromatic/complementary/analogous/triadic/tetradic),
WCAG contrast formula (4.5:1 AA, 7:1 AAA), and the phonk/synthwave/cyberpunk/dark-classic palettes.
Reference gamut (sRGB/Display P3) compatibility and daltonism simulation tools.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Convertir HEX a HSL
npx color-convert "#DC2626" hsl
# → [0, 71, 50]

# Calcular contraste WCAG
npx wcag-contrast "#FF1744" "#0A0A0A"
# → 5.32:1 (AA pass for large text)

# Generar paleta armónica
npx coolors.co/generate --harmony complementary "#DC2626"

# Validar con axe
npx @axe-core/cli https://yoursite.com
```

### GUI / Web

- **Coolors.co**: generador de paletas con harmonies
- **Adobe Color**: rueda cromática interactiva
- **Stark (Figma plugin)**: WCAG + daltonismo en tiempo real
- **Sim Daltonize**: simulador de daltonismo
- **Coblis**: Color Blindness Simulator
- **Khroma**: AI-trained palette generator
- **Realtime Colors**: preview de paleta en sitio web real

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| HEX → HSL | `npx color-convert` | Figma → Inspect |
| Validar WCAG | `npx wcag-contrast` | Stark plugin → Tab A11y |
| Generar paleta | `npx coolors` | Adobe Color → rueda |
| Simular daltonismo | — | Figma → Stark → CB |

---

## 7. Cheatsheet Rápido

```yaml
# 5 Armonías
Monocromática:  mismo H, variar S/L
Complementaria: H + 180°
Análoga:        H ± 30-60°
Tríada:         H + 120° + 240°
Tetrada:        H + 90° × 3

# WCAG
AA normal:  ≥ 4.5:1
AA large:   ≥ 3:1
AAA:       ≥ 7:1
Fórmula:    (L1 + 0.05) / (L2 + 0.05)
```

```javascript
// RGB → HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
```

```css
/* Paleta phonk mínima */
:root {
  --bg-deep:    #0D0D0D;
  --bg-surface: #1A1A1A;
  --red-classic: #DC2626;
  --red-neon:    #FF1744;
  --text-bright: #F5F5F5;
  --text-dim:    #A0A0A0;
  --rarity-gold: #FFD700;
}

/* Rareza cromática */
.common    { color: #A0A0A0; }
.rare      { color: #DC2626; }
.epic      { color: #FF1744; filter: drop-shadow(0 0 4px #FF1744); }
.legendary { color: #FFD700; filter: drop-shadow(0 0 8px #FFD700); }
```

```bash
# Pipeline
npx color-convert "#DC2626" hsl   # HEX → HSL
npx wcag-contrast "#FF1744" "#0A0A0A"  # validar WCAG
npx svgo                          # optimizar SVG con paleta
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `accessibility-design` | Complementario | Sí (WCAG, daltonismo) |
| `a11y-accessibility-wcag` | Complementario | Sí (contraste, ARIA) |
| `dark-mode` | Complementario | Sí (paleta oscura, OLED) |
| `badge-system` | Complementario | Sí (rarity colors) |
| `frontend-visual-architecture` | Complementario | Sí (semantic tokens) |
| `advanced-effects` | Complementario | Condicional (glow sobre colores) |
| `brand-identity` | Complementario | Sí (coherencia cromática) |
| `cultural-references` | Complementario | Condicional (paleta por subcultura) |

---

## 9. Metadatos del Skill

```yaml
---
id: color-basics
domain: 11-design-niche
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/initiation-skills/color-basics
tags: [color, palette, HSL, RGB, LAB, WCAG, contrast, harmony, complementary, analogous, triadic, tetradic, sRGB, Display-P3, Adobe-RGB, DCI-P3, delta-E, phonk, synthwave, cyberpunk, dark-classic, semantic-tokens, daltonism, accessibility]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `color-basics` (Skills-o-extra/initiation-skills).*

---
name: typography-phonk
description: "Use when the user asks about typography for dark/phonk/gaming/cyberpunk aesthetics, display fonts (Impact, Bebas Neue, Anton, Blackletter, glitch fonts), font selection for badges/titles, CSS text effects (glow, gradient, shadow, noise), variable fonts, optical sizing, tracking/kerning for condensed display, or building a typographic system with strong visual personality. Triggers: tipografía, fuente, phonk, typography, font, letra, display, Impact, Bebas Neue, gritty, blackletter, numerales, glitch, tracking, kerning, jerarquía tipográfica, condensed, Bebas, Anton."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "tipografia-phonk"
  source: "Skills-o-extra/loyalty-skills/typography-phonk"
  ported: "2026-06-14"
---

# Typography Phonk: Tipografía para Estética Oscura

## ¿Qué es la Estética Tipográfica Phonk?

El phonk es un subgénero musical (Memphis rap 90s, DJ Screw, Three 6 Mafia, drift phonk brasileño) con una identidad visual inconfundible. Su tipografía refleja: crudeza, contundencia, oscuridad y estética "gritty" que evoca cintas VHS gastadas y grafiti callejero.

La tipografía phonk no es académica — es **visceral**. Busca incomodar, imponer, rugir.

## Fuentes Emblemáticas

### Impact (Geoffrey Lee, 1965)

**La reina indiscutible del phonk.** Condensación extrema y peso uniforme. Ocupa el máximo espacio horizontal con el mínimo número de caracteres.

**Características:**
- Trazos extremadamente gruesos (peso único: Regular)
- Condensación agresiva: 84% del ancho de una grotesca normal
- Sin serifas (sans serif que no se siente como tal)
- Espaciado muy apretado

**Por qué funciona:** La palabra "IMPACT" escrita en Impact es autosuficiente. Su densidad visual comunica "peso", "gravedad", "no hay espacio para dudas".

**Aplicación:** títulos de era ("ERA I", "INFERNO"), números romanos, nombres de logro de una palabra ("DOMINATOR", "OBLITERATE"). No usar para descripciones.

### Bebas Neue (Ryoichi Tsunekawa, 2010)

**La alternativa moderna a Impact.** Menos agresiva, más limpia, igual de imponente. Mayúsculas fijas (sin minúsculas).

**Características:**
- 9 pesos (Thin a Black)
- Condensación media
- Mayúsculas fijas
- Trazos rectos con curvas sutiles

**Por qué funciona:** Donde Impact es un puñetazo, Bebas Neue es un portazo. Más versátil: permite jerarquías internas gracias a su gama de pesos.

**Aplicación:** títulos largos ("PHONK ERA", "ACHIEVEMENT UNLOCKED"), combinación con numerales grandes, banners.

### Anton (Vernon Adams, 2012)

**Condensada geométrica.** Similar a Bebas Neue pero con estructura más geométrica y trazos rectos.

**Características:**
- Peso único (Regular)
- Formas más cuadradas
- Mayor consistencia en curvas y ángulos

**Por qué funciona:** Su estructura rígida evoca grafiti de bloques, lettering de fanzines punk y señalética industrial.

### Blackletter / Old English

**El pasado medieval del phonk.** Blackletter (Fraktur, Old English Text MT) es recurrente por su asociación con bandas de metal, tatuajes y estética de "orden secreta".

**Por qué funciona:** Aporta el elemento "maldito", "ancestral", "prohibido". Una insignia en Old English no es un logro — es una condena.

### Fuentes Gritty / Distorsionadas

| Fuente | Característica | Uso |
|--------|---------------|-----|
| Rubik Glitch | Simulación de glitch digital | Títulos cyber-phonk |
| Nosifer | Estilo sangrante, orgánico | Logros horror/sangre |
| Creepster | Irregular, grotesco | Efectos de miedo |
| Rampart One | Inline/outline cuadrado | Doble contorno impacto |
| Russo One | Geométrica cyrillic | Estética eslava/hardbass |

### Fuentes Inline / Outline / Stencil

- **Inline:** línea blanca recorre el interior del trazo (`Rampart One`)
- **Outline:** solo contorno, efecto estarcido (`Titan One` con `-webkit-text-stroke`)
- **Stencil:** letras troqueladas, militar/industrial (`Stardos Stencil`)

## Texturas y Efectos

La tipografía phonk rara vez se aplica plana:

1. **Noise/Grain:** superposición de textura granulada (CSS `filter: url(#noise)` o PNG overlay)
2. **Chrome/Metal:** degradados metálicos (plata, oro quemado, cobre)
3. **Distorsión VHS:** líneas de arrastre, desaturación, chromatic aberration (RGB split)
4. **Sombra múltiple:** 3-4 sombras negras descendentes para efecto 3D "pop-out"
5. **Glow rojo:** #DC2626, #FF1744 — aura exterior difusa
6. **Gradiente quemado:** negro → rojo sangre → naranja → amarillo

### CSS para Efecto Phonk Básico

```css
.phonk-title {
  font-family: 'Impact', 'Bebas Neue', sans-serif;
  font-size: clamp(48px, 10vw, 96px);
  text-transform: uppercase;
  color: #DC2626;
  text-shadow:
    2px 2px 0 #000,
    4px 4px 0 #000,
    6px 6px 0 #000,
    0 0 20px rgba(220, 38, 38, 0.5);
  background: linear-gradient(180deg, #FF1744 0%, #DC2626 50%, #B71C1C 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: url(#noise);
}
```

## Paleta Cromática Asociada

| Color | Hex | Uso |
|-------|-----|-----|
| Rojo sangre | #DC2626 | Títulos, números de era |
| Rojo neón | #FF1744 | Glows, acentos |
| Rojo oscuro | #991B1B | Sombras, variantes |
| Negro | #000000 | Fondos, sombras de texto |
| Gris carbón | #1A1A1A | Fondos secundarios |
| Blanco hueso | #F5F5F5 | Texto secundario |
| Dorado quemado | #B8860B | Rarezas (legendario) |

## Dónde Encontrar Fuentes Phonk

| Fuente | Dónde obtenerla |
|--------|----------------|
| Impact | Preinstalada Windows/Mac |
| Bebas Neue | Google Fonts |
| Anton | Google Fonts |
| Rubik Glitch | Google Fonts |
| Nosifer | Google Fonts |
| Old English Text MT | Preinstalada Windows |
| Stardos Stencil | Google Fonts |
| Bangers | Google Fonts |
| Black Ops One | Google Fonts |

## Cómo NO Usar Tipografía Phonk

1. No mezcles más de dos fuentes display
2. No uses phonk para body text (jerárquicamente agotador)
3. No abandones la legibilidad (Nosifer se ve genial, no se lee)
4. No satures de efectos (glow + textura + sombra + gradiente = ruido)
5. No ignores el espaciado (display condensadas necesitan tracking generoso)
6. No uses phonk en contextos formales (app bancaria con Bebas Neue)

## Psicología Tipográfica

### La Tipografía Habla Antes que las Palabras

Antes de leer, el cerebro procesa la mancha visual del texto. Esa forma comunica emoción antes de que el contenido semántico intervenga.

| Forma | Asociación primitiva | Respuesta |
|-------|---------------------|-----------|
| Redonda (O, C, G) | Cuerpos orgánicos | Seguridad, confort |
| Angular (A, K, V, Z) | Armas, dientes | Agresividad, alerta |
| Recta (E, F, H, I, T) | Muros, herramientas | Estabilidad, orden |
| Curva suave (U, J, D) | Olas, colinas | Fluidez, armonía |

### Legibilidad vs Expresividad

```
Legibilidad pura                    Expresividad pura
Inter ─ Open Sans ─ Lora ─ Bebas Neue ─ Impact ─ Old English ─ Script
```

Cada grado de expresividad tiene coste cognitivo:
- Inter: fijación ~200ms
- Old English: fijación ~400ms
- Fuentes display: hasta 30% más errores en lectura rápida

**Regla:** escalar expresividad con el tamaño. A mayor tamaño, más expresividad. A menor, máxima legibilidad.

### Percepción Cultural

| Fuente | Percepción Occidental |
|--------|----------------------|
| Times New Roman | Formal, académico, obsoleto |
| Helvetica | Neutral, corporativo |
| Blackletter | Heavy metal, medieval, dark |
| Impact | Gritty, internet meme, agresivo |
| Futura | Modernista, Bauhaus |

## Tipografía para Insignias

### El Desafío del Espacio Reducido

Un badge 100×100px debe contener: número romano (48-72px), nombre (14-20px), metadata.

### Numerales Romanos (I, II, III, IV...)

| Número | Problema | Solución |
|--------|----------|----------|
| I | Demasiado fino | Peso Black/Impact |
| II | Doble línea, fusión | Tracking +1px |
| III | Efecto "rejilla" | Tracking +2px |
| VIII | Máxima condensación | Tamaño 52px, tracking +3px |

| Número | Fuente | Tamaño | Tracking |
|--------|--------|--------|----------|
| I | Impact | 72px | 0px |
| II | Bebas Neue Black | 64px | +1px |
| III | Bebas Neue Black | 60px | +2px |
| IV | Anton | 68px | 0px |
| V | Bebas Neue Black | 72px | 0px |
| VI | Impact | 64px | +1px |
| VII | Anton | 58px | +2px |
| VIII | Bebas Neue Black | 52px | +3px |

### Lettering para Badges 100×100px

```
┌─────────────────┐
│  ┌───────────┐  │
│  │    VII    │  │  ← 48-60px
│  │  DOMINATOR│  │  ← 16-18px
│  │  ★★★      │  │  ← 12px
│  └───────────┘  │
└─────────────────┘
```

### Reglas de Tamaño

| Elemento | Mínimo | Óptimo | Máximo |
|----------|--------|--------|--------|
| Número era | 48px | 60px | 72px |
| Nombre logro | 14px | 16px | 20px |
| Descripción | 10px | 11px | 13px |
| Rareza | 10px | 12px | 14px |
| Fecha | 7px | 8px | 10px |

### Sistema de Variables Tipográficas

```css
:root {
  --era-number-font: 'Impact', sans-serif;
  --era-number-size: clamp(48px, 8vw, 72px);
  --era-number-color: #DC2626;
  --badge-title-font: 'Inter', sans-serif;
  --badge-title-weight: 700;
  --badge-title-size: 16px;
  --badge-body-font: 'Inter', sans-serif;
  --badge-body-size: 12px;
  --badge-meta-font: 'JetBrains Mono', monospace;
  --badge-meta-size: 9px;
}
```

### Estados Tipográficos

| Estado | Estilo | Mensaje |
|--------|--------|---------|
| Bloqueado | Opacidad 30%, gris | No disponible |
| En progreso | Biselado sutil | En construcción |
| Completado | Full color, glow | Victoria |
| Maestría | Dorado, sombra múltiple | Supremacía |
| Secreto | Outline, invisible | Misterio |

### Fuentes Recomendadas para Sistemas de Insignias

| Categoría | Fuente | Notas |
|-----------|--------|-------|
| Numerals era | Impact | Máxima condensación bold |
| Numerals era | Bebas Neue Black | Alternativa más peso |
| Numerals era | Anton | Geométrica, estable |
| Nombre logro | Inter Bold | Legibilidad perfecta 16px |
| Nombre logro | Montserrat Bold | Más personalidad |
| Descripción | Inter Regular | Neutral, funcional |
| Metadata | JetBrains Mono | Monospace técnica |

### Técnicas Avanzadas

**Optical sizing con variable fonts:**
```css
.badge-number { font-variation-settings: 'opsz' 72; }
.badge-title  { font-variation-settings: 'opsz' 16; }
```

**Clamp para responsive:**
```css
.badge-era-number {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(36px, 6vw, 72px);
  letter-spacing: clamp(-1px, -0.5vw, 0px);
  text-transform: uppercase;
}
```

**Optimización legibilidad:**
```css
-webkit-font-smoothing: antialiased;
text-rendering: optimizeLegibility;
```

### Sistema de 8 Eras

| Era | Fuente (número) | Tamaño |
|-----|-----------------|--------|
| I | Impact | 72px |
| II | Bebas Neue Black | 66px |
| III | Bebas Neue Black | 62px |
| IV | Anton | 68px |
| V | Bebas Neue Black | 72px |
| VI | Impact | 64px |
| VII | Anton | 58px |
| VIII | Bebas Neue Black | 54px |

## La Emoción Phonk

La tipografía phonk no es amigable. No busca ser legible, accesible ni inclusiva. Busca:
- **Poder:** la letra ocupa espacio, se impone
- **Peligro:** rojo y texturas sucias evocan riesgo
- **Autenticidad:** imperfección comunica "esto es real"
- **Tribu:** quien reconoce la estética pertenece a una subcultura

Es la tipografía de quien ha logrado algo en un mundo hostil. Por eso funciona en insignias: cada logro en phonk se siente ganado a base de esfuerzo.

## Referencias

- Google Fonts Knowledge: typographic classifications, readability, optical sizes
- Bringhurst: *The Elements of Typographic Style*
- Lupton: *Thinking with Type*
- Diseño de insignias Xbox, PlayStation, Steam
- Tipografía de Memphis Rap (Pinterest, Behance)
- DJ Screw: diseño de mixtapes 90s

---

## Cheatsheet Rápido

```css
/* Phonk Title - Drop-in */
.phonk-title {
  font-family: 'Impact', 'Bebas Neue', sans-serif;
  font-size: clamp(48px, 10vw, 96px);
  text-transform: uppercase;
  color: #DC2626;
  text-shadow:
    2px 2px 0 #000, 4px 4px 0 #000, 6px 6px 0 #000,
    0 0 20px rgba(220, 38, 38, 0.5);
  background: linear-gradient(180deg, #FF1744 0%, #DC2626 50%, #B71C1C 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

```yaml
3 Fuentes núcleo:
  Impact (1965)   pesos: 1   condensación: 84%   uso: era numerals, 1 palabra
  Bebas Neue      pesos: 9   condensación: media  uso: títulos largos, banners
  Anton (2012)    pesos: 1   geométrica rígida   uso: estilo industrial/grafiti

Badges 100×100px - tipografía por elemento:
  Era numeral: 48-72px (Impact / Bebas Black / Anton)
  Nombre:      14-20px (Inter Bold / Montserrat Bold)
  Descripción: 10-13px (Inter Regular)
  Metadata:     7-10px (JetBrains Mono)

Reglas de oro:
  - Máximo 2 fuentes display
  - NO usar para body text
  - NO saturar (glow + textura + sombra = ruido)
  - Tracking generoso en condensadas
  - NUNCA en contextos formales

Paleta: #DC2626 + #FF1744 + #991B1B + #000 + #F5F5F5 + #B8860B
```

---

## Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `design-skills/trends-forecasting` | Complementario | Sí (phonk + dark 2025) |
| `design-skills/visual-narrative` | Complementario | Sí (jerarquía narrativa) |
| `design-skills/icon-symbolism` | Complementario | Sí (semiología visual) |
| `design-skills/emotional-design` | Complementario | Sí (Norman visceral) |
| `design-skills/motion-ui` | Complementario | Condicional (efectos animados) |
| `frontend-visual-architecture` | Complementario | Sí (tokens, escalado) |
| `typography-phonk` (mismo nombre) | — | Esta versión consolidada |
| `accessibility-design` | Dependiente | Sí (legibilidad mínima) |

---

*Ported from `Skills-o-extra/loyalty-skills/typography-phonk` (2026-06-14).*

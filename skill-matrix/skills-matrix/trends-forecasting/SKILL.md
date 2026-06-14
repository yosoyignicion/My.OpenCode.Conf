---
name: trends-forecasting
description: "Use when the user asks about current design trends 2025-2026, future forecasting, phonk dark aura, brutalism, Y2K revival, retrowave, cyberpunk, streetwear digital, glitch art, AI-generated design, or whether a visual direction is 'on-trend' for digital products/gaming. Triggers: tendencias, phonk, brutalismo, Y2K, retrowave, cyberpunk, streetwear, moda, actual, 2025, 2026, trend, aesthetic, vaporwave, dark mode, brutalist."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "06-legend"
  source: "Skills-o-extra/legend-skills/trends-forecasting"
  ported: "2026-06-14"
  knowledge_paths:
    - conocimiento-de-diseno/08-tendencias-actuales/
---

# Trends Forecasting

## Phonk Dark Aura

Estética dominante en insignias 2024-2025:

| Elemento | Aplicación |
|----------|------------|
| Rojo neón (#FF1744) | Glows, auras, highlights |
| Negro absoluto (#000) | Fondos, contraste extremo |
| Calaveras | Iconografía principal |
| Textura sucia | Ruido granular, scanlines |
| Glow estructural | Define límites, separa capas |

Paleta phonk: negro + rojo neón + púrpura + cyan + dorado.

## Brutalismo Digital

Anti-diseño como declaración:

- Tipografía raw: system fonts, tamaños extremos
- Grids rotos: superposiciones, rotaciones
- Paleta agresiva: amarillo alto, cian, magenta
- Bordes duros (0 border-radius)
- Contraste tipográfico extremo

## Y2K y Retrowave

Nostalgia del futuro digital:

- Y2K: cromado, plástico translúcido, curvas blob, Eurostile
- Retrowave: grids perspectiva, soles partidos, magenta/cian
- Glitch: desplazamiento RGB, databending

## Streetwear Digital

Hype culture en UI:

- Box logos: texto en caja, sans-serif bold
- Drops: escasez artificial, ediciones limitadas
- Meta-diseño: comillas Off-White, cintas seguridad
- Colaboraciones inesperadas (ej: Supreme × LV)

## Proyección 2025

1. Phonk se refina: menos saturación, más calidad vectorial
2. Brutalismo se suaviza: "brutalismo con clase"
3. Y2K returns con AI: glitch generativo
4. Streetwear se vuelve estándar en UI gaming

---

## Cheatsheet Rápido

```yaml
Tendencias dominantes 2024-2026:
  Phonk Dark Aura:   rojo neón + negro + calaveras + grain + glow
  Brutalismo:        raw type, grids rotos, 0 border-radius, alto contraste
  Y2K/Retrowave:     cromado, blob, magenta/cyan, grid perspectiva
  Streetwear UI:     box logos, drops limitados, meta-diseño
  Cyberpunk:         neon, glitch RGB, scanlines, terminal

Paletas emblemáticas:
  Phonk:     #000 + #FF1744 + #DC2626 + #B8860B (dorado) + cyan/púrpura
  Y2K:       cromado + pasteles + cristal translúcido
  Brutal:    amarillo alto + cian + magenta + negro
  Retrowave: magenta + cian + púrpura + sol pixelado

Proyecciones 2025-2026:
  1. Phonk refinado (menos saturación, más vector)
  2. Brutalismo "con clase" (suavizado)
  3. Y2K + AI: glitch generativo procedural
  4. Streetwear mainstream en gaming UI
```

```css
/* Phonk Dark Aura - ejemplo de tokens */
:root {
  --phonk-bg:        #000000;
  --phonk-neon:      #FF1744;
  --phonk-blood:     #DC2626;
  --phonk-gold:      #B8860B;
  --phonk-purple:    #6B21A8;
  --phonk-cyan:      #06B6D4;
  --phonk-grain:     url('data:image/svg+xml;utf8,<svg ...>'); /* noise overlay */
}
```

---

## Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `design-skills/typography-phonk` | Complementario | Sí (phonk + dark) |
| `design-skills/emotional-design` | Complementario | Sí (nostalgia 70/30) |
| `design-skills/gamification-rewards` | Complementario | Condicional (streetwear drops) |
| `design-skills/motion-ui` | Complementario | Sí (glitch, VFX 2025) |
| `design-skills/icon-symbolism` | Complementario | Condicional (estética gaming) |
| `frontend-visual-architecture` | Complementario | Sí (tokens, theming) |
| `dark-mode` | Complementario | Sí (modo oscuro + estética) |
| `brand-identity` | Complementario | Condicional (alineación) |

---

*Ported from `Skills-o-extra/legend-skills/trends-forecasting` (2026-06-14).*

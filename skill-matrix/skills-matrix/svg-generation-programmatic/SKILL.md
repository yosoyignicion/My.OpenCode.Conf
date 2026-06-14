---
name: svg-generation-programmatic
description: "La generación programática de SVG resuelve el problema de crear gráficos vectoriales dinámicamente desde código, sin intervención manual. Covers SVG, vector, path, viewBox, curva bezier, svgo, optimización, rasterización, sharp, pngquant, zopfli, WebP"
---
# svg-generation-programmatic

## Semantic Triggers
```
SVG XML programmatic generation lxml, svg_builder add_circle add_rect add_text, shape_factory registry dispatch ShapeType, svg_validator well-formedness XSD validation, shape types circle rect ellipse line text group, convert underscores to hyphens SVG attributes
```

---

## 1. Definición Teórica

La generación programática de SVG resuelve el problema de crear gráficos vectoriales dinámicamente desde código, sin intervención manual. El principio fundamental es que SVG no es más que XML — por lo tanto, cualquier generador XML puede producir SVG. Esto permite crear iconos, badges, diagramas y gráficos adaptables, escalables y editables. Arquitectónicamente, se separa la construcción del SVG (lxml.etree con helpers específicos) de la validación (well-formedness + XSD opcional) y la factoría (registry dispatch basado en enum de tipos). Existe como alternativa ligera a librerías de renderizado (D3.js, Cairo) cuando se necesita output basado en vectores desde backend Python.

## 2. Implementación de Referencia

La implementación recomendada usa `svg_builder.py` (basado en lxml.etree) con funciones helper (`add_circle`, `add_rect`, `add_text`, etc.) y `shape_factory.py` (enum → registry dispatch). Validación híbrida: lightweight (well-formedness + element whitelist) + XSD opcional via `load_xsd()`.

### Ejemplo Práctico Avanzado

```python
# Build SVG
svg = new_svg(width=500, height=500)
add_circle(svg, cx=100, cy=100, r=50, fill="red")
add_rect(svg, x=10, y=10, width=200, height=100, fill="blue")
add_text(svg, x=50, y=50, content="Hola", fill="black")
svg_str = to_string(svg)

# Factory dispatch
from shape_factory import ShapeType, build
svg_str = build(ShapeType.CIRCLE, cx=250, cy=250, r=50, fill="red")

# Validate
result = validate(svg_str)                        # lightweight
result = validate(svg_str, use_xsd=True)          # requires load_xsd() first
is_well_formed(svg_str)                           # → bool
```

**Fuente oficial:** https://lxml.de/ — https://www.w3.org/TR/SVG2/

### Alternativa de Implementación Específica

Para renderizado complejo con animaciones o interactividad, usar `Pycairo` (binding directo a Cairo, más potente que SVG builder). Para validación SVG estricta, usar `lxml.etree.XMLSchema` contra el XSD oficial de W3C. Para transformación/optimización post-generación, pasar por `svgo` (Node.js CLI) o `scour` (Python). Para generación de SVG con template (variables reemplazables), usar `Jinja2` con plantillas SVG.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Badges, iconos dinámicos, diagramas generados por servidor, exportación vectorial, gráficos simples sin interacción |
| **Cuándo evitar** | Gráficos interactivos/complejos (D3.js, PixiJS); renderizado en frontend (SVG direct en React); imágenes raster desde SVG complejo (usar conversión a PNG con CairoSVG) |
| **Alternativas** | CairoSVG + lxml: renderizado + manipulación; Pycairo: gráficos nativos vectoriales + raster; Jinja2 + SVG templates: más simple pero sin validación XML; DrawBot: diseño gráfico programático con API Python fluida |
| **Coste/Complejidad** | Bajo para shapes simples (circle, rect); medio para grupos anidados con transformaciones y estilos; medio para validación XSD (descarga del XSD, configuración de paths) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: SVG generado no se renderiza correctamente en navegadores

**¿Qué ocasionó el error?**
Falta namespace `xmlns="http://www.w3.org/2000/svg"` en el elemento `<svg>`. Sin namespace, el navegador no reconoce el elemento como SVG.

**¿Cómo se solucionó?**
`new_svg()` debe incluir automáticamente el namespace:
```python
def new_svg(width=500, height=500):
    return etree.Element("svg", xmlns="http://www.w3.org/2000/svg",
                         width=str(width), height=str(height),
                         viewBox=f"0 0 {width} {height}")
```

**¿Por qué funciona esta técnica?**
El navegador requiere el namespace XML para identificar el elemento como SVG. Sin él, trata el contenido como HTML genérico.

### Caso: Atributo `stroke-width` no funciona — se renderiza como `stroke_width`

**¿Qué ocasionó el error?**
El helper `_set_attrs()` recibe kwargs de Python (`stroke_width=2`). En lxml, los guiones bajos se pasan literalmente, no se convierten automáticamente a guiones.

**¿Cómo se solucionó?**
```python
def _set_attrs(elem, **attrs):
    for k, v in attrs.items():
        svg_attr = k.replace("_", "-")   # stroke_width → stroke-width
        elem.set(svg_attr, str(v) if not isinstance(v, str) else v)
```

**¿Por qué funciona esta técnica?**
Python no permite guiones en nombres de keyword argument. La conversión `_` → `-` es necesaria para cumplir con la convención SVG de nombres con guiones.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** Generar SVG desde Python, badge generator, shape factory
- **Prioridad de carga:** Media — específico para generación de assets vectoriales
- **Dependencias:** Cargar junto con `svg-converter-rasterization` si se necesita output raster (PNG/JPG)

### Tool Integration

```json
{
  "tool_name": "svg-generation-programmatic",
  "description": "Genera SVG programáticamente con lxml, shape factory y validación híbrida",
  "triggers": ["svg generation", "svg builder", "shape factory", "vector graphics", "badge generator"],
  "context_hint": "Inyectar ejemplos de add_circle/add_rect + shape_factory cuando el usuario necesite generar SVG",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre generación programática de SVG, carga el skill svg-generation-programmatic
y responde siguiendo la sección de implementación de referencia con ejemplos concretos usando svg_builder.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Usar módulo de validación
python -c "
from svg_validator import validate, is_well_formed
svg_str = '<svg xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>'
print(is_well_formed(svg_str))
print(validate(svg_str))
"

# Generar y guardar SVG
python -c "
from svg_builder import new_svg, add_circle, add_rect, to_string
svg = new_svg(200, 200)
add_circle(svg, 100, 100, 50, fill='red')
with open('output.svg', 'w') as f:
    f.write(to_string(svg))
"

# Ejecutar validación XSD (requiere descarga previa)
python -c "
from svg_validator import load_xsd
load_xsd('/path/to/svg.xsd')   # una vez en la app
"

# Optimizar SVG generado con svgo
npx svgo output.svg -o output.min.svg
```

### GUI / Web

- **SVG Viewer (navegador):** Abrir SVG generado directamente en navegador para inspección visual
- **SVGOMG (jakearchibald.github.io/svgomg):** Optimización visual de SVG con sliders de precisión
- **VSCode:** SVG extension — preview inline, color picker, autocompletado de atributos SVG
- **Inkscape:** Editor SVG nativo — abrir SVG generado para ajuste manual fino
- **Boxy SVG:** Editor SVG minimalista para web basado en estándares

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar SVG | `python -c "from svg_builder import ..."` | Script runner (VSCode) |
| Validar | `python -c "from svg_validator import validate"` | Command → Validate SVG |
| Minificar | `npx svgo file.svg` | SVGOMG → Upload |
| Preview | `open output.svg` | Ctrl+Shift+V (VSCode) |

---

## 7. Cheatsheet Rápido

```python
from svg_builder import new_svg, add_circle, add_rect, add_text, to_string

svg = new_svg(500, 500)
add_circle(svg, 100, 100, 50, fill="red")
add_rect(svg, 10, 10, 200, 100, fill="blue", rx=8)
add_text(svg, 50, 50, content="Label", font_size=16, fill="black")
svg_str = to_string(svg)

from shape_factory import ShapeType, build
svg_str = build(ShapeType.BADGE, width=300, height=100, color="#ff0000")

from svg_validator import validate
result = validate(svg_str)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `svg-converter-rasterization` | Complementario — convertir SVG generado a PNG/JPG/PDF | Sí |
| `postgresql-advanced` | Complementario — persistencia de shapes SVG en DB | No |
| `sqlite-sqlalchemy-persistence` | Complementario — almacenar SVG data en SQLite | No |
| `bash-scripting-advanced` | Complementario — scripting batch de generación SVG | No |

---

## 9. Metadatos del Skill

```yaml
---
id: svg-generation-programmatic
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/svg-generation
tags: [svg, generation, lxml, vector-graphics, shape-factory, xml, badge, programmatic]
---
```

---

## Comparativa 2026 / Ecosystem (Cross-ref con svg-converter-rasterization y svg-basics)

### Anatomía del SVG

**viewBox:** `viewBox="min-x min-y width height"`. Para responsividad, usar viewBox sin width/height.

### Sintaxis de Paths (Comandos Esenciales)

| Comando | Nombre | Uso |
|---------|--------|-----|
| `M (x,y)` | Move To | Inicia un sub-path |
| `L (x,y)` | Line To | Línea recta |
| `H (x)` / `V (y)` | Horizontal / Vertical | Línea ortogonal |
| `C (x1,y1, x2,y2, x,y)` | Cubic Bezier | Curva suave 3 puntos control |
| `Q (x1,y1, x,y)` | Quadratic Bezier | Curva 1 punto control |
| `A (rx,ry, x-rot, large-arc, sweep, x,y)` | Arc | Arco elíptico |
| `Z` | Close Path | Cierra al punto inicial |

Minúsculas = coordenadas relativas.

```xml
<!-- Hexágono para insignia -->
<path d="M 50 2 L 93 25 L 93 75 L 50 98 L 7 75 L 7 25 Z" fill="#DC2626"/>
```

### Transformaciones

`transform` acepta: `translate(tx, ty)`, `scale(sx, sy)`, `rotate(deg, cx, cy)`, `skewX(a)`, `skewY(a)`, `matrix(a,b,c,d,e,f)`.

```xml
<g transform="rotate(45, 50, 50)">
  <!-- contenido rotado 45° sobre (50,50) -->
</g>
```

### Inline vs File

- **SVG inline:** preferible para insignias únicas o cambio de color vía CSS (`fill="currentColor"`)
- **SVG como archivo:** mejor para caché HTTP en navegadores

### Optimización Manual (Reglas de Oro)

1. **Preferir `<path>`** sobre `<rect>`, `<circle>`, `<polygon>` — un path bien construido ahorra atributos
2. **Eliminar `<defs>` no usados** — gradientes, máscaras y filtros no referenciados
3. **Simplificar decimales** — 3 decimales bastan para 100×100: `3.14159` → `3.142`
4. **No anidar `<g>` innecesariamente**
5. **Revisar `<use>`** — si se usa solo una vez, mejor inline

### SVGO — Optimización Automatizada (AST-based)

```javascript
// svgo.config.mjs
export default {
  multipass: true,
  floatPrecision: 3,
  plugins: [
    { name: 'preset-default', params: { overrides: {
      removeViewBox: false,     // crítico: preserve viewBox
      cleanupIds: false,        // preservar IDs
      convertColors: { shorthex: true, currentColor: true },
      mergePaths: true,
      convertShapeToPath: { convertArcs: true },
      removeUselessStrokeAndFill: true
    } } },
    'removeDimensions', 'sortAttrs', 'minifyStyles', 'reusePaths'
  ]
}
```

```bash
# Batch para carpeta
svgo -f src/svg/ -o dist/svg/ --multipass
# Insignia 2.5KB → ~1.2KB (52% reducción)
```

**Plugins críticos:**
- `removeViewBox`: **NUNCA activar** si el SVG es responsivo
- `convertShapeToPath`: Reduce `rect`, `circle`, `ellipse` a `<path>`
- `mergePaths`: Une paths adyacentes con mismo fill
- `reusePaths`: Detecta rutas duplicadas → `<use>`

**Cuidado con `currentColor`:** En pipelines que rasterizan a PNG, el color debe estar explícito o inyectado antes del renderizado. Si no se define color padre, renderiza negro por defecto.

### Pipeline Completo de Optimización

```
SVG raw (2.0KB)
  → SVGO multipass (1.0KB, -50%)
  → Rasterización a 36×36 (PNG raw: ~5KB)
  → pngquant cuantización (0.8KB, -84%)
  → zopfli deflate (0.6KB, -25%)
  → PNG final < 1KB
```

```javascript
import sharp from 'sharp'
import { execSync } from 'child_process'

async function optimizeAsset(inputSVG, output) {
  const tmp = `/tmp/${Date.now()}.tmp`
  await sharp(inputSVG, { density: 300 })
    .resize(36, 36, { kernel: 'lanczos3' })
    .png({ palette: true, colors: 64, compressionLevel: 9 })
    .toFile(tmp)
  execSync(`pngquant --quality=70-90 --speed 3 --force --ext .png "${tmp}"`)
  execSync(`zopflipng -m --iterations=5 "${tmp}" "${output}"`)
  return (await import('fs/promises')).stat(output).size
}
```

### Formatos Alternativos a PNG

| Formato | Peso (36×36) | Soporte |
|---------|-------------|---------|
| PNG | 0.7KB | Universal |
| WebP lossy | 0.4KB | Chrome, FF, Edge |
| WebP lossless | 0.9KB | Chrome, FF, Edge |
| AVIF | 0.3KB | Chrome, FF |

```javascript
// WebP
await sharp(input).resize(36, 36).webp({ lossless: false, quality: 70 }).toFile('output.webp')
// MozJPEG
await sharp(input).resize(36, 36).jpeg({ mozjpeg: true, quality: 80 }).toFile('output.jpg')
```

### Grid Consistente para Insignias

```svg
<svg viewBox="0 0 100 100">
  <!-- círculo exterior: 96px diámetro (múltiplo de 4) -->
  <circle cx="50" cy="50" r="48" stroke-width="4" />
  <g transform="translate(20, 20)">
    <!-- contenido -->
  </g>
</svg>
```

### Regla de Oro

**Nunca optimices antes de saber el contexto de visualización:** una insignia a 36px en pantallas retina (72px efectivos) tolera menos cuantización que una vista previa de 16px.

### Cross-Reference

- **svg-converter-rasterization:** Conversión a PNG/JPG/PDF (CairoSVG, rsvg-convert, Sharp) para casos donde se necesita output raster desde SVG generado programáticamente.
- **cicd-declarative-pipelines:** Integrar `svgo -f src/svg/ -o dist/svg/` + `sharp` rasterización en GitHub Actions como paso de build.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with svg-basics)*

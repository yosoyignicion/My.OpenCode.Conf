---
name: svg-converter-rasterization
description: "La conversión de SVG a formatos raster/vector resuelve el problema de compatibilidad: SVG no es soportado nativamente en todos los contextos. Covers SVG, vector, viewBox, svgo, sharp, pngquant, zopfli, WebP, AVIF, WebP lossless, asset pipeline, optimization pipeline"
---
# svg-converter-rasterization

## Semantic Triggers
```
SVG to PNG JPG PDF conversion CairoSVG Pillow, batch convert SVG list parallel ThreadPoolExecutor, format registry PNG JPG PDF presets, DPI presets web screen print quality, quality clamping JPG 50-100 range, bytes output caller writes to disk
```

---

## 1. Definición Teórica

La conversión de SVG a formatos raster/vector resuelve el problema de compatibilidad: SVG no es soportado nativamente en todos los contextos (impresión, email, algunas plataformas sociales). El principio fundamental es el *renderizado vector-to-raster*: un motor interpreta las instrucciones geométricas SVG y produce una cuadrícula de píxeles (PNG, JPG) o preserva los vectores en otro formato (PDF). CairoSVG es el motor de referencia — usa Cairo (librería de gráficos 2D) para renderizar SVG con alta fidelidad. Arquitectónicamente, la conversión se organiza como pipeline: parse SVG → render a superficie Cairo → exportar a bytes. Cada formato (PNG, JPG, PDF) tiene su propio handler con parámetros específicos (DPI, calidad, perfil de color).

## 2. Implementación de Referencia

La implementación recomendada usa CairoSVG + Pillow para conversión a PNG/JPG/PDF. Single: `convert(svg_str, fmt, preset, quality)`. Batch: `batch_convert(svg_list, fmt, preset, quality, max_workers)`. Formatos: PNG (CairoSVG directo), JPG (CairoSVG → Pillow), PDF (CairoSVG vectorial). Presets: web (72 DPI), screen (150 DPI), print (300 DPI).

### Ejemplo Práctico Avanzado

```python
# Single conversion
png_bytes = convert(svg_str, fmt="png", preset="web")
jpg_bytes = convert(svg_str, fmt="jpg", preset="screen", quality=85)
pdf_bytes = convert(svg_str, fmt="pdf")

# Batch
results = batch_convert([svg1, svg2], fmt="png", preset="print",
                        progress_callback=lambda done, total: print(f"{done}/{total}"))
```

**Fuente oficial:** https://www.cairosvg.org/ — https://pillow.readthedocs.io/

### Alternativa de Implementación Específica

Para conversión serverless en Node.js, usar `sharp` (basado en libvips, más rápido que CairoSVG para PNG/JPG). Para conversión con mayor fidelidad CSS/HTML, usar `puppeteer` (headless Chromium renderiza SVG con soporte CSS completo). Para conversión batch pesada en producción, usar `rsvg-convert` (librería librsvg, CLI, más rápida que CairoSVG en Linux).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Exportación de assets SVG a formatos estándar, generación de thumbnails, previews en web, badges para descarga |
| **Cuándo evitar** | Conversión de SVG complejos con CSS moderno (CairoSVG no soporta CSS Grid/Flexbox); formatos especializados (WebP → Sharp; AVIF → libavif); streaming de conversión muy grandes (>50MB) |
| **Alternativas** | Sharp (Node.js): más rápido, más formatos (WebP, AVIF), pero solo raster; Puppeteer: fidelidad total pero overhead de Chromium; rsvg-convert: CLI rápido en Linux, parte de librsvg; Inkscape CLI: completo pero pesado |
| **Coste/Complejidad** | Bajo para PNG simple con preset web; medio para JPG con calidad variable (Pillow conversion añade paso); medio para batch conversion (gestión de workers, memoria para SVGs grandes). CairoSVG puede fallar con SVG complejos — requerir fallback |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: CairoSVG lanza TypeError: `expected string or bytes-like object`

**¿Qué ocasionó el error?**
Se pasó un objeto lxml `Element` en lugar de un string SVG. CairoSVG espera string XML o ruta de archivo.

**¿Cómo se solucionó?**
Convertir el elemento lxml a string antes de pasar a `convert()`:
```python
svg_str = etree.tostring(svg_element, encoding="unicode", pretty_print=True)
png_bytes = convert(svg_str, fmt="png")
```

**¿Por qué funciona esta técnica?**
CairoSVG internamente parsea el SVG con su propio parser XML. Si recibe un objeto Python en lugar de XML, falla. `tostring()` serializa el árbol lxml a texto XML.

### Caso: El PNG de salida tiene fondo negro en lugar de transparente

**¿Qué ocasionó el error?**
CairoSVG por defecto usa fondo blanco. Si el SVG no define `fill` en elementos ni fondo, el resultado es blanco. JPG no soporta transparencia (rellena con negro si se fuerza).

**¿Cómo se solucionó?**
```python
# PNG con transparencia (CairoSVG mantiene alpha)
png_bytes = cairosvg.svg2png(bytestring=svg_str.encode(), background_color="transparent")
```

**¿Por qué funciona esta técnica?**
CairoSVG renderiza sobre superficie con canal alpha. Si se especifica `background_color="transparent"`, la superficie mantiene transparencia en lugar de rellenar con blanco.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** Convertir SVG a PNG/JPG/PDF, exportar imagen, batch conversion
- **Prioridad de carga:** Media — complementario a generación SVG; carga cuando se necesita output raster
- **Dependencias:** Cargar junto con `svg-generation-programmatic` si el SVG se generó programáticamente

### Tool Integration

```json
{
  "tool_name": "svg-converter-rasterization",
  "description": "Convierte SVG a PNG, JPG y PDF con CairoSVG + Pillow, incluyendo batch y presets de DPI",
  "triggers": ["svg to png", "svg converter", "cairosvg", "rasterize svg", "batch convert svg", "export svg"],
  "context_hint": "Inyectar ejemplos de convert() + format matrix + presets cuando el usuario necesite exportar SVG",
  "output_format": "markdown",
  "max_tokens": 800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre conversión de SVG a otros formatos, carga el skill svg-converter-rasterization
y responde siguiendo la sección de implementación de referencia con ejemplos de formatos y presets.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Conversión directa con CairoSVG CLI
cairosvg input.svg -o output.png
cairosvg input.svg -o output.pdf
cairosvg input.svg -o output.jpg --dpi 300

# Con rsvg-convert (alternativa rápida en Linux)
rsvg-convert -w 800 -h 600 input.svg > output.png
rsvg-convert -f pdf input.svg > output.pdf

# batch conversion con Python
python -c "
from converter import batch_convert, convert
import os
svgs = [open(f).read() for f in os.listdir('.') if f.endswith('.svg')]
results = batch_convert(svgs, fmt='png', preset='web')
for i, data in enumerate(results):
    with open(f'output_{i}.png', 'wb') as f: f.write(data)
"

# Optimizar PNG generado
pngquant --quality=80-95 output.png

# Medir resolución de salida
python -c "from PIL import Image; img = Image.open('output.png'); print(img.size, img.info.get('dpi'))"
```

### GUI / Web

- **CloudConvert:** API/SaaS de conversión entre formatos, soporta SVG → PNG/JPG/PDF/EPS
- **SVGtoPNG.com:** Herramienta web simple, drag & drop, selección de DPI y tamaño
- **VSCode:** SVG extension → right-click "Export as PNG"
- **Inkscape:** `File → Export as PNG` con preview en vivo, selección de área y DPI
- **Figma/Design tools:** Export selection → PNG/SVG/PDF con presets de calidad

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| SVG → PNG | `cairosvg input.svg -o out.png` | Right-click → Export PNG |
| SVG → JPG | `cairosvg input.svg -o out.jpg` | File → Export → JPG |
| SVG → PDF | `cairosvg input.svg -o out.pdf` | File → Export → PDF |
| Batch all | `for f in *.svg; do ... done` | Select all → Export batch |
| Quality check | `python -c "from PIL import Image"` | Image properties panel |

---

## 7. Cheatsheet Rápido

```python
from converter import convert, batch_convert

png = convert(svg_str, fmt="png", preset="web")          # 72 DPI
jpg = convert(svg_str, fmt="jpg", preset="print", quality=90)  # 300 DPI
pdf = convert(svg_str, fmt="pdf")                         # vector

results = batch_convert(svg_list, fmt="png", preset="screen", max_workers=4)
for r in results: output.write(r)
```

```bash
cairosvg in.svg -o out.png && rsvg-convert -w 800 in.svg > out.png
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `svg-generation-programmatic` | Dependiente — genera el SVG de entrada para conversión | Sí |
| `python-packaging-pyproject` | Complementario — CairoSVG + Pillow como dependencias | No |
| `bash-scripting-advanced` | Complementario — scripting batch de conversión | No |
| `async-python-concurrency` | Complementario — batch_convert asíncrono con ThreadPoolExecutor | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: svg-converter-rasterization
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/svg-converter
tags: [svg, converter, rasterization, cairosvg, pillow, png, jpg, pdf, batch-conversion]
---
```

---

## Comparativa 2026 / Ecosystem (Cross-ref con svg-generation-programmatic y svg-basics)

### Ecosistema de Conversión y Optimización SVG

```
SVG Input (raw)
  → SVGO multipass (AST optimization)
  → Sharp/rsvg-convert/CairoSVG (rasterización)
  → pngquant (cuantización paleta)
  → zopfli (deflate extremo)
  → Output: PNG/WebP/AVIF
```

### Sharp (Node.js, basado en libvips) — Preferido para Node

```javascript
import sharp from 'sharp'

// PNG con paleta indexada
await sharp(input, { density: 300 })
  .resize(100, 100, { kernel: 'lanczos3' })
  .png({ palette: true, colors: 64, compressionLevel: 9 })
  .toFile('output.png')

// 36×36 con dither
await sharp(input, { density: 300 })
  .resize(36, 36, { kernel: 'lanczos3' })
  .png({ palette: true, colors: 32, compressionLevel: 9, dither: 0.8 })
  .toFile('output.png')

// WebP lossy
await sharp(input).resize(36, 36).webp({ lossless: false, quality: 70 }).toFile('output.webp')
```

**Parámetros clave de Sharp:**
- `density: 300` — alta resolución para renderizado limpio
- `kernel: 'lanczos3'` — mejor calidad de escalado
- `palette: true` — paleta indexada (reduce tamaño)
- `colors: 64` — balance calidad/peso
- `compressionLevel: 9` — máxima compresión PNG

### Rango de Tamaños por Configuración (36×36)

| Calidad | Colores | Tamaño | Diferencia visual |
|---------|---------|--------|-------------------|
| Alta fidelidad | 100+ | 1.8-2.5KB | Imperceptible |
| Mediana | 32-64 | 0.8-1.2KB | Imperceptible |
| Extrema | 8-16 | 0.4-0.6KB | Mínima con dither |

### pngquant — Cuantización Inteligente

```bash
# Balance calidad/peso óptimo
pngquant --quality=70-90 --speed 3 --strip --force input.png -o output.png
# Máxima compresión (Web)
pngquant --quality=50-80 --speed 1 --strip --force input.png -o output.png
```

### zopfli — Compresión Deflate Extrema

```bash
zopflipng -m --iterations=15 input.png output.png
# input: 1.0KB → output: 0.7KB (-30%)
```

### CairoSVG (Python) — Usado en svg-converter-rasterization

```python
from converter import convert, batch_convert

png = convert(svg_str, fmt="png", preset="web")          # 72 DPI
jpg = convert(svg_str, fmt="jpg", preset="print", quality=90)  # 300 DPI
pdf = convert(svg_str, fmt="pdf")                         # vector

results = batch_convert(svg_list, fmt="png", preset="screen", max_workers=4)
```

```bash
cairosvg input.svg -o output.png
cairosvg input.svg -o output.pdf
cairosvg input.svg -o output.jpg --dpi 300
```

**Transparencia:** `cairosvg.svg2png(bytestring=svg_str.encode(), background_color="transparent")`.

### rsvg-convert (CLI, basado en librsvg, Linux)

```bash
rsvg-convert -w 800 -h 600 input.svg > output.png
rsvg-convert -f pdf input.svg > output.pdf
# Más rápido que CairoSVG en Linux
```

### Comparativa de Motores

| Motor | Velocidad | Fidelidad | Formatos | Caso de uso |
|-------|-----------|-----------|----------|-------------|
| Sharp (Node/libvips) | Muy rápido | Alta | PNG, JPG, WebP, AVIF, GIF | Node.js pipelines, producción |
| CairoSVG (Python) | Medio | Alta | PNG, JPG, PDF | Python integration |
| rsvg-convert (Linux) | Rápido | Alta | PNG, PDF, SVG | Linux servers, CI |
| Puppeteer (Chromium) | Lento | Máxima (CSS completo) | Todos | SVG complejo con CSS moderno |
| Inkscape CLI | Lento | Alta | PNG, PDF, EPS, SVG | Interactive preview, GUI control |

### Pipeline de Producción Completo (Badge System)

```javascript
import sharp from 'sharp'
import { execSync } from 'child_process'
import { readFile, writeFile, stat } from 'fs/promises'

async function optimizeBadge(inputSVG, output) {
  // 1. Rasterizar a 36×36
  const tmp = `/tmp/${Date.now()}.tmp`
  await sharp(inputSVG, { density: 300 })
    .resize(36, 36, { kernel: 'lanczos3' })
    .png({ palette: true, colors: 64, compressionLevel: 9 })
    .toFile(tmp)
  
  // 2. Cuantizar con pngquant
  execSync(`pngquant --quality=70-90 --speed 3 --force --ext .png "${tmp}"`)
  
  // 3. Compresión final con zopflipng
  execSync(`zopflipng -m --iterations=5 "${tmp}" "${output}"`)
  
  const { size } = await stat(output)
  return size // < 1KB
}
```

### Verificación de Integridad

```bash
# Validar sintaxis XML
xmllint --noout insignia.svg

# Verificar viewBox
grep -oP 'viewBox="[^"]*"' insignia.svg

# Contar size
wc -c insignia.svg

# Verificar consistencia de viewBox
grep -r 'viewBox' *.svg | grep -v '0 0 100 100'

# Paleta de colores usada
grep -rE '#[0-9A-Fa-f]{6}' *.svg | sort | uniq -c | sort -rn
```

Un SVG bien optimizado para insignia (100×100, 3 colores, 1 forma compuesta) debe pesar < 1KB.

### Cross-Reference

- **svg-generation-programmatic:** Genera el SVG con lxml/svg_builder que luego se pasa a este pipeline.
- **cicd-declarative-pipelines:** Automatiza este pipeline en GitHub Actions.
- **svg-basics (Skills-o-extra):** Fuente original con anatomía SVG, optimización manual y comandos SVGO.

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14 (enriched with svg-basics)*

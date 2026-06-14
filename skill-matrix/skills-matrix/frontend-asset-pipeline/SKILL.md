---
name: frontend-asset-pipeline
description: "Use when the user asks about production asset pipelines, SVG optimization, SVGO, rasterization, pngquant, zopflipng, Visual Regression Testing VRT, BackstopJS, golden files, batch processing, CI/CD for design assets, image optimization, WebP, AVIF, format selection. Covers SVG→PNG pipelines, optimization strategies, VRT threshold tuning."
---

# Frontend Asset Pipeline & Quality Control

## Semantic Triggers
```
SVGO multipass floatPrecision removeViewBox, Sharp librsvg CairoSVG rasterization Lanczos3 density, pngquant zopflipng MozJPEG WebP AVIF, Visual Regression Testing VRT BackstopJS golden files, pixel diff ImageMagick compare AE metric, CI/CD GitHub Actions asset pipeline, monorepo recolor era palette swap, batch processing try/catch per file, design tokens JSON Style Dictionary, badge icon system production
```

---

## 1. Definición Teórica

A production asset pipeline transforms raw design files (SVG, PNG, Lottie) into optimized web assets through deterministic, automated stages: SVG optimization (SVGO) → rasterization (Sharp/librsvg) → format conversion (pngquant, zopflipng, Squoosh) → quality verification (VRT, pixel diff, file size gates). The goal is **reproducibility**: given the same source SVG and pipeline version, the output must be byte-identical (or within a defined tolerance for lossy formats).

Visual Regression Testing (VRT) is the QA gate: golden files (approved baseline PNGs) are compared against pipeline output using pixel diff (ImageMagick `compare -metric AE`) or perceptual diff (BackstopJS). Mismatch thresholds vary by format — PNG lossless should be 0% diff, PNG quantized accepts 2% (dithering noise), WebP lossy accepts 5% (perceptual compression). When diff exceeds threshold, the build fails and the change is reviewed before approval.

Batch processing (200+ assets in 30s) requires per-file `try/catch` — one malformed SVG must NOT halt the pipeline. Color recoloring (era/season variants) is a token-replace operation, not a redraw: 20 base SVGs × 5 palettes = 100 variants in ~200ms when palette swap is text replacement. The pipeline is the single source of truth for visual output.

---

## 2. Implementación de Referencia

### SVG Optimization (SVGO)

```javascript
// svgo.config.js
export default {
  multipass: true,
  floatPrecision: 3,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false, cleanupIds: false } } },
    'removeDimensions',
    'sortAttrs',
    'minifyStyles',
    'reusePaths',
  ],
}
```

```bash
# Batch optimize
svgo -f src/svg/ -o dist/svg/ --multipass
# Benchmark: 2.5KB SVG → ~1.2KB (52% reduction)
```

**Manual SVG optimization rules** (when SVGO is not enough):

1. Prefer `<path>` over `<rect>`, `<circle>`, `<polygon>`
2. Eliminate unused `<defs>`
3. Simplify decimals (3 digits enough for 100×100 viewBox)
4. Avoid unnecessary `<g>` nesting
5. Inline `<use>` if used only once

### SVG Rasterization Pipeline

For 36×36px output, each pixel covers ~2.78 SVG units. Rasterize at 3-4x (144×144) and downscale for quality.

| Tool | Time (20 SVG→36px) | Quality AA | SVG 1.1 support |
|---|---|---|---|
| Sharp | 0.9s | Excellent | 1.1 partial |
| librsvg | 2.1.1s | Excellent | 1.1 complete |
| CairoSVG | 3.8s | Excellent | 1.1 complete |
| ImageMagick | 4.5s | Good | 1.1 complete |

```javascript
// Recommended pipeline: SVGO → Sharp (density 300) → pngquant
import sharp from 'sharp'

await sharp('insignia.svg', { density: 300 })
  .resize(36, 36, { kernel: sharp.kernel.lanczos3, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ palette: true, colors: 64, compressionLevel: 9 })
  .toFile('output.png')
```

**Transparency / halo fix** — flatten against real background color to avoid white halos on alpha edges:

```javascript
.flatten({ background: '#1A1A1A' }) // dark background for dark-mode badges
```

### Batch Processing Architecture

```
/src/svg/[01-20].svg
  → 1. SVGO multipass
  → 2. Sharp rasterize (SVG→PNG 36×36)
  → 3. Recolor by era (5 palettes)
  → 4. pngquant compress
  → 5. Export to PNG, WebP, GIF, APNG
  → /dist/[era]/[format]/[01-20].*
```

**Per-file try/catch** — one malformed asset must not halt the pipeline:

```javascript
async function processFile(svgPath) {
  try {
    const optimized = await svgo.optimize(fs.readFileSync(svgPath, 'utf8'))
    const png = await sharp(Buffer.from(optimized.data), { density: 300 })
      .resize(36, 36, { kernel: sharp.kernel.lanczos3 })
      .png({ palette: true, colors: 64 })
      .toBuffer()
    return { svgPath, png, ok: true }
  } catch (err) {
    console.error(`Failed: ${svgPath}`, err.message)
    return { svgPath, error: err.message, ok: false }
  }
}

const results = await Promise.all(svgPaths.map(processFile))
const failed = results.filter(r => !r.ok)
if (failed.length) console.warn(`${failed.length} files failed`, failed)
```

**Color recolor strategy** — maintain 20 base SVGs with canonical palette (Era 1), recolor programmatically for other eras. Palette swap via text replace is ~200ms for 20 badges × 5 eras.

### Extreme Weight Optimization

```
SVG raw (2.0KB) → SVGO (1.0KB, -50%) → PNG raw (~5KB) → pngquant (0.8KB, -84%) → zopfli (0.6KB, -25%) → PNG final < 1KB
```

**Phases**:
1. **SVGO multipass** — `floatPrecision: 2`, aggressive profile
2. **Controlled rasterization** — `palette: true`, `colors: 32-64`, `compressionLevel: 9`
3. **pngquant** — `--quality=70-90 --speed 3 --strip`
4. **zopflipng** — `-m --iterations=15` (100x slower, -30% additional)

**Format size benchmark (36×36px)**:

| Format | Size | Support |
|---|---|---|
| PNG | 0.7KB | Universal |
| WebP lossy | 0.4KB | Chrome, FF, Edge |
| WebP lossless | 0.9KB | Chrome, FF, Edge |
| AVIF | 0.3KB | Chrome, FF |
| MozJPEG | 0.5KB | Universal (no transparency) |

### Visual Regression Testing (VRT)

**BackstopJS configuration**:

```json
{
  "scenarios": [{
    "label": "insignia_01_era1",
    "url": "file:///dist/era_1/png/01.png",
    "misMatchThreshold": 0.1,
    "requireSameDimensions": true
  }]
}
```

```bash
backstop reference  # generate golden files (first time)
backstop test       # run regression tests
backstop approve    # approve visual changes after review
```

**Pixel-level diff with ImageMagick**:

```bash
magick compare -metric AE golden/01.png dist/era_1/png/01.png diff.png
# AE = Absolute Error (count of differing pixels)
```

**Tolerances by format**:

| Format | Threshold | Reason |
|---|---|---|
| PNG lossless | 0.5% | Must be identical |
| PNG quantized | 2% | Dithering introduces noise |
| WebP lossy | 5% | Variable perceptual compression |

**Automated fidelity check**:

```javascript
async function checkFidelity(original, optimized) {
  const [a, b] = await Promise.all([
    sharp(original).raw().toBuffer(),
    sharp(optimized).raw().toBuffer(),
  ])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
  const mse = diff / (a.length / 4)
  return mse < 5 // tolerance for 36×36
}
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Build Assets
on:
  push:
    branches: [main]
    paths: ['src/svg/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: node pipeline.js
      - name: Check file sizes
        run: |
          for f in dist/**/png/*.png; do
            size=$(stat -c%s "$f")
            if [ $size -gt 1500 ]; then
              echo "ALERT: $f exceeds 1.5KB ($size bytes)"
              exit 1
            fi
          done
      - name: Visual regression
        run: |
          magick compare -metric AE golden/01.png dist/era_1/png/01.png /dev/null 2>&1 | \
            awk '{ if ($1 > 50) { print "FAIL: diff=" $1; exit 1 } }'
      - name: Deploy to CDN
        uses: peaceiris/actions-gh-pages@v3
        with:
          publish_dir: ./dist
```

### SVG Integrity Verification

```bash
xmllint --noout insignia.svg          # validate well-formedness
grep -oP 'viewBox="[^"]*"' insignia.svg  # confirm viewBox
wc -c insignia.svg                    # size budget check
```

**Quality bar**: a well-optimized badge SVG (100×100, 3 colors) must weigh < 1KB.

### Optimization Tools Reference

| Tool | Format | Function |
|---|---|---|
| SVGO | SVG | Code optimization (30-60% reduction) |
| lottiefiles.com | Lottie | Preview + optimization |
| Squoosh | WebP/AVIF | Compression with preview |
| pngquant | PNG | Perceptual quantization |
| zopflipng | PNG | Extreme deflate compression |
| FFmpeg | MP4/HEVC/WebM | Encoding and control |
| Bodymovin | Lottie | AE→JSON export |

**Official source:** https://github.com/svg/svgo · https://github.com/lovell/sharp-libvips · https://github.com/garris/BackstopJS

---

## 3. Trade-offs y Decisiones de Arquitectura

### When to Use Each Format

| Scenario | Recommended | Reason |
|---|---|---|
| Icons, badges, logos | SVG → WebP/AVIF | Vector scales, modern format for raster fallback |
| Photos | WebP lossy / AVIF | 30-50% smaller than JPEG at same quality |
| Transparent graphics | PNG (quantized) or WebP lossless | Alpha channel support |
| Animation | Lottie (vector) / APNG / WebP animated | Lottie is smallest for vector anims |
| Favicons | SVG (modern) + PNG fallback | SVG scales, ICO for legacy |

### Optimization Strategy Decision

| Goal | Pipeline | Trade-off |
|---|---|---|
| Maximum compression | SVGO + zopfli + AVIF | Slowest, smallest output |
| Balanced | SVGO + pngquant + WebP | Good for batch 100+ files |
| Speed | SVGO + sharp (palette:64) | Fastest, larger output |
| Lossless archival | SVGO + zopfli max iterations | No quality loss, slowest |

### VRT Threshold Tuning

| Asset type | Threshold | Reason |
|---|---|---|
| Geometric icons | 0.1% | Should be pixel-identical |
| Photographic | 5% | Perceptual compression varies |
| Animated | 2% | Frame timing changes cause diffs |
| Text rendering | 0% | Font hinting should be identical |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: SVG has white halos on dark background after PNG export

**What caused the issue?**
Rasters from Sharp with alpha channel show white halos around edges when placed on dark mode UI.

**How was it resolved?**
Flatten the PNG against the target background color before saving:

```javascript
await sharp(svgBuffer, { density: 300 })
  .resize(36, 36, { kernel: sharp.kernel.lanczos3, fit: 'contain' })
  .flatten({ background: '#1A1A1A' }) // match dark mode
  .png({ palette: true, colors: 64 })
  .toFile('output.png')
```

**Why does this work?**
Anti-aliased SVG edges have partial alpha (e.g. 30% transparent pixels at the border). When placed on a dark background, those pixels composite with the underlying color, creating a visible halo. `flatten()` composites against the explicit background color BEFORE saving, eliminating the halo.

### Caso: VRT test fails after legitimate design change

**What caused the issue?**
A badge SVG was intentionally redesigned (new icon, new color). BackstopJS reports >5% pixel diff, failing CI.

**How was it resolved?**
Visually review the diff image, then approve if intentional:

```bash
backstop test       # generates diff.png for each scenario
# Review diff.png in browser/editor
backstop approve    # replaces golden files with current output
git add backstop_data/bitmaps_reference/
git commit -m "chore(vrt): approve badge-01 redesign"
```

**Why does this work?**
`backstop approve` updates the reference (golden) files to match the new approved output. Subsequent CI runs compare against the updated baseline. The diff image is preserved for audit history.

### Caso: `pngquant` not finding executables on macOS

**What caused the issue?**
Pipeline fails with `Error: spawn pngquant ENOENT` on macOS CI runners.

**How was it resolved?**
Use the Node-native bindings (`imagemin-pngquant`) or install the binary via Homebrew in CI:

```yaml
- name: Install pngquant
  run: brew install pngquant
```

Or use `sharp` directly with `palette: true, colors: N` which uses built-in libimagequant:

```javascript
.png({ palette: true, colors: 64 }) // sharp handles quantization internally
```

**Why does this work?**
`sharp` uses libvips + libimagequant, which are bundled as native binaries. No external `pngquant` executable required. This is the recommended path for cross-platform CI.

### Caso: Recolored badge palette produces wrong colors

**What caused the issue?**
Era 2 recolor produces unexpected colors — the hex code swap affects other elements that share the same hex (e.g. shadows, highlights, text).

**How was it resolved?**
Use unique sentinel colors per layer (e.g. `{{era1-primary}}` tokens) and replace by token, not by raw hex:

```javascript
// ❌ Replace #DC2626 globally — affects shadows that use same hex
const recolored = svg.replaceAll('#DC2626', '#1E40AF')

// ✅ Replace by semantic token
const recolored = svg.replaceAll('{{primary}}', '#1E40AF')
```

**Why does this work?**
Token-based replacement targets only the intended layer. Raw hex replacement is brittle — multiple visual elements can share the same color, and swapping the hex changes them all. Tokens add semantic context to the color value.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimated when invoking this skill
- **Trigger de activación:** "SVGO", "sharp", "pngquant", "VRT", "backstopjs", "asset pipeline", "image optimization", "webp", "avif", "CI/CD assets" in the query
- **Prioridad de carga:** Media — design system / production asset tasks
- **Dependencias:** `frontend-visual-architecture`, `cicd-declarative-pipelines`, `svg-basics`, `svg-converter-rasterization`

### Tool Integration

```json
{
  "tool_name": "frontend-asset-pipeline",
  "description": "SVG optimization, rasterization, pngquant, VRT, golden files, batch processing for design assets",
  "triggers": ["svgo", "sharp", "pngquant", "zopflipng", "webp", "avif", "vrt", "backstopjs", "asset pipeline", "ci/cd assets", "recolor era"],
  "context_hint": "Inject section 2 (Implementation) for Sharp + SVGO pipeline. Section 3 for format decision. Section 4 for halo/VRT/PNG quant FAQ.",
  "output_format": "markdown",
  "max_tokens": 3500
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about SVG optimization, image compression, VRT, or design asset pipelines,
load the skill frontend-asset-pipeline and provide a reproducible pipeline (SVGO → Sharp →
pngquant → zopflipng). Reference BackstopJS for VRT and provide format decision matrix
(PNG vs WebP vs AVIF). Prioritize deterministic, byte-identical output.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# SVG optimization
svgo -f src/svg/ -o dist/svg/ --multipass

# Batch rasterize
node pipeline.js  # full SVGO → Sharp → pngquant pipeline

# VRT
backstop reference   # generate golden files
backstop test        # run regression
backstop approve     # approve visual changes

# Pixel diff
magick compare -metric AE golden/01.png dist/01.png diff.png

# Integrity checks
xmllint --noout insignia.svg
wc -c insignia.svg
# Image optimization
npx squoosh-cli --webp '{"quality":80}' input.png
ffmpeg -i input.png -c:v libaom-av1 -crf 30 output.avif

# File size gate
find dist -name "*.png" -size -100c -delete  # remove suspiciously small (likely broken)
find dist -type f -empty -delete
```

### GUI / Web

- **Squoosh (squoosh.app)**: visual WebP/AVIF/JPEG compression with side-by-side preview
- **lottiefiles.com/preview**: Lottie animation preview and optimization
- **BackstopJS report**: HTML report with diff images per scenario
- **ImageMagick `display`**: show diff.png overlay with red highlight on changed pixels
- **SVGO Playground**: live SVG optimization preview

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Optimize SVG | `svgo file.svg` | svgo.dev |
| Compare images | `magick compare ...` | ImageMagick display |
| Run VRT | `backstop test` | open `backstop_data/html_report/index.html` |
| Approve golden | `backstop approve` | click "Approve" in HTML report |
| Recolor SVG | `node recolor.js --era 2` | — |

---

## 7. Cheatsheet Rápido

```javascript
// SVGO config (svgo.config.js)
export default {
  multipass: true,
  floatPrecision: 3,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false, cleanupIds: false } } },
    'removeDimensions',
    'sortAttrs',
    'minifyStyles',
    'reusePaths',
  ],
}

// Sharp SVG→PNG with dark-mode flatten
await sharp(svgBuffer, { density: 300 })
  .resize(36, 36, { kernel: sharp.kernel.lanczos3, fit: 'contain' })
  .flatten({ background: '#1A1A1A' })
  .png({ palette: true, colors: 64, compressionLevel: 9 })
  .toFile('output.png')

// Per-file safe batch
const results = await Promise.all(paths.map(p => processFile(p).catch(e => ({ p, error: e }))))

// BackstopJS scenario
{ "label": "badge_01", "url": "file:///dist/01.png", "misMatchThreshold": 0.1, "requireSameDimensions": true }

// CI size gate
if [ $(stat -c%s "$f") -gt 1500 ]; then echo "FAIL: $f > 1.5KB"; exit 1; fi
```

```bash
# Full pipeline
svgo -f src/ -o dist/svg/
node pipeline.js             # rasterize + recolor
backstop test               # VRT
magick compare -metric AE golden/01.png dist/01.png /dev/null
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `frontend-visual-architecture` | Complementario | Sí |
| `svg-basics` | Dependiente | Sí |
| `svg-converter-rasterization` | Complementario | Sí |
| `svg-generation-programmatic` | Complementario | Condicional (programmatic SVG) |
| `cicd-declarative-pipelines` | Complementario | Sí (CI/CD integration) |
| `design-systems-atomic` | Complementario | Sí (token-based design) |

---

## 9. Metadatos del Skill

```yaml
---
id: frontend-asset-pipeline
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/master-skills/pipeline-quality
tags: [svgo, sharp, pngquant, zopflipng, webp, avif, vrt, backstopjs, asset-pipeline, design-tokens, ci-cd, rasterization, optimization]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `pipeline-quality` (Skills-o-extra/master-skills).*

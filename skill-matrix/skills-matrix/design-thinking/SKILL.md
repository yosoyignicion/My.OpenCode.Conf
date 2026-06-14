---
name: design-thinking
description: "Use when the user asks about design thinking methodology, creative process, ideation, prototyping, iteration, conceptualization, empathy mapping, user research, double diamond, design sprint, jobs to be done, or UX laws (Fitts, Hick, Jakob). Covers the 5-phase process (Empatizar/Definir/Idear/Prototipar/Testear), divergent→convergent thinking, visual regression testing, and rapid SVG/token prototyping."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "06-legend"
  source: "Skills-o-extra/legend-skills/design-thinking"
  knowledge_paths:
    - conocimiento-de-diseno/02-psicologia-percepcion/
    - conocimiento-de-diseno/06-branding-identidad/
---

# Design Thinking: Metodología y Proceso Creativo

## Semantic Triggers
```
design thinking creative process methodology, empathy mapping user research, double diamond design sprint, jobs to be done JTBD, ideation prototyping iteration, divergent convergent thinking, Fitts Hick Jakob law, visual regression BackstopJS, SVG direct token system, badge system design process, moodboard sketching rapid iteration
```

---

## 1. Definición Teórica

El design thinking es un **proceso iterativo de 5 fases** (Empatizar → Definir → Idear → Prototipar → Testear) que resuelve problemas complejos centrados en el usuario. A diferencia del pensamiento lineal, alterna **divergencia** (explorar muchas ideas) y **convergencia** (seleccionar y refinar) en cada fase.

El ciclo ideal para un badge o sistema visual: 3-5 iteraciones antes de producción. **No es un proceso rígido** sino un marco adaptable: el doble diamante (Discover/Define/Develop/Deliver) lo formaliza, los Design Sprints (5 días, Google Ventures) lo aceleran, y los **Jobs to be Done** lo anclan en motivación del usuario.

La regla de oro: **prototipar rápido, fallar barato, iterar mucho**. SVG directo (no Illustrator), sistema de tokens, y generación programática de variantes son las técnicas técnicas que materializan este mindset en producción.

---

## 2. Implementación de Referencia

### Las 5 Fases del Design Thinking

#### 1. Empatizar
**Objetivo:** entender al usuario, su cultura, sus frustraciones.

**Actividades para insignias / branding:**
- Investigar cultura phonk, streetwear, tendencias actuales
- Entender al usuario: ¿qué significa pertenencia para un streamer?
- Analizar competencia: Twitch, Discord, Reddit, Kick badge systems
- Entrevistas (5-8 usuarios es suficiente para patrón)
- Empathy map: ¿qué piensa/siente/ve/dice/oce el usuario?

**Output:** insights de usuario, pain points, jobs to be done.

#### 2. Definir
**Objetivo:** sintetizar insights en un problema concreto y principios de diseño.

**Actividades:**
- Identificar puntos de dolor en sistemas existentes
- Definir jerarquía visual por era y nivel
- Establecer principios de diseño (contraste, consistencia, progresión)
- Crear HMW (How Might We): "¿Cómo podríamos hacer que el usuario SIENTA que su lealtad es reconocida?"

**Output:** POV (Point of View), HMW, principios de diseño.

#### 3. Idear
**Objetivo:** generar volumen de ideas sin filtrar.

**Actividades:**
- Sketching rápido de formas base (escudo, diamante, círculo)
- Exploración cromática: paletas por era
- Moodboards de referencias phonk, brutalismo, retrowave
- Crazy 8s: 8 ideas en 8 minutos
- "Sí, y..." en lugar de "No, pero..."

**Output:** 20-50 ideas, sin commitment.

#### 4. Prototipar
**Objetivo:** materializar las mejores ideas en forma testeable.

**Actividades:**
- SVG directo (no Illustrator) para control preciso
- Sistema de tokens para iteración rápida
- Generación programática de variantes
- Wireframes de baja fidelidad primero
- Figma con auto-layout para refinar

**Output:** prototipo interactivo, Figma shareable, código ejecutable.

#### 5. Testear
**Objetivo:** validar con usuarios reales, iterar basado en feedback.

**Actividades:**
- Visual regression testing (BackstopJS, Chromatic)
- Pruebas de legibilidad a 36×36px
- A/B testing de variantes
- 5-user testing: 5 usuarios encuentran el 85% de issues
- Sesiones de feedback 1:1

**Output:** insights de validación, lista de mejoras priorizadas.

### Proceso Creativo Profesional

```
Input → Divergencia (muchas ideas)
       → Convergencia (selección)
       → Prototipo rápido
       → Feedback
       → Iteración
       → Output final
```

**Ciclo ideal:** 3-5 iteraciones por badge antes de producción.

### Frameworks de Pensamiento de Diseño

#### Double Diamond
Estructura: Discover → Define → Develop → Deliver
- **Discover** (divergencia): investigación, exploración amplia
- **Define** (convergencia): sintetizar el problema
- **Develop** (divergencia): idear soluciones
- **Deliver** (convergencia): prototipar, testear, refinar

#### Design Sprint (Google Ventures, 5 días)
- **Lunes:** Map (entender el problema)
- **Martes:** Sketch (idear soluciones)
- **Miércoles:** Decide (seleccionar mejor idea)
- **Jueves:** Prototype (construir prototipo realista)
- **Viernes:** Test (validar con 5 usuarios)

#### Jobs to be Done (JTBD)
"El badge ayuda al usuario a sentirse parte de una tribu"
- **Job funcional:** mostrar lealtad / tiempo invertido
- **Job emocional:** pertenencia, orgullo
- **Job social:** señalización de estatus

#### Leyes UX
- **Fitts:** tiempo de click = función de distancia + tamaño (CTAs grandes + cerca)
- **Hick:** tiempo de decisión = log(n) de opciones (simplificar choices)
- **Jakob:** usuarios prefieren familiaridad (consistency > novelty)
- **Miller:** memoria de trabajo = 7±2 items (chunks de info)
- **Fitts + Hick aplicadas a badges:** pocas insignias prominentes > muchas pequeñas

### Técnicas de Prototipado Rápido

#### SVG Directo (vs Illustrator)
**Ventajas:**
- Control preciso (píxel-exact)
- Diff en Git = texto, no binario
- Optimizable con SVGO
- Animable con CSS/SMIL
- Programáticamente generable (loops, variants)

**Workflow:**
```bash
# 1. Crear SVG inicial
echo '<svg viewBox="0 0 100 100">...</svg>' > badge.svg

# 2. Validar visualmente
open badge.svg

# 3. Iterar con edit
# 4. Optimizar para producción
npx svgo badge.svg -o badge.optimized.svg
```

#### Sistema de Tokens
**Ventajas:**
- Cambiar un color = propagar a 100 insignias
- Theme switching (light/dark) sin re-diseñar
- Versionable (token-version = diseño-version)

**Estructura:**
```json
{
  "rarity": {
    "common":    { "color": "#9CA3AF", "glow": 0 },
    "rare":      { "color": "#3B82F6", "glow": 4 },
    "epic":      { "color": "#A855F7", "glow": 8 },
    "legendary": { "color": "#F59E0B", "glow": 12 }
  }
}
```

#### Generación Programática de Variantes
```javascript
// Generar 20 insignias con variantes
const badges = Array.from({ length: 20 }, (_, i) => {
  const level = i + 1;
  const rarity = level >= 15 ? 'legendary' : level >= 10 ? 'epic' : 'rare';
  return {
    id: `badge-${level}`,
    color: tokens.rarity[rarity].color,
    glow: tokens.rarity[rarity].glow,
    era: Math.floor(i / 5) + 1
  };
});
```

### Validación y Testing

#### Visual Regression Testing

**BackstopJS (workflow clásico):**
```bash
npm install -g backstopjs
backstop init          # crear config
backstop reference     # capturar baseline
# hacer cambios
backstop test          # comparar
```

**Chromatic (Storybook-based, moderno):**
```bash
npm install --save-dev chromatic
npx chromatic --project-token=<token>
# Visual diff per story
```

#### Pruebas de Legibilidad

**Test 36×36px:**
1. Renderizar icono a tamaño real
2. Blurear con feGaussianBlur stdDeviation=0.5
3. Reducir saturación al 70%
4. ¿Aún se reconoce? Si no, simplificar.

**Test 16×16px (tooltip):**
1. ¿La silueta es distinguible de otras 5 insignias?
2. ¿El color dominante comunica rareza?
3. Si no, rediseñar a nivel de silueta.

#### A/B Testing para Diseño

```yaml
Variante A: Glow 3 capas + animation 4s
Variante B: Glow 2 capas + animation 2s
Métrica:    Click-through rate, time-on-page
Mínimo:     1000 usuarios por variante, 95% confianza
Duración:   7-14 días (cubrir cycle semanal)
```

### Herramientas por Fase

| Fase | Herramientas |
|------|--------------|
| Empatizar | User interviews, empathy map, surveys (Typeform, Google Forms) |
| Definir | POV, HMW, jobs to be done canvas |
| Idear | Miro, FigJam, sticky notes, Crazy 8s |
| Prototipar | Figma, SVG + CodePen, Storybook, Framer |
| Testear | Maze, UsabilityHub, BackstopJS, Lookback |

---

## 3. Trade-offs y Decisiones de Arquitectura

| Decisión | Pros | Contras |
|---|---|---|
| Design Sprint 5 días | Acelerado, timeboxed | Costo alto, presión de tiempo |
| Double Diamond completo | Exhaustivo, defensible | Lento (semanas-meses) |
| Iteración rápida (3-5 cycles) | Balance velocidad/calidad | Requiere disciplina |
| SVG directo | Diff-friendly, animable | Curva de aprendizaje |
| Figma + handoff | Designer-led, visual | Puede no traducir a código 1:1 |
| Token system | Consistencia, theming | Overhead inicial, más archivos |
| Visual regression | Detecta regresiones | Setup cost, false positives |
| User testing con 5 usuarios | Suficiente para 85% issues | No escalable a poblaciones grandes |
| A/B testing | Cuantitativo | Requiere tráfico, semanas de datos |

### Cuándo Usar Cada Framework

- **Proyecto pequeño, urgencia alta:** Design Sprint (5 días)
- **Sistema nuevo, exploración amplia:** Double Diamond
- **Mejora de feature existente:** iteración rápida con A/B
- **Validación de concepto:** Crazy 8s + prototipos low-fi
- **Validación de producción:** A/B testing + analytics

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Equipo pierde 3 semanas en fase de ideación sin converger

**What caused the issue?**
La fase de idear se vuelve un "dumpster de ideas" sin proceso de selección. El equipo genera 50 ideas, las discute todas, no prioriza, y nunca llega a prototipo.

**How was it constrained?**
Establecer **timebox + criterios de selección**:

```yaml
Día 1 (3h):   Generar 30 ideas individualmente (no collaboration)
Día 1 (1h):   Votación dot-voting (cada persona 3 votos)
Día 2 (2h):   Top 5 ideas → prototipo low-fi
Día 2 (1h):   Selección de 1 idea basada en criterios:
                - ¿Resuelve el HMW definido?
                - ¿Es técnicamente factible en 2 sprints?
                - ¿Diferencia del status quo?
```

**Why does this work?**
La divergencia sin convergencia es parálisis. Forzar timeboxes obliga al cerebro a pasar de "generar" a "seleccionar". Dot-voting democratiza la priorización. Criterios explícitos eliminan debate subjetivo.

### Caso: Diseño de insignia luce "plano" sin diferenciación clara entre niveles

**What caused the issue?**
El diseñador añadió los mismos elementos a todos los niveles (color, glow, shape) sin cuantificar la **diferenciación progresiva**. Sin un sistema cuantitativo, el ojo no detecta jerarquía.

**How was it resolved?**
Aplicar el sistema de **5 ejes con valores incrementales**:

```yaml
Nivel 1:  forma=1, color=1, glow=0,  animation=0, textura=plana
Nivel 5:  forma=2, color=1, glow=4,  animation=0, textura=mate
Nivel 10: forma=3, color=2, glow=8,  animation=breathe, textura=mate
Nivel 15: forma=5, color=4, glow=12, animation=rotacion, textura=densa
Nivel 20: forma=8, color=5, glow=20, animation=todo, textura=especular
```

**Why does this work?**
El cerebro humano necesita **diferencias cuantitativas** para categorizar. Un sistema con valores numéricos (glow 0→4→8→12→20) crea progresión obvia; un sistema cualitativo (poco/brillo/mucho) se ve subjetivo. La cuantificación es la diferencia entre "N20 se ve mejor" y "N20 tiene 5× más glow + 3 animaciones + 2 texturas que N1".

### Caso: Stakeholder pide "más innovación" sin saber qué significa

**What caused the issue?**
"Innovación" es palabra vacía cuando no se ancla a un sistema. El stakeholder pide cambio por pedir, sin dirección concreta. El diseñador propone variantes, todas rechazadas como "no es lo que pedí".

**How was it resolved?**
Anclar "innovación" a un **eje específico** del sistema:

```yaml
# Pregunta al stakeholder
"¿Innovación en qué eje?"
[ ] Forma:    siluetas no exploradas
[ ] Color:    paletas nuevas
[ ] Glow:     efectos visuales
[ ] Animación: motion diferenciado
[ ] Textura:  materiales no usados

# Luego, prototipo de 1 eje a la vez
Variante A: nueva forma (calavera + alas)
Variante B: nuevo glow (neón cyan)
Variante C: nueva animación (partículas en órbita)

# Test cualitativo: ¿cuál se siente más "innovadora"?
```

**Why does this work?**
"Innovación" sin eje es genérica. Forzar la selección de 1 eje concreto produce comparables y, paradójicamente, más creatividad. Es la misma lógica de los Design Sprints: **constreñimiento genera creatividad**.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimated when invoking this skill
- **Trigger de activación:** "design thinking", "creative process", "ideation", "prototyping", "iteration", "double diamond", "design sprint", "JTBD" in the query
- **Prioridad de carga:** Baja — load only when user asks about process/methodology
- **Dependencias:** `cultural-references` (moodboards), `trends-forecasting` (contexto), `frontend-visual-architecture` (sistema), `badge-system` (caso de uso)

### Tool Integration

```json
{
  "tool_name": "design-thinking",
  "description": "Design thinking methodology, 5-phase process, double diamond, design sprint, JTBD, rapid SVG prototyping, visual regression",
  "triggers": ["design thinking", "creative process", "ideation", "prototyping", "iteration", "double diamond", "design sprint", "JTBD", "jobs to be done", "empathy map", "Fitts law", "Hick law"],
  "context_hint": "Inject section 2 (5-phase process, frameworks, prototyping tools) for process guidance. Section 4 for prioritization and innovation FAQ.",
  "output_format": "markdown",
  "max_tokens": 3500
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about design thinking, creative process, ideation, prototyping, or iteration methodology,
load the skill design-thinking and provide:
1. 5-phase process (Empatizar/Definir/Idear/Prototipar/Testear) with divergent→convergent thinking
2. Frameworks: Double Diamond, Design Sprint (5 días), Jobs to be Done
3. UX laws: Fitts (tiempo de click), Hick (log(n) decisiones), Jakob (familiaridad)
4. Prototipado rápido: SVG directo, sistema de tokens, generación programática
5. Validación: visual regression (BackstopJS/Chromatic), legibilidad 36×36px, A/B testing
Always emphasize timeboxing to avoid parálisis and quantitative differentiation systems.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generar variantes programáticas
node generate-badges.js --count 20 --output ./badges/

# Visual regression
npx backstopjs test
npx chromatic --project-token=xxx

# Optimizar SVG después de iterar
npx svgo badges/*.svg --multipass

# A/B testing
npx statsig-cli experiment create --name "badge-glow-v2"
```

### GUI / Web

- **Figma / FigJam**: ideación colaborativa, moodboards, wireframes
- **Miro**: workshops de design thinking, sticky notes remotos
- **Maze**: testing de prototipos Figma con métricas
- **UsabilityHub**: pruebas de preferencia, 5-second test
- **Milanote**: moodboards visuales
- **Typeform**: encuestas de user research
- **Lookback**: sesiones de user testing grabadas
- **Storybook**: catálogo de componentes, visual regression

### Hotkeys / Atajos

| Acción | Atajo Figma | Atajo Code |
|---|---|---|
| Crear frame | F | — |
| Sticky note | (FigJam) N | — |
| Auto Layout | Shift+A | — |
| Component | Cmd+Alt+K | — |
| Variant | Add → Variant | — |
| Export SVG | — | `npx svgo` |

---

## 7. Cheatsheet Rápido

```yaml
# 5 Fases
1. Empatizar   → insights de usuario
2. Definir     → HMW, POV, principios
3. Idear       → 20-50 ideas divergentes
4. Prototipar  → SVG, tokens, Figma
5. Testear     → visual regression, 5-user test

# Frameworks
- Double Diamond:    Discover/Define/Develop/Deliver (semanas)
- Design Sprint:     Map/Sketch/Decide/Prototype/Test (5 días)
- JTBD:              ¿Qué "trabajo" emocional/social hace el producto?

# Leyes UX
- Fitts:    tiempo_click = f(distancia, tamaño)    → CTAs grandes
- Hick:     tiempo_decisión = log(n opciones)       → simplificar
- Jakob:    usuarios prefieren familiaridad         → consistencia
- Miller:   memoria = 7±2 chunks                   → agrupar info

# Iteración
3-5 iteraciones por badge antes de producción
Prototipar rápido, fallar barato, iterar mucho

# Validación
- 5-user test    → encuentra 85% de issues
- Visual regression (BackstopJS, Chromatic)
- Legibilidad 36×36px + 16×16px
- A/B testing → 1000 usuarios, 7-14 días
```

```bash
# Pipeline Design → Producción
1. Idear        → Figma, Miro
2. Prototipar   → SVG directo, tokens
3. Testear      → BackstopJS, Maze
4. Refinar      → SVGO optimization
5. Producción   → Style Dictionary, Storybook
```

```javascript
// Generación programática de variantes
const badges = Array.from({ length: 20 }, (_, i) => ({
  id: `badge-${i+1}`,
  era: Math.floor(i / 5) + 1,
  rarity: i < 4 ? 'common' : i < 9 ? 'rare' : i < 14 ? 'epic' : 'legendary',
  glow: Math.min(i * 1.2, 25),
  animation: i >= 10 ? 'breathe' : i >= 15 ? 'particles' : 'none'
}));
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `cultural-references` | Complementario | Sí (moodboards, inspiración) |
| `trends-forecasting` | Complementario | Sí (contexto actual) |
| `frontend-visual-architecture` | Complementario | Sí (sistema, tokens) |
| `badge-system` | Complementario | Condicional (caso de uso) |
| `composition-layout` | Complementario | Condicional (principios) |
| `color-basics` | Complementario | Condicional (paleta en prototipado) |
| `motion-ui` | Complementario | Condicional (animación en prototipos) |
| `emotional-design` | Complementario | Condicional (delight, engagement) |
| `user-research` | Complementario | Condicional (empatizar) |

---

## 9. Metadatos del Skill

```yaml
---
id: design-thinking
domain: 11-design-niche
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/legend-skills/design-thinking
tags: [design-thinking, creative-process, methodology, empathy-map, double-diamond, design-sprint, jobs-to-be-done, JTBD, ideation, prototyping, iteration, divergent-convergent, fitts-law, hick-law, jakob-law, miller-law, visual-regression, backstopjs, chromatic, Figma, Miro, Crazy-8s, user-research, A-B-testing]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `design-thinking` (Skills-o-extra/legend-skills).*

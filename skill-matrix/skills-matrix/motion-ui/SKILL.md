---
name: motion-ui
description: "Use when the user asks about UI animation, motion design, micro-interactions, easing curves, timing, Lottie, GSAP, Framer Motion, Rive, Disney 12 animation principles (squash & stretch, anticipation, arcs, follow-through), keyframes, breathing loops, prefers-reduced-motion, or choreographing UI transitions. Triggers: animación, motion, easing, timing, transición, UI animation, Lottie, GSAP, principios Disney, loop, spring, cubic-bezier, keyframes, micro-interaction, choreography."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "diseno-motion"
  source: "Skills-o-extra/elite-skills/motion-ui"
  ported: "2026-06-14"
---

## 12 Principios de Animación Aplicados a UI

Desarrollados por los "Nine Old Men" de Disney, 100% aplicables a micro-animaciones de 300ms-2s.

### 1. Squash & Stretch
Objetos vivos cambian de forma manteniendo volumen constante.

**Aplicación:** Badge que "cae" y se aplana al impactar, luego recupera forma. Hover con scaleY asimétrico.

```javascript
// GSAP
gsap.fromTo(".badge", { scaleX: 1.4, scaleY: 0.6 }, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "elastic.out(1, 0.3)" })
```

### 2. Anticipation
Movimiento previo en dirección opuesta antes del movimiento principal (50-150ms).

**Aplicación:** Glow se intensifica 100ms antes del tooltip. Contracción breve antes de expansión.

### 3. Staging
La acción debe presentarse claramente. Solo un elemento se anima por vez.

**Aplicación:** Secuencia glow → icono → partículas. Contraste de velocidad entre capas.

### 4. Straight Ahead & Pose to Pose
Straight ahead: animación continua (loops de respiración). Pose to pose: keyframes para transiciones.

### 5. Follow Through & Overlapping Action
Las partes no se detienen al mismo tiempo. Partículas continúan 200-400ms después del icono principal.

### 6. Slow In & Slow Out (Easing)
Toda animación DEBE usar easing. Linear es para robots o errores.

### 7. Arcs
Movimientos naturales siguen trayectorias curvas. Partículas en órbitas elípticas, no círculos perfectos.

### 8. Secondary Action
Acciones que apoyan sin robar la atención (≤30% de amplitud de la principal). Glow pulsante mientras icono está quieto.

### 9. Timing

| Acción | Duración |
|--------|----------|
| Aparición | 300-500ms |
| Hover activación | 100-200ms |
| Hover desactivación | 200-300ms |
| Breathing loop | 2-4s |
| Glow pulsación | 1.5-3s |

### 10-12. Exaggeration, Solid Drawing, Appeal
Exageración para comunicar (glow de 150% en nivel máximo). Sombras y 3 capas de profundidad mínimas. Curvas de easing que hacen sentir "viva" la UI.

## Easing y Timing

El easing es la personalidad de la animación.

### Curvas Recomendadas para Insignias

| Nombre | Curva | Uso |
|--------|-------|-----|
| Smooth | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Apariciones estándar |
| Snappy | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Hover, micro-interacciones |
| Dramatic | `cubic-bezier(0.87, 0, 0.13, 1)` | Apariciones nivel alto |
| Bounce | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` | Celebraciones |

### Spring Physics

```jsx
// Framer Motion
transition={{ type: "spring", stiffness: 300, damping: 20, mass: 1 }}
```

| Perfil | Stiffness | Damping | Sensación |
|--------|-----------|---------|-----------|
| Suave | 100 | 20 | Flotante |
| Neutro | 200 | 20 | Natural |
| Enérgico | 400 | 15 | Vibrante |
| Explosivo | 600 | 10 | Celebratorio |

### Curvas Phonk Universe

- Phonk Smooth: `cubic-bezier(0.22, 1, 0.36, 1)` — apariciones
- Phonk Punch: `cubic-bezier(0.5, -0.5, 0.1, 1.5)` — partículas
- Phonk Haze: `cubic-bezier(0.4, 0, 0.2, 1)` — glows
- Phonk Drop: `cubic-bezier(0.34, 1.56, 0.64, 1)` — celebraciones

### Regla de Oro del Timing

Duración proporcional a la distancia. Velocidad objetivo: 300-600 px/s. Aparecer = ease-out, desaparecer = ease-in, moverse = ease-in-out.

## Motion UI: Transiciones y Coreografía

### Transición de Nivel (800ms total)

1. Fase 1 (0-150ms): Flash de anticipación
2. Fase 2 (150-350ms): Contracción squash
3. Fase 3 (350-500ms): Crossfade
4. Fase 4 (500-700ms): Expansión stretch
5. Fase 5 (700-800ms): Stabilize + glow

### Micro-interacciones

- **Hover:** 100ms activación, 200ms desactivación (2× más lenta)
- **Click:** scale 0.92 → 1.05 → 1.0 (300ms total)
- **Notificación de logro:** Secuencia de 1500ms con partículas

### Patrones de Coreografía

| Patrón | Sensación | Uso |
|--------|-----------|-----|
| Simultáneo | Unidad, impacto | Celebración |
| Cascada | Profundidad | Aparición inicial |
| Canon | Vida, complejidad | Loop respiración |
| Aleatorio | Caos, energía | Partículas |

### Performance Budget

| Contexto | Frame Budget | Límite |
|----------|-------------|--------|
| Grid 20 badges | 4-6ms | CSS transforms + opacity |
| Slot hover | 8-10ms | Transforms + glow |
| Celebración | 10-12ms | Transforms + max 10 partículas |
| Transición nivel | 12-16ms | Crossfade (una vez) |

## Loops y Respiración

Movimiento subperceptual: el usuario no lo nota conscientemente pero siente que la insignia "vive".

- Scale: 1.0 → 1.02 → 1.0 (variación 2%)
- Frecuencia: 2.5-4s por ciclo (ritmo natural)
- Forma de onda: sinusoidal (sine.inOut)

### Loops por Nivel

| Nivel | Tipo | Amplitud |
|-------|------|----------|
| 10 | Breathe puro | Scale ±1% |
| 12 | Glow pulsante | Glow ±20% |
| 14 | + Partículas | Partículas ±5px |
| 15 | + Rotación lenta | 360°/20s |
| 17 | + Shimmer | Gradiente móvil |
| 20 | Todos combinados | Completo |

### Rendimiento

- IntersectionObserver para pausar fuera de pantalla
- CSS para loops simples, GSAP/Framer para multi-elemento
- Respetar prefers-reduced-motion

## Formatos de Exportación

| Formato | Vectorial | Transparencia | Peso (10s) | Uso |
|---------|-----------|---------------|------------|-----|
| Lottie | Sí | Sí | 5-50 KB | Web principal |
| SVG animado | Sí | Sí | 2-20 KB | Grid, loops simples |
| WebP animado | No | Sí | 50-200 KB | Fallback |
| GIF | No | 1-bit | 500-5000 KB | Legacy, evitar |
| MP4/HEVC | No | No | 100-500 KB | Redes sociales |

**Stack recomendado:** Lottie JSON (lottie-web SVG renderer) para web app. Fallback: WebP animado. Grid: SVG animado con CSS + IntersectionObserver. Evitar GIF para glows rojos.

---

## Cheatsheet Rápido

```css
/* Curvas de easing reutilizables */
:root {
  --ease-smooth:    cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-snappy:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-dramatic:  cubic-bezier(0.87, 0, 0.13, 1);
  --ease-bounce:    cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

/* Breathing loop (subliminal) */
@keyframes breathe {
  0%, 100% { transform: scale(1.0); }
  50%      { transform: scale(1.02); }
}
.badge { animation: breathe 3s ease-in-out infinite; }

/* Reduced motion accessibility */
@media (prefers-reduced-motion: reduce) {
  .badge { animation: none; }
}
```

```yaml
12 Principios Disney (resumen):
  1. Squash & Stretch  (volumen constante, forma variable)
  2. Anticipation      (50-150ms opuesta pre-movimiento)
  3. Staging           (un elemento a la vez)
  4. Straight/Pose     (continuo vs keyframes)
  5. Follow Through    (200-400ms trailing)
  6. Slow In/Out       (easing obligatorio)
  7. Arcs              (curvas, no rectas)
  8. Secondary Action  (≤30% amplitud principal)
  9. Timing            (300-500ms aparición)
  10-12. Exaggeration + Solid Drawing + Appeal

Performance budget (60fps = 16.67ms/frame):
  Grid 20 badges:  4-6ms   CSS transforms + opacity
  Hover slot:      8-10ms  + glow
  Celebración:     10-12ms + max 10 partículas

Exportar: Lottie JSON (5-50KB) > SVG animado (2-20KB) > WebP > GIF (evitar)
```

---

## Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `design-skills/emotional-design` | Complementario | Sí (delight + micro-interactions) |
| `design-skills/gamification-rewards` | Complementario | Sí (celebración de hitos) |
| `design-skills/visual-narrative` | Complementario | Sí (coreografía de actos) |
| `design-skills/icon-symbolism` | Complementario | Sí (vida sutil en iconos) |
| `frontend-visual-architecture` | Complementario | Sí (escalado, performance) |
| `accessibility-design` | Dependiente | Sí (prefers-reduced-motion) |
| `a11y-accessibility-wcag` | Dependiente | Sí (umbral epiléptico 3 flashes/s) |
| `svg-basics` | Dependiente | Condicional (animación SVG) |
| `performance-profiling-optimization` | Complementario | Condicional (frame budget) |

---

*Ported from `Skills-o-extra/elite-skills/motion-ui` (2026-06-14).*

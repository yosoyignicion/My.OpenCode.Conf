---
name: emotional-design
description: "Use when the user asks about emotional design, user delight, micro-interactions, Norman 3 levels (visceral/behavioral/reflexive), aesthetic-usability effect, dopamine cycles, nostalgia marketing, archetype-based branding, Kurosu-Kashimura, or designing UI that creates attachment. Triggers: emotional, Norman, visceral, conductual, reflexivo, delight, micro-interacción, arquetipo, estética-utilidad, nostalgia, dopamina, serotonina, oxitocina, FOMO."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "diseno-emocional"
  source: "Skills-o-extra/elite-skills/emotional-design"
  ported: "2026-06-14"
---

## Emotional Design: Modelo Norman

Don Norman propone tres niveles de procesamiento emocional interconectados.

### Los 3 Niveles

```yaml
Nivel: Visceral        | Químico: Serotonina | Temporalidad: Milisegundos | Función: Atracción/rechazo inmediato
Nivel: Conductual      | Químico: Dopamina   | Temporalidad: Segundos-minutos | Función: Placer en la interacción
Nivel: Reflexivo       | Químico: Oxitocina  | Temporalidad: Días-años    | Función: Significado y recuerdo
```

**Visceral:** Respuesta automática en <100ms. Color, forma, simetría, brillo. El usuario decide si atractivo antes de procesar significado.

**Conductual:** Feedback <200ms, comprensibilidad, fluidez, gratificación háptica. Ciclo óptimo de 5s: acción → notificación → animación → integración → refuerzo.

**Reflexivo:** Identidad ("¿Esto refleja quién soy?"), memoria ("¿Qué hacía cuando lo conseguí?"), estatus ("¿Qué dice de mí?"), pertenencia ("¿Soy parte de algo?").

### Pirámide de Necesidades de Insignias

```
Trascendencia (Era 5) ← Reflexivo
Estimación/Estatus (Era 4) ← Reflexivo
Pertenencia/Comunidad (Era 3) ← Conductual
Progresión/Dominio (Era 2) ← Conductual
Reconocimiento Básico (Era 1) ← Visceral
```

## Estética-utilidad (Kurosu & Kashimura 1995)

Los usuarios consideran un sistema bonito como más fácil de usar, independientemente de la usabilidad real.

```yaml
Mecanismos:
  - Transferencia de afecto: la emoción positiva por la estética se derrama sobre la evaluación funcional
  - Reducción de fricción percibida: coherencia estética = menor carga cognitiva
  - Tolerancia al error: los usuarios perdonan más errores en sistemas estéticamente agradables
```

### Curva de Estética Funcional

Estética abre la puerta → funcionalidad la mantiene abierta. Sin estética, la usabilidad percibida colapsa independientemente de la funcionalidad real.

Reglas:
1. Estética primero, pero no exclusiva
2. Consistencia > creatividad individual
3. Animación con propósito (feedback, orientación, jerarquía, personalidad)
4. Accesibilidad como límite (contraste 4.5:1, no info solo por color, prefers-reduced-motion)
5. Línea base de calidad mínima para todo el sistema

## Arquetipos de Personalidad (Jung aplicados a branding)

12 arquetipos en 4 grupos:

| Grupo | Arquetipos | Aplicación |
|-------|-----------|------------|
| Estabilidad | Inocente, Amigo, Bobo | Eras iniciales, participación comunitaria |
| Cambio | Héroe, Forajido, Mago | Eras medias-altas, logro competitivo |
| Estructura | Gobernante, Cuidador, Creador | Estatus, mentoría, creatividad |
| Trascendencia | Sabio, Explorador, Amante | Veteranos, descubrimiento, comunidades |

### Constelación por Era

```yaml
Era 1: Inocente + Amigo → "Estás seguro aquí, perteneces"
Era 2: Explorador + Héroe → "Estás creciendo, sigue adelante"
Era 3: Creador + Forajido → "Estás dejando huella"
Era 4: Mago + Gobernante → "Eres respetado, tienes poder"
Era 5: Sabio + Leyenda → "Eres leyenda, tu nombre perdura"
```

Cada arquetipo se traduce en parámetros de diseño específicos (color, tipografía, forma, textura, animación, símbolos).

## Micro-delights

Fórmula: `Deleite = Familiaridad + Sorpresa + Relevancia`

### Niveles de Animación de Obtención

| Nivel | Duración | Elementos |
|-------|----------|-----------|
| Sutil (Common) | 0.3s | Fade in + scale up, pop suave |
| Notable (Rare) | 0.5s | Partículas + bounce, campanilla, vibración 100ms |
| Cinemático (Legendary) | 2s | Flash → partículas → revelación → glow, crescendo, vibración rítmica |

Máximo 3s de animación de obtención.

### Easter Eggs y Efectos de Combinación

- Glow especial en fecha específica (aniversario)
- Referencia cultural oculta (símbolo al rotar 180°)
- Interacción secreta (click sostenido revela variante glitch)
- Conexión entre badges (tener 2 badges juntos gatilla efecto combinado)

### Ciclo Dopaminérgico

1. Señal (badge bloqueado) → dopamina por anticipación
2. Rutina (realizar acción) → mantenimiento de dopamina
3. Recompensa (desbloqueo + micro-delight) → pico de dopamina mayor
4. Inversión (mostrar badge) → dopamina social

## Nostalgia Marketing

La nostalgia combina: seguridad psicológica, identidad temporal, pertenencia generacional, refugio emocional.

### 3 Olas de Nostalgia Digital

| Ola | Período | Estética | Conexión |
|-----|---------|----------|----------|
| Retrowave | 2011-2016 | Sol pixelado, neón, grid perspectiva | Retro-futurismo |
| Y2K Revival | 2018-presente | Cromado, cristal, pasteles | Optimismo pre-crisis |
| Phonk/Dark | 2020-presente | VHS grain, glitch, rojo/negro | Autenticidad cruda |

### Regla 70/30

En badges nostálgicos: 70% diseño funcional y atemporal, 30% guiño nostálgico. Invertir los porcentajes crea una referencia oscura para el 5% de usuarios.

### Riesgos

- Alienación de nuevos usuarios (eras iniciales libres de nostalgia)
- Apropiación superficial (sin entender el significado cultural)
- Fatiga nostálgica (la nostalgia debe ser acento, no plato principal)
- Accesibilidad (contraste sobre textura, glitch epiléptico, animaciones opcionales)

---

## Cheatsheet Rápido

```yaml
Norman 3 Niveles:
  Visceral:    <100ms   Serotonina  Atracción/rechazo automático
  Conductual:  <5s      Dopamina    Placer en interacción
  Reflexivo:   días+    Oxitocina   Identidad, memoria, estatus

Estética-Utilidad (Kurosu-Kashimura 1995):
  - Bonito = usable (incluso si no lo es)
  - Transferencia de afecto positivo → evaluación funcional

Micro-delight = Familiaridad + Sorpresa + Relevancia
Anticipación > Recompensa (dopamina se libera ANTES)

Nostalgia 70/30: 70% atemporal + 30% guiño
```

```css
/* Respetar accesibilidad siempre */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `design-skills/motion-ui` | Complementario | Sí (timing + delight) |
| `design-skills/gamification-rewards` | Complementario | Sí (dopamina, Octalysis) |
| `design-skills/icon-symbolism` | Complementario | Sí (semiología, arquetipos) |
| `design-skills/visual-narrative` | Complementario | Sí (arco emocional usuario) |
| `design-skills/typography-phonk` | Complementario | Condicional (estética oscura) |
| `frontend-visual-architecture` | Complementario | Sí (jerarquía, Gestalt) |
| `accessibility-design` | Dependiente | Sí (contraste, reduced-motion) |
| `a11y-accessibility-wcag` | Dependiente | Sí (límites a la estética) |

---

*Ported from `Skills-o-extra/elite-skills/emotional-design` (2026-06-14).*

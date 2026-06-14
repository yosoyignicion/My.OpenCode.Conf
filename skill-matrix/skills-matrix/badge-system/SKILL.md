---
name: badge-system
description: "Use when the user asks about badge/tier/achievement/insignia design, progression systems, gamification rewards, achievement unlocking, rarity tiers, status signaling, FOMO, dopamina scheduling, reward mechanics, or analyzing platforms like Twitch/Discord/PlayStation/Xbox badge systems. Covers 20-level progression curves, rarity distribution, reward scheduling (Fixed/Variable Ratio), anti-patterns, and visual differentiation across 5 axes (forma, color, brillo, animación, textura)."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "sistemas-de-insignias"
  source: "Skills-o-extra/initiation-skills/badge-system"
---

# Badge System: Diseño de Sistemas de Progresión con Insignias

## Semantic Triggers
```
badge insignia tier progresión era logro recompensa achievement rarity desbloqueo colección, 20 levels progression curve, Fixed Ratio Variable Ratio reward scheduling, Twitch Discord PlayStation Xbox, dopamina anticipación endowment effect status signaling FOMO, anti-patterns linear progression invisible wall, 5 ejes diferenciación forma color brillo animación textura, rareza common rare epic legendary distribución, N20 ruptura marco firma autor
```

---

## 1. Definición Teórica

Diseñar 20 niveles no es hacer 20 iconos — es diseñar un **sistema económico** de atención, tiempo y recompensa. Cada nivel debe tener un coste de obtención claro, un beneficio visual proporcional, y un lugar en la jerarquía social.

El sistema opera en 4 capas: (1) **logros** (qué se mide), (2) **recompensas** (qué se otorga), (3) **jerarquía visual** (cómo se diferencia), (4) **signaling social** (cómo se muestra al mundo). Una insignia que no se ve no es estatus — es checklist privado (lección Reddit 2018-2020).

La curva de progresión sigue una **función exponencial suave** (cada nivel 1.2×-1.5× más que el anterior) para evitar el "muro invisible" que causa abandono. La distribución esperada: 40% nuevos, 30% casuales, 18% dedicados, 10% veteranos, 2% élite.

---

## 2. Implementación de Referencia

### Tipos de Logro

| Tipo | Ejemplo | Nivel |
|------|---------|-------|
| Tiempo de visualización | Horas totales | N1-N20 base |
| Interacciones | Chats, follows, subs | N3, N7, N11 |
| Consistencia | Días consecutivos | N5, N10, N15 |
| Comunidad | Hosteos, raids | N9, N14, N18 |
| Monetario | Bits, donaciones | N8, N13, N19 |

### Rareza y Distribución

| Rareza | % Usuarios | Color | Efecto Visual |
|--------|-----------|-------|---------------|
| Común (60%) | >50% | Gris/Rojo tenue | Forma simple, sin brillo |
| Raro (25%) | 15-50% | Rojo medio | Borde + glow básico |
| Épico (10%) | 5-15% | Rojo brillante | Glow + animación |
| Legendario (5%) | <5% | Blanco + aura | Todos los efectos |

### Curva de Progresión

La dificultad sigue una curva exponencial suave:

```
N1:     0 horas  (bienvenida)
N5:    10 horas  (hito 1: glow)
N10:   50 horas  (hito 2: animación)
N15:  150 horas  (hito 3: explosión color)
N20:  400 horas  (hito final: insignia legendaria)
```

**Distribución esperada:**

| Rango | % Usuarios | Niveles |
|-------|-----------|---------|
| Nuevos | 40% | N1-N4 |
| Casuales | 30% | N5-N9 |
| Dedicados | 18% | N10-N14 |
| Veteranos | 10% | N15-N18 |
| Élite | 2% | N19-N20 |

### Reward Scheduling

| Tipo | Ratio | Uso |
|------|-------|-----|
| Fixed Ratio | 70% | Progresión principal predecible |
| Variable Ratio | 15% | Insignias laterales sorpresa |
| Fixed Interval | 10% | Rachas diarias |
| Variable Interval | 5% | Eventos no anunciados |

#### Sorpresa y Delight

Técnicas para momentos "wow":

- **Insignia fantasma:** Detalle visible solo al hacer hover
- **Easter egg:** En N10, esperar 5s revela elemento extra
- **Evolución oculta:** N15 cambia sutilmente día/noche
- **N5:** "¿Tiene glow? ¡Increíble!"
- **N10:** "¿Se mueve? No sabía que podía hacer eso"
- **N15:** "¡Explotó en color! Esto es arte"
- **N20:** "No puedo creer que esto sea una insignia"

### Tipos de Insignia

| Tipo | Propósito | Ejemplo |
|------|-----------|---------|
| Progresión | Marcar avance lineal | N1-N20 base |
| Hito | Celebrar logro mayor | N5, N10, N15, N20 |
| Evento | Recompensa temporal | "Semana del phonk" |
| Comunidad | Logro social | "Hosteaste 100 streams" |
| Secreto | Descubrimiento | "Viste 50 streams de noche" |
| Temporada | Exclusividad anual | "Phonk Summer 2025" |
| Competencia | Ranking | "Top 100 del mes" |

### Anti-Patrones en Achievement Design

#### Progresión Lineal sin Picos
Cada nivel añade el mismo valor incremental. No hay éxtasis.
**Solución:** Curva con 4 picos (N5, N10, N15, N20) con recompensas cualitativas.

#### Recompensas sin Esfuerzo
Insignias que no costaron nada no valen nada.
**Solución:** N1-N4 fáciles, de N5 en adelante coste real.

#### El Muro Invisible
Salto de N14 a N15 requiere 50h. El usuario abandona.
**Solución:** Curva suave, cada nivel 1.2×-1.5× más que el anterior.

#### Insignias que No Importan
50 insignias sin contexto = el usuario ignora.
**Solución:** 20 bien diseñadas con lore > 100 genéricas.

### Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Retención N1→N5 | >60% |
| Retención N5→N10 | >40% |
| Retención N10→N15 | >25% |
| Tasa N20 | >2% |
| Share rate | >10% |
| Badge display rate | >80% |

### Anatomía de Badge Systems (Análisis Plataformas)

#### Twitch
- Sub badges por meses (1-60+): evolución de glow/shape del mismo logo
- Bits badges por evento
- Hype Train: insignia colaborativa comunitaria
- **Acierto:** Lealtad medida en meses = fácil de entender
- **Error:** Exceso de sistemas → dilución de estatus

#### Discord
- Nitro, HypeSquad, Server Boosts
- **Acierto:** Perfil con display de todas las insignias (escaparate social)
- **Acierto:** HypeSquad por personalidad (tribu, identidad de grupo)
- **Error:** Nitro sin progresión (1 badge, sin incentivo a mantener)
- **Error:** HypeSquad sin mantenimiento (fósil en perfil)

#### PlayStation Trophies
- Bronce (90%) → Plata (6%) → Oro (3%) → Platino (1%)
- **Acierto:** Jerarquía cromática perfecta (universal)
- **Acierto:** Platino requiere completar todos = maestría total
- **Acierto:** Experiencia multisensorial (sonido + animación + notificación)
- **Puntuación:** Claridad 10/10, Diferenciación 10/10, Sostenibilidad 9/10

#### Xbox Achievements
- Gamerscore + Achievement art + Rare achievements
- **Acierto:** Gamerscore numérico = adictivo
- **Acierto:** Rare achievements con glow especial
- **Error:** Sin jerarquía de rareza visual (solo común/raro)

#### Reddit (2018-2020)
- **Acierto:** Rachas de login y sorpresa
- **Error:** Sin visibilidad en perfil = sin estatus
- **Error:** Sistema abandonado = muerte
- **Lección crítica:** Insignias SIN VISIBILIDAD no son estatus — son checklist privado

### Kick: Estado y Oportunidad

Kick tiene sistema básico sin diferenciación visual significativa. Oportunidad única:
1. Tabula rasa: sin sistema legacy
2. Comunidad joven receptiva
3. Cultura phonk como estética distintiva
4. Competencia directa con Twitch

**Recomendaciones:**
- Visibilidad en perfil (lección Discord)
- Jerarquía cromática (lección PlayStation)
- Sonido + animación (lección PlayStation)
- Progresión por tiempo (lección Twitch)
- Rareza automática (lección Xbox)
- Personalización por creator (lección Twitch)
- Lore y narrativa (oportunidad única)

### Diferenciación Visual Entre Niveles

5 ejes para diferenciar. Un sistema maduro usa ≥3 simultáneamente:

#### 1. Complejidad de Forma

| Nivel | Elementos | Tipo |
|-------|-----------|------|
| 1-4 | 1-2 | Monolítico |
| 5-8 | 2-3 | Central + secundario |
| 9-12 | 3-5 | Múltiples formas |
| 13-16 | 4-6 | Capas, profundidad |
| 17-20 | 5-8 | Máxima densidad |

#### 2. Color y Saturación

| Era | Colores | Técnica |
|-----|---------|---------|
| 1 | 1 color (#DC2626) | Sólido |
| 2 | 2 colores | Borde bicolor |
| 3 | 3 colores | Degradado |
| 4 | 4-5 colores | Múltiples fuentes de luz |
| 5 | 5+ colores | Espectro completo |

#### 3. Brillo e Iluminación

| Nivel | Glow | Intensidad |
|-------|------|------------|
| 1-4 | No | — |
| 5-6 | Básico 5px | 30% |
| 10-12 | Complejo 12px | 70% |
| 16-18 | Capas 20px | 90% |
| 19-20 | Exterior 25px+ | 100% |

#### 4. Animación

| Nivel | Tipo |
|-------|------|
| 1-9 | Estático |
| 10 | Breathe (sutil) |
| 13-14 | + Partículas |
| 15-16 | + Rotación lenta |
| 17 | + Shimmer |
| 18 | + Interactivo |
| 20 | Todas combinadas |

#### 5. Textura

| Nivel | Material |
|-------|----------|
| 1-4 | Plano, vectorial puro |
| 5-8 | Grano sutil, mate |
| 13-16 | Textura densa |
| 17-18 | Metálico |
| 19-20 | Especular, vidrio |

### Técnicas Exclusivas por Tier

| Tier | Técnica |
|------|---------|
| N5 | Primer glow (cambio cualitativo) |
| N10 | Primera animación |
| N15 | Explosión de color |
| N20 | Rotura de marco + firma + estado dual |

#### Cómo Hacer que N20 se Sienta 20× Más Especial

**Principio de Apilamiento:** Cada nivel multiplica, no suma. N20 es N1 transformado 19 veces.

1. **Romper el Marco:** Elementos que se salen del borde 100×100px
2. **Firma de Autor:** Elemento único solo en N20 (sello, estrella)
3. **Efecto Especular Exclusivo:** Brillo metálico que ninguna otra tiene
4. **Animación de Estado Dual:** Reposo + activo (click = celebración)
5. **Nomenclatura Diferente:** Nombre compuesto o en latín ("Aeternum Noctis")

### Test de Distinción Jerárquica

1. **Test ciego:** ¿El usuario sabe cuál es de mayor nivel sin contexto?
2. **Test 3s:** ¿Puede asignar nivel aproximado (±2)?
3. **Test de silueta:** ¿Siluetas de N5, N10, N15, N20 distinguibles sin color?
4. **Test de grid:** ¿Puede ordenar 20 insignias por nivel visualmente?

### Ecuación del Valor de Insignia

```
Valor Percibido = (Exclusividad × Rareza) + (Diseño / Esfuerzo de Obtención)
```

### Framework de Diseño

```yaml
Input:
  - Nivel de logro (1-100)
  - Era de diseño (1-5)
  - Tipo de logro (técnico, social, creativo)

Process:
  1. Determinar forma base según era
  2. Aplicar color según nivel dentro de paleta de era
  3. Añadir detalles de materialidad según nivel
  4. Aplicar glow/efectos según rareza
  5. Validar contraste con niveles adyacentes

Output:
  - SVG optimizado para web
  - Fallback PNG para clientes legacy
  - Metadatos: nombre, descripción, rarity score
```

### Psicología del Logro

#### Dopamina y Anticipación
La dopamina se libera al ANTICIPAR la recompensa, no al obtenerla. La barra de progreso es más importante que la animación de recompensa.

#### Técnicas de Anticipación
1. Progreso visible: barra de XP
2. Foreshadowing: silueta de siguiente insignia
3. Notificaciones de "casi"
4. Micro-hitos cada 20%

#### Picos Dopamínicos
```
N1: ████ Bienvenida (pico inmediato)
N5: █████ Hito mayor (pico grande)
N10:█████ Hito mayor
N15:█████ Recompensa visual masiva
N20:█████ Culminación
```
Si todos los niveles son picos: taquifilaxia (tolerancia).

#### Efecto Dotación
Una vez que el usuario posee una insignia, la valora más. Una colección incompleta (17/20) genera más engagement que una completa.

#### Status Signaling
- **Señal de Costo:** N20 dice "invertí 400+ horas"
- **Señal de Habilidad:** Badge de raid dice "sé organizar"
- **Señal de Identidad:** Badge de veterano dice "soy historia"

#### FOMO (Fear Of Missing Out)
- Temporadas: insignias disponibles 3 meses
- Eventos: badges en fechas específicas
- **Límites éticos:** No ansiedad artificial, rotación anual, sin countdowns falsos

---

## 3. Trade-offs y Decisiones de Arquitectura

| Decisión | Pros | Contras |
|---|---|---|
| 20 niveles | Suficiente para progresión rica, manejable cognitivamente | Curva larga, abandono si ritmo es muy lento |
| Rareza visual por color | Universal (PlayStation) | Discrimina por accesibilidad (daltonismo) |
| 5 ejes de diferenciación | Sistema maduro y rico | Complejidad alta, 3 ejes ya cubren el 80% |
| Temporadas / FOMO | Engagement alto | Ansiedad, percepción predatoria |
| Lore y narrativa | Diferenciación única | Requiere inversión continua, riesgo de agotamiento |
| Badges secretos | Descubrimiento = delight | Invisible para FOMO, puede pasar desapercibido |

### Límites Éticos del FOMO

- **Evitar:** countdowns falsos, "última oportunidad" repetitivo, ansiedad artificial
- **Hacer:** rotación anual, eventos celebratorios no amenazantes, badges accesibles para nuevos usuarios
- **Regla de oro:** un sistema de badges debe motivar, no manipular

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: 80% de usuarios abandona entre N10 y N15

**What caused the issue?**
La curva exponencial pasa de 50h (N10) a 150h (N15) — un salto de 100h sin recompensas intermedias. Usuarios sienten que el "siguiente nivel" está demasiado lejos.

**How was it resolved?**
Introducir micro-hitos entre N11, N12, N13, N14 con insignias laterales (no progression badges, sino de evento/comunidad) que ofrecen dopamina cada 20% de avance hacia N15:

```yaml
N10:  50h   progression (animation)
N11:  +5h   evento ("Hosteaste tu primer raid")
N12:  +10h  comunidad ("Respondiste 100 chats")
N13:  +20h  consistencia ("Racha de 7 días")
N14:  +50h  monetario ("Primera donación de $5")
N15:  150h  progression (color explosion)
```

**Why does this work?**
La dopamina se libera al anticipar, no al recibir. Micro-hitos visibles cada 5-10h mantienen la "rueda de anticipación" girando. La curva exponencial se mantiene, pero el camino se siente recompensado.

### Caso: Insignias N20 no se sienten "legendarias" pese a tener todos los efectos

**What caused the issue?**
N20 tiene más glow, más colores, más partículas, pero el usuario lo lee como "N15 + extras" en lugar de una categoría cualitativamente diferente.

**How was it resolved?**
Aplicar el **Principio de Apilamiento** + ruptura de marco:

1. Firma de autor: elemento único en N20 (sello, estrella de 8 puntas)
2. Ruptura de marco: elementos que sobresalen del bounding 100×100px
3. Nomenclatura latina: "Aeternum Noctis" en lugar de "N20"
4. Estado dual: reposo + celebración al click
5. Material exclusivo: efecto especular (vidrio/metálico) que ninguna otra tiene

**Why does this work?**
El cerebro categoriza cualitativamente, no cuantitativamente. "Más brillo" es escalar; "diferente categoría" es ascensión. La firma + ruptura de marco fuerzan la categorización: "esto no es un N15 mejorado, esto es OTRO TIPO de objeto".

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1800 tokens estimated when invoking this skill
- **Trigger de activación:** "badge", "insignia", "tier", "achievement", "progression", "rarity", "rewards", "leveling", "FOMO" in the query
- **Prioridad de carga:** Media — load when user asks about gamification or visual hierarchy of achievements
- **Dependencias:** `gamification-rewards` (Octalysis framework), `frontend-visual-architecture` (atomic design), `color-basics` (rarity colors), `dark-mode` (glow effects), `advanced-effects` (N17-N20 techniques)

### Tool Integration

```json
{
  "tool_name": "badge-system",
  "description": "Badge/tier progression design: 20-level curves, rarity distribution, reward scheduling, 5-axis visual differentiation, anti-patterns, FOMO ethics",
  "triggers": ["badge", "insignia", "tier", "achievement", "progression", "rarity", "rewards", "leveling", "unlock", "FOMO", "endowment", "Twitch", "Discord", "PlayStation", "Xbox", "achievement system"],
  "context_hint": "Inject section 2 (20-level curve, 5 differentiation axes, anti-patterns, dopamina scheduling) for design decisions. Section 4 for N20 special treatment and FOMO ethics.",
  "output_format": "markdown",
  "max_tokens": 5000
}
```

### Prompt Snippet (carga rápida)

```
When the user asks about badge systems, achievement design, tier progression, or gamification rewards,
load the skill badge-system and provide the 20-level exponential curve, 5-axis visual differentiation
(form/color/glow/animation/texture), reward scheduling (Fixed/Variable Ratio), and anti-patterns
(invisible wall, no peaks, no visibility). Always reference the Twitch/Discord/PlayStation analysis
for real-world patterns and apply ethical FOMO limits.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generar progresión exponencial
python3 -c "
levels = [0]
for i in range(1, 21):
    levels.append(round(levels[-1] * 1.4))
print(levels)
"
# [0, 0, 1, 1, 2, 3, 4, 6, 8, 12, 16, 23, 32, 45, 63, 88, 123, 173, 242, 339, 475]

# Optimizar SVG de insignias
npx svgo badges/*.svg --multipass

# Visual regression
npx backstopjs test
```

### GUI / Web

- **Figma**: Auto Layout para grids de catálogo, Variants para estados (common/rare/epic/legendary)
- **Storybook**: estados por tier, controles para glow intensity
- **Style Dictionary**: tokens de rareza con `glow 0→4→8→12→20`
- **Tokens Studio (Figma plugin)**: sincroniza tokens a Style Dictionary

### Hotkeys / Atajos

| Acción | Atajo |
|---|---|
| Optimizar SVG | `npx svgo badges/*.svg` |
| Generar curva exponencial | `python3 -c "..."` (ver arriba) |
| Visual regression | `npx backstopjs test` |
| Validar WCAG colores | `npx @axe-core/cli` |

---

## 7. Cheatsheet Rápido

```yaml
# 20-Level Curve (exponential, ratio 1.4)
N1: 0h      # Bienvenida
N5: 10h     # Primer glow
N10: 50h    # Primera animación
N15: 150h   # Explosión de color
N20: 400h   # Insignia legendaria

# Rareza Distribution
Común:    >50%   # Sin brillo
Raro:     15-50% # Glow básico
Épico:    5-15%  # Glow + animación
Legend:   <5%    # Todos los efectos + firma
```

```css
/* N20 example: ruptura de marco + glow completo */
.badge-n20 {
  filter: drop-shadow(0 0 8px #FF1744)
          drop-shadow(0 0 16px #DC2626)
          drop-shadow(0 0 32px rgba(220, 38, 38, 0.6));
  animation: shimmer 3s ease-in-out infinite;
  position: relative;
}
.badge-n20::after {
  content: "★"; /* firma de autor */
  position: absolute;
  top: -8px; right: -8px; /* sobresale del marco */
  font-size: 24px;
  color: #FFD700;
}
```

```yaml
# 5 Ejes de Diferenciación (usar ≥3)
1. Forma:        1-2 elementos → 5-8 elementos
2. Color:        1 color → espectro completo
3. Brillo:       0 → 25px+ glow exterior
4. Animación:    estática → todas combinadas
5. Textura:      plana → especular/vidrio

# Anti-Patrones
- Curva lineal sin picos
- Recompensas sin esfuerzo
- Muro invisible (salto de 50h+)
- Insignias sin visibilidad

# Métricas objetivo
- Retención N1→N5:  >60%
- Retención N5→N10: >40%
- Tasa N20:         >2%
- Badge display:    >80%
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `gamification-rewards` | Fundacional | Sí (Octalysis, motivaciones) |
| `frontend-visual-architecture` | Complementario | Sí (atomic design, tokens) |
| `color-basics` | Complementario | Sí (rarity colors, WCAG) |
| `dark-mode` | Complementario | Sí (glow techniques) |
| `advanced-effects` | Complementario | Condicional (N17-N20) |
| `icon-symbolism` | Complementario | Sí (significado de símbolos) |
| `visual-narrative` | Complementario | Condicional (lore, worldbuilding) |
| `motion-ui` | Complementario | Sí (animation timing) |
| `emotional-design` | Complementario | Condicional (delight moments) |
| `accessibility-design` | Complementario | Sí (daltonismo, WCAG) |

---

## 9. Metadatos del Skill

```yaml
---
id: badge-system
domain: 11-design-niche
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: Skills-o-extra/initiation-skills/badge-system
tags: [badge, insignia, tier, achievement, progression, rarity, rewards, leveling, FOMO, dopamina, endowment-effect, status-signaling, twitch, discord, playstation, xbox, kick, 20-levels, exponential-curve, reward-scheduling, fixed-ratio, variable-ratio, anti-patterns, glow, animation, ethcial-fomo]
---
```

---

*Template v1.0 — 9 sections. Last updated: 2026-06-14. Ported from `badge-system` (Skills-o-extra/initiation-skills).*
